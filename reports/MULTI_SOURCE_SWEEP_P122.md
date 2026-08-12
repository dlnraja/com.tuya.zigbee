# P122 — Full multi-source analyze / fix / publish

Date: 2026-08-12 · Version: 9.0.484

## Sources checked
- GitHub issues/PRs: **0 open**
- Gmail crash pattern gate: ok (historical fixed_p100/p101)
- Anti-bot / bare-zigbee / unbound-catch: green
- Forum silent + multi-source enrich `--apply`: 12 phases ok
- Workflow policy: 0 errors after harden

## Fixes shipped
| Item | Change |
|------|--------|
| `fzo2pocs` | Off `switch_1gang` → curtain only + anti-bot lock |
| Curtain | Dropped `ZBMINI*` productIds (false pairing) |
| mmWave | Stripped phantom temp/humidity/battery; added `clrdrnya` |
| EF00 `_generic` | No longer invents `alarm_motion` / USB onoffs |
| Workflows | Top-level bash defaults; missing `timeout-minutes` |

## Deferred (next passes)
- Remaining ~22 bare ZigBeeDevice drivers
- Double-division `--hard` gate
- Full IAS WD elevate via DeviceIOFacade
