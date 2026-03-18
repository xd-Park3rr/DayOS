#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone

from common import emit_output, load_event, resolve_repo_root, runtime_path


def main() -> None:
    event = load_event()
    repo_root = resolve_repo_root(event)
    backup_dir = repo_root / ".claude" / "compact-backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    phase_file = repo_root / runtime_path("phase-state.json")
    phase_state = {}
    if phase_file.exists():
        phase_state = json.loads(phase_file.read_text(encoding="utf-8"))

    backup_path = backup_dir / f"{timestamp}.json"
    backup_path.write_text(
        json.dumps(
            {
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "phaseState": phase_state,
                "event": event,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    emit_output(
        "PreCompact",
        additional_context=f"Saved compact backup to {backup_path.relative_to(repo_root).as_posix()}",
    )


if __name__ == "__main__":
    main()
