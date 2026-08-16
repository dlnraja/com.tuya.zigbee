# P156 — RC1 LiveData OOM + RC2 sleepy DP recovery (fact-check) — 2026-08-16

Community-shaped explanation of Peter’s crash class. **Corrected** against tip code (not the v8.5.x story).

## RC1 — LiveDataUpdater heap OOM

| Claim (draft) | Tip reality |
|---------------|-------------|
| Crash = heap OOM ~64MB Homey Pro | **Yes** — Peter diag `96c19859` on **9.0.537** |
| Cause = load `data/fingerprints.json` 11.5MB at startup | **No** — tip `data/fingerprints.json` ≈ **15KB**; smoking gun was **GitHub Pages mfs segments** merged then written to Homey **settings** (`live_data_overlay`) |
| Fix versions v8.5.7–v8.5.14 | **Wrong line** — harden landed **P148** → Test **9.0.541+** (`LiveDataUpdater.js`) |

### Actual fix (in tree)
- Manifest version check **before** segment download  
- Overlay ≤ **1500** entries, store ≤ **~180KB**, request ≤ **2MB**  
- Clear oversized/invalid settings on boot  
- Skip fetch under heap pressure  

Code: `lib/dynamic/LiveDataUpdater.js`

Related (separate): large JSON DBs use **Buffer → JSON.parse** (no giant UTF-16 string) where loaders exist — not the same bug as LiveData settings merge.

## RC2 — Aggressive Tuya DP recovery on sleepy IAS

| Claim (draft) | Tip reality |
|---------------|-------------|
| Battery IAS/end devices sleep; poll-all-DPs is harmful | **Yes** |
| App blasted many Tuya DPs on wake / recovery | **Yes** on 9.0.537 (water leak + DATA-RECOVERY noise in Peter log) |
| Fix = skip aggressive EF00 poll; prefer IAS zone notifications | **Yes** — P148 `DataRecoveryManager` |

### Actual fix (in tree)
- Ignore phantom caps `tuya_dp_*`  
- **Skip** EF00 DP query blast when no Tuya cluster / no `dpMappings`  
- Fewer / slower queries when EF00 exists  
- IAS enroll still best-effort (timeouts while asleep are normal)  

Code: `lib/tuya/DataRecoveryManager.js`

## One-line summary

| Problem | Cause (accurate) | Fix tip |
|---------|------------------|---------|
| OOM | LiveData multi-segment overlay → Homey settings stringify | Cap + version gate + clear bad store (**9.0.541+**) |
| Sleepy noise | DP recovery polling IAS/ZCL-only devices | Skip EF00 blast when not a Tuya MCU device |

## User action
Update Homey Test to **≥ 9.0.541** (tip may already be **9.0.543**). New diagnostic only if crash persists.

Do **not** paste long RC essays to the forum unless Dylan asks for a short human note.
