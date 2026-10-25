# Weekly Sovereign Loop

Generated: 2026-10-25T11:43:36.698Z
Version: **9.0.1597** · Branch: `master`

## Quota policy
- Cursor Automation = thin weekly brain (read report → bounded reliability fixes)
- GitHub Actions = dumps / gates / publish diag / Homey Test probe
- Forum = silent enrich only (no auto-post)
- master = Test/features · stable-v5 = reliability backports only

## Gates
- ✅ **antiBot** (exit 0)
- ✅ **bareZigbee** (exit 0)
- ✅ **doubleDivision** (exit 0)
- ✅ **voice** (exit 0)
- ❌ **dualClaim** (exit 1)
- ✅ **alignMfs** (exit 0)
- ✅ **heapJson** (exit 0)
- ✅ **maxCoverage** (exit 0)
- ✅ **batteryButton** (exit 0)
- ✅ **rulesMatrix** (exit 0)
- ✅ **userTriage** (exit 0)
- ✅ **moduleLoad** (exit 0)
- ✅ **workflowEstate** (exit 0)
- ✅ **firmwareUpdates** (exit 0)
- ✅ **wifiLocalFirst** (exit 0)

## Homey Test channel
- URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- HTTP: **200** OK

## Dispatches
- ❌ `mega-crawl.yml` — workflow not found
- ❌ `gmail-diagnostics.yml` — workflow not found
- ❌ `forum-poll.yml` — workflow not found
- ❌ `auto-bot-issue-triage.yml` — workflow not found
- ❌ `publish-diagnose.yml` — workflow not found
- ❌ `safe-sync-stable.yml` — workflow not found
- ❌ `self-improve.yml` — workflow not found

## Recent workflow runs
- [in_progress] Weekly Sovereign Loop (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/40189806324
- [success] Autonomous Verification (P37) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/40189639339
- [success] 🤖 Auto-Fix + Publish Pipeline (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/40187985168
- [success] 🔄 Auto-Enrich Closed Loop (P69) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/40186829150
- [success] Gmail Diagnostics Auto-Analysis (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/40183976636
- [success] GitHub Shadow Policy (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/40183757472
- [success] Doc Coverage (P3032) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/40183747402
- [success] 🛡️ Unified CI/CD Orchestrator (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/40183737408
- [success] 🔍 Syntax Check & SDK3 Validation (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/40183727682
- [success] Batch Analyze & Respond (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/40183567089

## Publish / validate related
- [success] 🤖 Auto-Fix + Publish Pipeline — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/40187985168
- [success] Homey Store Peer Probe — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/40183468535

## Open issues
- #571 [Bug] QT-07S (_TZE284_myd45weu / TS0601) remains unknown and Configure keeps loading — v9.0.1445 Test
- #570 [soil_sensor] Bug: AOYAN AY-303Z soil sensor not recognized despite fingerprint in soil_sensor driver
- #560 Bug report - TRV06 Smart Zigbee Radiator Valve - isn't working
- #559 Smartplug
- #557 🤖 Daily digest
- #550 Bug report - [Short description]

## Open PRs
- none

## Cursor brain — do this week (max)
- **P1**: Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.
  - #571 [Bug] QT-07S (_TZE284_myd45weu / TS0601) remains unknown and Configure keeps loading — v9.0.1445 Test · #570 [soil_sensor] Bug: AOYAN AY-303Z soil sensor not recognized despite fingerprint in soil_sensor driver · #560 Bug report - TRV06 Smart Zigbee Radiator Valve - isn't working · #550 Bug report - [Short description]
- **P0**: Local gates failing: dualClaim — fix before any publish.
- **P1**: Some workflow dispatches failed (check GH_PAT / workflow names): mega-crawl.yml, gmail-diagnostics.yml, forum-poll.yml, auto-bot-issue-triage.yml, publish-diagnose.yml, safe-sync-stable.yml, self-improve.yml

## Hard stops
- Do NOT paste unchecked AI to Homey forum
- Do NOT dump ambiguous FPs into generic_tuya
- Do NOT push feature managers to stable-v5
- Do NOT run mega crawls inside Cursor (dispatch GHA instead)
- Stop after ≤3 reliability commits or 1 PR
