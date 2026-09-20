# Weekly Sovereign Loop

Generated: 2026-09-20T11:34:36.842Z
Version: **9.0.1107** · Branch: `master`

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
- [success] 🔬 Publish Diagnose (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508343888
- [in_progress] Bastien Promote Upstream (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508313232
- [in_progress] Fetch Homey Diagnostics (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508297875
- [success] e2e-dashboard-test (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508296170
- [success] GitHub Shadow Policy (`bastien-home`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508168428
- [success] Draft to Test Fleet (3 apps) (`master`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508108857
- [success] Publish Zigbee Bastien (`bastien-home`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508104821
- [failure] 🔍 Syntax Check & SDK3 Validation (`stable-v5`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508090097
- [success] 🚀 Publish Stable to Test (`stable-v5`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508090059
- [failure] 🤖 Auto-Fix + Publish Pipeline (`stable-v5`) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508090031

## Publish / validate related
- [success] 🔬 Publish Diagnose — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508343888
- [in_progress] Fetch Homey Diagnostics — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508297875
- [success] Draft to Test Fleet (3 apps) — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508108857
- [success] Publish Zigbee Bastien — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508104821
- [success] 🚀 Publish Stable to Test — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508090059
- [failure] 🤖 Auto-Fix + Publish Pipeline — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508090031
- [success] 🤖 Auto-Fix + Publish Pipeline — https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35507953318

## Open issues
- #552 Bug report - Reassign TS130F (_TZ3000_e3vhyirx) from smart_knob to curtain_module driver
- #551 Bug report - TS0043 (_TZ3000_famkxci2) detected as Generic Zigbee Device instead of button_wireless_3
- #550 Bug report - [Short description]

## Open PRs
- none

## Cursor brain — do this week (max)
- **P0**: Inspect failed CI/publish runs and apply reliability-only fixes on master; backport crash fixes to stable-v5 only after soak.
  - https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508090097 · https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508090031 · https://github.com/dlnraja/com.tuya.zigbee/actions/runs/35508090027
- **P1**: Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.
  - #552 Bug report - Reassign TS130F (_TZ3000_e3vhyirx) from smart_knob to curtain_module driver · #551 Bug report - TS0043 (_TZ3000_famkxci2) detected as Generic Zigbee Device instead of button_wireless_3 · #550 Bug report - [Short description]
- **P0**: Local gates failing: dualClaim — fix before any publish.
- **P1**: Some workflow dispatches failed (check GH_PAT / workflow names): mega-crawl.yml, gmail-diagnostics.yml, forum-poll.yml, auto-bot-issue-triage.yml, publish-diagnose.yml, safe-sync-stable.yml, self-improve.yml

## Hard stops
- Do NOT paste unchecked AI to Homey forum
- Do NOT dump ambiguous FPs into generic_tuya
- Do NOT push feature managers to stable-v5
- Do NOT run mega crawls inside Cursor (dispatch GHA instead)
- Stop after ≤3 reliability commits or 1 PR
