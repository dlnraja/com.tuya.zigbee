## Follow-up from community URLs (silent)

### Topic 157628 — Stop pasting unchecked AI answers
Integrated project-wide (rules, AGENTS, CORE FM4, WORKFLOW_GUIDELINES, Cursor rule, AI project-rules, forum-poll/auto-enrich/fetch-diags):
- Default = **no forum reply**; silent enrichment only
- `FORUM_AUTO_POST=0` + forced dry-run on responders
- `tools/ci/forum-ai-paste-gate.js` + reply-quality-gate anti AI-paste heuristics
- Humanize voice guide updated; topic 157628 added to silent multi-scan

### Topic 146735 #260 (bayrambass) — door/window contact flows
Symptoms: missing WHEN/AND contact cards, devices missing from AND list, UI shows only “Everything works fine”.
Silent transfer into our Zigbee app:
- Fixed `contact_sensor*` / `sensor_contact_*` condition listeners that wrongly read `onoff` instead of `alarm_contact` / `alarm_tamper`
- Fixed `doorwindowsensor*` / `smart_door_window_sensor` AND cards that always returned `true`
- Expanded `UnifiedSensorBase` trigger aliases to hit compose IDs (`contact_sensor_opened` / `_closed`)
- Added `alarm_contact` capabilitiesOptions insights titles (Opened/Closed)

### Topic 43287 — Device Capabilities (Arie)
READ-ONLY UX patterns (memory of many When cards, custom capability presentation). Added topic `43287` to `forum-silent-multi-scan.js`. No replies.

---

# P108 — Forum Silent Multi-Thread Enrichment

**Date:** 2026-08-11  
**Scope:** READ-ONLY forum investigation (own + satellite threads) → app + workflow enrichment.  
**Policy:** `REPLY_TOPICS=140352` only. Topics 146735 / 26439 / 89271 / 43287 (+ archive satellites) are scan-only. No external attribution in changelogs/commits.

## Scanned topics (silent)

| Topic | Role | Result (max=30 tail) |
|-------|------|----------------------|
| 140352 | Own (reply-allowed elsewhere) | 50 posts / 21 actionable / 0 new FP |
| 146735 | Smart Life cloud (silent) | 50 / 10 / 0 |
| 26439 | Johan Zigbee (silent) | 50 / 13 / 5 false-positive truncations filtered |
| 89271 | Device request archive (silent) | 50 / 48 / 0 |

Artifacts (gitignored state): `.github/state/forum/multi-silent-digest.json`, `multi-silent-new-fps.json`.

## Actionable sacred-couple outcomes

| Couple | Finding | Action |
|--------|---------|--------|
| `_TZE284/204/200_m1cvyneb` + TS0601 | Dimmer paired as wrong type | Added TZE204/TZE200 variants to `wall_dimmer_tuya`; anti-bot forbid climate/generic |
| `_TZ3000_wkr3jqmr` + TS0004 | 4-ch relay request (archive) | Added to `switch_4gang` |
| `_TZ3210_imaccztn`, `jtbgusdc`, `clrdrnya`, soil `myd45weu`, BSEED `w5xztuy7` | Already typed | Reinforced KNOWN_ROUTES / gates |

## Runtime / base-class fixes (legacy dead-device pattern)

- `lib/TuyaSpecificClusterDevice.js`: DeviceIO install, `_resolveTuyaCluster`, `_ensureTuyaIo`, multi-path `_datapoint` via `io.sendDP` → resolved cluster → ep1.tuya
- `drivers/wall_dimmer_tuya/device.js`: safe cluster resolve + passive listen instead of hard `clusters.tuya.on`
- `drivers/light_sensor_outdoor/device.js`: sleepy interview compensation + soft illuminance read

## Workflow / automation enrichment

- **New** `tools/ci/forum-silent-multi-scan.js` — multi-topic READ-ONLY digest
- **Fixed** `tools/ci/forum-threads-scan.js` — correct `lib/scraper/smart-fetch` require; expanded topics
- **Expanded** `tools/ci/apply-forum-146735-silent.js` KNOWN_ROUTES (`m1cvyneb`, `clrdrnya` → `presence_sensor_radar`)
- Wired into `.github/workflows/forum-poll.yml`, `auto-enrich-closed-loop.yml`, `fetch-diags.yml`

## Non-goals

- No forum posts/replies outside 140352
- No mass dump into `generic_tuya`
- No stable-v5 backport until Test channel clean
