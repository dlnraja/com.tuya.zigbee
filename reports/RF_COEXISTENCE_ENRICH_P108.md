# Silent RF Coexistence Enrichment (from Homey RF education thread)

**Date:** 2026-08-11  
**Policy:** READ-ONLY scan → implement in repo. No forum reply. No external attribution in changelogs.

## Teachings absorbed
1. Zigbee/Thread channel numbers ≠ Wi-Fi channel numbers (classic user mistake).
2. Zigbee/Thread ~2 MHz vs Wi-Fi 20/40 MHz span — edge cases matter (e.g. ch15 vs Wi-Fi 1).
3. Prefer Zigbee/Thread 15/20/25 when Wi-Fi uses 1/6/11 @ 20 MHz.
4. Prefer Wi-Fi 20 MHz on 2.4 GHz when coexistence matters; 40 MHz widens overlap.
5. Do not casually reset Homey Zigbee/Thread channel; Repair before re-pair for Zigbee.
6. RSSI alone is not quality (asymmetric links, noise, retries).

## Project changes
- `lib/utils/rf-channel-coexistence.js` — scoring + recommendations
- `tools/ci/rf-channel-coexistence-smoke.js`
- `docs/guides/RF_CHANNEL_COEXISTENCE.md`
- Fixed outdated tables in `docs/ZIGBEE_TROUBLESHOOTING_GUIDE.md` §1.2
- Silent scan topic `157859` in `forum-silent-multi-scan.js`
- Wired into AGENTS / FORUM_HUB / Cursor rule / `.windsurfrules`
