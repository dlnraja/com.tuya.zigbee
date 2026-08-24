#!/usr/bin/env python3
"""Cross-platform forum digest parser (P2214 Python twin).

Usage:
  python tools/ci/parse-forum-digest.py
  python tools/ci/parse-forum-digest.py --topic 140352 --min-post 2180
"""

from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATE = ROOT / ".github" / "state" / "forum"
DEFAULT_DIGEST = STATE / "multi-silent-digest.json"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def parse_args(argv: list[str]) -> dict:
    topic = 140352
    min_post = 2180
    digest = DEFAULT_DIGEST
    no_live = False
    i = 1
    while i < len(argv):
        a = argv[i]
        if a.startswith("--topic="):
            topic = int(a.split("=", 1)[1])
        elif a == "--topic" and i + 1 < len(argv):
            i += 1
            topic = int(argv[i])
        elif a.startswith("--min-post="):
            min_post = int(a.split("=", 1)[1])
        elif a == "--min-post" and i + 1 < len(argv):
            i += 1
            min_post = int(argv[i])
        elif a.startswith("--digest="):
            digest = Path(a.split("=", 1)[1])
        elif a == "--no-live":
            no_live = True
        i += 1
    return {"topic": topic, "min_post": min_post, "digest": digest, "no_live": no_live}


def fetch_live(topic_id: int) -> dict:
    url = f"https://community.homey.app/t/{topic_id}.json"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/json",
            "Accept-Encoding": "identity",
            "Referer": "https://community.homey.app/",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return {
        "topicId": topic_id,
        "title": data.get("title"),
        "posts_count": data.get("posts_count"),
        "highest_post_number": data.get("highest_post_number"),
        "last_posted_at": data.get("last_posted_at"),
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
    }


def main() -> int:
    args = parse_args(sys.argv)
    topic_id = args["topic"]
    min_post = args["min_post"]
    digest_path = args["digest"]

    if not digest_path.is_file():
        print(f"[parse-forum-digest] Missing digest: {digest_path}", file=sys.stderr)
        print("Run: npm run forum:silent-scan", file=sys.stderr)
        return 1

    digest = json.loads(digest_path.read_text(encoding="utf-8"))
    topic = next((t for t in digest.get("topics", []) if t.get("id") == topic_id), None)
    if not topic:
        print(f"[parse-forum-digest] Topic {topic_id} not in digest", file=sys.stderr)
        return 1

    actionable = topic.get("actionable") or []
    digest_highest = max((a.get("post_number") or 0) for a in actionable) if actionable else None

    live = None
    live_error = None
    if not args["no_live"]:
        try:
            live = fetch_live(topic_id)
        except Exception as exc:  # noqa: BLE001 — CLI tool
            live_error = str(exc)

    recent = sorted(
        [
            {
                "post_number": a.get("post_number"),
                "username": a.get("username"),
                "issues": a.get("issues") or [],
                "mfrs": a.get("mfrs") or [],
                "pids": a.get("pids") or [],
                "excerpt": (a.get("excerpt") or "")[:140],
            }
            for a in actionable
            if (a.get("post_number") or 0) >= min_post
        ],
        key=lambda x: x["post_number"] or 0,
        reverse=True,
    )

    gap = 0
    if live and digest_highest is not None:
        gap = max(0, (live.get("highest_post_number") or 0) - digest_highest)

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "topicId": topic_id,
        "digestPath": str(digest_path),
        "digestGeneratedAt": digest.get("generatedAt"),
        "digestHighestActionable": digest_highest,
        "liveHighest": live.get("highest_post_number") if live else None,
        "gap": gap,
        "recentActionable": recent,
        "liveError": live_error,
    }

    STATE.mkdir(parents=True, exist_ok=True)
    out = STATE / f"topic-{topic_id}-parse.json"
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print("=== parse-forum-digest.py (P2214) ===")
    print(f"Topic T{topic_id}: {topic.get('title', '')}")
    print(f"Digest highest actionable: #{digest_highest or '—'}")
    if live:
        print(f"Live highest_post_number: #{live['highest_post_number']} ({live['last_posted_at']})")
    elif live_error:
        print(f"Live fetch failed: {live_error}")
    print(f"Gap: {gap}")
    print(f"Wrote: {out}")
    return 2 if gap > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
