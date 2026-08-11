# P120 — Hardening axes (bed / IR / radar / CI)

Date: 2026-08-11 · Version: 9.0.481

## Shipped

| Axis | Change |
|------|--------|
| Bed sensor settings | Align compose with Z2M DPs (sensitivity enum, interval, presence delays); drop bogus pressure_offset |
| Bed battery | No invent 100%/10% — alarm on 0, 100 only on binary 1 |
| Bed timers | `safeSetTimeout` / `safeSetInterval` |
| IR learn stickiness | Legacy `_enableLearnMode` sets guard flags + button; blaster_remote stop-learn on timeout/done |
| Radar clrdrnya | Settings compose + force strip phantom battery/temp/humidity on mains |
| EF00 double-division | Skip Adaptive convert when dpMap has cap/capability/parse |
| `smart_switch` | Migrated to `TuyaZigbeeDevice`, off bare allowlist |
| CI | unbound-catch `--gate` + soft adaptive-double-division gate in auto-fix-and-publish |

## Local

```bash
npm run check:bare-zigbee
npm run check:unbound-catch
npm run check:double-division
```
