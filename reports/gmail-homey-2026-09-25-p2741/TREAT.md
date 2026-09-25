# P2741 — Bastien live treat 2026-09-25

## Homey
- ID: `65d495eb252c3ef65c879247` (Homey Pro de Bastien)
- App on box before treat: **Zigbee Bastien v1.0.107** Test (auto-update ON)
- Tip after publish: **1.0.108**

## Fresh diag
- UUID: `6bdc3c5e-1a8c-4eac-be7c-05b591a1f5b9`
- App Version: **v1.0.107** · Homey **v13.5.0** · model `homey5q`
- stderr: n/a (no crash / no OOM)

## Verdict (6bdc3c5e)
- P2733 snappy wake **live**: `listen-only (no mass bind / no batt TX)`
- Remotes present + DATA-RECOVERY OK (TS0041 / TS0042 / TS0043)
- Devices page recovered after restart (temporary "Chargement…" during app restart only)
- Residual: `[P2475] MCU time re-sync on endDeviceAnnounce` still fired on `button_wireless_1` **after** P2733 → **P2741 skip**

## Fix shipped
- `BaseUnifiedDevice` announce: skip `sendTimeSync` when `skipBatteryReporting` / `snappyRelayFlow` / `noEf00Tx`
- Contre quoi: `test/critical/p2741-bastien-6bdc3c5e-skip-mcu-sync-remote.test.js`
- Tips: Universal **9.0.1257** · Bastien **1.0.108**
- Dual-app: **BOTH** (+ Bastien house tip)

## Chrome force update
- App Store install picker has no Bastien Pro target (only Dylan Homey / Self-Hosted) — Dylan is guest on Bastien Andrieu account
- Athom Test confirmed **v1.0.108** (CI verify OK)
- Box still **v1.0.107** at treat time — auto-update ON + app Restart done; Homey will pull 1.0.108 when Athom pushes to box
- Devices page loads all rooms; remotes visible (TS0041/42/43)
- Universal Test tip **9.0.1257** live on Athom
