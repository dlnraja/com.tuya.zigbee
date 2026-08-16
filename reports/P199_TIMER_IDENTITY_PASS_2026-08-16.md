# P199 — Next-layer timer + identity pass (2026-08-16)

## Live

- Soak-first Publish Stable `31972944327`: draft+promote **skipped** again
- Auto-Publish P198 queued/pending behind prior runs
- Open issues/PRs: none

## Findings → fixes

| Finding | Class | Fix |
|---------|-------|-----|
| `sensor_presence_radar` raw `clearInterval` vs `homey.setInterval` | BOTH | safeSetInterval/safeClearInterval |
| `sensor_contact_motion` same mismatch (poll/lux/sleep) | BOTH | safe-timers |
| PROJECT_INDEX / MASTER_REFERENCE / HOMEY_DEV_PORTAL_MAP still claim `.stable` App ID | BOTH docs | shared App ID truth |

## Verify

```bash
node --check drivers/sensor_presence_radar/device.js
node --check drivers/sensor_contact_motion/device.js
node --test test/critical/p199-homey-timer-clears.test.js
```
