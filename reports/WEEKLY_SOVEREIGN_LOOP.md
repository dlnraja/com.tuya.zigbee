# Weekly Sovereign Loop

Generated: 2026-09-06T11:06:19.784Z
Version: **9.0.836** · Branch: `master`

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
- [in_progress] Fetch Homey Diagnostics (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/34029271368
- [in_progress] Weekly Sovereign Loop (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/34029099510
- [success] Autonomous Verification (P37) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/34029030957
- [skipped] Auto-Reopen on Comment (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/34028563300
- [success] 🤖 Auto-Fix + Publish Pipeline (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/34028433642
- [skipped] Auto Bot Issue Triage (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/34027853996
- [skipped] Bug Report Auto-PR (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/34027853991
- [success] Secure Notifications (Enhanced) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/34027853936
- [cancelled] Bug Report Auto-PR (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/34027853919
- [skipped] Auto Bot Issue Triage (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/34027853918

## Publish / validate related
- [in_progress] Fetch Homey Diagnostics — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/34029271368
- [success] 🤖 Auto-Fix + Publish Pipeline — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/34028433642

## Open issues
- #544 [Device Support] Fingerprint issue for Tuya 2-gang switch (_TZ3000_l9brjwau / TS0002)
- #543 [Device Support] Add support for Tuya 2-gang switch _TZ3000_ptjcjise / TS0002
- #542 [Device Support] TS0012 / _TZ3000_xk5udnd6 not recognized in wall_switch_2gang_1way
- #541 [Device Support] TS0004 / _TZ3000_enmfaave not matching in switch_4gang
- #540 [Device Support Request] _TZ3000_blhvsaqf / TS0001 mapped to virtualdriverzigbee
- #533 Device Request - [SMART ZIGBEE CURTAIN SWITCH] - [MOES]

## Open PRs
- none

## Cursor brain — do this week (max)
- **P1**: Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.
  - #544 [Device Support] Fingerprint issue for Tuya 2-gang switch (_TZ3000_l9brjwau / TS0002) · #543 [Device Support] Add support for Tuya 2-gang switch _TZ3000_ptjcjise / TS0002 · #542 [Device Support] TS0012 / _TZ3000_xk5udnd6 not recognized in wall_switch_2gang_1way · #541 [Device Support] TS0004 / _TZ3000_enmfaave not matching in switch_4gang · #540 [Device Support Request] _TZ3000_blhvsaqf / TS0001 mapped to virtualdriverzigbee · #533 Device Request - [SMART ZIGBEE CURTAIN SWITCH] - [MOES]
- **P0**: Local gates failing: dualClaim — fix before any publish.
- **P1**: Some workflow dispatches failed (check GH_PAT / workflow names): mega-crawl.yml, gmail-diagnostics.yml, forum-poll.yml, auto-bot-issue-triage.yml, publish-diagnose.yml, safe-sync-stable.yml, self-improve.yml

## Hard stops
- Do NOT paste unchecked AI to Homey forum
- Do NOT dump ambiguous FPs into generic_tuya
- Do NOT push feature managers to stable-v5
- Do NOT run mega crawls inside Cursor (dispatch GHA instead)
- Stop after ≤3 reliability commits or 1 PR
