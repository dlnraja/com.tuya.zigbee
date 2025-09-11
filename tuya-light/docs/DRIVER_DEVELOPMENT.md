# Guide de Développement de Drivers

## Structure d'un Driver
```
drivers/
  my-driver/
    device.js     # Logique de l'appareil
    driver.js     # Configuration du driver
    driver.compose.json  # Métadonnées
    assets/       # Icônes et images
```

## Création d'un Nouveau Driver

1. **Initialisation**
```bash
homey driver create my-driver
```

2. **Configuration (driver.compose.json)**
```json
{
  "name": {"en": "Mon Driver"},
  "class": "light",
  "capabilities": ["onoff", "dim"],
  "zigbee": {
    "manufacturerName": ["_TZ3000_"]
  }
}
```

3. **Implémentation (device.js)**
```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MyDevice extends ZigBeeDevice {
  async onNodeInit() {
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('dim', 'genLevelCtrl');
  }
}

module.exports = MyDevice;
```

## Bonnes Pratiques
- Documentez votre code avec JSDoc
- Écrivez des tests unitaires
- Suivez les conventions de nommage
- Gérez les erreurs proprement

## Test et Débogage
```bash
# Lancer les tests
npm test

# Activer les logs de débogage
DEBUG=* homey app run
```

## Soumettre un Driver
1. Créez une branche
2. Ajoutez vos modifications
3. Poussez vers votre fork
4. Créez une Pull Request

## Ressources
- [Documentation officielle](https://developer.athom.com/)
- [Exemples de drivers](https://github.com/athombv/homey-example-drivers)
- [Forum des développeurs](https://community.athom.com/)
