# Dashboard Diagnostics — 2026-07-28

Projet : `com.tuya.zigbee` (master, `C:/Users/Dell/Documents/homey/master`)
Environnement : Windows / Git Bash, Node v24.18.0, SDK Homey v3.
Toutes les commandes exécutées depuis la racine du projet. Aucun git commit/push.

---

## 1. Résultats par script

### scripts/dashboard/generate-coverage-dashboard.js
- **Rôle** : treemap des catégories de drivers, couverture fingerprints/images/clusters, gaps, top manufacturers.
- **Commande** : `node scripts/dashboard/generate-coverage-dashboard.js`
- **Résultat** : ✅ OK (exit 0, ~2 s).
- **Artefact** : `scripts/dashboard/coverage-dashboard.html` (139 KB, régénéré).

### scripts/dashboard/generate-driver-dashboard.js
- **Rôle** : métriques drivers (protocoles Zigbee/WiFi, complétude fichiers, classes de base, capabilities, timeline git).
- **Commande** : `node scripts/dashboard/generate-driver-dashboard.js`
- **Résultat** : ✅ OK (exit 0, ~3 s).
- **Artefact** : `scripts/dashboard/driver-dashboard.html` (79 KB, régénéré).

### scripts/dashboard/generate-dependency-dashboard.js
- **Rôle** : graphe `require()`, cycles, modules inutilisés, packages externes.
- **Commande** : `node scripts/dashboard/generate-dependency-dashboard.js`
- **Résultat** : ✅ OK (exit 0). 2056 fichiers scannés, 2965 `require()`, **0 dépendance circulaire**, 685 modules « inutilisés » (majoritairement des scripts d'automatisation standalone — faux positifs attendus).
- **Artefact** : `scripts/dashboard/dependency-dashboard.html` (31 KB, régénéré).

### scripts/dashboard/generate-error-dashboard.js
- **Rôle** : scan anti-patterns (console.log bannis, setTimeout global, settings keys, etc.) sur `drivers/` + `lib/`.
- **Commande** : `node scripts/dashboard/generate-error-dashboard.js`
- **Résultat** : ✅ OK (exit 0). **1277 findings**, KNOWLEDGE_CACHE chargé (12 anti-patterns).
- **Artefact** : `scripts/dashboard/error-dashboard.html` (1,2 MB, régénéré).

### scripts/dashboard/generate-performance-dashboard.js
- **Rôle** : tailles (app.json, projet, data/), LOC, syntax check, historique de tendances.
- **Commande** : `node scripts/dashboard/generate-performance-dashboard.js`
- **Résultat** : ✅ OK (exit 0). Syntax check : PASS (0 erreur). Historique mis à jour (8 entrées).
- **Artefacts** : `scripts/dashboard/performance-dashboard.html` (16 KB), `scripts/dashboard/performance-history.json` (append).

### scripts/dashboard/generate-master-dashboard.js
- **Rôle** : orchestrateur — collecte les métriques, relance les 5 sous-dashboards, agrège en une page avec liens croisés.
- **Commande** : `node scripts/dashboard/generate-master-dashboard.js`
- **Résultat** : ✅ OK (exit 0, ~18 s). Résumé : 431 drivers, 4 220 fingerprints, 4 844 flow cards, 186 279 LOC (lib), health **75/100**, 53 workflows, 604 scripts, 15 clusters, images 100 %.
- **Artefact** : `scripts/dashboard/master-dashboard.html` (42 KB, régénéré).

### scripts/diag/hobeian-consistency-check.js
- **Rôle** : vérifie le routage des productId HOBEIAN (ZG-*) vers les bons drivers. Lecture seule.
- **Commande** : `node scripts/diag/hobeian-consistency-check.js`
- **Résultat** : ❌ **exit 1 — 1 erreur de données** (le script fonctionne, c'est le projet qui est incohérent) :
  - `ZG-227Z` est dans `soil_sensor` — devrait être dans `sensor_contact_presence`.
  - OK : ZG-303Z, HOBEIAN dans 8 drivers (acceptable), BOT_FORCED_DISCOVERY non forcé.
- **Action** : non corrigé (toucherait `drivers/`, hors périmètre). À router manuellement.

### tools/ci/analyze-dashboard.js
- **Rôle** : analyse `dashboard-monitor-report.json` / `version-intelligence-report.json` dans `.github/state/all-diagnostics-2026-07-13/`.
- **Commande** : `node tools/ci/analyze-dashboard.js`
- **Résultat avant fix** : ❌ crash `TypeError: The "path" argument must be of type string... Received null` — le dossier d'état CI n'existe pas en local (gitignored, peuplé par les crawlers GHA).
- **Résultat après fix** : ✅ exit 0 avec message explicite « état CI non téléchargé en local — rien à analyser ».

---

## 2. Fixes appliqués

### Fix 1 — `scripts/dashboard/shared-collector.js` (`collectFingerprintMetrics`)
**Problème** : tous les dashboards affichaient **53 fingerprints**. Le collecteur lisait `data/fingerprints.json` (53 clés, liste curée réduite) en priorité, alors que la base canonique est `data/mfs_db.json` (6,8 MB, ~4 220 devices) d'après AGENTS.md.
**Fix** : `data/mfs_db.json` ajouté en tête des chemins candidats ; gestion de sa structure (entrées sous `data.devices`, champs `manufacturerId` / `modelIds` au lieu de `manufacturerName` / `productId`), avec fallback inchangé sur les anciens chemins.
**Vérifié** : `collectFingerprintMetrics()` retourne `totalDB: 4220`, `uniqueManufacturerNames: 4152`, `uniqueProductIds: 228` ; master dashboard affiche « Fingerprints: 4,220 ».

### Fix 2 — `tools/ci/analyze-dashboard.js`
**Problème** : crash non géré (`readFileSync(null)`) quand l'état CI est absent.
**Fix** : garde-fou — si `dashboard-monitor-report.json` est introuvable, message explicite + `process.exit(0)`.
**Vérifié** : exit 0 propre.

Aucune modification de `drivers/` ni de `app.json`.

---

## 3. Diagnostic global du dashboard

### Indicateurs à jour (régénérés le 2026-07-28, tous exit 0)
| Indicateur | Valeur | État |
|---|---|---|
| Drivers | 431 (Zigbee majoritaire) | ✅ à jour |
| Fingerprints (mfs_db) | 4 220 (4 152 mfrs uniques) | ✅ **corrigé** (affichait 53) |
| Flow cards | 4 844 | ✅ à jour |
| LOC lib/ | 186 279 (577 fichiers) | ✅ à jour |
| Couverture images | 100 % | ✅ à jour |
| Dépendances circulaires | 0 | ✅ sain |
| Anti-patterns | 1 277 findings | ⚠️ à traiter (dont une partie auto-fixable) |
| Health score | 75/100 | ⚠️ pénalisé par drivers sans flow cards / fingerprints vides |
| Syntax check | PASS (0 erreur) | ✅ sain |
| Tendances (performance-history.json) | 8 entrées | ✅ alimenté |

### Données manquantes / indisponibles en local (attendu)
- **Gmail diagnostics** (`missing_gmail_credentials`) et **Homey runtime** (`missing_homey_credential`) dans `diagnostics/summary.json` (2026-07-21) : secrets absents de la machine locale — normal, ces sources tournent en GHA. Documenté, pas de réparation tentée.
- **`.github/state/all-diagnostics-2026-07-13/`** : absent en local (état CI gitignored) → `analyze-dashboard.js` ne peut rien analyser hors CI (gère désormais ce cas proprement).
- **KNOWLEDGE_CACHE** (`.ai/KNOWLEDGE_CACHE.json`) : chargé quand présent ; les dashboards dégradent gracieusement sinon.

### Points d'attention restants (hors périmètre des fixes)
1. **HOBEIAN ZG-227Z mal routé** (`soil_sensor` au lieu de `sensor_contact_presence`) — nécessite une modif de `drivers/`, à faire valider.
2. **685 « modules inutilisés »** — surtout des scripts standalone `scripts/`/`tools/ci/` (faux positifs structurels de l'analyse statique).
3. **1 277 findings** de l'error dashboard — beaucoup sont marqués AUTO-FIX ; à traiter via un script dédié avec dry-run.
4. Health 75/100 : pénalités = drivers sans flow cards et/ou fingerprints vides (voir section Coverage Gaps du coverage dashboard).
