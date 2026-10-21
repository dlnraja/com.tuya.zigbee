# P2921 — HEIMAN native drivers + resolver keeps manufacturer names (21/10/2026)

## Heiman in universal_zigbee
- v9.0.1575 publish step `FP conflict resolve` (scripts/automation/fix-fingerprint-conflicts.js)
  dropped `Heiman`/`heiman` from `universal_zigbee` ("safety(smoke_detector_advanced) beats diy").
- Coverage check: of the 66 universal_zigbee pids, only TS0041/TS0205/TS0601 have a specific
  driver with a heiman spelling; 63 couples had no other owner -> real loss -> both names restored.
- The resolver now only reports manufacturer-level removals (`.github/state/fp-conflict-mfr-report-only.json`);
  stripping needs `--allow-mfr-removal`, which no workflow passes. Pid-level removals unchanged.

## New drivers (native ZCL, not Tuya; allowlisted as bare ZigBeeDevice)
- `heiman_keyfob`: `HEIMAN` x `RC-EF-3.0` (HM1RC-2-E). IAS ACE 0x0501 client commands -> triggers
  disarm / arm home (day and night modes) / arm all zones / emergency; battery from 0x0001.
  Sources: zigbee-herdsman-converters PR #2182 (arnaud-gouder), deCONZ #3828. Sacred pin moved from
  button_emergency_sos (which never carried the couple in compose).
- `heiman_siren`: `HEIMAN`,`Heiman` x `WarningDevice`,`WarningDevice-EF-3.0` (HS2WD-E). IAS WD 0x0502
  startWarning built per ZCL spec (burglar mode, strobe, 1-1800 s), onoff + start/stop flow cards,
  battery from 0x0001. Sources: zigbee-herdsman-converters #3429 + zigbee2mqtt #1416, deCONZ DDF #6400 (BabaIsYou).
- Cross-product: no exact couple shared with any other driver (test p2921).
- Risk note: a new driver once correlated with Athom AggregateError (SPI); if the build fails,
  use the release_held/bisect procedure, not a silent hold of a published driver.
