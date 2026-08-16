# P198 — Recursive CI research pass (2026-08-16)

## Live

- Homey Test: 9.0.565+ (Auto-Publish). Stable soak-first skip draft **verified**.
- Open issues/PRs: none.

## Findings → fixes

| Finding | Class | Fix |
|---------|-------|-----|
| Auto-Fix `cannot lock ref` / hard-fail on dirty tree | BOTH | per-branch concurrency + soft dirty + push retry |
| `curtain_motor_shutter` `clearInterval` vs `homey.setInterval` | BOTH | safe-timers |
| mega-crawler missing silent forum scan | MASTER_ONLY | add `forum-silent` crawler |

## Verify

```bash
node --check drivers/curtain_motor_shutter/device.js
node tools/ci/regression-lessons-gate.js
```
