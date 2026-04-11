# KNOWLEDGE BASE & AI HEURISTICS (Local BDD)
*Updated: April 2026*

This document serves as the central intelligence repository (Local BDD) for AI automated agents, GitHub Actions, and maintenance scripts.
It lists external references, state trackers, and new integrations for Universal Tuya Zigbee.

## 1. Local Database & State Files (AI "Cascade" Memory)
To prevent rate-limits and token bloat ("redumping" the whole internet), our orchestration scripts operate incrementally using these files:
- **`.github/state/external-sources-state.json`**: Tracks the `lastRun` date and the AI's `lastPlan`. This enables the "Winssurf Cascade" pattern where only *new* GitHub issues / Z2M PRs (delta) are fetched and summarized.
- **`.github/state/device-functionality.json`**: The Local Device Database. Stores `{fp, pid, dps, caps, clusters, localDriver}` mapping.
- **`diagnostics/summary.json`**: Extracted crash reports and TypeErrors parsed directly from Gmail logs.

## 2. Autonomous Triage & Diagnostics Strategy
When ancient drivers or PRs are unresolved, the AI must rely on diagnostic logs to self-heal.
1. `daily-everything.yml` parses `diagnostics/summary.json`.
2. It detects structural errors, e.g., `TypeError: this.homey.flow.getDev[...] is not a function`.
3. The AI is fed the targeted `driver.js` and corrects the syntax using SDK v3 compliant `getConditionCard` routines.
> **Rule**: Diagnostics logs from users are the *absolute ground truth*. Never overwrite user logs, fix the drivers around them.

## 3. Case-Insensitive (Caseless) Architecture
The entire application has been converted to "caseless" operations to counter manufacturer firmware variability (e.g., `_tz3000_xxxxx` vs `_TZ3000_xxxxx`):
- `driver.compose.json` mappings are enforced with lowercase fallbacks using F5 constraints via `enforce-fingerprint-rules.js` (over 3391 missing variants injected).
- `lib/Util.js` natively uses `normalizeTuyaID()` globally on pairing events (`findBestDriver`, `deviceMatchesDriver`). 

## 4. Market Intelligence: Tuya Cloudless & Zigbee Trends (2026)
Based on latest smart home community audits, local control is evolving:
- **`tuya-local` vs `localtuya`**: For Wi-Fi Tuya devices, the community strongly recommends `tuya-local` (by make-all) as the most stable vanilla option over older forks. Although they still heavily rely on obtaining local keys from the Tuya IoT Platform.
- **Zigbee2MQTT (Z2M)**: Zigbee remains the sovereign protocol for true 100% "cloudless" operability. Tuya's new "Official Cloudless BLE" scope is extremely restricted and does not replace Zigbee for Homey Pro users.
- **Physical AI Agents**: Tuya is moving towards enterprise Edge AI, meaning "dumb" Zigbee devices will rely entirely on our hub (Homey Pro) for intelligence capabilities.
- **Conclusion for our Homey App**: The Homey Universal Tuya Zigbee App acts as the supreme, stable equivalent of Z2M for the Homey ecosystem. No local keys needed.

## 5. File Reorganization Audit
In April 2026, the root workspace was cleaned. Redundant, duplicated AI-generated text files, JSON dumps, and raw script logs (`patch_*.js`, `repair*.js`) have been relocated to:
- `backup/legacy_scripts/`
- `backup/logs/`
This guarantees cleanly passing syntax validation gates and prevents CI failures.
