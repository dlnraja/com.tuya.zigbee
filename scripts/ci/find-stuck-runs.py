#!/usr/bin/env python3
"""Find stuck runs of '🚀 Publish Stable to Test' (>90min in_progress).

Reads GH run list JSON from stdin, outputs 'OK' if none stuck,
or '<run_id> (<min>min)' per line for stuck runs.
"""
import sys
import json
import datetime

try:
    d = json.load(sys.stdin)
    now = datetime.datetime.now(datetime.timezone.utc)
    stuck = []
    for r in d:
        if r.get('status') == 'in_progress':
            started = datetime.datetime.fromisoformat(r['createdAt'].replace('Z', '+00:00'))
            age_min = (now - started).total_seconds() / 60
            if age_min > 90:
                stuck.append(f"{r['databaseId']} ({age_min:.0f}min)")
    if stuck:
        sys.stdout.write('\n'.join(stuck) + '\n')
    else:
        sys.stdout.write('OK\n')
except Exception as e:
    sys.stdout.write(f'error:{e}\n')
    sys.exit(1)
