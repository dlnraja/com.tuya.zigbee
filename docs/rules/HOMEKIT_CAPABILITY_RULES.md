# Tile state, HomeKit and capability coverage rules (t699u, t719u-t722u)

Permanent rules. Additive only, nothing invented, per exact mfr+pid.

1. **Tile state** — the main `onoff` drives the Homey tile state (`uiState: true`, set at runtime
   on Homey >= 13.5.0 by `lib/ui/TileStateGuard.js`); secondary booleans (`onoff.*`, child_lock,
   frost_protection, ...) get `uiState: false`. The manifest keeps compatibility >=12.2.0 (SDK-M14).
2. **Same setting => same capabilities** — when `enable_power_estimation` is on and the device has no
   real metering, estimated `measure_power` + `meter_power` (option `approximated: true`) are added
   once the 5-min energy audit is done (`lib/energy/EstimatedEnergyCaps.js`, bounded retries).
   Init timing must never decide which tile a device gets.
3. **onoff truth** — real device reports always go through `setCapabilityValue('onoff', …)`; commands
   (Homey UI, flows, Apple Home through Homey's bridge) go through the registered capability listener
   and are followed by a read-back where the device supports it; read once after restart.
4. **HomeKit** — Homey's Apple Home bridge maps from device class + system capabilities. Keep
   HomeKit-mappable classes (light, socket, sensor, windowcoverings, thermostat, ...) and system
   capabilities (onoff, dim, measure_*, alarm_*, windowcoverings_set, target_temperature, ...) as
   primaries; custom capabilities are not bridged.
5. **No real data lost** — a real, source-confirmed DP that has no native capability is exposed through
   a custom capability or sub-capability (`measure_power.xxx`), a flow card or a setting. CI should flag
   real DPs with no exposed capability. Every capability stays optional, never required for pairing.
6. **Bastien fixes** ship to `bastien-home` together with `master` (see BASTIEN_HOUSE_APP.md).

## Heap gate note (P3130)
`test/p2915-load-heap.test.js` retained-heap bound raised 10 -> 10.5 MB only, because the estimated
energy capabilities are now added deterministically (+0.1-0.2 MB on 150 simulated devices, flat 100->300 events).
The real leak guard is the slope test (kept heap 100->300 events must grow < 1 MB). Never raise the bound
without measuring the slope and citing the cause.

## Capability coherence + compensation (P3135, t719u/t721u/t722u/t723u) — permanent
- Same driver + same setting => same capability set (e.g. `enable_power_estimation` => estimated `measure_power`/`meter_power`).
- Maximise real, source-confirmed capabilities per exact mfr+pid; additive, optional, never invented DPs.
- A real DP Homey/HomeKit cannot show natively is compensated: custom capability, sub-capability (`cap.x`), flow card, or setting. Never `capability: null` with no setting/flow.
- HomeKit only bridges system caps on mappable classes: prefer them; custom caps stay Homey-only and must be documented.
- CI: `npm run audit:capabilities` + `test/p3135-capability-coherence-audit.test.js` (ratchet A/B/C, counts only go down).

## Standard units for Insights and Apple Home (P3362) — permanent
- Every `measure_*` / `meter_*` / `target_temperature` capability must declare its standard
  unit. Missing units hide Homey Insights History and make same-type tiles disagree in
  Homey and Apple Home.
- Table: `config/architecture/standard-capability-units.json`. Healer:
  `lib/utils/HomeyCapabilityUx.js`. Ratchet: `npm run check:p3362`.
- Weekday free GitHub Actions workflow `.github/workflows/apple-home-coherence.yml`
  auto-adds missing units from that table and reports same-type gaps. It does not invent
  capabilities or couples. Kill switch: `vars.APPLE_HOME_COHERENCE_DISABLED`.
- `°` (U+00B0) is Latin-1 and is allowed in unit strings.
