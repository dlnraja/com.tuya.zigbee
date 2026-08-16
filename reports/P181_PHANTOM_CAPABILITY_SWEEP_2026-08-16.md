# P181 — Phantom capability sweep (2026-08-16)

Continuation of P180. The gate introduced there reported 13 dead `alarm_generic`
capabilities and 18 phantom `energy.batteries` blocks. Each one was triaged
individually before touching anything, because the correct fix for a dead
capability is sometimes to wire it and sometimes to remove it.

**Result: the gate now reports 0 errors** (was 13).

## 1. `alarm_generic` — 3 wired, 10 dropped

A capability that always reads "no alarm" is worse than an absent one: the user
sees a reassuring value that means nothing. Each driver was checked against its
datapoint map, its Zigbee clusters, and its flow cards.

### Wired

| Driver | Source | Why |
|---|---|---|
| `siren` | mirrors `onoff` (DP1/13/104) | `driver.js` condition `siren_is_sounding` already read `alarm_generic \|\| onoff`, but nothing ever wrote the first half |
| `device_air_purifier_siren` | mirrors `onoff` | `driver.js` *writes* it from its turn-on/turn-off actions and reads it in a condition, so the device-reported direction was the only gap |
| `siren_sirentemphumidsensor` | DP113/114 (`0x71`/`0x72`) threshold enums | temperature and humidity breach datapoints were declared in the constant table but never handled; the alarm stays true while either channel is breached |

The mirror is implemented by overriding `safeSetCapabilityValue`, which is the
existing idiom — `UnifiedPlugBase` already overrides it for its energy watchdog.

### Dropped as spurious

`air_purifier_curtain`, `air_purifier_siren`, `curtain_motor_shutter`,
`curtain_motor_tilt`, `device_din_rail_meter`, `gateway_zigbee_bridge`,
`module_mini_switch`, `shutter_roller_controller`, `smart_rcbo`, `switch_wireless`.

None has an alarm datapoint, an IAS Zone cluster, or a flow card referencing the
capability. Root cause: `DeviceProfileRegistry` adds `alarm_generic` to any
profile carrying IAS Zone, and the enrichment propagated it to drivers that never
had the cluster.

Two deserve a note:

- `smart_rcbo` — an RCBO genuinely has a trip state, and the `DIN_RAIL` profile
  documents a `DP10 fault` enum. But that profile is bound to
  `_TZE200_lsanae15` / `_rhblgy0z`, and this driver only carries
  `_TZE284_6ocnqlhn`. Wiring a guessed datapoint would be worse than nothing, so
  the capability returns once the datapoint is confirmed.
- `device_din_rail_meter` — carries only `_hybrid_..._needs_device_assignment`
  placeholders, so it matches no real hardware at all.

## 2. `energy.batteries` — 17 dropped, 1 inverted

The same warning had two opposite causes, so the pruner now discriminates:

- **17 mains devices** (LED strips and controllers, bulbs, dimmers, wall
  switches, gas and air-quality sensors) carried leftover battery metadata and
  showed a battery section in the Homey UI. Metadata removed.
- **`valve_irrigation`** was the inverse: `device.js` maps DP13/15 to
  `measure_battery` and DP14 to battery-low, and `plugCapabilities` lists
  `measure_battery` — the manifest was simply missing the capability. Added it
  and kept `energy.batteries: ["AA"]`.

The rule in `prune-phantom-capabilities.js` now checks whether `device.js`
actually reads a battery datapoint (and is not mains-powered) before it is
allowed to drop the metadata.

## 3. Tooling

New `tools/ci/prune-phantom-capabilities.js` — dry-run by default, `--apply` to
write. It also reconciles `app.json` against the compose files, because
regenerating the manifest needs the Homey CLI which is not available in every
environment. The reconcile is driven by the compose contents rather than by the
current run's edits, so re-running repairs a manifest left stale earlier. The
manifest is rewritten on a single line, matching the generator's output.

Reconciled exactly the 27 expected driver entries and nothing else, which also
confirms `app.json` and the composes were otherwise in step.

## 4. Correction to P180's F1 rule

P180 reported 58 drivers carrying `ZG-*` marketing names as `productId` and
suggested they never match. Investigation of `data/mfs_db.json` found **40 entries
whose `modelIds` field contains a `ZG-*` value**, including `hobeian -> ZG-227Z`
and `hobeian -> ZG-303Z`.

That is the leak path: a crawler recorded Zigbee2MQTT's *model* field as if it
were the reported `modelId`, and enrichment copied it into the compose files. It
contradicts `data/z2m_cache.json`, which documents `TS0601` for every one of
these devices.

Since the two local sources disagree, **F1 stays a warning and is never
auto-applied**. Resolving it needs a real pairing log, not more inference.

## 5. State after this pass

| Rule | Before P180 | After P181 |
|---|---|---|
| B1 no-op battery transform | 9 | 0 |
| B2 raw ZCL percentage | 10 | 0 |
| B3 banned linear curve | 3 | 0 |
| B4 phantom `energy.batteries` | 18 | 0 |
| C1 dead `alarm_generic` | 13 | 0 |
| F1 marketing `productId` | 58 | 58 (warning by design) |

## Remaining open work

1. **F1 x58** — needs a pairing log to settle mfs_db vs z2m_cache.
2. **`smart_rcbo` fault datapoint** for `_TZE284_6ocnqlhn`.
3. **`ZG-204ZL`** (`_TZE200_3towulqd`) sits in `presence_sensor_radar` but is
   PIR + lux with no mmWave.
4. **Button stack consolidation** — four generations coexist, plus two orphan
   engines no driver uses, plus eight drivers with a copied E000 overlay that can
   fire in parallel with the mixin.
5. `device_din_rail_meter` also declares unwired `alarm_motion` / `alarm_contact`
   and is classified as `doorbell`; the whole driver is a placeholder.

## Commands

```bash
node tools/ci/battery-button-intelligence-gate.js
node tools/ci/prune-phantom-capabilities.js           # dry-run
node tools/ci/prune-phantom-capabilities.js --apply
node scripts/validate/homey-mandatory-check.js
```
