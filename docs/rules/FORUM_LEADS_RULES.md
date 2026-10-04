# Forum leads — own rules distilled from harvest dumps (spec 005)

Source dumps (removed from git 2026-10-03, history kept): `reports/forum-verify-*/actionable-processor.json`,
`reports/forum-t26439-*/POSTS.json|HARVEST.json`, `reports/FORUM_DEEP_INVESTIGATE_*.json`, text-bearing
`reports/forum-l99-*/*.json` and `HARVEST.md`. Structured SSOT: `data/forum/forum-leads-ssot.json`
(links + user/date/tags/couples/diag ids only — no post text, constitution C1). Our own analysis notes
(`reports/forum-l99-*/FLEET_L99.md`, `COMPLEMENTARY_*.md`, `NEED_ACTION.md`) stay.

## What the dumps actually contained
- ~95 % of the 6 MB per report was **synthetic**: the thread opener (T26439 #1, a device list) had every
  manufacturerName crossed with every productId → ~20 500 fake "couples" per run, repeated in 9 runs.
  Only 318 distinct posts existed, with 160-char excerpts.
- Real, regex-extracted couples: 112 — 93 already on exactly one driver, 6 on the frozen irrigation dual
  (`_TZ3000_cjfmu5he|kz1anoi8|mq4wujmp` × TS0101/TS0049 on `smart_garden_irrigation_control` + `water_valve_garden`,
  M3: keep until a user conflict), 13 "not in catalog" which are all cross-product artifacts of multi-device
  posts (single source each) → **no fingerprint added** (D3).

## Rules (ours)
- F1. A post listing more than 16 mfr × pid combinations is a list, not a couple. Harvesters must not cross
  them (implemented in `tools/ci/forum-actionable-processor.js`, `MAX_CROSS_COUPLES`).
- F2. Harvesters persist links (`https://community.homey.app/t/<topic>/<post>`) and structured fields only;
  text is analysed in memory. Issue bodies (L99 inbox) are re-fetched on demand, never stored.
- F3. Users paste full interviews/device state, sometimes with the Zigbee **network key** (T140352 #2213/#2214):
  one more reason never to store raw post text or diagnostics in git.
- F4. Regex couples are leads. A fingerprint needs a real interview, diag or cited upstream source; a firmware
  quirk needs ≥2 independent sources (D3/D4). Placeholder mfrs (`_TZE200_xxxxx`, `_TZE200_ABC123`) and
  OCR zero-padded ids are rejected.

## T140352 (our thread) #2181–#2247 — device leads and status (all couples on one driver today)
| Couple | Driver | Symptom family | Rule we keep |
|---|---|---|---|
| `_TZ3000_zgyzgdua` TS0044 | scene_switch_4 | physical buttons dead, interview time-outs (#2189/#2207/#2213) | scene-mode switch (0x8004) re-applied on wake; never route TS004x to actuators |
| `_TZE204_clrdrnya` TS0601 | presence_sensor_radar | mains radar flips to a curtain-like identity after app updates, phantom battery warning, presence card not firing (#2208–#2247) | identity pinned by mfr+pid, stale caps stripped, mains devices never get `measure_battery`, presence flow driven from the same value that paints the capability |
| `_TZE284_6ocnqlhn` TS0601 (Tongou, 0xEF00 + 0xED00) | din_rail_meter | not matched at pair (#2191) | 0xED00 tolerated, never mandatory |
| `_TZ3218_t9ynfz4x` TS0225 | motion_sensor_radar_mmwave | settings save errors (#2199) | settings writes soft-fail per key |
| `_TZE204_ogkdpgy2` TS0601 | air_quality_co2 | misclassified as climate sensor (#2204, GH #531) | CO2 couple locked on CO2 driver |
| `_TZE284_m1cvyneb` TS0601 (BSEED) | wall_dimmer_tuya | controls dead until re-add (#2206/#2236) | DP write path with retry |
| `_TZE284_fodv6bkr` TS0601 | curtain_motor | unknown device (#2228) | battery tubular motor on EF00 |
| `_TZE200_icka1clh` TS0601 (AM43) | curtain_motor | UNSUPPORTED_CLUSTER on open/close (#2229) | EF00 only, no ZCL 0x0102 command |
| `_TZE284_ogx8u5z6` TS0601 (ZG253) | device_radiator_valve | unknown (#2244) | — |
| `_TZ3000_lwthnp7j` (4-gang touch, ZCL) | wall_switch_4gang_1way | interview cited from a third-party repo (#2186, GPL: study only) | time cluster server answered |
| SOS / water / contact / smart button (Peter, #2183–#2239) | various | battery jitter, contact pulse instead of latch, button flicker on single/double, no battery | button dedupe (spec 003), contact latch, battery rehydrate |

Open without fingerprint: two-way irrigation valve pairing as unknown (#2218) — needs interview.


## T140352 #2238–#2258 — daily resume 2026-10-04 (status)

| Post / couple | Driver | Symptom family | Status |
|---|---|---|---|
| #2258 AOYAN AY-303Z / HOBEIAN ZG-303Z / COOLO CS-201Z | `soil_sensor` | 0x0405 reports soil moisture; ambient RH on DP109 | already-fixed (`a5ea22d29d` / P2760+P2339) |
| #2257 ZG-106Z / `_TZ3000_7y90pany` | `illuminance_sensor` | luminance | already-fixed (compose has couple + cluster 1024); pid also listed on `sensor_illuminance_presence` without this mfr → no dual couple |
| #2253 `_TZE284_ogx8u5z6` ZG253 TRV | `device_radiator_valve` (+ smart twin) | null caps + `datapoint: unexpected property` | already-fixed (P2593/P2598/P2711: Homey datapoint arg shape) |
| #2246–#2255 VicHY MTG075 / `_TZE204_dtzziy1e` family | `presence_sensor_radar` | curtain class flip, frozen lux/distance, Advanced Flow lag | already-fixed (P2548–P2712 dirty heal); 2026-10-04 DynFlow discovery debounce additive |
| #2238/#2239 Peter Smartbutton | `button_wireless_1` | battery OK; History/Insights tab missing | compose+boot heal `getable:true` / `preventInsights:false` (P2499/P2512/P2553); existing pair may need one remove+re-add for Homey Insights enrollment |

Forum poll (no AI): fingerprint + `extractForumSignals` → `.github/state/forum/new-leads.json` (links + structured fields only).
