# 🚗 Documentation des Drivers Tuya Zigbee v3.4.1

## 📊 **Vue d'ensemble**

Ce document décrit tous les drivers implémentés basés sur l'analyse complète des archives Tuya.

## 🔧 **Structure des Drivers**

Chaque driver contient :
- `driver.compose.json` - Métadonnées et configuration
- `device.js` - Logique de l'appareil
- `driver.js` - Logique du driver
- `assets/icon.svg` - Icône SVG
- `assets/images/` - Images PNG (75x75, 500x500, 1000x1000)

## 🚗 **Drivers Implémentés**

### **Commutateurs (Switches)**
- **wall_switch_1_gang** - Commutateur 1 bouton
- **wall_switch_2_gang** - Commutateur 2 boutons
- **wall_switch_3_gang** - Commutateur 3 boutons

### **Éclairage (Lights)**
- **rgb_bulb_E27** - Ampoule RGB E27
- **rgb_bulb_E14** - Ampoule RGB E14

### **Capteurs (Sensors)**
- **temphumidsensor** - Capteur température/humidité
- **motion_sensor** - Capteur de mouvement

### **Prises (Plugs)**
- **smartplug** - Prise intelligente avec mesure

## 🎯 **Capabilities Supportées**

- **onoff** - Allumage/Extinction
- **dim** - Variation d'intensité
- **light_hue** - Teinte de couleur
- **light_saturation** - Saturation de couleur
- **light_temperature** - Température de couleur
- **measure_temperature** - Mesure de température
- **measure_humidity** - Mesure d'humidité
- **measure_power** - Mesure de puissance
- **measure_current** - Mesure de courant
- **measure_voltage** - Mesure de tension

## 🔌 **Clusters ZCL Supportés**

- **0** - Basic
- **4** - Groups
- **5** - Scenes
- **6** - On/Off
- **8** - Level Control
- **768** - Color Control
- **1794** - Electrical Measurement
- **2820** - Metering

## 📡 **Data Points Tuya**

- **1** - On/Off
- **2** - Mode
- **3** - Brightness
- **4** - Color Temperature
- **5** - Color
- **20** - Temperature
- **21** - Humidity
- **23** - Power
- **24** - Current
- **25** - Voltage

## 🏭 **Manufacturers Supportés**

- **_TZ3000_3ooaz3ng** - Tuya Zigbee 3.0
- **_TZ3000_g5xawfcq** - Tuya Zigbee 3.0
- **_TZ3000_vtscrpmw** - Tuya Zigbee 3.0
- **_TZ3000_rdtixbnu** - Tuya Zigbee 3.0
- **_TZ3000_8nkb7mof** - Tuya Zigbee 3.0

## 🆔 **Product IDs Supportés**

- **TS0121** - Prise intelligente
- **TS011F** - Prise intelligente
- **TS0201** - Capteur température
- **TS0202** - Capteur humidité
- **TS0203** - Capteur mouvement
- **TS0501** - Ampoule RGB
- **TS0502** - Ampoule RGB
- **TS0503** - Ampoule RGB
- **TS0601** - Contrôleur de vanne

## 🧪 **Tests et Validation**

Tous les drivers sont testés automatiquement :
- Validation de la structure
- Validation des fichiers JSON
- Validation des assets
- Tests de compatibilité SDK3+

## 📚 **Utilisation**

1. **Installation** : Les drivers sont automatiquement installés avec l'app
2. **Configuration** : Configuration automatique basée sur le type d'appareil
3. **Mise à jour** : Mises à jour automatiques via GitHub Actions

## 🔄 **Maintenance**

- **Validation automatique** : Sur chaque commit
- **Tests automatiques** : Sur chaque pull request
- **Déploiement automatique** : Vers GitHub Pages
- **Mise à jour automatique** : Des sources externes

---

**📅 Version** : 3.4.1  
**👤 Auteur** : dlnraja  
**✅ Statut** : DOCUMENTATION COMPLÈTE
