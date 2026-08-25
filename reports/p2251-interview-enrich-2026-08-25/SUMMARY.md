# P2251 — Investigation enrich (interviews / soft couples / prior prompts)

Silent only. Sacred couple = mfr+pid. Never invent.

## Sources scanned
- `reports/forum-verify-2026-08-24/NEED_ACTION.md` (softHypothesis rows)
- `reports/diag-recursive-treat-2026-08-24/REMAINING_CASES.md`
- `docs/data/DEVICE_INTERVIEWS.json`
- compose / mfs / DeviceFingerprintDB / registry
- agent prior: HOBEIAN climate, TS004x remotes, Tongou, Peter ABSENT

## Verdict
Most NEED_ACTION softHypothesis rows were **stale** — couples already locked (P2236). Real enrich work applied below.

## Applied (master → stable sync)

| Item | Change |
|------|--------|
| INT-062 | Was false `TS011F`→`plug_smart`. Now `_TZ3000_kfu8zapd`+`TS0044`→`button_wireless_4` |
| 0x8004 | `kfu8zapd` / `xabckq1v` skip scene write (same class as Nobø) |
| HOBEIAN mfs | `multiCouple` + `byPid` (climate/soil/presence/contact/water/switch/lux/button) — **no bare TS0601** |
| ProbabilisticDeviceDetector | Resolves `byPid` before brand `driverId` |
| FPDB | `nkcobies` TS011F/TS0121; HOBEIAN ZG-227ZL/102ZL/204*/106Z/101ZL |
| new-fingerprints | `4upl1fcj` → `button_wireless_1` (not wall_remote) |
| Registry | SergeP `_TZ3000_v5498kdm`+TS0001 **doNotTouch** (Nous/SoPhos) |

## Still ABSENT / DO_NOT_TOUCH (no invent)
- Peter / f647 smartbutton — couple absent in posts
- late4marshmellow `_TZ3210_3lbtuxgp`+TS0505B
- melectro `_TZ3000_upgcbody`+TS0207
- Soft TS0001 for xabckq1v / nkcobies

## User action (no forum reply)
Tongou / BSEED climate / meter91 / Nobø / SunBeech / Moes 4-btn: **update Test + re-pair** where driver changed.

## Gates
```bash
node tools/ci/anti-bot-regression-gate.js
node node_modules/mocha/bin/mocha.js test/critical/p2250-hobeian-couples-gate.test.js test/critical/p2251-interview-enrich-gate.test.js
```
