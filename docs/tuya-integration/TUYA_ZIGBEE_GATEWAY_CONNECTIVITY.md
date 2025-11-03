# 📡 TUYA ZIGBEE GATEWAY CONNECTIVITY - Documentation Complète

**Source**: Tuya Developer Platform - Gateway Connectivity  
**URL**: https://developer.tuya.com/en/docs/connect-subdevices-to-gateways  
**Date**: 3 Novembre 2025

---

## 🎯 VUE D'ENSEMBLE

Tuya Gateway Connectivity permet l'interopérabilité entre devices de différentes marques et protocoles pour créer des applications innovantes dans la domotique et l'IoT.

### Objectif du Projet Universal Tuya Zigbee

✅ **100% Local** - Implémentation directe Zigbee sans cloud Tuya  
✅ **Standards Officiels** - Respect des spécifications Tuya Zigbee  
✅ **Homey SDK3** - Intégration native avec Homey Pro  
✅ **190 Drivers** - Support massif de devices Zigbee Tuya

---

## 📚 RESSOURCES TUYA DEVELOPER

### Documentation Principale

| Section | URL | Utilité Projet |
|---------|-----|----------------|
| **Gateway Connectivity** | https://developer.tuya.com/en/docs/connect-subdevices-to-gateways | ✅ Vue d'ensemble architecture |
| **Connect Sub-Devices** | https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/connect-sub-devices-to-gateways | ✅ Pairing et discovery |
| **Integration by Protocol** | https://developer.tuya.com/docs/connect-subdevices-to-gateways/by-protocol-development | ✅ Développement protocole |
| **Development Guide** | https://developer.tuya.com/docs/connect-subdevices-to-gateways/developer-guide | ✅ Guide développeur |
| **Quick Start** | https://developer.tuya.com/docs/connect-subdevices-to-gateways/quick-start | ✅ Démarrage rapide |
| **Product Categories** | https://developer.tuya.com/docs/connect-subdevices-to-gateways/supported-device | ✅ Catégories supportées |

### Standards Zigbee Tuya

| Standard | URL | Status Implementation |
|----------|-----|----------------------|
| **Multi-Gang Switch** | https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/tuya-zigbee-multiple-switch-access-standard | ✅ Partiellement implémenté |
| **SOS Button** | https://developer.tuya.com/docs/connect-subdevices-to-gateways/tuya-zigbee-sos-access-standard | ⏳ À intégrer |
| **Zigbee Cluster** | https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/zigbee-cluster | ✅ Implémenté |
| **Device Category** | https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/device-category | ✅ Excellent support |
| **Zigbee Protocol** | https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/zigbee-protocol | ✅ Conforme Zigbee 3.0 |
| **Zigbee OTA** | https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/zigbee-ota | ❌ Non implémenté |

---

## 🏗️ ARCHITECTURE GATEWAY CONNECTIVITY

### Principe Tuya Gateway

```
┌─────────────────────────────────────────────────────────┐
│                    TUYA GATEWAY                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Gateway Core                                    │   │
│  │  - Device Discovery                              │   │
│  │  - Protocol Translation                          │   │
│  │  - Data Point Engine                             │   │
│  │  - OTA Management                                │   │
│  └──────────────────────────────────────────────────┘   │
│           ↕                          ↕                  │
│  ┌─────────────────┐        ┌─────────────────┐        │
│  │ Zigbee Module   │        │ Cloud Interface │        │
│  └─────────────────┘        └─────────────────┘        │
└─────────────────────────────────────────────────────────┘
         ↕                              ↕
    ┌─────────┐                  ┌──────────┐
    │ Zigbee  │                  │   Tuya   │
    │ Devices │                  │   Cloud  │
    └─────────┘                  └──────────┘
```

### Notre Implémentation (Homey = Gateway)

```
┌─────────────────────────────────────────────────────────┐
│              HOMEY PRO (Gateway Local)                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Universal Tuya Zigbee App (SDK3)               │   │
│  │  - 190 Drivers Zigbee                           │   │
│  │  - TuyaEF00Manager (DP Parser)                  │   │
│  │  - TuyaMultiGangManager                         │   │
│  │  - BaseHybridDevice (Standard + Tuya)           │   │
│  └──────────────────────────────────────────────────┘   │
│           ↕                                             │
│  ┌─────────────────┐                                    │
│  │ Homey Zigbee    │        ❌ PAS DE CLOUD             │
│  │ Stack (Native)  │           100% LOCAL                │
│  └─────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
         ↕
    ┌─────────┐
    │ Zigbee  │
    │ Devices │
    │ (Tuya)  │
    └─────────┘
```

---

## 🔌 PROTOCOLES ET STANDARDS

### Zigbee 3.0 Standard

**Implémentation**: ✅ Complète via `homey-zigbeedriver v2.2.2`

- **ZCL (Zigbee Cluster Library)**: Communication standardisée
- **ZDO (Zigbee Device Objects)**: Gestion réseau et discovery
- **APS (Application Support Layer)**: Routage et sécurité
- **Network Layer**: Topologie mesh
- **MAC Layer**: Communication radio

### Clusters Zigbee Supportés

#### Standard Clusters (ZCL)

| Cluster | ID | Support | Usage Projet |
|---------|-----|---------|--------------|
| Basic | 0x0000 | ✅ | Informations device, manufacturer ID |
| Power Configuration | 0x0001 | ✅ | Battery reporting |
| Identify | 0x0003 | ✅ | Device identification |
| Groups | 0x0004 | ✅ | Group control |
| Scenes | 0x0005 | ✅ | Scene management |
| On/Off | 0x0006 | ✅ | Switch control |
| Level Control | 0x0008 | ✅ | Dimmer control |
| Color Control | 0x0300 | ✅ | RGB/CCT lighting |
| Illuminance | 0x0400 | ✅ | Light sensors |
| Temperature | 0x0402 | ✅ | Temp sensors |
| Pressure | 0x0403 | ✅ | Pressure sensors |
| Humidity | 0x0405 | ✅ | Humidity sensors |
| Occupancy | 0x0406 | ✅ | Motion sensors |
| IAS Zone | 0x0500 | ✅ | Security sensors |
| Metering | 0x0702 | ✅ | Energy metering |
| Electrical Measurement | 0x0B04 | ✅ | Power monitoring |

#### Tuya Private Clusters

| Cluster | ID | Support | Usage |
|---------|-----|---------|-------|
| Tuya Private 0 | 0xEF00 | ✅ | Data Points (DP) principal |
| Tuya Private 1 | 0xEF01 | ⏳ | Features étendues |

---

## 📊 TUYA DATA POINTS (DP)

### Types de DP (Officiels)

**Source**: https://developer.tuya.com/en/docs/iot/custom-functions

| Type | Code | Description | Implémentation |
|------|------|-------------|----------------|
| **Boolean** | 0x01 | true/false | ✅ TuyaDPParser.js |
| **Integer** | 0x02 | Valeurs numériques | ✅ TuyaDPParser.js |
| **String** | 0x03 | Texte | ✅ TuyaDPParser.js |
| **Enum** | 0x04 | Énumérations | ✅ TuyaDPParser.js |
| **Bitmap** | 0x05 | Bits flags | ✅ TuyaDPParser.js |
| **Raw** | 0x00 | Données binaires | ✅ TuyaDPParser.js |

### DP Parser - Implémentation

**Fichier**: `lib/TuyaDPParser.js`

```javascript
// Format DP Tuya (cluster 0xEF00)
// Byte 0: Status (0x00)
// Byte 1: Transaction ID
// Byte 2: DP ID
// Byte 3: DP Type (0x00-0x05)
// Byte 4-5: Data Length (big-endian uint16)
// Byte 6+: Data Value

class TuyaDPParser {
  static parse(buffer) {
    const dpId = buffer.readUInt8(2);
    const dpType = buffer.readUInt8(3);
    const dataLength = buffer.readUInt16BE(4);
    const dataBuffer = buffer.slice(6, 6 + dataLength);
    const dpValue = this.parseValue(dpType, dataBuffer);
    return { dpId, dpType, dpValue };
  }
}
```

---

## 🎛️ MULTI-GANG SWITCH STANDARD

**Source**: https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/tuya-zigbee-multiple-switch-access-standard

### Data Points Complets

| DP | Fonction | Format | Status |
|----|----------|--------|--------|
| **DP1-4** | Switch On/Off (gang 1-4) | Boolean | ✅ Implémenté |
| **DP7-10** | Countdown timers (gang 1-4) | Value (seconds) | ⏳ À implémenter |
| **DP14** | Main power-on behavior | Enum (0=Off, 1=On, 2=Last) | ⏳ À implémenter |
| **DP15** | LED indicator | Enum (0=Off, 1=Status, 2=Inverse) | ⏳ À implémenter |
| **DP16** | Backlight | Boolean | ⏳ À implémenter |
| **DP19** | Inching/Pulse mode | Raw (3×n bytes) | ⏳ À implémenter |
| **DP29-32** | Per-gang power-on (gang 1-4) | Enum (same as DP14) | ⏳ À implémenter |
| **DP209** | Weekly schedules | Raw (2+10×n bytes) | ❌ Future |
| **DP210** | Random timing | Raw (2+6×n bytes) | ❌ Future |

### Implémentation Actuelle

**Fichier**: `lib/TuyaMultiGangManager.js`

**Status**: 
- ✅ DP1-4 (On/Off) implémenté
- ⏳ DP7-10, DP14-19, DP29-32 en développement
- ❌ DP209-210 (advanced scheduling) planifié v4.12.0

---

## 🚨 SOS BUTTON STANDARD

**Source**: https://developer.tuya.com/docs/connect-subdevices-to-gateways/tuya-zigbee-sos-access-standard

### Spécifications

**ID**: K9ik6zvox5vkn

**Caractéristiques**:
- Bouton d'urgence Zigbee
- Détection appui simple/double/long
- Battery powered
- IAS Zone cluster

### Intégration Recommandée

```javascript
// drivers/button_sos/device.js
class SOSButton extends ZigBeeDevice {
  async onNodeInit() {
    // IAS Zone cluster (0x0500)
    this.registerCapability('alarm_sos', CLUSTER.IAS_ZONE);
    
    // Tuya DP for button events
    this.registerCapability('button_event', CLUSTER.TUYA_PRIVATE_0, {
      dp: 1, // DP1 = Button event
      type: TUYA_DP_TYPE.ENUM,
      values: {
        0: 'single',
        1: 'double',
        2: 'long_press'
      }
    });
    
    // Battery
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);
  }
}
```

**Status**: ⏳ À créer - Nouveau driver `button_sos`

---

## 📱 CATÉGORIES DE DEVICES

**Source**: https://developer.tuya.com/docs/connect-subdevices-to-gateways/supported-device

### Coverage Actuel

| Catégorie | Support | Drivers | Détails |
|-----------|---------|---------|---------|
| **Lighting** | ✅ 100% | 45+ | Switch, Dimmer, RGB, CCT, LED Strip |
| **Sensors** | ✅ 95% | 60+ | Motion, Door/Window, Temp, Humidity, Light |
| **Security** | ✅ 90% | 25+ | Smoke, CO, Water Leak, Glass Break |
| **Climate** | ✅ 85% | 20+ | Thermostat, HVAC, Radiator Valve |
| **Curtains** | ✅ 100% | 15+ | Motor, Controller, Blind |
| **Smart Plugs** | ✅ 100% | 20+ | On/Off, Metering, USB |
| **Controllers** | ✅ 100% | 15+ | Scene Switch, Remote, Knob |

### Nouveaux Devices à Ajouter

| Device | Standard Tuya | Priorité |
|--------|---------------|----------|
| SOS Button | ✅ Officiel | HIGH |
| Soil Moisture Sensor | ✅ PR #47 | HIGH |
| mmWave Radar | ✅ TS0225 | MEDIUM |
| Smart Lock | ✅ Door Lock Cluster | MEDIUM |
| Siren | ✅ IAS WD Cluster | LOW |

---

## 🔄 OTA UPDATES

**Source**: https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/zigbee-ota

### Spécifications Tuya OTA

**Cluster**: 0x0019 (OTA Upgrade)

**Processus**:
1. Query Next Image Request
2. Image Block Request
3. Image Page Request
4. Upgrade End Request
5. Verification
6. Device Reboot

**Status Projet**: ❌ Non implémenté

**Recommandation**: 
- Utiliser le système OTA natif Homey
- Implémenter uniquement si firmware Tuya-specific nécessaire
- Priorité: LOW (Homey gère OTA automatiquement)

---

## 🛠️ SUB-DEVICE CONFIGURATION

**Source**: https://developer.tuya.com/docs/connect-subdevices-to-gateways/tuyaos-gateway-datapoint-engine

### DataPoint Engine

Le DataPoint Engine Tuya traduit les commandes Zigbee en Data Points Tuya.

**Notre Approche**:
- ✅ Implémentation directe via `TuyaEF00Manager.js`
- ✅ Mapping DP ↔ Capabilities Homey
- ✅ Pas de fichier config externe nécessaire
- ✅ Configuration dans `driver.compose.json`

### Exemple Mapping

```json
{
  "id": "switch_wall_2gang",
  "name": { "en": "2-Gang Switch" },
  "class": "light",
  "capabilities": ["onoff.gang1", "onoff.gang2"],
  "zigbee": {
    "manufacturerName": ["_TZ3000_*"],
    "productId": "TS0002",
    "deviceId": 256,
    "profileId": 260,
    "learnmode": {
      "instruction": {
        "en": "Press the button 5 times rapidly"
      }
    },
    "endpoints": {
      "1": {
        "clusters": [0, 4, 5, 6],
        "bindings": [6]
      },
      "2": {
        "clusters": [6],
        "bindings": [6]
      }
    }
  },
  "tuyaDataPoints": {
    "dp1": {
      "capability": "onoff.gang1",
      "type": "boolean"
    },
    "dp2": {
      "capability": "onoff.gang2",
      "type": "boolean"
    }
  }
}
```

---

## 📈 ROADMAP INTEGRATION TUYA

### v4.10.0 (Current)
- ✅ 190 drivers Zigbee
- ✅ Basic DP support (On/Off, sensors)
- ✅ Standard clusters coverage
- ✅ TuyaDPParser complet

### v4.11.0 (Q1 2026)
- ⏳ Multi-Gang Switch complet (DP7-32)
- ⏳ SOS Button driver
- ⏳ Enhanced DP features (timers, LED, backlight)
- ⏳ Per-gang power-on behavior

### v4.12.0 (Q2 2026)
- ❌ Advanced scheduling (DP209-210)
- ❌ OTA Update system (si nécessaire)
- ❌ Tuya Private Cluster 1 support
- ❌ Device configuration UI

---

## 🔗 LIENS UTILES

### Documentation Tuya

- **Platform**: https://developer.tuya.com/en/docs/iot
- **Gateway Connectivity**: https://developer.tuya.com/en/docs/connect-subdevices-to-gateways
- **Zigbee Protocol**: https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/zigbee-protocol
- **Data Points**: https://developer.tuya.com/en/docs/iot/custom-functions
- **Developer Community**: https://www.tuyaos.com/

### Ressources Externes

- **Zigbee Alliance**: https://zigbeealliance.org/
- **Zigbee Cluster Library**: https://zigbeealliance.org/wp-content/uploads/2019/12/07-5123-06-zigbee-cluster-library-specification.pdf
- **zigpy Discussion (Tuya)**: https://github.com/zigpy/zigpy/discussions/823

### Projet

- **GitHub**: https://github.com/dlnraja/com.tuya.zigbee
- **Homey App Store**: https://homey.app/en-us/app/com.tuya.zigbee/
- **Documentation**: `docs/tuya-integration/`

---

## 💡 RECOMMANDATIONS DÉVELOPPEMENT

### Priorité IMMEDIATE (v4.10.x)

1. **Compléter Multi-Gang Switch**
   - Implémenter DP7-10 (countdown timers)
   - Ajouter DP14-16 (power-on, LED, backlight)
   - Implémenter DP19 (inching mode)
   - Fichier: `lib/TuyaMultiGangManager.js`
   - Effort: 2-3 jours

2. **Créer SOS Button Driver**
   - Suivre standard officiel Tuya
   - IAS Zone + Tuya DP
   - Battery reporting
   - Fichier: `drivers/button_sos/`
   - Effort: 1 jour

3. **Merger PR #47 (Soil Sensor)**
   - Attendre manufacturer ID
   - Valider implementation
   - Update CHANGELOG
   - Effort: 0.5 jour

### Priorité SHORT-TERM (v4.11.0)

4. **Enhanced DP Documentation**
   - Documenter tous les DP connus
   - Créer DP discovery tool
   - Générer DP mapping automatique
   - Fichier: `tools/DPDiscovery.js`
   - Effort: 2 jours

5. **Cluster Discovery Tool**
   - Scanner clusters automatiquement
   - Générer device profiles
   - Aide debugging
   - Fichier: `tools/ClusterScanner.js`
   - Effort: 1-2 jours

### Priorité LONG-TERM (v4.12.0+)

6. **Advanced Scheduling**
   - DP209 (weekly schedules)
   - DP210 (random timing)
   - UI configuration
   - Effort: 1 semaine

7. **OTA System** (si requis)
   - Tuya firmware compatibility
   - Update management
   - Progress tracking
   - Effort: 1-2 semaines

---

## ✅ CONFORMITÉ AUX STANDARDS

### Zigbee 3.0
- ✅ ZCL compliant
- ✅ Zigbee 3.0 certified stack (Homey)
- ✅ Mesh networking
- ✅ AES-128 encryption
- ✅ Touchlink commissioning

### Tuya Standards
- ✅ Multi-Gang Switch (partial)
- ⏳ SOS Button (planned)
- ✅ DP Parser (complet)
- ✅ Cluster support (excellent)
- ⏳ OTA (not required)

### Homey SDK3
- ✅ SDK v3 compliant
- ✅ homey-zigbeedriver v2.2.2
- ✅ Async/await everywhere
- ✅ Flow cards integration
- ✅ Capabilities mapping

---

**Dernière mise à jour**: 3 Novembre 2025  
**Version documentation**: 1.0  
**Maintenu par**: Universal Tuya Zigbee Team
