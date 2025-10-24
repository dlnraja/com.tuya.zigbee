# 🔍 ENRICHISSEMENT DEPUIS BASES DE DONNÉES COMMUNAUTAIRES

**Date**: 24 Octobre 2025 23:35 UTC+2  
**Objectif**: Enrichir les drivers avec manufacturer IDs des databases Zigbee

---

## 📚 SOURCES DE DONNÉES

### 1. **Zigbee2MQTT Database**
- URL: https://www.zigbee2mqtt.io/supported-devices/
- Format: JSON avec manufacturer IDs complets
- Coverage: ~6000+ devices Tuya/Generic

### 2. **Blakadder Zigbee Database**
- URL: https://zigbee.blakadder.com/
- Format: Device list avec manufacturer/model mapping
- Coverage: ~3000+ devices Tuya

### 3. **ZHA Device Handlers (Quirks)**
- URL: https://github.com/zigpy/zha-device-handlers
- Format: Python quirks avec manufacturer names
- Coverage: ~2000+ devices

### 4. **deCONZ Devices**
- URL: https://github.com/dresden-elektronik/deconz-rest-plugin
- Format: Device definitions
- Coverage: ~1500+ devices

---

## 🎯 STRATÉGIE D'ENRICHISSEMENT

### Phase 1: Collecte par Model ID

Pour chaque Model ID commun (TS0002, TS0601, TS0202, etc.):
1. Rechercher dans Zigbee2MQTT database
2. Extraire TOUS les manufacturer IDs
3. Comparer avec nos drivers existants
4. Ajouter les IDs manquants

### Phase 2: Validation

Pour chaque manufacturer ID ajouté:
1. Vérifier qu'il est COMPLET (pas de wildcard)
2. Vérifier le format (_TZ3000_xxx, _TZE200_xxx, etc.)
3. Confirmer le Model ID correspondant
4. Documenter la source

### Phase 3: Organisation

Garder l'organisation UNBRANDED:
- Group by FONCTION (switch, sensor, etc.)
- PAS by manufacturer (BSEED, MOES, etc.)
- Tous les IDs dans le même driver

---

## 📊 MANUFACTURER ID PATTERNS

### Format Standard Tuya:

```
_TZ3000_xxxxxxxx  (8 caractères lowercase)
_TZE200_xxxxxxxx  (8 caractères lowercase)
_TZE284_xxxxxxxx  (8 caractères lowercase)
_TZ3210_xxxxxxxx  (8 caractères lowercase)
_TZ3400_xxxxxxxx  (8 caractères lowercase)
```

### Format Xiaomi/Aqara:

```
lumi.sensor_xxx
lumi.ctrl_xxx
lumi.remote_xxx
```

### Format Autres:

```
IKEA: IKEA of Sweden
Philips: Signify Netherlands B.V.
Samsung: Samjin
```

---

## 🔧 SOURCES ZIGBEE2MQTT

### TS0002 (2-Gang Switch)

**Source**: https://github.com/Koenkk/zigbee2mqtt/blob/master/lib/devices.js

Manufacturer IDs trouvés dans Z2M:
```javascript
{
  model: 'TS0002',
  vendor: 'TuYa',
  description: '2 gang switch',
  supports: 'on/off',
  fromZigbee: [fz.on_off],
  toZigbee: [tz.on_off],
  meta: {
    multiEndpoint: true,
    configureKey: 1,
  },
  configure: async (device, coordinatorEndpoint, logger) => {
    await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
    await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
  },
  endpoint: (device) => {
    return {'left': 1, 'right': 2};
  },
  whiteLabel: [
    {vendor: 'Mercator Ikuü', model: 'SSW02'},
    {vendor: 'Lonsonho', model: 'TS0002'},
    {vendor: 'Zemismart', model: 'ZM-CSW002-D'},
    {vendor: 'BSEED', model: 'TS0002'},
    {vendor: 'MOES', model: 'ZK-EU-2G'},
  ],
}
```

**IDs à ajouter** (vérifier dans database complète):
- _TZ3000_lwlhxxxx (Mercator)
- _TZ3000_zmy1waw6 (Lonsonho)
- _TZ3000_l9brjwau (BSEED) ✅ DÉJÀ AJOUTÉ
- _TZ3000_xxxxxxxx (MOES)

### TS0601 (Multi-Function)

**Variants par type**:

1. **Temperature/Humidity Sensor**
   ```
   _TZE200_bjawzodf
   _TZE200_locansqn
   _TZE200_whpb9yts
   _TZE284_sgabhwa6
   _TZE284_vvmbj46n ✅ DÉJÀ AJOUTÉ
   ```

2. **Soil Sensor**
   ```
   _TZE200_myd45weu
   _TZE204_myd45weu
   _TZE284_oitavov2 ✅ DÉJÀ AJOUTÉ
   ```

3. **mmWave Radar**
   ```
   _TZE200_ar0slwnd
   _TZE200_sfiy5tfs
   _TZE200_holel4dk
   _TZE200_rhgsbacq ✅ DÉJÀ AJOUTÉ
   _TZE204_qasjif9e
   ```

4. **PIR Motion + T/H**
   ```
   _TZE200_3towulqd
   _TZE204_ntcy3xu1
   _TZE200_ztqnh5cg
   ```

### TS0044 (4-Gang Button)

**Source Z2M**:
```
_TZ3000_a7ouggvs
_TZ3000_adkvzooy
_TZ3000_bgtzm4ny ✅ DÉJÀ AJOUTÉ
_TZ3000_bi6lpsew
_TZ3000_ee8nrt2l
_TZ3000_fvh3pjaz
_TZ3000_vp6clf9d
_TZ3000_w8jwkczz
_TZ3000_xabckq1v
```

### TS0043 (3-Gang Button)

**Source Z2M**:
```
_TZ3000_a7ouggvs
_TZ3000_adkvzooy
_TZ3000_bczr4e10 ✅ DÉJÀ AJOUTÉ
_TZ3000_bi6lpsew
_TZ3000_fvh3pjaz
_TZ3000_vp6clf9d
```

---

## 🔍 BLAKADDER DATABASE

### Recherche par Product ID

**TS0002 Switches**:
URL: https://zigbee.blakadder.com/Tuya_TS0002.html

Liste complète des variants:
- BSEED Touch Switch: _TZ3000_l9brjwau ✅
- Lonsonho X702: _TZ3000_zmy1waw6
- MOES ZK-EU-2G: _TZ3000_ji4araar
- Zemismart: _TZ3000_qzjcsmar
- Mercator: _TZ3000_4fjiwweb
- Generic Tuya: _TZ3000_npzfykbs, _TZ3000_o005nuxx

**TS0601 Sensors**:
URL: https://zigbee.blakadder.com/Tuya_TS0601.html

Catégories:
1. Climate Sensors (T/H/Lux)
2. Soil Sensors
3. Radar/PIR Sensors
4. Smart Plugs (avec mesure)
5. Valves & Thermostats

---

## 🎯 PLAN D'ACTION

### Étape 1: Créer Script d'Enrichissement

```javascript
// scripts/enrichment/enrich-from-z2m.js

const fs = require('fs');
const path = require('path');

// Databases à interroger
const Z2M_DATABASE = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt/master/lib/devices.js';
const BLAKADDER_API = 'https://zigbee.blakadder.com/api/devices';

// Fonction principale
async function enrichDrivers() {
  // 1. Charger Z2M database
  const z2mDevices = await fetchZ2MDatabase();
  
  // 2. Pour chaque Model ID
  const modelIds = ['TS0002', 'TS0601', 'TS0202', 'TS0044', 'TS0043'];
  
  for (const modelId of modelIds) {
    // 3. Extraire tous les manufacturer IDs
    const manufacturers = extractManufacturers(z2mDevices, modelId);
    
    // 4. Trouver le driver Homey correspondant
    const driver = findDriverByModelId(modelId);
    
    // 5. Ajouter IDs manquants
    await addMissingIds(driver, manufacturers);
  }
}
```

### Étape 2: Valider et Tester

1. Build après ajout
2. Vérifier aucun doublon
3. Confirmer SDK3 compliance
4. Tester avec devices réels si possible

### Étape 3: Documenter Sources

Pour chaque ID ajouté, documenter:
- Source (Z2M, Blakadder, etc.)
- Date d'ajout
- Model ID
- Vendor (si connu)

---

## 📋 CHECKLIST

### Drivers à Enrichir (Priority)

- [ ] **switch_basic_2gang** (TS0002)
- [ ] **switch_wall_2gang** (TS0002)
- [ ] **button_wireless_4** (TS0044)
- [ ] **button_wireless_3** (TS0043)
- [ ] **presence_sensor_radar** (TS0601 - radar)
- [ ] **climate_monitor_temp_humidity** (TS0601 - T/H)
- [ ] **climate_sensor_soil** (TS0601 - soil)
- [ ] **motion_sensor_pir** (TS0202)
- [ ] **plug_smart** (TS011F)
- [ ] **temperature_sensor** (TS0201)

### Validation

- [ ] Aucun wildcard (_TZE284_ sans suffix)
- [ ] Format correct (8 chars après préfixe)
- [ ] Pas de doublons dans un même driver
- [ ] Build SUCCESS
- [ ] Validation PASSED

---

## 🔗 RESSOURCES UTILES

### APIs & Databases

1. **Zigbee2MQTT Devices**
   - Repo: https://github.com/Koenkk/zigbee2mqtt
   - Devices: https://github.com/Koenkk/zigbee-herdsman-converters/tree/master/src/devices
   - Format: JavaScript/TypeScript

2. **Blakadder API**
   - API: https://zigbee.blakadder.com/api/devices
   - Search: https://zigbee.blakadder.com/search.html
   - Format: JSON

3. **ZHA Quirks**
   - Repo: https://github.com/zigpy/zha-device-handlers
   - Quirks: https://github.com/zigpy/zha-device-handlers/tree/dev/zhaquirks
   - Format: Python

4. **Zigbee Device Database**
   - URL: https://zigbee.blakadder.com/
   - Search: Par manufacturer, model, vendor
   - Export: CSV/JSON

### Tools

1. **Zigbee2MQTT Device Converter**
   - Convertit devices.js en JSON
   - Extract manufacturer IDs
   - Group by model

2. **Blakadder Scraper**
   - Parse HTML tables
   - Extract manufacturer/model pairs
   - Match with Homey drivers

---

## 📊 RÉSULTATS ATTENDUS

Après enrichissement complet:

```
Avant: ~500 manufacturer IDs
Après: ~2000-3000 manufacturer IDs

Coverage:
✅ Tous les switches Tuya communs
✅ Tous les sensors T/H/Lux/PIR
✅ Tous les buttons 1/2/3/4 gang
✅ Tous les plugs avec/sans energy
✅ Toutes les valves
✅ Tous les thermostats
```

**Impact Utilisateurs**:
- 📈 +300% compatibilité devices
- ✅ Moins de "Appareil Zigbee" non reconnus
- 🎯 Meilleure UX pairing
- ⭐ Plus de reviews positives

---

## 🚀 PROCHAINES ÉTAPES

1. **Créer script d'enrichissement automatique**
2. **Fetcher databases Z2M/Blakadder**
3. **Parser et extraire manufacturer IDs**
4. **Ajouter aux drivers par batches**
5. **Build & validate après chaque batch**
6. **Commit avec sources documentées**
7. **Deploy version enrichie (v4.8.0)**

---

**🔍 ENRICHISSEMENT DEPUIS DATABASES COMMUNAUTAIRES EN COURS ! 📚✨**
