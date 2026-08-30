# Weekly Sovereign Loop

Generated: 2026-08-30T11:49:11.857Z
Version: **9.0.719** · Branch: `master`

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
- [success] 🔬 Publish Diagnose (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309962967
- [in_progress] 🤖 Auto-Fix + Publish Pipeline (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309848570
- [skipped] Auto-Reopen on Comment (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309803533
- [success] code-quality (`stable-v5`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309745580
- [success] 🤖 Auto-Fix + Publish Pipeline (`stable-v5`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309745565
- [failure] 🛡️ Unified CI/CD Orchestrator (`stable-v5`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309745560
- [success] 🚀 Publish Stable to Test (`stable-v5`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309745558
- [failure] 🔍 Syntax Check & SDK3 Validation (`stable-v5`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309745557
- [in_progress] Weekly Sovereign Loop (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309736572
- [success] e2e-dashboard-test (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309244901

## Publish / validate related
- [success] 🔬 Publish Diagnose — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309962967
- [in_progress] 🤖 Auto-Fix + Publish Pipeline — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309848570
- [success] 🤖 Auto-Fix + Publish Pipeline — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309745565
- [success] 🚀 Publish Stable to Test — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309745558
- [failure] Auto-Publish on Push — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309055381

## Open issues
- #533 Device Request - [SMART ZIGBEE CURTAIN SWITCH] - [MOES]
- #532 [Device] Zigbee Smart AC Thermostat

## Open PRs
- none

## Cursor brain — do this week (max)
- **P0**: Inspect failed CI/publish runs and apply reliability-only fixes on master; backport crash fixes to stable-v5 only after soak.
  - https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309745560 · https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309745557 · https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309055381 · https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33309055369
- **P1**: Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.
  - #533 Device Request - [SMART ZIGBEE CURTAIN SWITCH] - [MOES] · #532 [Device] Zigbee Smart AC Thermostat
- **P0**: Local gates failing: dualClaim — fix before any publish.
- **P1**: Some workflow dispatches failed (check GH_PAT / workflow names): mega-crawl.yml, gmail-diagnostics.yml, forum-poll.yml, auto-bot-issue-triage.yml, publish-diagnose.yml, safe-sync-stable.yml, self-improve.yml

## Hard stops
- Do NOT paste unchecked AI to Homey forum
- Do NOT dump ambiguous FPs into generic_tuya
- Do NOT push feature managers to stable-v5
- Do NOT run mega crawls inside Cursor (dispatch GHA instead)
- Stop after ≤3 reliability commits or 1 PR
