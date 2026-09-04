# Weekly Sovereign Loop

Generated: 2026-09-04T22:46:46.894Z
Version: **9.0.815** · Branch: `master`

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
- [success] Secure Notifications (Enhanced) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33926866162
- [skipped] Auto-Reopen on Comment (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33926865668
- [skipped] Auto-Reopen on Comment (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33926865656
- [cancelled] Secure Notifications (Enhanced) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33926864522
- [in_progress] Tuya Deep Diagnostics Recovery (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33926719333
- [success] e2e-dashboard-test (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33926598466
- [success] PR Labeler (`ai/monthly-audit-2026-09`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33926578098
- [failure] 🧠 Fleet Intelligent Enrich (P2372) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33926382639
- [success] L99 Inbox Intelligence (P2352) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33926379566
- [success] 📡 Market Couples Intake (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33926376990

## Open issues
- #533 Device Request - [SMART ZIGBEE CURTAIN SWITCH] - [MOES]

## Open PRs
- #539 AI Monthly Audit - September 2026 | Risk: Updated — https://github.com/dlnraja/com.tuya.zigbee/pull/539

## Cursor brain — do this week (max)
- **P0**: Inspect failed CI/publish runs and apply reliability-only fixes on master; backport crash fixes to stable-v5 only after soak.
  - https://github.com/dlnraja/com.tuya.zigbee/actions/runs/33926382639
- **P1**: Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.
  - #533 Device Request - [SMART ZIGBEE CURTAIN SWITCH] - [MOES]
- **P0**: Local gates failing: dualClaim — fix before any publish.
- **P1**: Some workflow dispatches failed (check GH_PAT / workflow names): mega-crawl.yml, gmail-diagnostics.yml, forum-poll.yml, auto-bot-issue-triage.yml, publish-diagnose.yml, safe-sync-stable.yml, self-improve.yml
- **P1**: Open non-draft PRs — review for reliability merges on master only.
  - https://github.com/dlnraja/com.tuya.zigbee/pull/539

## Hard stops
- Do NOT paste unchecked AI to Homey forum
- Do NOT dump ambiguous FPs into generic_tuya
- Do NOT push feature managers to stable-v5
- Do NOT run mega crawls inside Cursor (dispatch GHA instead)
- Stop after ≤3 reliability commits or 1 PR
