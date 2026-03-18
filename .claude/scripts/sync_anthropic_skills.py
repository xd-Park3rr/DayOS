#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_REPOSITORY = "anthropics/skills"
DEFAULT_MANIFEST = Path(".claude/skills.lock.json")
PROJECT_SKILLS_DIR = Path(".claude/skills")
SKILL_PATHS = {
    "skill-creator": "skills/skill-creator",
    "mcp-builder": "skills/mcp-builder",
}
USER_AGENT = "dayos-anthropic-skill-sync/1.0"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request) as response:
        return response.read()


def fetch_json(url: str) -> dict:
    return json.loads(fetch_bytes(url).decode("utf-8"))


def sha256_hex(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def github_tree_url(repository: str, commit: str) -> str:
    return f"https://api.github.com/repos/{repository}/git/trees/{commit}?recursive=1"


def raw_file_url(repository: str, commit: str, source_path: str) -> str:
    return f"https://raw.githubusercontent.com/{repository}/{commit}/{source_path}"


def list_skill_files(repository: str, commit: str) -> dict[str, list[str]]:
    tree = fetch_json(github_tree_url(repository, commit)).get("tree") or []
    files_by_skill: dict[str, list[str]] = {}
    for skill_name, source_root in SKILL_PATHS.items():
        prefix = f"{source_root}/"
        skill_files = [
            str(entry["path"])
            for entry in tree
            if entry.get("type") == "blob" and str(entry.get("path") or "").startswith(prefix)
        ]
        files_by_skill[skill_name] = sorted(skill_files)
    return files_by_skill


def remove_extraneous_files(skill_root: Path, expected_relative_paths: set[str]) -> list[str]:
    removed: list[str] = []
    if not skill_root.exists():
        return removed

    for path in sorted(skill_root.rglob("*"), reverse=True):
        if path.is_file():
            relative = path.relative_to(skill_root).as_posix()
            if relative not in expected_relative_paths:
                path.unlink()
                removed.append(relative)
        elif path.is_dir():
            try:
                path.rmdir()
            except OSError:
                pass
    return removed


def build_manifest(repository: str, commit: str, files_by_skill: dict[str, list[str]]) -> dict:
    repo = repo_root()
    manifest = {
        "repository": f"https://github.com/{repository}",
        "repositorySlug": repository,
        "commit": commit,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "skills": {},
    }

    for skill_name, source_paths in files_by_skill.items():
        skill_root = repo / PROJECT_SKILLS_DIR / skill_name
        skill_entry = {
            "sourcePath": SKILL_PATHS[skill_name],
            "files": [],
        }
        for source_path in source_paths:
            relative_path = source_path.removeprefix(f"{SKILL_PATHS[skill_name]}/")
            local_path = skill_root / relative_path
            payload = local_path.read_bytes()
            skill_entry["files"].append(
                {
                    "path": relative_path,
                    "sourcePath": source_path,
                    "sha256": sha256_hex(payload),
                    "size": len(payload),
                }
            )
        manifest["skills"][skill_name] = skill_entry
    return manifest


def write_manifest(manifest_path: Path, manifest: dict) -> None:
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def sync_skills(repository: str, commit: str, manifest_path: Path) -> int:
    files_by_skill = list_skill_files(repository, commit)
    repo = repo_root()

    for skill_name, source_paths in files_by_skill.items():
        if not source_paths:
            print(f"No upstream files found for {skill_name} at {SKILL_PATHS[skill_name]}", file=sys.stderr)
            return 1

        skill_root = repo / PROJECT_SKILLS_DIR / skill_name
        skill_root.mkdir(parents=True, exist_ok=True)
        expected_relative_paths: set[str] = set()

        for source_path in source_paths:
            relative_path = source_path.removeprefix(f"{SKILL_PATHS[skill_name]}/")
            expected_relative_paths.add(relative_path)
            destination = skill_root / relative_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            payload = fetch_bytes(raw_file_url(repository, commit, source_path))
            destination.write_bytes(payload)

        remove_extraneous_files(skill_root, expected_relative_paths)

    manifest = build_manifest(repository, commit, files_by_skill)
    write_manifest(manifest_path, manifest)
    print(f"Synced {len(files_by_skill)} Anthropic skills at commit {commit}")
    return 0


def load_manifest(manifest_path: Path) -> dict:
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def verify_skills(manifest_path: Path) -> int:
    repo = repo_root()
    manifest = load_manifest(manifest_path)
    repository = str(manifest["repositorySlug"])
    commit = str(manifest["commit"])
    failures: list[str] = []

    for skill_name, skill_entry in manifest.get("skills", {}).items():
        skill_root = repo / PROJECT_SKILLS_DIR / skill_name
        expected_relative_paths = {file_entry["path"] for file_entry in skill_entry.get("files", [])}

        for file_entry in skill_entry.get("files", []):
            relative_path = str(file_entry["path"])
            source_path = str(file_entry["sourcePath"])
            expected_hash = str(file_entry["sha256"])
            expected_size = int(file_entry["size"])

            local_path = skill_root / relative_path
            if not local_path.exists():
                failures.append(f"Missing local file: {local_path}")
                continue

            local_payload = local_path.read_bytes()
            local_hash = sha256_hex(local_payload)
            if local_hash != expected_hash:
                failures.append(f"Hash drift in {local_path}: expected {expected_hash}, got {local_hash}")
            if len(local_payload) != expected_size:
                failures.append(f"Size drift in {local_path}: expected {expected_size}, got {len(local_payload)}")

            upstream_payload = fetch_bytes(raw_file_url(repository, commit, source_path))
            upstream_hash = sha256_hex(upstream_payload)
            if upstream_hash != expected_hash:
                failures.append(
                    f"Upstream hash drift for {source_path}: expected {expected_hash}, got {upstream_hash}"
                )

        if skill_root.exists():
            for local_path in skill_root.rglob("*"):
                if not local_path.is_file():
                    continue
                relative_path = local_path.relative_to(skill_root).as_posix()
                if relative_path not in expected_relative_paths:
                    failures.append(f"Unexpected local file under {skill_name}: {relative_path}")

    if failures:
        for failure in failures:
            print(failure, file=sys.stderr)
        return 1

    print(
        f"Verified exact Anthropic skill snapshots for {', '.join(sorted(manifest.get('skills', {})))} "
        f"at commit {commit}"
    )
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync or verify exact Anthropic Claude skills.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--sync", action="store_true", help="Fetch the pinned upstream skills and rewrite the local copy.")
    mode.add_argument("--check", action="store_true", help="Verify local vendored skills against the lock manifest and upstream.")
    parser.add_argument("--commit", help="Pinned upstream commit SHA. Required for initial sync.")
    parser.add_argument("--repository", default=DEFAULT_REPOSITORY, help="GitHub repository slug, e.g. anthropics/skills.")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST), help="Path to the lock manifest.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo = repo_root()
    manifest_path = repo / args.manifest

    try:
        if args.sync:
            commit = args.commit
            if not commit and manifest_path.exists():
                commit = str(load_manifest(manifest_path)["commit"])
            if not commit:
                raise ValueError("A pinned --commit SHA is required for the initial sync.")
            return sync_skills(args.repository, commit, manifest_path)

        return verify_skills(manifest_path)
    except (FileNotFoundError, urllib.error.HTTPError, urllib.error.URLError, ValueError, KeyError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
