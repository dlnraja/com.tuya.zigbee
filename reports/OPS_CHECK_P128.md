# OPS_CHECK_P128 — 2026-08-14

## Verdict
**Deployed path:** v9.0.492 already published to Homey Test (run 31777073023 success).  
**This pass:** GH #513 scale/battery fix shipped as **v9.0.494** (remote had already taken 9.0.493 for an auto FP bump).

## Git / versions
| Item | Value |
|---|---|
| Pre-pass HEAD | `4578abf43` v9.0.492 P127 |
| Origin at start of bump | `1b06b57bc` v9.0.493 (auto-fix / inbox, skip ci) |
| This commit | v9.0.494 P128 |

## GitHub
- Open issues: **#513** only (left OPEN — pairing already worked; remaining was scale/battery)
- Open PRs: none
- #516 humidity: already CLOSED after P127

### #513
User Finnamu: pairing works since ~v9.0.357. Latest reports (Aug 13): temp/humidity jump ×10 around 52–53°C, battery 100% ↔ 2%.

Root causes (not missing FP / not prepare-publish strip):
1. `ProductValueValidator` typicalRange max **50** made raw 530 prefer ÷100 (5.3°C) over ÷10 (53°C).
2. Learned divisor re-applied to already-scaled values (53 / 10 = 5.3).
3. ZT08 DP3 is **battery_state enum** 0/1/2 → must be 10/50/100, not raw 2%.

FP `_TZE284_hodyryli` TS0601 still in `climate_sensor` (4 case variants). Not closed until user confirms hot-water + battery.

## Workflows
| Run | Workflow | Result |
|---|---|---|
| [31777073023](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31777073023) | Auto-Publish on Push (dispatch) | **success** — v9.0.492 on Test |
| 31777069999 | Auto-Publish on Push (push twin) | cancelled (concurrency) — expected |
| P127 HEAD | Unified CI, Syntax Check, Auto-Fix, Pages, continuous-flow | **success** |
| [31781523726](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31781523726) | Forum Poll | success (silent/dry-run policy) |
| [31778462982](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31778462982) | Gmail Diagnostics | success |
| [31786152338](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31786152338) | Gmail Auth Health | success |
| [31786457346](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31786457346) | Publish Self-Heal | success |
| [31675715739](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31675715739) | Version Health (13 Aug, SHA before 9.0.492) | failure — stale vs current Test build; re-run after 9.0.494 |
| P122–P125 Unified CI | older SHAs | superseded; P127 Unified CI green |

Workflow hygiene: 60/60 yml have `shell: bash`; sampled jobs still have `timeout-minutes`.

## Local gates (this pass)
All green: gmail-crash-pattern, anti-bot, bare-zigbee, fp-collision `--baseline`, adaptive-double-division `--hard`, unbound-catch `--gate`.  
Tests: 30/30 on #513 scale + fingerprint suites.

## Publish
Dispatch `auto-publish-on-push.yml` on master after push of v9.0.494.
