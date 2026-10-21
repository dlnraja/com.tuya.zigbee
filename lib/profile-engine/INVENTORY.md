# Smart-logic inventory (Z2M / ZHA / deCONZ / tuya-local / Johan) → our profile engine

Ranked by value for users / risk. Status on branch kb/import.

| # | Pattern | Upstream idea (credit) | Our module | Status |
|---|---|---|---|---|
| 1 | DP value transforms (scale/divide/offset/enum/bool/bitmap/raw struct) | zhc valueConverter (Koenkk), tuya-local mapping (make-all), DDF eval (dresden-elektronik) | transforms.js | done + tests |
| 2 | Per-firmware / per-mfr DP variants | zhc multiple definitions per fingerprint | ProfileEngine.resolveDps | done + tests |
| 3 | Whitelabel alias | zhc whiteLabel | ProfileEngine.whitelabelOf | done + tests |
| 4 | Calibration + precision | Z2M *_calibration/*_precision | transforms.calibrate | done + tests |
| 5 | Debounce / throttle / filtered attributes / optimistic | Z2M generic device options | options.js ReportOptions | done + tests (not wired to drivers) |
| 6 | Availability / ping | Z2M availability | availability.js | done + tests (not wired) |
| 7 | Power-on behaviour / child lock generic settings | zhc tuya modernExtend | ProfileEngine.settingWrite | done + tests (no settings in app.json yet) |
| 8 | Declarative device descriptions | deCONZ DDF, tuya-local YAML | data/profiles/*.json, lazy, size-bounded | schema + 1 reference profile |
| 9 | Multi-endpoint mapping | zhc endpoint map | dps[].endpoint | in schema, decode returns endpoint |
| 10 | Quirks: fake-cluster replacement, attribute fixes, reporting config | ZHA quirks (zigpy) | schema `quirks` | schema only — TODO runtime |
| 11 | Legacy vs modern scene/button | zhc TS004F 0x8004, E000/E001 | already ButtonEventRouter (P2926) | exists |
| 12 | OTA patterns | Koenkk zigbee-OTA index | read-only observer (exists) + KB index | KB only |
| 13 | Transition default + Zigbee group binding | Z2M transition / groups | — | TODO (needs app.json settings → after bisect) |
| 14 | KB → profile generator (zhc tuyaDatapoints → profiles) | zhc | — | TODO next batch |

Kill switch: app setting `profile_engine_off` or env `PROFILE_ENGINE_OFF=1`. Native clusters stay the base; the engine only adds DP/extra mapping.

## P-KB3 — wired (optional)
- `ProfileLayerAttach.js`: attached in `TuyaZigbeeDevice` right after the ZCL cluster layer, detached on delete/uninit.
  Fill-only (never adds/removes a capability), driver `dpMappings` win, kill switches `profile_engine` (device) / `profile_engine_off` (app) / env `PROFILE_ENGINE_OFF=1`.
- Settings read when present (default off): `pe_debounce_ms`, `pe_throttle_ms`, `pe_filtered_attributes` (comma regex list), `pe_optimistic`, `pe_transition_ms`, `pe_group_id` (comma list), `<cap>_calibration`.
- `transition.js` (transitionTime helper), `groups.js` (opt-in addGroup), runtime quirks `quirks.reporting` (max 8, best effort).
- `scripts/kb/generate-profiles.js`: KB couples → match-only stubs in `data/kb/profiles-generated/` (not bundled, no DP guessing).
