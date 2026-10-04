# Progress journal

Human-readable log. Machine state: `data/progress/ledger.json` (read it before working, record after; helper `scripts/lib/ledger.js`, CLI `scripts/progress/ledger-cli.js`). Linked checkpoints: `data/leads/resume-checkpoint.json`, `data/leads/deep-read-checkpoint.json`, `data/leads/johan-deep-read-log.json`. Newest entries first. Times Europe/Paris.

## 2026-10-03
- 17:00 — Ledger + journal created; constitution rule "Progress ledger" added. Seeded 1502 Johan + 525 dlnraja issues/PRs as `pending` with upstream `updated_at`, resume-checkpoint done/next as `task:*`.
- 17:00 — JohanBendz #1298 deep read (HOBEIAN ZG-102ZL / `_TZE200_pay2byax` contact+lux). HOBEIAN|ZG-102ZL now exact on `contact_sensor` (pid dropped from `sensor_contact_zigbee`). Rules: `docs/rules/JOHAN_1298_CONTACT_LUX.md`. Commit f256633a6f. Leads deferred: 3 Z2M ZG-102ZL mfrs on climate_sensor, DP102 lux interval, ZG-102Z/ZA HOBEIAN dual.
- Earlier today (see git log): spec 003 T3+T5 `3f5cff34b6`, spec 004 T2 `f103de0961`, spec 005 T2 `7773230234`, spec 007 T4 `51836c1520`, spec 009 + #797 `340c553fa3`, size gate `f72476339d` → v9.0.1321 published to draft (Auto-Publish run 37122200090), Johan branches survey `01e999b137`. Bastien `bf6fb47ddd`. Stable `35b5248d29` + `1d8e55c578` local, awaiting approval.
