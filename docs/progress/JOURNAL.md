# Progress journal

Human-readable log. Machine state: `data/progress/ledger.json` (read it before working, record after; helper `scripts/lib/ledger.js`, CLI `scripts/progress/ledger-cli.js`). Linked checkpoints: `data/leads/resume-checkpoint.json`, `data/leads/deep-read-checkpoint.json`, `data/leads/johan-deep-read-log.json`. Newest entries first. Times Europe/Paris.

## 2026-10-04
- 02:50 — Publish fixes. Stable run 37164858704 failed the fingerprint-collision gate: `_TZ3000_4uuaja4a` (TS0726/TS130F) sat on curtain_module AND curtain_motor in stable (an old auto-fix re-added it to curtain_motor). Research (Johan, SmartThings Edge, Abeille, Hubitat, Z2M) says it is a TS130F Lonsonho curtain module; no source pairs it with TS0726. Kept on curtain_module (as on master), removed from stable curtain_motor: 1142e94d59; re-dispatched run 37165678667 = success. Rules: `docs/rules/FP_TZ3000_4UUAJA4A_CURTAIN_MODULE.md`.
- 02:50 — Master run 37164856948 failed `check:p248x` (P2518 lock): new driver `sensor_ias_zonetype_ewelink` had no `driver.flow.compose.json`. Added an empty one (system capability cards cover it): 72ed541dd6, pushed without [skip ci] → run 37165886836 (publishes #1298 + #1113). Bastien fdbeae7a1d.
- 02:50 — Constitution W4 (research every driver conflict, per pid, before removing anything); 702 dual couples seeded in the ledger as `conflict:*` (531 Tuya-style).
- 02:40 — JohanBendz #1113 deep read (+ #1475, #1008, #925, #1481/#1510). eWeLink|SNZB-03 is one identity for a PIR and a water detector: new driver `sensor_ias_zonetype_ewelink` picks the alarm capability from the device's IAS zoneType (`lib/sensors/IasZoneTypeRouter.js`), never guesses. Commit 88b3584cf6. Rules: `docs/rules/JOHAN_1113_AMBIGUOUS_IAS_IDENTITY.md`. Deferred: iHorn LH02121 (#925).

## 2026-10-03
- 17:00 — Ledger + journal created; constitution rule "Progress ledger" added. Seeded 1502 Johan + 525 dlnraja issues/PRs as `pending` with upstream `updated_at`, resume-checkpoint done/next as `task:*`.
- 17:00 — JohanBendz #1298 deep read (HOBEIAN ZG-102ZL / `_TZE200_pay2byax` contact+lux). HOBEIAN|ZG-102ZL now exact on `contact_sensor` (pid dropped from `sensor_contact_zigbee`). Rules: `docs/rules/JOHAN_1298_CONTACT_LUX.md`. Commit bca6ae7052. Leads deferred: 3 Z2M ZG-102ZL mfrs on climate_sensor, DP102 lux interval, ZG-102Z/ZA HOBEIAN dual.
- Earlier today (see git log): spec 003 T3+T5 `3f5cff34b6`, spec 004 T2 `f103de0961`, spec 005 T2 `7773230234`, spec 007 T4 `51836c1520`, spec 009 + #797 `340c553fa3`, size gate `f72476339d` → v9.0.1321 published to draft (Auto-Publish run 37122200090), Johan branches survey `01e999b137`. Bastien `bf6fb47ddd`. Stable `35b5248d29` + `1d8e55c578` local, awaiting approval.
