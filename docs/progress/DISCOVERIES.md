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
