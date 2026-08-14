# Weekly Sovereign Loop

Generated: 2026-08-14T15:53:38.131Z
Version: **9.0.506** · Branch: `master`

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
- [in_progress] Weekly Sovereign Loop (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31816453009
- [success] 🔄 Self-Improve (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31815985791
- [success] Safe Sync master → stable-v5 (P52) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31815984235
- [success] 🔬 Publish Diagnose (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31815982689
- [success] Auto Bot Issue Triage (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31815981162
- [success] 🌍 Forum Poll (P69) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31815979470
- [in_progress] Gmail Diagnostics Auto-Analysis (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31815977846
- [pending] 🕷️ Mega Crawler (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31815976100
- [success] Weekly Sovereign Loop (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31815951427
- [success] 🔄 Self-Improve (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31815887856

## Publish / validate related
- [success] 🔬 Publish Diagnose — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31815982689
- [success] 🔬 Publish Diagnose — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31815883513

## Open issues
- #513 Bug report - Zigbee Climate sensor not installing

## Open PRs
- none

## Cursor brain — do this week (max)
- **P1**: Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.
  - #513 Bug report - Zigbee Climate sensor not installing
- **P1**: Some workflow dispatches failed (check GH_PAT / workflow names): mega-crawl.yml, gmail-diagnostics.yml, forum-poll.yml, auto-bot-issue-triage.yml, publish-diagnose.yml, safe-sync-stable.yml, self-improve.yml

## Hard stops
- Do NOT paste unchecked AI to Homey forum
- Do NOT dump ambiguous FPs into generic_tuya
- Do NOT push feature managers to stable-v5
- Do NOT run mega crawls inside Cursor (dispatch GHA instead)
- Stop after ≤3 reliability commits or 1 PR
