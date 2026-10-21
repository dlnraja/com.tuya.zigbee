# P2933 / P2934 — Homey diag reports via Gmail + Aqara DJT11LM (2026-10-21)

## P2933 Gmail diagnostics lookup (read-only)
- 204 needs-info items carry 225 UUIDs. They were searched in Gmail in OR batches; 36 threads from noreply@homey.app were read (51 thread files, 393 messages).
- 123 items matched a message whose `Log ID` equals their UUID. Matching is per message, never per thread.
- 13 items now `already-fixed`, each because the exact couple named in the diag log is owned by one driver today:
  - `_TZ3000_5bpeda8u` -> button_wireless_1 (140352#527/#538/#621)
  - `_TZ3000_0dumfk2z|TS0215A` -> button_emergency_sos (#598/#602)
  - `_TZ3000_7ysdnebc|TS1101` -> dimmer_2_gang (#573)
  - `_TZE200_crq3r3la|TS0601` -> presence_sensor_radar (#941)
  - `_TZ3000_l9brjwau|TS0002` -> wall_switch_2gang_1way (#1086/#1093)
  - `_TZ3002_pzao9ls1|TS0726` -> wall_switch_4gang_1way (#1092/#1155)
  - `_TZ3000_zgyzgdua|TS0044` -> scene_switch_4 (#1152/#1154)
- 110 items: the diag was read and its source recorded in the note, but the report holds no exact mfr+pid (app-crash / "no data" logs, HOBEIAN devices without a model id). They stay needs-info.
- Mfrs that only appear in printed driver lists (e.g. `_TYZB01_vkwryfdr`) were ignored as noise.
- No mail was sent or labelled.

## P2934 Aqara DJT11LM (LUMI / lumi.vibration.aq1)
- Couple added to vibration_sensor (compose + app.json). Native cluster 0x0101 was added to ep1 (additive), together with a pin and credits.
- `lib/overlays/LumiVibrationOverlay.js` is an optional raw-frame overlay that arms only for LUMI manufacturer names. It reads attribute reports on 0x0101:
  - 0x0055 event (1 vibration, 2 tilt, 3 drop)
  - 0x0503 angle
  - 0x0505 strength
- Wording is our own, after Z2M `lumi_vibration_analog` and the ZHA xiaomi vibration quirk.
- Effects: vibration sets `alarm_vibration` (auto-reset uses `vibration_auto_reset`, default 90 s); tilt/drop set `alarm_tamper`.
- Sensitivity writes (genBasic 0xFF0D, Lumi mfr code) are NOT implemented. That is a write path and is left as a lead.
- Reviewed duals added for the theoretical cartesian pairs LUMI|TS0601 and LUMI|CK-BL702-MWS-01(7016). Real Aqara devices match on their own lumi.* model id.
- Test: test/critical/p2934-aqara-djt11lm.test.js
