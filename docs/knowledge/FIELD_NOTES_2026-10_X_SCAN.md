# Field notes — X/Twitter scan (2026-10-04)

Our own summaries of posts the maintainer shared, with what matters for this app.
Sources and authors are credited in `CREDITS.md`. No code was copied.

## Mesh and reliability (for the FAQ)
- Build the mesh with mains-powered routers (plugs, in-wall relays) **before** pairing battery sensors; end devices do not route.
- Zigbee and 2.4 GHz Wi-Fi share the band: Zigbee channels 15, 20 and 25 sit mostly between Wi-Fi 1/6/11; channel 11 overlaps Wi-Fi 1.
- Many in-wall relays offer a *decoupled* mode: the wall switch only sends an event while the relay keeps power on smart bulbs.
  (Source: XDA, Jasmine Mannan, 2026-09-29.)
- A device that goes silent after a while and only comes back after a power cycle may need a **full bootloader reflash** rather than a normal OTA. On the Shelly/Ecowitt WS90 the vendor fix was a reflash in "slow OTA" mode, after which it rejoined the existing network by itself. (Source: J. Stabentheiner, 2026-07-31.)
- Security: CVE-2020-6007 (Philips Hue) shows why re-pairing a misbehaving bulb with unknown firmware can be risky. Keep firmware current and keep IoT on a separate network.

## Device identity and values
- **Declared type can lie.** LiXee's ZLinky_TIC announces itself as a *Dimmable Light* for legacy hub compatibility. Classify energy devices by the clusters they really expose (0x0702 Metering, 0x0B04 Electrical Measurement), not by the declared device id. (Source: faire-ca-soi-meme.fr, 2026-02-13.)
- **Signed vs unsigned is per attribute.** ZCL `activePower`/`reactivePower` are int16 (zigbee-clusters already decodes them signed). LiXee-Box v2.22 fixed "65508 W instead of −28 W", and raw hex published for untyped numeric attributes (300 hPa instead of 994). In this repo Tuya VALUE DPs are signed by default (P2769), counters are restored as unsigned (`counterSafeRaw`) and distances stay unsigned (P2580). Do not apply a global rule. (Source: LiXee-Box v2.22 release notes, 2026-08-19.)
- Matter (2026-02): the `electrical_sensor` device type (Matter 1.3) is not shown by Alexa, Google Home or Apple Home; SmartThings shows it. Energy values bridged to Matter will therefore be invisible on most ecosystems.

## DIY firmware worth knowing
- **devbis/z03mmc**: Zigbee 3.0 firmware for the Xiaomi LYWSD03MMC (Telink BLE thermometer). Standard clusters (battery, 0x0402, 0x0405), calibration as int16 attribute 0x0010 on 0x0402/0x0405, display options on 0x0204, Zigbee OTA. Z2M matches it by model id `LYWSD03MMC`; manufacturer code 0xDB15. **The manufacturerName string is not stated in the sources read**, so no fingerprint was added (capture it from a real interview first).

## Somfy TaHoma / Overkiz — inspiration for covers
How TaHoma works (from Somfy's developer-mode docs, pyoverkiz and the Home Assistant Overkiz integration):
- One gateway, many radios (io-homecontrol, RTS, Zigbee, Z-Wave) behind a single REST API. Local API: developer mode in the app, Bearer token, discovery by mDNS `_kizboxdev._tcp` where the TXT `gateway_pin` is the reliable identity. The local API polls about every 5 s; the cloud API about every 30 s, and hourly when only stateless devices are present.
- **"My" position**: a favourite position stored per cover and exposed as a one-tap button, with the position editable as a number (HA maps `core:Memorized1PositionState`).
- **Stateless RTS covers** report nothing back; HA recommends an optimistic/template cover. That is the same idea as our travel-time estimation.
- **Position + tilt in one command**: sending position and then tilt as two commands makes io venetian blinds stutter (the second cancels the first). HA added a single combined action.
- **Execution queue**: the gateway queues about 10 executions; HA batches commands sent close together and recommends gateway scenarios for big groups.
- **Low-speed (silent) mode** as a separate entity, and **Identify** as a diagnostic button.

Applied here (P2799): "Open", "Close", "Stop" and "Go to favorite position" flow actions on curtain_motor, curtain_motor_shutter and curtain_motor_wall were log-only placeholders. They now drive the device's own capability listeners, and a `favorite_position` setting (default 50 %) acts like TaHoma's "My" position.

Ideas kept for later (not implemented): combined position+tilt action with sequencing; staggering commands when a flow moves many covers; optional Identify (cluster 0x0003) action for covers.

## Ecosystem status checks
- Tuya ↔ Home Assistant (2021 announcement): the cloud custom component became the core integration, now QR login through the Smart Life app (sharing SDK); official local control never shipped. HA now uses `home-assistant-libs/tuya-device-handlers` (product_id quirks, MIT), added to the master-branch source registry (`data/sources/registry.json`) as a weekly source.
- Tuya local control (EverySmartHome, 2021-10-07: "no longer a priority"): still true in 2026. Tuya's newer Smart Life integration README says local control is not supported yet. That is the gap this app's local Zigbee path and the community Wi-Fi local libraries fill; never plan on a vendor promise.
- Athom official Tuya app (2024 announcement): the Homey store page (read 2026-10-04) shows v1.4.2, last updated two years ago, with a notice that it is broken for new users ("No matching app user information").
- ubisys joined Works with Home Assistant (2026-04-23): in-wall Zigbee actuators (C4, H1, S1, S1-R, S2). The app already knows ubisys (mfr code 0x10F2) in `ExoticQuirkEngine`.

## Workflow / AI tooling notes
- Agent configs are an attack surface: invisible Unicode can hide instructions in AGENTS.md, skills or rules. The new free gate `npm run check:p2800` (runs in `validate.yml`, no AI) blocks zero-width, bidi and tag characters and only warns on injection-like phrases. (Idea: the "agent config injection scan" in the ECC Claude Code setup described by @S0N_IA.)
- A routing file for skills (`skills/ROUTING.md`) keeps agents on the right playbook (pattern from reverse-skill).
- Free/local model options people use (Ollama, llama.cpp, OpenRouter free tiers, Claude-Code proxies such as free-claude-code): fine for personal learning. Workflows stay AI-optional and in quota (`AI_ALLOW_PAID=false`). Do not route repository secrets or private diagnostics through third-party proxies.
