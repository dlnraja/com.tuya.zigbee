# Weekly Sovereign Loop

Generated: 2026-08-14T15:43:06.009Z
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

## Recent workflow runs
- [in_progress] Weekly Sovereign Loop (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31815844453
- [success] 🔄 Self-Improve (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31814356540
- [success] Safe Sync master → stable-v5 (P52) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31814354924
- [success] 🔬 Publish Diagnose (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31814352922
- [success] Auto Bot Issue Triage (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31814350997
- [success] 🌍 Forum Poll (P69) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31814348921
- [success] Gmail Diagnostics Auto-Analysis (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31814347082
- [in_progress] 🕷️ Mega Crawler (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31814345344

## Open issues
- #513 Bug report - Zigbee Climate sensor not installing

## Cursor brain — do this week (max)
- **P1**: Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.
  - #513 Bug report - Zigbee Climate sensor not installing

## Hard stops
- Do NOT paste unchecked AI to Homey forum
- Do NOT dump ambiguous FPs into generic_tuya
- Do NOT push feature managers to stable-v5
- Do NOT run mega crawls inside Cursor (dispatch GHA instead)
- Stop after ≤3 reliability commits or 1 PR
