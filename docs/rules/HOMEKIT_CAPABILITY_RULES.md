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
