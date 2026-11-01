# Firmware-limit compensation (P3101, t656u)

Some firmwares never send a value (TRV06 `_TZE200_rxq4iti9`/TS0601: no battery %, only DP35 bit0 battery-low, rarely sent — #560).

- Data: `config/firmware-limits.json`, exact mfr+pid couples only, one recorded source each.
- Code: `lib/compensation/FirmwareLimitCompensation.js` (attach after init; nothing at pairing; no capability added or removed).
- Real value wins: `markReal(cap)` disables the estimate for good (stored `fwlimit_<cap>_real`).
- Estimates are flagged (`origin: 'estimated'`, store `fwlimit_<cap>_estimate`).
- Battery: the rules "never alarm_battery + measure_battery" and "never invent a %" stand, so the alarm-derived % stays in store; the UI keeps alarm_battery.
- Power/energy: owned by `DeviceTelemetryEstimator` / `VirtualEnergyEstimator`; not duplicated.
- Missing reports: bounded polling (min 60 min, max 12 polls/24 h, max 4 DPs per poll, unref'd timer, cleared on uninit/delete).
- CI: `scripts/ci/firmware-limit-audit.js` in node22-tests: validates the config (`--strict` fails only on invalid entries) and lists drivers with a firmware-limit note but no entry (report-only).

P3108 (t657u): opt-in setting `fwlimit_show_estimated_battery` (default OFF). ON: the flagged alarm-derived estimate is also shown as `measure_battery` (store `fwlimit_measure_battery_shown` marks the capability as ours; `shownOkPercent` when not low). A real battery DP disables it for good and the capability becomes real-owned. OFF: only a capability we added is removed.
