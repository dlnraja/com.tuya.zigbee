# P182 — SOS battery, button-stack verification, ZG-* verdict (2026-08-16)

Third pass. Two of the three items here are **verifications that found no bug**,
which matters as much as the fixes: the previous audits flagged them as likely
defects and acting on that would have made things worse.

## 1. Button multi-firing — investigated, NOT a bug

The P180 audit claimed drivers such as `button_wireless_4` could fire a flow two
to four times per press, because four detection paths run in parallel:

1. `PhysicalButtonMixin.onZigBeeMessage` raw L1 handler (E000 / scenes / onOff)
2. the driver's own `_setupE000Detection` cluster listeners
3. the `TuyaE000BoundCluster` binding
4. the `handleFrame` raw interceptor

Traced end to end, **all four converge on a single guarded router**:

- The driver funnels every path through `_triggerButton4Gang`, which applies a
  750 ms dedup keyed on button + press type
  (`drivers/button_wireless_4/device.js:384`) before delegating.
- `PhysicalButtonMixin._triggerPhysicalFlow` delegates to `triggerButtonPress`
  unless `_internalTrigger` is set, which is exactly how `ButtonDevice` calls
  back into it without recursing (`lib/mixins/PhysicalButtonMixin.js:918`,
  `lib/devices/ButtonDevice.js:1456`).
- `ButtonDevice.triggerButtonPress` enforces a **500 ms per-button minimum
  interval** (`lib/devices/ButtonDevice.js:1431`), keyed on the button number
  alone, so a second path arriving for the same press is dropped regardless of
  which press type it decoded.
- `_buttonTriggerProtection` is initialised unconditionally in `onNodeInit`
  (`lib/devices/ButtonDevice.js:556`), so the guard cannot be bypassed by a
  driver that forgets to set it up.

**No change made.** Adding another dedup layer would have risked swallowing
legitimate rapid presses on multi-gang remotes.

The genuine remaining button debt is duplication, not misbehaviour: ~200 lines of
E000 overlay copied across eight drivers, two ~900-line inline remotes, and two
orphan engines (`UnifiedButtonEngine`, `LegacyButtonDetectionMixin`) that no
driver requires. That is a refactor, not a defect.

## 2. SOS and button battery

### `button_emergency_sos`

- `alarm_battery` was created at runtime by `_ensureCapabilities` while the
  manifest declared only `measure_battery`. Homey therefore had no title or
  metadata for it. Now declared in the compose.
- Its voltage branch re-implemented unit detection (`>300 → mV`, `>=10 → 100mV`)
  plus the curve lookup. Replaced with `normalizeZclBatteryVoltagePercent` so
  every coin cell in the app reads the same.
- The rest of this driver's battery handling was already correct: smart
  percentage normalization, immediate read plus an 8 s sleepy retry, and
  `configureReporting` — keep it as the reference implementation.

### `ButtonDevice._readBatteryWhileAwake` (affects every button and SOS remote)

The voltage fallback did `Number(data.batteryVoltage) / 10`, hardcoding the ZCL
100 mV unit. A remote reporting plain millivolts (3000) became 300 V, which the
curve clamped to **100 % — a flat battery displayed as full**. Now routed through
the unit-detecting helper.

### `remote_button_emergency_sos`

Verified: inherits the `ButtonDevice` battery path, and its `CR2032`
`energy.batteries` matches. Its `alarm_generic` was fixed in P180.

## 3. ZG-* marketing productIds — verdict: do NOT strip

P180 flagged 58 drivers carrying `ZG-*` as `productId` and P181 found ~40 mfs_db
records with `ZG-*` in `modelIds`. A full cross-reference of every local source
settles it:

| Evidence | Says |
|---|---|
| `data/z2m_cache.json` | every HOBEIAN entry is `modelId: TS0601` + separate `z2m_model: ZG-…` |
| `data/zg204_investigation.json` herdsman block | `zigbeeModel: ["ZG-204ZM","AY205Z"]` **and** `fingerprint: tuya.fingerprint("TS0601", […])` |
| `devices._tze200_tyffvoij` in mfs_db | `["CK-BL702-MWS-01","TS0601"]` — clean, no ZG |
| `scripts/automation/mfs-aggregator.js:274` | `fetchLocal` takes `productIds[0]` from each compose, so a driver whose first pid is `ZG-*` poisons that manufacturer |
| `scripts/sync/crawl-z2m.js:74` | the `whitelabel` path sets `productId: model`, i.e. the catalogue name |
| `scripts/automation/auto-sync-references.js:163` | labels every Z2M `zigbeeModel` string as a `productId` |

So the pollution path is understood: crawlers copy Zigbee2MQTT's catalogue
`model` / `zigbeeModel` fields into a field meant for the reported `modelId`.

**But Z2M genuinely declares `zigbeeModel: ["ZG-204ZM"]`**, which means some
firmware revisions may report the marketing string in the ZCL Basic cluster. The
entries are therefore a harmless fallback, not dead weight: they cost nothing at
match time because routing succeeds on the real couple, and removing them could
strand a firmware variant.

**Decision: F1 stays a warning and is never auto-applied.** Settling it needs a
real pairing interview showing the raw Basic-cluster `modelId`, not more
inference. Recorded so a future pass does not "clean" them.

A related caution for any future pattern-based cleanup: `SNZB-*` (Sonoff),
`lumi.*` (Aqara), `E1743`/`TRADFRI *` (IKEA) and `WXKG##LM` (Xiaomi) **are**
legitimate reported modelIds. Only the HOBEIAN `ZG-*` family is catalogue-only.

## 4. Two new gate rules

| Rule | Detects | Count |
|---|---|---|
| **B5** | `batteryVoltage` scaled by a hardcoded divisor (`/10`, `/100`, `/1000`) outside the helper | 16 |
| **C2** | capability created by `addCapability()` that the manifest never declares | 5 |

C2's remaining five are deliberate: `motion_sensor`, `sensor_contact_motion` and
`sensor_presence_radar` add `measure_battery` only once ZCL data proves the unit
is battery-powered, because the same driver covers mains variants. Declaring it
statically would show a battery on mains hardware. Left as informational.

B5's sixteen are fallback paths in large base classes (`BaseUnifiedDevice` x5,
`UnifiedSensorBase` x2, `BatteryManagerV4` x2, and others). The two that sit on
the button and SOS hot paths are fixed; the rest are queued rather than edited
in bulk, since each is inside a legacy class that deserves its own pass.

## State

| Rule | P180 start | Now |
|---|---|---|
| B1 no-op battery transform | 9 | 0 |
| B2 raw ZCL percentage | 10 | 0 |
| B3 banned linear curve | 3 | 0 |
| B4 phantom `energy.batteries` | 18 | 0 |
| C1 dead `alarm_generic` | 13 | 0 |
| B5 hardcoded voltage unit | — | 16 (warn) |
| C2 undeclared runtime capability | — | 5 (warn, by design) |
| F1 marketing `productId` | 58 | 58 (warn, deliberately kept) |

Errors: **0**.

## Commands

```bash
node tools/ci/battery-button-intelligence-gate.js
node tools/ci/prune-phantom-capabilities.js --apply
node scripts/validate/homey-mandatory-check.js
```
