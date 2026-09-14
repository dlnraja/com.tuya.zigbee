# Gmail / Homey diag treat — 2026-09-14 (P2486)

Silent only. No forum posts. No raw excerpts committed.

Tip live: **9.0.916** (build #3180). Users on ≤9.0.908 still see EF00 OOM / tip lag.

## App crashes (Homey mails)

| When | Tip | Error | Verdict |
|------|-----|-------|---------|
| 2026-09-12 14:01–18:13 | 9.0.891 / 9.0.895 | `Driver Not Initialized` / `Invalid Driver ID: motionsensor` | **P2480/P2481** soft-fail — tip ≥9.0.901 |
| after 9.0.895 | — | no new crash mails | tip soak OK through #3180 |

## Diagnostics (thread `1a09051e67db8ee3` + siblings)

| Log ID | Tip | User / note | Couple | Verdict |
|--------|-----|-------------|--------|---------|
| `48baba36` / `d05e6530` | 9.0.874 | Salvagr Moes no move | `_TZE204_5slehgeo`+TS0601 | Tip lag; P2467/P2478 |
| `f177ecd4` | 9.0.891 | Salvagr timeout | same Moes | P2478 soft-timeout |
| `cbff8de4` | 9.0.895 | Salvagr % crash | same + DP retry storm | tip lag + P2481/P2484 |
| `ed0de063` / `b2d5c8db` | **9.0.908** | Salvagr still crash / settings hang | Moes + `_TZE200_127x7wnl` curtain | **P2484 + P2486** double EF00 manager |
| `375def7f` | 9.0.895 | Peter app crash | fleet | P2481 motionsensor |
| `8278ec79` | 9.0.908 | Peter still crashing | SOS `_tyzb01_trqoesc6` | P2484 EF00 re-init |
| `97413373` | 9.0.908 | Wuma68 #548 | `TUYATEC-ABKEHQUS`+TY0201 | P2484 |
| `8afffc76` / `1e071a86` | 9.0.882 / 891 | Smartbutton battery | `_TZ3000_mrpevh8p`+TS0041 | P2470; press works; battery UI tip lag |
| `d7a7dfa7` | 9.0.902 | presence mmWave | `_TZE200_3towulqd`+TS0601 | already `presence_sensor_radar`; re-pair / wake |
| `e96f52aa` / `d6245ab2` / `d9f86fed` | 9.0.874 | FrankEver valve | ABSENT mfr+pid | NEED_INTERVIEW (P2468/P2473) |
| `a342c411` | 9.0.846 | smart_knob press | `_TZ3000_kaflzta4`+TS004F | P2439 scene knob; tip lag |
| `8adfe4ce` | 9.0.857 | Salvagr still not working | Moes ZTS | tip lag |

## GitHub (from Gmail + API)

| Issue | User | Status |
|-------|------|--------|
| **#533** | salvagr | OPEN — tip ≥**9.0.916**; Moes moves; remaining crash/settings = P2484/P2486 |
| **#547** | HiepSVG | `_TZE204_gkfbdvyx`+TS0601 → `presence_sensor_radar` (P2482 sacred-keep); was Unknown virtualdriver — **remove + re-pair** |
| **#548** | Wuma68 | crash @ 9.0.908 = P2484 OOM; update ≥9.0.914 |

## Code this pass (P2486) — BOTH

- `lib/layers/UniversalLayerBootstrap.js` — do not replace existing `tuyaEF00Manager`
- `lib/devices/BaseUnifiedDevice.js` — soft-create only if missing
- `lib/tuya/TuyaEF00Manager.js` — early-exit sets `_initialized` (no re-entry flood)
- Test: `test/critical/p2486-ef00-manager-no-replace.test.js` · `npm run check:p2486`

## Dual-app

Classify: **BOTH** (crash reliability). Backport P2486 surgically to `stable-v5` when publish asked.
