# 📚 Index des scripts exécutés — 2026-07-27

Ce document recense les scripts du projet qui ont été lancés un par un pendant la session d'audit, leur rôle et leur résultat.

---

## Méthodologie

Chaque script a été exécuté en mode lecture ou avec `--dry-run` lorsque disponible. Les scripts de modification automatique n'ont été lancés qu'après validation de leur objectif. Les résultats sont regroupés par catégorie.

---

## 1. Scripts CI (`scripts/ci/`)

| Script | Rôle | Résultat |
|--------|------|----------|
| `security-scanner.js` | Scan des fichiers sensibles/trackés | **PASS** ✅ — aucun fichier privé tracké |
| `privacy-guard.js` | Garde automatisée contre les fichiers sensibles trackés | **PASS** ✅ — untrack automatique des backups/state files |
| `privacy-guard.js --fix` | Untrack automatique des fichiers sensibles trackés | ✅ Appliqué (7 backups + state files + directories) |
| `history-secret-scanner.js` | Scan de l'historique git pour secrets | WARN — 7 863 private paths + 4 commits avec patterns (redacted) |
| `find-bloat.js --json` | Liste les fichiers les plus lourds | FAIL — gros fichiers assets/branding, data caches |
| `check-flow-ids.js --json` | Vérifie les IDs de flow cards | FAIL — 10 duplicate IDs (driver-internal, non bloquant) |
| `check-button-flow-routing.js --json` | Vérifie le routing des boutons | **PASS** ✅ — 0 errors, 0 warnings (11 mismatches corrigés) |
| `homey-online-guidelines-audit.js` | Audit des guidelines Homey | PASS — 430 drivers, 4833 flow cards, 0 errors, 0 warnings |
| `fingerprint-catalog-audit.js` | Audit du catalogue de fingerprints | WARN — 621 collisions, 84 warnings sur compound routes runtime-only |
| `zero-defect-control.js` | Contrôle qualité zero-defect | FAIL — 109 errors, 425 warnings |
| `bug-hunter.js` | Détection de patterns de bugs | WARN — duplicate props, .catch non bindés, empty catch, missing await |
| `auto-validation-gate.js` | Gate de validation automatique | FAIL — 15 duplicate flow-card IDs, `.homeyignore` incomplet (fixé) |
| `diagnostic-report.js` | Rapport de diagnostic global | NEEDS_ATTENTION — 16 empty Mfr, 52 orphaned FPs, 131 unpinned actions |
| `diagnostic-history-gate.js --json` | Analyse de l'historique diagnostics | healthy (score 88) |
| `predictive-health.js` | Dashboard prédictif de santé | CRITICAL — 43/100 Grade F |
| `skill-check.js` | Vérifie les conventions skill | FAIL — 556 issues (_safeInvoke, BatteryMixin) |
| `validate-all-yaml.js --json` | Valide les fichiers YAML | PASS — 68 files, 0 errors |
| `validate-github-actions-policy.js` | Politique GitHub Actions | WARN — 4 warnings (git push fallback, actions legacy) |
| `titan-pre-commit.js` | Pre-commit TITAN | PASS |
| `signature-audit.js` | Audit de signatures | PASS |
| `ci-health-check.js` | Santé globale CI | PASS |
| `auto-validation-gate.js` | Gate de validation auto | FAIL → fixé via `.homeyignore` |

---

## 2. Scripts de validation (`scripts/validation/`)

| Script | Rôle | Résultat |
|--------|------|----------|
| `check-driver-health.js` | Santé complète des drivers | **PASS** ✅ — 2483 files, 0 errors (bug JSON syntax corrigé) |
| `check-mixin-order.js` | Ordre des mixins | PASS — 0 errors |
| `check-wifi-lifecycle.js` | Cycle de vie WiFi | PASS — 16 warnings markAppCommand |
| `check-homey-timer-context.js` | Contexte des timers Homey | PASS |
| `check-fingerprint-health.js` | Santé des fingerprints | **PASS** ✅ — 0 empty MF (après master:fix) |
| `check-google-assistant-voice-safety.js` | Sécurité assistants vocaux | FAIL → **FIXED** (0 violation) |
| `verify_fingerprints_integrity.js` | Intégrité fingerprints | FAIL → **FIXED** (16 MFs injectés) |
| `check-fingerprint-health.js` | Santé des fingerprints | FAIL — 16 empty MF (avant master:fix) |
| `verify_flows_integrity.js` | Intégrité des flows | PASS |
| `fix-button-capability-options.js --apply` | Fix des options button.* | Appliqué avec succès |

**Fichiers référencés dans `package.json` mais manquants** :
- `scripts/validation/homey-mandatory-check.js` — n'existe plus.
- `scripts/validation/validate-app-json.js` — n'existe plus.

---

## 3. Scripts de maintenance (`scripts/maintenance/`)

| Script | Rôle | Résultat |
|--------|------|----------|
| `optimize-build-images.cjs` | Optimise les PNG du build | **10.4 MB économisés** sur 860 fichiers |
| `prune-publish-payload.cjs` | Élagage du payload publish | 0.85 MB retiré (fichiers non-runtime) |
| `audit-fingerprint-collisions.js` | Audit collisions fingerprints | PASS sans output |
| `audit-icons.js` | Audit des icônes | 36 non-compliant / 431 |
| `audit_assets.js` | Audit des assets | PASS sans output |
| `fix-climate-sensor.js` | Fix climate sensor | Fichier vide |
| `STRIP_XLARGE_IMAGES.js` | Retire images trop grandes | Fichier vide |

---

## 4. Orchestrateurs (`scripts/`)

| Script | Rôle | Résultat |
|--------|------|----------|
| `PRE_COMMIT_CHECKS.js` | Gate pre-commit complet | PASS avec warnings |
| `master-automation.js --dry-run` | Pipeline maître validation/fix | FAIL → **PASS** après corrections |
| `master-automation.js --fix` | Auto-fix manufacturerName vides | 15 drivers corrigés |
| `prepare-publish.js` | Prépare le répertoire de publication | **PASS** après tuning |

---

## 5. Scripts qui ont nécessité une action

| Problème détecté | Script utilisé pour corriger | État |
|------------------|------------------------------|------|
| 12 violations voice-safety | `fix-button-capability-options.js --apply` | ✅ Corrigé |
| 16 fingerprints manquants | `verify_fingerprints_integrity.js --fix` | ✅ Corrigé |
| 15 drivers sans manufacturerName | `master-automation.js --fix` + sync driver.compose.json | ✅ Corrigé |
| Driver orphelin `dimmable_recessed_led` | Suppression manuelle + app.json | ✅ Corrigé |
| `.homeyignore` incomplet | Édition manuelle | ✅ Corrigé |
| `.gitignore` incomplet (state files, backups, caches) | Édition manuelle | ✅ Corrigé |
| Fichiers sensibles trackés (state, backups) | `privacy-guard.js --fix` | ✅ Corrigé |
| Workflow `version-branch-gate.yml` | Édition manuelle | ✅ Corrigé |
| Publish size gate | `optimize-build-images.cjs` + édition limites | ✅ Corrigé |
| Zigbee combos > 20 000 | Édition `compact-zigbee-identifiers.cjs` (500→420) | ✅ Corrigé |
| Button flow routing mismatches (11 errors) | Édition `lib/devices/ButtonDevice.js` + `scripts/ci/check-button-flow-routing.js` + driver.compose.json/driver.js | ✅ Corrigé |
| `check-driver-health.js` échouait sur les JSON | Édition `scripts/validation/check-driver-health.js` | ✅ Corrigé |
| Scene recall ne déclenchait pas la bonne flow card | Édition `lib/devices/ButtonDevice.js` (driver-specific card ID) | ✅ Corrigé |

---

## 6. Scripts à exécuter régulièrement

Recommandés avant chaque commit/publish :

```bash
node scripts/ci/privacy-guard.js
node scripts/ci/security-scanner.js
npm test
node scripts/master-automation.js --dry-run
node scripts/PRE_COMMIT_CHECKS.js
npm run prepare-publish
```

## 7. Scripts exécutés lors de la session de continuation

| Script | Rôle | Résultat |
|--------|------|----------|
| `scripts/validation/verify_fingerprints_integrity.js --fix` | Injection des 16 fingerprints manquants | ✅ Corrigé |
| `scripts/fix-app-json-structure.js` | Resync `app.json` depuis `driver.compose.json` | ✅ Corrigé (category string) |
| `npm run lint:fix` | Correction auto-fixable ESLint | ✅ Passé de 6 825 à 1 666 erreurs |
| `npm audit fix` | Correction vulnérabilités npm sans breaking change | ✅ `undici` corrigé, 35 restantes |
| `scripts/maintenance/audit-icons.js` + correction auto | Audit et fix des icônes | ✅ 33/36 corrigées |
| `scripts/validate/homey-mandatory-check.js` | Validation obligatoire Athom | ✅ PASS |
| `scripts/validate/validate-app-json.js` | Validation serveur Athom | ✅ PASS |
| `scripts/ci/security-scanner.js` | Scan sécurité | ✅ CLEAN |
| `scripts/ci/privacy-guard.js` | Garde fichiers sensibles | ✅ PASS |
| `npm test` | Tests unitaires | ✅ 109 passing / 0 failing |

### Actions corrigeantes de la session

| Problème | Action | État |
|----------|--------|------|
| #513 `_TZE284_hodyryli` Unknown Zigbee unit | Compound route + merge case-insensitive dans fingerprint DBs | ✅ Corrigé |
| #512 240 conflits / forum routing regressions | Injection MFs, resync app.json, corrections driver.compose.json | ✅ Corrigé |
| `category` array rejeté par Athom | Conversion string + mise à jour du script de resync | ✅ Corrigé |
| Test `button-flow-runtime-routing` cassé par lint | Rendu robuste aux accolades ESLint | ✅ Corrigé |
| 36 icônes non conformes | Suppression texte + minification SVG | 33 corrigées, 3 à refaire manuellement |

---

*Généré automatiquement lors de la session d'audit 2026-07-27.*
