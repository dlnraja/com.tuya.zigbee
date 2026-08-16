# Weekly Sovereign Loop

Generated: 2026-08-16T06:55:37.175Z
Version: **9.0.533** · Branch: `master`

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
- [in_progress] 🤖 Auto-Fix + Publish Pipeline (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31932523816
- [in_progress] Weekly Sovereign Loop (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31932466478
- [success] Gmail Diagnostics Auto-Analysis (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31931085493
- [skipped] Auto-Reopen on Comment (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31930551208
- [cancelled] Batch Analyze & Respond (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31930389689
- [success] 📥 Community Inbox (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31929592931
- [success] Auto Bot Issue Triage (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31928154173
- [success] Safe Sync master → stable-v5 (P52) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31927812010
- [success] 🗂️ Blakadder Integration (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31927503224
- [success] 🔄 Auto-Enrich Closed Loop (P69) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31927084901

## Publish / validate related
- [in_progress] 🤖 Auto-Fix + Publish Pipeline — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31932523816
- [success] 🩹 Publish Self-Heal — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31926815965

## Open issues
- #513 Bug report - Zigbee Climate sensor not installing

## Open PRs
- #530 fix(stable): P139 + ZT08 DP17 + TYZB01 switch routes — https://github.com/dlnraja/com.tuya.zigbee/pull/530

## Cursor brain — do this week (max)
- **P1**: Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.
  - #513 Bug report - Zigbee Climate sensor not installing
- **P1**: Some workflow dispatches failed (check GH_PAT / workflow names): mega-crawl.yml, gmail-diagnostics.yml, forum-poll.yml, auto-bot-issue-triage.yml, publish-diagnose.yml, safe-sync-stable.yml, self-improve.yml
- **P1**: Open non-draft PRs — review for reliability merges on master only.
  - https://github.com/dlnraja/com.tuya.zigbee/pull/530

## Hard stops
- Do NOT paste unchecked AI to Homey forum
- Do NOT dump ambiguous FPs into generic_tuya
- Do NOT push feature managers to stable-v5
- Do NOT run mega crawls inside Cursor (dispatch GHA instead)
- Stop after ≤3 reliability commits or 1 PR
