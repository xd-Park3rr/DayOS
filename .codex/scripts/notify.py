#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import sys

MAX_MESSAGE_CHARS = 400


def truncate(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if len(text) <= MAX_MESSAGE_CHARS:
        return text
    return text[: MAX_MESSAGE_CHARS - 3] + "..."


def main() -> int:
    if len(sys.argv) < 2:
        return 0

    try:
        payload = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        return 0

    runtime_dir = Path(__file__).resolve().parents[1] / "runtime"
    runtime_dir.mkdir(parents=True, exist_ok=True)
    event_type = str(payload.get("type") or "").strip()
    if not event_type:
        return 0

    record = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "type": event_type,
        "cwd": payload.get("cwd"),
        "thread_id": payload.get("thread-id"),
        "turn_id": payload.get("turn-id"),
        "profile": payload.get("profile"),
        "last_message": truncate(payload.get("last-assistant-message")),
    }
    log_path = runtime_dir / "notifications.jsonl"
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=True) + "\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
