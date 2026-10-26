# P3062 — Worktree rescue and triage (2026-10-26)

Why this exists: 76 git worktrees had piled up on the automation box (`/workspace/*`, `/tmp/*`).
Many held uncommitted or unpushed work. Before deleting anything, every worktree with changes was
committed as-is and pushed to `origin/wip/rescue/<name>` (74 refs, `[skip ci]`, no history
rewrite). Those refs are the safety net: nothing below is lost, even what is classed as noise.

Categories:

- **(a) already present**: the change is already on the target branch, sometimes in a better form.
- **(b) noise**: regenerable output (reports, version bumps, dashboards, checkpoints) or empty.
- **(c) valuable**: integrated in this pass, or parked when it would add Zigbee couples (budget).
- **(d) superseded / conflicting**: deliberately not taken; the reason is noted.

## Counts

| Category | Worktrees | Notes |
|---|---|---|
| (a) already present | 6 | wt-dp, agg-wt (prune), b1019 (sweep loop + 6 couples), reprise-a-1010b / reprise-stable-1010 (7 couples), soil-1013 (heobian brand) |
| (b) noise | 63 | 58 worktrees with zero non-noise files + bj, val-wt, merge-held, xr-stable-v5, HEAD sweep chunk of reprise-a-1010b |
| (c) integrated | 6 | sdk-master/sdk-stable-v5, agg-wt/wa-master (token refresh), b1019 (sweep robustness), soil-1013/wa-master (padded mfr), reprise-b-1010 (Wi-Fi) |
| (c) parked | 3 | ded-master (P2962), stable-only light/plug couples, reprise-a-1010b self-check lines |
| (d) superseded | 6 | p3024-phold, r1025-*, DynamicFlowCardManager refactor, changelog rewrite, dfgbtub0 move, pe-stable-v5 port |

(Some worktrees carry pieces in several categories; each one is counted under its main outcome.)

## (c) Integrated on master (behaviour changes: master only; ported after soak)

| Commit topic | Source worktree | What | Test |
|---|---|---|---|
| Homey SDK v3 rules (report-only) | sdk-master, sdk-stable-v5 | `tools/ci/homey-sdk-rules*.js`, data + hash, doc `HOMEY_SDK_RULES.md`, pr-gate step in report-only mode. The changelog normalizer ships as a library only: master's `.homeychangelog.json` still has a legacy `changelog` wrapper (48 entries live only there, and two scripts read it), so rewriting it would lose data. | `p2964-homey-sdk-rules.test.js` |
| Athom token refresh while waiting for a draft | agg-wt, wa-master | `wait-athom-draft-ready.js`: a 401 / "token is invalid" during the wait builds a new client instead of failing the run. **Also on stable-v5 and bastien-home (CI fix).** | `p3062-wait-draft-token-refresh.test.js` |
| Forum sweep robustness | b1019 (P2870) | `sweep-forum.js` retries with settle guards; Johan index pull-comments fetch is soft; P2830 couple-mode forbid is pid-scoped. | `p3062-sweep-robustness.test.js` |
| Padded manufacturer names (#570/#571) | soil-1013, wa-master | `String(mfr).trim()` before protocol detection and MCU negotiation. | `p3062-padded-mfr-io-trim.test.js` |
| Wi-Fi local conversions | reprise-b-1010 | Colour temperature direction (Tuya 0 = warm, Homey 0 = cold) with an opt-in `color_temp_reversed` setting; enum fan ladders; string thermostat modes; opt-in time-based cover estimator (`travel_time_s`, merged with master's P2952 position-source logic); opt-in battery sleep window; opt-in gateway heartbeat and a 64-sub-device cap in the Wi-Fi Zigbee bridge. New settings are Wi-Fi drivers only: no Zigbee combo added. | `p3062-wifi-local-conversions.test.js` |
| `_TZE200_amp6tsvy` hint | reprise-b-1010 | The fingerprint hint said switch_2gang/MULTIGANG while the compose owner is switch_1gang (Moes ZTS-EU1). Sources in the code comment: zigpy/zha-device-handlers#813, martinkura-svk Hubitat Moes driver, JohanBendz#1319. | `p3062-amp6tsvy-1gang-hint.test.js` |

## (c) Parked: adds Zigbee couples, no room under the 15500 combo budget (P3057 queue)

There is no P3057 queue file yet; this list is the queue.

| Couple(s) | Target | Source | Why parked |
|---|---|---|---|
| 31 couples, 13 **new** driver IDs | various | ded-master (P2962) | Over budget, and new driver IDs need their own review. Kept on `wip/rescue/ded-master`. |
| `_TZ3210_ejctepku` + TS0505B | light_rgbcct_ts0505b | Johan #665 (on stable, not master) | Budget. |
| `_TZ3210_invesber` + TS0502B | light_cct_ts0502b | Johan #824 | Budget. |
| `_TZ3000_f1bapcit` (smartplug) | smartplug | on stable, not master | Budget. |
| Self-check forum sweep / OCR lines | scripts | reprise-a-1010b | Minor; can come in any time, no couples. |

## (d) Not taken, on purpose

| Item | Source | Reason |
|---|---|---|
| Bisect worktree | p3024-phold | Bisect finished; nothing to keep. |
| 17000 / 20000 combo caps | r1025-stable-v5, r1025-bastien-home | Conflicts with the 15500 cap enforced by the workflows. |
| DynamicFlowCardManager refactor | agg-wt | Cosmetic, no behaviour gain, merge risk. |
| `.homeychangelog.json` rewrite / `normalize --write` | sdk-master | Would drop the legacy `changelog` wrapper (data loss). |
| `_TZ3000_dfgbtub0` + TS0042 → wall_remote_2_gang | b1019 | Master already serves it on button_wireless_2; moving a live couple re-pairs users. |
| Profile-engine port to stable | pe-stable-v5 | Behaviour change: port after the master soak, within stable's ~2-combo margin. |
| PHANTOM_DUAL proposal | (doc) | Documentation only. |

## Rules applied

- Additive only, exact manufacturer + product couples only, nothing invented, one test per change.
- Data/CI/safety fixes go on all three branches. Behaviour changes go on master only.
- `[skip ci]` on pushes to publishing branches during the P3036 hold; the test workflow is dispatched by hand instead.
- No `--no-verify`, no force-push, no history rewrite. Remote branches are never deleted.
