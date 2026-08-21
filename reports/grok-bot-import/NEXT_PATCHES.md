# NEXT_PATCHES — ranked synthesis (2026-08-21 ~22:40 PT)

READ ONLY clones. No commit. No forum. No invented pid. No cloud agent.
Reports only under `/workspace/ingest-2026-08-21/`.

| Tree | Clone | HEAD | package.json | Live compose id |
|---|---|---|---|---|
| **master** (dirty IAS skip WT) | `C:\Users\Dell\Documents\homey\master` | `1f18cb336` TS0044 0xFD + skip 0x8004 | **9.0.618** | `com.dlnraja.tuya.zigbee` |
| **stable-v5** (clean) | `C:\Users\Dell\Documents\homey\stable` | `4ab10842d` TS0044 0xFD on `scene_switch_4` | **5.12.87** | `com.dlnraja.tuya.zigbee` (compose **5.12.88**, generated app.json **5.12.87**) |

Athom Developer Tools (user paste t50u) still shows a **second** slot `com.dlnraja.tuya.zigbee.stable` / Tuya Unified (Stable) / ~5.11.x. Git leftover that matches that slot: stable `stable_app.json` **5.11.220**. **Live compose on both trees is the primary ID.** A git publish from either branch hits `com.dlnraja.tuya.zigbee`.

**Patch #0 is not a naive id swap.** Rank below.

Doctrine: identity = `manufacturerName` + `productId`. Never lock overlay on mfr alone. Never invent pid.

Sources folded: `DUAL_APP_AND_BRANCHES.md`, `git-branches-raw.md`, `docs-bugs-cross.md` (hottest 12), `button-coverage.md`, `dynamic-adapt-code.md`, `ir-blaster.md`, `cursor-todos-import.md`, `patches/NOTES.md`, `device-research.md` (stale OPEN claims called out), `harvest.md` (CI runs), dumps `1cf775a2`.

---

## #0 — CI publish-target recoup (blocking)

**BOTH** (workflows live on both trees). **Confidence: high.** **Keep soak-guard now. Do not patch compose id tonight.**

### What actually publishes what

| GHA | File | `on` | Homey CLI / API uses | Tonight |
|---|---|---|---|---|
| **Auto-Publish on Push** | `.github/workflows/auto-publish-on-push.yml` L11–14 `branches: [master, main]` | `master` | **compose id** = `com.dlnraja.tuya.zigbee` | Run `32521632767` **SUCCESS** → Test 9.0.618 (Tools may show 9.0.619+build) |
| **Publish Stable to Test** | `.github/workflows/publish-stable.yml` L13–16 `stable-v5` | `stable-v5` | **same compose id** | Run `32521664198` **SUCCESS with soak-guard SKIP** — Draft/Promote skipped |
| **Auto-Fix + Publish** | `auto-fix-and-publish.yml` L8–9 `master, stable-v5` | both | publish step L285 `github.ref_name != 'stable-v5'` | Cron can bump **master** only |
| Soak helper | `.github/scripts/refuse-stable-test-overwrite.js` L18 | — | `APP_ID \|\| 'com.dlnraja.tuya.zigbee'` | If Test is `9.*` → `skip=true` |

Workflows mention `.stable` **once** on master (`e2e-dashboard-test.yml`). Stable workflows: **0** `.stable` strings (`git-branches-raw.md` §5). `homey app publish` always ships `.homeycompose/app.json` `id`.

### Ranked identity work (not a swap)

| Step | Do | Do not | When |
|---|---|---|---|
| **0a** | **Keep soak-guard** for every git publish (`publish-stable.yml` soak job L95–117 + `refuse-stable-test-overwrite.js`). Shared compose id is still real. | Do not delete soak-guard because Athom Tools shows two slots. | **Now** (already in git). Any `stable-v5` push still skip-promote while Test is 9.x. |
| **0b** | Treat Athom `.stable` as **leftover slot only**. Evidence: `stable_app.json` id `.stable` v**5.11.220** name Tuya Unified (Stable). Live compose+generated app.json still `com.dlnraja.tuya.zigbee` / Universal Tuya. | Do not retarget GHA at `.stable` while compose is primary. Do not invent a 3rd id. | **Now** — docs/local mental model only. |
| **0c** | Coordinated **compose + workflow** switch to `.stable` later: (1) stable `.homeycompose/app.json` `id`+`name`, (2) `refuse-stable-test-overwrite.js` `APP_ID`, (3) `publish-stable.yml` copy/`force_test` text, (4) `auto-fix` already skips stable publish. | **Naive id-only swap** would publish 5.12.x into the leftover `.stable` slot *or* leave workflows querying the 9.0 Test and skip forever. Version: do not blindly bump 5.12.88 compose vs 5.12.87 generated vs Store 5.11.x. | **Explicit later change.** Human confirms Athom slot + Test empty on that id. |

`draft-to-test.yml` / `verified-publish-and-diagnostics.yml` still talk shared App ID (verified-publish default version **8.5.17** — landmine, soak not patch).

Master dirty WT (DeviceIOFacade / TuyaZigbeeDevice / IPD / PFC / quirk table) is **not HEAD**. Do not push it until #0a is understood: Auto-Publish on `master` would hit 9.0 Test.

---

## Ranked patches (after #0)

Legend: **now** = surgical, evidence closed, no invent-pid. **soak** = wait Test ≥9.0.618 + re-pair, or wait explicit #0c.

---

### #1 STABLE_ONLY — k4ej IAS hole (docs-bugs-cross #1 + #10 caveat)

**Patch now (compose+clusters). Soak enroll after.** Confidence: **high**.

Docs lock `_TZ3000_k4ej3ww2`+`TS0207` → `water_leak_sensor` IAS 1280. Forbidden: `water_leak_sensor_tuya`.

Live **stable**:
- `water_leak_sensor`: mfr **does not** list k4ej; k4ej stuffed in **productId**; endpoints **`[0,6]`** (OnOff, not 1280). `_pidConflictNotes` even records `_tz3000_k4ej3ww2` as a pid conflict (`driver.compose.json` ~L408).
- `water_leak_sensor_tuya`: mfr **yes** k4ej (`driver.compose.json` ~L39), pid **no** `TS0207` (k4ej again as pid), clusters `[0,4,5,61184]` bind 61184.

Couple matches **neither** driver fully. Coerce (`8e46a953f` / stable `6613d1584`) cannot attach without cluster 1280.

Intended (NOTES.md D, soak-guard still applies to **push**): add the three case-forms of `_TZ3000_k4ej3ww2` to IAS `manufacturerName`; restore clusters `[0,1,3,1280]` bindings `[1,1280]` to match **master**; remove k4ej from tuya driver mfr **and** pid. Do not add TS0207 to tuya. Do not invent extra pids.

Master IAS water already has mfr+pid+`[0,1,3,1280]` (docs-bugs-cross #12 residual: still **binds PowerCfg 1** — Z2M #28181 `INVALID_EP`). Separate small BOTH later.

---

### #2 STABLE_ONLY — TB25 steal is `switch_2/3gang`, not `generic_tuya` (docs-bugs-cross #3)

**Patch now (rehome couples). Soak re-pair.** Confidence: **high**.

Docs: TB25 2/3-gang → `wall_switch_2gang_1way` / `wall_switch_3gang_1way`. Forbid `switch_2gang` / `switch_3gang`.

Live steal (stable compose):
- `jjdkhueq` / `ywubfuvt` / `kgxej1dv` + `TS0002` on **`switch_2gang`**
- `vjhcenzo` / `eqsair32` / `qxcnwv26` / `fawk5xjv` + `TS0003` on **`switch_3gang`**

`generic_tuya` grep of those mfrs: **no hits** (master or stable). `generic_tuya` pids are `TS0203`/`TS0601`/`TS0603` — not TS0002/3. Forum “added to `switch_1gang`” is false (`ovyaisip`+TS0001 is on `wall_switch_1gang_1way` on both).

Do **not** copy master lock cartesian onto every stable driver. Move **these listed couples only**.

Related STABLE inversions (same class, do not invent pids): `nt4pquef`+TS0601 on `climate_sensor` not `soil_sensor` (hottest #4); `lwthnpj`+TS0004 on `switch_4gang` not `wall_switch_4gang_1way`; `vbfp8eyv`+TS011F on `vibration_sensor` not `din_rail_switch`. Rank under this item, not a 9.0 feature.

---

### #3 BOTH — hashed flow ids vs `triggerButtonPress` constructed ids

**Patch now (code). Compose unhash = soak / optional.** Confidence: **high**.

Homey truncates long trigger ids to `prefix_<5hex>`. `ButtonDevice.triggerButtonPress` (`master-ButtonDevice.js` ~L1548–L1599) builds:

`${driverId}_button_${gangCount}gang_button_pressed` (gangCount = `this.buttonCount \|\| 1`)

`_tryCard` (~L1778–L1793) uses `findDeclaredCI` (**exact / case-fold only**). If `declared.size && !resolved` and id is not app-level `button_pressed`, **return false** — never calls `getDeviceTriggerCard` on the hashed id.

Fuzzy hash match **exists** in `FlowCardHeuristics.resolveFlowCardId` (~L165–177 `dBase = dNorm.replace(/_[a-f0-9]{5}$/i,'')`) but `_tryCard` **does not call it**.

**Exact driver folders where lookup will miss** (priority button/remote; no unhashed `*button*press*` leftover):

| driver folder | hashed / total trig | leftover unhashed |
|---|---|---|
| `button_wireless_4_ts0041` | 24/25 | `…_battery_low` only |
| `handheld_remote_4_buttons` | 20/20 | none |
| `remote_button_emergency_sos` | 20/20 | none |
| `remote_button_wireless_handheld` | 24/25 | battery_low |
| `remote_button_wireless_scene` | 15/15 | none (wrong prefix `button_wireless_*`) |
| `remote_button_wireless_smart` | 9 | leftover `remote_button_wireless_1_battery_low` (**wrong driver prefix**) |
| `remote_button_wireless_wall` | 9 | battery_low |
| `smart_remote_1_button_2` | 4 | only `…_1gang_button_1_long` |
| `smart_remote_4_buttons` | 16/20 | `…_N_long` unhashed; **single/double hashed** |

`remote_button_wireless` still has unhashed `…_3gang_button_pressed` — dropdown may fire; hashed double/long still miss.

**Fix (smallest):** `_tryCard` → `resolveFlowCardId` (already hashed-aware) **or** `homey:ready` map constructed → `manifest.flow.triggers[].id`. Do not blindly shorten 73 hashed cards (many are non-button pollution). Unhash compose only if Homey will not re-hash on build (ids > ~50 chars).

BOTH: same `_tryCard` shape on stable `ButtonDevice`.

---

### #4 BOTH — `scene_switch_1/2/3/6/wall` 0xFD bind? **Not a copy of `_4`**

**Soak / per-pid, not now as a bulk copy.** Confidence: **high on “don’t copy”; medium on who needs 0xFD.**

`scene_switch_4` HEAD: raw 0xFD + `OnOffBoundCluster` + `gangCount=4` + EP1–4 bind 6. Compose pids include `TS0044` **and** `TS004F` **and** `TS0041/42/43` **and** `TS0601` **and** `ERS-10TZBVK-AA`.

Siblings (master compose, `button-coverage-scan.json`):

| driver | pids (as written) | EP | 0xFD / raw / BC | Need `_4` bind? |
|---|---|---|---|---|
| `scene_switch_1` | `TS0601_scene1`, `TS0601`, **`TS004F`**, **`TS0041`**, `TS0215A` | EP1 clusters `[0,1,3,6,4096,57344,61184]` **no bindings** | mixin-named only | **TS0041 yes** (EP1 0xFD). **TS004F no** — dual-mode `0x8004` (`DeviceOperatingMode.js` L67–68 `writeSceneAttr: true`). Do **not** copy TS0044 skip-0x8004 onto this driver. |
| `scene_switch_2` | `TS0601_scene2`, `TS0726`, `TS0042`, `TS0601`, `TS0215A` | same EP1 leftover 61184 | no | **TS0042 yes** EP1–2. No TS0044, no TS004F. |
| `scene_switch_3` | `TS0003`, `TS0013`, `TS0043`, **`TS0044`**, `TS0215A`, `TS0601`, `TS0601_scene3`, `TS0726` | EP1 only | no | **TS0043/TS0044 yes** if they pair here. **TS0003/TS0013 are wall actuators** — do not 0xFD-bind those. |
| `scene_switch_6` | **`TS0601_scene6` only** | EP1 leftover EF00 | no | **No.** MCU scene pad, not TS004x 0xFD. |
| `scene_switch_wall` | `TS0042`, `TS0043` | EP1 leftover 61184 | no | **Yes** 0xFD on EP1–2/3. No TS0044, no TS004F. |
| `scene_switch_6ch` | `TS0601` | `[61184]` bind 61184 | n/a | EF00 only. |

`DeviceOperatingMode.js` L70–74 already `writeSceneAttr: false` for **model TS0044**. Empty model + driver `button_wireless_4` still `tryOnce: true` (L98–99). `scene_switch_4` empty-model path is `writeSceneAttr: false` (L95–96).

**Do not** copy TS0044 0xFD + skip-0x8004 onto `_1` (has TS004F) or `_4` TS004F rows. Meter91 mfr `_TZ3000_zgyzgdua` lives on **`scene_switch_4` only** (docs-bugs-cross #2) — not `button_wireless_4`. Overlay must stay couple, not mfr-only.

---

### #5 BOTH — Peter #2184 water + smartbutton (dump `1cf775a2`)

**Water leftover skip: now (master WT already drafted; stable compose is #1). Smartbutton RX: now. Contact latch: soak after coerce.** Confidence: **high dump / medium overlay.**

Dump (`/workspace/diag-mail-ingest/known-1cf775a2.md`, app 9.0.596): **no `_TZxxxx` / `TSxxxx`**. Devices: `water_leak_sensor` `abc96e67`, `button_wireless_1` `34aecca9`, SOS OK.

**Smartbutton overlay/compose homes** — couple used elsewhere, **not invented from this dump**: `_TZ3000_mrpevh8p`+`TS0041` is listed on **`button_wireless_1`** compose (NOTES.md B). Do **not** lock overlay on `_TZ3000_mrpevh8p` alone. Physical miss: mixin never installs `OnOffBoundCluster.handleFrame` 0xFD; raw `onZigBeeMessage` ignores cmd 253. Fix is RX bind/raw 0xFD on ButtonDevice lineage (patches `B-smartbutton-rx-*.diff`), **not** a fingerprint.

**Water leftover:** HYBRID-QUERY 11 DPs, 0/11 sent (`known-1cf775a2.md`). Skip helper drafted, **not in HEAD**. Master WT dirty. Stable also needs cluster 1280 (#1) or skip never sees IAS.

**Contact pulse after coerce `8e46a953f`:** invalid Buffer/object → return, no DP1 overlay (`IASZoneEnhanced.js` L245–251, L266–268). **Still missing for latch vs pulse:**
1. Named Bitmap `{alarm1:false,…}` **coerces to 0** (valid) then `_updateCapabilitiesFromStatus` L339–346 writes `alarm_contact = alarm1` even when 0 (keep-alive closes an open DP1).
2. USB `applyPolarity` can invert vs DP1.
3. Stable k4ej has **no 1280** so this handler never runs (#1).

Latch bit0-only + skip polarity on IAS overlay = soak after coerce is on Test **and** IAS cluster exists. Docs that still say zoneStatus OPEN are **stale** (docs-bugs-cross #10).

---

### #6 BOTH — 18 empty `manufacturerName` PID-only catch-alls

**Do not invent mfrs. Prefer strip catch-all pids.** Confidence: **high list; medium which pids to drop.** **Now** for strip; **never** infer-enrich.

Master health fail (`homey-inv/master-health.txt` + docs-bugs-cross #5, live recount):

`device_plug_energy_monitor`, `device_plug_smart`, `dimmer_1_gang_2`, `dimmer_dual_channel`, `doorwindowsensor`, `double_power_point`, `outdoor_2_socket`, `pirsensor`, `radar_sensor_2`, `radar_sensor_ceiling`, `relay_board_1_channel`, `rgb_bulb_E27`, `sensor_climate_temphumidsensor`, `sensor_lcdtemphumidsensor_temphumidsensor`, `sirentemphumidsensor`, `smart_air_detection_box`, `smart_switch`, `switch_2_gang_metering`.

Hottest lock broken by empty mfr: `vzopcetz`+`TS011F` → `device_plug_energy_monitor` (DEVICE_TRUTH lock **dead**).

Stable 7 **different** empties: `device_radiator_valve_smart`, `dimmable_recessed_led`, `gateway_zigbee_bridge`, `smart_air_detection_box`, `soilsensor`, `valvecontroller`, **`wall_dimmer_1gang_1way`** (breaks `_TZB210_g01ie5wu`+`TS0501B`).

Recommend: **strip pid lists** (and `catchall: true` metadata) so Homey cannot pair on pid-only cartesian. Keep the folder if device.js is shared. Do **not** fill mfrs from Z2M.

---

### #7 MASTER_ONLY overlay caution — TBoy `_TZ3210_imaccztn`+TS0004

**No overlay patch now.** Confidence: **high compose; high “don’t mfr-lock”.** Soak: confirm pairing home.

PECULIARITIES `tboy-relay-4ch-imaccztn` → `relay_board_4_channel`. Live master compose **has** `_TZ3210_imaccztn` (+ case) in `manufacturerName` L161–164 and `productId: ["TS0004"]` L96–98. Also lists `_TZ3000_imaccztn` (different prefix — not the same couple). Metadata `"catchall": true` “Fallback for unmatched … PIDs: TS0004” — pid-only landmine, same class as #6.

**TS0004 appears in 20 driver `productId` lists** (scan). Canonical-ish 4-ch homes: `relay_board_4_channel` (18 mfrs, pid-only TS0004), `wall_switch_4gang_1way`, `wall_switch_4_gang`, `switch_4gang`, `switch_4_gang_metering`. Pollution: `climate_sensor` (2463 mfrs), radars, `universal_zigbee`, `motion_sensor`, … `radar_sensor_2` is **empty mfr** + TS0004.

`data/fingerprints.json` is **mfr-keyed**. Do **not** add `_TZ3210_imaccztn` as a one-driver overlay without `modelIds: ["TS0004"]` **and** `getDriverId` refuse (already L300–314). Never mfr-only.

---

### #8 BOTH — IR method names + empty wifi flows + ZS06 on virtual

**Patch now (rename + empty flows). ZS06 rehome soak.** Confidence: **high lines.**

`drivers/blaster_remote/driver.js`:
- L44 `args.device._sendIR(...)` — **method does not exist**
- L55 `args.device._startLearn()` — **method does not exist**

`drivers/blaster_remote/device.js`:
- L113 `async sendIRCode(code)`
- L218 `async startLearn()`
- L104–106 listeners already call the **correct** names

`drivers/wifi_ir_remote/driver.flow.compose.json` L2–4: `{ "triggers": [], "conditions": [], "actions": [] }` — learn/send methods exist on device, no cards.

ZS06 mfr `_TZ3290_7v1k4vufotpowp9z` (+ case folds) sits on **virtual** `ir_remote` (`driver.compose.json` L138–149) with pid **`TS0601`**, class `other`, `Homey.Device`. Physical ZS06/UFO-R11 is **TS1201** on `ir_blaster`. Truncated `_tz3290_7v1k4vuf` is on `ir_blaster`. Do not invent TS1202. Do not lock `_TZ3290_*` mfr-only.

---

### #9 MASTER_ONLY — EnrichedDPMappings / fingerprints.json still mfr-only

**Smallest fix now; overlay soak.** Confidence: **high.**

| File | Key today | Line |
|---|---|---|
| `lib/tuya/EnrichedDPMappings.js` `getProfile(manufacturerName)` | exact mfr string | **L777–778** |
| `parseDP(manufacturerName, dp, raw)` | calls getProfile(mfr) | **L791–793** |
| `data/fingerprints.json` / `lib/tuya/fingerprints.json` | `{ "<mfr>": { driverId, modelIds[] } }` | one driver per mfr |
| `lib/dynamic/LiveDataUpdater.js` `_validatePayload` | `MFR_RX` one entry per mfr | **L181–185** |
| `lib/tuya/DeviceFingerprintDB.getDriverId` | compound `mfr\|pid` wins; mfr catalog refused if pid not in `modelIds` | **L300–314** |

**Smallest MASTER_ONLY:** `getProfile(mfr, pid)` try `MANUFACTURER_DP_PROFILES[mfr+"|"+pid]` then existing mfr profile **only if** `profile.modelIds` missing or contains pid; else `null`. Mirror LiveData validator: require `modelIds` when pid known. Do **not** rewrite JSON keys in one giant dump. Do **not** lock overlay on mfr alone.

Stable lacks most of this stack — not STABLE_ONLY.

---

### #10 MASTER_ONLY — fusion named-ZCL > raw (docs-bugs-cross #7)

**Soak / sleepy-only invert.** Confidence: **high code; medium “when to invert”.**

`lib/layers/LayerSignalFusion.js` L46–54: `zcl:1`, `tuya-dp:2`, `ias:2` (tied), `raw:5`. File absent on stable. Intercept is raw-first; fusion trusts named ZCL. IAS/DP tie = bogus DP1 can pulse contact inside echo window. No `// WHY:` on `SOURCE_PRIORITY`.

Not a fingerprint. Invert **sleepy IAS / 0xFD remotes only** (raw/IAS > DP). Do not globally prefer raw on mains ZCL switches.

---

### #11 BOTH — leftover EF00 skip for IAS-only (1cf775a2) — drafts already on disk

**Now on master (after #0a understood). Stable after #1 clusters.** Confidence: **high call-site.**

Drafts: `/workspace/ingest-2026-08-21/patches/A-ias-skip-*.diff` + NOTES.md. **Not applied to working trees as committed HEAD.** Master WT already dirty on the real paths (`lib/tuya/TuyaZigbeeDevice.js`, `lib/io/DeviceIOFacade.js`, `lib/io/ProtocolFallbackChain.js`, `lib/protocol/IntelligentProtocolDetect.js`, `data/protocol_quirk_table.json`). HYBRID skip-disable **is** in HEAD both (`HybridProtocolManager.js` ~L167–177) — docs saying optimizer still kills Peter are **stale** (docs-bugs-cross #11).

Keep RX: raw L0 + IAS. Do not skip when cluster 61184 present (TS0601 tuya water).

---

### #12 STABLE_ONLY — ZG-303Z pid leak on `climate_sensor_energy` (docs-bugs-cross #6)

**Now (strip pid). No invent mfr.** Confidence: **high.**

Stable `climate_sensor_energy` **productId includes `ZG-303Z`**. Mfrs = `_hybrid_*_needs_device_assignment` placeholders. Master energy driver omits ZG-303Z. Canonical `soil_sensor` already has HOBEIAN+ZG-303Z+`_TZE200_wqashyqo` on **both**. Strip the pid from energy; do not fill placeholders.

---

## Stale OPEN — do **not** patch as if still broken

| Claim | Live today | Evidence |
|---|---|---|
| `classifyOperatingFamily` still `writeSceneAttr:true` for **all TS0044** (`device-research.md` §3.1) | **FALSE** both trees | `DeviceOperatingMode.js` L70–74 `writeSceneAttr: false`. Caveat: empty model + `button_wireless_4` tryOnce L98–99 |
| zoneStatus Buffer / DP1 overlay still the Peter bug | **coerce IN** both | `IASZoneEnhanced.js` L68 / L248–251. Residual = latch #5 + stable no 1280 |
| HYBRID 15 min disables sleepy IAS | **skip IN** both | `HybridProtocolManager.js` ~L167 |
| 0xFD missing on 4-gang | **IN** `button_wireless_4` **and** `scene_switch_4` both | HEAD commits |
| TB25 stolen by `generic_tuya` | **FALSE** | steal is `switch_2/3gang` (#2) |
| Empty mfr “eliminated in 9.0.31” | **FALSE** | 18 still fail health (#6) |

Add `// WHY:` on those sacred branches when touching them (docs-bugs-cross §4) — not a reason to reopen the bug.

---

## Explicit non-goals

- Naive `.homeycompose` id swap to `.stable` (see #0c).
- Drop soak-guard while git compose still shares the 9.0 App ID.
- Invent pids / infer-enrich into 18 empty mfrs or `climate_sensor` 2463-mfr catch-all.
- Lock overlay on `manufacturerName` alone (`zgyzgdua`, `imaccztn`, `mrpevh8p`, `_TZ3290_*`).
- Copy TS0044 skip-0x8004 onto TS004F (`scene_switch_1` / `_4` pid lists).
- Cartesian-copy master DEVICE_TRUTH onto stable.
- Forum post (SLEEPY_TUYA “reply on the forum” contradicts FORUM_SILENT).
- Cloud agent / commit from this pass / stringify 3.8 MB `app.json`.
- Use worktree `stable-v5-p195` @ `868dd209d` as Stable source of truth.

---

## Suggested apply order (human)

1. Leave soak-guard. Do not push `stable-v5` expecting a `.stable` Athom slot.
2. Master: finish leftover-EF00 skip (#11) + `_tryCard` hash resolve (#3) + IR rename (#8) → Auto-Publish 9.0 Test. Re-pair meter91 / Peter.
3. Stable compose: k4ej IAS clusters+mfr (#1), TB25 `switch_2/3gang` rehomes (#2), ZG-303Z pid strip (#12), empty-mfr pid strip (#6). **Push still skip-promote** until #0c.
4. MASTER_ONLY catalogs (#9) and fusion sleepy invert (#10) after 9.0 soak.
5. Coordinated `.stable` id switch (#0c) only when dlnraja explicitly wants the leftover Athom slot to receive 5.12.x.
