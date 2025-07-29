# 🔧 Correction des Problèmes CLI Homey

## 🚨 Problème Identifié

### Erreur CLI Homey
```
Error: Could not find a valid Homey App at '...':
Found 'app.json' file does not contain the required properties for a valid Homey app
```

### Causes Principales
1. **Fichier `app.json` invalide** : Champs requis absents ou syntaxe JSON incorrecte
2. **Fichier `app.js` manquant** : Point d'entrée principal non défini
3. **Structure de dossiers incorrecte** : Nom de dossier ne correspond pas à l'ID de l'app
4. **Drivers mal référencés** : `driver.compose.json` manquants ou invalides

## ✅ Solution Implémentée

### 🔧 Scripts de Correction Automatique

#### 1. `fix-app-structure.js`
```bash
npm run fix-app-structure
```

**Fonctionnalités :**
- ✅ Valide le schéma JSON de `app.json`
- ✅ Crée un `app.json` valide si absent
- ✅ Crée un `app.js` valide si manquant
- ✅ Corrige les chemins des drivers
- ✅ Crée la structure de dossiers complète
- ✅ Valide avec Homey CLI si disponible

#### 2. `validate-homey-cli.js`
```bash
npm run validate-homey-cli
```

**Fonctionnalités :**
- ✅ Vérifie si Homey CLI est installé
- ✅ Valide l'app avec `homey app validate`
- ✅ Teste l'installation avec `homey app install`
- ✅ Génère un rapport de compatibilité
- ✅ Analyse les erreurs et propose des corrections

### 📋 Structure `app.json` Valide

```json
{
  "id": "com.tuya.zigbee",
  "name": {
    "en": "Tuya Zigbee",
    "fr": "Tuya Zigbee",
    "nl": "Tuya Zigbee",
    "ta": "Tuya Zigbee"
  },
  "description": {
    "en": "Universal Tuya Zigbee driver pack with comprehensive device support",
    "fr": "Pack de drivers Tuya Zigbee universel avec support complet des appareils",
    "nl": "Universeel Tuya Zigbee driver pakket met uitgebreide apparaatondersteuning",
    "ta": "உலகளாவிய Tuya Zigbee driver pack முழுமையான சாதன ஆதரவுடன்"
  },
  "version": "1.0.12",
  "compatibility": ">=5.0.0",
  "sdk": 3,
  "category": ["automation", "utilities"],
  "author": {
    "name": "Dylan Rajasekaram",
    "email": "[redacted-email]"
  },
  "main": "app.js",
  "drivers": [
    {
      "id": "generic-fallback",
      "name": {
        "en": "Generic Fallback Driver"
      }
    }
  ],
  "images": {
    "small": "./assets/images/small.png",
    "large": "./assets/images/large.png"
  },
  "bugs": "https://github.com/dlnraja/tuya_repair/issues",
  "homepage": "https://github.com/dlnraja/tuya_repair#readme",
  "repository": "https://github.com/dlnraja/tuya_repair",
  "license": "MIT"
}
```

### 📋 Structure `app.js` Valide

```javascript
'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('Tuya Zigbee App is running...');
        
        // Log des statistiques
        this.log('App initialized with comprehensive Tuya and Zigbee support');
        
        // Émettre un événement pour indiquer que l'app est prête
        this.homey.on('ready', () => {
            this.log('Homey is ready, Tuya Zigbee drivers are available');
        });
    }
    
    async onUninit() {
        this.log('Tuya Zigbee App is shutting down...');
    }
}

module.exports = TuyaZigbeeApp;
```

## 🔄 Workflow GitHub Actions

### `.github/workflows/validate-app-structure.yml`

**Déclencheurs :**
- Push sur `master` ou `main`
- Pull requests
- Planification quotidienne (2h du matin)

**Étapes :**
1. ✅ Checkout du code
2. ✅ Setup Node.js 18
3. ✅ Installation des dépendances
4. ✅ Correction automatique de la structure
5. ✅ Validation Homey CLI (si disponible)
6. ✅ Génération du rapport
7. ✅ Commit automatique des corrections
8. ✅ Upload des artefacts

## 🧪 Tests de Validation

### Test Manuel
```bash
# 1. Corriger la structure
npm run fix-app-structure

# 2. Valider avec Homey CLI
npm run validate-homey-cli

# 3. Tester l'installation (si Homey CLI installé)
homey app validate
homey app install
```

### Test Automatique
```bash
# Exécuter la pipeline complète
npm run mega-pipeline
```

## 📊 Rapports de Validation

### Fichiers de Sortie
- `logs/fix-app-structure.log` : Logs de correction
- `logs/validate-homey-cli.log` : Logs de validation
- `data/app-structure-validation.json` : Résultats de validation
- `data/homey-cli-validation.json` : Rapport CLI

### Métriques de Qualité
- ✅ **Structure valide** : app.json + app.js présents
- ✅ **Drivers valides** : Tous les driver.compose.json parsables
- ✅ **Chemins corrects** : Images et fichiers référencés
- ✅ **CLI compatible** : Validation Homey CLI réussie

## 🚀 Intégration dans la Pipeline

### Mega-Pipeline
La correction de structure est intégrée dans `mega-pipeline.js` :

```javascript
// 1. Correction de la structure de l'app
results.appStructure = runStep("Correction de la structure de l'app", fixAppStructure);

// 2. Validation Homey CLI
results.homeyValidation = runStep("Validation Homey CLI", validateHomeyCLI);
```

### Scripts Disponibles
```bash
npm run fix-app-structure      # Correction automatique
npm run validate-homey-cli     # Validation CLI
npm run mega-pipeline          # Pipeline complète
```

## 🔍 Diagnostic des Problèmes

### Erreurs Courantes

#### 1. "app.json does not contain required properties"
**Solution :** Exécuter `npm run fix-app-structure`

#### 2. "app.js not found"
**Solution :** Le script crée automatiquement `app.js`

#### 3. "Invalid JSON syntax"
**Solution :** Le script corrige la syntaxe JSON

#### 4. "Drivers not found"
**Solution :** Le script vérifie et corrige les chemins des drivers

### Logs de Diagnostic
```bash
# Vérifier les logs de correction
cat logs/fix-app-structure.log

# Vérifier les logs de validation
cat logs/validate-homey-cli.log

# Vérifier les données de validation
cat data/app-structure-validation.json
```

## 📈 Améliorations Futures

### Fonctionnalités Planifiées
- 🔄 Validation en temps réel des modifications
- 🤖 Correction automatique des drivers malformés
- 📊 Dashboard de compatibilité en temps réel
- 🔗 Intégration avec l'API Homey Cloud
- 🧪 Tests automatisés de tous les drivers

### Métriques Avancées
- 📊 Score de compatibilité par driver
- 🔍 Analyse des capacités manquantes
- 🏠 Test multi-Homey box
- 🔧 Validation multi-firmware

---

**📅 Dernière mise à jour :** 2025-07-29  
**🔧 Version :** 1.0.12-20250729-1645  
**👨‍💻 Maintenu par :** dlnraja / [redacted-email] 