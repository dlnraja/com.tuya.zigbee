# 🧠 **Prompt Cursor Complet - Tuya Zigbee Project**

## 🎯 **Objectif Principal**
Gérer automatiquement le projet Tuya Zigbee (`com.tuya.zigbee`) dans une logique d'amélioration continue, enrichissement et robustesse maximale. Exploiter tous les fichiers et scripts existants pour les compléter, corriger et enrichir de manière totalement autonome.

---

## 🔁 **Objectifs Globaux de la Pipeline**

### ✅ **Vérification et Analyse**
1. Vérifier et analyser tous les fichiers `drivers`, `app.json`, `driver.compose.json`, `drivers.json`, etc.
2. Corriger automatiquement les erreurs détectées (structure, syntaxe, dépendances)
3. Scraper toutes les sources externes (Tuya, Homey Community, forums, GitHub liés, JSON publics, etc.)
4. Chercher et détecter de nouveaux appareils, même inconnus ou génériques
5. Deviner les fonctionnalités manquantes ou incomplètes (clusters, capabilities, comportements)
6. Compléter les champs `manufacturer`, `icons`, `UI`, `capabilitiesOptions`, `zwave`, `zigbee`, etc.
7. Traiter les `TODO devices` de manière unitaire et intelligente
8. Générer les fichiers de documentation : `README.md`, `CHANGELOG.md`, `drivers-matrix.md`, etc.
9. Appliquer tous les changements sans bloquer la suite, même si certains échouent
10. Ajouter un système de fallback automatique avec rollback si un driver est défectueux
11. S'exécuter régulièrement grâce à GitHub Actions, sans dépendance obligatoire aux tokens ou API keys

---

## 🏠 **Compatibilité à Garantir**

### **Firmware Tuya**
- ✅ Officiel
- ✅ OTA (Over-The-Air)
- ✅ Partiel
- ✅ Custom
- ✅ Générique
- ✅ Instable

### **Homey Models**
- ✅ Homey Pro (2016, 2019, 2023)
- ✅ Homey Bridge
- ✅ Homey Cloud

### **Adaptation Automatique**
- Tous les drivers doivent s'adapter automatiquement selon la box Homey
- Fallbacks autorisés pour la compatibilité maximale
- Ajout de métadonnées de compatibilité :
  - `platformCompatibility`
  - `minHomeyVersion`
  - `fallbackBehavior`
  - `firmwareMetadata`
- Fonctionne même si certains firmwares sont inconnus ou fragmentés
- Devine comportement par AI ou heuristique

---

## ⚙️ **GitHub Actions Pipeline**

### **Configuration Mega-Pipeline**
```yaml
schedule:
  - cron: '0 2 * * 1,4'  # Tous les lundis et jeudis à 2h00 UTC
workflow_dispatch:
push:
  branches: [test]
```

### **Scripts d'Exécution (Ordre Prioritaire)**
1. `verify-all-drivers.js` - Vérification complète
2. `fetch-new-devices.js` - Récupération nouveaux appareils
3. `ai-enrich-drivers.js` - Enrichissement AI (si clé OpenAI dispo)
4. `scrape-homey-community.js` - Scraping communauté
5. `fetch-issues-pullrequests.js` - Issues/PR (si GitHub Token dispo)
6. `resolve-todo-devices.js` - Traitement TODO devices
7. `test-multi-firmware-compatibility.js` - Tests compatibilité
8. `generate-docs.js` - Génération documentation
9. Commit unitaire automatique (si token dispo)
10. Déploiement du dashboard (optionnel)

---

## 📁 **Scripts à Créer/Compléter**

### **Scripts Principaux**
- [x] `verify-all-drivers.js` - Vérification complète des drivers
- [x] `fetch-new-devices.js` - Récupération nouveaux appareils
- [ ] `ai-enrich-drivers.js` - Enrichissement AI
- [ ] `scrape-homey-community.js` - Scraping communauté
- [ ] `fetch-issues-pullrequests.js` - Issues/PR GitHub
- [ ] `resolve-todo-devices.js` - Traitement TODO devices
- [ ] `test-multi-firmware-compatibility.js` - Tests compatibilité
- [ ] `generate-docs.js` - Génération documentation

### **Scripts de Support**
- [x] `pipeline-complete.js` - Orchestrateur principal
- [x] `compatibility-multi-firmware.js` - Compatibilité firmware
- [x] `recover-all-historical-drivers.js` - Récupération historique
- [x] `recover-quick-historical.js` - Récupération rapide
- [x] `list-and-dump-drivers.js` - Listing et dump
- [x] `comprehensive-driver-dump.js` - Dump complet

---

## ✅ **Règles de Scripts**

### **Autonomie et Robustesse**
- ✅ Chaque script doit être **autonome**
- ✅ **Tolérant aux erreurs** - ne jamais bloquer la pipeline
- ✅ Appliquer les modifications **au niveau unitaire uniquement** (un driver à la fois)
- ✅ Logger tous les changements
- ✅ Inclure des mécanismes de `auto-fix` et `fallback`
- ✅ Supporter un mode dégradé sans `OPENAI_API_KEY` ou `GITHUB_TOKEN`

### **Gestion d'Erreurs**
- ✅ Si une tâche échoue : ignorer et continuer les suivantes
- ✅ Ouvrir une PR `rescue/YYYYMMDD-<titre>` si nécessaire
- ✅ Ne jamais bloquer ou supprimer les autres fichiers valides
- ✅ Système de rollback automatique

---

## 🎯 **Tâches Cursor Prioritaires**

### **Création/Complétion Scripts**
1. Créer ou compléter tous les scripts JS dans `/scripts`
2. Respecter les règles d'autonomie et robustesse
3. Générer les fichiers modifiés en temps réel
4. Proposer intelligemment des comportements manquants

### **Exécution Intelligente**
1. Exécuter les changements en priorité sur les devices `TODO`, `unknown`, `generic`
2. Vérifier à chaque passage la compatibilité multi-firmware + multi-box Homey
3. Améliorer, documenter et enrichir sans intervention humaine

### **Mise à Jour Continue**
1. Maintenir le projet **à jour, enrichi, compatible et auto-correctif**
2. Fonctionner même sans supervision humaine
3. Utiliser toutes les capacités Cursor pour l'automatisation

---

## 📊 **Statut Actuel du Projet**

### **Drivers Identifiés**
- **Total**: 44 drivers (19 Tuya + 17 Zigbee + 8 Todo)
- **Objectif**: 4464 drivers (référence Zigbee2MQTT)
- **Gap**: 4420 drivers manquants (99%)

### **Catégories Actuelles**
**Tuya (19 drivers)**:
- Controllers: 6 drivers
- Sensors: 3 drivers  
- Security: 2 drivers
- Unknown: 5 drivers
- Climate: 1 driver
- Automation: 1 driver
- Assets: 1 driver

**Zigbee (17 drivers)**:
- Controllers: 6 drivers
- Sensors: 3 drivers
- Unknown: 4 drivers
- Security: 1 driver
- Climate: 1 driver
- Custom: 1 driver
- Assets: 1 driver

### **Scripts Disponibles**
- ✅ `npm run pipeline` - Pipeline complet
- ✅ `npm run verify` - Vérification
- ✅ `npm run fetch` - Récupération
- ✅ `npm run enrich` - Enrichissement
- ✅ `npm run fusion` - Fusion intelligente
- ✅ `npm run compatibility` - Compatibilité
- ✅ `npm run cleanup` - Nettoyage
- ✅ `npm run monitor` - Monitoring
- ✅ `npm run health` - Santé du projet
- ✅ `npm run list-and-dump` - Listing et dump
- ✅ `npm run recover-quick` - Récupération rapide
- ✅ `npm run dump-comprehensive` - Dump complet

---

## 🚀 **Prochaines Étapes**

1. **Créer les scripts manquants** selon la logique Cursor
2. **Implémenter la récupération massive** des 4420 drivers manquants
3. **Scraper toutes les sources externes** (Zigbee2MQTT, Homey Community, etc.)
4. **Organiser intelligemment** par catégories thématiques
5. **Enrichir avec images** et métadonnées complètes
6. **Mettre à jour la documentation** en temps réel
7. **Tester la compatibilité** multi-firmware et multi-box
8. **Déployer la pipeline** GitHub Actions complète

---

## 📝 **Documentation Associée**

- [x] `README.md` - Documentation principale
- [x] `package.json` - Scripts et dépendances
- [x] `scripts/` - Tous les scripts d'automatisation
- [x] `logs/` - Logs détaillés
- [x] `backups/` - Sauvegardes
- [ ] `docs/` - Documentation technique
- [ ] `examples/` - Exemples d'utilisation

---

**🎯 Objectif Final**: Projet **auto-géré, enrichi, compatible et robuste** fonctionnant sans intervention humaine !

---

**📅 Créé**: 29/07/2025 13:55:00  
**🎯 Objectif**: Automatisation complète du projet Tuya Zigbee  
**🚀 Mode**: Cursor Intelligent - Règles automatiques  
**✅ Statut**: PROMPT CURSOR COMPLET ET ACTIF  
**🔄 Mises à jour**: Régulières et automatiques