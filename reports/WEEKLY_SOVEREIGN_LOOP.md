# Weekly Sovereign Loop

Generated: 2026-11-01T13:41:39.587Z
Version: **9.0.1609** · Branch: `master`

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
- [skipped] CI autofix (P3048, no AI) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312452192
- [skipped] CI autofix (P3048, no AI) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312382519
- [skipped] Bot revert on red (P3105) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312273355
- [skipped] CI autofix (P3048, no AI) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312273344
- [in_progress] Weekly Sovereign Loop (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312229879
- [skipped] CI autofix (P3048, no AI) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312225771
- [skipped] Secure Notifications (Enhanced) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312165536
- [success] Publish hold bisect (P3095) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312165517
- [success] Secret scan (gitleaks) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312115410
- [success] 🤖 Auto-Fix + Publish Pipeline (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312115361

## Publish / validate related
- [success] Publish hold bisect (P3095) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312165517
- [success] 🤖 Auto-Fix + Publish Pipeline — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312115361
- [success] Auto-Publish on Push — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/41312115331

## Open issues
- [#584](https://github.com/dlnraja/com.tuya.zigbee/issues/584) — about: `TS0601`
- [#581](https://github.com/dlnraja/com.tuya.zigbee/issues/581) — about: unclassified
- [#559](https://github.com/dlnraja/com.tuya.zigbee/issues/559) — about: unclassified
- [#557](https://github.com/dlnraja/com.tuya.zigbee/issues/557) — about: unclassified
- [#550](https://github.com/dlnraja/com.tuya.zigbee/issues/550) — about: unclassified

## Open PRs
- none

## Cursor brain — do this week (max)
- **P1**: Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.
  - [#584](https://github.com/dlnraja/com.tuya.zigbee/issues/584) — about: `TS0601` · [#581](https://github.com/dlnraja/com.tuya.zigbee/issues/581) — about: unclassified · [#550](https://github.com/dlnraja/com.tuya.zigbee/issues/550) — about: unclassified
- **P0**: Local gates failing: dualClaim — fix before any publish.
- **P1**: Some workflow dispatches failed (check GH_PAT / workflow names): mega-crawl.yml, gmail-diagnostics.yml, forum-poll.yml, auto-bot-issue-triage.yml, publish-diagnose.yml, safe-sync-stable.yml, self-improve.yml

## Hard stops
- Do NOT paste unchecked AI to Homey forum
- Do NOT dump ambiguous FPs into generic_tuya
- Do NOT push feature managers to stable-v5
- Do NOT run mega crawls inside Cursor (dispatch GHA instead)
- Stop after ≤3 reliability commits or 1 PR
