# 🤖 Système d'Intelligence Automatique

Extraction et consolidation automatique des données depuis sources externes pour génération de drivers Homey.

## 📚 Sources Supportées

1. **Zigbee2MQTT** (https://www.zigbee2mqtt.io/)
   - Database complète devices Tuya
   - DataPoints (DPs) avec converters
   - Capabilities mappings
   - Ranges et limites

2. **Blakadder Database** (https://zigbee.blakadder.com/)
   - Specifications techniques détaillées
   - Manufacturer IDs précis
   - Features et capabilities
   - User reviews

3. **Sources Internes**
   - tuya-datapoints-database.js existant
   - Drivers configurations actuels
   - Retours forum Homey

## 🚀 Utilisation

### 1. Extraction Zigbee2MQTT

```bash
node scripts/intelligence/auto-extract-zigbee2mqtt.js
```

**Résultat**:
- `data/extracted/zigbee2mqtt-extracted.json` - Devices complets
- `data/extracted/extraction-summary.json` - Statistiques
- `.cache/z2m-devices.json` - Cache pour performance

**Contenu extrait**:
- Model & Vendor
- Capabilities Homey mappées
- DataPoints Tuya avec converters
- Ranges (min/max/step)
- Endpoints Zigbee

### 2. Extraction Blakadder

```bash
node scripts/intelligence/auto-extract-blakadder.js
```

**Résultat**:
- `data/extracted/blakadder-extracted.json` - Specifications
- `data/extracted/blakadder-summary.json` - Statistiques
- `.cache/blakadder-devices.json` - Cache

**Contenu extrait**:
- Manufacturer IDs exacts
- Power source (battery/mains)
- Features parsés depuis description
- Links documentation
- User notes

### 3. Consolidation

```bash
node scripts/intelligence/consolidate-and-generate.js
```

**Résultat**:
- `data/consolidated/datapoints-consolidated.json` - DB unifiée
- `data/consolidated/datapoints-consolidated.js` - Module JS
- `data/consolidated/consolidation-stats.json` - Métriques

**Processus**:
1. Merge données Z2M + Blakadder + Existing
2. Résolution conflits (priorité: Z2M > Blakadder > Existing)
3. Génération base de données consolidée
4. Calcul confidence scores

## 📊 Structure des Données

### Zigbee2MQTT Extract

```json
{
  "id": "switch_2gang_ts0002",
  "name": "2 Gang Smart Switch",
  "class": "socket",
  "capabilities": ["onoff", "onoff.gang2", "measure_power"],
  "datapoints": [
    {
      "dp": 1,
      "name": "state_l1",
      "converter": "onoff",
      "source": "zigbee2mqtt"
    }
  ],
  "zigbee": {
    "manufacturerName": ["_TZ3000_xabckq1v"],
    "productId": ["TS0002"],
    "endpoints": {
      "1": { "clusters": [0, 1, 3, 4, 5, 6], "bindings": [6] },
      "2": { "clusters": [0, 4, 5, 6], "bindings": [6] }
    }
  }
}
```

### Blakadder Extract

```json
{
  "identification": {
    "model": "TS0002",
    "vendor": "Tuya",
    "manufacturerId": "_TZ3000_xabckq1v",
    "description": "2 Gang Smart Switch"
  },
  "capabilities": ["onoff"],
  "power": {
    "source": "mains",
    "battery": null
  },
  "features": [
    {
      "keyword": "switch",
      "capability": "onoff",
      "source": "description_parsing"
    }
  ]
}
```

### Consolidated DataPoints

```json
{
  "ENERGY": {
    "1": {
      "name": "onoff",
      "capability": "onoff",
      "type": "bool",
      "converter": "boolean",
      "sources": ["existing", "zigbee2mqtt"],
      "confidence": "high"
    },
    "18": {
      "name": "current",
      "capability": "measure_current",
      "type": "value",
      "converter": "divideBy1000",
      "unit": "A",
      "sources": ["existing", "zigbee2mqtt", "blakadder"],
      "confidence": "high"
    }
  }
}
```

## 🔄 Workflow Complet

```bash
# 1. Extraction depuis sources externes
npm run extract:z2m
npm run extract:blakadder

# 2. Consolidation
npm run consolidate

# 3. Génération drivers (à implémenter)
npm run generate:drivers

# 4. Validation
npm run validate:drivers
```

## ⚙️ Configuration

### Cache

Les données sont cachées dans `.cache/` pour éviter de surcharger les APIs externes.

**Durée cache**: Configurable dans chaque script
**Nettoyage**: `rm -rf .cache/`

### Rate Limiting

Scripts incluent des délais entre requêtes:
- Zigbee2MQTT: 200ms entre devices
- Blakadder: 500ms entre devices

### Fallback

Si fetch échoue, scripts utilisent cache automatiquement.

## 📈 Métriques

### Extraction Stats

```json
{
  "total": 156,
  "byClass": {
    "socket": 45,
    "sensor": 38,
    "light": 29,
    "thermostat": 12
  },
  "capabilities": 67,
  "datapoints": 128
}
```

### Consolidation Stats

```json
{
  "total": 245,
  "bySource": {
    "existing": 135,
    "zigbee2mqtt": 87,
    "blakadder": 23
  },
  "conflicts": 12
}
```

## 🐛 Troubleshooting

### "No devices fetched"

**Cause**: API non accessible ou JSON format changé

**Solution**:
1. Vérifier connexion internet
2. Consulter cache: `.cache/*.json`
3. Vérifier URLs dans scripts

### "Conflicts found"

**Cause**: DataPoint identique avec noms différents

**Solution**:
1. Review `consolidation-stats.json`
2. Résoudre manuellement dans code
3. Priorité: Z2M > Blakadder > Existing

### "Rate limit exceeded"

**Cause**: Trop de requêtes

**Solution**:
1. Augmenter délais dans scripts
2. Utiliser cache existant
3. Exécuter par lots plus petits

## 🔗 Ressources

- [Zigbee2MQTT Docs](https://www.zigbee2mqtt.io/guide/)
- [Blakadder Database](https://zigbee.blakadder.com/)
- [Tuya DataPoints Guide](https://developer.tuya.com/)
- [Homey SDK3 Reference](https://apps-sdk-v3.developer.homey.app/)

## 📝 Notes Techniques

### DataPoint Converters

**Z2M Converters** → **Homey Converters**:
- `tuya.valueConverter.raw` → raw value
- `tuya.valueConverter.divideBy10` → value / 10
- `tuya.valueConverter.trueFalse1` → boolean
- `tuya.valueConverter.onOff` → boolean

### Confidence Scores

- **High (≥70)**: Z2M + Blakadder + Existing
- **Medium (40-69)**: Z2M ou Blakadder + Existing
- **Low (<40)**: Single source ou inféré

### Auto-Generation Roadmap

- [ ] Extract from Z2M ✅
- [ ] Extract from Blakadder ✅
- [ ] Consolidate sources ✅
- [ ] Generate driver.compose.json
- [ ] Generate device.js with DPs
- [ ] Generate Flow cards
- [ ] Generate documentation
- [ ] Validate against SDK3
- [ ] Auto-PR to repo

## 🤝 Contributing

Pour ajouter une nouvelle source:

1. Créer `auto-extract-[source].js`
2. Implémenter `fetchDevices()` et `parseDevice()`
3. Sauvegarder dans `data/extracted/[source]-extracted.json`
4. Ajouter dans `consolidate-and-generate.js`
5. Documenter dans ce README

## 📜 Licence

MIT - Voir LICENSE file
