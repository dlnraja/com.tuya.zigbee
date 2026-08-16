# P151 — Deep sacred-couple audit: `_TZ3000_k4ej3ww2` + scale method (2026-08-16)

## Verdict (this manufacturer)

| Field | Value |
|-------|--------|
| Canonical couple | **`_TZ3000_k4ej3ww2` + `TS0207`** |
| Homey driver | **`water_leak_sensor` only** (IAS Zone 0/1/3/1280) |
| Forbidden | `water_leak_sensor_tuya`, `water_detector`, contact/climate/gas tiles |
| Retail names (not Zigbee modelId) | HOBEIAN ZG-222ZA / ZG-222Z, Aubess IH-K665 / IH-1218 |
| Other proven productIds for this mfr | **None** (Z2M #17685 / #28181 / #19308) |

**Do not** treat `TS0601`, `q9mpfhw`, `AY222Z`, or `ZG-222ZA` as Zigbee `productId` partners of `k4ej3ww2`.  
`ZG-222ZA` may appear in compose as a **label alias**; interview modelId remains `TS0207`.

## Cross-ref

| Source | Finding |
|--------|---------|
| Z2M #17685 | `manufName=_TZ3000_k4ej3ww2`, `modelId=TS0207`, clusters in `[0,1,3,1280]`, `batteryPercentageRemaining=200` |
| Z2M #28181 | HOBEIAN ZG-222ZA same couple; sleepy / INVALID_EP bind quirks |
| Z2M #19308 | Passive: reports mainly on wet/dry; battery often stuck at 100 until wake |
| ZHA / HA threads | Same couple; “unavailable” = sleepy timeout, not wrong driver |
| Johan enriched (local) | Noise: `q9mpfhw` / `water_detector` — **reject** as sacred partner |
| Git history | `f474a1165` lock IAS; `548659f75` route IAS-only; P143/P144 strip tuya dual-claim |

## Code / data status (live)

| Layer | Status |
|-------|--------|
| `drivers/water_leak_sensor/driver.compose.json` | mfr case variants present; **mfr exclusive** |
| `drivers/water_leak_sensor_tuya` | **no** `k4ej3ww2` in compose (comment only) |
| Other drivers | **0** compose claims of this mfr |
| `data/user-misattribution-registry.json` | case `hobeian-aubess-k4ej3ww2-ias` — CI lookup OK |
| `lib/pairing/UserMisattributionRegistry.js` | case-insensitive couple → force matcher |
| `data/mfs_db.json` | `driverId=water_leak_sensor`, `modelIds=[TS0207]` only |
| Profile in `device.js` | `ias_zone`, `iasAlarmBit=both`, tamper; `normalize()` CI match |
| `IntelligentDeviceConfig` / `AlarmPolarityManager` | listed as ZCL water / normal polarity |
| Battery / energy | `measure_battery` + CR2032/CR2450/AAA; **no** mains power; ZCL 0–200 via BatteryMasterEngine path on base |
| Dual-app | master: static + dynamic registry; stable: static compose only |

### Residual risk (Homey cartesian)

Compose matching = **any** listed `manufacturerName` × **any** listed `productId`.  
`water_leak_sensor` still lists `TS0601` / `q9mpfhw` for **other** mfrs on the same driver → phantom couples  
`k4ej3ww2|TS0601` and `k4ej3ww2|q9mpfhw` exist in the matrix even though hardware does not.

**Mitigation (accepted):** no second real productId for this mfr in the wild; registry `notProductIds`; do **not** remove `TS0601` from the driver (breaks real `_TZE200_qq9mpfhw` siblings). Long-term: narrower drivers or SDK fingerprint objects if Athom adds couple-level matching.

## Surgical actions this pass

1. Tool: `tools/ci/audit-sacred-couple.js` (mfr/pid or `--from-registry`).
2. De-hype header on `drivers/water_leak_sensor/device.js`.
3. Align polluted `mfs_db` entry `_TZE284_*m1cvyneb*` → `wall_dimmer_tuya` + `TS0601` (registry PresentSky case found by same audit).
4. This report + scale playbook below.

**No further compose change required for `k4ej3ww2`** — pairing already locked to water leak IAS.

## Retest

```text
Pair _TZ3000_k4ej3ww2 + TS0207 → Water Leak Sensor (IAS)
wet/dry → alarm_water
battery sane (100% not raw 200)
wrong tile (Tuya water / contact) must not own this mfr
```

---

## Scale method — all drivers / device classes (do not boil the ocean)

Homey cannot “try every driver after pair”. Investigation is **couple-first**, class-by-class.

### Phase order (master first; stable = surgical static only)

1. **Registry queue** — every `data/user-misattribution-registry.json` case (`audit-sacred-couple.js --from-registry`).
2. **Forum / diag leftovers** — sacred couples from T140352 + Homey diag Log IDs (silent).
3. **By class** (one class per session): water → contact/IAS → switch gangs → dimmer → climate/TRV → cover → socket/energy → presence.
4. **Collision scan** — `scripts/maintenance/audit-fingerprint-collisions.js` + compose exclusive-mfr check for locked couples.
5. **External cross-ref** — Z2M issue/converter, ZHA quirk, Blakadder; never paste AI forum packs.
6. **Energy/battery gate** — mains vs battery; ban linear `(V-2.5)/0.5`; no `energy.approximation` with real power caps.
7. **Case-insensitivity** — compose variants + `CaseInsensitiveMatcher` / registry `_norm`; never manual `.toLowerCase()` sprawl.
8. **Document** — short `reports/Pxxx_*.md`; update registry; push master; soak Test; backport **BOTH** reliability locks only.

### Per-couple checklist

```text
[ ] Exact (mfr,pid) in ONE compose driver
[ ] mfr not on forbiddenDrivers
[ ] mfs_db driverId + modelIds match canonical (no climate pollution)
[ ] Registry case if community mis-pair existed
[ ] Protocol (ias / zcl / ef00) matches clusters
[ ] Battery/energy caps honest
[ ] CI: node tools/ci/audit-sacred-couple.js --mfr=… --pid=…
[ ] Stable: static only after soak
```

### Explicit non-goals

- Auto-generating Homey drivers from Z2M search into PRs.
- Homey runtime self-mutating “repair”.
- Full-tree master → stable sync.
- Rewriting all 430 drivers in one pass.

### Commands

```bash
node tools/ci/audit-sacred-couple.js --mfr=_TZ3000_k4ej3ww2 --pid=TS0207
node tools/ci/audit-sacred-couple.js --from-registry --json
node tools/ci/forum-silent-multi-scan.js
```
