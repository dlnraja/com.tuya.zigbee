# Lib - Shared Utilities

Bibliothèque de fonctions utilitaires partagées entre tous les drivers.

## Modules

### ZigbeeHelper.js
Fonctions utilitaires pour le parsing des valeurs Zigbee:
- `parseBatteryPercentage(value)` - Convertit pourcentage batterie
- `parseTemperature(value)` - Convertit température (centidegrees → °C)
- `parseHumidity(value)` - Convertit humidité
- `parsePower(value)` - Convertit puissance
- `parseVoltage(value)` - Convertit voltage
- `parseCurrent(value)` - Convertit courant
- `parseEnergy(value)` - Convertit énergie
- `parseIlluminance(value)` - Convertit luminosité
- `debounce(func, wait)` - Fonction debounce
- `throttle(func, limit)` - Fonction throttle
- `kelvinToMireds(kelvin)` - Convertit Kelvin → Mireds
- `miredsToKelvin(mireds)` - Convertit Mireds → Kelvin

### BatteryHelper.js
Gestion intelligente des batteries:
- `calculateBatteryPercentage(voltage, type)` - Calcul % batterie
- `getBatteryStatus(percentage)` - Status batterie (good/medium/low/critical)
- `shouldSendBatteryAlert(percentage)` - Vérifie si alerte nécessaire
- `estimateBatteryLife(percentage, drain)` - Estime durée restante
- `getBatteryIcon(percentage)` - Icône batterie appropriée

## Usage

```javascript
const ZigbeeHelper = require('../../lib/ZigbeeHelper');
const BatteryHelper = require('../../lib/BatteryHelper');

// Dans un driver
const temp = ZigbeeHelper.parseTemperature(2500); // 25.0°C
const battery = BatteryHelper.calculateBatteryPercentage(2.8, 'CR2032'); // 80%
```

## Standards

- Toutes les fonctions sont statiques
- Gestion des valeurs null/undefined
- Arrondi intelligent des valeurs
- Documentation JSDoc complète
