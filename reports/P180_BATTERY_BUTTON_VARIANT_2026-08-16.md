# P180 — Battery, buttons and variant-aware identity (2026-08-16)

Follow-up to P179. The trigger was a correction: **one `manufacturerName` can cover
thousands of configuration / productId / productName / modelName variants**, so a
brand-level strip is the wrong instrument. This pass re-derived the identity model
from local evidence, then fixed the bugs that investigation surfaced.

## 1. Identity model — what the evidence actually says

Sources: `data/z2m_cache.json`, `data/zg204_investigation.json`.

> "Each MFR can have multiple PIDs. Each MFR+PID can map to multiple device names.
> Each device name can have multiple MFR+PID variants. The mapping is N:N:N."

Concretely, a HOBEIAN ZG-204ZM reports `manufacturerName=_TZE200_tyffvoij`,
`modelId=TS0601`. **`ZG-204ZM` is a catalogue label, not a Zigbee identity.**

Two consequences:

- A literal `HOBEIAN` entry in `manufacturerName` can never match real hardware, so
  the P179 strip removed dead weight rather than coverage. Verified: HOBEIAN is now
  absent from all 431 drivers and no HOBEIAN couple lost its route.
- `ZG-*` entries in `productId` can never match either. 58 drivers still carry them,
  including placements that are plainly wrong (`light_bulb_rgb` carries the
  `ZG-102Z` contact sensor, `power_clamp_meter` carries `ZG-204ZM` presence). They
  do not break pairing, but they enlarge each driver's cartesian claim surface.

Real HOBEIAN routing was checked couple by couple and is **exclusive and correct**:

| Marketing name | Real couples | Driver |
|---|---|---|
| ZG-204ZM v1/v2/v3 | `_TZE200_2aaelwxk`, `_TZE200_kb5noeto`, `_TZE200_tyffvoij` + TS0601 | `presence_sensor_radar` |
| ZG-204ZP (= ZG-204ZK) | `_TZE200_ka8l86iu` + TS0601 | `presence_sensor_radar` |
| ZG-204ZX | `_TZE200_w0ap83qu` + TS0601 | `presence_sensor_radar` |
| ZG-303Z | 10 `_TZE200_/_TZE284_` couples + TS0601 | `soil_sensor` |
| ZG-204ZL | `_TZE200_3towulqd` + TS0601 | `presence_sensor_radar` — **open triage** |

`ZG-204ZL` is PIR + lux with no mmWave, so radar distance/zone/sensitivity settings
have no backing datapoint. Left in place deliberately: rerouting a fingerprint moves
where new pairings land and needs a human decision.

Frozen as machine-readable evidence in
[`data/marketing-model-alias-registry.json`](../data/marketing-model-alias-registry.json).

## 2. Battery fixes

| Bug | Effect | Fix |
|---|---|---|
| `Math.min(Math.max(v * 0) * 100)` on DP 3/4/15/101/102 | battery **pinned to 0%** on 5 drivers | real clamp `0..100` |
| raw `batteryPercentageRemaining` used as a percentage | ZCL reports 0-200, so a spec-compliant device read **double** its charge | routed through the new helper |
| `(v - 2.1) / (3.2 - 2.1) * 100` in the generic ZCL adapter | banned linear curve; a 2.7V CR2032 read ~55% instead of ~40% | non-linear discharge curve |
| `(volts - 2.2) / (3.2 - 2.2) * 100` in DP auto-discovery | same | same |

Drivers with the 0% bug: `sensor_climate_contact`, `sensor_contact_climate`,
`sensor_climate_temphumidsensor`, `sensor_climate_lcdtemphumidsensor`,
`sensor_lcdtemphumidsensor_temphumidsensor`.

Drivers with the doubled reading: the four climate sensors above plus
`sensor_lcdtemphumidsensor_soil`, `device_air_purifier_soil`, `sensor_presence_radar`,
`remote_button_wireless_wall`, `remote_button_wireless_smart`.

New choke point `lib/battery/zcl-percent.js` wraps `UnifiedBatteryHandler` so the
per-manufacturer quirk table is maintained in exactly one place:

- `normalizeZclBatteryPercent(raw, { manufacturer })` — sentinels, 0-50 / 0-100 / 0-200 scales
- `normalizeZclBatteryVoltagePercent(raw, { batteryType })` — unit detection then non-linear curve

## 3. Button / SOS fix

`drivers/remote_button_emergency_sos/device.js` was a verbatim copy of the
`smart_remote_4_buttons` stub. The compose declares `alarm_generic`, but nothing ever
wrote it, so **the panic state could never reach a flow**. Reimplemented on top of
`ButtonDevice`: any key press raises `alarm_generic` and it self-clears after 5s via
`safe-timers` so consecutive presses stay observable.

## 4. Automation

New report-only gate `tools/ci/battery-button-intelligence-gate.js`, wired into
`weekly-sovereign-loop.js` and `.github/workflows/self-improve.yml`.

| Rule | Detects |
|---|---|
| B1 | no-op battery transform (`v * 0`) |
| B2 | raw ZCL percentage outside the helper |
| B3 | banned linear voltage-to-percent formulas |
| B4 | `energy.batteries` without a battery capability |
| C1 | `alarm_generic` declared but driven by neither the driver nor its base class |
| F1 | marketing model names used as `productId` |

Comments and string literals are stripped before matching, and C1 resolves one level
of `require()` into `lib/`, so lesson registries and inherited handlers are not
reported as violations.

Current state: **B1/B2/B3 at zero**, 13 C1, 18 B4, 58 F1.

## 5. Open triage (report-only, needs device-level evidence)

1. **C1 x13** — `alarm_generic` never driven: 4 siren variants, 2 curtain, plus
   `switch_wireless`, `module_mini_switch`, `smart_rcbo`, `device_din_rail_meter`,
   `gateway_zigbee_bridge`, `air_purifier_curtain`, `shutter_roller_controller`.
   Each needs a per-device call: wire the alarm, or drop the capability.
2. **B4 x18** — mains devices carrying `energy.batteries`.
3. **F1 x58** — phantom `ZG-*` productIds.
4. **ZG-204ZL** rerouting decision.
5. Button stack still has four generations (mixins, `ButtonDevice`, copied E000
   overlays, two ~900-line inline remotes) plus two orphan engines
   (`UnifiedButtonEngine`, `LegacyButtonDetectionMixin`) that no driver uses.

## Commands

```bash
node tools/ci/battery-button-intelligence-gate.js
node tools/ci/battery-button-intelligence-gate.js --strict
node tools/ci/dual-claim-compose-gate.js --strict --include-brands
node tools/ci/max-coverage-investigate.js
```
