# P3070 — Global gap audit (2026-10-26)

Scope: everything **not** owned by P3065 (flow cards/flow JSON), P3067 (device families,
drivers, Z2M, adaptive lighting/energy), P3068 (stability/memory/lint/size ratchet) or
P3069 (GitHub Actions/report wording). Wi-Fi local protocol notes live in
`WIFI_LOCAL_PROTOCOLS_P2930.md`; this file only lists UX gaps, it does not duplicate them.

Audit tooling (box-local, re-runnable): driver quality scan over every
`driver.compose.json` + `driver.settings.compose.json`, upload-headroom projection on
`.homeybuild/app.json` (floor 280 KB, `.github/upload-headroom.json`).

Reference used: Homey settings documentation —
<https://apps.developer.homey.app/the-basics/devices/settings> (number settings take
top-level `min`/`max`/`step`/`units`; ids must not use reserved prefixes).

## Prioritized table

| # | Gap (master, measured) | Impact | Risk | Owner | Status |
|---|---|---|---|---|---|
| 1 | 280 number settings on 33 drivers had `min`/`max`/`step` only under `attr` → Homey UI ignores them, users could type any value | High (bad values reach DPs) | Low (data only) | P3070 | **Done** step 1 (all 3 branches) |
| 2 | Duplicate `power_scale` dropdown on 8 plug drivers (second copy subset of first, same default) | Medium (confusing UI, ambiguous value) | Low | P3070 | **Done** step 1 |
| 3 | `dimmer_1_gang` brightness limits 1–255 labelled "(%)"; mojibake "(mW  W)" | Medium | Low | P3070 | **Done** step 1 |
| 4 | Generic `.homeychangelog.json` entries ("automated publish, manifest sync…"), versions out of order | High (store changelog useless to users) | Low | P3069 (generator in auto-publish workflow) | Note handed over |
| 5 | 32 light/socket drivers with neither `measure_power` nor `energy.approximation` | High (no energy in Homey Energy) | Medium | P3067 | Note handed over |
| 6 | Learnmode instructions missing in fr (128 drivers), de (249), nl (227); 53 learnmode without image; 69 Zigbee drivers without learnmode | Medium (pairing help) | Low, but ~14 KB for fr | P3070 next | fr done on 3 branches (master 568a3084c1, stable 30aa60af30, bastien 3ab4b77e07); de/nl learnmode **skipped on purpose** (26/10): headroom ~297 KB and the Flow worker (P3065) needs budget too; revisit only if headroom stays ≥ 290 KB after their work |
| 7 | Driver names missing de/nl (97) or de (29) | Medium | Low (~6 KB) | P3070 next | Done on master 33700321ef (de 112, nl 85); headroom 302.2 → 297.0 KB. Root `app.json` was also missing the fr names of 92 drivers that compose had (payload unchanged); aligned in 06d5b7c1c7, guarded by `p3070-driver-name-fr-sync` |
| 8 | 27 `setUnavailable('…')` + 418 `throw new Error('…')` literal English strings; only 3 lib files use `homey.__` | Medium (non-English users see English) | Medium (behavior) | P3070, master-only | Partly done (master only, soak): `lib/utils/LocalizedMessage.js` + 13 `errors.*` keys (en/fr/de/nl/es/it), 18 calls in 8 core files; drivers/*, UnifiedLightBase and UnifiedPlugBase left for the drivers worker (P3067); batch 2 f5b729f88b: 8 `setWarning` texts of `TuyaLocalDevice` (8 more keys). `throw new Error` left alone: most are in `lib/flow` (Flow worker P3065); `lib/battery/BatteryMonitoringSystem.js` is deprecated with no importer |
| 9 | 470 drivers without `xlarge` image, 8 shared large images, 5 shared icons | Low–Medium (store look) | Low (assets, no app.json size) | P3067 (assets per family) | Listed |
| 10 | 2245 settings without hint, 595 setting labels and 843 dropdown labels without fr/de/nl, 923 capabilitiesOptions titles without de/nl | Medium | Low, but large size cost | P3070 incremental | Pending; must stay within headroom |
| 11 | 84 capabilitiesOptions for capabilities not declared statically | Low | **Keep** — may target capabilities added at runtime | — | Not changed on purpose |
| 12 | 144 lib files with no static importer (dead-code candidates), 304 lib files without any test reference | Low (maintenance) | High if deleted blindly | User decision / P3068 | Lists kept, nothing deleted |
| 13 | `energy_source` setting id is close to reserved `energy_` prefix | Low | High (rename needs migration) | — | Not changed on purpose |
| 14 | User docs: only `docs/user/FAQ_ZIGBEE_UPDATES.md` + `ZIGBEE_TROUBLESHOOTING_GUIDE.md`; no FAQ for Wi-Fi local credentials (Repair flow) | Medium | None | P3070 docs | Done: `docs/user/FAQ_WIFI_LOCAL.md` on master (17f5698d90), stable-v5 (same text) and bastien-home (adapted, because it has no Repair view and no User Code QR); test `p3070-faq-wifi-local` checks each promise against the shipped views |
| 15 | Locales `locales/*.json`: fr/de/nl/es/it complete (252/252 keys) | — | — | — | OK |

## Baseline gate: artifact, fixed

The 177/115/11 "would disappear" couples (master/stable/bastien) were a gate artifact: the gate
was given the raw source `app.json`, while it is meant for the publish payload where
`compactZigbeeIdentifiers` re-pins or moves couples. On the real payload no couple is lost
(master 14227/14227, stable 14005, bastien 3730). The gate now builds the payload view in memory
when it is pointed at the root `app.json` (master 5b2512b336, stable 1725b3eba1, bastien
c172739f82). Bastien `_TZE284_hodyryli`: its 12 baseline pids ship in `climate_sensor`, like Test
1.0.209. On master and stable the couple `_TZE284_hodyryli`+TS0601 used to land in both `climate_sensor`
and `climate_sensor_zt08`. It is now resolved: only zt08 carries it (see
`docs/rules/HODYRYLI_ZT08_ONE_DRIVER.md`). The cause was an old sacred-keep row and 11 cartesian
re-pins. Fixed in master f11c1c388e and stable c003adc358.

## Rules applied

Additive only, nothing mandatory at pairing, no 0xEF00 at pairing, no invented mfr/pid,
one test per change (`test/critical/p3070-settings-sanity.test.js`), all gates and
`homey app validate --level publish` before every push, size-negative changes preferred.
