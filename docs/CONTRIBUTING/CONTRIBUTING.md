
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Guide de Contribution - Universal Universal TUYA Zigbee Device

## 🎯 **Objectif du projet**

Ce projet étend l'écosystème Homey Tuya Zigbee en ajoutant des **device IDs manquants** pour les produits Tuya récents (_TZ3000, _TZ2000, _TZE200, etc.) sans passer par Zigbee2MQTT ou Home Assistant.

## 📋 **Comment ajouter un nouveau device**

### 1. **Identifier le device**
- Récupérer le **Device ID** depuis l'app Tuya Smart ou Zigbee2MQTT
- Identifier les **clusters** utilisés (standards Zigbee + clusters Tuya spécifiques 0xEF00)
- Déterminer les **capabilities** Homey nécessaires

### 2. **Créer le driver**
```javascript
// Template de driver pour un interrupteur simple
module.exports = {
  id: 'switch_tuya_TZ3000_example',
  name: { en: 'Tuya Switch TZ3000' },
  class: 'socket',
  capabilities: ['onoff'],
  images: {
    large: 'assets/icon.svg',
    small: 'assets/icon.svg'
  },
  zigbee: {
    manufacturerName: ['TUYATEC'],
    productId: ['TZ3000_example'],
    endpoints: {
      1: {
        clusters: ['genOnOff', 'genBasic'],
        bindings: ['genOnOff']
      }
    }
  },
  settings: {
    // Configuration spécifique si nécessaire
  }
};
```

### 3. **Ajouter dans app.json**
```json
{
  "id": "universal.tuya.zigbee.device",
  "drivers": [
    {
      "id": "switch_tuya_TZ3000_example",
      "name": { "en": "Tuya Switch TZ3000" },
      "class": "socket",
      "capabilities": ["onoff"],
      "images": {
        "large": "assets/icon.svg",
        "small": "assets/icon.svg"
      },
      "zigbee": {
        "manufacturerName": ["TUYATEC"],
        "productId": ["TZ3000_example"],
        "endpoints": {
          "1": {
            "clusters": ["genOnOff", "genBasic"],
            "bindings": ["genOnOff"]
          }
        }
      }
    }
  ]
}
```

### 4. **Tester le driver**
```bash
# Validation locale
homey app validate

# Test sur Homey
homey app run
```

## 🔧 **Types de devices supportés**

### **Interrupteurs et Prises**
- Interrupteurs simples (on/off)
- Interrupteurs dimmers
- Prises intelligentes
- Modules de contrôle

### **Éclairage**
- Ampoules LED
- Bandes LED
- Spots encastrés
- Contrôleurs RGB

### **Thermostats et Vannes**
- Vannes TRV (Thermostatic Radiator Valve)
- Thermostats d'ambiance
- Contrôleurs de chauffage

### **Capteurs**
- Capteurs de température
- Capteurs d'humidité
- Détecteurs de mouvement
- Détecteurs de fuite
- Capteurs de contact

## 📊 **Structure des clusters**

### **Clusters Zigbee Standards**
- `genBasic` : Informations de base
- `genOnOff` : Contrôle on/off
- `genLevelCtrl` : Contrôle de luminosité
- `msTemperatureMeasurement` : Température
- `msRelativeHumidity` : Humidité

### **Clusters Tuya Spécifiques**
- `0xEF00` : Clusters Tuya personnalisés
- `0xE001` : Nouveaux clusters Tuya v2
- `0xE002` : Nouveaux clusters Tuya v3

## 🚀 **Processus de contribution**

### **1. Fork et Clone**
```bash
git clone https://github.com/dlnraja/universal.tuya.zigbee.device.git
cd universal.tuya.zigbee.device
```

### **2. Créer une branche**
```bash
git checkout -b feature/new-device-TZ3000_example
```

### **3. Ajouter le driver**
- Créer le fichier driver dans `drivers/sdk3/`
- Ajouter l'entrée dans `app.json`
- Tester localement

### **4. Validation**
```bash
# Vérifier la syntaxe
npm run lint

# Valider l'app
homey app validate

# Tester le build
npm run build
```

### **5. Pull Request**
- Description claire du device ajouté
- Screenshots si possible
- Test sur Homey réel

## 📝 **Template de Pull Request**

```markdown
## Nouveau Device : [Nom du Device]

### Device ID
- **Manufacturer** : TUYATEC
- **Product ID** : TZ3000_example
- **Type** : Interrupteur simple

### Clusters utilisés
- `genOnOff` : Contrôle on/off
- `genBasic` : Informations de base

### Capabilities Homey
- `onoff` : Contrôle basique

### Testé sur
- [ ] Homey Pro
- [ ] Homey Bridge
- [ ] Firmware Tuya : [version]

### Screenshots
[Insérer captures d'écran si disponible]
```

## ⚠️ **Points d'attention**

### **1. Éviter les conflits**
- Vérifier que le device ID n'existe pas déjà
- Utiliser des noms uniques pour les drivers
- Tester la compatibilité avec l'app officielle

### **2. Validation des clusters**
- Identifier tous les clusters utilisés
- Tester les bindings nécessaires
- Vérifier la compatibilité firmware

### **3. Documentation**
- Documenter les settings spécifiques
- Expliquer les limitations connues
- Ajouter des exemples d'utilisation

## 🛠️ **Outils utiles**

### **Zigbee2MQTT**
- Pour identifier les clusters et device IDs
- Documentation : https://www.zigbee2mqtt.io/

### **Tuya IoT Platform**
- Pour vérifier les spécifications produits
- Documentation : https://developer.tuya.com/

### **Homey Apps SDK**
- Documentation officielle : https://apps.developer.homey.app/

## 📞 **Support**

- **Issues GitHub** : Pour les bugs et demandes
- **Forum Homey** : https://community.homey.app/t/app-community-universal-tuya-zigbee-device/140352
- **Discord** : [Lien à ajouter]

---

*Merci de contribuer à l'écosystème Homey Tuya Zigbee !*



