#!/usr/bin/env python3
"""Detect failure mode from a GH run JSON. Outputs 'job|step' or 'unknown|none'."""
import sys
import json

try:
    d = json.load(sys.stdin)
    for j in d.get('jobs', []):
        if j.get('conclusion') == 'failure':
            name = j['name']
            for s in j.get('steps', []):
                if s.get('conclusion') == 'failure':
                    sys.stdout.write(f"{name}|{s['name']}\n")
                    sys.exit(0)
    sys.stdout.write('unknown|none\n')
except Exception as e:
    sys.stdout.write(f'unknown|error:{e}\n')
    sys.exit(1)
