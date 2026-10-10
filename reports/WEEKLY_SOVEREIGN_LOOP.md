# Weekly Sovereign Loop

Generated: 2026-10-04T12:31:27.713Z
Version: **9.0.1331** · Branch: `master`

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
- [in_progress] Bastien Promote Upstream (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37202517423
- [in_progress] Fetch Homey Diagnostics (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37202500600
- [in_progress] Weekly Sovereign Loop (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37202183348
- [success] Autonomous Verification (P37) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37202107662
- [success] 🤖 Auto-Fix + Publish Pipeline (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37201404315
- [success] 🔄 Auto-Enrich Closed Loop (P69) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37200382600
- [success] Gmail Diagnostics Auto-Analysis (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37198598130
- [success] Batch Analyze & Respond (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37198216315
- [success] Homey Store Peer Probe (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37198154030
- [success] 🛡️ Project Resilience Inventory (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37197689019

## Publish / validate related
- [in_progress] Fetch Homey Diagnostics — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37202500600
- [success] 🤖 Auto-Fix + Publish Pipeline — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37201404315
- [success] Homey Store Peer Probe — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/37198154030

## Open issues
- #559 Smartplug
- #557 🤖 Daily digest
- #550 Bug report - [Short description]

## Open PRs
- none

## Cursor brain — do this week (max)
- **P1**: Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.
  - #550 Bug report - [Short description]
- **P0**: Local gates failing: dualClaim — fix before any publish.
- **P1**: Some workflow dispatches failed (check GH_PAT / workflow names): mega-crawl.yml, gmail-diagnostics.yml, forum-poll.yml, auto-bot-issue-triage.yml, publish-diagnose.yml, safe-sync-stable.yml, self-improve.yml

## Hard stops
- Do NOT paste unchecked AI to Homey forum
- Do NOT dump ambiguous FPs into generic_tuya
- Do NOT push feature managers to stable-v5
- Do NOT run mega crawls inside Cursor (dispatch GHA instead)
- Stop after ≤3 reliability commits or 1 PR
