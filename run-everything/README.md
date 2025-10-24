# 🤖 Système d'Automatisation Totale

## 📋 Vue d'Ensemble

Ce dossier contient le **système d'automatisation complète** qui gère **TOUT** le cycle de vie du projet Universal Tuya Zigbee:

- ✅ Vérification et installation des dépendances
- ✅ Enrichissement depuis Internet (Zigbee2MQTT, GitHub, forums, etc.)
- ✅ Scan des issues, PRs, forks
- ✅ Validation et cohérence
- ✅ Auto-réparation
- ✅ Push Git automatique
- ✅ Publication Homey App Store

## 🚀 Utilisation

### Via Windows (.bat)

**Double-cliquez** sur `RUN_COMPLETE_AUTOMATION.bat` ou exécutez:

```batch
cd run-everything
RUN_COMPLETE_AUTOMATION.bat
```

### Via GitHub Actions (automatique)

Le workflow `.github/workflows/complete-automation.yml` s'exécute **automatiquement tous les 2 mois**.

Pour déclencher manuellement:
1. Allez sur https://github.com/dlnraja/com.tuya.zigbee/actions
2. Sélectionnez "Complete Automation - Every 2 Months"
3. Cliquez sur "Run workflow"

## 🔄 Phases d'Exécution

### Phase 1: Dépendances ✅
- Vérifie Node.js, Git, npm, Homey CLI
- Installe automatiquement via winget si manquant
- Fallback sur téléchargement direct si winget échoue
- Installe toutes les dépendances npm

### Phase 2: Enrichissement 🌐
- Zigbee2MQTT database
- GitHub Koenkk/zigbee-herdsman-converters
- GitHub JohanBendz/com.tuya.zigbee
- Blakadder Zigbee database
- Home Assistant ZHA
- Google Search
- Homey Community Forum

### Phase 3: Validation ✅
- `homey app validate --level debug`
- Vérification de cohérence
- Validation de tous les drivers

### Phase 4: Auto-Réparation 🔧
- Fix images manquantes
- Fix chemins absolus
- Update links
- Corrections automatiques

### Phase 5: Validation Finale ✅
- `homey app validate --level publish`
- Vérification avant publication

### Phase 6: Git Commit 📝
- Commit toutes les modifications
- Message automatique

### Phase 7: Git Push 📤
- Push vers GitHub
- Retry automatique (3 tentatives)
- Rebase en cas de conflit

### Phase 8: Publication 🚀
- Via GitHub Actions (automatique)
- Ou manuel: `homey app publish`

## 🛡️ Système de Fallbacks

Le système continue même si une partie échoue:

1. **Installation dépendances**: winget → téléchargement direct
2. **Enrichissement**: Continue même si une source échoue
3. **Validation**: Continue avec warnings
4. **Auto-réparation**: Skip si script manquant
5. **Push**: 3 tentatives avec rebase

## ⚙️ Configuration

### Variables d'Environnement

Aucune configuration requise! Le système est **totalement autonome**.

### Secrets GitHub (pour GitHub Actions)

- `GITHUB_TOKEN`: Auto-fourni par GitHub
- `HOMEY_TOKEN`: À configurer dans Settings → Secrets

## 📊 Monitoring

### Logs

Tous les logs sont affichés dans la console. Les erreurs sont en **rouge**, les warnings en **jaune**, les succès en **vert**.

### Rapports

Après chaque exécution:
- Rapport dans la console
- `AUTOMATION_REPORT.md` généré
- Artifacts uploadés sur GitHub Actions

## 🔍 Dépannage

### "Node.js non trouvé"

Le script tentera d'installer Node.js automatiquement. Si ça échoue:
1. Installez manuellement: https://nodejs.org/
2. Relancez le script

### "Git non trouvé"

Le script tentera d'installer Git automatiquement. Si ça échoue:
1. Installez manuellement: https://git-scm.com/
2. Relancez le script

### "Validation failed"

1. Vérifiez les erreurs affichées
2. Corrigez manuellement si nécessaire
3. Relancez le script

### "Push failed"

1. Vérifiez votre connexion Internet
2. Vérifiez que vous êtes authentifié sur Git
3. Le script tentera 3 fois automatiquement

## 📅 Planification Automatique

### GitHub Actions

Le workflow s'exécute automatiquement:
- **Quand**: 1er jour de chaque bimestre (janvier, mars, mai, juillet, septembre, novembre)
- **Heure**: 02:00 UTC
- **Durée**: ~15-30 minutes

### Désactiver l'Automatisation

Pour désactiver l'exécution automatique:
1. Éditez `.github/workflows/complete-automation.yml`
2. Commentez ou supprimez la section `schedule`

## 🎯 Objectifs du Système

1. **Autonomie Totale**: Fonctionne seul, sans intervention
2. **Résilience**: Continue même en cas d'erreur partielle
3. **Enrichissement Continu**: Met à jour la database automatiquement
4. **Qualité**: Validation et auto-réparation avant publication
5. **Transparence**: Logs complets et rapports détaillés

## 📚 Ressources

- [GitHub Repository](https://github.com/dlnraja/com.tuya.zigbee)
- [Homey Developer Portal](https://tools.developer.homey.app/)
- [Documentation Complète](../docs/)
- [Changelog](../CHANGELOG.md)

## 🤝 Contribution

Le système est conçu pour être extensible:

1. Ajoutez de nouvelles sources d'enrichissement dans `scripts/node-tools/enrichment-advanced.js`
2. Ajoutez de nouvelles vérifications dans `scripts/node-tools/validate-integration.js`
3. Ajoutez de nouvelles réparations dans `scripts/fixes/`

## ⚡ Performance

- **Temps d'exécution local**: 5-10 minutes
- **Temps d'exécution GitHub Actions**: 15-30 minutes
- **Enrichissement**: ~100-200 nouveaux IDs par cycle
- **Validations**: 100% du code vérifié

## 🎉 Résultat Final

Après chaque cycle, le projet est:
- ✅ Enrichi avec les derniers devices
- ✅ Validé SDK3 Homey
- ✅ Réparé automatiquement
- ✅ Versionné correctement
- ✅ Publié sur Homey App Store
- ✅ Documenté complètement

---

**Créé le**: 2025-10-19  
**Version**: 3.1.1+  
**Maintenance**: Automatique tous les 2 mois  
**Status**: ✅ Production Ready
