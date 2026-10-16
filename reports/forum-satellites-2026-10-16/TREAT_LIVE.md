# Forum satellites + full T26439 — silent treat 2026-10-16

**Policy:** SHADOW only · no forum POST · no invent pid · complementary enrich

## Scanned topics (multi-silent)

| Topic | Name | actionable | newFP |
|------:|------|------------|------:|
| 140352 | Universal Tuya Test | 30 | 0 |
| 26439 | Johan Tuya Zigbee (full harvest) | 16 | 1* |
| 89271 | Device Request Archive | 57 | 0 |
| 146735 | Smart Life | 17 | 0 |
| 156967 | Moes official | 36 | 0 |
| 150690 | Relax Moes | 21 | 0 |
| 154092 | Zemismart hello | 11 | 0 |
| 146667 | HOBEIAN ZG-303Z | 12 | 0 |
| 99614 | Nous | 9 | 0 |
| 120477 | Rain solar | 2 | 0 |
| + others | RF / WiFi / capabilities… | — | 0 |

\* `newFP` = OCR `_TZE284_9EM5SFH` → **REJECT** (canonical `_TZE284_9ern5sfh`)

## Fleet gap (105 OK / 14 flagged)

| Status | Couples | Action |
|--------|---------|--------|
| REJECT_OCR | 9em5sfh, jrqzgeuh pad, TZE28C100000_ short pad | doNotLock |
| PID_MISS false | zmy4lslw+TS0001, cayepv1a+TS0001, 4upl1fcj+TS0505B, … | forum mfr/pid mix — verified siblings already OK |
| Real covered | w8jwkczz+TS0043, tgvtvdoc+TS0207, 3mzb0sdz curtain short+long | already in drivers |

## Code ship (P2828)

- `wall_remote_3_gang` EP1–3: add powerCfg `1` + identify `3` + E000 `57344` + bindings (same shape as P2827 TS0042)
- Registry: OCR 9em5sfh, w8jwkczz lock, tgvtvdoc rain, forum pid-mix notes
- Contre quoi: `test/critical/p2828-forum-satellites-full-thread.test.js`

## Dual-app

**BOTH** — reliability (remote clusters + sacred locks). Tip master Test; stable backport when asked.
