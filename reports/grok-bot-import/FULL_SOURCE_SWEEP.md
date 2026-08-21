# FULL SOURCE SWEEP — 2026-08-21 ~23:05 PT

READ ONLY. No forum post. No Diagnostic Report reply. No invented pid. No master/stable patch. No CloudAgent.

| | |
|--|--|
| Sweep PT | **2026-08-21 23:05 PT** (Europe/Paris UTC+2) |
| Sweep UTC | 2026-08-21T21:05Z |
| App ID | `com.dlnraja.tuya.zigbee` |
| Forum topic | 140352 — highest_post_number **2190** (no #2191+) |
| Live Test seen by users today | **v9.0.617** (Peter #2190 screenshot 21:07; Gmail diags 55e3e591 / 0cea6870) |
| Git HEAD at last local read | master `1f18cb336` **9.0.618** · stable-v5 `4ab10842d` **5.12.87/88** |
| Athom later tonight | Auto-Publish **32525833156** SUCCESS → stamp **9.0.619** (Gmail builds #2948/#2949 22:56–22:57 PT) |
| tools.developer.homey.app | **not opened** (no already-logged-in browser this agent) |

Couple rule: manufacturerName + productId **only if seen** in dump/post. Peter forum posts **lack mfr**. Do **not** fill `_TZ3000_k4ej3ww2`+TS0207 from compose onto Peter tiles.

---

## Rank: tonight patches vs live evidence

| Patch | Git tonight? | On live Test 9.0.617? | Verdict |
|--|--|--|--|
| **TS0044 0xFD + skip 0x8004** | YES — master `1f18cb336` / stable `4ab10842d`; Auto-Publish 32521632767 SUCCESS → Test 9.0.618; later 32525833156 SUCCESS 9.0.619 stamp | NO — meter91 #2189 + Gmail `55e3e591` still **9.0.617**; write `32772` failed; toast `scene_switch_4`→`button_wireless_4` | **IN GIT / NOT CONFIRMED ON USER** |
| **IAS zoneStatus coerce** | YES — master `8e46a953f` / stable `6613d1584` | NO — `0cea6870` 9.0.617 still `Zone status change: 0x[object Object]` → alarm1=false overlay DP1 | **IN GIT / NOT ON 9.0.617** |
| **Leftover EF00 / HYBRID skip (IAS-only)** | DRAFTED on box (`ingest-2026-08-21/patches/A-ias-skip-*.diff`). **Not HEAD.** Master WT dirty — other agents writing. | NO — `1cf775a2` 11 DP leftover intent 0/11 sent; `0cea6870` contact skip OK, water still silent | **NOT PATCHED TONIGHT (draft only)** |
| **k4ej local stable** (`_TZ3000_k4ej3ww2`+TS0207 IAS 1280) | NOT tonight. NEXT_PATCHES #1 STABLE_ONLY compose hole. **Forbidden to invent onto Peter posts.** | Peter #2183–#2190 **never cite** this couple | **NOT PATCHED; DO NOT LOCK FROM FORUM** |

---

## 20-line hottest list

1. **NEW live** Peter #2190 + Gmail `0cea6870` 9.0.617 21:11 PT — contact **pulse** (`0x[object Object]`), water+smartbutton **dead**, SOS OK but battery glitchy 15%. Couple **ABSENT**. Coerce in git, **not** on 9.0.617.
2. **NEW live** meter91 #2189 + Gmail `55e3e591` 9.0.617 12:56 PT — `_TZ3000_zgyzgdua`+**TS0044** physical mute, in-app OK, toast `scene_switch_4`→`button_wireless_4`, write 32772 invalid. 0xFD **in git tonight**, user still 9.0.617.
3. **Known lineage** Peter #2184 Gmail `1cf775a2` 9.0.596 12:28 PT — SOS OK after re-pair; water `abc96e67` iasZone 0 + leftover 11 DP; smartbutton `34aecca9` HYBRID none. **Local dump YES.** Couple ABSENT.
4. **Known lineage** Peter #2183 `e181bc15` + `4577486f` 9.0.589 — RAM/flows + SOS/water/button/contact dead. Couple ABSENT. Gmail only, **no local dump**.
5. **Known lineage** `ec514112` / `ace66ff9` 9.0.558 — zoneStatus `[object Object]` already; water leftover. **Same pulse bug as 0cea6870.**
6. **Known crash** `96c19859` 9.0.537 SIGABRT heap OOM + 22 DP recovery. Local dump YES. **Not in today's 9.0.617 stderr.** Do not re-open as new.
7. **Known crash 5.12.70** `c8afb22d` / `634f7b19` `auditCapabilities is not a function` + IAS setTimeout. Couple in dump: `TS0041`/`_TZ3000_0CXTPYLT` (**not** glue onto Peter). Local 634f YES.
8. **Known wrong-driver** PresentSky #2133/#2138 `f20dc4f0` — `_TZE284_m1cvyneb`+**TS0601** paired as climate. Local dump YES. DEVICE_TRUTH lock `wall_dimmer_tuya`. **Not Peter.**
9. **STABLE_ONLY hole** k4ej `_TZ3000_k4ej3ww2`+TS0207 → `water_leak_sensor` IAS 1280 (docs). Live stable compose still wrong home. **Not cited by Peter.** Do not invent.
10. **TB25 steal** Gabriel #2173 couples (`jjdkhueq`+TS0002 etc.) live on `switch_2/3gang` not wall_*. STABLE_ONLY rehome. Mains, not sleepy.
11. **lwthnp7j** Gabriel #2186 `_TZ3000_lwthnp7j` pid **ABSENT** in post. DEVICE_TRUTH wants TS0004 + `wall_switch_4gang_1way`. Do not invent pid from compose onto the post.
12. **Hashed flow ids** `_tryCard` misses hashed `*_button_*` (button-coverage). BOTH. Not a user-filed UUID tonight.
13. **Empty mfr catch-alls** 18 master drivers (e2e 18 fail). BOTH strip pid-only. Not a user UUID.
14. **Smartbutton RX 0xFD** Peter `button_wireless_1` mute — draft B-smartbutton-rx. **No couple in Peter dumps.** Do not lock `_TZ3000_mrpevh8p`.
15. **SOS battery glitchy** #2190 NEW vs #2184 — 15% red both SOS tiles; timeline low↔OK. Not patched as dedicated item tonight.
16. **Contact luminance plateau** #2190 screenshots 1000041134 vs 1000041135 — Tuya contact lux stuck ~60–100; other-app window OK 400–1000. Couple ABSENT.
17. **Athom pipeline tonight** Auto-Publish **32525833156** SUCCESS 22:53 PT → 9.0.619 stamp; Gmail #2946–#2949; e2e-dashboard **32526352786** in_progress 22:59 PT. Not a device bug.
18. **5.12.70 leftover crash class** still relevant if backport BOTH; live 9.0.617 diags do **not** show auditCapabilities.
19. **Heap LIVE-DATA overlay** 96c19859 only. 55e3e591 mentions probe defer sleepy/heap — stderr empty, not OOM.
20. **Forum tail stale** `.github/state-forum-tail.json` stops at **#2183** (18/08). community-inbox 21:34 PT lists 11 unreplied including #2190 Peter / #2189 meter91. **Do not reply.**

---

## A) Local PC

### A1. reports/ (forum-2183 and newer)

| Path | mtime PT | What |
|--|--|--|
| `reports\community-inbox.md` | **21/08 21:34** | Newest report. Forum 11 unreplied (Gabriel/Zemismart/Peter #2183–#2190/meter91/sven). Issues 0 / PRs 0. |
| `reports\forum-2183\` | 18/08 17:53 | `peter-1000040728.jpeg` + `peter-1000040729.jpeg` — Universal Tuya **v9.0.589** Experimental; tiles Raam×3 lux, Smartbutton, SOS Peter 54%, Waterdetector 80%; RAM screenshot companion. **No mfr/pid in images.** |
| `reports\SESSION_HANDOFF_2026-08-15.md` | 20/08 20:42 | Prior P2203 IAS bind-on-enrolled. |
| `reports\P169_MFS_DB_ALIGN_LATEST.json` | 20/08 20:42 | Catalog, not a live UUID. |
| Older P148–P217 / FORUM_* | 15–19/08 | Historical. Folded; not re-treated as new. |

Nothing newer than community-inbox + forum-2183 jpegs as a **user dump**. No `forum-2189` / `forum-2190` folder on disk (those live on box ingest).

### A2. `.github\state-forum-tail.json` (read, not committed)

Stops at **#2183** Peter (`e181bc15` / `4577486f`). Missing #2184–#2190. Stale vs Discourse highest **2190**.

### A3. Crash / diag UUID files

`master\.github\state\homey-app-diag\` (flat, **no UUID dirs**). Newest dump **1cf775a2 20/08 17:57 PT**.

| UUID | local files | version | class | Gmail 14d |
|--|--|--|--|--|
| `1cf775a2` | json + sanitized | 9.0.596 | IAS sleepy | YES |
| `96c19859` | json + sanitized | 9.0.537 | **heap SIGABRT** | YES |
| `634f7b19` | json + sanitized + raw-stack + summary | 5.12.70 | uncaught crash | YES |
| `f20dc4f0` | json + sanitized | 9.0.491 | wrong driver | YES |
| `f1e5b12d` | json + sanitized + raw-stack + summary + crash-scan | 9.0.434 | crash/diag | older |
| `4f83ce7e` | json + gmail + crash-scan (tiny) | probe | Athom **404** | forum #2118 |
| `9b0b5d26` | json + sanitized (tiny) | probe | Athom **404** | forum #2121 |
| **`0cea6870`** | **ABSENT** | 9.0.617 | IAS pulse | Gmail only |
| **`55e3e591`** | **ABSENT** | 9.0.617 | TS0044 0xFD | Gmail only |
| `e181bc15` `4577486f` `ace66ff9` `ec514112` `c8afb22d` | **ABSENT** | — | Gmail only | YES |

Recursive *crash*/*diag* under Documents\homey hit backups + scripts (July), not new Athom stacks. AppData search started; homey-app-diag listing is authoritative for tonight.

### A4. Images (ingest / reports / screenshots)

| Image | Source | What seen | mfr/pid |
|--|--|--|--|
| forum-2183 peter-1000040728/0729 | local reports | v9.0.589 tiles + RAM | **none** |
| forum-scan peter-2183a/b, peter-2184 | box | same family | **none** |
| toast-2189.png | box | "Scèneschakelaar 4-voudig needs driver change" current `scene_switch_4` recommended `button_wireless_4` | couple in **post text** not toast |
| 2190-1000041137 | box | Universal Tuya **v9.0.617** Experimental; Raam×3 206/236/121 lx; Smartbutton blank; SOS Fariba+Peter **15% red**; Waterdetector 75% | **none** |
| 2190-1000041136 | box | SOS battery timeline glitchy low↔OK | **none** |
| 2190-1000041134 | box | Raam onze slpkamer Helderheid **flat ~60–100 lx** (stuck) | **none** |
| 2190-1000041135 | box | other-type window lux day/night OK | **none** (not Universal Tuya cited) |
| homey-inv meter91-error.png | box | same toast as 2189 | **none in PNG** |

No Developer Tools interview screenshot newer than PresentSky #2138 JSON (in forum HTML).

### A5. Rules / knowledge (master) + stable CROSS_APP

`.cursor/rules/*.mdc` (master):

| File | mtime PT |
|--|--|
| device-truth.mdc | 19/08 10:09 |
| dual-app-vision.mdc | 17/08 18:21 |
| forum-silent-humanize.mdc | 19/08 02:55 |
| operational-memory-2026-08-15.mdc | **20/08 20:42** |
| why-interrogation.mdc | 19/08 02:55 |

`docs/knowledge/DEVICE_TRUTH.md` 19/08 13:01 — locked couples include k4ej IAS, m1cvyneb dimmer, TB25/Novadigital, lwthnp7j+TS0004. **Catalog ≠ Peter evidence.**

`docs/rules/CRITICAL_MISTAKES.md` 05/07 (stale date) — A3 press 0-indexed TS0044; A5 single invert IAS.

`docs/rules/SLEEPY_TUYA_56_YEARS_BUG.md` (file on disk; box copy `SLEEPY_TUYA.md`) — passive listener, no boot poll.

`docs/rules/WHY_INTERROGATION.md` 19/08 — couple mandatory; never invent pid.

`docs/rules/DUAL_APP_VISION.md` 17/08 — BOTH / MASTER_ONLY / STABLE_ONLY.

`stable/docs/rules/CROSS_APP_PROMPT_RULES.md` — also on master 15/08. Shared App ID soak: do not Publish Stable→Test while 9.x occupies Test. Box copy: `/workspace/homey-inv/docs/CROSS_APP_PROMPT_RULES.md`.

---

## B) Box already ingested (fold, do not duplicate)

Folded from `/workspace/ingest-2026-08-21/*` and `/workspace/diag-mail-ingest/*`. New this sweep vs those files: Gmail builds **#2948/#2949**, Auto-Publish **32525833156** 9.0.619, e2e **32526352786** in_progress, forum confirmed still **2190**, no new UUID.

Prior files used: `forum-new.md`, `gmail-new.md`, `NEXT_PATCHES.md`, `harvest.md`, `patches/NOTES.md`, `diag-mail-ingest/REPORT.md`, `CROSS-REPORT.md`, `known-1cf775a2.md`, `NEW-2026-08-21-2148/*`, `forum-scan/topic-140352-latest.md`.

---

## C) Gmail MCP `user-Gmail` (search_threads + get_thread PLAIN_TEXT)

Queries: Diagnostic Report / Homey / Athom `newer_than:14d`. **No send/reply/forward.**

### Diagnostic Report threads (UUIDs extracted)

| UUID | thread | date PT | app | couple in dump | symptom | already patched tonight? |
|--|--|--|--|--|--|--|
| **55e3e591-2d4d-4230-a8b6-d521a6ab5b18** | `1a023f6ac3857a87` msg 10:56Z | 21/08 **12:56** | 9.0.617 #2945 Homey Early 2019 | **`_TZ3000_zgyzgdua` + TS0044** (also ERS-10TZBVK-AA label) | physical mute; 32772 not onOff attr; FLOW 1gang on 4gang driver | 0xFD **in git**; **not** on this live 9.0.617 |
| **0cea6870-69dd-4a98-abdd-e35273699e7d** | same thread msg 19:11Z | 21/08 **21:11** | 9.0.617 Homey Pro 2023 | **ABSENT** | water+smartbutton dead; contact pulse `0x[object Object]` | coerce **in git**; leftover skip **draft**; **not** on 9.0.617 |
| **1cf775a2-be97-4b3c-88c4-c29c83bf11d4** | `1a01990674f16212` | 19/08 **12:28** | 9.0.596 | **ABSENT** | SOS OK; water leftover 11 DP; smartbutton HYBRID none | leftover **not** in HEAD |
| e181bc15 / 4577486f | prior ingest | 18/08 17:29/17:44 | 9.0.589 | ABSENT | heap-user + IAS sleepy | lineage of coerce |
| ace66ff9 / ec514112 | prior | 16/08 22:22/22:54 | 9.0.558 | ABSENT | zoneStatus object; water leftover | coerce in git |
| 96c19859 | prior + local | 16/08 12:40 | 9.0.537 | ABSENT | SIGABRT OOM | known, not today |
| c8afb22d / 634f7b19 | prior | 15/08 | **5.12.70** | TS0041 / `_TZ3000_0CXTPYLT` (c8af only) | auditCapabilities crash | 5.12 crash class; not 9.0.617 |
| f20dc4f0 | prior + local | 15/08 18:15 | 9.0.491 Homey Pro 2026 | **`_TZE284_m1cvyneb` + TS0601** | wall dimmer as climate | DEVICE_TRUTH lock; pairing not tonight |

**No new Diagnostic Report UUID after 0cea6870.** Thread still 2 messages. Last automatic crash mail 14/08 (no Log ID).

### Athom pipeline (not diags)

| PT | build | note |
|--|--|--|
| 21/08 21:38–21:40 | **#2946** created/draft/testing | after leftover-skip publish window |
| 21/08 22:09 | **#2947** testing | |
| 21/08 22:56–22:57 | **#2948 created, #2949 created+draft** | matches Auto-Publish **32525833156** 9.0.619 |

Also: Homey Pro v13.4.1 vuln mail 20/08 (not app). Unread backlog ~201 threads mostly build pipeline.

---

## D) Forum topic 140352 READ ONLY (WebFetch/JSON)

URL: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352  
`highest_post_number` **2190** · `last_posted_at` 2026-08-21T19:22:42Z = **21:22 PT** · last_poster Peter. **No #2191.** Never posted.

### Posts #2110–#2190 (symptom rows; couple only if cited)

| # | who | PT | UUID/post | couple (only if seen) | symptom | patched tonight? |
|--|--|--|--|--|--|--|
| 2110 | Tobias-B | 15/07 | `8788edbb` | ABSENT | app crashing | old |
| 2111 | Peter | 15/07 | `266d2e74` | HOBEIAN ZG-222Z **(commercial, not `_TZ`)** | water no data; SOS/button/contact still dead | old |
| 2112 | Nigel_Scott | 15/07 | — | **`_TZE200_ka8l86iu` + TS0601** | presence as motion-only | catalog lock presence-radar class; not tonight |
| 2113 | Peter | 15/07 | `a1fe4b04` | ABSENT | contact lum OK in 9.0.261 | old |
| 2114 | Peter | 16/07 | `ac3f92d2` | ABSENT | contact state stuck; lum mismatch | lineage of pulse/lum |
| 2115 | thierry | 24/07 | interview | **`_TZE204_dhotiauw` + TS0601** | dual energy meter request | not tonight |
| 2118 | Peter | 01/08 | `4f83ce7e` | ABSENT | SOS/button/water dead; contact reversed | 404 local probe |
| 2120 | RoyceRoy | 04/08 | — | **`_TZE204_clrdrnya` + TS0601** | ceiling presence few settings | DEVICE_TRUTH presence-radar |
| 2121 | Peter | 05/08 | `9b0b5d26` | ABSENT | all dead; hard to pair | 404 probe |
| 2122 | blutch32 | 05/08 | `517c1a34` | **TS0203 `_TZ3000_99rpfy6`** (typo 99 vs 996 in later list); **HOBEIAN + ZG-303Z** | contact+soil no values | soil lock exists; not tonight |
| 2129 | Welshsmarthome | 06/08 | — | dual wall socket request **no `_TZ` in post** | add request | skip invent |
| 2130 | Kanbros | 06/08 | — | **`_TZ3000_w5xztuy7` + TS0002** | BSEED 2gang 1ch only | DEVICE_TRUTH switch_2gang |
| 2131 | TBoy | 06/08 | — | **`_TZ3210_imaccztn` + TS0004** | 4ch relay as 4-ch switch | DEVICE_TRUTH relay_board_4; overlay caution NEXT_PATCHES #7 |
| 2132 | RoyceRoy | 07/08 | — | clrdrnya follow-up | missing parameters | not tonight |
| 2133 | PresentSky | 07/08 | — | **`_TZE284_m1cvyneb` + TS0601** | dimmer as climate | = f20dc4f0 |
| 2134 | Peter | 08/08 | `f1e5b12d` | ABSENT | all dead after wipe | local dump |
| 2135 | RoyceRoy | 10/08 | — | `_TZE28C1000000_jtbgusdc` + TS0601 **as written** | 2gang dimmer Avatto | do not "fix" the mfr string |
| 2137 | Peter | 15/08 | `634f7b19` | ABSENT in post | crash loop; SOS dead; smartbutton **shown as contact**; water none; contact reversed | 5.12.70 crash **in dump** |
| 2138 | PresentSky | 15/08 | `f20dc4f0` + interview | **`_TZE284_m1cvyneb` + TS0601** clusters 4,5,61184,0,60672 | dimmer | local dump |
| 2146 | Mike_Nono | 15/08 | — | **his** private-app FP list (many couples) | critique, not a Universal Tuya bug report | do not import as our locks |
| 2160 | Peter | 16/08 | (crash, no UUID in this post) | ABSENT | crash again | → 2164 |
| 2164 | Peter | 16/08 | **`96c19859`** | ABSENT | crash + CPU/RAM insights | heap known |
| 2167 | Peter | 16/08 | `ace66ff9` then `ec514112` | ABSENT | crash gone; water briefly OK then dead; SOS/button mute | zoneStatus lineage |
| 2168–2182 | Gabriel / Zemismart / dlnraja | 17–18/08 | — | **#2173 table** TS0001/2/3 + TS0601 mfrs; **#2171 TS0043 pid only** ZB-L03C-H; **#2186 `_TZ3000_lwthnp7j` pid ABSENT** | TB25 / official Zemismart, not Peter | TB25 steal STABLE_ONLY |
| **2183** | Peter | 18/08 **17:47** | `e181bc15` + `4577486f` | **ABSENT** | memory/flows; SOS/button/water/contact dead. Images v9.0.589 | coerce lineage |
| **2184** | Peter | 19/08 **12:37** | **`1cf775a2`** | **ABSENT** (TS0207 **NOT cited**) | SOS OK after 9.0.596 re-pair; water+smartbutton not | leftover draft |
| 2185–2188 | Zemismart / Gabriel / Sven | 20/08 | — | lwthnp7j filename | ZMS-206 vs Novadigital 4G touch | pid still ABSENT |
| **2189** | meter91 | 21/08 **14:51** | Gmail `55e3e591` | **`_TZ3000_zgyzgdua` + TS0044** MOES 4-way Homey Pro 2019 | physical dead; toast scene→button | 0xFD **in git tonight** |
| **2190** | Peter | 21/08 **21:22** | **`0cea6870`** | **ABSENT** | SOS OK battery glitchy; contact pulse; lum wrong; water+smartbutton still dead. v9.0.617 | coerce in git **not live** |

Images/alt: #2183 1000040728/0729; #2184 1000040782; #2189 toast PNG; #2190 1000041134–1137 (see A4). Gabriel #2172 CleanShot settings screenshots (his app, not ours).

---

## E) Homey Test / dashboard / GitHub

### Auto-Publish `32525833156`

| | |
|--|--|
| Workflow | Auto-Publish on Push (`auto-publish-on-push.yml`) |
| Run | https://github.com/dlnraja/com.tuya.zigbee/actions/runs/32525833156 |
| Title | `chore(master): sync app.json version stamp to 9.0.619 for M08` |
| SHA | `2a31200a8bab0b7d83f431769996725b64ecaee2` |
| Event | push `master` |
| Created | 2026-08-21T20:53:28Z = **22:53 PT** |
| Updated | 2026-08-21T21:01:06Z = **23:01 PT** |
| Conclusion | **success** (7m 38s) |
| Job | Validate & Auto-Publish to Homey App Store 7m 34s |
| Annotations | Node 20 deprecated warning; Homey CLI publish **transient API timeout** then retry via Athom Apps API |
| Gmail correlate | Build **#2948/#2949** created 22:56–22:57 PT |

This run is a **version stamp**, not a device fix. Device fixes landed earlier: `1f18cb336` TS0044 0xFD (Auto-Publish **32521632767** SUCCESS 22:03–22:10 PT → Test **9.0.618**). Users' diags/screenshots still **9.0.617**.

### e2e-dashboard-test (public API, no login)

| run | created PT | conclusion | head |
|--|--|--|--|
| **32526352786** #388 | 21/08 **22:59** | **in_progress** (at fetch) | `v9.0.620: 431 drivers, 3838 FPs [skip ci]` |
| 32521949606 #387 | 22:07 | **success** | auto-fix-all |
| 32521078007 #386 | 21:57 | success | auto-fix-all |
| 32519567964 #385 | 21:39 | success | auto-fix-all |
| 32517077249 #384 | 21:10 | success | auto-fix-all |

Prior CROSS-REPORT e2e master-health: **18 manufacturer-empty fails**. Stable-validate: missing `drivers/air_purifier` (historical).

### tools.developer.homey.app

**Not opened.** Instruction: only if browser already logged in. This agent desktop had no confirmed session. **No invented UI** (no claim of live Test version beyond Gmail builds + forum screenshot v9.0.617 + git 9.0.618/619 stamps).

---

## Inventory table (all items this sweep)

| source | UUID / post# | couple if seen | symptom | patched tonight? |
|--|--|--|--|--|
| Forum #2190 + Gmail | `0cea6870` | ABSENT | pulse + water/button dead + SOS batt glitch | coerce GIT / skip DRAFT / **not on 9.0.617** |
| Forum #2189 + Gmail | `55e3e591` | `_TZ3000_zgyzgdua`+TS0044 | physical mute + toast + 32772 | **0xFD GIT tonight; user still 9.0.617** |
| Forum #2184 + local | `1cf775a2` | ABSENT | SOS OK; water leftover; button mute | leftover **draft** |
| Forum #2183 + Gmail | e181bc15, 4577486f | ABSENT | RAM/flows + all dead | lineage |
| Forum #2167 + Gmail | ace66ff9, ec514112 | ABSENT | water flicker; zoneStatus object | coerce GIT |
| Forum #2164 + local | `96c19859` | ABSENT | heap OOM | known, not today |
| Forum #2137 + local | `634f7b19` | ABSENT in post | 5.12.70 crash; smartbutton as contact | crash class 5.12 |
| Gmail | `c8afb22d` | TS0041 / `_TZ3000_0CXTPYLT` | same crash + DP storm | 5.12 |
| Forum #2138 + local | `f20dc4f0` | `_TZE284_m1cvyneb`+TS0601 | dimmer as climate | lock exists; not tonight apply |
| Forum #2134 | `f1e5b12d` | ABSENT | wipe re-pair still dead | old |
| Forum #2118/#2121 | 4f83ce7e, 9b0b5d26 | ABSENT | Athom 404 probes | n/a |
| Forum #2173 | — | many TS0001/2/3 + TS0601 mfrs | TB25/Novadigital (Gabriel's app) | STABLE steal **not** patched tonight |
| Forum #2186 | — | `_TZ3000_lwthnp7j` pid ABSENT | 4G touch interview | do not invent TS0004 onto post |
| Forum #2171 | — | pid **TS0043** mfr ABSENT | Zemismart ZB-L03C-H | not our Test bug |
| Forum #2112 | — | `_TZE200_ka8l86iu`+TS0601 | presence | catalog |
| Forum #2130 | — | `_TZ3000_w5xztuy7`+TS0002 | BSEED 2gang | catalog |
| Forum #2131 | — | `_TZ3210_imaccztn`+TS0004 | 4ch relay | overlay caution |
| GH Auto-Publish | 32525833156 | n/a | 9.0.619 stamp SUCCESS | pipeline |
| GH e2e | 32526352786 | n/a | in_progress | pipeline |
| Local rules | — | n/a | DEVICE_TRUTH / SLEEPY / DUAL_APP / CROSS_APP | read only |
| k4ej compose | — | `_TZ3000_k4ej3ww2`+TS0207 **from docs, not Peter** | stable IAS hole | **NOT tonight; do not invent onto Peter** |

---

## Non-actions (honored)

- 0 Homey Community posts / likes / replies
- 0 Diagnostic Report email replies / forwards / sends
- 0 invented productId (Peter water/button still unmarked)
- 0 edits to master/stable working trees
- 0 CloudAgent
- 0 tools.developer.homey.app session invented
