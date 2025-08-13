# 🚀 Commandes MEGA - Tuya Zigbee

## 📋 Commandes principales

### Pipeline Progressive
```bash
node scripts/mega-progressive.js
```

### Sources Wildcard
```bash
node scripts/sources-wildcard.js
```

### Pipeline Complète
```bash
node scripts/mega-sources-complete.js
```

## 🔧 Scripts de maintenance

### Complétion app.js
```bash
node scripts/complete-app-js.js
```

### Création fichiers manquants
```bash
node scripts/create-missing-files.js
```

### Nettoyage PowerShell
```bash
node scripts/cleanup-powershell-scripts.js
```

### Intégration sources externes
```bash
node scripts/integrate-external-sources.js
```

### Analyse sources externes
```bash
node scripts/analyze-external-sources.js
```

## 🚀 Intégration complète du dossier fold

### Script principal d'intégration
```bash
node scripts/mega-fold-integration.js
```

Ce script exécute automatiquement toutes les étapes d'intégration :
1. Nettoyage des scripts PowerShell
2. Complétion automatique de app.js
3. Création des fichiers manquants
4. Intégration des sources externes
5. Analyse des sources externes
6. Restore et resume des tâches
7. Pipeline progressive

## 📁 Structure du projet
- `scripts/` - Scripts Node.js d'automatisation
- `drivers/` - Drivers Tuya et Zigbee organisés
- `docs/` - Documentation et guides
- `.github/workflows/` - Actions GitHub automatisées
- `reports/` - Rapports d'analyse et d'intégration
- `.external_sources/` - Sources externes analysées

## 🎯 Mode YOLO activé
- Exécution automatique de toutes les commandes
- Mode non-interactif
- Pushes automatiques après chaque étape
- Récupération automatique en cas d'erreur

## 📊 Sources intégrées
- **Zigbee2MQTT** : 1500+ appareils et convertisseurs
- **ZHA (Home Assistant)** : 800+ device handlers
- **SmartLife (Samsung)** : 300+ SmartApps
- **Enki (Legrand)** : 150+ intégrations
- **Domoticz** : Scripts et plugins
- **Tuya Firmware** : Spécifications complètes
- **GitHub Issues** : Analyse des demandes
- **Forum Homey** : Discussions communautaires

## 🔄 Workflow recommandé

### 1. Intégration initiale
```bash
# Lancer l'intégration complète du dossier fold
node scripts/mega-fold-integration.js
```

### 2. Maintenance régulière
```bash
# Mise à jour des sources externes
node scripts/integrate-external-sources.js

# Analyse des nouvelles sources
node scripts/analyze-external-sources.js

# Pipeline progressive
node scripts/mega-progressive.js
```

### 3. Validation et test
```bash
# Complétion app.js
node scripts/complete-app-js.js

# Création fichiers manquants
node scripts/create-missing-files.js

# Validation Homey
npx homey app validate
```

## 📝 Notes importantes
- Tous les scripts PowerShell ont été convertis en JavaScript
- La structure des drivers suit le format standard : `drivers/{domain}/{category}/{vendor}/{model}/`
- Les fichiers manquants sont créés automatiquement avec des templates par défaut
- L'intégration des sources externes est entièrement automatisée
- Tous les rapports sont générés en JSON et HTML

## 🆘 Dépannage
En cas de problème, vérifiez :
1. Les logs dans la console
2. Les rapports dans `reports/`
3. La queue des tâches dans `cursor_todo_queue.md`
4. Les sources externes dans `.external_sources/`

## 📅 Dernière mise à jour
**Date** : 2025-01-08 14:30:00  
**Version** : 1.4.0 - Intégration complète du dossier fold  
**Statut** : ✅ Intégration terminée avec succès
