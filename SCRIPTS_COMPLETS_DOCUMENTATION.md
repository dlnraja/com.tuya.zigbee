# 📚 Scripts Complets - Documentation

**Version**: 2.1.46  
**Date**: 2025-10-11

---

## 📋 Vue d'ensemble

Tous les scripts de **parsing** et **vérification** sont désormais créés et opérationnels.

---

## 🔍 Scripts de Parsing

### 1. `scripts/parsing/PARSE_GITHUB_PRS.js`

**Fonction**: Parse toutes les Pull Requests GitHub

**Sources**:
- JohanBendz/com.tuya.zigbee
- dlnraja/com.tuya.zigbee
- Forks principaux

**Extrait**:
- Manufacturer IDs des diffs
- Fichiers modifiés
- Labels et statuts
- Contributeurs

**Output**: `github-analysis/all_pull_requests.json`

**Utilisation**:
```bash
node scripts/parsing/PARSE_GITHUB_PRS.js
```

---

### 2. `scripts/parsing/PARSE_GITHUB_ISSUES.js`

**Fonction**: Parse toutes les Issues GitHub

**Catégorise**:
- Device requests
- Bugs reportés
- Feature requests
- Pairing issues

**Extrait**:
- Manufacturer IDs mentionnés
- Modèles de devices
- Statuts (open/closed)

**Output**: `github-analysis/all_issues.json`

**Utilisation**:
```bash
node scripts/parsing/PARSE_GITHUB_ISSUES.js
```

---

### 3. `scripts/parsing/PARSE_FORUM_HOMEY.js`

**Fonction**: Parse threads du forum Homey Community

**Threads analysés**:
- #140352: Universal Tuya Zigbee (Lite)
- #26439: Tuya Zigbee App (original)
- #106779: Tuya Connect

**Extrait**:
- Issues communes reportées
- Device requests populaires
- Manufacturer IDs problématiques
- Fixes documentés

**Output**: `github-analysis/forum_analysis.json`

**Utilisation**:
```bash
node scripts/parsing/PARSE_FORUM_HOMEY.js
```

---

### 4. `scripts/parsing/PARSE_DRIVER_CAPABILITIES.js`

**Fonction**: Analyse toutes les capabilities utilisées

**Analyse**:
- Capabilities par driver
- Capabilities par classe
- Standard vs custom
- Statistiques d'utilisation

**Output**: `reports/driver_capabilities.json`

**Utilisation**:
```bash
node scripts/parsing/PARSE_DRIVER_CAPABILITIES.js
```

---

## ✅ Scripts de Vérification

### 1. `scripts/verification/VERIFY_MANUFACTURER_IDS.js`

**Fonction**: Vérifie validité et complétude des manufacturer IDs

**Vérifie**:
- Format valide (_TZ3000_, _TZE200_, TS0001, etc.)
- Pas de duplicats
- Couverture par catégorie (TZ3000, TZE200, TS, brands)
- IDs invalides

**Output**: `reports/manufacturer_ids_verification.json`

**Patterns valides**:
- `_TZ\d{4}_[a-z0-9]{8}` → _TZ3000_abcd1234
- `_TZE\d{3}_[a-z0-9]{8}` → _TZE200_abcd1234
- `TS\d{4}[A-Z]?` → TS0001, TS011F
- MOES, BSEED, Lonsonho, etc.

**Utilisation**:
```bash
node scripts/verification/VERIFY_MANUFACTURER_IDS.js
```

---

### 2. `scripts/verification/VERIFY_IMAGES_COMPLETE.js`

**Fonction**: Vérifie présence et conformité de toutes les images

**Vérifie**:
- Présence small.png (75x75)
- Présence large.png (500x500)
- Présence xlarge.png (1000x1000)
- Dimensions exactes
- Format PNG valide
- Taille fichiers

**Output**: `reports/images_verification.json`

**Statistiques**:
- Images manquantes
- Mauvaises dimensions
- Taille moyenne/totale
- Top 10 images lourdes

**Utilisation**:
```bash
node scripts/verification/VERIFY_IMAGES_COMPLETE.js
```

---

### 3. `scripts/verification/VERIFY_SDK3_COMPLIANCE.js`

**Fonction**: Vérifie conformité Homey SDK3

**Vérifie**:
- Présence `name`
- Présence `class`
- Présence `capabilities`
- Configuration `zigbee`
- `manufacturerName` dans zigbee

**Output**: `reports/sdk3_compliance.json`

**Utilisation**:
```bash
node scripts/verification/VERIFY_SDK3_COMPLIANCE.js
```

---

### 4. `scripts/verification/VERIFY_DRIVER_STRUCTURE.js`

**Fonction**: Vérifie structure complète de chaque driver

**Vérifie**:
- Fichiers requis: driver.compose.json, device.js
- Dossiers requis: assets/
- Fichiers optionnels: pair/, driver.js

**Statistiques**:
- Drivers avec pair/
- Drivers avec driver.js
- Nombre moyen de fichiers

**Output**: `reports/driver_structure.json`

**Utilisation**:
```bash
node scripts/verification/VERIFY_DRIVER_STRUCTURE.js
```

---

## 🎯 Scripts Orchestrateurs

### 1. `scripts/MASTER_VERIFICATION_SUITE.js`

**Fonction**: Exécute TOUTES les vérifications en une fois

**Exécute**:
1. VERIFY_MANUFACTURER_IDS
2. VERIFY_IMAGES_COMPLETE
3. VERIFY_SDK3_COMPLIANCE
4. VERIFY_DRIVER_STRUCTURE
5. PARSE_DRIVER_CAPABILITIES

**Output**: `reports/master_verification_summary.json`

**Utilisation**:
```bash
node scripts/MASTER_VERIFICATION_SUITE.js
```

**Résultat**:
- ✅ ou ❌ pour chaque vérification
- Durée totale
- Rapport consolidé
- Exit code 0 si tout OK, 1 sinon

---

### 2. `scripts/MASTER_PARSING_SUITE.js`

**Fonction**: Exécute TOUS les scripts de parsing

**Exécute**:
1. PARSE_GITHUB_PRS
2. PARSE_GITHUB_ISSUES
3. PARSE_FORUM_HOMEY
4. PARSE_DRIVER_CAPABILITIES

**Consolide**:
- Manufacturer IDs uniques (toutes sources)
- Device requests (toutes sources)
- Capabilities (tous drivers)

**Output**: `github-analysis/consolidated_results.json`

**Utilisation**:
```bash
node scripts/MASTER_PARSING_SUITE.js
```

**Résultat**:
- Manufacturer IDs consolidés
- Statistiques par source
- Rapport unifié

---

## 📊 Rapports Générés

### Structure des Rapports

```
tuya_repair/
├── reports/
│   ├── manufacturer_ids_verification.json
│   ├── images_verification.json
│   ├── sdk3_compliance.json
│   ├── driver_structure.json
│   ├── driver_capabilities.json
│   └── master_verification_summary.json
└── github-analysis/
    ├── all_pull_requests.json
    ├── all_issues.json
    ├── forum_analysis.json
    ├── manufacturer_ids_from_prs.json
    ├── manufacturer_ids_from_forum.json
    └── consolidated_results.json
```

---

## 🚀 Workflow Recommandé

### Avant Chaque Commit

```bash
# Vérifications complètes
node scripts/MASTER_VERIFICATION_SUITE.js

# Si tout OK, commit
git add .
git commit -m "..."
git push
```

### Enrichissement Manufacturer IDs

```bash
# 1. Parser toutes les sources
node scripts/MASTER_PARSING_SUITE.js

# 2. Consulter résultats consolidés
cat github-analysis/consolidated_results.json

# 3. Appliquer manuellement les nouveaux IDs
# (ou créer script d'enrichissement automatique)
```

### Vérification Images

```bash
# Générer images
node scripts/ULTIMATE_IMAGE_GENERATOR_V2.js

# Vérifier conformité
node scripts/verification/VERIFY_IMAGES_COMPLETE.js
```

---

## 📈 Statistiques Attendues

### Manufacturer IDs

| Source | IDs Attendus |
|--------|--------------|
| GitHub PRs | ~50-100 |
| GitHub Issues | ~20-50 |
| Forum Homey | ~30-60 |
| **Total consolidé** | **~100-200 uniques** |

### Capabilities

| Type | Nombre |
|------|--------|
| Standard Homey | ~30 |
| Custom | ~5-10 |
| **Total utilisées** | **~20-30** |

### Images

| Métrique | Valeur |
|----------|--------|
| Drivers | 166 |
| Images totales | 498 (166 × 3) |
| Taille moyenne | ~30-50 KB |
| Taille totale | ~15-25 MB |

---

## 🔧 Dépannage

### Script échoue avec erreur réseau

**Solution**: Les scripts parsing GitHub utilisent l'API publique.  
Si rate limit atteint, attendre 1h ou ajouter token GitHub.

### Images mauvaises dimensions

**Solution**: Régénérer avec:
```bash
node scripts/ULTIMATE_IMAGE_GENERATOR_V2.js
```

### Manufacturer IDs invalides

**Solution**: Vérifier format avec:
```bash
node scripts/verification/VERIFY_MANUFACTURER_IDS.js
```

Corriger manuellement les IDs invalides dans `driver.compose.json`.

---

## 📚 Références

- **Homey SDK3**: https://apps.developer.homey.app
- **Johan Bendz Repo**: https://github.com/JohanBendz/com.tuya.zigbee
- **Forum Homey**: https://community.homey.app
- **Zigbee Alliance**: https://zigbeealliance.org

---

## ✅ Checklist Complète

Avant chaque publication:

- [ ] `MASTER_VERIFICATION_SUITE.js` → ✅ Toutes vérifications passées
- [ ] `VERIFY_MANUFACTURER_IDS.js` → ✅ Aucun ID invalide
- [ ] `VERIFY_IMAGES_COMPLETE.js` → ✅ Toutes images présentes et conformes
- [ ] `VERIFY_SDK3_COMPLIANCE.js` → ✅ 100% conformité SDK3
- [ ] `VERIFY_DRIVER_STRUCTURE.js` → ✅ Structure valide
- [ ] `homey app validate --level publish` → ✅ Validation Homey réussie
- [ ] Cache `.homeybuild` nettoyé
- [ ] Git commit avec message détaillé
- [ ] Git push vers master
- [ ] GitHub Actions déclenché

---

**Fin de la documentation**

Tous les scripts sont opérationnels et testés.
