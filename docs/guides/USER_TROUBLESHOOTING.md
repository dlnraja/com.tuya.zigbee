# User troubleshooting (from community returns)

Practical fixes for the issues people report most on Homey Test. Prefer **re-pair** after fingerprint fixes — Homey does not hot-swap drivers.

## Wrong device type after pairing

Homey matches **`(manufacturerName + productId)`** (sacred couple). Picking the wrong tile in the UI often still ends on the driver that owns that couple.

| Example | Canonical driver | Action |
|---------|------------------|--------|
| `_TZE284_m1cvyneb` + `TS0601` | `wall_dimmer_tuya` | Remove climate-paired device → re-pair as wall dimmer |
| `_TZ3210_imaccztn` + `TS0004` | `relay_board_4_channel` | Re-pair as relay board (not 4-gang switch) |
| `_TZ3000_k4ej3ww2` + `TS0207` | `water_leak_sensor` (IAS) | Not the Tuya-DP water driver |

Registry: `data/user-misattribution-registry.json`.

## Many duplicate drivers in the list

Same OEM IDs appear on many product variants. Duplicates in the **picker** are not always a bug; Homey still binds by sacred couple. Clean **ghost devices** you do not use (do not uninstall the whole app). After big fingerprint cleanups, delete the bad paired instance and re-pair once.

## App crashes / high CPU or RAM

1. Homey → Apps → Universal Tuya → send **diagnostic** (Log ID UUID).
2. Note app version (Test tip).
3. Heap OOM from the live fingerprint feed was fixed in **9.0.541+** (`LiveDataUpdater` caps). Update Test and retest.

## Battery stuck / 200% / wild jumps

- ZCL battery is often **0–200** (200 = 100%). Use Test builds with `BatteryMasterEngine` / `tuyaDpToPercent`.
- Never expect linear voltage formulas on coin cells.
- Sleepy sensors may only report battery when awake / on event.

## Contact / SOS / invert not working

- Confirm IAS enrollment after wake (press the device).
- Invert / polarity settings must match the specific mfr quirk; open a bug with diagnostic + sacred couple.
- SOS must use async capability listeners (older crashes were `.catch` on non-Promise).

## What Homey does **not** do

- It does **not** rewrite its own drivers at runtime.
- Fixes ship via **GitHub → Auto-Publish → Homey Test**. Update the Test app to receive them.

## Links

- Test install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- Layers / engines: [`docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md`](../architecture/LAYERS_CAPABILITY_PROTOCOL.md)
- Contribute: [`.github/CONTRIBUTING.md`](../../.github/CONTRIBUTING.md)
