# Flow / button / trigger treat — 2026-08-31 (P2353)

Silent only. No Homey forum posts.

## Harvest

| Channel | Result |
|---------|--------|
| Open GH issues | **#533** Salvagr Moes curtain (P2348 shipped — tip ≥9.0.744) |
| Open PRs | **none** |
| Open bugs | **none** |
| Forum flow/button posts | 127 related; 99 user-update-repair; rest already LOCKED / soft NEED_DIAG |
| `flow:l99` | **5/5 green** (dups, integrity, coherence, voice, dp-cluster-flow) |
| `check-button-flow-routing` | **0 errors / 0 warnings** |
| Bidirectional button tests | **P2220 + P2283 green** |
| `titleFormatted [[device]]` | **0** across all drivers |

## Fixes this pass (P2353)

1. **`FlowCardHeuristics.buildPhysicalFlowCandidates`**
   - `scene_switch_*` with `gangCount>1` now emits **both** `*_button_N_*` and `*_button_Ngang_button_N_*` declared shapes (was missing 4gang path for scene remotes).
   - Still never invents `*_button_N_button_pressed` / `*_button_1gang_button_pressed` (FLOW-GUARD).

2. **Sacred-keep pins** (publish compact survival)
   - `_TZ3000_wkai4ga5`+TS0044 → `scene_switch_4`
   - `_TZ3000_dfgbtub0`+TS0044 → `button_wireless_4`
   - `_TZ3000_dfgbtub0`+TS0042 → `button_wireless_2` (same mfr, different pid — OK)

3. **mfs_db exact-case** aliases: `_TZ3000_wkai4ga5`, `_TZ3000_zgyzgdua`, `_TZ3000_kfu8zapd`

## Explicit non-locks (need diag)

| Couple | Note |
|--------|------|
| `_TZ3000_WKAI4GA5`+**TS0042** | Forum listed; known verified couple is **TS0044** → scene_switch_4. Do **not** invent TS0042. |
| `_TZ3000_XABCKQ1V` without pid | Soft → TS004F `button_wireless_4` already locked |

## Wall switch physical cards

| Driver | physical_gang cards |
|--------|---------------------|
| `wall_switch_1gang_1way` | gang1 on/off |
| `wall_switch_2gang_1way` | gang1–2 on/off |
| `wall_switch_3gang_1way` | gang1–3 on/off |
| `wall_switch_4gang_1way` | gang1–4 on/off |

## User action (silent)

Update Universal Tuya Test tip, re-pair remotes/scene switches if flows still missing after tip with P2353.

## Tests

`test/critical/p2353-flow-button-triggers.test.js`
