# Project Status

> Auto-generated on 2026-07-14 (P53 update)

## Overview

| Metric | Value |
|--------|-------|
| Version | v9.0.220 |
| Drivers | 431 (381 Zigbee + 50 WiFi) |
| Fingerprints | 6,503+ |
| Unique mfrs in mfs_db | 4,149 |
| Sacred Couples | 12,307+ |
| External Sources | 15 (Blakadder, Johan, Gmail, Forum, Z2M, ZHA, deCONZ + 8 scanners) |
| Last Updated | 2026-07-14 |

## P53 Highlights

- **Blakadder v2 integration**: 2,692 devices, 635 Tuya FPs (92.3% covered by mfs_db, 92.0% by drivers)
- **48 new mfrs auto-applied** to 6 drivers (generic_tuya: 30, switch_1gang: 9, climate_sensor: 4, plug_smart: 2, garage_door: 2, button_wireless_1: 1)
- **mega-crawler.js**: orchestrates all 15 external sources, daily 02:00 UTC
- **forum-fetch-140352.js**: paginates 2031 community forum posts, extracts mfrs+pids
- **Blakadder workflow**: now runs daily 04:00 UTC
- **AGENTS.md**: project guide for future AI agents
- **README**: updated Data Sources section with all 15 sources

## Drivers by Category

| Category | Count |
|----------|-------|
| sensor | 127 |
| socket | 117 |
| light | 61 |
| other | 29 |
| thermostat | 26 |
| remote | 19 |
| fan | 17 |
| windowcoverings | 11 |
| lock | 5 |
| doorbell | 4 |
| garagedoor | 4 |
| heater | 4 |
| button | 2 |
| curtain | 2 |
| camera | 1 |
| vacuumcleaner | 1 |
| speaker | 1 |

## Workflows

44 GHA workflows, 21 with schedule:
- **Daily**: mega-crawl (02:00), recurrent-orchestrator (03:30), blakadder-fetch (04:00), gmail-diagnostics, continuous-flow
- **Weekly/Monthly**: monthly-scan, monthly-tuya-intelligence, monthly-device-enrichment, stale, etc.

## Links

- [Device Finder](https://dlnraja.github.io/com.tuya.zigbee/)
- [Install Test Version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)
- [Forum topic 140352](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/)
- [GitHub](https://github.com/dlnraja/com.tuya.zigbee)
- [Original JohanBendz fork](https://github.com/JohanBendz/com.tuya.zigbee)
