# 📚 **Référence API**

## 🎯 **Vue d'ensemble**

Documentation de l'API et des interfaces du projet.

## 📊 **Statistiques**
- **Drivers Documentés**: 353
- **Capabilities**: 13
- **Clusters**: 10

## 🔧 **Interfaces**

### **Driver Interface**
```javascript
class TuyaDevice extends HomeyDevice {
    async onInit() {
        // Initialisation
    }
    
    async onUninit() {
        // Nettoyage
    }
}
```

### **Compose Interface**
```json
{
    "id": "device-id",
    "title": {
        "en": "Device Name",
        "fr": "Nom Appareil"
    },
    "capabilities": ["onoff", "dim"],
    "category": "controllers",
    "protocol": "tuya"
}
```

## 📋 **Capabilities Supportées**

- **alarm_contact**: 41 drivers
- **alarm_motion**: 70 drivers
- **dim**: 308 drivers
- **light_hue**: 190 drivers
- **light_saturation**: 190 drivers
- **light_temperature**: 227 drivers
- **measure_humidity**: 59 drivers
- **measure_power**: 24 drivers
- **measure_pressure**: 30 drivers
- **measure_temperature**: 71 drivers
- **onoff**: 338 drivers
- **windowcoverings_set**: 16 drivers
- **windowcoverings_tilt_set**: 16 drivers

## 🔗 **Clusters Zigbee**

- **genBasic**: 190 drivers
- **genLevelCtrl**: 308 drivers
- **genOnOff**: 338 drivers
- **genPowerCfg**: 24 drivers
- **genWindowCovering**: 16 drivers
- **lightingColorCtrl**: 227 drivers
- **msPressureMeasurement**: 30 drivers
- **msRelativeHumidity**: 59 drivers
- **msTemperatureMeasurement**: 71 drivers
- **ssIasZone**: 70 drivers

---

**📅 Généré**: 2025-07-29T18:13:35.032Z