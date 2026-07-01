# TS004F Button and Battery Reference - 2026-07-01

## Scope

App: `com.dlnraja.tuya.zigbee.stable` (`5.11.219`, branch `enrich-button-compat-routes`).

This note consolidates the latest forum, Gmail crash, GitHub PR, dashboard, and alternative-project evidence used for the TS004F/Moes/Lidl 4-button remote fixes.

## Recent Timeline

- 2026-06-29 05:49, Homey forum post 2098: Moes/Tuya 4-button remote diagnostic `5f9e3d94-cb21-4a02-a85a-772b71e51bd1`; symptom: buttons/flows not firing, battery unknown.
- 2026-06-29 09:46 UTC, Athom dashboard build #11 for stable `5.11.219`: `processing_failed`, reason `Please reduce your request rate`.
- 2026-06-29 10:09 UTC, Athom dashboard build #12 for stable `5.11.219`: state `test`; latest stable build is healthy.
- 2026-06-30 02:30 UTC, Gemini review on PR #437: requested flow-card try/catch, listener cleanup before setup, endpoint filtering, and defensive `removeListener`/`off`; current branch includes these patterns.
- 2026-07-01 06:36 UTC, Johan SDK3 PR #440: 103 fingerprint additions but 77 cross-class PID conflicts and 245 MFR duplicate risks; do not merge blindly without conflict audit.

## Cross-Project Evidence

GitHub code search sampled 100 `TS004F` matches across 68 unique repositories. Recurrent implementations from Zigbee2MQTT, ZHA, deCONZ, SmartThings, Hubitat, Jeedom/Domoticz, and Home Assistant blueprints agree on the key pattern:

- TS004F remotes can emit onOff, scenes, proprietary Tuya E000, and levelControl commands.
- Multi-button variants need endpoint-aware routing, typically endpoints 1-4.
- LevelControl cluster `0x0008` must be listened to for step/move/stop style actions.
- Battery may report via Power Configuration `batteryPercentageRemaining` with ZCL-200 scaling, or via Tuya DPs such as 4, 15, 101, or 3 depending on variant.

Primary references:

- https://github.com/Koenkk/zigbee-herdsman-converters/blob/087766b0f3712773ef4191e993e79e2a681d68d5/src/devices/moes.ts
- https://github.com/zigpy/zha-device-handlers/blob/e2cafc6b26405a211df7daf222136aaeabe68638/zhaquirks/tuya/ts004f.py
- https://github.com/dresden-elektronik/deconz-rest-plugin/blob/cd7621f0a3aeaf977dc93231d6bca8ef24544291/devices/tuya/_TZ3000_TS004F_switch.json
- https://github.com/kkossev/Hubitat/blob/04d242c63f60b99c1c6574d63c1cd5a4b1afc200/Drivers/Tuya%20TS004F/TS004F.groovy

## Root Causes Fixed

- TS004F 4-button variants were sometimes routed to generic one-button or smart-knob drivers through broad `TS004F` matching.
- LevelControl actions were not covered broadly enough, so physical step/move/stop commands never reached flow cards.
- Battery handling trusted one endpoint/path too much and did not consistently normalize ZCL-200 TS004x reports.
- Voice assistants could expose `button.*` capabilities if manifest options regressed.
- Stable publish diagnostics did not run the TS004F flow-routing gate or diagnostic-history gate in pre-validation.

## Guardrails Added

- `scripts/ci/check-button-flow-routing.js` now validates TS004F routing, levelControl cluster exposure, command listener source coverage, and compound fingerprint DB routes.
- `test/critical/cross-source-routing.test.js` covers forum-derived TS004F/Moes/Lidl routing, LevelControl actions, and TS004x battery normalization.
- `.github/workflows/publish-stable.yml` now runs `check:button-flows`, `check:voice`, `check:diag-history`, and repeats the TS004F gate in the sanitized diagnostics sweep.

## Current Outcome

- TS004F 4-button fingerprints route to `button_wireless_4`.
- TS004F rotary/knob fingerprints route to `smart_knob_rotary`.
- LevelControl step/move/stop maps to `single`/`long`/`release`.
- Battery fallback scans all power clusters and Tuya DP alternatives before leaving a value unknown.
- Latest stable dashboard result is `5.11.219` in `test`; the known failed build was an Athom request-rate issue, not a code validation failure.
