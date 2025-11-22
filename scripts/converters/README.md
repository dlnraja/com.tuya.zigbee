# 🔄 Automatic Converters System

## Overview

Ce système convertit automatiquement les informations Zigbee d'autres systèmes (Zigbee2MQTT, ZHA, Blakadder) vers le format Homey SDK3.

## Structure

```
scripts/
├── converters/
│   ├── cluster-converter.js      # Convertit les noms de clusters
│   ├── capability-converter.js   # Convertit les capabilities
│   └── device-converter.js       # Convertit les devices complets
├── monthly-enrichment.js         # Script d'enrichissement mensuel
└── blakadder-sync.js            # Synchronisation Blakadder
```

## Usage

### Conversion Manuel

```bash
# Convertir un cluster
node -e "console.log(require('./converters/cluster-converter').convertCluster('genOnOff'))"
# Output: 6

# Convertir une capability
node -e "console.log(require('./converters/capability-converter').convertCapability('temperature'))"
# Output: measure_temperature
```

### Enrichissement Automatique

```bash
# Run monthly enrichment
node scripts/monthly-enrichment.js
```

### CI/CD Automatique

Le workflow GitHub Actions `.github/workflows/monthly-update.yml` s'exécute automatiquement le 1er de chaque mois pour :

1. ✅ Scanner tous les drivers
2. ✅ Ajouter IAS Zone aux boutons
3. ✅ Mettre à jour les manufacturer IDs
4. ✅ Créer un Pull Request automatique

## Conversion Tables

### Clusters (ZHA/Z2M → Homey)

| ZHA/Z2M Name | Homey ID | Usage |
|--------------|----------|-------|
| genBasic | 0 | Basic device info |
| genOnOff | 6 | On/Off control |
| ssIasZone | 1280 | Buttons, sensors |
| genLevelCtrl | 8 | Dimming |

### Capabilities (Z2M → Homey)

| Zigbee2MQTT | Homey | Description |
|-------------|-------|-------------|
| state | onoff | On/Off state |
| brightness | dim | Dimming level |
| temperature | measure_temperature | Temperature °C |
| occupancy | alarm_motion | Motion detection |

## Monthly Tasks

L'enrichissement mensuel effectue :

1. **Scan drivers** - Analyse tous les drivers existants
2. **Add missing clusters** - Ajoute clusters manquants (IAS Zone, etc.)
3. **Update manufacturer IDs** - Synchronise avec Blakadder
4. **Validate** - Exécute `homey app validate`
5. **Create PR** - Crée pull request avec changements

## Contributing

Pour ajouter une nouvelle conversion :

1. Éditer `converters/cluster-converter.js` ou `capability-converter.js`
2. Ajouter mapping dans CLUSTER_MAP ou CAPABILITY_MAP
3. Tester avec `node converters/test.js`
4. Commit et push

## Resources

- [Homey SDK3 Docs](https://apps.developer.homey.app)
- [Blakadder Database](https://zigbee.blakadder.com)
- [Zigbee2MQTT Devices](https://www.zigbee2mqtt.io/supported-devices)
