# Gang patterns: couples on a 1-gang and a multi-gang driver (P2797)

`scripts/leads/gang-patterns.js` lists every exact couple (manufacturerName + productId) that is on a
1-gang driver and on a multi-gang driver of the same family (switch, dimmer, wall remote, curtain/switch).
It also lists couples that sit on only one `switch_Ngang` driver while the evidence gives a different gang count.

Report: `data/leads/gang-patterns.json` (not shipped, `.homeyignore`). Runtime table:
`lib/data/gang-patterns.json` (`{couples: {"mfr|PID": gangs}, ambiguous: [...]}`). It is loaded lazily
by `lib/devices/GangCountAdapter.js`, and the publish size gate limits it to 256 KB. Only a
maintainer writes it, with `--write-runtime`. The enrichment workflow
(`oss-lan-source-enrich.yml`) runs the report only.

## Evidence (no invented ids)

| Source | Rule |
|---|---|
| productId | TS0001/TS0011 = 1, TS0002/TS0012 = 2, TS0003/TS0013 = 3, TS0004/TS0014 = 4; TS004x remotes = x. TS0601 has no gang count by itself |
| DP | `data/dp_registry` gang-state DPs `state_lN` / `switchN` / `brightness_lN` (DP 1/2/3… are gang states; 7/8/9 countdowns, 14/15 power-on/backlight are ignored) |
| Z2M | converter description "N gang" |
| interview | Homey interviews in `data/community-sync/johanbendz-issues-enriched.json`: number of endpoints with cluster 6 (onOff) |
| registry | canonical driver in the couple registry |
| family | same prefix and suffix group as other couples (weak; never decides alone) |

A couple is `N-gang` when its direct sources agree. It is `ambiguous` when no direct source gives a count or the sources disagree.

## Results (2026-10-02, master 9.0.1314)

- 83 couples on a 1-gang and a multi-gang driver: 66 curtain/switch (`curtain_motor` vs `switch_1gang`/`switch_3gang`), 16 switch, 1 dimmer.
  - Classes: 65 ambiguous, 6 one-gang, 4 two-gang, 4 three-gang, 4 four-gang.
- Manufacturer view: 7 manufacturers are on a 1-gang and a multi-gang driver of the same family, with 17 real couples.
  - HOBEIAN ZG-301Z/ZG-302Z1 → switch_1gang; ZG-301Z-2CH/ZG-302Z2/ZG-305Z → switch_2gang; ZG-302Z3 → switch_3gang (registry). Every placement matches.
  - `_tz3400_keyjqthh` TS0041 → button_wireless_1.
  - The dimmers `_tz3210_4ubylghk` / `_tz3210_eejm8dcr` are ambiguous.
- `_TZE200_nkjintbl` TS0601 is on switch_2gang only, and every source agrees: Z2M 2 gang, Homey interview DP1/DP2, and the registry. `_TZE204_nkjintbl` is a different device (button_wireless_plug).
- 81 single placements on a `switch_Ngang` driver have evidence for another gang count. Most are switch_1gang devices that are really 2/3/4/6-gang (per productId/Z2M/DP), and switch_4gang devices that are really 1/2/3-gang (Z2M).
- 0 removal proposals among the dual couples. 18 among the misplaced single placements (listed below; never applied).

| Couple (mfr \| productId) | Kind | Class | Sources | Placements |
|---|---|---|---|---|
| hobeian \| TS0001 | remote/curtain/switch | 1-gang | pid:1 | button_wireless_1 ✓, curtain_motor ✓, switch_1gang ✓, switch_3gang ✗ |
| heobian \| TS0001 | remote/curtain/switch | 1-gang | pid:1 | button_wireless_1 ✓, curtain_motor ✓, switch_1gang ✓, switch_3gang ✗ |
| hobeian \| TS0011 | curtain/switch | 1-gang | pid:1 | curtain_motor ✓, switch_1gang ✓, switch_3gang ✗ |
| hobeian \| TS0012 | curtain/switch | 2-gang | pid:2 | curtain_motor ✗, switch_1gang ✗, switch_2gang ✓, switch_3gang ✗ |
| hobeian \| TS0014 | curtain/switch | 4-gang | pid:4 | curtain_motor ✗, switch_1gang ✗, switch_3gang ✗ |
| hobeian \| ZG-301Z | curtain/switch | 1-gang | registry:1@switch_1gang | curtain_motor ✓, switch_1gang ✓ |
| hobeian \| ZG-302Z1 | curtain/switch | 1-gang | registry:1@switch_1gang | curtain_motor ✓, switch_1gang ✓ |
| heobian \| TS0011 | curtain/switch | 1-gang | pid:1 | curtain_motor ✓, switch_1gang ✓, switch_3gang ✗ |
| heobian \| TS0012 | curtain/switch | 2-gang | pid:2 | curtain_motor ✗, switch_1gang ✗, switch_2gang ✓, switch_3gang ✗ |
| heobian \| TS0014 | curtain/switch | 4-gang | pid:4 | curtain_motor ✗, switch_1gang ✗, switch_3gang ✗ |
| _tze204_amp6tsvy \| TS0003 | switch | 3-gang | pid:3 | switch_1gang ✗, switch_2gang ✗ |
| _tze204_amp6tsvy \| TS0012 | switch | 2-gang | pid:2 | switch_1gang ✗, switch_2gang ✓ |
| _tze284_amp6tsvy \| TS0003 | switch | 3-gang | pid:3 | switch_1gang ✗, switch_2gang ✗ |
| _tze284_amp6tsvy \| TS0012 | switch | 2-gang | pid:2 | switch_1gang ✗, switch_2gang ✓ |
| hobeian \| TS0003 | switch | 3-gang | pid:3 | switch_1gang ✗, switch_2gang ✗, switch_3gang ✓ |
| hobeian \| TS0004 | switch | 4-gang | pid:4 | switch_1gang ✗, switch_3gang ✗ |
| heobian \| TS0003 | switch | 3-gang | pid:3 | switch_1gang ✗, switch_2gang ✗, switch_3gang ✓ |
| heobian \| TS0004 | switch | 4-gang | pid:4 | switch_1gang ✗, switch_3gang ✗ |

Ambiguous (65, both placements kept): `hobeian|TS0601`, `heobian|TS0601`, `hobeian|01MINIZB`, `hobeian|BASICZBR3`, `hobeian|S26R2ZB`, `hobeian|S31ZB`, `hobeian|TS0001_POWER`, `hobeian|TS0001_SWITCH`, `hobeian|TS0001_SWITCH_MODULE`, `hobeian|TS000F`, `hobeian|TS0101`, `hobeian|TS0111`, …

### Misplaced single placements (81)

| Driver ← evidence | Count |
|---|---|
| switch_1gang ← 2-gang | 18 |
| switch_1gang ← 4-gang | 11 |
| switch_1gang ← 3-gang | 18 |
| switch_1gang ← 6-gang | 8 |
| switch_1gang ← 5-gang | 1 |
| switch_2gang ← 3-gang | 1 |
| switch_2gang ← 5-gang | 1 |
| switch_4gang ← 1-gang | 4 |
| switch_4gang ← 2-gang | 9 |
| switch_4gang ← 3-gang | 10 |

### Removal proposals (report only, never applied)

| Couple | On driver | Sources | Proposal |
|---|---|---|---|
| _tz3000_biakwrag \| TS0012 | switch_1gang | pid:2, z2m:2 | needs the matching driver to carry it first, then drop here |
| _tz3000_hbic3ka3 \| TS0003 | switch_1gang | pid:3, z2m:3 | needs the matching driver to carry it first, then drop here |
| _tz3000_iv4eq7eh \| TS0003 | switch_1gang | pid:3, z2m:3 | needs the matching driver to carry it first, then drop here |
| _tz3000_ju82pu2b \| TS0003 | switch_1gang | pid:3, z2m:3 | needs the matching driver to carry it first, then drop here |
| _tz3000_mhhxxjrs \| TS0003 | switch_1gang | pid:3, z2m:3 | needs the matching driver to carry it first, then drop here |
| _tz3000_mzcp0of6 \| TS0003 | switch_1gang | pid:3, z2m:3 | needs the matching driver to carry it first, then drop here |
| _tz3000_nnwehhst \| TS0003 | switch_1gang | pid:3, z2m:3 | needs the matching driver to carry it first, then drop here |
| _tz3000_vsasbzkf \| TS0003 | switch_1gang | pid:3, z2m:3 | needs the matching driver to carry it first, then drop here |
| _tze200_go3tvswy \| TS0601 | switch_1gang | dp:3, z2m:3 | needs the matching driver to carry it first, then drop here |
| _tze200_wnp4d4va \| TS0601 | switch_1gang | dp:6, z2m:6 | needs the matching driver to carry it first, then drop here |
| _tze204_ccgyhbvd \| TS0601 | switch_1gang | dp:3, z2m:3 | needs the matching driver to carry it first, then drop here |
| _tze204_gxbdnfrh \| TS0601 | switch_1gang | dp:6, z2m:6 | needs the matching driver to carry it first, then drop here |
| _tze204_he9apaui \| TS0601 | switch_1gang | dp:2, z2m:2 | needs the matching driver to carry it first, then drop here |
| _tze204_lmgrbuwf \| TS0601 | switch_1gang | dp:6, z2m:6 | needs the matching driver to carry it first, then drop here |
| _tze204_wskr3up8 \| TS0601 | switch_1gang | dp:6, z2m:6 | needs the matching driver to carry it first, then drop here |
| _tze204_y8ficeai \| TS0601 | switch_1gang | dp:6, z2m:6 | needs the matching driver to carry it first, then drop here |
| _tze284_0kihjsys \| TS0601 | switch_1gang | dp:5, z2m:5 | needs the matching driver to carry it first, then drop here |
| _tze284_g1enhdsi \| TS0601 | switch_1gang | dp:6, z2m:6 | needs the matching driver to carry it first, then drop here |

## Runtime (GangCountAdapter, additive)

The adapter is attached in `UnifiedSwitchBase` and applies to every couple in `dual-couple-adapt.json` or `gang-patterns.json`.
- It counts the gangs a device really has from its ZCL endpoints with onOff and from the boolean gang DPs (1…6) it reports.
- **More gangs than the driver:** it adds `onoff.gangN` and the listeners. They are re-registered after a restart. No re-pair is needed.
- **Fewer gangs than the driver:** it hides (removes) the extra manifest gangs only when all of these are true:
  - the pattern file gives a smaller count for that exact couple;
  - the device confirms it after settling (≥ 10 reports and 30 min);
  - no report has ever come from an extra gang.

  Hidden gangs are stored in `gang_adapter_hidden` and put back as soon as the device reports one of them.
- **Ambiguous or unlisted couples:** nothing is hidden. Their placements stay as they are, and they only get the driver hint.
- Paired devices never change driver. Fingerprint removals (`dual-couple-legacy.json`) affect new pairings only.

## Enrichment drift (ff1de8d2e) and the fix

- **The drift:** the fleet enrichment run re-synced `app.json` in the middle of the pipeline (`harden-unknown-zigbee`).
  - Later compose clean-ups (`re-inject-manual-fixes`, `prune-fp-collision-bleed`, `strip-registry-forbidden`) removed couples that `infer-enrich-from-incomplete` had wrongly added. `app.json` kept them, so 26 drivers drifted.
  - Each of those 26 placements was checked against Z2M, `mfs_db` and the fingerprints. All of them were wrong or synthetic, for example:
    - `_tze200_2imwyigp` is a 3-gang switch, not a contact sensor;
    - `_tze200_u6x1zyv2` is a rain sensor;
    - `_tze284_uo8qcagc` is a gas sensor;
    - the rest are `_hybrid_…`/`_generic_…`/dummy names.

    The compose files already carry the right placements, so nothing was added.
- **ZG-301Z / ZG-302Z1 back on curtain_motor:** `infer-enrich-from-incomplete` put them back, undoing P2794.
- **Lost flow titles:** `flow-fleet-enrich.js` stripped every `titleFormatted` on ir_blaster, blaster_remote and presence_sensor_radar. `button-flow-harvest.js` rebuilt scene_switch_6ch and dropped its nl/de titles.
- **Fix:**
  - New `tools/ci/enforce-dual-couple-legacy.js --sync` runs as the last pipeline phase and in the workflow. It removes legacy couples again, then copies compose manufacturerName/productId lists into app.json without changing app.json's formatting.
  - The workflow now runs these before committing: compose/app.json sync gate, flow titleFormatted gate, and the p2794/p2692/p2433 tests.
  - `flow-fleet-enrich.js` strips only a `titleFormatted` that contains `[[device]]`.
  - `button-flow-harvest.js` keeps existing translations.

## Applied move (P2797b, maintainer-approved)

The 18 switch_1gang placements proven wrong by two sources (productId or DP registry, plus Z2M) were
moved to the matching gang driver with all case variants, including the real-world form `_TZE204_xxxxxxxx`.
They are listed in `dual-couple-legacy.json` under `switch_1gang`. Devices paired before keep switch_1gang
without a migration nag, and the gang adapter adds their real gangs (the runtime table keeps them through `legacyAdapt`).

| Couples | New driver | Gang DPs / endpoints |
|---|---|---|
| `_TZ3000_biakwrag` TS0012, `_TZE204_he9apaui` TS0601 | switch_2gang | EP1-2 / DP1-2 |
| `_TZ3000_hbic3ka3`, `iv4eq7eh`, `ju82pu2b`, `mhhxxjrs`, `mzcp0of6`, `nnwehhst`, `vsasbzkf` TS0003; `_TZE200_go3tvswy`, `_TZE204_ccgyhbvd` TS0601 | switch_3gang | EP1-3 / DP1-3 |
| `_TZE284_0kihjsys` TS0601 (EyZEE 5-gang) | switch_wall_5gang | DP1-5 |
| `_TZE200_wnp4d4va`, `_TZE204_gxbdnfrh`, `lmgrbuwf`, `wskr3up8`, `y8ficeai`, `_TZE284_g1enhdsi` TS0601 | switch_wall_6gang | DP1-6 |

All targets extend `UnifiedSwitchBase`, whose DP map routes DP1..8 to `onoff` / `onoff.gangN`. Their manifests carry
`onoff.gang2..N`. The runtime `lib/tuya/fingerprints.json` (and its shards) points these mfrs to the new drivers.
`_TZE284_g1enhdsi` previously pointed to motion_sensor; Z2M lists it as Ekaza EKAT-T3074-6WZ, a 6 gang switch.
