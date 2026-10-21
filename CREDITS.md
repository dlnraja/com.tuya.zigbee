# Credits & Acknowledgments

## Core Framework
- **Athom BV** - Homey SDK3, node-homey-zigbeedriver, node-zigbee-clusters
- **Homey Developer Documentation** - apps.developer.homey.app

## SVG Icons & Image Assets
- **athombv/homey-vectors-public** - Official Homey SVG vector icons for device capabilities and UI elements
- **Joolee/Homey-SVG-Icons** - Community-maintained SVG capability icons for Homey devices

## Tuya Protocol References
- **JohanBendz/com.tuya.zigbee** - Original Tuya Zigbee app for Homey (TuyaSpecificClusterDevice, DP constants, sub-devices)
- **Koenkk/zigbee-herdsman-converters** - Z2M device definitions and Tuya converters
- **zigpy/zha-device-handlers** - ZHA Tuya quirks (zhaquirks/tuya/)
- **jasonacox/tinytuya** - Tuya local protocol implementation
- **make-all/tuya-local** - Tuya Local for Home Assistant (YAML config DP mappings)
- **rospogrigio/localtuya and forks (e.g. xZetsubou/hass-localtuya)** (GPL-3.0) - localtuya and forks: inspiration only, no code copied. Behaviour notes in our own words: `docs/automation/localtuya-study.md`.
- **dresden-elektronik/deconz-rest-plugin** - deCONZ Tuya support and Data Point Protocol documentation

## Community Contributors
- **AreAArseth/com.hobeian** - Hobeian Zigbee devices
- **drenso/com.tuya2** - TypeScript Tuya cloud app (OAuth2 patterns)
- **JohanBendz** — develop-0.4 engineering notes, reimplemented in our own code (no code copied): unknown-DP log flood guard ([#1501](https://github.com/JohanBendz/com.tuya.zigbee/issues/1501)), colour-temperature safe range + best-effort vendor RGB mode ([#1502](https://github.com/JohanBendz/com.tuya.zigbee/issues/1502)), read-only relay power-on sync ([#1503](https://github.com/JohanBendz/com.tuya.zigbee/issues/1503)), TH05Z identity without sleepy Basic reads (commit 71fc1e29), TH01Z MCU time requests (commit d78ab90a), knob Level Control bound cluster (commit 9045a3c4).
- **gpmachado** (`gpmachado/com.gpm.homesuite`, GPL-3.0, ideas only — no code copied) — availability last-seen persist + boot grace, rejoin vs timeout (`device_rejoined`), lifecycle `onUninit` teardown, Poll Control skip on sleepy nodes, Homey settings over ZCL dump, jitter/TX pacing (no thundering herd), inching/power-on/backlight re-apply, interview-driven sacred couples, settings-as-labels, connected-devices grouping, rejoin-history settings tab, hide dead firmware settings. Dual-app tags in `.ai/KNOWLEDGE_CACHE.json` → `recentDiscoveries.homesuite`. HomeSuite itself credits **StyraHem / s-dimaio** (Homey.Sonoff.Zigbee) and JohanBendz — acknowledged as HomeSuite’s upstream, not copied here.
- **andiwirz** - Protocol auto-detect, DP discovery tool
- **iBush** (Switcher app for Homey, [community t/160624](https://community.homey.app/t/160624)) - ideas only, our own code: timer-for-a-set-time card, time-left token / timer-running trigger, auto-shutdown, child-lock, correct-known-AC-state.
- **Steve_Wilson** ([t/101901 #8](https://community.homey.app/t/101901/8)) - interview of the Zemismart 214C valve (`_TZE284_vuwtqx0t`); with **Kigrou** (zigbee-herdsman-converters#10636, Z2M `TS0601_water_valve`) and Zemismart (`zemismart-zha-quirks` 214c.py) as the DP sources for P2864. DP tables only, no code copied.
- **Istvan_Mag, Kizabgd, marosk, Dragan_Todorovic** (topics 140352 / 26439) - Developer Tools / interview data for `_TZE284_gnpflcoq`, `_TZE284_9ern5sfh`, `_TZE200_fl8cuafl`, `_TZE200_crq3r3la`; **julianjwong** (zha-device-handlers#5286) for the corrected gnpflcoq DP table.
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
