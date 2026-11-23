# Weekly Sovereign Loop

Generated: 2026-11-22T14:45:29.835Z
Version: **9.0.1637** · Branch: `master`

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
- [in_progress] Weekly Sovereign Loop (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/45034195844
- [in_progress] Bastien Promote Upstream (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/45033721698
- [success] Bastien diag auto-reply (P3110) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/45033659788
- [skipped] Auto-Reopen on Comment (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/45032070389
- [success] Secure Notifications (Enhanced) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/45032070244
- [success] 🤖 Auto-Fix + Publish Pipeline (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/45031678220
- [success] 🔄 Auto-Enrich Closed Loop (P69) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/45031423490
- [success] Gmail Diagnostics Auto-Analysis (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/45029701667
- [success] Batch Analyze & Respond (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/45028447939
- [success] Athom build history (read-only) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/45028390209

## Publish / validate related
- [success] 🤖 Auto-Fix + Publish Pipeline — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/45031678220
- [success] Homey Store Peer Probe — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/45028271035

## Open issues
- [#632](https://github.com/dlnraja/com.tuya.zigbee/issues/632) — about: thermostat — `_TZE204_ltwbm23f` `TS0601`
- [#584](https://github.com/dlnraja/com.tuya.zigbee/issues/584) — about: `TS0601`
- [#581](https://github.com/dlnraja/com.tuya.zigbee/issues/581) — about: unclassified
- [#559](https://github.com/dlnraja/com.tuya.zigbee/issues/559) — about: unclassified
- [#557](https://github.com/dlnraja/com.tuya.zigbee/issues/557) — about: unclassified
- [#550](https://github.com/dlnraja/com.tuya.zigbee/issues/550) — about: unclassified

## Open PRs
- [#634](https://github.com/dlnraja/com.tuya.zigbee/pull/634) — about: thermostat, pairing — `_TZE204_ltwbm23f`

## Cursor brain — do this week (max)
- **P1**: Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.
  - [#632](https://github.com/dlnraja/com.tuya.zigbee/issues/632) — about: thermostat — `_TZE204_ltwbm23f` `TS0601` · [#584](https://github.com/dlnraja/com.tuya.zigbee/issues/584) — about: `TS0601` · [#581](https://github.com/dlnraja/com.tuya.zigbee/issues/581) — about: unclassified · [#550](https://github.com/dlnraja/com.tuya.zigbee/issues/550) — about: unclassified
- **P0**: Local gates failing: dualClaim — fix before any publish.
- **P1**: Some workflow dispatches failed (check GH_PAT / workflow names): mega-crawl.yml, gmail-diagnostics.yml, forum-poll.yml, auto-bot-issue-triage.yml, publish-diagnose.yml, safe-sync-stable.yml, self-improve.yml
- **P1**: Open non-draft PRs — review for reliability merges on master only.
  - https://github.com/dlnraja/com.tuya.zigbee/pull/634

## Hard stops
- Do NOT paste unchecked AI to Homey forum
- Do NOT dump ambiguous FPs into generic_tuya
- Do NOT push feature managers to stable-v5
- Do NOT run mega crawls inside Cursor (dispatch GHA instead)
- Stop after ≤3 reliability commits or 1 PR
