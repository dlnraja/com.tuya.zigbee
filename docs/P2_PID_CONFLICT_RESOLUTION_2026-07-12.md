# 🎯 Sprint P2 Report — 241 PID Conflicts Resolution

**Date** : 2026-07-12 12:00
**Sprint** : P2 (PID Conflicts)
**Résultat** : **0 real conflicts** (était 1) ✓
**Build** : validated publish level PASS
**Drivers affected** : 1 (climate_sensor), 1080 notes added across 241 drivers

---

## 📊 Résumé exécutif

| Métrique | Avant P2 | Après P2 | Δ |
|----------|----------|----------|---|
| Total PID conflicts | 241 | 241 | — |
| Real conflicts (mfr overlap) | **1** | **0** | **-1** ✓ |
| False positives (Sacred Couple OK) | 240 | 241 | +1 (TS0201 fixed → reclassifié) |
| HIGH severity (cross-class) | 74 | 74 | — |
| MEDIUM severity (>3 drivers same class) | 23 | 23 | — |
| MFR+PID duplicates (real risk) | 0 | 0 | — |
| Orphan drivers | 59 | 59 | — |

**Sacred Couple rule** (`.agents/rules/fingerprint-management.md`) :
> Homey matches devices on the **PAIR (manufacturerName + productId)**, not PID alone.
> Same PID in multiple drivers is **OK** if their mfrs are DISTINCT.

→ **240/241 conflicts are FALSE POSITIVES by design** (mfrs are distinct).
→ **1/241 was a REAL conflict** (TS0201 with overlapping mfrs) → **FIXED**.

---

## 🔧 FIX APPLIQUÉ : Sacred Couple TS0201 (1 seul vrai conflict)

**Problem** :
- PID `TS0201` shared between `air_purifier` (class: fan) and `climate_sensor` (class: sensor)
- 10 mfrs shared between both drivers (true overlap)

**Shared mfrs** (10) :
```
_TZE200_6wi2mope, _TZE200_upagmta9, _TZE204_c2fmom5z,
_TZE204_qyflbnbj, _TZE204_yvx5lh6k, _TZE284_9yapgbuv,
_TZE284_qyflbnbj, _TZE284_upagmta9, _TZE284_utkemkbs,
_TZE284_yjjdcqsq
```

**Analyse** : Ces 10 mfrs sont des **Tuya air quality monitors** (PM2.5 + temp/humidity). Le `air_purifier` driver a la capability `measure_pm25` qui est la plus spécifique.

**Sacred Couple fix** : retirer les 10 mfrs de `climate_sensor`, les garder dans `air_purifier`.

**Résultat** :
| Driver | Avant | Après |
|--------|-------|-------|
| `air_purifier` | 75 mfrs | 75 mfrs (10/10 conservés) |
| `climate_sensor` | 694 mfrs | **684 mfrs** (10 retirés) |

**Vérification** : re-run `driver-conflict-audit.js` → 0 real conflicts ✓

**Script** : `tools/ci/fix-pid-conflict-sacred-couple.js --apply`
- Dry-run + apply + revert modes
- Test : `--apply` retire 10 mfrs, vérifie que source les a toujours, sauvegarde rapport

---

## 📝 240 False Positives documentés (Sacred Couple OK)

| PID | Drivers | Cross-class | Reason |
|-----|---------|-------------|--------|
| `TS011F` | 43 | YES | mfrs distinct (Sacred Couple OK) |
| `TS0001` | 35 | YES | mfrs distinct |
| `Excellux` | 30 | YES | mfrs distinct |
| `TS0215A` | 28 | YES | mfrs distinct |
| `TS0002` | 27 | YES | mfrs distinct |
| `TS0726` | 21 | YES | mfrs distinct |
| `TS0003` | 20 | YES | mfrs distinct |
| `TS0225` | 19 | YES | mfrs distinct |
| `TS0505B` | 19 | YES | mfrs distinct |
| `TS004F` | 19 | YES | mfrs distinct |
| `TS0201` | 18 | YES | mfrs distinct (Sacred Couple OK) — REAL conflict FIXED |
| ... 230 more | | | |

**Action** : pour chaque conflict, une note explicative a été ajoutée dans `driver.compose.json._pidConflictNotes` (1080 notes au total).

Exemple de note :
```json
{
  "_pidConflictNotes": [
    "// PID-CONFLICT-NOTE TS011F shared with 42 other drivers (cross-class; mfrs distinct (false positive)). Sacred Couple rule applies: mfr+PID pair disambiguates. See: docs/P2_PID_CONFLICT_RESOLUTION_2026-07-12.md"
  ]
}
```

---

## 🛠️ Scripts créés / utilisés

| Script | Status | Action |
|--------|--------|--------|
| `.github/scripts/driver-conflict-audit.js` (existant) | READ | Détecte 241 PID conflicts |
| `.github/scripts/fix-pid-conflicts-p2.js` (NEW) | ✅ APPLIED | Ajoute notes aux 240 false positives (1080 total) |
| `.github/scripts/fix-pid-conflict-sacred-couple.js` (NEW) | ✅ APPLIED | Fix 1 real conflict (10 mfrs moved) |

**Modes** : tous les scripts supportent `--apply` (modify files) et `--revert` (revert changes).

---

## 📂 Fichiers modifiés

### Driver fix (1)
- `drivers/climate_sensor/driver.compose.json` :
  - `manufacturerName`: 694 → 684 mfrs (10 retirés)
  - `_sacredCoupleFixes`: ['// FIX-PID-SACRED-COUPLE: 2026-07-12 — removed 10 TS0201 overlapping mfrs (kept in air_purifier which has measure_pm25)']

### Drivers avec notes (241)
- Tous les drivers impliqués dans un PID conflict ont maintenant un tableau `_pidConflictNotes` qui documente le conflict et indique que Sacred Couple s'applique.

### Reports (5 nouveaux)
- `.github/state/pid-conflict-p2-report.json` (rapport complet)
- `tools/ci/diagnostics/pid-conflict-p2-2026-07-12.txt` (output dry-run)
- `tools/ci/diagnostics/driver-conflicts-2026-07-12.txt` (audit output)
- `docs/P2_PID_CONFLICT_RESOLUTION_2026-07-12.md` (ce fichier)

---

## ✅ Validation

```
✓ homey app validate --level publish : PASS
✓ pre-commit-checks.js               : PASS (2006 files)
✓ driver-conflict-audit.js           : 0 real conflicts
✓ fix-pid-conflicts-p2.js            : 0 real conflicts
✓ climate_sensor 10 mfrs removed     : OK
✓ air_purifier 10 mfrs preserved     : OK
```

---

## 📈 Top mfrs dans TS011F (43 drivers, false positive)

| Driver | mfr count | Class | Sample mfrs |
|--------|-----------|-------|-------------|
| `air_purifier_motion` | 7 | fan | `_TZ3000_jl7qyupf`, `_TZ3000_lmlsduws` |
| `button_wireless_2` | 225 | sensor | `_tz3000_tzvbimpq`, ... (catch-all) |
| `button_wireless_plug` | 32 | socket | `_tz3000_2xlvlnez`, ... |
| `button_wireless_usb` | 2 | socket | `_GENERIC_BUTTON_WIRELESS_USB` |
| `device_air_purifier_plug` | 4 | socket | `_tze200_7bztmfm1`, ... |
| `device_din_rail` | 4 | doorbell | `_tz3000_gzvniqjb`, ... |
| `device_din_rail_meter` | 2 | doorbell | `_hybrid_device_din_rail_meter...` |
| `device_plug_energy` | 2 | socket | `_master_device_plug_energy...` |
| `plug` | 1 | socket | (placeholder) |
| `smartplug` | 1 | socket | (placeholder) |
| ... 33 more drivers | | | all mfrs DISTINCT |

**Conclusion** : tous les mfrs sont distincts entre drivers → Sacred Couple rule garantit qu'Homey choisit le bon driver pour chaque device.

---

## 🎯 Prochaines étapes

### Pour ce sprint (P2) - TERMINÉ ✓
- [x] Analyser les 241 PID conflicts
- [x] Identifier le 1 real conflict (TS0201)
- [x] Appliquer le Sacred Couple fix
- [x] Documenter les 240 false positives
- [x] Valider le build (publish level PASS)
- [x] Créer les scripts (--apply / --revert)

### Pour P3 (optionnel)
- [ ] Backport le fix vers `stable/` (v5.11.220)
- [ ] Examiner les 18 "Misplaced FPs in generic_tuya" (cf. rapport précédent)
- [ ] Examiner les 7 drivers avec empty mfrName (déjà fixed pour AggregateError)
- [ ] Merger PRs #508, #509, #510

### Pour P4 (long terme)
- [ ] Variant scanner apply (4433 missing variants)
- [ ] Driver priority enforcement (HIGH > MEDIUM > LOW)
- [ ] Active Gmail OAuth (récupérer vraies données)
- [ ] Activer Computer Use dans Mavis (browser automation)

---

## 📊 Sprint P2 totals

| Métrique | Valeur |
|----------|--------|
| Time to complete | ~20 min |
| Lines of code added (scripts) | 397 (fix-pid-conflicts-p2 + fix-pid-conflict-sacred-couple) |
| Drivers analyzed | 430 |
| Drivers modified | 241 (notes) + 1 (real fix) |
| Real conflicts found | 1 |
| Real conflicts fixed | 1 (100%) |
| False positives documented | 240 (1080 notes) |
| Build status | ✓ PASS |
| Re-audit | 0 real conflicts |

**L'app est plus saine qu'avant P2. Sacred Couple fix appliqué. 0 real conflicts restants.**
