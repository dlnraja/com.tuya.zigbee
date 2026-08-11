# P115 — Buttons + Energy (? vs fake %)

Date: 2026-08-11 · Version: 9.0.475

## Sources used

- `docs/reports/INVESTIGATION_2026-06-28_BATTERY_BUTTON_FLOW.md`
- `docs/reports/TS004F_BUTTON_BATTERY_REFERENCE_2026-07-01.md`
- `reports/FLOW_BUTTON_AUDIT_REPORT.md`, forum digests (#2092–#2105)
- Agent explore of PhysicalButtonMixin / BatteryRouter / phantom manifests

## User symptoms addressed

1. **Physical buttons / flows flaky** — Homey UI toggles fired “physical” flows (ghost presses).
2. **Energy tile `?` or fake %** — mains sockets advertised `measure_battery` with null (shows `?`) or routers invented 50%/10%/100%.

## Fixes

### Buttons
- `PhysicalButtonMixin.markAppCommand`: never silent-return; always set `_appCommandPending` + call `super`; lazy-create gang state.
- Init order: do not mark detection initialized when setting disabled; allow re-init.
- Remove double `PhysicalButtonMixin` wrap on `button_wireless_usb`, `motion_sensor_2`, `switch_dimmer_1gang` (`TuyaZigbeeDevice` already has mixins).

### Energy / battery
- `BatteryRouter` NONE: **remove** `measure_battery`/`alarm_battery` (was log-only).
- Stop inventing **50%** default; restore from store or leave null (`?` until real report).
- `SmartBatteryManager`: stop inventing 10%/100% from alarm alone; detect mains via `energy.mains` + power caps; strip phantom caps at runtime.
- Compose strip: **51** mains/power drivers lost phantom `measure_battery` (`tools/ci/strip-phantom-battery-mains.js`).
- True remotes (`button_wireless_4`, etc.) keep CR2032/`measure_battery`.

## Commands

```bash
node tools/ci/strip-phantom-battery-mains.js          # dry-run
node tools/ci/strip-phantom-battery-mains.js --apply
```
