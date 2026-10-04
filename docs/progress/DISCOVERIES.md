# Discoveries log

Each entry: source (link + author), mechanism / symptom, what we did (or why not). Written in our own words.

## 2026-10-04 — Homey Matter Bridge: how devices are exposed
- Source: https://github.com/athombv/com.athom.matter-bridge `lib/MatterBridgeServer.mjs` @045787d (Athom B.V., 2026-09-14).
- Mechanism: the bridge picks a Matter device type from `virtualClass || class`, then reads only exact capability ids (socket: onoff + measure_power; light: onoff/dim/hue+saturation/temperature/mode; thermostat family: setpoint, room temperature, mode, humidity; lock; window coverings; sensor: temperature, humidity, CO, CO2, PM2.5, PM10, luminance, motion, occupancy, contact, smoke; any other class: onoff only). Sub-capabilities (`onoff.gang2`) are never bridged; a thermostat whose mode list has none of off/heat/cool/auto is skipped completely; smoke is bridged only under class `sensor`.
- Symptom solved: devices invisible in Apple Home / Google Home / Alexa / SmartThings / Home Assistant after HomeKit retirement (Homey v13.5.1, removal March 2027).
- What we did: `data/matter-bridge-mapping.json` (our wording, credited), `tools/ci/smart-home-ecosystem-audit.js` (per driver: exposed / not exposed, Alexa, Google). 443 drivers: 367 bridged, 286 Alexa, 411 Google. `smart_scene_panel` got an additive `onoff` mirroring gang 1. Valves deliberately not mirrored (a voice "turn everything on" would open water).

## 2026-10-04 — Alexa / Google via Homey's own integrations
- Sources: support.homey.app article 4409841950738 (Alexa supported devices, Athom, 2026-04-10); apps.developer.homey.app "Drivers & Devices" (class drives Google grammar such as "turn off all lights").
- Mechanism: Alexa only takes sockets, switches, lights, fans, thermostats, locks, blinds/curtains, TVs, speakers or any device with onoff; Google maps class + system capabilities. SmartThings has no direct Homey export: Matter Bridge only.
- What we did: audit checks both; user note `docs/user/SMART_HOME_ECOSYSTEMS.md` (HOMEKIT note kept as a pointer).

## 2026-10-04 — Athom store: builds failing with "socket hang up" while CI stays green
- Source: our stable publish runs 37165678667 / 37166982598 / 37169372245 (Athom build list: #267-#270 and #272 `processing_failed`, stateMeta "socket hang up"; #271 same version 5.12.359 re-uploaded later and processed fine).
- Mechanism: Athom's server-side processing of an uploaded archive (~37.6 MB, ~4550 files) sometimes drops; the upload step itself reports success, and our verify step soft-continued because Test was still "healthy" on the previous build. Re-uploading the SAME version after a failed build is accepted.
- What we did: stable workflow now waits for processing after upload and re-uploads the same version up to 2 times when it fails (stable commit 128cd4677e), with an explicit error + summary line if it still fails.

## 2026-10-04 — Our own R21 gate false positive
- Mechanism: the runtime-safety gate treated constant lookup Sets (never `.add`ed) as unbounded caches.
- What we did: Sets/Maps never mutated are now treated as constants; test added.

## 2026-10-04 — ChatGPT / Homey MCP breaks on malformed flow cards (and we had some)
- Sources: https://homey.app/en-us/news/homey-is-now-available-in-chatgpt/ (Athom, June 2026); support.homey.app article 27950286160540; community.homey.app t/155885 (Astrap, 2026-06-07: `droptoken` string instead of array breaks list_flow_action_cards) and t/145181 post 105 (B4ZZY, 2026-09-05: dropdown value `title: null` breaks list_flow_trigger_cards); apps.developer.homey.app/the-basics/flow/arguments (dropdown values are `{ id, title }`).
- Mechanism: the MCP server validates the whole flow-card catalogue of the Homey against a strict schema; one bad card from any installed app makes the whole list call fail, so the assistant can no longer build flows for that user. Our app had 38 dropdown values (12 app-level cards: capability_anomaly, capability_trend, capability_crossed_threshold, child_lock_*, gang_*, backlight_set, soft_* ...) written as `{ id, label }` without `title` -> they surface as `title: null`, the exact failure B4ZZY reported.
- What we did: added `title` (same text as `label`, kept `label`) to those 38 values; new gate `tools/ci/flow-mcp-shape-gate.js` (dropdown titles, droptoken arrays, title.en) wired into `check:flows-publish`, with test. Stable branch scanned: clean.

## 2026-10-04 — First change-driven pass over all registered sources (25 sources)
- Sources: data/sources/registry.json (Z2M converters/issues/device pages, ZHA quirks + ZHA, deCONZ, localtuya x2, tuya-local, Blakadder, SmartThings Edge (Mariano), Hubitat (kkossev), Jeedom Abeille, HOMEd, athombv x3, Johan + forks, Homey forum, Homey SDK docs/news/app store, Tuya docs).
- Mechanism: per source a cursor (commit sha per path, issues updated-since, forum highest post, page hash) in data/sources/state.json; the next run only reads the diff (GitHub compare API: added lines only), new/updated issues, new posts, or a changed hash. Baseline run: 38 API calls, 116 proposals.
- Couples not yet in our app, all TS0601/TS0002/TS1201 (to research before landing, W4):
  - `_TZE204_r6kfl9ta` / TS0601 — Tuya ZY-N1 noise sensor, DPs 1,2,8,16,18,20,22,101 (zigpy/zha-device-handlers PR #5386 by kgws, open).
  - `_TZE284_rzdkn5rx` / TS0601 — Zemismart ZN2S-US01U-ZK, DPs 19,29,209,210 (zha-device-handlers PR #5387 by zemismart-dev, open).
  - `_TZ3290_qazgdsae` / TS1201 — Zemismart ZBCIR01 IR blaster, Zosung protocol (zha-device-handlers PR #5282 by raspberry-tips, open).
  - `_TZE284_oa1odmga` / TS0601 — reported without exposes (Koenkk/zigbee2mqtt #32498 by nach9696 closed, #33117 by the-satorugojo open).
  - `_TZ3210_jqg2a5yn` / TS0002 — 2-gang relay report (Koenkk/zigbee2mqtt #32627 by lucasbissaro, closed).
- What we did: proposals stored in data/leads/source-proposals.json; daily run wired into free-scrape-crossref.yml (existing workflow, no new one) and into external-sources-scanner.js. Landing each couple needs the usual research + exact-pair decision.
