# 🤖 SYSTÈME D'AUTOMATISATION COMPLET

Documentation complète du système d'automatisation intelligent pour le projet Universal Tuya Zigbee.

---

## 📋 Vue d'Ensemble

Le système comprend:
1. **Extraction Intelligente** - Sources externes (Z2M, Blakadder)
2. **Maintenance Automatique** - Tâches périodiques
3. **GitHub Actions** - CI/CD automatisé
4. **Monitoring** - Détection des évolutions

---

## 🔄 Automatisations Mensuelles

### GitHub Action: Monthly Intelligence Update

**Fichier**: `.github/workflows/monthly-intelligence-update.yml`

**Déclenchement**: 1er de chaque mois à 02:00 UTC

**Actions**:
1. ✅ Extract Zigbee2MQTT devices
2. ✅ Extract Blakadder devices  
3. ✅ Consolidate all data sources
4. ✅ Generate monthly report
5. ✅ Auto-commit changes
6. ✅ Create issue if conflicts detected

**Sortie**:
- `data/extracted/zigbee2mqtt-extracted.json`
- `data/extracted/blakadder-extracted.json`
- `data/consolidated/datapoints-consolidated.json`
- `docs/reports/monthly/YYYY-MM.md`

**Exécution Manuelle**:
```bash
# Via GitHub UI
Actions → Monthly Intelligence Update → Run workflow

# Via gh CLI
gh workflow run monthly-intelligence-update.yml
```

---

## 📅 Automatisations Bimensuelles

### GitHub Action: Bimonthly Drivers Sync

**Fichier**: `.github/workflows/bimonthly-drivers-sync.yml`

**Déclenchement**: 15 janvier, mars, mai, juillet, septembre, novembre à 03:00 UTC

**Actions**:
1. ✅ Check upstream (Johan Bendz) for updates
2. ✅ Analyze changes (drivers, lib)
3. ✅ Run full intelligence pipeline
4. ✅ Validate drivers (SDK3)
5. ✅ Generate bimonthly report
6. ✅ Auto-commit if changes

**Sortie**:
- `docs/reports/bimonthly/YYYY-MM.md`
- Updated drivers (si nécessaire)
- Validation report

**Exécution Manuelle**:
```bash
gh workflow run bimonthly-drivers-sync.yml
```

---

## 🛠️ Script de Maintenance Intelligent

### Usage

**Fichier**: `scripts/automation/intelligent-maintenance.js`

**Modes**:
```bash
# Mode standard (rapide)
node scripts/automation/intelligent-maintenance.js

# Mode complet (avec extraction)
node scripts/automation/intelligent-maintenance.js --full

# Dry run (simulation)
node scripts/automation/intelligent-maintenance.js --dry-run

# Combiné
node scripts/automation/intelligent-maintenance.js --full --dry-run
```

**Tâches Exécutées**:

#### 1. Git Status Check ✓
- Vérifier working directory
- Fetch remote changes
- Détecter si en retard sur remote

#### 2. External Data Extraction ✓
- Extract Zigbee2MQTT
- Extract Blakadder
- Cache data localement

#### 3. Data Consolidation ✓
- Merge toutes sources
- Détecter conflits
- Générer stats

#### 4. Drivers Validation ✓
- Count drivers
- Validate avec Homey CLI
- Check compliance SDK3

#### 5. Dependencies Check ✓
- Check outdated packages
- Security audit
- Recommandations

#### 6. Code Quality Checks ✓
- Count LOC
- Find TODO/FIXME
- Detect issues

#### 7. Generate Statistics ✓
- App version
- Git commits
- Metrics diverses

#### 8. Generate Report ✓
- JSON report
- Markdown report
- Actionable recommendations

**Sortie**:
- `docs/reports/maintenance/maintenance-YYYY-MM-DD.json`
- `docs/reports/maintenance/maintenance-YYYY-MM-DD.md`

---

## 📊 Scripts NPM

### Extraction

```bash
# Extract Zigbee2MQTT uniquement
npm run extract:z2m

# Extract Blakadder uniquement
npm run extract:blakadder

# Extract tout
npm run extract:all
```

### Consolidation

```bash
# Consolidate data sources
npm run consolidate
```

### Pipeline Complet

```bash
# Extract + Consolidate
npm run intelligence:full
```

### Maintenance

```bash
# Via NPM (à ajouter)
npm run maintenance
npm run maintenance:full
```

---

## 📁 Structure des Données

```
data/
├── extracted/
│   ├── zigbee2mqtt-extracted.json      # Devices Z2M
│   ├── blakadder-extracted.json        # Devices Blakadder
│   ├── extraction-summary.json         # Stats extraction
│   └── blakadder-summary.json          # Stats Blakadder
│
├── consolidated/
│   ├── datapoints-consolidated.json    # DB unifiée (JSON)
│   ├── datapoints-consolidated.js      # DB unifiée (Module)
│   └── consolidation-stats.json        # Stats consolidation
│
└── .cache/
    ├── z2m-devices.json                # Cache Z2M (30j)
    └── blakadder-devices.json          # Cache Blakadder (30j)
```

---

## 📝 Rapports Générés

### Rapports Mensuels

**Path**: `docs/reports/monthly/YYYY-MM.md`

**Contenu**:
- Extraction results (Z2M, Blakadder)
- Consolidation stats
- Conflicts detected
- Changes summary
- Action items

### Rapports Bimensuels

**Path**: `docs/reports/bimonthly/YYYY-MM.md`

**Contenu**:
- Upstream analysis (Johan Bendz)
- Changed drivers/lib
- Intelligence pipeline status
- Validation results
- Project statistics

### Rapports Maintenance

**Path**: `docs/reports/maintenance/maintenance-YYYY-MM-DD.md`

**Contenu**:
- All tasks status
- Warnings & errors
- Statistics snapshot
- Recommendations
- Next steps

---

## 🔔 Notifications

### GitHub Issues Auto-Créés

**Trigger**: Conflicts détectés dans consolidation

**Labels**: `maintenance`, `data-quality`, `needs-review`

**Contenu**:
- Nombre de conflits
- Fichiers à reviewer
- Actions recommandées
- Link vers rapport

---

## 🧪 Testing

### Test Extraction Locale

```bash
# Test Z2M extraction
node scripts/intelligence/auto-extract-zigbee2mqtt.js

# Test Blakadder extraction
node scripts/intelligence/auto-extract-blakadder.js

# Test consolidation
node scripts/intelligence/consolidate-and-generate.js
```

### Test Maintenance

```bash
# Dry run
node scripts/automation/intelligent-maintenance.js --dry-run

# Full test
node scripts/automation/intelligent-maintenance.js --full
```

### Test GitHub Actions Localement

```bash
# Install act (GitHub Actions local runner)
# https://github.com/nektos/act

# Run monthly workflow
act schedule --workflows .github/workflows/monthly-intelligence-update.yml

# Run bimonthly workflow
act schedule --workflows .github/workflows/bimonthly-drivers-sync.yml
```

---

## 🔧 Configuration

### Variables d'Environnement

Aucune variable requise actuellement. Tout fonctionne avec:
- `GITHUB_TOKEN` (fourni automatiquement par GitHub Actions)
- Public APIs (Z2M, Blakadder)

### Secrets GitHub

**Requis**:
- Aucun (pour l'instant)

**Optionnels**:
- `HOMEY_PAT` - Pour publication automatique (déjà configuré)

---

## 📈 Métriques & KPIs

### Métriques Trackées

1. **Extraction**
   - Devices Z2M extracted
   - Devices Blakadder extracted
   - Extraction success rate
   - Cache usage

2. **Consolidation**
   - Total DataPoints
   - Conflicts count
   - Sources coverage
   - Confidence scores

3. **Code Quality**
   - Total drivers
   - JS files count
   - TODO/FIXME count
   - Validation status

4. **Maintenance**
   - Outdated packages
   - Security vulnerabilities
   - Git commits
   - Workflow runs

### Dashboards

**Futur**: Integration avec GitHub Insights ou custom dashboard

---

## 🚨 Troubleshooting

### "No devices fetched" (Z2M)

**Cause**: API URL changée ou inaccessible

**Solution**:
1. Check `.cache/z2m-devices.json` existe
2. Try manual fetch: `curl https://zigbee2mqtt.io/supported-devices.json`
3. Update URLs dans `auto-extract-zigbee2mqtt.js`

### "Conflicts detected"

**Cause**: DataPoint identique avec noms différents

**Solution**:
1. Review `data/consolidated/consolidation-stats.json`
2. Check `conflicts` array
3. Update `lib/tuya-universal-mapping.js`
4. Re-run consolidation

### "Validation failed"

**Cause**: Drivers non-conformes SDK3

**Solution**:
1. Run `npm run validate`
2. Fix issues dans drivers
3. Re-run maintenance

### "Workflow failed"

**Cause**: Multiple (rate limit, permissions, etc.)

**Solution**:
1. Check GitHub Actions logs
2. Check workflow run artifacts
3. Re-run manually si timeout

---

## 🔮 Roadmap

### À Implémenter

- [ ] Auto-generation complete drivers from consolidated data
- [ ] PR automatiques vers upstream (Johan Bendz)
- [ ] Integration Slack/Discord notifications
- [ ] Custom GitHub dashboard
- [ ] Performance metrics tracking
- [ ] A/B testing framework pour drivers
- [ ] Auto-fix common issues
- [ ] Machine learning pour conflict resolution

### En Cours

- [x] Monthly extraction automation
- [x] Bimonthly sync automation  
- [x] Intelligent maintenance system
- [x] Comprehensive reporting

### Complété

- [x] Z2M extraction
- [x] Blakadder extraction
- [x] Data consolidation
- [x] GitHub Actions workflows
- [x] NPM scripts integration

---

## 📞 Support

**Issues**: https://github.com/dlnraja/com.tuya.zigbee/issues  
**Discussions**: https://github.com/dlnraja/com.tuya.zigbee/discussions  
**Forum**: https://community.homey.app/

---

## 📜 License

MIT - Voir LICENSE file

---

**Dernière mise à jour**: 2025-10-28  
**Version Système**: 1.0.0  
**Auteur**: Dylan L.N. Raja
