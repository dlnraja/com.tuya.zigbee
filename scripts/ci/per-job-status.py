#!/usr/bin/env python3
"""Render per-job status table for GH run JSON. Outputs markdown table."""
import sys
import json

try:
    d = json.load(sys.stdin)
    for j in d.get('jobs', []):
        name = j.get('name', '-')
        status = j.get('status', '-')
        conclusion = j.get('conclusion', '-') or '-'
        started = j.get('startedAt', '-')
        completed = j.get('completedAt', '-')
        sys.stdout.write(f"| {name} | {status} | {conclusion} | {started} | {completed} |\n")
except Exception as e:
    sys.stdout.write(f"| error | - | - | - | {e} |\n")
    sys.exit(1)
