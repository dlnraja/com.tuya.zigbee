# Multi-source sweep P129 (2026-08-14)

## Trigger
Recursive dump → cross-ref → fix → verify → ship after P128 (v9.0.495 on Test).

## Workflows launched (`workflow_dispatch` on `master`)
| Workflow | Run | Result |
|---|---|---|
| Mega Crawler | 31790248693 | in_progress / polled |
| Blakadder Integration | 31790250461 | **success** |
| Gmail Diagnostics | 31790252050 | polled |
| Agent Reach Channels | 31790254886 | **success** |
| Community Inbox | 31790256643 | **success** |
| Auto-Enrich Closed Loop | 31790258572 | polled |
| Auto Bot Issue Triage | 31790260346 | **success** |
| Batch Analyze & Respond | 31790299056 | polled (earlier twins cancelled by concurrency) |
| Offline Crash Analyzer | 31790264056 | **success** |
| Knowledge Graph Daily Sync | 31790266320 | **success** |
| Self-Improve | 31790268091 | **failure** → fixed locally (see below) |
| Forum Poll | 31790270017 | **success** (silent/dry-run) |
| Nightly Audit | 31790271783 | **success** |
| Monthly Community Sync | 31790273856 | **failure** (push rebase race: unstaged on runner) |
| Collect Diagnostics | 31790276150 | **success** |
| Recurrent Orchestrator (P32) | 31790303846 / 31790313112 / 31790362726 | **success** |

## Local scans
| Tool | Result |
|---|---|
| forum-silent-multi-scan | 7 topics OK; 3 “new FPs” = Johan sticky truncated mfr noise — **not applied** |
| forum-ai-paste-gate | OK (silent policy) |
| bare-zigbee | violations=0; bare leftovers after migrate: `ir_blaster`, `smartPlug_DinRail` (+ fixed exceptions) |
| anti-bot | PASS (after P129 TS004F rule flip) |
| fp-collision `--baseline` | 0 new |
| adaptive-double-division `--hard` | hardHits=0 |
| unbound-catch `--gate` | PASS |
| gmail-crash-pattern | ok (18 known / 0 unknown) |
| #513 scale tests | 5/5 PASS |
| critical battery + forum-routing | 12/12 PASS |

## Root causes fixed
1. **Self-Improve / forum routing**: Moes/Lidl TS004F remotes (`_TZ3000_xabckq1v`, `czuyt8lz`, `b3mgfu0d`, `abrsvsou`, `4fjiwweb`) were dual-homed on `switch_1gang` / `relay_board_4_channel` / `button_wireless_2`. Z2M confirms **4-button wireless** for `mfr+TS004F`. Moved to `button_wireless_4`; inverted wrong P93 anti-bot REQUIRED/FORBIDDEN.
2. **Battery secondary-path test** still expected invented 50% after P115 policy left `null` (“?”). Test updated to match BatteryRouter.
3. **Bare ZigBeeDevice**: migrated `blaster_remote` + `power_clamp_meter` → `TuyaZigbeeDevice` (+ `safeSetTimeout` on IR send).

## Issues
| Issue | Status |
|---|---|
| **#513** `_TZE284_hodyryli` | **OPEN** — FP present; P128 hot-water ÷10 + ZT08 battery enum in Test; awaiting user confirm (no new comment this pass) |
| #516 humidity | CLOSED (prior) |

## Version / publish
- **v9.0.496** (this ship)
- Test install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- Dispatch: `auto-publish-on-push.yml` on `master` after push

## Deferrals
- `ir_blaster`, `smartPlug_DinRail` bare leftovers (fat)
- Monthly Community Sync runner rebase race (re-run later / concurrency)
- Forum sticky truncated mfrs (`_TZ3000_CEHUW1L2` etc.) — ignore
- #513 close only after Finnamu confirms hot-water + battery on ≥9.0.494
