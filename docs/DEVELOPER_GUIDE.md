# Guide du Développeur - Projet Tuya Zigbee pour Homey

## Table des Matières
1. [Introduction](#introduction)
2. [Structure du Projet](#structure-du-projet)
3. [Standards de Code](#standards-de-code)
4. [Développement de Drivers](#développement-de-drivers)
5. [Tests et Validation](#tests-et-validation)
6. [Documentation](#documentation)
7. [Workflow de Contribution](#workflow-de-contribution)
8. [Bonnes Pratiques](#bonnes-pratiques)
9. [Dépannage](#dépannage)
10. [Sécurité](#sécurité)

## Introduction

Ce guide fournit des directives complètes pour les développeurs travaillant sur le projet Tuya Zigbee pour Homey. Il couvre les standards de code, les bonnes pratiques et les processus de développement.

## Structure du Projet

```
.
├── .github/                 # Fichiers de configuration GitHub
│   └── workflows/          # Workflows GitHub Actions
├── drivers/                # Répertoire des drivers
│   ├── _common/            # Code partagé entre les drivers
│   └── [driver-name]/      # Répertoire d'un driver spécifique
│       ├── device.js       # Logique de l'appareil
│       ├── driver.js       # Configuration du driver
│       ├── driver.compose.json # Métadonnées du driver
│       └── README.md       # Documentation du driver
├── scripts/                # Scripts d'automatisation
├── test/                   # Tests automatisés
├── docs/                   # Documentation
├── data/                   # Données générées (matrice des devices, etc.)
└── tuya-light/             # Version allégée du projet
```

## Standards de Code

### JavaScript/Node.js
- Utiliser le style de code ES6+ avec des modules ES
- Suivre les règles ESLint configurées dans `.eslintrc.js`
- Formater le code avec Prettier selon la configuration `.prettierrc`
- Utiliser `const` par défaut, `let` uniquement si nécessaire, éviter `var`
- Utiliser les fonctions fléchées pour les callbacks
- Utiliser `async/await` pour le code asynchrone

### Fichiers de Configuration
- Utiliser JSON pour les fichiers de configuration statiques
- Utiliser YAML pour les configurations plus complexes (comme les workflows GitHub)
- Toujours valider les fichiers de configuration avec des schémas JSON

### Gestion des Erreurs
- Toujours attraper les erreurs dans les promesses et les appels asynchrones
- Fournir des messages d'erreur descriptifs
- Utiliser des erreurs personnalisées quand c'est pertinent

## Développement de Drivers

### Structure d'un Driver

Chaque driver doit avoir la structure suivante :

```
drivers/
  [driver-id]/
    device.js         # Classe de l'appareil (hérite de ZigbeeDevice)
    driver.js         # Classe du driver (hérite de Driver)
    driver.compose.json # Métadonnées du driver
    README.md         # Documentation du driver
    assets/           # Images et autres ressources
      images/
        icon.svg      # Icône du driver (SVG)
        large.png     # Grande image (500x500px)
        small.png     # Petite image (100x100px)
```

### Fichier driver.compose.json

```json
{
  "id": "TS0601_thermostat",
  "name": "Thermostat Intelligent",
  "description": "Pilote pour le thermostat intelligent Tuya Zigbee",
  "version": "1.0.0",
  "author": "Votre Nom <votre@email.com>",
  "category": "climate",
  "tags": ["tuya", "zigbee", "thermostat", "climate"],
  "capabilities": ["target_temperature", "measure_temperature", "measure_humidity"],
  "images": {
    "small": "/drivers/TS0601_thermostat/assets/images/small.png",
    "large": "/drivers/TS0601_thermostat/assets/images/large.png",
    "xlarge": "/drivers/TS0601_thermostat/assets/images/large.png"
  },
  "pair": [
    {
      "id": "list_devices",
      "template": "list_devices",
      "navigation": {
        "next": "add_devices"
      }
    },
    {
      "id": "add_devices",
      "template": "add_devices"
    }
  ]
}
```

### Classe Device (device.js)

```javascript
const { ZigbeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class TuyaThermostatDevice extends ZigbeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialisation de l'appareil
    this.log('Device has been initialized');
    
    // Activer le débogage
    this.enableDebug();
    
    // Enregistrer les capacités
    await this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
    await this.registerCapability('target_temperature', CLUSTER.THERMOSTAT);
    
    // Configurer les attributs à écouter
    this.registerCapabilityListener('target_temperature', async (value) => {
      // Logique pour définir la température cible
      await this.setTargetTemperature(value);
    });
  }
  
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // Gérer les changements de paramètres
    this.log('Settings were changed:', changedKeys);
  }
  
  async onDeleted() {
    // Nettoyage lors de la suppression de l'appareil
    this.log('Device has been deleted');
  }
  
  // Méthodes personnalisées
  async setTargetTemperature(temperature) {
    // Implémentation de la logique pour définir la température
    this.log(`Setting target temperature to ${temperature}°C`);
    // ...
  }
}

module.exports = TuyaThermostatDevice;
```

## Tests et Validation

### Types de Tests

1. **Tests Unitaires** : Testent des fonctions individuelles en isolation
2. **Tests d'Intégration** : Testent l'interaction entre les composants
3. **Tests E2E** : Testent des flux complets de bout en bout
4. **Tests de Performance** : Vérifient les performances du système

### Exécution des Tests

```bash
# Exécuter tous les tests
npm test

# Exécuter uniquement les tests unitaires
npm run test:unit

# Exécuter les tests en mode watch
npm run test:watch

# Exécuter les tests avec couverture de code
npm run test:coverage

# Valider la structure des drivers
node scripts/validate-drivers.mjs
```

### Validation des Drivers

Chaque driver doit passer la validation avant d'être fusionné dans la branche principale. La validation vérifie :

- La présence des fichiers requis
- La validité du fichier de configuration
- La conformité aux normes de codage
- La couverture de test minimale

## Documentation

### Documentation des Drivers

Chaque driver doit inclure un fichier `README.md` avec les sections suivantes :

```markdown
# Nom du Driver

## Description
Description détaillée du driver et des appareils pris en charge.

## Fonctionnalités
- Liste des fonctionnalités prises en charge
- Limitations connues

## Configuration
Instructions de configuration détaillées.

## Paires Prise en Charge
Liste des paires prises en charge avec des exemples.

## Dépannage
Solutions aux problèmes courants.

## Changelog
Historique des modifications.
```

### Documentation du Code

- Documenter toutes les fonctions et classes avec des commentaires JSDoc
- Inclure des exemples d'utilisation pour les API complexes
- Documenter les décisions de conception importantes

## Workflow de Contribution

1. **Créer une branche**
   ```bash
   git checkout -b feature/nouvelle-fonctionnalite
   ```

2. **Faire des commits atomiques**
   ```bash
   git add .
   git commit -m "feat(thermostat): ajouter la prise en charge de la température cible
   
   - Ajout de la méthode setTargetTemperature
   - Mise à jour de la documentation
   - Correction des tests unitaires"
   ```

3. **Pousser les modifications**
   ```bash
   git push origin feature/nouvelle-fonctionnalite
   ```

4. **Créer une Pull Request**
   - Décrire les modifications apportées
   - Référencer les issues concernées
   - Demander une revue de code

## Bonnes Pratiques

### Gestion des Erreurs
- Toujours attraper et logger les erreurs
- Fournir des messages d'erreur utiles
- Utiliser des erreurs personnalisées quand c'est pertinent

### Journalisation
- Utiliser les différents niveaux de log (error, warn, info, debug)
- Inclure des identifiants de corrélation pour le suivi
- Éviter de logger des données sensibles

### Performance
- Éviter les boucles synchrones longues
- Utiliser le cache quand c'est approprié
- Optimiser les appels réseau et E/S

## Dépannage

### Problèmes Courants

1. **L'appareil ne se connecte pas**
   - Vérifier la portée du signal
   - S'assurer que l'appareil est en mode appairage
   - Vérifier les logs pour des erreurs spécifiques

2. **Les commandes ne fonctionnent pas**
   - Vérifier que les clusters et attributs sont corrects
   - S'assurer que les capacités sont correctement enregistrées
   - Vérifier les logs pour des erreurs de communication

3. **Problèmes de performances**
   - Vérifier les boucles d'événements bloquantes
   - Analyser l'utilisation de la mémoire
   - Optimiser les requêtes réseau et E/S

## Sécurité

### Bonnes Pratiques de Sécurité
- Ne jamais stocker de mots de passe en clair
- Utiliser des variables d'environnement pour les informations sensibles
- Valider toutes les entrées utilisateur
- Maintenir les dépendances à jour
- Suivre le principe du moindre privilège

### Audit de Sécurité
- Exécuter régulièrement `npm audit`
- Mettre à jour les dépendances vulnérables
- Réviser les autorisations des tiers

---

Ce document est vivant et sera mis à jour régulièrement. Les contributions sont les bienvenues !
