# 🤖 **SYSTÈME D'AUTOMATISATION GITHUB COMPLET**

**Version 1.0.0** | Système autonome de gestion des Issues/PRs Johan Bendz → dlnraja

---

## 🎯 **OBJECTIF**

**Automatiser complètement** la gestion des demandes de devices Tuya Zigbee depuis le repository de Johan Bendz vers votre repository dlnraja, incluant:

- ✅ **Surveillance automatique** des nouvelles issues GitHub
- ✅ **Parsing intelligent** des fingerprints Zigbee
- ✅ **Intégration automatique** dans les drivers appropriés
- ✅ **Build/Test/Deploy automatique** avec versioning
- ✅ **Réponses automatiques** aux issues avec confirmations
- ✅ **Sécurité complète** avec validation, backups, rollback
- ✅ **Monitoring temps réel** avec dashboard web

---

## 🏗️ **ARCHITECTURE DU SYSTÈME**

```
📁 scripts/automation/
├── 🤖 github-auto-monitor.js      # Moteur principal de monitoring
├── ⚡ auto-scheduler.ps1           # Planificateur Windows + contrôles
├── 🛡️ safety-validator.js         # Validation et sécurité
├── 🎛️ master-controller.js        # Orchestrateur central
├── 📊 monitoring-dashboard.html    # Interface web de monitoring
├── 🚀 install-automation.ps1      # Installation automatique guidée
├── ⚙️ config.json                 # Configuration système
└── 📚 SYSTEM-GUIDE.md             # Ce guide

📁 logs/automation/                 # Logs détaillés du système
📁 backups/automation/              # Backups automatiques des drivers
📁 quarantine/                      # Devices suspects en quarantaine
```

---

## ⚡ **DÉMARRAGE RAPIDE**

### 1️⃣ **Installation Automatique**
```powershell
# Lancement de l'installation guidée complète
powershell -ExecutionPolicy Bypass scripts\automation\install-automation.ps1
```

### 2️⃣ **Démarrage Immédiat**
```powershell
# Exécution unique pour tester
powershell scripts\automation\auto-scheduler.ps1 -Action RunOnce

# Démarrage du système continu
powershell scripts\automation\auto-scheduler.ps1 -Action Start
```

### 3️⃣ **Monitoring**
- Ouvrir `scripts\automation\monitoring-dashboard.html` dans votre navigateur
- Dashboard temps réel avec statistiques et contrôles

---

## 🎮 **COMMANDES PRINCIPALES**

### **Contrôle du Système**
```powershell
# Status complet du système
powershell scripts\automation\auto-scheduler.ps1 -Action Status

# Installation de la tâche planifiée (toutes les heures)
powershell scripts\automation\auto-scheduler.ps1 -Action Install

# Démarrage monitoring continu
powershell scripts\automation\auto-scheduler.ps1 -Action Start

# Arrêt du système
powershell scripts\automation\auto-scheduler.ps1 -Action Stop

# Exécution unique (test)
powershell scripts\automation\auto-scheduler.ps1 -Action RunOnce

# Consultation des logs
powershell scripts\automation\auto-scheduler.ps1 -Action Logs
```

### **Monitoring Direct Node.js**
```bash
# Monitoring continu
node scripts\automation\github-auto-monitor.js

# Exécution unique
node scripts\automation\github-auto-monitor.js --once

# Statistiques
node scripts\automation\github-auto-monitor.js --stats
```

### **Sécurité et Validation**
```bash
# Test de build de l'app
node scripts\automation\safety-validator.js test-build

# Rollback des changements
node scripts\automation\safety-validator.js rollback

# Rapport de sécurité
node scripts\automation\safety-validator.js report

# Nettoyage des anciens backups
node scripts\automation\safety-validator.js clean-backups
```

---

## 🔧 **FONCTIONNEMENT DÉTAILLÉ**

### **1. Surveillance GitHub (Automatique)**
- **Fréquence**: Toutes les heures (configurable)
- **Source**: `JohanBendz/com.tuya.zigbee/issues`
- **Filtres**: Issues avec "device request" dans le titre
- **API**: GitHub CLI ou REST API

### **2. Analyse des Issues**
```javascript
// Extraction automatique des fingerprints:
{
  manufacturerName: "_TZ3000_example123",
  productId: "TS0044",
  modelId: "TS0044",
  deviceName: "MOES Scene Switch 4 gang",
  category: "scene_switch_4" // Auto-déterminée
}
```

### **3. Intégration Automatique**
- **Validation**: Format, duplicatas, conflits
- **Backup**: Sauvegarde automatique avant modification
- **Intégration**: Ajout dans le driver approprié
- **Build Test**: Validation que l'app compile

### **4. Déploiement Automatique**
```bash
# Séquence automatique:
1. git add -A
2. git commit -m "AUTO v5.5.X: New devices from Johan repo"
3. homey app build  # Test de compilation
4. git push origin master  # Déploiement
```

### **5. Réponse Automatique**
```markdown
🤖 **AUTOMATED INTEGRATION COMPLETED**

✅ **Device Added Successfully**: MOES Scene Switch 4 gang
- **Manufacturer ID**: `_TZ3000_zgyzgdua`
- **Product ID**: `TS0044`
- **Driver**: `scene_switch_4`
- **Version**: v5.5.218

🚀 **Status**: Your device is now supported!
```

---

## 🛡️ **SÉCURITÉ ET PROTECTION**

### **Validations Automatiques**
- ✅ Format des manufacturer IDs (`_TZ[A-Z0-9]{4}_[a-z0-9]{8,12}`)
- ✅ Format des product IDs (`TS[0-9]{4}[A-Z]?`)
- ✅ Détection des duplicatas
- ✅ Vérification des conflits de catégorie
- ✅ Limite de devices par driver (50 max)
- ✅ Rate limiting (5 devices max par cycle)

### **Système de Backup**
```
📁 backups/automation/
├── 2024-12-19/
│   ├── scene_switch_4_1734624123.json
│   ├── plug_smart_1734624156.json
│   └── motion_sensor_1734624189.json
└── 2024-12-18/ ...
```

### **Quarantaine Automatique**
Les devices suspects sont automatiquement mis en quarantaine:
- Fingerprints invalides
- Devices de test/debug
- Conflits de catégorie majeurs
- Manufacturers blacklistés

### **Rollback Automatique**
En cas d'échec de build, tous les changements sont automatiquement annulés.

---

## 📊 **MONITORING ET DASHBOARD**

### **Dashboard Web Temps Réel**
Ouvrir `monitoring-dashboard.html` pour:
- 🟢 Status des processus en temps réel
- 📈 Statistiques globales (devices ajoutées, issues traitées)
- 📝 Logs récents avec filtrage par niveau
- 🎮 Contrôles système (start/stop/pause)
- 🔍 Liste des devices récemment ajoutées

### **Logs Détaillés**
```
📁 logs/automation/
├── auto-monitor-2024-12-19.log     # Logs du monitoring
├── scheduler-2024-12-19.log        # Logs du planificateur
└── safety-2024-12-19.log           # Logs de sécurité
```

---

## 📋 **CONFIGURATION**

### **Fichier config.json**
```json
{
  "version": "1.0.0",
  "installed": "2024-12-19 17:30:00",
  "projectPath": "c:\\Users\\HP\\Desktop\\homey app\\tuya_repair",
  "monitorInterval": 60,
  "autoStart": true,
  "safetyEnabled": true,
  "maxDevicesPerRun": 5,
  "maxDevicesPerDriver": 50,
  "backupRetentionDays": 7
}
```

### **Variables d'Environnement**
```bash
# GitHub Token pour API (optionnel, améliore le rate limiting)
set GITHUB_TOKEN=ghp_your_token_here

# Debugging
set DEBUG_AUTOMATION=true
```

---

## 🔧 **RÈGLES DE CATÉGORISATION**

Le système détermine automatiquement le driver approprié:

| **Mots-clés** | **Driver Cible** |
|---------------|------------------|
| motion, pir, presence | `motion_sensor` |
| temperature, humidity, climate | `climate_sensor` |
| gas, combustible, methane | `gas_detector` |
| smoke, fire | `smoke_detector` |
| rgb, color, bulb | `bulb_rgb` / `bulb_rgbw` |
| plug, socket, outlet | `plug_smart` |
| scene, switch, gang | `scene_switch_X` |
| strip, led | `led_strip` |

**Patterns spéciaux:**
- `TS0601` → `climate_sensor` (par défaut)
- `TS011F` → `plug_smart`
- `TS0505B` → `bulb_rgbw`
- `TS0044` → `scene_switch_4`

---

## 🚨 **TROUBLESHOOTING**

### **Problèmes Courants**

#### ❌ **"Could not fetch issues"**
```bash
# Vérifier GitHub CLI
gh auth status

# Ou configurer token GitHub
set GITHUB_TOKEN=your_token
```

#### ❌ **"Build failed after device addition"**
```bash
# Rollback automatique activé - vérifier logs
node scripts\automation\safety-validator.js rollback

# Vérifier manuellement
homey app build
```

#### ❌ **"Device quarantined"**
```bash
# Consulter la quarantaine
dir quarantine\

# Rapport détaillé
node scripts\automation\safety-validator.js report
```

#### ❌ **"Scheduled task not working"**
```powershell
# Réinstaller la tâche
powershell scripts\automation\auto-scheduler.ps1 -Action Uninstall
powershell scripts\automation\auto-scheduler.ps1 -Action Install

# Vérifier manuellement
schtasks /query /tn TuyaZigbeeAutoMonitor
```

### **Logs de Debug**
```powershell
# Logs détaillés
Get-Content logs\automation\auto-monitor-*.log -Tail 50

# Filtrer par niveau d'erreur
Get-Content logs\automation\*.log | Select-String "ERROR"
```

### **Reset Complet**
```powershell
# Arrêt complet
powershell scripts\automation\auto-scheduler.ps1 -Action Stop

# Nettoyage
Remove-Item logs\automation\* -Force
Remove-Item quarantine\* -Force

# Réinstallation
powershell scripts\automation\install-automation.ps1
```

---

## 📈 **STATISTIQUES ET MÉTRIQUES**

Le système track automatiquement:
- 📊 **Issues traitées**: Nombre total d'issues GitHub analysées
- 🎯 **Devices ajoutées**: Devices intégrées avec succès
- 🚀 **Déploiements automatiques**: Versions publiées automatiquement
- ⚠️ **Erreurs de validation**: Devices rejetées ou quarantainées
- 💾 **Backups créées**: Sauvegardes de sécurité
- 🕐 **Uptime**: Temps de fonctionnement continu

### **Rapport Automatique**
```bash
# Statistiques complètes
node scripts\automation\github-auto-monitor.js --stats

# Rapport de sécurité
node scripts\automation\safety-validator.js report
```

---

## 🎯 **UTILISATION OPTIMALE**

### **Workflow Recommandé**
1. **Installation**: Une seule fois avec le script d'installation
2. **Configuration**: Ajuster `config.json` selon vos besoins
3. **Monitoring**: Dashboard ouvert pendant les heures actives
4. **Maintenance**: Vérification hebdomadaire des logs et quarantaine

### **Bonnes Pratiques**
- ✅ Laisser le système tourner en continu via la tâche planifiée
- ✅ Consulter le dashboard régulièrement
- ✅ Vérifier les logs en cas d'anomalie
- ✅ Ne pas modifier manuellement les drivers pendant l'automatisation
- ✅ Garder GitHub CLI à jour pour de meilleures performances

### **Maintenance**
```bash
# Nettoyage hebdomadaire automatique
node scripts\automation\safety-validator.js clean-backups

# Vérification santé système
powershell scripts\automation\auto-scheduler.ps1 -Action Status
```

---

## 🎊 **RÉSULTATS ATTENDUS**

Avec ce système, vous obtiendrez:

- **🤖 Automatisation 100%** des demandes de devices GitHub
- **⚡ Réactivité maximale** (traitement en moins d'1h)
- **🛡️ Sécurité garantie** avec validation et backups
- **📊 Transparence complète** via dashboard et logs
- **🚀 Déploiement continu** sans intervention manuelle
- **💯 Fiabilité système** avec rollback automatique

**Résultat concret**: Les utilisateurs de Johan auront leurs devices supportés automatiquement dans votre app, avec réponse automatique confirmant l'intégration!

---

## 📞 **SUPPORT**

- **Logs**: `logs\automation\` pour diagnostic
- **Dashboard**: Monitoring temps réel
- **Quarantaine**: `quarantine\` pour devices problématiques
- **Backups**: `backups\automation\` pour recovery
- **Configuration**: `scripts\automation\config.json`

**Le système est conçu pour être 100% autonome une fois installé!** 🚀
