# Weekly Sovereign Loop

Generated: 2026-08-14T14:35:50.476Z
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
- [in_progress] Weekly Sovereign Loop (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31810271224
- [success] Fetch Homey Diagnostics (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31806485193
- [success] Autonomous Verification (P37) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31806246794
- [success] 🤖 Auto-Fix + Publish Pipeline (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31804739401
- [success] 🔄 Auto-Enrich Closed Loop (P69) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31803635567
- [success] 🩹 Publish Self-Heal (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31802412649
- [failure] 🔍 Validate Homey App (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31801173136
- [success] Gmail Diagnostics Auto-Analysis (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31800915804

## Open issues
- #513 Bug report - Zigbee Climate sensor not installing

## Cursor brain — do this week (max)
- **P0**: Inspect failed CI/publish runs and apply reliability-only fixes on master; backport crash fixes to stable-v5 only after soak.
  - https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31801173136
- **P1**: Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.
  - #513 Bug report - Zigbee Climate sensor not installing

## Hard stops
- Do NOT paste unchecked AI to Homey forum
- Do NOT dump ambiguous FPs into generic_tuya
- Do NOT push feature managers to stable-v5
- Do NOT run mega crawls inside Cursor (dispatch GHA instead)
- Stop after ≤3 reliability commits or 1 PR
