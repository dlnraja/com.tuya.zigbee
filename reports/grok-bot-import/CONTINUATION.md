# Grok Bot → Cursor continuation (refresh 2026-10-11 ~22:30 Paris)

Imported from `AppData/Roaming/Grok Bot` (sanitized) + live git tips + `docs/knowledge/PORT_ROUND_2026-10-11.md`.
**No secrets. No forum auto-posts. No CloudAgent. Forfait: no Grok/Opus/cloud Task.**

## Athom tips (2026-10-12 ~09:20 Paris)

| App | Test tip | Evidence |
|---|---|---|
| Universal (`master`) | **9.0.1435** (#3554) | 1436/1438 socket hang up, 1437 AggregateError (processing_failed); retry rides the next master push |
| Bastien (`bastien-home`) | **1.0.149** (#157) | Draft→Test Fleet 38182409345 |
| Stable (`stable-v5`) | **5.12.406** (#313) | Draft→Test Fleet 38182409345; mfs_db drift fixed 401dede6bb [skip ci] |

## Athom tips (close-out)

| App | Tip | Evidence |
|---|---|---|
| Universal (`master`) | **9.0.1433 Test** | Auto-Publish `[athom-final] OK` |
| Bastien (`bastien-home`) | **1.0.148 Test** (git tip `f1f76d5968`) | Publish Zigbee Bastien + Node22 green |
| Stable (`stable-v5`) | **5.12.399 Test** (#307) | Draft→Test; PRs #564–#566 |

## Done today (do not redo)

- Fold held SPI / whd02 couples into existing drivers (`led_controller_rgb`, `switch_1gang`); dedicated ids stay on hold.
- Athom new-driver AggregateError: fold path wins; identical content can fail then pass (retry ≤2 with version bump).
- One reliable source SSOT: `docs/rules/COUPLE_SOURCE_POLICY.md` on master / stable / bastien.
- HOBEIAN ZG-101ZS + `_TZ3000_bgtzm4ny`/TS0044 → `scene_switch_4` (off `button_wireless_4`) — all three apps.
- AutomatOn 5-zone `j0ktmul1` → `switch_4gang`; FUT089Z → `button_wireless_4`.
- One-source placements: aj0oxo1i gas, 6oabgtzv water, fa9mlvja bw1, kjfzuycl remote, fdxihpp7 / qezuin6k pins.
- MS-104Z (`iuepbmpv`/TS0121) stays in smartplug (sole couple of that type).
- Bot append-only for climate pid lists (no reorder).


## Night update 2026-10-11T21:29

- Peter c05db40d: OOM closed (AppVersion head-read >=9.0.1330).
- wrmhp6b3|TS0601 → soil_sensor (Z2M CS-201Z).
- ogyg1y6b + 5cu64znk |TS0105 → curtain_motor (ZBCMR-01/02; shutter forbidden).
- Johan exact placed: 85czd6fy/ww9i3e0y water; key8kk7r/rrjr1q0u/yw5tvzsk button_wireless_3; bagt1e4o|TS0014 switch_4gang; e98krvvk|TS0012 switch_2gang.
- Tips pushed: master rebased over 1435; bastien soil TS0105 strip for push gate; stable branch port/soil-curtain-one-source.
- Still open: Switcher soak port; remaining johan_only_unverified; ledger W4/W7.

## Still open (priority)

1. **Tracks:** Johan mfrs with ambiguous pid (7) — wait for exact pid from any one reliable source (`LOST_COUPLES_RESTORE_2026-10-11.md`). Partial: `_TYZB01_6g8b7at8`+TS0012 already on `switch_2gang`.
2. **Switcher timer / on-for-minutes** → stable + Bastien only after **7-day** soak on master Test (cards on 9.0.1433 ~17:17 Paris; port ~2026-10-18).
3. **Empty remote shells** (`remote_button_wireless*`) — leave as-is (paired devices keep working).
4. **Ledger W4 conflicts / W7 polysemic DP / P2 Wi-Fi** — standing queue (`ledger-cli.js queue`).

## Closed this evening (do not reopen)

- `_TZE600_ogyg1y6b`|TS0105 + `_TZE600_5cu64znk`|TS0105 → `curtain_motor` (Z2M ZBCMR-01/02; shutter forbidden; soil TS0105 junk stripped).
- `_TZE200_wrmhp6b3` → `soil_sensor` (Z2M COOLO CS-201Z; off curtain).
- Forum T140352 **#2259** = Peter `c05db40d` OOM — already fixed ≥9.0.1330 (tip 9.0.1433); no new couples.

## Worktrees

| Path | Branch | Role |
|---|---|---|
| `homey/master` | `master` @ 9.0.1433 | Universal Tip |
| `homey/bastien` | `bastien-home` @ `f1f76d5968` | Bastien house |
| `homey/stable-v5-p195` | `stable-v5` (often behind) | Prefer `origin/stable-v5` tip |
| `homey/stable-hobeian-fix` | `fix/stable-pr-gate-skip-missing` | CI PR-gate skip |

`master` cannot be checked out inside the bastien worktree (already locked by `homey/master`).

## Files

- Fresh extract: `extract-667147.md` (+ other new extracts from reimport)
- Doctrine: `docs/rules/COUPLE_SOURCE_POLICY.md`, `docs/knowledge/HOBEIAN_ZG101ZS_SCENE_SWITCH_2026-10-11.md`
- Port matrix: `docs/knowledge/PORT_ROUND_2026-10-11.md`
- Importer: `tools/ci/import-grok-bot-prompts.js` (`npm run import:grok-bot`)
