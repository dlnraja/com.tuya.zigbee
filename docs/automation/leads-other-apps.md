# Leads from other-app threads and all issue/PR comments

Sources read on 2026-10-01 (read-only, never posted):

- **Forum (full raw export, 100 posts per request, random 4–9 s spacing, stop on 403/429):**
  154077 (Tuya Local, all pages), 146735 (Tuya Smart Life, all pages), 89271 (device-request archive, all pages),
  26439 (Tuya Zigbee app thread, all pages), 21313 (Tuya Cloud, all 28 pages; no new couple found there). GitHub continuation is noted in
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
| Repair views | Homey loads repair views only from `drivers/<id>/repair/`; views placed in `pair/` are silently ignored | **DONE (P2768, master + stable)**: `drivers/<id>/repair/configure.html` added for every driver declaring the view; test `check:p2768` | https://community.homey.app/t/154077 (v1.0.23 notes) |
| Periodic alarm pulse | some firmwares emit an alarm pulse about every 60 min; guard timestamp must survive restarts | **DONE (P2771, master)**: quirk type `alarm_pulse_guard` (`params.capability`, `periodMs`, `toleranceMs`), timestamp in device store; opt-in per pair, no pair enabled until a source cites one | https://community.homey.app/t/154077 (v1.0.26 notes) |
| Triggers after restart | a trigger comparing against a stored previous value fired right after app restart | **DONE (P2770, master)**: `lib/flow/TriggerGuards.js`; first `*_changed` value within 45 s of init only sets the baseline (Zigbee trigger path) | https://community.homey.app/t/154077 (feeder report) |
| Offline grace period | delay "disconnected" triggers by a configurable grace period to avoid night-time spam | **DONE (P2770, master)**: app setting `availability_trigger_grace_s` (default 120 s) delays `device_became_unavailable`; WiFi already had its own grace (P2619) | https://community.homey.app/t/154077 |
| Enum DPs as words | motion DP reported as `pir`/`none`; settings expecting numbers break with word enums | relevant for WiFi drivers; Zigbee DPs are numeric enums | https://community.homey.app/t/154077 |
| Unsupported position | curtains that only support open/stop/close exposed with a position slider break HomeKit | **DONE (P2772, master)**: `lib/covers/PositionSupportTracker.js`; pure-DP covers with ≥20 movements over ≥7 days and no position report lose the slider; restored on first position report | https://community.homey.app/t/146735 |
| Settings as flow cards | users want flow action cards for device settings (sensitivity, delay, dusk threshold) | **DONE (P2773, master)**: app-level action `device_set_setting` (autocomplete of editable settings, type coercion, calls `onSettings`) | https://community.homey.app/t/154077 |
| Signed values | pool heat pump showed −22 °C (signed/unsigned decoding) | **DONE (P2769, master + stable)**: VALUE decoded as signed int32 in all DP parsers (`lib/tuya/TuyaDpValue.js`); test `check:p2769` | https://community.homey.app/t/146735 |

## Feedback loop

The daily digest already watches all six threads (`FORUM_TOPICS=140352,26439,89271,146735,154077,21313`,
≤4 requests per run, back-off on 403/429) and scans issues/PRs **with their comments** of JohanBendz repos and
of this repo (open and closed, bots included). No AI is required.

## Continuation 2026-10-01 — incremental GitHub scan (`scripts/scanners/github-leads-scan.js`)

Read-only, polite random delays, hard request budget, stop on 403/429; cursor in
`docs/automation/leads-other-apps-cursor.json` → `scan`, output in `data/leads/github-leads.json`
(only mfrs not yet in a driver, or texts with firmware/bug keywords). The same scan now runs in
`oss-lan-source-enrich.yml` (GITHUB_TOKEN only, no AI, budget `vars.LEADS_SCAN_MAX_REQUESTS`, default 150)
and commits through `scripts/ci/safe-auto-commit.js`.

Coverage reached in this pass:

| Source | Coverage |
|---|---|
| issue/PR comments, both tracked repos | complete history (back to 2020-10 / 2025-08) |
| issues/PRs, both tracked repos | complete history, open + closed |
| peer Homey Zigbee app repos (4) | issues, comments and every `driver.compose.json` |
| forks of the root repo (196) | all 182 listed forks checked (forks never pushed after forking skipped; every branch of the others compared) |
| forks of this repo (11) | all checked |

After a full pass the scanner switches to incremental mode: issues/comments with `since=<previous pass>`,
forks re-listed but only re-compared when `pushed_at` changed. The 29 mfrs still not in a driver are the
#556 monthly-scan list already assessed above (no exact couple + driver evidence).

### Applied

| Couple | Finding | Action | Source URL |
|---|---|---|---|
| `_TZ3000_bwjstafw` / TS0203 | full device interview: IAS zone `contactSwitch`, clusters 0/1/3/1280, same as `contact_sensor` | fingerprint → `contact_sensor` (4 case variants) | https://github.com/rvproductions/com.tuya.zigbee/blob/SDK3/drivers/doorwindowsensor_3/device.js |
| `_TZE284_aao3yzhs` / TS0601 | DP5 temperature is 0.1 °C (10x when read as whole °C) | already handled → quirk `existing` | https://github.com/JohanBendz/com.tuya.zigbee/issues/1009#issuecomment-5897476882 |
| `_TZ3000_wkai4ga5` / TS0044 | alternate-frame debounce drops presses; double toggle elsewhere | quirk `documented` | https://github.com/JohanBendz/com.tuya.zigbee/issues/457#issuecomment-5870019780 |
| `_TZ3002_pzao9ls1` / TS0726 | app press on one gang toggles all gangs | quirk `documented` | https://github.com/dlnraja/com.tuya.zigbee/issues/132#issuecomment-3947072344 |
| `_TZ3000_rco1yzb1` / TS004F | single click missing, later press read as double click | quirk `documented` | https://github.com/JohanBendz/com.tuya.zigbee/issues/423#issuecomment-2405850747 |

### Unconfirmed (not applied)

| Couple | Why | Source URL |
|---|---|---|
| `_TZ3000_stt211u9` | fork list with mixed pids (incl. typo `TSO121`), no interview | https://github.com/CyB0rgg/com.tuya.zigbee/blob/SDK3_UK/drivers/smartplug/driver.compose.json |
| `_TZ3000_9er9cqgi` | fork list shared by TS0002/3/12/13/011F, no exact pid | https://github.com/Geim66/com.tuya.zigbee/blob/patch-1/drivers/switch_2_gang/driver.compose.json |
| `_TZ3210_y5rtzkmc` | fork LED list with 4 pids, no exact pid | https://github.com/rvproductions/com.tuya.zigbee/blob/SDK3/drivers/rgb_led_strip_controller/driver.compose.json |
| `_TZ3290_acv1iusl` | only in automated triage output, no device evidence | https://github.com/dlnraja/com.tuya.zigbee/issues/335 |
| `_TZ2300_gjnozsaz` | user asks whether it is a typo of a known id | https://github.com/JohanBendz/com.tuya.zigbee/issues/521#issuecomment-1792049987 |

Side note: `_TZ3000_wkai4ga5` (TS0044, 4 buttons) also sits on `button_wireless_2`; worth a review.
