# Credits & Acknowledgments

## Core Framework
- **Athom BV** - Homey SDK3, node-homey-zigbeedriver, node-zigbee-clusters
- **Homey Developer Documentation** - apps.developer.homey.app

## SVG Icons & Image Assets
- **athombv/homey-vectors-public** - Official Homey SVG vector icons for device capabilities and UI elements
- **Joolee/Homey-SVG-Icons** - Community-maintained SVG capability icons for Homey devices

## Tuya Protocol References
- **JohanBendz/com.tuya.zigbee** - Original Tuya Zigbee app for Homey (TuyaSpecificClusterDevice, DP constants, sub-devices)
- **Koenkk/zigbee-herdsman-converters** - Z2M device definitions and Tuya converters (P3066 DP tables: TS0601_din_2, BAC-001, TS0601_knob_dimmer_switch, EcoDim ED-10032 whiteLabel; facts only, own code)
- **zigpy/zha-device-handlers** - ZHA Tuya quirks (zhaquirks/tuya/)
- **jasonacox/tinytuya** - Tuya local protocol implementation
- **make-all/tuya-local** - Tuya Local for Home Assistant (YAML config DP mappings)
- **rospogrigio/localtuya and forks (e.g. xZetsubou/hass-localtuya)** (GPL-3.0) - localtuya and forks: inspiration only, no code copied. Behaviour notes in our own words: `docs/automation/localtuya-study.md`.
- **dresden-elektronik/deconz-rest-plugin** - deCONZ Tuya support and Data Point Protocol documentation

## Community Contributors
- **AreAArseth/com.hobeian** - Hobeian Zigbee devices
- **drenso/com.tuya2** - TypeScript Tuya cloud app (OAuth2 patterns)
- **JohanBendz** — develop-0.4 engineering notes, reimplemented in our own code (no code copied): unknown-DP log flood guard ([#1501](https://github.com/JohanBendz/com.tuya.zigbee/issues/1501)), colour-temperature safe range + best-effort vendor RGB mode ([#1502](https://github.com/JohanBendz/com.tuya.zigbee/issues/1502)), read-only relay power-on sync ([#1503](https://github.com/JohanBendz/com.tuya.zigbee/issues/1503)), TH05Z identity without sleepy Basic reads (commit 71fc1e29), TH01Z MCU time requests (commit d78ab90a), knob Level Control bound cluster (commit 9045a3c4).
- **P3065 Flow uplift (2026-10-26), ideas only, no code copied** — Homey SDK docs (device-filter, dropdown, titleFormatted card model); Johan Bendz's Tuya Zigbee app (card families); Home Assistant device automations and the community adaptive-lighting integration (pause / is-active / chosen colour temperature); ZHA quirks (`zhaquirks/const.py` press-type vocabulary: short/double/long press, long release, scene recall); Zigbee2MQTT exposes (per-button `1_single`/`1_double`/`1_hold` action enums, TS0215A alarm remote `arm_*`/`disarm`/`emergency`). All reimplemented as our own generic, brand-free, local cards.
- **gpmachado** (`gpmachado/com.gpm.homesuite`, GPL-3.0, ideas only — no code copied) — availability last-seen persist + boot grace, rejoin vs timeout (`device_rejoined`), lifecycle `onUninit` teardown, Poll Control skip on sleepy nodes, Homey settings over ZCL dump, jitter/TX pacing (no thundering herd), inching/power-on/backlight re-apply, interview-driven sacred couples, settings-as-labels, connected-devices grouping, rejoin-history settings tab, hide dead firmware settings. Dual-app tags in `.ai/KNOWLEDGE_CACHE.json` → `recentDiscoveries.homesuite`. HomeSuite itself credits **StyraHem / s-dimaio** (Homey.Sonoff.Zigbee) and JohanBendz — acknowledged as HomeSuite’s upstream, not copied here.
- **Rick_D** (SHS Device Watchdog, Homey Community topic [157537](https://community.homey.app/t/157537), ideas only — no code copied, P3028) — learned per-device reporting gap with a minimum observation period (posts 781378, 781761, 783688), buttons/remotes excluded from silence staleness (773003, 772612), flap + many-devices-at-once hints (760791, 760906), old battery reading = device quiet, not battery low (773565), transient 1 % low-battery dips (770561). Ours: frame-level last seen, raise-only and capped timeouts, bounded per-device stats in `lib/managers/availability-learning.js`.
- **makleso6, Jan_Z and TedTolboom** (Homey Community topic 156, posts 791200, 791317, 791557; [athombv/node-homey-zigbeedriver#194](https://github.com/athombv/node-homey-zigbeedriver/issues/194), P3029) — makleso6 and Jan_Z found that per-cluster ZCL sequence numbers restart at 1 on every app start and that some firmwares then drop frames silently; TedTolboom confirmed it. Ours: one counter per device continued across restarts in `lib/zigbee/ZclTsnContinuity.js`, own code.
- **Cadabi** (Homey Community topic [160757](https://community.homey.app/t/160757), post 788018, P3029) — tested couple `_TZB210_3zfp8mki` + TS0505B, kept on a single driver (pin test); topic added to the read-only forum scan.
- **andiwirz** - Protocol auto-detect, DP discovery tool
- **iBush** (Switcher app for Homey, [community t/160624](https://community.homey.app/t/160624)) - ideas only, our own code: timer-for-a-set-time card, time-left token / timer-running trigger, auto-shutdown, child-lock, correct-known-AC-state.
- **Steve_Wilson** ([t/101901 #8](https://community.homey.app/t/101901/8)) - interview of the Zemismart 214C valve (`_TZE284_vuwtqx0t`); with **Kigrou** (zigbee-herdsman-converters#10636, Z2M `TS0601_water_valve`) and Zemismart (`zemismart-zha-quirks` 214c.py) as the DP sources for P2864. DP tables only, no code copied.
- **Istvan_Mag, Kizabgd, marosk, Dragan_Todorovic** (topics 140352 / 26439) - Developer Tools / interview data for `_TZE284_gnpflcoq`, `_TZE284_9ern5sfh`, `_TZE200_fl8cuafl`, `_TZE200_crq3r3la`; **julianjwong** (zha-device-handlers#5286) for the corrected gnpflcoq DP table.
- **seikossss** ([t/140352 #2268](https://community.homey.app/t/140352/2268)) - request and fingerprint for the NEO NAS-WV05B2-L sprinkler timer (`_TZE284_z7a2jmyy` / TS0601), matched to the Z2M `neo.ts` definition.
- **rebtor** - TuyAPI local control
- **jurgenheine** - Cloud API patterns
- **robertklep/homey-tuya-zigbee** - Community Tuya Zigbee
- **codetheweb/tuyapi** - Node.js Tuya API
- **blakadder/zigbee** - Zigbee device database

## Flow card inspiration (inspiration, no code copied)
Public `app.json` flow card lists were read to decide which generic cards to offer (P2775). The cards are our own implementation.
- **JohanBendz/com.tuya.zigbee** (MIT) - siren/window/button card set
- **Drenso/com.tuya2** - per-channel on/off triggers and conditions, child lock and night-mode actions
- **shaarkys/com.xiaomi-miio** - "no motion for N minutes", "value is between" and button-gesture cards
- **chaosfish/com.xiaomi-mi-zigbee** (fork of the Xiaomi/Aqara Zigbee app) - device information action
- **athombv/com.ikea.tradfri-example** - reference structure for Zigbee driver flow cards

## Homey Community Forum Contributors
- **dlnraja** - App author, primary maintainer, TITAN Protocol architect
- **Peter** - Issue #2090 (HOBEIAN water leak sensor), active device reporter
- **JohanBendz** - Original Tuya Zigbee app author (com.tuya.zigbee), foundational patterns. His 2026 issue triage ("Batch" consolidation comments with exact device identities, acceptance objectives and known regressions, e.g. #423/#424 click-window request) is indexed as leads in `data/leads/johan-canonical-index.json` (read-only, links kept); thanks also to every reporter whose Homey interviews he preserved.
- **Community members** - All forum contributors who reported issues #2091, #5472, #388, #383, #420, #417 and requested device support
- **Reddit communities** - r/homey, r/zigbee, r/homeautomation for cross-platform device knowledge

## Forum-Based Device Reporters
- **motren** — device interview of the TS0044 scene remote `_TZ3000_pd9mpyh4` (JohanBendz/com.tuya.zigbee#1534); placed on `scene_switch_4` 2026-10-25
- **OMGatito** — Meian TS0224 siren `_TZ3000_cipibmnp` (JohanBendz#465); placed on `siren` 2026-10-12
- **Peter** - HOBEIAN ZG-222Z water leak sensor (Issue #2090)
- **Community** - MMWave radar motion sensor (Issue #420)
- **Community** - Bed sensor verification (Issue #383)
- **Community** - Rain sensor _TZ3210_tgvtvdoc (Issue #388)
- **Community** - Multiple fingerprint additions (Issue #417)

## Multi-Manufacturer Device Support
- **Tuya ecosystem** - One manufacturer produces thousands of device variants
- **Z2M/ZHA communities** - Cross-reference database for DP mappings
- **Homey Community Forum** - Real-world device reports and testing

## Repositories Studied
- **JohanBendz/com.tuya.zigbee** - TuyaSpecificClusterDevice, DP constants, sub-devices
- **Koenkk/zigbee-herdsman-converters** - Z2M Tuya converters, modernExtend patterns
- **zigpy/zha-device-handlers** - ZHA Tuya quirks (zhaquirks/tuya/)
- **jasonacox/tinytuya** - Tuya local protocol implementation
- **make-all/tuya-local** - Tuya Local for Home Assistant (YAML config DP mappings)
- **dresden-elektronik/deconz-rest-plugin** - deCONZ Tuya Data Point Protocol
- **athombv/node-homey-zigbeedriver** - Official Zigbee driver framework
- **athombv/node-zigbee-clusters** - ZCL cluster implementations
- **athombv/com.ikea.tradfri** - Reference Homey Zigbee app
- **athombv/homey-apps-sdk-issues** - SDK issue tracker and workarounds
- **athombv/homey-vectors-public** - Official SVG vector icons
- **Joolee/Homey-SVG-Icons** - Community SVG capability icons
- **codetheweb/tuyapi** - Node.js Tuya local API
- **blakadder/zigbee** - Cross-platform Zigbee device database
- **gpmachado/com.gpm.homesuite** - GPL-3.0 study only (no code copied): availability, rejoin, onUninit teardown, Poll Control skip, settings-as-labels, connected-devices grouping, jitter / no mesh flood

## Device Database
- **zigbee.blakadder.com** - Cross-platform device fingerprints
- **Zigbee2MQTT Supported Devices** - 5473+ devices from 577+ vendors
- **CSA IoT** - Zigbee certified products (csa-iot.org)
- **Zigbee2MQTT** - 5473+ device definitions from 577+ vendors

## Advanced Feature Inspirations
- **Bayesian presence scoring** - Academic research on multi-sensor fusion for occupancy detection
- **Battery health monitoring** - NASA Battery Health Management research (capacity fade, RUL estimation)
- **Zigbee mesh topology** - Zigbee Alliance mesh networking specifications; **Zigbee2MQTT** network map (LQI colour bands, coordinator/router/end-device roles, graphviz map_options) — ideas only
- **Homey Community** thread “Zigbee Route map” (Martijn Poppen `com.homey.map.mesh`) — last-used routes on Homey Pro 2016–2019 only; **not available on Homey Pro 2023**, so this app’s settings spider is a passive last-hop / inferred layout, not a ZDO neighbor dump
- **Energy monitoring** - Smart meter standards (DLMS/COSEM) for consumption tracking
- **Signal triangulation** - Indoor positioning research using RSSI-based localization

## Documentation Sources
- **Homey SDK3 Documentation** - apps.developer.homey.app
- **Zigbee Cluster Library (ZCL)** - Zigbee Alliance specifications
- **Tuya Developer Platform** - developer.tuya.com
- **Node.js Best Practices** - Node.js official documentation and community patterns

## Smart Features Ecosystem (v9.0.4xx, P92.10x)
- **zigbee2mqtt availability feature** — device online/offline monitoring with per-power-source timeouts, adapted as passive `DeviceAvailabilityManager` (flow triggers `device_became_unavailable` / `device_back_online`, condition, report action)
- **ZHA availability timeouts** — mains/battery timeout model (2 h / 6 h), cross-checked against our 15 min / 24 h choice
- **Philips Hue / Hue Zigbee app (JohanBendz sdk3)** — adaptive lighting, natural light emulation, wakeup ramps (`AdaptiveLightingManager`, `TransitionEngine`) ; flow actions **Alert**/**Blink** (notre `light_alert_blink` via ZCL Identify + fallback impulsions avec restauration d'état) et **suppress_sensor** (notre `SensorSuppressionManager` centralisé, avec filtrage motion-only et auto-expiration)
- **SmartThings Edge drivers** — device health/watchdog patterns for predictive alerts (`PredictiveHealthEngine`)

## Device coordinator (spec 003) — ideas only, no code copied
- **JohanBendz Tuya Zigbee apps** — per-device debounce of repeated Tuya reports and scene/onOff button duality observed in user threads
- **Koenkk/zigbee-herdsman-converters** — ZCL transaction-sequence based duplicate detection and per-device debounce options
- **zigpy/zha-device-handlers** — Tuya quirks handling duplicate DP reports and remote press types
- **dresden-elektronik/deconz-rest-plugin** — button event de-duplication across clusters
- **rospogrigio/localtuya** (GPL-3.0, study only) — DP update coalescing behaviour
Our implementation (`lib/coordinator/*`, `data/coordinator-profiles.json`) is original MIT code.

## Upstream thread intelligence (spec 009) — ideas only
- **Johan Bendz** and the reporters of JohanBendz/com.tuya.zigbee #797, #1246, #1284, #964/#1423, #1291/#1214, #1461 — physical interviews and triage of standard-ZCL temperature/RH sensors (exact-pair matching, TS0601 without 0xEF00, unknown battery cells). Our rules: `docs/rules/JOHAN_797_STANDARD_ZCL_TEMP_RH.md`.
- **Johan Bendz** and the reporters of JohanBendz/com.tuya.zigbee #1298, #414, #1486, #1315 (PR #1508) — interviews of HOBEIAN ZG-102ZL / `_TZE200_pay2byax` contact+lux sensors; Koenkk/zigbee-herdsman-converters `hobeian.ts` for the DP layout. Our rules: `docs/rules/JOHAN_1298_CONTACT_LUX.md`.
- **Johan Bendz** and the reporters of JohanBendz/com.tuya.zigbee #1113, #1475, #1008, #925 — physical interviews showing one eWeLink/SNZB-03 identity used by a PIR and a water detector, and the "disambiguate by IAS zoneType" approach. Our rules: `docs/rules/JOHAN_1113_AMBIGUOUS_IAS_IDENTITY.md`.
- **Johan Bendz**, **Mariano Colmenarejo** (SmartThings Edge window-treatment), **KiwiHC16/Abeille**, **kkossev / RamSet** (Hubitat Zemismart blind) and **Koenkk** (zigbee-herdsman-converters) — identification of `_TZ3000_4uuaja4a` as a TS130F curtain module. Our rules: `docs/rules/FP_TZ3000_4UUAJA4A_CURTAIN_MODULE.md`.
- **Johan Bendz** (#473, #1288, #1172, PR #1505), **zigpy/zha**, **u236/homed**, **ioBroker.zigbee** — identification of `_TZ3000_o9f2zqln` (IAS rain), `_TZ3000_p26flek3` (TS0001 relay) and `_TZ3210_iystcadi` (Lidl light bar). Our notes: `docs/rules/JOHAN_GAPS_2026-10-04.md`.
- **Homey community forum** users of T140352 / T26439 — device reports distilled into `data/forum/forum-leads-ssot.json` (links only).
- **Tuya Smart Life app** — inching/pulse relay mode (`device_pulse` avec restauration d'état), random timing anti-cambriolage (notre `PresenceSimulationManager`), countdown timers (notre `device_countdown_off` avec fallback minuteur logiciel), **cycle timing** (notre `device_cycle` ON/OFF ×N avec restauration), power-on behavior
- **Hubitat Mode Manager / SmartThings location modes** — home modes day/evening/night/away (`HomeModeManager`), en version pilotée par l'élévation solaire réelle avec priorité au choix manuel
- **ZCL standard (Zigbee Cluster Library)** — Identify cluster (`light_alert_blink`), LevelControl `moveToLevelWithOnOff` (`light_smooth_dim`) — chaîne de fallback systématique natif → Tuya DP → émulation logicielle (`FeatureFallbackRouter`) couvrant les 431 drivers
- **TinyTuya (jasonacox)** — protocoles 3.1-3.5 (AES-GCM v3.5), scanner UDP ports 6666/6667/6668/7000, modèle de retry de connexion — base de notre WiFi local-first et du pairing automatique 1 clic
- **codetheweb/tuyapi** — client TCP Tuya (sessions, heartbeat, commandes DP)
- **Hubitat Rule Machine** — generic condition/trigger composition inspiration (`ConditionEngine`, `condition_all_met`)
- **openHAB Zigbee binding (EPL-2.0)** — attribute reporting intervals research
- **Jeedom / Home Assistant** — availability and energy dashboard UX patterns

## Community Forks & Contributors (audited 2026-08)
- **packetninja/com.tuya.zigbee** — backlight control methods v5.5.929 (DP15/DP16/DP101-104, countdown DP7-9), Bseed switches — integrated
- **Diddern / onesilop / map1981** — 2026-08 JohanBendz PRs #1439 Wing TS0203, #1437 `_TZ3000_k6fvknrr` dual outlet, #1435 HOBEIAN ZG-305Z; Dooya DP1 command path reimplemented in UnifiedCoverBase (P217)
- **ErnieV/com.tuya.zigbee** — Quoya M515EGBZTN curtain support (position inversion, DP16 upper/lower limits) + Zbeacon TS011F plug energy routing — integrated
- **map1981/com.tuya.zigbee** — Dooya curtain driver exploration
- **onesilop, MalmFredrik, arjanlemmers, MartijnEisses, macmonty, pixelwiese, Robsta86, pkuijpers, bmalkow** — forks audited for device additions
- **gpmachado/com.gpm.homesuite** (GPL-3.0, studied — original reimplementation only) — Zemismart/NovaDigital/Sonoff field behaviour: availability last-seen, rejoin, onUninit teardown, Poll Control skip, settings-over-dump
- **Jocke_Wallen** — Moes TS0044 `_TZ3000_kfu8zapd` remote (forum #2098-2104)
- **blutch32** — HOBEIAN ZG-303Z soil sensor pairing variants (forum #2101)
- **Nigel_Scott** — HOBEIAN ZG-204ZP/ZK presence `_TZE200_ka8l86iu` (forum #2112, issue #382)
- **Joep_Vullings** — Insoma 2-way irrigation valve `_TZE284_fhvpaltk` (forum #2102/#2105, issue #260)
- **FrankP** — TS0042 2-button remote `_TZ3000_tzvbimpq` routing (forum #1689/#1745)
- **thierry_arguimbau** — `_TZE204_dhotiauw` dual energy meter (forum #2115)
- **Tobias-B, Lucas360, Rikjes, tlink, Or36, vikino, Cam, Haadeess, Lachee, Mikko_Vayrynen, Ronald_Bok, xfiler, DominikPL, robertklep** — diagnostic reports that drove crash fixes

## Tooling & Free Data Channels (integrated 2026-08)
- **Panniantong/agent-reach** (MIT) — free agent channel layer; its web channel routes to Jina Reader, RSS channel powers our forum RSS cross-check workflow (`agent-reach.yml`)
- **Jina AI Reader** (r.jina.ai) — keyless free web reader, tier-1 fallback of `lib/scraper/reader-fallback.js`
- **firecrawl/firecrawl-mcp-server** (MIT) — scrape/search; used as budget-capped tier-2 fallback (FIRECRAWL_DAILY_MAX, free tier protected) and keyless MCP endpoint
- **Exa** (via mcporter MCP) — free keyless semantic search channel
- **yt-dlp** — media metadata channel (Agent Reach backend)
- **homey-api / Athom Apps API** — build/crash statistics, delegation token flow (mapped in `docs/HOMEY_DEV_PORTAL_MAP.md`)
- **Kimi Code CLI + WebBridge** — autonomous CI repair, portal cartography, forum operations

## Tuya Wi-Fi Local-First (Smart Life / white-label, 2026-10)
Sources actually used or consulted for the Wi-Fi local stack (`lib/tuya-local/`):
- **[tuya/tuya-device-sharing-sdk](https://github.com/tuya/tuya-device-sharing-sdk)** (MIT, © 2023 Tuya) — *ported* to JavaScript in `TuyaSharingClient.js`: Smart Life "User Code + QR" login, request signing and AES-GCM envelope. Lets users fetch local keys without a Tuya IoT developer account.
- **[make-all/tuya-local](https://github.com/make-all/tuya-local)** (MIT, Jason Rumney and contributors) — consulted: QR flow (`cloud.py`, `config_flow.py`), public client id / `haauthorize` schema, QR payload format, device fields.
- **[Home Assistant core – Tuya integration](https://github.com/home-assistant/core/tree/dev/homeassistant/components/tuya)** (Apache-2.0) — consulted: sharing client id / schema constants (facts only).
- **[codetheweb/tuyapi](https://github.com/codetheweb/tuyapi)** (MIT) — runtime dependency: LAN protocol 3.1–3.5 including 3.4/3.5 session-key negotiation.
- **[jasonacox/tinytuya](https://github.com/jasonacox/tinytuya)** (MIT) — consulted: 6699 frame layout and optional return code (`message_helper.py`), UDP discovery keys, scanner/wizard behaviour.
- **[tuya/tuya-connector-nodejs](https://github.com/tuya/tuya-connector-nodejs)** — consulted for the OpenAPI signature string format (empty optional-headers line, sorted query). No code copied.
- **[andiwirz/com.tuyalocal](https://github.com/andiwirz/com.tuyalocal)** (MIT) — Homey Tuya-local app: frequency-first protocol order, command gap, stale-data watchdog patterns (reimplemented earlier, credited in code).
- **[Drenso/com.tuya2](https://github.com/Drenso/com.tuya2)**, **[jurgenheine/com.tuya.cloud](https://github.com/jurgenheine/com.tuya.cloud)** (MIT), **[rebtor/nl.rebtor.tuya](https://github.com/rebtor/nl.rebtor.tuya)** (MIT) — earlier Homey Tuya apps whose cloud/LAN patterns informed the original design.
- **Wi-Fi repair UX (P3072, 2026-10-27) — ideas only, written in our own words, no code copied:** [make-all/tuya-local](https://github.com/make-all/tuya-local) (MIT), [rospogrigio/localtuya](https://github.com/rospogrigio/localtuya) / [xZetsubou/hass-localtuya](https://github.com/xZetsubou/hass-localtuya) (GPL-3.0, study only) and [jasonacox/tinytuya](https://github.com/jasonacox/tinytuya) (MIT) all treat a DHCP IP change as normal: follow the device's UDP broadcast, keep one IP per device, and show reachability before asking for a new key. Our versions: `lib/tuya-local/LocalIpSettings.js`, `lib/wifi/LanRebindRouter.js`, `lib/tuya-local/LanRepairStatus.js` (see `docs/knowledge/P3072_WIFI_UX.md`).

## IR blasters — Zigbee Zosung + Tuya Wi-Fi (P3063, 2026-10-26)
Own implementation in `lib/ir/ZosungIRProtocol.js`, `lib/ir/TuyaWifiIRProtocol.js` and `lib/ir/IRFormatConverter.js`; no upstream code copied:
- **[Koenkk/zigbee-herdsman-converters](https://github.com/Koenkk/zigbee-herdsman-converters)** (MIT, Koen Kanters and the `zosung.ts` contributors) — consulted: 0xED00 frame layout (msgpart + msgpartcrc), chunk sizes, Code00 resend, ZG-IR01 seq 0, `{key_num,key1}` message.
- **[mildsunrise — Tuya IR code format notes](https://gist.github.com/mildsunrise/1d576669b63a260d2cff35fda63ec0b5)** — consulted: FastLZ-style block layout of Tuya `key_code`.
- **[jbouwh — Home Assistant Tuya IR encoder gist](https://gist.github.com/jbouwh)** — consulted: literal-only encoding is the safe choice for cheap Tuya IR chips.
- **[jasonacox/tinytuya](https://github.com/jasonacox/tinytuya)** (MIT) — consulted: `IRRemoteControlDevice` control types 1/2, `send_ir` / `study` / `study_exit` / `study_key`, learned code on DP202 or DP2.
- **[make-all/tuya-local](https://github.com/make-all/tuya-local)** (MIT, Jason Rumney and contributors) — consulted: single-DP `send_ir` JSON with `"1"` raw prefix, multi-DP send, split of long gaps.

## Reports and automation (P3069, 2026-10-26) — ideas only, written in our own words
- **GitHub** — the job summary feature (`$GITHUB_STEP_SUMMARY`) and its docs gave us the "one short page per run" format.
- **The Renovate and Dependabot maintainers** — their PR bodies taught us to fold long detail into collapsed blocks and keep the top short.
- **rhysd (actionlint)** — static checks for every workflow; our hygiene and report ratchets follow the same "fail only on new debt" spirit.
- **The Homey Community forum moderators and the Zigbee2MQTT / ZHA trackers** — their habit of linking to a post instead of pasting it is
  the rule our reports now follow: ID, link, author, then a summary in our words (`scripts/lib/report-writer.js`).
- **GitHub Actions docs (concurrency groups)** — the one-running, one-waiting rule behind our Node 22 setting: pushes let the running job finish, PRs still cancel (`docs/knowledge/CI_CONCURRENCY.md`); now also on the seven push-triggered checks listed there.
- **Athom Homey SDK docs, "Zigbee firmware updates" page** (Athom docs team, https://apps.developer.homey.app/wireless/zigbee/zigbee-firmware-updates) — the line about firmware files being stored apart from the app and fetched only when an update starts is now told in our own words in `docs/knowledge/OTA_AUDIT_P2932.md`, not pasted.
- **Community commenters on our issues** (john1v, pemikalsen-sudo, Ssssneak, late4marshmellow, dalobalo and others) — `reports/COMMUNITY-INTELLIGENCE.md` no longer reproduces their comments; each entry keeps the author, the issue link and a one-line topic, so the original stays where they wrote it. Thank you for the reports.
- No code was copied from these projects; the helper and the ratchet (`scripts/ci/report-structure-ratchet.js`) are our own.

## Licenses (SPDX)

| Project | License | Usage |
|---------|---------|-------|
| JohanBendz/com.tuya.zigbee (upstream) | **MIT** | Origine du fork — attribution dans NOTICE |
| Koenkk/zigbee-herdsman-converters (Z2M) | **MIT** | Données factuelles DPs/empreintes |
| zigpy/zha-device-handlers (ZHA) | **Apache-2.0** | Quirks Tuya, IDs corrompus documentés |
| dresden-elektronik/deconz-rest-plugin | **BSD-3-Clause** | DDF, Tuya Data Point Protocol |
| jasonacox/tinytuya | **MIT** | Protocole local Tuya (WiFi) |
| codetheweb/tuyapi | **MIT** | API locale Tuya |
| make-all/tuya-local | **MIT** | Mappings DP (YAML) |
| tuya/tuya-device-sharing-sdk | **MIT** | Porté en JS (`TuyaSharingClient.js`) — login QR Smart Life |
| home-assistant/core (Tuya) | **Apache-2.0** | Constantes client id / schéma (faits) |
| andiwirz/com.tuyalocal | **MIT** | Patterns Homey Tuya local (réimplémentés) |
| jurgenheine/com.tuya.cloud | **MIT** | Patterns cloud Homey |
| rebtor/nl.rebtor.tuya | **MIT** | Patterns tuyapi Homey |
| blakadder/zigbee | **MIT** | Base de données d'empreintes |
| athombv (SDK3, zigbeedriver, zigbee-clusters) | **MIT** | Framework |
| OpenHAB Zigbee binding | **EPL-2.0** | Recherche intervalles de reporting |
| SmartThings Edge drivers | **Apache-2.0** | Patterns Tuya DP |
| gpmachado/com.gpm.homesuite | **GPL-3.0** | Study only — no code copied; behaviour reimplemented under MIT |
| tesseract-ocr/tesseract | **Apache-2.0** | CI only — OCR local et gratuit des captures d'écran (boucle de feedback), installé sur le runner, non embarqué |
| ImageMagick | **ImageMagick License** | CI only — prétraitement des images avant OCR (niveaux de gris, agrandissement, seuil), non embarqué |
| arendst/Tasmota | **GPL-3.0** | CI only — recherche d'issues publiques pour le jeu de données de quirks firmware ; aucun code repris |
| ioBroker/ioBroker.zigbee | **MIT** | CI only — recherche d'issues publiques (quirks firmware) ; aucun code repris |

> Voir **NOTICE** à la racine pour les attributions complètes. Les empreintes,
> numéros de datapoint et comportements protocolaires sont des données
> factuelles d'interopérabilité (non copyrightables) ; tout le code original
> de ce dépôt est sous **MIT** (voir LICENSE).

## Inspiration
- All community members who reported issues and requested devices
- The Homey community forum contributors
- Home Assistant, Hubitat, SmartThings, openHAB and Jeedom community forums — public device-behaviour reports read (capped, read-only) to build the firmware-quirk dataset
- Drenso and Athom (athombv) — public Homey app CI workflows (validate / publish / version actions) studied as workflow patterns
- Reddit r/homey, r/zigbee, r/homeautomation communities
- GitHub issue reporters who help improve device compatibility
- The open-source Zigbee community for protocol documentation and device databases
- romasku/tuya-zigbee-switch device_db, pvvx (Zbeacon TS0001 notes), lsroka76/Z2S_Library supported-devices list — couple evidence (2026-10-04)

- **Athom B.V. — Matter Bridge app** (github.com/athombv/com.athom.matter-bridge, GPL-3.0): class/capability to Matter device-type mapping summarised in our own words in `data/matter-bridge-mapping.json` (read 2026-10-04, commit 045787d). No code copied.
- Source registry (W10, 2026-10-04): Koen Kanters + zigbee2mqtt / zigbee-herdsman-converters contributors, zigpy (ZHA, zha-device-handlers), dresden elektronik (deCONZ), rospogrigio + xZetsubou (localtuya), Jason Rumney (tuya-local), blakadder, Mariano (SmartThings Edge), Krassimir Kossev (Hubitat), KiwiHC16 (Jeedom Abeille), u236 (HOMEd), Athom B.V., Johan Bendz and fork authors, Homey Community Forum, Tuya developer docs — identifiers and our own summaries only, see data/sources/registry.json.
- X scan 2026-10-04 (our own summaries in `docs/knowledge/FIELD_NOTES_2026-10_X_SCAN.md`, no code copied): Somfy developer docs (Somfy-Developer/Somfy-TaHoma-Developer-Mode), Mick Vleeshouwer / iMicknl (pyoverkiz, MIT) and the Home Assistant Overkiz integration (Apache-2.0) — "My" position and cover behaviour ideas; LiXee / Akila, faire-ca-soi-meme.fr (ZLinky_TIC, LiXee-Box v2.22 notes); devbis (z03mmc); Gonzague Dambricourt; Jasmine Mannan (XDA); J. Stabentheiner; Home Assistant blog (ubisys); zhaoxuya520 (reverse-skill routing pattern → `skills/ROUTING.md`); home-assistant-libs/tuya-device-handlers (MIT, source registry); the "everything-claude-code" (ECC) Claude Code setup as described by @S0N_IA (agent-config scan idea -> P2800 gate, own implementation).
- Covers P2801/P2802 (2026-10-04, own implementation, no code copied): paced execution queue, closure+orientation step and Identify ideas from Mick Vleeshouwer / iMicknl (pyoverkiz, MIT) and the Home Assistant Overkiz integration (Apache-2.0); ZCL Identify 0x0003 / Window Covering 0x0102 (Connectivity Standards Alliance spec) — `lib/covers/CoverCommandQueue.js`, `lib/covers/CoverTahomaActions.js`.
- Covers P3030 (2026-10-25, own implementation, no code copied): Adrian Rockall (AdyRock/com.somfy.tahoma, Homey community topic 35206, all 2792 posts read 25/10/2026) — "Is moving" condition and per-device "command complete" trigger with a success flag (#511, #761, #824, #2157), newer command replaces an unfinished one, duplicate suppression and retry of failed commands (v2.1.69, v4.0.68 notes, #826), delayed final position read after a move (#1079-#1087), string/number value mismatch (#244, #258, #1626) -> `lib/covers/CoverMotionTracker.js`, `lib/covers/CoverCommandQueue.js`, `lib/covers/normalizeDpScalar.js`.
- #108 placements (2026-10-04, own implementation): couples and DP layouts from zigbee-herdsman-converters by Koen Kanters and contributors (tuya.ts TOQCB2-80 / TS0601_6gang_switch / GX03, lonsonho.ts TS130F, moes.ts ADCBZI01, rtx.ts ZVG1); 8-byte phase struct layout from valueConverter.phaseVariant2WithPhase (Z2M #18603, #32995) -> `lib/tuya/TuyaPhaseStruct.js`.
- #109/#108 exact-pair drivers and long-name couples (2026-10-04, own implementation): DP layouts and couples from zigbee-herdsman-converters by Koen Kanters and contributors (tuya.ts presence switches _TZE28C1000000_jlbsptkl/jaunkx9g/usmqzgdm and Semicom _TZE200_rgeapp2c, nous.ts D4Z, weten.ts PCI E, zemismart.ts, moes.ts, saswell.ts, onenuo.ts, neo.ts, avatto.ts, manhot.ts, iotperfect.ts) -> drivers/switch_presence_tuya, drivers/panel_switch_cover_tuya, lib/devices/TuyaDpProfileDevice.js, lib/tuya/TuyaDpProfileCodec.js.
- #100 source proposals (2026-10-04, own implementation): ZY-N1 sound sensor DP layout from zigbee-herdsman-converters tuya.ts (Koen Kanters and contributors) and zha-device-handlers PR #5386 (zigpy) -> drivers/sound_sensor_tuya; RGBCW floodlight DPs from Z2M issue #32498 (tigum27, andrei-lazarov); TS0002 startUpOnOff finding from Z2M issue #32627 (lucasbissaro); Zosung TS1201 couple from zha-device-handlers PR #5282.
- Gledopto GL-SPI-206P exact driver and safe-math repairs (2026-10-04, own implementation): DP layout and DP61 colour frame from zigbee-herdsman-converters gledopto.ts (Koen Kanters and contributors) -> drivers/led_controller_spi_tuya, lib/tuya/SpiPixelColour.js.
- PCr2-1 (2026-10-04): SONOFF MINI-ZBRBS (sonoff.ts) and HEIMAN RC-EF-3.0 / HM1RC-2-E (heiman.ts) identifiers from zigbee-herdsman-converters (Koen Kanters and contributors).
- Spec 010 T0 notes (2026-10-04, own words): Homey Apps SDK v3 docs (Athom: app lifecycle, Node.js runtime table, Node 22 upgrade guide), athombv/node-homey-zigbeedriver and athombv/node-zigbee-clusters (Athom), JohanBendz/com.tuya.zigbee (Johan Bendz) -> docs/rules/R22_ARCHITECTURE_SOURCES.md.
- zigbee library backports (2026-10-04, own implementation): Time cluster 0x000A attribute ids from athombv/node-zigbee-clusters #216/#217 (Athom); finite transition duration and dim read-back grace from athombv/node-homey-zigbeedriver 2.2.18 (Athom) -> lib/zigbee/ZigbeeLibBackports.js.
- PCr2-2/PCr2-4 interview facts (2026-10-04): normalized from device interviews shared on the Homey community forum and GitHub issues (JohanBendz/com.tuya.zigbee and dlnraja/com.tuya.zigbee reporters); cluster names for 0xFC00 (Philips) from zigbee-herdsman-converters (Koen Kanters and contributors) -> docs/data/interviews, data/native-matrix.json.
- PCr2 #43 Johan PR evaluation (2026-10-04): OWON THS317-ET-TY couple from JohanBendz/com.tuya.zigbee issue #1007 interview and PR #1230 (Jerome) -> drivers/temphumidsensor.
- P2810 placements (2026-10-10, identifiers and interviews only, own wording): JohanBendz/com.tuya.zigbee issues #15, #163, #211, #614, #830, #1013, #1030/#1145, #1035, #1165, #1265/#1366, #1330, #1484 (Johan Bendz and the reporters of those threads, incl. Batch 62/96/105/107 triage); zigbee-herdsman-converters by Koen Kanters and contributors (lonsonho.ts, tuya.ts, hobeian.ts, zemismart.ts); blakadder (Lonsonho QS-Zigbee-D02-TRIAC-2C-LN page); Mariano (Mariano-Github/Edge-Drivers-Beta fingerprints, Livarno TS0505A). Free forum screenshot OCR uses tesseract-ocr (Apache-2.0) as an external tool.
- Daily resume 2026-10-11 (own implementation and wording): forum topic 140352 reports by VicHY (#2246–#2255, MTG075 Flow lag), Peter (#2238/#2239, Smartbutton History), EdP (#2258, AOYAN AY-303Z soil) and Michaelp (#2253, ZG253 TRV) — https://community.homey.app/t/140352; identifiers and DP layouts cross-checked in zigbee-herdsman-converters `hobeian.ts` (CS-201Z with AOYAN AY-303Z/AY-302Z white-labels, ZG-106Z) and `tuya.ts` (TS0222 light sensor, TS0601_thermostat_3) by Koen Kanters and contributors.
- Issue #560 TRV06 (2026-10-18, own wording): artisare (GitHub issue dlnraja/com.tuya.zigbee#560) and zigbee-herdsman-converters tuya.ts TS0601_thermostat_3 (Koen Kanters and contributors); Koenkk/zigbee2mqtt#25093 comments by MichaelHainbach and Jonstep101010 (DP35 fault bitmap, DP102 unconfirmed). bjawzodf/TY0201: Wilhelm Dall (Homey app suggestion 2026-10-17) and Z2M WSD500A. No code copied.
- P2868/P2869 (2026-10-19, own implementation and wording): ZG-101ZD knob behaviour from zigbee-herdsman-converters hobeian.ts and lib/tuya.ts (Koen Kanters and contributors), zha-device-handlers ts004f.py (zigpy), deCONZ smart-knob DDF (dresden elektronik), JohanBendz/com.tuya.zigbee smart_knob_switch (Johan Bendz); RSH-HS03 `_TZE284_9ern5sfh` from Z2M tuya.ts, zigbee-herdsman-converters #10167 (r-e-t-e-p), JohanBendz #1328 (AGabriel) and forum 140352 #2263 (Kizabgd).
- P2870/P2871 (2026-10-19, own implementation and wording): BoundCluster dispatch behaviour from athombv/node-zigbee-clusters (Athom); ERS-10TZBVK-AA / `_TZ3000_4fjiwweb` knob identity from zigbee-herdsman-converters tuya.ts (Koen Kanters and contributors), zha-device-handlers ts004f.py (zigpy) and the deCONZ smart-knob DDF (dresden elektronik).

- P2890 (2026-10-19): the 6-button Tuya scene remote `_TZ3000_nrfkrgf4` / TS0046 was identified thanks to the Zigbee2MQTT project (generic TS0046 six-button definition with single/double/hold per button) and the deCONZ project (a dedicated device file and button map for this exact maker: buttons on endpoints 1 to 6, press type carried by the Tuya OnOff command). Requested by a Homey Pro 2023 user.
- P2910 (2026-10-20, own implementation and wording): `_TZ3000_rco1yzb1` click behaviour from JohanBendz/com.tuya.zigbee #423/#424 (reporters RogerGorissen, Tanjis, fransjvos; maintainer Johan Bendz, Batch 89b) and Zigbee2MQTT `lidl.ts` HG08164 (Koen Kanters and contributors); Flow argument lookup from the Homey Apps SDK v3 docs (Athom). Couples: LoraTap SS6400ZB and Lidl HG06338 from zigbee-herdsman-converters `tuya.ts`/`lidl.ts`; `_TZ3000_5ftkaulg` from zigpy/zha-device-handlers#2090 (amiraizat124) and u236/homed-service-zigbee#146 (yaadyaad); Alecto SMARTCOA10 interview on JohanBendz #977 (Maxjong30201); Nedis CO sensor from the SmartThings Edge driver by Mariano_Colmenarejo (report by Ville_Rahkonen); Lidl strip symptom on JohanBendz #127 (jellelambers, martijnpieters). No code copied.
- P2919 (2026-10-21, own wording): exact native couples read from Homey interviews and device settings posted on JohanBendz/com.tuya.zigbee #190 (HEIMAN SmokeSensor-EF-3.0, interview relayed by Johan Bendz from forum 26439#2296), #284 (Samotech SM311, HenryMD18) and #422 (eWeLight ZB-DL01, keesverruijt). No code copied.
- HEIMAN HM1RC-2-E keyfob (`HEIMAN` / `RC-EF-3.0`, driver `heiman_keyfob`): ids and button meaning from Koenkk/zigbee-herdsman-converters PR #2182 by arnaud-gouder (https://github.com/Koenkk/zigbee-herdsman-converters/pull/2182) and dresden-elektronik/deconz-rest-plugin #3828. Own implementation (P2921).
- HEIMAN HS2WD-E siren (`HEIMAN`/`Heiman` x `WarningDevice`/`WarningDevice-EF-3.0`, driver `heiman_siren`): genBasic dump in Koenkk/zigbee-herdsman-converters #3429 (https://github.com/Koenkk/zigbee-herdsman-converters/issues/3429), Koenkk/zigbee2mqtt #1416, deCONZ DDF #6400 by BabaIsYou (https://github.com/dresden-elektronik/deconz-rest-plugin/pull/6400). Own implementation (P2921).
- Aqara RTCGQ13LM precision motion sensor (`LUMI` / `lumi.motion.agl04`, driver `motion_sensor`, native Occupancy Sensing 0x0406): interview from dlnraja/com.tuya.zigbee issue #25; model name and cluster use from Koenkk/zigbee-herdsman-converters `src/devices/lumi.ts` (RTCGQ13LM). Own implementation (P2929).
- P2922 (2026-10-21, own wording): `3A Smart Home DE` / `LXN59-2S7LX1.0` (Zemismart ZW-EU-02) from the Homey interview on JohanBendz/com.tuya.zigbee #575, model confirmed by Zigbee2MQTT (Koenkk/zigbee2mqtt #3905, lostpoint-ru); `iHorn` / `LH02121` motion sensor from the Homey interview on forum 26439#4851. No code copied.

- P2923 (2026-10-21): `_TZE2841000000_8se38w3c` / TS0601 (TZ-ZT01_GA4 long-name variant) added to climate_sensor; DP3 battery_state enum mapping shared with ZT08. Reported by okidoki, Homey Community topic 140352 post #2265 (https://community.homey.app/t/140352/2265); DP layout from Zigbee2MQTT tuya.ts TZ-ZT01_GA4 (Koenkk).

## P2930 — WiFi/local and protocol versions (2026-10-21)
- **make-all/tuya-local** (Jason Rumney, MIT, commit 95300d05ac) — product_id → DP facts extracted by our own script; source config recorded per product.
- **jasonacox/tinytuya** (MIT) — protocol 3.1–3.5 and the 3.22 alias, wizard export format.
- **codetheweb/tuyapi** (MIT) — CONTROL_NEW / DP_QUERY_NEW for 3.4+.
- **rospogrigio/localtuya, xZetsubou/hass-localtuya** (GPL-3.0, study only) — single-client limit, sub-device cid.
- **PlusPlus-ua/ha_tuya_ble** — BLE protocol versions (documentation only).
- **Koenkk/zigbee-herdsman-converters** (MIT) — EF00 command ids, appVersion layout.
Details: `docs/knowledge/WIFI_LOCAL_PROTOCOLS_P2930.md`.
- **zigpy/zha-device-handlers** (Apache-2.0) and **dresden-elektronik/deconz-rest-plugin** (BSD-3) — Tuya time answer / MCU version behaviour (P2933, own code).

- P2932 (2026-10-21) OTA audit, own implementation: Tuya EF00 MCU OTA frame layout from Koenkk/zigbee-herdsman `src/zspec/zcl/definition/cluster.ts` (manuSpecificTuya 0x12-0x15); image index and SHA512 from Koenkk/zigbee-OTA `index.json`; provider and validation order compared with zigpy `zigpy/ota/providers.py`; Tuya MCU serial OTA 0x0A/0x0B from Tuya developer docs (MCU standard protocol, "MCU OTA Update"); Homey SDK "Zigbee Firmware Updates" for the server role and manifest rules.
- Aqara DJT11LM vibration sensor (`LUMI` / `lumi.vibration.aq1`, driver `vibration_sensor`, native Closures 0x0101 attributes 0x0055 event, 0x0503 angle, 0x0505 strength): attribute meaning from Koenkk/zigbee-herdsman-converters `src/lib/lumi.ts` (`lumi_vibration_analog`, DJT11LM in `src/devices/lumi.ts`) and the ZHA xiaomi vibration quirk (zigpy/zha-device-handlers). Optional overlay, own implementation (P2934).

- P2951 (2026-10-21) `_TZ3000_dfgbtub0` / `TS0042` → `button_wireless_2` (2-button wireless): identity from Koenkk/zigbee-herdsman-converters `src/devices/tuya.ts` (TS0042 whitelabel Marmitek Push_LO), blakadder/zigbee Eardatek ESW-0ZAC-EU, JohanBendz/com.tuya.zigbee `wall_remote_2_gang`. The sacred `_TZ3000_dfgbtub0`/TS0044 couple stays on `button_wireless_4` (forum 156967#12); TS0042 was matched by no driver before. Fingerprints only; own code.

## Knowledge base sources (P-KB)
Facts (ids, DP numbers, model names) indexed with commit-pinned links; no prose or code copied. Full list and licences: `docs/knowledge/KB_SOURCES.md`.
- **Koenkk** — zigbee2mqtt.io docs (GPL-3.0), zigbee-herdsman-converters (MIT), zigbee-OTA index
- **zigpy** — zha-device-handlers (Apache-2.0); **dresden-elektronik** — deCONZ DDFs (BSD-3-Clause); **blakadder** — zigbee templates (MIT)
- **make-all** — tuya-local (MIT); **jasonacox** — tinytuya (MIT); **rospogrigio** — localtuya (GPL-3.0); **JohanBendz** — com.tuya.zigbee (GPL-3.0)
- **Athom** — node-zigbee-clusters, Homey Apps SDK docs; **Tuya** — developer docs (MCU/Zigbee serial protocol)
- P2958 (2026-10-21): dedicated drivers for Z2M padded fingerprints AOYAN AY204T / AY222Z and BlitzWolf BW-IS9 `_TZ3000_eit7p838 ` (Koenkk/zigbee-herdsman-converters: hobeian.ts, tuya.ts PR #12488 by zyjsmile857, blitzwolf.ts).
- P2970 (2026-10-24) Beca BAC-006AZB fan-coil thermostat (`_TZE204_dzuqwsyg` / `TS0601`, sibling `_TZE200_dzuqwsyg`) moved to `wall_thermostat` with a BAC-002 DP profile (DP16 setpoint in whole °C, DP4 preset, DP101 schedule blob): reported by Umberto Maffii (Homey app store suggestion); DP meanings from Koenkk/zigbee-herdsman-converters `src/devices/tuya.ts` (BAC-002-ALZB, whitelabel Beca BAC-003) and Koenkk/zigbee2mqtt discussion #25308 (BAC-006AZB identity). Own code.
- P2971 (2026-10-24) Issue #560 TRV06 `_TZE200_rxq4iti9` "No active query method available" / "0/12 queries sent": diag by artisare (GitHub issue dlnraja/com.tuya.zigbee#560). Single query-all Tuya 0x03 dataQuery fallback (empty payload per Tuya MCU serial protocol and zigbee-herdsman `manuSpecificTuya.dataQuery`), never sent after a sleepy skip. Own code.
- P3045 (2026-10-25) Issue #560 TRV06 `_TZE200_rxq4iti9`: artisare (GitHub issue dlnraja/com.tuya.zigbee#560) kept testing every build and reported the humidity tile that would not go away, the whole-degree readings and the missing battery value. Proof that this valve has no humidity sensor and only a low-battery flag: zigbee-herdsman-converters TS0601_thermostat_3 (Koen Kanters and contributors) and Koenkk/zigbee2mqtt discussion #24659 participants (whole-degree firmware). Own code and wording, nothing copied.
- P3051 (2026-10-25) Issue #576 BSEED TS0601 curtain switch `_TZE200_yenbr4om` (siblings `_TZE200_bdblidq3`, `_TZE204_bdblidq3`): thank you **migueleap** (GitHub issue dlnraja/com.tuya.zigbee#576) for the report. DP layout (DP1 state, DP2 position, DP3 arrived position, DP5/DP7 config, DP105 motor speed) from Koenkk/zigbee-herdsman-converters `src/devices/bseed.ts` (BSEED_TS0601_cover) and zigpy/zha-device-handlers `zhaquirks/tuya/ts0601_cover.py`; `_TZE204_ogkdpgy2` CO2 optional DP18 temperature struct / DP19 humidity from zigpy/zha-device-handlers `zhaquirks/tuya/tuya_co.py`. Facts only, code rewritten.
- P2972 (2026-10-24) payload normalizer (COBS per Cheshire & Baker, "Consistent Overhead Byte Stuffing", IEEE/ACM ToN 1999; hex/base64/length-prefixed/BE-LE) and rain DP decoder: RB-SRAIN01 DP layout from Koenkk/zigbee-herdsman-converters `src/devices/tuya.ts`; legacy TS0601 layout from issue #326. Own code.
- P3010 (2026-10-24) Zigbee2MQTT Sep–Oct 2026 upstream couples, additive (Koenkk/zigbee-herdsman-converters): `_TZE200_gt1gge3x` rain_sensor (PR #13340, jomders), `_TZE284_uqzwwjas`/`_TZE284_zeeqkb0p` smoke_sensor2 + DP15 battery % (avatto ZSD20, PR #13187, alblcl), `_TZ3000_w5s3mbyn` switch_1gang, `_TZ3210_mldzab8w` curtain_motor, `_TZ3008_avdpejns` smartplug; Mowe MW811D/MW794Z/MW815R (PRs #13132/#13209/#13130), ECODO PSL-24V/GU10/ECD-48V-MGT (PRs #13179/#13170/#13172) by Kenny Roger, Ledisons LDN22 (PR #13141, TheLexus), LUUMR 10010339 (PR #13243, Kai Stian Olstad). rain_sensor layout matcher fixed (substring containsCI instead of array includesCI) so the ZG-223Z and RB-SRAIN01 layouts are reachable.
- P3011/P3012 (2026-10-24): includesCI(array,value) misuse fixed at 6 sites (Z2M hobeian.ts ZG-102ZL DP1 inverse; tuya.ts TS0601_soil DP5 raw); `_TZE28C1000000_rzdkn5rx` re-claimed on boiler_switch_energy (Koenkk/zigbee-herdsman-converters #13211, Andy, 2026-09-16; Homey forum t/26439/5484, Michael_Hadjicosta).
- P3013 (2026-10-24): dedicated master-only drivers rewritten from Koenkk/zigbee-herdsman-converters `src/devices/tuya.ts` — `sauna_thermostat_ae5503` (`_TZE204_eaasry7v`, AE-5503-S-H-ZIGBEE, PR #13225 by Vadim Surpin, 2026-09-18), `siren_moes_mg_bjq002` (`_TZE20C_tjz9ad5g`, Moes MG-BJQ002, PR #13201 by Paap, 2026-09-16), `switch_wall_6gang_metering` (`_TZE284_hbxadcl0`, TS0601_6gang_switch_2, PR #13085 by hammondses, 2026-09-04), `valve_novato_zpv01` (`_TZE284_zm8zpwas`, Novato ZPV-01, tuya.ts ZPV-01 definition).
- P3014 (2026-10-24) one driver per couple (owner decision): TS0049 `_TZ3000_cjfmu5he`/`_TZ3000_mq4wujmp` (Moes ZWV-YC, Koenkk/zigbee-herdsman-converters `src/devices/moes.ts`) and `_TZ3000_kz1anoi8` (Haozee HZ-WT02, `src/devices/tuya.ts`) kept on water_valve_garden, removed from smart_garden_irrigation_control; TS0601 `_TZE284_la2c2uo9` kept on wall_dimmer_tuya with its Z2M TS0601 1-gang dimmer family (`_TZE200_la2c2uo9` Moes MS-105Z, `src/devices/tuya.ts`), removed from dimmer_1_gang_tuya. Recorded in curated-couple-removals + couple pins; paired devices keep their driver.
- P3015 (2026-10-24) caseless kept drivers + runtime catalogue fix: TS0049 Moes ZWV-YC `_TZ3000_cjfmu5he`/`_TZ3000_mq4wujmp`/`_TZ3000_5af5r192`/`_TZ3000_ogjpfoyn` (Koenkk/zigbee-herdsman-converters `src/devices/moes.ts`, commit eb823146c7) and Haozee HZ-WT02 `_TZ3000_kz1anoi8` (`src/devices/tuya.ts`) on water_valve_garden with canonical/lower/UPPER forms; `lib/tuya/fingerprints.json` entries that pointed these ids to motion_sensor/climate_sensor/device_plug_smart (and `_TZE200_la2c2uo9` to dimmer_wall_1gang) now point to the compose owner, shards rebuilt; `TuyaNormalizer.normalize` strips zero-width chars. Novato ZPV-01 (`src/devices/tuya.ts` "Battery powered smart valve": `_TZE204_dsagrkvg`, `_TZE284_zm8zpwas`, `_TZE284_sdvbnmj5`) grouped on valve_novato_zpv01, battery 4 x AA from the Novato catalogue (novato.com.tr) and the ZHA quirk shared by SimoHDK on community.home-assistant.io (thread 892596). me167 dpProfile condition now reads the manufacturer (AR331Pro layout from `src/devices/tuya.ts`). `_TZ3000_5af5r192` forms removed from climate_sensor (no hardware source; Z2M lists it only as the Moes TS0049 valve), curated so bots do not re-add.
- P3017 (2026-10-24) unknown commands + method chains: decoders from JohanBendz/com.tuya.zigbee#619 (`_TZ3210_cwamkvua` TS0202 DP101 press / DP102 dark-bright), private Tuya commands from Koenkk/zigbee-herdsman-converters `src/lib/tuya.ts` (eb823146c7) and zigpy/zha-device-handlers tuya quirks (1d6598c32a, TSN dedup, rotate stop); DP-name catalogue from Z2M tuyaDatapoints; fallback/polling/magic/time-sync methods studied in deCONZ, tuya-local, localtuya, tinytuya, kkossev Hubitat (ideas only), SmartThings Edge, ioBroker, Domoticz, Tasmota, ESPHome — all rewritten (docs/knowledge/KB/CROSS_APP_METHODS.md).
- P3019 (2026-10-24) coverage review: ZS-SF00 decoder rewritten from Koenkk/zigbee-herdsman-converters `src/devices/tuya.ts` (@1c90116); sinxpbrl DP2/DP6/DP7/DP101/DP102 from the Tuya schema posted by YoshiWalsh in Koenkk/zigbee2mqtt#31445 (reported by wiwill61) and JohanBendz/com.tuya.zigbee#1504 (martinheie-ui); HZ-WT02 TS0049 countdown (0xE001 cmd 0xFE) from Z2M tuya.ts; TS004F 0x8004 mode from Z2M and ZHA `TuyaSmartRemoteOnOffCluster`; cluster 0x1888 checked against ZHA `TuyaZB1888Cluster` (PR #2592, TheJulianJES). All rewritten.
- P3018 (2026-10-24) every DP + every endpoint: per-couple DP names and value converters harvested from Koenkk/zigbee-herdsman-converters `src/devices/*.ts` tuyaDatapoints (MIT, commit cff1de4731; facts only — tokens like div:10 / trueFalse / lookup, decoder rewritten in lib/zigbee/DpCatalogDecoder.js); ZHA quirk DP numbers from zigpy/zha-device-handlers (Apache-2.0, 1d6598c32a); ZCL scaling (measuredValue/100, lux = 10^((v-1)/10000)) from the ZCL specification. air_purifier_soil DP5 ÷10 per Z2M TS0601_soil. Own code (docs/knowledge/KB/DP_ENDPOINT_COVERAGE.md).

## GitHub issue reporters (P3020, 2026-10-24)

Reporters of dlnraja/com.tuya.zigbee issues not credited elsewhere in this file. Their reports (logs, fingerprints, symptoms) fed fixes and locks; issue numbers listed for traceability.

- @askseb — #30, #31
- @avanderwulp — #417
- @azkysmarthome — #126
- @bartagergely — #94
- @clementloridan — #198
- @cristianoisaac — #168, #169, #206
- @csmobiel — #101
- @dalobalo — #161, #162
- @DaPicardos — #328, #355, #360, #363, #367, #371, #378, #383, #388
- @DAVID9SE — #121
- @denis-papin — #571
- @Didiervu91 — #75
- @djfry134 — #92
- @Domingoso — #135, #275
- @draqlek — #554
- @DVMasters — #98
- @edwinvdp — #570
- @elgato7 — #117, #122
- @Ernst02507 — #113
- @eskilask-maker — #89, #107, #109
- @fcarrozzo — #99
- @finnamu — #513, #516
- @ftrueck — #338
- @gfi63 — #26, #27, #33, #108
- @gore- — #35
- @GXA064 — #25
- @Haellos07 — #77
- @HiepSVG — #547, #550
- @JeffreyOtten1234 — #95
- @jocke-sve-62 — #76
- @john1v — #188, #193, #194
- @johnx1971 — #165
- @kikosenra — #546
- @kircuvaloglu — #34
- @kodalissri — #28, #29, #32
- @kringloper — #324
- @l-i-n-k — #24
- @laborhexe0210 — #37
- @Lalla80111 — #114, #115, #124, #137, #314, #316, #333, #506, #559
- @late4marshmellow — #163, #164
- @luuk0412-wq — #23
- @MarceloSilvaLeite — #19, #20, #21, #536
- @migueleap — #540, #541, #542, #543, #544, #545, #551, #552, #553
- @MitchV94 — #129
- @mjolink — #96
- @Necka44 — #93
- @neeerd — #549
- @Nespouique — #531
- @NoroddH — #97
- @Patrickske1 — #79
- @PDominikPL — #305, #308, #331, #332
- @pemikalsen-sudo — #184, #302
- @pjmpessers — #102, #103, #104, #105
- @Pollepa — #110
- @Rickert1993 — #44
- @RidderGH — #420
- @ronaldbok — #172
- @rsalinger — #22
- @salvagr — #533
- @sinan92 — #43
- @Snacker80 — #183
- @snorro80 — #91
- @sondregjessing-blip — #428
- @speerke — #329
- @squizzeak — #424
- @Ssssneak — #170
- @stephanmaastricht — #511
- @Tauno20 — #127
- @telenut — #80
- @tencoo — #200
- @theunissendave — #88
- @tjoepatjoep — #260, #312
- @tknapstad — #78
- @vbesteiro — #171
- @Verectra — #87
- @vikinos — #276
- @vladivdv-bot — #317
- @Wuma68 — #128, #173, #174, #548
- @xDMcGee — #532
- @xSondreBx — #82, #83
- P3018b (2026-10-24) one couple = one driver: 21 TS0601/7016 couples that two drivers served now have one owner each, chosen from the exposes in Koenkk/zigbee-herdsman-converters (commit cff1de4731): HOBEIAN ZG-223Z rain `src/devices/hobeian.ts` → rain_sensor; Tuya DP dimmers `_TZE200_4mh6tyyo`/`_TZE204_dcnsggvz`/`_TZE204_9qhuzgo0` (`tuya.ts`) and AVATTO ZDMS16-1 `_TZE204_5cuocqty` (`avatto.ts`) → dimmer_1_gang_tuya; covers `_TZE200_bjzrowv2`/`_TZE284_r3szw0xr` and KnockautX PIMS3028 `_TZE200_eqpaxqdv` → curtain_motor; Nous SZ-T04 `_TZE200_locansqn` (`nous.ts`) → lcdtemphumidsensor; smoke `_TZE200_ntcy3xu1` → smoke_sensor2; Semicom panel `_TZE200_rgeapp2c` → panel_switch_cover_tuya; `_TZE200_zl1kmjqx` temp/humidity → lcdtemphumidsensor_3; WETEN PCI E `_TZE204/284_6fk3gewc` (`weten.ts`) → wall_switch_1gang_1way; Tongou TOQCB2-80 `_TZE204/284_mrffaamu`, `_TZE284_9xstqowh` → smart_breaker; Nous D4Z `_TZE204/284_loejka0i` → energy_meter_3phase; HOBEIAN ZG-205Z/A `CK-BL702-MWS-01(7016)` (`hobeian.ts`, ZHA `tuya_motion.py`) off vibration_sensor. Siterwell GS361A-H04 `_TYST11_jeaxp72v` / zigbeeModel `eaxp72v` (`siterwell.ts`) placed on device_radiator_valve. TS130F `_TZ3000_cet6ch1r` EP2 0x0102 = "to close" calibration per Z2M `src/lib/tuya.ts` cover_options (EP1 to_open / EP2 to_close, time ÷10 s); listened passively. All rewritten, recorded in curated-couple-removals + couple pins.
- P3018b soil (2026-10-24): real Zigbee soil sensors moved to soil_sensor from generic drivers — Tuya TS0601_soil `_TZE200_9cqcpkgb`, TS0601_soil_3 `_TZE284_33bwcga2`/`_TZE284_3urschql` (GIEX GX06)/`_TZE284_ap9owrsa`/`_TZE284_nhgdf6qr` (GIEX GX04)/`_TZE284_wckqztdq`, Arteco ZS-300Z/302Z/304Z `_TZE284_k7p2q5d9`/`_TZE284_65gzcss7`/`_TZE284_yzr43ayq` (Koenkk/zigbee-herdsman-converters `src/devices/tuya.ts`, cff1de4731). Facts only, rewritten.
- P3018b DP sources (2026-10-25, own parsers, facts only — no code copied): per-quirk Tuya DP ids, attribute names and scalings from zigpy/zha-device-handlers (Apache-2.0, commit 1d6598c32a, `zhaquirks/**` QuirkBuilder chains and `dp_to_attribute` tables) and Tuya dpid/item/scaling rows from the dresden elektronik deCONZ REST plugin DDF files (BSD-3-Clause, commit a4c17adfa0, `devices/**/*.json`). They only fill DPs or converters Zigbee2MQTT (Koen Kanters and contributors) does not document for the exact couple.

## Daily KB refresh 2026-10-25 (ideas and leads, no code copied)
- **bkbartk** — Tuya fan optimistic/typed-default write idea, [esphome/esphome#18525](https://github.com/esphome/esphome/pull/18525)
- **make-all/tuya-local contributors** (ozgurclcc PR #6308, surfnterd PR #6067 and others in 7169307…c6ea798) — Wi-Fi product ids and the signed RSSI byte rule (commit 0002e83), Wi-Fi leads only
- **Koenkk/zigbee-OTA** — OTA index checked at df5e8e1 (no new image)

## Forum ideas pass 2026-10-25 (P3037, own words, no code copied)
- **seikossss** — NEO sprinkler `_TZE284_z7a2jmyy` interview and wrong-driver report, [forum 140352 #2268](https://community.homey.app/t/140352/2268); DP map facts from Koenkk/zigbee-herdsman-converters `src/devices/neo.ts` (commit eb77ec10e6, L145-256)
- **okidoki** — exact long-prefix mfr `_TZE2841000000_8se38w3c` seen on a climate sensor, [forum 140352 #2265](https://community.homey.app/t/140352/2265)
- **@migueleap** — `_TZE200_yenbr4om` curtain module interview, GitHub #576
- **Rick_D** — Device Watchdog idea: no "device lost" notice during the startup grace period and at most one per day, [forum 157537](https://community.homey.app/t/157537)

## Thank you — the projects behind the coverage matrix (P3039, 2026-10-25)

This app exists because many people documented Tuya devices long before we did, and shared it openly. The
coverage matrix (`scripts/kb/z2m-coverage.js`, report `docs/knowledge/Z2M_COVERAGE.md`) reads only facts from
their work: manufacturer + model identifiers, the capabilities a device offers and the Tuya datapoint numbers.
Every couple keeps a link to where we found it. No code is copied; decoders are written in our own words.
A heartfelt thank you to:

- **Koenkk** and the hundreds of **Zigbee2MQTT / zigbee-herdsman-converters contributors**: the most complete
  open map of Tuya devices there is, kept current almost daily. Most of what this app knows about Tuya
  datapoints started from your work (MIT).
- **The zigpy / ZHA team and the zha-device-handlers quirk authors**: careful, well-tested quirks that often
  confirmed or corrected what we thought a device did (Apache-2.0).
- **dresden elektronik and the deCONZ DDF contributors**: clear device description files that are a joy to read
  (BSD-3-Clause).
- **Johan Bendz** and everyone who contributed to the original **com.tuya.zigbee** Homey app and its forks:
  this app grew out of yours, and your issue tracker is still where many users first report a new device.
- **blakadder** and the contributors of the Zigbee device compatibility repository: the cross-platform
  catalogue that answers "who else supports this?" in one page (MIT).
- **kkossev (Krassimir Kossev)** and the Hubitat community drivers: patient, detailed reverse-engineering of
  Tuya radars, TRVs and sensors, with fingerprints we could trust.
- **The SmartThings Edge driver authors**, **Mariano Colmenarejo** in particular, and the SmartThings
  Community drivers team.
- **The ioBroker.zigbee maintainers**, the **Zigbee for Domoticz** team and the authors of the
  **z4d-certified-devices** catalogue, and **arendst / the Tasmota Zigbee contributors** for the Zigbee
  device templates.
- Projects we read for the separate Wi-Fi/LAN matrix (leads only here): **make-all/tuya-local**,
  **rospogrigio/localtuya** and its forks, **jasonacox/tinytuya** and the **ESPHome** community.
- Batch P3039b/c (nine new TS0601 drivers): the zigbee-herdsman-converters authors of the **MakeGood**
  (MG-AU03, MG-GPO02Z), **Daewoo** (WKE502Z keypad), **Box** (EWS1154-Z), **Beca** (BVRF-L001 VRF thermostat),
  **AutomatOn** (CH8Z) definitions, and the `tuya.ts` contributors for the **Tervix Pro Line X10** underfloor
  controller, the 3-channel bidirectional meter (`p3g8xiug`) and the TS0601 smoke sensor (`yh7aoahi`).
  Datapoints were reimplemented from your descriptions; no code copied.
- Batch P3039d (class moves, one couple one driver): the `tuya.ts` contributors of the **DCR-CO** carbon monoxide
  detector (`7bztmfm1`) and of the **AVATTO ME168** radiator valve (`cxakecfo`): thanks to your definitions these
  devices now pair on a CO detector and a TRV driver instead of a plug and a contact sensor.
- Batch P3039d lot B (one couple, one driver; truth key = exact manufacturer + product id): the `tuya.ts`
  contributors of **TS0601_smoke_4** (`_TZE200_t5p1vj8r`, `uebojraa`, `vzekyi4c`, `dq1mfjug`), **TS0601_smoke_1**
  (`_TZE204_ntcy3xu1`, tamper DP), the **TS0202 PIR** `_TZ3000_mwd3c2at` and the **Excellux ZG-104PLV** PIR
  (`PIRIV01`): thank you, these smoke and motion sensors now pair on smoke / motion drivers instead of a wireless
  switch, a power strip, an irrigation valve and a motion relay. Thanks also to Koen Kanters and the Zigbee2MQTT
  community for the per-device fingerprints that let us check every couple one by one (own implementation, no
  upstream code copied).
- Batch P3040 (smarter pairing): **Anders_Bee** (Homey forum topic 154959) for the advice to avoid bursts of
  radio traffic right after a device joins: the first-start reads, binds and reporting setups are now deduplicated,
  cached and paced. Thanks also to the Zigbee2MQTT `configureMagicPacket` authors for the read order of the Tuya
  basic attributes (own implementation, no upstream code copied).
- Batch P3050 (Fingerbot Plus): **Yannis Assael (iassael)**, a big thank you for PR #577. You tracked down why every
  command to the Moes Fingerbot Plus (`_TZ3210_j4pdtz9v` / TS0001) timed out: invalid `sendData` arguments, a send
  cascade that keeps a sleeping device waiting, and a settings replay that blocks startup. You also tested the fix on
  your own Homey Pro. Your commit is merged as-is, and the same idea now covers the other Fingerbot Plus ids. Thanks
  also to the Zigbee2MQTT (`TS0001_fingerbot`), ZHA (`tuya_fingerbot.py`) and deCONZ (`_TZ3210_dse8ogfy_fingerbot`)
  authors for the DP matrix we checked against, and to **dalobalo** (#161, #162) and **Joep_K** (forum 140352) for
  the reports (own implementation, no upstream code copied).
- **Koen Kanters and the zigbee-herdsman-converters contributors** - the second negative power encoding (plain 24-bit two's complement above 0x99999A, seen on some `_TZE200_nslr42tt` units) in packed phase DPs, used by P3060 `lib/tuya/TuyaNegPower24.js` (own implementation, no code copied).
- Batch P3064 (family uplift): **Koen Kanters and the zigbee-herdsman-converters contributors** for the datapoint
  layouts of the Tuya dual smoke & CO alarm (`TS0601_smoke_co`, Moes JKD-513COM-Z), PA-44Z and GSKS-ZB smoke
  detectors, the MG-DIM02Z dimmer module, the SWS6TZ-WHITE 6-gang switch, the TOQCB2-80 breaker temperature and the
  Moes ZM7LT3 three-phase meter (own implementation, no upstream code copied).
- Batch P3067 (smoke / CO family): **Koen Kanters and the zigbee-herdsman-converters contributors** (`moes.ts`
  ZSS-HM-SSD01), **the zigpy/zha-device-handlers contributors** (`zhaquirks/tuya/tuya_smoke.py`), **blakadder**
  (Moes ZSS-HM-SSD01 page) and the Hubitat Tuya Zigbee Smoke Detector driver authors, whose datapoint facts show
  `_TZE200/_TZE204/_TZE284_vawy74yh` is a smoke detector (own implementation, no upstream code copied).
- Batch P3067 (radiator valves): **Koen Kanters and the zigbee-herdsman-converters contributors** (`avatto.ts`
  ME168_AVATTO) and **Deennoo and the Domoticz Zigbee for Domoticz contributors** (TS0601-ME168 model), whose
  datapoint facts show the ME168 layout of `_TZE200_cxakecfo/ybsqljjg/4aijvczq/r5ksy7qo` (own implementation).
- Batch P3067 (covers): **Koen Kanters and the zigbee-herdsman-converters contributors** (`tuya.ts` TS0601_cover_4,
  Moes AM43-0.45/40-ES-EB), whose datapoint list shows DP101/102 are opening mode / factory reset on the AM43.
- Batch P3067 (buttons / keypads): **Koen Kanters and the zigbee-herdsman-converters contributors** (`daewoo.ts`
  WKE502Z: hub-mode DP101, arm ACK DP23, start-up arm mode DP25, options DP103-111, user DP112; `tuya.ts`
  TS0601_vibration_sensor) and **the zigpy/zha-device-handlers contributors** (`_TZE200_kzm5w4iz` DP1/3/10)
  (own implementation, no upstream code copied).
- Batch P3067 (lights): **Koen Kanters and the zigbee-herdsman-converters contributors** (`gledopto.ts` GL-SPI-206P:
  DP3 white brightness, DP61 paint colour frame, DP53 pixel count, DP101 bead order, DP102 chip type, DP103 do not
  disturb; `tuya.ts` MG-DIM02Z DP143/144/146 and TS0601_knob_dimmer_switch DP106/141) (own implementation).
- Batch P3067 (soil, breaker): **Koen Kanters and the zigbee-herdsman-converters contributors** (`hobeian.ts` CS-201Z /
  ZG-303Z DP102/104/105/110-112 device-side calibration and sampling; `tuya.ts` ZBN-DJ-63 DP1/6/9/15/16/103/110) (own implementation).
- Batch P3067 (adaptive lighting): **iGen** (article of 26/10/2026 on sun-following lighting: inspiration only) and
  **the Home Assistant adaptive_lighting custom component authors** (idea of pausing after a manual change); colour
  temperature physical range from the ZCL Color Control cluster spec (own implementation, no code copied).
- Batch P3067 (energy estimates): **the Home Assistant powercalc authors** (idea of a per-brightness lookup table and
  standby power); default watts are our own approximations, each with its reason in `data/energy/default-power.json`.
- Batch P3067 (thermostat metering): **the zigbee-herdsman-converters contributors** (`tuya.ts` AETZ01_AC, TWC-R01, TH-P1Z metering DPs and scales).
- Batch P3068 (one couple, one driver): **the zigbee-herdsman-converters contributors** (`tuya.ts` AETZ01_AC, ZG-103V, TS0601_fan_5_levels_and_light_5_levels; `mercator.ts` SISWD11-ZB) and **Mercator Ikuü** (SISWD11-ZB specification sheet). Facts only, own implementation.
- Batch P3071 (DIN energy meters): **the zigbee-herdsman-converters contributors** (`tuya.ts` TS0601_din_1, SPM01V1-GT, SDM01V1-GT, SDM02V1-GT, ATMS10013Z3 datapoint layouts). Facts only, own implementation.
- Batch P3071c (HOCH RCBO): **the zigbee-herdsman-converters contributors** (`legacy.ts` hoch_din datapoints, `tuya.ts` TS0601_rcbo). Facts only, own decoder.
- Batch P3077 (phantom couples, one couple one driver): **the zigbee-herdsman-converters contributors** (`miboxer.ts` FUT038Z/FUT089Z, `skydance.ts` WZ5_rgb_1, `lonsonho.ts` TS130F_dual, `zemismart.ts` KES-606US-L4), **the zigpy ZHA quirks contributors** (`lidl/TS0501A.py`, `tuya/ts0501bs.py`) and **Johan Bendz** (rgb_bulb_E27, rgb_mood_light, rgb_led_strip_controller, lcdtemphumidluxsensor, dimmer_2_gang, plug lists). Batch 2: zigbee-herdsman-converters `lidl.ts`/`tuya.ts`/`hobeian.ts`, PR #3076 **dmaasland** and #3107 **kloknibor**, zigbee2mqtt issue reporters **activa73** (#26084), **jocamane** (#11663), **1iverea9er** (#7881), **snp88** (#8500). Batch 4: zigbee-herdsman-converters `tuya.ts` TS130F whitelabels (LoraTap, BSEED, Zemismart, Danor, QA). Facts only, own implementation.
- And every forum member and GitHub issue reporter who sent a fingerprint, a diagnostic or a "this works now":
  you are listed by handle in the sections above, and new names are added with each batch.

## Learning loop and upstream watch (P3073, 2026-10-26) — ideas only, no code copied
- **Agent Reach** (Panniantong, MIT) — the idea of reading many public channels through one read-only fallback; used only on the maintainer box, never in CI.
- **Powercalc** (Home Assistant community) — the idea of learning a device profile from repeated readings before trusting it.
- **Zigbee2MQTT / zigbee-herdsman-converters, ZHA quirks, deCONZ, tuya-local, localtuya, tinytuya, Hubitat (kkossev), Home Assistant, Johan Bendz and the fork maintainers, Athom SDK** — public projects followed "since last time"; anything found is rewritten in our words and credited before use.
