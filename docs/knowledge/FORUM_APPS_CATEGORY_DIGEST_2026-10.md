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

## Update 2026-10-11 01:40 (Paris)

Implemented (prep/master-forum-apps):
- `device_timer_changed` trigger (tokens running / minutes_left / gang) + `device_timer_running` condition; FeatureFallbackRouter keeps timer state for the native DP and software paths (state only, no extra commands). Credit iBush (t/160624).
- UnknownDeviceHandler next steps: ask for the exact manufacturerName + modelId couple and the full interview JSON, and re-interview multi-gang sockets. Credit Dijker / Peter_Kawa (t/101901).
- Scanner: `discourse-category` now also follows new posts in the 20 most recently active topics of a list (bounded, per-topic cursor). New sources: tag `app`, tag `zigbee` (tracking), tracked topics += 101901, 89931, 152944, 157743, 155815, 159739, 78650, 160502, 154885, 85754, 155475, 147496, 160116, 68198.
- Xiaomi lumi decoder fix ported: bastien-home 1eb29b96b0, stable-v5 77829273ac.

Not done: auto-shutdown setting. It needs a per-device onoff listener and app-level capability events, so it stays in the backlog.

Already supported (checked): `_TZE284_vuwtqx0t` TS0601 (t/101901, Zemismart water valve), in water_valve_smart on all three branches. Hue lesson "recover availability from real incoming traffic" (t/29734): already done in TuyaUnifiedDevice/UnifiedSensorBase setAvailable on incoming frames.

Forum lessons, no code: FP300 (t/152944) sticks/drops on Zigbee firmware, users report firmware 1.1.3.8 fixes it. Aqara app 1.18.1 regression (t/156 #7376–7385): buttons dead, "already added" ghost nodes, fix = Zigbee repair, not re-pair. E1 WXKG17LM (t/155815): multi-click mode = 0xFCC0 attr 0x0125 (1 fast, 2 multi). This is a single user report that Z2M has not confirmed yet, so it is not integrated.

### Per-thread coverage (posts downloaded / total, full read in progress, recent first)
101901 8/8 · 155646 6/6 · 160590 7/7 · 160624 1/1 · 155815 7/7 · 157743 17/17 · 152944 58/58 · 154077 501/501 · 29734 1179/1179 · 89931 1113/1113 · 159739 92/92 · 78650 245/245 · 160502 6/6 · 154885 122/122 · 85754 99/~ · 156 2690/7060 (backfill running) · 43287, 140352, 155475, 147496, 160116, 68198 queued.
Downloaded is not the same as analysed: 29734 and 156 were keyword/author-scanned. 89931 (Button+), 159739, 78650, 154885 and 85754 are downloaded but still need idea extraction.
