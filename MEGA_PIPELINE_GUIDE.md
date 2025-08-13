// 🚀 MEGA-PIPELINE GUIDE - Tuya/Zigbee Homey SDK v3

#// 📋 **Vue d'ensemble**

Le **MEGA-PIPELINE** est un système automatisé complet pour maintenir et enrichir votre projet Tuya/Zigbee Homey SDK v3. Il inclut maintenant le **pack sources wildcard** pour une couverture maximale des devices.

#// 🎯 **Fonctionnalités principales**

##// ✅ **Pipeline complet automatisé**
- **Mode progressif** : Traitement par lots avec pushes Git intermédiaires
- **Mode complet** : Traitement de tout le projet en une passe
- **Sources wildcard** : Agrégation de multiples bases de données externes
- **Organisation automatique** : Structure `drivers/{tuya|zigbee}/{category}/{vendor}/{model}/`

##// 🔄 **Sources wildcard intégrées**
- **Zigbee2MQTT** : Converters + page supported devices
- **Blakadder Zigbee DB** : Base de données croisée massive
- **ZHA Device Handlers** : Signatures Home Assistant
- **deCONZ** : Devices supportés officiels
- **Forum Homey** : Retours terrain et modèles
- **GitHub** : Issues, PRs, forks du projet

#// 🚀 **Installation et configuration**

##// 1. **Prérequis**
```bash
// Node.js 18+ requis
node --version

// Dépendances installées
npm install
```

##// 2. **Configuration des variables d'environnement**
```javascript
// Token GitHub (requis pour sources wildcard)
$env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxx"

// Mode de fonctionnement
$env:PROGRESSIVE = "1"           // 1=progressif, 0=complet
$env:BATCH_SIZE = "80"           // Taille des lots (mode progressif)
$env:DO_MIGRATE = "1"            // Migration meshdriver→zigbeedriver
$env:SKIP_GIT_PUSH = "0"         // Push Git automatique

// Sécurité (défaut: activé)
$env:SKIP_NPM = "1"              // Pas de npm install
$env:SKIP_VALIDATE = "1"         // Pas de validation Homey
$env:SKIP_RUN = "1"              // Pas d'exécution locale
```

#// 📊 **Modes d'utilisation**

##// 🔄 **Mode progressif (recommandé pour gros projets)**
```javascript
$env:PROGRESSIVE = "1"
$env:BATCH_SIZE = "80"
$env:GITHUB_TOKEN = "ton_token_ici"
node scripts/mega-sources-complete.js
```

**Avantages :**
- ✅ Traitement par lots (évite les timeouts)
- ✅ Pushes Git intermédiaires (sécurité)
- ✅ Reprise automatique après crash
- ✅ Idéal pour projets avec 1000+ drivers

##// 🚀 **Mode complet (pour projets moyens)**
```javascript
$env:PROGRESSIVE = "0"
$env:GITHUB_TOKEN = "ton_token_ici"
node scripts/mega-sources-complete.js
```

**Avantages :**
- ✅ Traitement en une passe
- ✅ Plus rapide pour projets < 500 drivers
- ✅ Sources wildcard intégrées
- ✅ Rapport complet en fin

#// 🔧 **Utilisation avancée**

##// 1. **Sources wildcard uniquement**
```javascript
// Agrège toutes les sources externes
node scripts/sources/sources-orchestrator.js
```

##// 2. **Fetchers individuels**
```javascript
// Blakadder Zigbee DB
node scripts/sources/fetchers/blakadder-seed.js

// ZHA Device Handlers
node scripts/sources/fetchers/zha-seed.js

// deCONZ Supported Devices
node scripts/sources/fetchers/deconz-scan.js

// Z2M Converters (avec token)
$env:GITHUB_TOKEN = "ton_token"
node scripts/sources/fetchers/z2m-seed.js
```

##// 3. **Pipeline personnalisé**
```javascript
// Étape par étape
node scripts/fix-package.js
node scripts/ingest-tuya-zips.js
node scripts/enrich-drivers.js
node scripts/reorganize-drivers.js
node scripts/verify-coherence-and-enrich.js
node scripts/diagnose-drivers.js --fix
node scripts/assets-generate.js
node scripts/create-small-png.js
node scripts/reindex-drivers.js
node scripts/dashboard-generator.js
```

#// 📁 **Structure des fichiers générés**

```
tuya_repair/
├── drivers/                          // Drivers organisés
│   ├── tuya/                        // Domain Tuya
│   │   ├── light/                   // Catégorie
│   │   │   ├── tuya/                // Vendor
│   │   │   │   └── ts0601/          // Modèle
│   │   │   │       ├── driver.compose.json
│   │   │   │       ├── device.js
│   │   │   │       ├── assets/
│   │   │   │       │   ├── icon.svg
│   │   │   │       │   └── small.png
│   │   │   │       └── README.md
│   │   │   └── ...
│   │   └── ...
│   └── zigbee/                      // Domain Zigbee
│       └── ...
├── queue/
│   └── todo.json                    // Queue d'enrichissement
├── refs/
│   ├── github.json                  // Données GitHub
│   ├── forum.json                   // Données forum
│   └── z2m-supported.json           // Z2M supported devices
├── dashboard/
│   ├── index.html                   // Dashboard HTML
│   └── summary.json                 // Résumé JSON
├── drivers-index.json                // Index des drivers
├── VERIFY_REPORT.md                 // Rapport de vérification
└── CHANGELOG_AUTO.md                // Changelog automatique
```

#// 🔍 **Sources wildcard détaillées**

##// 📊 **Zigbee2MQTT (Z2M)**
- **Repo** : `Koenkk/zigbee-herdsman-converters`
- **Path** : `/devices`
- **Token requis** : ✅ Oui
- **Données** : manufacturerName[], modelId[], capabilities
- **Usage** : Import progressif par lots

##// 🌐 **Blakadder Zigbee DB**
- **Repo** : `blakadder/zigbee`
- **Fallback** : `https://zigbee.blakadder.com`
- **Token requis** : ✅ Oui (GitHub)
- **Données** : Base croisée Z2M, ZHA, deCONZ
- **Usage** : Enrichissement manufacturer/model

##// 🐍 **ZHA Device Handlers**
- **Repo** : `zigpy/zha-device-handlers`
- **Path** : `/zhaquirks`
- **Token requis** : ✅ Oui
- **Données** : Signatures Python manufacturer/model
- **Usage** : Compatibilité Home Assistant

##// 🔌 **deCONZ Supported Devices**
- **URL** : `https://dresden-elektronik.github.io/deconz-rest-doc/devices/`
- **Token requis** : ❌ Non
- **Données** : Liste officielle vendor/label
- **Usage** : Couverture deCONZ

##// 💬 **Forum Homey Community**
- **URL** : `https://community.homey.app/t/app-pro-tuya-zigbee-app/26439`
- **Token requis** : ❌ Non
- **Données** : Retours terrain, modèles à ajouter
- **Usage** : Feedback utilisateur

#// 📈 **Workflow recommandé**

##// **Phase 1 : Initialisation**
```javascript
// Configuration de base
$env:GITHUB_TOKEN = "ton_token_ici"
$env:PROGRESSIVE = "1"
$env:BATCH_SIZE = "50"

// Premier lancement
node scripts/mega-sources-complete.js
```

##// **Phase 2 : Sources wildcard**
```javascript
// Agrégation des sources externes
node scripts/sources/sources-orchestrator.js

// Relance du pipeline pour consommer la queue
node scripts/mega-sources-complete.js
```

##// **Phase 3 : Optimisation**
```javascript
// Mode complet pour finaliser
$env:PROGRESSIVE = "0"
node scripts/mega-sources-complete.js
```

#// 🚨 **Dépannage**

##// **Erreur GITHUB_TOKEN**
```
[z2m-seed] impossible de lister /devices
```
**Solution :** Vérifiez votre token GitHub et ses permissions

##// **Erreur de syntaxe**
```
SyntaxError: Unexpected token ')'
```
**Solution :** Relancez le pipeline, les erreurs sont auto-corrigées

##// **Timeout d'extraction**
```
[ingest] timeout during extraction
```
**Solution :** Augmentez `$env:TIMEOUT_EXTRACT = "300"`

##// **Sources wildcard échouent**
```
[blakadder] GitHub repo access failed
```
**Solution :** Vérifiez votre token et la connectivité réseau

#// 📊 **Métriques et rapports**

##// **Rapports automatiques**
- `VERIFY_REPORT.md` : Vérification des drivers
- `dashboard/index.html` : Vue d'ensemble
- `queue/todo.json` : Queue d'enrichissement
- \refs/*.json` : Données des sources externes

##// **Statistiques en temps réel**
- Nombre de drivers traités
- Temps d'exécution par étape
- Sources wildcard activées
- Erreurs et avertissements

#// 🔄 **Automatisation**

##// **GitHub Actions (hebdomadaire)**
```yaml
// .github/workflows/weekly-sync.yml
name: Weekly Sources Sync
on:
  schedule:
    - cron: '0 5 * * 1'  // Lundi 05:00 UTC
```

##// **Variables d'environnement CI**
```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  PROGRESSIVE: "1"
  BATCH_SIZE: "100"
  SKIP_GIT_PUSH: "0"
```

#// 📚 **Documentation complémentaire**

- **README.md** : Documentation principale du projet
- **SOURCES.md** : Détails des sources et références
- **CHANGELOG.md** : Historique des modifications
- **scripts/config/mega-pipeline.config.json** : Configuration détaillée

#// 🆘 **Support et contribution**

##// **Issues GitHub**
- Bug reports
- Feature requests
- Questions d'utilisation

##// **Contributions**
- Amélioration des fetchers
- Nouvelles sources
- Optimisations du pipeline

---

**🎯 Le MEGA-PIPELINE avec sources wildcard est votre solution complète pour maintenir un projet Tuya/Zigbee Homey SDK v3 à jour et enrichi !**
