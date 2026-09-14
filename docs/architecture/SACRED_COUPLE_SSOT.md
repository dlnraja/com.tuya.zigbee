# Sacred Couple SSOT (P2494)

> Machine SSOT: [`config/architecture/sacred-couple-ssot.json`](../../config/architecture/sacred-couple-ssot.json)  
> Helpers: `tools/ci/sacred-couple-pair.js` · Gate: `npm run check:p2494`

## Why this exists

Homey pairing and runtime matching for Universal Tuya Zigbee are **couple-based**:

| Field | Homey / Zigbee | Settings key |
|-------|----------------|--------------|
| manufacturerName | Zigbee `manufacturerName` | `zb_manufacturer_name` |
| productId | Zigbee `modelId` | `zb_model_id` |

**mfr alone is ambiguous.** One `mfs_db` entry (one manufacturerName) may list **many** `modelIds` — different gangs, sensors, OEM labels. That is **normal**, not a bug to “clean”.

## Golden rules (granular)

1. **Identity = `(mfr, pid)`** — never invent pid from retail SKU (SGS02Z, SH-SC07, …).
2. **mfs multi-pid OK** — same mfr in `switch_1gang` + `switch_2gang` with different pids is correct.
3. **Refuse mfr-only hit** when pid is known but absent from that mfr’s `modelIds`.
4. **NEED_INTERVIEW** when pid missing — soft hypothesis + class fixes; never invent to close a ticket.
5. **Sacred-keep** — Athom compact can drop verified couples; pin in `publish-sacred-keep-couples.json`.
6. **Case** — match via `CaseInsensitiveMatcher` / `pairingCaseVariants` (HOBEIAN / hobeian).
7. **UI role follows couple class** — switch vs scene vs knob (P2492), not brand name.
8. **Forum** — SHADOW only (T157628); silent enrich by couple.

## Lookup order (every device prompt)

1. Lock mfr+pid from interview / diag / post  
2. `DEVICE_TRUTH.md` + `device-truth.json`  
3. `PECULIARITIES.md`  
4. `drivers/<id>/driver.compose.json`  
5. `user-misattribution-registry.json` (`forbidMode: couple`)  
6. `mfs_db` modelIds for that mfr  
7. Z2M / ZHA / Blakadder **by the couple**

## Worked contrasts

| Couple | Driver | Same mfr wrong? |
|--------|--------|-----------------|
| `_TZE284_m1cvyneb`+`TS0601` | `wall_dimmer_tuya` | Do **not** invent `TS0201` → climate |
| `HOBEIAN`+`ZG-303Z` | `soil_sensor` | Do **not** ban HOBEIAN from climate (`ZG-227Z`) |
| `_TZ3000_uri7ongn`+`TS004F` | `smart_knob` dimmer | Sibling `kaflzta4`+`TS004F` stays **scene** |
| `_TZ3000_k4ej3ww2`+`TS0207` | water leak IAS | `_TZ3000_5k5vh43t`+`TS0207` = repeater |

## Enrich bots

- Apply only with external proof on the **pair**  
- After apply: anti-bot + P2138 matrix + `check:p2494`  
- Never Cartesian unproven mfr×pid

## Dual-app

Reliability couple locks = **BOTH** (backport surgically to `stable-v5`). Feature-only IR UX = MASTER_ONLY.
