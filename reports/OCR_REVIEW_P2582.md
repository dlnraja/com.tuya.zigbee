# OCR review findings — P2582 (2026-09-18)

Delegation mode: `ocr delegate preview --from HEAD~25 --to HEAD` → **116** reviewable / 35 excluded.

## Fixed (high confidence)

| Severity | File | Finding | Fix |
|----------|------|---------|-----|
| High | `drivers/presence_sensor_radar/device.js` | Watchdog used `age = Infinity` when `_lastDistanceAt` unset → cleared presence on first tick | Require `_lastDistanceAt` before soft-clear |
| High | same | `safeSetInterval` handle not stored / not cleared on delete | `_presenceWatchdogTimer` + `_clearStickyPresenceWatchdog` in onUninit/onDeleted |
| Low | `lib/tuya/TongouAcFrequency.js` | Redundant `Math.round((n/100)*100)/100` | Simplify to `Math.round(n)/100` |

## Accepted / intentional (not bugs)

- P2581 fail-closed `onoff` strip when `hasRelay !== false` — VicHY #2247 / 8d9d0199
- EF00-only mfr force in IntelligentProtocolDetect — Michaelp #2244 / VicHY radar
- Large baseline JSON churn — out of OCR runtime scope (excluded in project rules)

## Project improvements shipped

- `.opencodereview/rule.json` Homey sacred-couple rules
- Cursor local plugin + `.agents/skills/open-code-review-homey`
- `workflow_dispatch` OCR (forfait: delegate only)
- Gates: `npm run check:p2582` / `review:ocr`
