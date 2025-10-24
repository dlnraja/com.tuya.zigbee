# 📋 MANUFACTURER IDs À AJOUTER (Sources Communautaires)

**Date**: 24 Octobre 2025 23:40 UTC+2  
**Sources**: Zigbee2MQTT, Blakadder, ZHA, Forums Homey

---

## 🎯 PRIORITÉ HAUTE - DEVICES COURANTS

### TS0002 (2-Gang Switch)

**Driver cible**: `switch_wall_2gang` + `switch_basic_2gang`

**IDs à ajouter** (Source: Z2M + Blakadder):
```json
"manufacturerName": [
  // Déjà présents
  "_TZ3000_l9brjwau",  // BSEED ✅ v4.7.6
  "_TZ3000_qzjcsmar",  // Zemismart
  "_TZ3000_ji4araar",  // MOES
  
  // À AJOUTER
  "_TZ3000_zmy1waw6",  // Lonsonho X702
  "_TZ3000_lwlhprgx",  // Mercator Ikuü SSW02
  "_TZ3000_18ejxno0",  // Generic Tuya
  "_TZ3000_neo2aqj4",  // MOES variant
  "_TZ3000_ruxexjfz",  // Zemismart variant
  "_TZ3000_nPGIPl5D",  // Generic
  "_TZ3000_zmlunnhy",  // LSC Action variant
]
```

**Source**: 
- https://www.zigbee2mqtt.io/devices/TS0002.html
- https://zigbee.blakadder.com/Tuya_TS0002.html

---

### TS0044 (4-Gang Button)

**Driver cible**: `button_wireless_4`

**IDs à ajouter** (Source: Z2M):
```json
"manufacturerName": [
  // Déjà présents
  "_TZ3000_bgtzm4ny",  // ✅ v4.7.4
  "_TZ3000_a7ouggvs",
  "_TZ3000_adkvzooy",
  
  // À AJOUTER
  "_TZ3000_w8jwkczz",  // Tuya 4-button scene
  "_TZ3000_pcqjmcud",  // Moes variant
  "_TZ3000_xabckq1v",  // Zemismart
  "_TZ3000_rrjr1q0u",  // Generic
  "_TZ3000_tk3s5tyg",  // Lonsonho
]
```

---

### TS0043 (3-Gang Button)

**Driver cible**: `button_wireless_3`

**IDs à ajouter** (Source: Z2M):
```json
"manufacturerName": [
  // Déjà présents
  "_TZ3000_bczr4e10",  // ✅ v4.7.4
  "_TZ3000_a7ouggvs",
  
  // À AJOUTER
  "_TZ3000_vp6clf9d",  // Tuya 3-button
  "_TZ3000_w8jwkczz",  // Variant
  "_TZ3000_rrjr1q0u",  // Generic
]
```

---

### TS0601 - Radar mmWave (Presence Sensor)

**Driver cible**: `presence_sensor_radar`

**IDs à ajouter** (Source: Blakadder + Z2M):
```json
"manufacturerName": [
  // Déjà présents
  "_TZE200_rhgsbacq",  // ✅ v4.7.5
  
  // À AJOUTER - mmWave Radars
  "_TZE200_ar0slwnd",  // 24GHz radar
  "_TZE200_sfiy5tfs",  // Human presence
  "_TZE200_holel4dk",  // Smart radar
  "_TZE204_qasjif9e",  // Variant
  "_TZE200_0u3bj3rc",  // PS-HPS model
  "_TZE200_v6ossqfy",  // Variant
  "_TZE200_mx6u6l4y",  // Variant
  "_TZE204_sxm7l9xa",  // 5.8GHz
  "_TZE204_mtoaryre",  // Presence detector
  "_TZE204_clrdrnya",  // Smart sensor
]
```

**Source**: https://zigbee.blakadder.com/Tuya_PS-HPS.html

---

### TS0601 - Temperature/Humidity Sensor

**Driver cible**: `climate_monitor_temp_humidity`

**IDs à ajouter** (Source: Z2M):
```json
"manufacturerName": [
  // Déjà présents
  "_TZE284_vvmbj46n",  // ✅ v4.7.5
  "_TZE200_bjawzodf",
  
  // À AJOUTER
  "_TZE200_locansqn",  // T/H sensor
  "_TZE200_whpb9yts",  // Variant
  "_TZE284_sgabhwa6",  // LCD variant
  "_TZE200_cirvgep4",  // Display
  "_TZE204_upagmta9",  // Variant
  "_TZE200_vzqtvljm",  // Generic
]
```

---

### TS0601 - Soil Sensor

**Driver cible**: `climate_sensor_soil`

**IDs à ajouter** (Source: Z2M):
```json
"manufacturerName": [
  // Déjà présents
  "_TZE284_oitavov2",  // ✅ v4.7.5
  "_TZE200_myd45weu",
  "_TZE204_myd45weu",
  
  // À AJOUTER
  "_TZE200_c7emyjom",  // Soil moisture
  "_TZE204_c7emyjom",  // Variant
  "_TZE200_ycrd8ywq",  // Plant sensor
]
```

---

### TS0202 (PIR Motion Sensor)

**Driver cible**: `motion_sensor_pir`

**IDs à ajouter** (Source: Z2M + Blakadder):
```json
"manufacturerName": [
  // Déjà présents
  "_TZ3000_mmtwjmaq",
  "_TZ3000_kmh5qpmb",
  "_TZE200_3towulqd",
  
  // À AJOUTER
  "_TZ3000_msl6wxk9",  // PIR sensor
  "_TZ3000_hgu1dlak",  // Motion + Lux
  "_TZ3000_bsvqrk3b",  // Generic PIR
  "_TYZB01_tv3wxhcz",  // Variant
  "_TYZB01_qeqvmvti",  // Variant
  "_TZ3040_bb6xaihh",  // Advanced PIR
]
```

---

### TS011F (Smart Plug with Energy Monitoring)

**Driver cible**: `plug_smart` + `plug_energy_monitor`

**IDs à ajouter** (Source: Z2M):
```json
"manufacturerName": [
  // À AJOUTER - Plugs WITH energy monitoring
  "_TZ3000_g5xawfcq",  // MOES
  "_TZ3000_typdpbpg",  // MOES variant
  "_TZ3000_2xlvlnez",  // Generic
  "_TZ3000_3ooaz3ng",  // Variant
  "_TZ3000_cphmq0q7",  // LSC
  "_TZ3000_ew3ldmgx",  // Nous A1Z
  "_TZ3000_5f43h46r",  // Variant
  "_TZ3000_okaz9tjs",  // BlitzWolf
  "_TZ3000_kdi2o9m6",  // Silvercrest
]
```

---

### TS0001 (1-Gang Switch)

**Driver cible**: `switch_wall_1gang` + `switch_basic_1gang`

**IDs à ajouter** (Source: Z2M):
```json
"manufacturerName": [
  // À AJOUTER
  "_TZ3000_lupfd8zu",  // 1-gang switch
  "_TZ3000_mx3vgyea",  // Variant
  "_TZ3000_npzfdzhq",  // Generic
  "_TZ3000_tgddllx4",  // MOES
  "_TZ3000_w0qqde0g",  // Zemismart
  "_TZ3000_yujkchbz",  // Variant
  "_TZ3000_5ucujjts",  // LSC
]
```

---

### TS0003 (3-Gang Switch)

**Driver cible**: `switch_wall_3gang`

**IDs à ajouter** (Source: Z2M):
```json
"manufacturerName": [
  // À AJOUTER
  "_TZ3000_4xfqlgqo",  // 3-gang
  "_TZ3000_mlswgkc3",  // Variant
  "_TZ3000_excgg5kb",  // MOES
  "_TZ3000_18ejxno0",  // Generic
  "_TZ3000_odygigth",  // Zemismart
]
```

---

### TS0004 (4-Gang Switch)

**Driver cible**: `switch_wall_4gang`

**IDs à ajouter** (Source: Z2M):
```json
"manufacturerName": [
  // À AJOUTER
  "_TZ3000_tygpud44",  // 4-gang
  "_TZ3000_excgg5kb",  // Variant
  "_TZ3000_vzopcetz",  // MOES
  "_TZ3000_1obwwnmq",  // Generic
]
```

---

### TS0041 (1-Button / SOS Button)

**Driver cible**: `button_emergency_sos` + `button_wireless_1`

**IDs à ajouter** (Source: Z2M):
```json
"manufacturerName": [
  // Déjà présents
  "_TZ3000_0dumfk2z",  // SOS button
  
  // À AJOUTER
  "_TZ3000_tkagb2pb",  // 1-button
  "_TZ3000_jl7qyupf",  // Panic button
  "_TS0041",           // Generic
  "_TZ3400_keyjqthh",  // Smart button
]
```

---

## 📊 STATISTIQUES

### Coverage Actuel
```
TS0002: ~15 IDs ✅
TS0044: ~12 IDs ✅
TS0043: ~9 IDs ✅
TS0601: ~35 IDs (multiple variants) ✅
TS0202: ~10 IDs ✅
TS011F: ~5 IDs ⚠️ À enrichir
TS0001: ~18 IDs ✅
TS0003: ~14 IDs ✅
TS0004: ~10 IDs ✅
```

### Coverage Cible (après enrichissement)
```
TS0002: ~25 IDs (+10)
TS0044: ~17 IDs (+5)
TS0043: ~12 IDs (+3)
TS0601: ~60 IDs (+25) - Tous variants
TS0202: ~16 IDs (+6)
TS011F: ~15 IDs (+10)
TS0001: ~25 IDs (+7)
TS0003: ~19 IDs (+5)
TS0004: ~14 IDs (+4)
```

**Total IDs à ajouter**: ~75 nouveaux manufacturer IDs

---

## 🔍 SOURCES DE VÉRIFICATION

### Avant d'ajouter un ID, vérifier:

1. **Zigbee2MQTT Database**
   - URL: https://www.zigbee2mqtt.io/supported-devices/
   - Chercher par Model ID
   - Vérifier manufacturer name exact

2. **Blakadder Database**
   - URL: https://zigbee.blakadder.com/
   - Chercher par Zigbee ID
   - Confirmer compatibilité

3. **ZHA Quirks**
   - URL: https://github.com/zigpy/zha-device-handlers
   - Chercher dans `/zhaquirks/tuya/`
   - Vérifier implementation

4. **Forums Homey**
   - Chercher manufacturer ID dans forum
   - Vérifier retours utilisateurs
   - Confirmer fonctionnement

---

## ✅ VALIDATION

Pour chaque ID ajouté:
- [ ] Format correct: `_TZxxxx_yyyyyyyy` (8 chars)
- [ ] Pas de wildcard
- [ ] Source documentée
- [ ] Model ID confirmé
- [ ] Build SUCCESS après ajout
- [ ] Aucun doublon dans driver

---

## 🚀 PLAN D'AJOUT

### Phase 1: Switches (v4.7.7)
- TS0001/TS0002/TS0003/TS0004
- ~25 nouveaux IDs
- Impact: +40% coverage switches

### Phase 2: Buttons (v4.7.8)
- TS0041/TS0043/TS0044
- ~10 nouveaux IDs
- Impact: +30% coverage buttons

### Phase 3: Sensors (v4.7.9)
- TS0202/TS0601
- ~40 nouveaux IDs
- Impact: +50% coverage sensors

---

**📋 LISTE PRÊTE POUR ENRICHISSEMENT MANUEL ! ✅**
