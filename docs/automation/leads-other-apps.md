# Leads from other-app threads and all issue/PR comments

Sources read on 2026-10-01 (read-only, never posted):

- **Forum (full raw export, 100 posts per request, random 4–9 s spacing, stop on 403/429):**
  154077 (Tuya Local, all pages), 146735 (Tuya Smart Life, all pages), 89271 (device-request archive, all pages),
  26439 (Tuya Zigbee app thread, all pages), 21313 (Tuya Cloud, pages 1–18 of 28; continuation noted in
  `docs/automation/leads-other-apps-cursor.json` (local copy in the git-ignored `.github/state/`)). 140352 is covered by the regular digest.
- **GitHub:** the 300 most recent issue/PR conversation comments and the 300 most recently updated issues/PRs
  (open and closed) of `dlnraja/com.tuya.zigbee` and `JohanBendz/com.tuya.zigbee`.
- Every `manufacturerName` found (2 047 distinct) was cross-checked against all `drivers/*/driver.compose.json`
  and `lib/data/firmware-quirks.json`. Only 28 were not already in a driver; the forum threads yielded a single
  unknown ID, which is a typo of a known one.

## Applied

| Couple | Finding | Action | Source URL |
|---|---|---|---|
| `_TZ3000_ahvrgyac` / TS0001 | switch (power monitoring), listed in the fingerprint array shared by 21 IDs already in `switch_1gang` | fingerprint → `switch_1gang` | https://github.com/dlnraja/com.tuya.zigbee/issues/556 · https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts |
| `_TZ3000_bbebkwjk` / TS0001 | 1-gang switch with backlight (siblings in `switch_1gang`) | fingerprint → `switch_1gang` | same |
| `_TZE284_pxwixtky` / TS0601 | curtain/blind switch (siblings in `curtain_motor_shutter`) | fingerprint → `curtain_motor_shutter` | same |
| `_TZ3210_o235agwx` / TS110E | 1-channel dimmer (3/3 siblings in `wall_dimmer_tuya`) | fingerprint → `wall_dimmer_tuya` | same |
| `_TZE284_zuq5xxib` / TS0601 | curtain/roller motor (66 siblings in `curtain_motor`) | fingerprint → `curtain_motor` | same |
| `_TZ3000_bu47m8pv`, `_TZ3000_f6pgzqob` / TS0003 | 3-gang switch module (siblings in `switch_3gang`) | fingerprint → `switch_3gang` | same |
| `_TZ3008_xvfd3nkp`, `_TZ3008_qziabvzj`, `_TZ3008_iooniers` / TS011F | smart plug with power monitoring (siblings in `plug_energy_monitor`) | fingerprint → `plug_energy_monitor` | same |
| `_TZ300A_57kqwetw` / TS0726 | 4-gang switch + 4 scenes (sibling in `switch_4gang`) | fingerprint → `switch_4gang` | same |
| `_TZE284_znkkcauq` / TS0601 | 6-gang switch | fingerprint → `wall_switch_6_gang_tuya` | same |
| `_TZ3000_3o7r0mno` / TS011F | DIN-rail switch with power monitoring + thresholds | fingerprint → `smartPlug_DinRail` | same |
| `_TZE200_locansqn` / TS0601 | data arrives as response (0x02) too; DP2 humidity not ×10 | already handled; recorded as `existing` quirk | https://github.com/JohanBendz/com.tuya.zigbee/issues/1474 |
| `_TZE284_bquwrqh1` / TS0601 | inverted presence semantics, lux on DP101 (cross-platform test) | recorded as `documented` quirk (not applied) | https://github.com/JohanBendz/com.tuya.zigbee/issues/1351#issuecomment-5928283864 |

Driver choice rule: a couple is added only when its exact mfr+pid is listed by the source and the source's
sibling IDs in the same fingerprint array already live in the chosen driver with the same productId.

## Unconfirmed leads (not applied)

| Couple | Finding | Why not applied | Source URL |
|---|---|---|---|
| `_TZE204_lyqazpe6`, `_TZE284_lyqazpe6` / TS0601 | smart circuit breaker (TOQCB2-80) | siblings split across `climate_sensor`/`smart_breaker`; DP layout unverified | https://github.com/dlnraja/com.tuya.zigbee/issues/556 |
| `_TZE284_n41i9jyt` / TS0601 | 2-zone watering timer | no single-zone/multi-zone driver match confirmed | same |
| `_TZE20C_tjz9ad5g`, `_TZE20C_ycab9txf` / TS0601 | sirens with night light | no sibling evidence in an existing driver | same |
| `_TZD200_sjjp9bti` / TS0202, `_TZE284_5qfrnbqs` / TS0601 | 24 GHz / dual-tech presence | own DP sets, no sibling driver | same |
| `_TZE204_wsek35um`, `_TZE204_eaasry7v`, `_TZE284_rfpyqax9` / TS0601 | radiator / sauna / 8-zone floor heating thermostats | DP layouts differ from our thermostat drivers | same |
| `_TZE204_dak2k10o`, `_TZE204_r6kfl9ta`, `_TZE204_pxbjch8m` / TS0601 | air quality, sound level, cover+switch | no sibling evidence | same |
| whitelabel-only IDs (`_TZ3210_cqqb61yo`, `_TZ3210_o4vasvef`, `_TZ3210_8etggm4u`, `_TZ3000_1hypixdr`, `_TZ3210_tqwyiitv`, `_TZ3210_tlwlmwm6`, `_TZ3000_0lvv1d5b`, `_TZ3000_syetgitm`, `_TZE284_tokhh9pf`, `_TZE284_hbxadcl0`, `_TZ3210_mldzab8w`) | listed only as white-labels / without a direct fingerprint line | productId of the white-label entry not explicit | same |
| `_TZ3290_acv1iusl` | appears in an automated community-sync table only | no primary source | https://github.com/dlnraja/com.tuya.zigbee/issues/538 |
| `_TZE284_pcdmj88b`, `_TZE284_ne4pikwm` / TS0601 | TRVs; a generic TS0601 thermostat mapping did not react | needs device-specific DP capture | https://github.com/JohanBendz/com.tuya.zigbee/issues/1409#issuecomment-5928458518 · https://github.com/JohanBendz/com.tuya.zigbee/issues/1360#issuecomment-5928289076 |
| `_TZE204_8fffc3kb` / TS0601 | addressable pixel-strip controller; generic dimmer mapping fails even on/off | needs EF00 DP capture | https://github.com/JohanBendz/com.tuya.zigbee/issues/1302#issuecomment-5927933645 |
| `_TZE200_gubdgai2`, `_TZE200_vdiuwbkq` (curtain family) | DP1 open/stop/close and position direction differ per family | profile pass needed, no global change | https://github.com/JohanBendz/com.tuya.zigbee/issues/1472 |
| `_TZE204_ijxvkhd0` / TS0601 | motion reported "inverted" on another app | reference maps DP1 as none/presence/move enum, which our radar config already handles | https://github.com/JohanBendz/com.tuya.zigbee/issues/886 |
| `_TZ3000_riwp3k79` | LED strip warm/cold white reversed, RGB not settable | old report, no DP/cluster detail | https://github.com/JohanBendz/com.tuya.zigbee/issues/51 |

## Generic ideas / UX lessons (from other-app threads)

| Topic | Finding | Applicability | Source URL |
|---|---|---|---|
| Repair views | Homey loads repair views only from `drivers/<id>/repair/`; views placed in `pair/` are silently ignored | 53 of our WiFi drivers declare a `configure` repair view with only `pair/configure.html` present → flagged to the WiFi owner (not changed here) | https://community.homey.app/t/154077 (v1.0.23 notes) |
| Periodic alarm pulse | some firmwares emit an alarm pulse about every 60 min; guard timestamp must survive restarts | same pattern as our contact keep-alive guard; consider persisting guard timestamps | https://community.homey.app/t/154077 (v1.0.26 notes) |
| Triggers after restart | a trigger comparing against a stored previous value fired right after app restart | check "changed" triggers seeded from stale store values | https://community.homey.app/t/154077 (feeder report) |
| Offline grace period | delay "disconnected" triggers by a configurable grace period to avoid night-time spam | idea for router/battery availability flows | https://community.homey.app/t/154077 |
| Enum DPs as words | motion DP reported as `pir`/`none`; settings expecting numbers break with word enums | relevant for WiFi drivers; Zigbee DPs are numeric enums | https://community.homey.app/t/154077 |
| Unsupported position | curtains that only support open/stop/close exposed with a position slider break HomeKit | consider hiding `windowcoverings_set` when the device never reports position | https://community.homey.app/t/146735 |
| Settings as flow cards | users want flow action cards for device settings (sensitivity, delay, dusk threshold) | feature idea | https://community.homey.app/t/154077 |
| Signed values | pool heat pump showed −22 °C (signed/unsigned decoding) | keep signed int32 decoding for temperature DPs | https://community.homey.app/t/146735 |

## Feedback loop

The daily digest already watches all six threads (`FORUM_TOPICS=140352,26439,89271,146735,154077,21313`,
≤4 requests per run, back-off on 403/429) and scans issues/PRs **with their comments** of JohanBendz repos and
of this repo (open and closed, bots included). No AI is required.
