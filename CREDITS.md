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
