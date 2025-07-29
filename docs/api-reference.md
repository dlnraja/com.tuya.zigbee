# 📚 **Référence API**

## 🎯 **Vue d'ensemble**

Documentation de l'API et des interfaces du projet.

## 📊 **Statistiques**
- **Drivers Documentés**: 47
- **Capabilities**: 20
- **Clusters**: 8

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

- **alarm_battery**: 3 drivers
- **alarm_contact**: 2 drivers
- **alarm_motion**: 4 drivers
- **alarm_water**: 1 drivers
- **dim**: 5 drivers
- **light_hue**: 1 drivers
- **light_saturation**: 1 drivers
- **light_temperature**: 2 drivers
- **measure_co2**: 1 drivers
- **measure_current**: 1 drivers
- **measure_formaldehyde**: 1 drivers
- **measure_humidity**: 5 drivers
- **measure_power**: 4 drivers
- **measure_temperature**: 9 drivers
- **measure_voc**: 1 drivers
- **measure_voltage**: 1 drivers
- **onoff**: 21 drivers
- **target_temperature**: 2 drivers
- **thermostat_preset**: 1 drivers
- **window_open**: 1 drivers

## 🔗 **Clusters Zigbee**

- **genLevelCtrl**: 1 drivers
- **genOnOff**: 11 drivers
- **genPowerCfg**: 2 drivers
- **hvacThermostat**: 1 drivers
- **lightingColorCtrl**: 1 drivers
- **msRelativeHumidity**: 2 drivers
- **msTemperatureMeasurement**: 3 drivers
- **ssIasZone**: 1 drivers

---

**📅 Généré**: 2025-07-29T14:13:53.784Z