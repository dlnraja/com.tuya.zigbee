# P24 — Multi-Source Driver Intelligence (2026-07-13)

## Trigger
User requested:
- "automatise tout ca et croise avec un max de souces et de rapports et de feedback d'uitilisateurs quelque soit le projet domotique meme alternaif ( zha , zém , momotics ect ect )"
- "utilise de la gamificaiton par ppoint pour des scores de confiaces et de fabilitées de drievrs"
- "soit permisifs auxc varaints"
- "implemneter de facon reguelire et silencisues tout les nouvelles demadnes et tickets de johan sans laisser de trace"
- "croisant un max de socues et projets alternatifs"
- "gerer dasn l'app master la possiblité de gerer toutes les appareils de faocn inteligente meme si tu les connais pas"

## Approach

### P24.1 — z2m/zigbee2mqtt base ✅
- Downloaded `tuya.ts` from zigbee-herdsman-converters (1.30 MB)
- Built `tools/ci/parse-z2m-tuya.js` to extract vendor+model+zigbeeModel[]
- **Result**: 563 unique vendor+model blocks from Tuya alone
- Also downloading all 188 vendor categories (background)

### P24.2 — ZHA quirks base ✅
- Downloaded all 68 vendor folders from zha-device-handlers repo
- Built `tools/ci/download-zha-quirks.js` with auth support
- **Result**: 204 unique (manufacturer, model) pairs from 137 quirks files
- Format: ZHA uses `MODELS_INFO: [(mfr, model), ...]` + older `signature = { ... }`

### P24.3 — deconz/Domoticz/openHAB ⏸️
- Not started yet (lower priority)
- deconz: similar format to z2m
- Domoticz/openHAB: not Zigbee-specific

### P24.4 — Driver Confidence Scoring (gamification) ✅
Built `tools/ci/driver-confidence-scoring.js` that scores every driver:

**Point system**:
- +10: z2m support (well-maintained, large community)
- +8:  ZHA quirks (official ZHA support)
- +6:  Sacred Couple match (cross-ref in mfs_db)
- +5:  mfs_db mapped
- -5×crashes: real bugs (capped at -30)
- +2×forum: community traction (capped at +10)

**Result on 379 drivers**:
- 🏆 Platinum (30+):  0
- 🥇 Gold (20-29):    0
- 🥈 Silver (10-19):  1 (sensor_contact_presence)
- 🥉 Bronze (0-9):    377
- ⚠️  Needs attention (<0): 1 (smart_knob_rotary - 30 penalty for crashes)

**Top 5 drivers**:
1. `sensor_contact_presence` (HOBEIAN/ZG-227Z) — +10 z2m
2. `lcdtemphumidsensor_plug_energy` (_TZE200_wfxuhoea) — +8 ZHA
3. `thermostatic_radiator_valve` (_TZE200_kly8gjlz) — +8 ZHA
4. `wall_thermostat` (_TZE200_aoclfnxz) — +8 ZHA
5. `bulb_rgbw` (_TZB210_nfzrlz29) — +6 sacred-couple

**Bottom 1 driver** (needs immediate attention):
- `smart_knob_rotary` (-30) — cascading class extends + registerRunListenerasync typo bug

### P24.5 — Permissive Variants ⏸️
- Not started
- Plan: Add fuzzy matching for similar manufacturer names (case-insensitive, partial match)
- Add synonym resolution (e.g., "_TZE200_*" → "_TZ300E_*" patterns)

### P24.6 — Auto-implement Johan in shadow mode ⏸️
- Already partially done in P12 (johan-dump + johan-enrichment)
- shadow-mode-runner cron runs every 6h
- Need to verify it's working correctly

### P24.7 — Deep bug investigation ⏸️
- 4 URGENT bugs from P19:
  1. `card.registerRunListenerasync` typo (cascade from class extends)
  2. Missing `_inferCapabilityFromValue` method
  3. Missing `safeSetCapabilityValue` method
  4. 3 class extends errors: smart_knob_rotary, wall_dimmer_1gang_1way, smart_scene_panel

### P24.8 — Smart Device Discovery ⏸️
- Not started
- Plan: Add heuristic capability detection for unknown devices
- Use cluster data + capability requests to infer types/ranges

### P24.9 — Auto-enrich Sacred Couple ⏸️
- Not started
- Plan: Run shadow-mode on every push to update sacred couples with:
  - Diag logs from users
  - Crash logs
  - Commit history references
  - Forum mentions
  - GitHub issues

## Files Created
- `tools/ci/parse-z2m-tuya.js` - Parse z2m tuya.ts
- `tools/ci/download-z2m-all.js` - Download all 188 z2m categories
- `tools/ci/download-zha-quirks.js` - Download all 68 ZHA folders
- `tools/ci/driver-confidence-scoring.js` - Gamification scoring
- `.github/state/z2m-pairs.json` - 563 Tuya pairs
- `.github/state/zha-pairs.json` - 204 ZHA pairs
- `.github/state/z2m-pairs-full.json` - In progress (all 188 categories)
- `.github/state/driver-confidence-scores.json` - 379 drivers scored

## Data Sources Count
| Source | Pairs | Notes |
|--------|------:|-------|
| z2m Tuya | 563 | From tuya.ts file |
| z2m full | (in progress) | All 188 categories |
| ZHA quirks | 204 | From 137 quirk files |
| mfs_db sacredCouples | 6,597 | P21 cross-ref |
| mfs_db driverMappings | 338 | P21 cross-ref |
| Crashes | 98 | P19 from 551 fresh emails |
| Forum mentions | 8 | P22 Discourse |

## Next Steps
1. Wait for full z2m download to complete (~10-20 min)
2. Fix the smart_knob_rotary crash bug (P24.7)
3. Implement permissive variant detection (P24.5)
4. Build smart device discovery (P24.8)
5. Hook scoring into shadow-mode-runner cron

## Stats
- Sources integrated: 5 (z2m, ZHA, mfs_db, crashes, forum)
- Drivers scored: 379
- Average score: 0.0 (most drivers have no cross-ref yet)
- New FPs discovered via z2m: TBD (after full download)
- New FPs discovered via ZHA: TBD (need to cross-ref with mfs_db)
