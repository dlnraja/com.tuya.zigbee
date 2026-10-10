# Homey forum — Apps category + zigbee tag digest (2026-10)

Read-only mining (never posted). Sources: https://community.homey.app/c/apps/7, /tag/zigbee, topics listed below.

| Topic | Author | Idea | Decision |
|---|---|---|---|
| [160624 Switcher](https://community.homey.app/t/160624) | iBush | "Turn on for a set time" card | **Implemented** (master, prep/master-forum-apps): app card `device_on_for_minutes` = onoff true + existing countdown router (native Tuya countdown DP, software timer fallback). |
| 160624 | iBush | time-left token / "timer running" trigger, auto-shutdown setting | Backlog: needs per-driver countdown DP read-back; not implemented yet. |
| 160624 | iBush | one Homey device per channel | Backlog (opt-in at pairing only; existing devices untouched). We already have child_lock_set card. |
| 160624 | iBush | "Correct the known AC state" for IR | Backlog for IR blaster. |
| [155646 HomeSuite](https://community.homey.app/t/155646) | Gabriel_Pedrosa_Mach | availability heuristics, reconnect-after-power-cut trigger, backoff+jitter polling, hide dead settings | Backlog (reliability). Upstream feature request node-homey-zigbeedriver#180 (lastSeen). |
| [160590 Aqara Community](https://community.homey.app/t/160590) / [156 Aqara & Xiaomi](https://community.homey.app/t/156) | makleso6 / Athom thread | lumi heartbeat struct (basic 0xFF01, 0xFCC0:0x00F7) | **Fixed** XiaomiSpecialHandler: old parser read byte 2 as a length, but it is a ZCL datatype (per zigbee-herdsman-converters lumi decoder). New `parseLumiTagTypeValue` / `parseLumiF7`; legacy path kept as fallback. Only tag 0x01 (battery mV) and 0x03 (device °C) mapped. |
| [29734 Hue Zigbee](https://community.homey.app/t/29734) | Johan Bendz | availability recovery from real incoming traffic | Backlog, same as HomeSuite. |
| [154077 Tuya Local](https://community.homey.app/t/154077) | Andi | DP auto-detect at pairing (WiFi) | Already covered by our localtuya module (soak). |

No new mfr+pid couples found in these first posts (none verified, none integrated).

Automation: `.github/scripts/source-registry.js` gains `discourse-category` scanner (category or tag, cursor = max topic id, first run = baseline); registry sources `homey-forum-apps-category` (daily), `homey-forum-tag-zigbee` (daily), `homey-forum-apps-tracked` (weekly, per-topic post cursor: 160624, 155646, 160590, 29734). 156/154077/43287 were already in `homey-forum-ecosystem`. Runs inside existing daily `free-scrape-crossref.yml` (no new workflow, no AI, no posting). `scan-forum.js` seeds += 156, 154077, 160624.
