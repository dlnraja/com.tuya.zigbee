# 📊 TABLE DE CORRESPONDANCE CLUSTERS ZIGBEE - HOMEY SDK3

**Source**: Analyse `node_modules/zigbee-clusters` + Documentation Homey SDK3

---

## 🔑 RÈGLE CRITIQUE

**`registerCapability()` accepte 2 formats:**

1. **Objet Cluster** avec propriétés `ID` et `NAME`:
   ```javascript
   const { CLUSTER } = require('zigbee-clusters');
   this.registerCapability('onoff', CLUSTER.ON_OFF, { /* config */ });
   ```

2. **String du nom du cluster**:
   ```javascript
   this.registerCapability('measure_battery', 'genPowerCfg', { /* config */ });
   ```

**PROBLÈME**: Notre erreur utilisait `CLUSTER.POWER_CONFIGURATION` mais l'assertion échoue car le format n'est pas reconnu correctement.

---

## 📋 CORRESPONDANCE CLUSTER OBJECT ↔ CLUSTER NAME

| CLUSTER Object | Cluster ID | Cluster NAME (camelCase) | Legacy Name (zigbee-herdsman) | Usage |
|---|---|---|---|---|
| `CLUSTER.BASIC` | 0 | `basic` | `genBasic` | Device info |
| `CLUSTER.POWER_CONFIGURATION` | 1 | `powerConfiguration` | `genPowerCfg` | ✅ **Battery** |
| `CLUSTER.DEVICE_TEMPERATURE` | 2 | `deviceTemperature` | `genDeviceTempCfg` | Internal temp |
| `CLUSTER.IDENTIFY` | 3 | `identify` | `genIdentify` | Identification |
| `CLUSTER.GROUPS` | 4 | `groups` | `genGroups` | Group management |
| `CLUSTER.SCENES` | 5 | `scenes` | `genScenes` | Scene control |
| `CLUSTER.ON_OFF` | 6 | `onOff` | `genOnOff` | ✅ **On/Off** |
| `CLUSTER.ON_OFF_SWITCH_CONFIGURATION` | 7 | `onOffSwitchConfiguration` | `genOnOffSwitchCfg` | Switch config |
| `CLUSTER.LEVEL_CONTROL` | 8 | `levelControl` | `genLevelCtrl` | ✅ **Dimming** |
| `CLUSTER.ALARMS` | 9 | `alarms` | `genAlarms` | Alarm management |
| `CLUSTER.TIME` | 10 | `time` | `genTime` | Time sync |
| `CLUSTER.ANALOG_INPUT` | 12 | `analogInput` | `genAnalogInput` | Analog values |
| `CLUSTER.ANALOG_OUTPUT` | 13 | `analogOutput` | `genAnalogOutput` | Analog control |
| `CLUSTER.ANALOG_VALUE` | 14 | `analogValue` | `genAnalogValue` | Analog state |
| `CLUSTER.BINARY_INPUT` | 15 | `binaryInput` | `genBinaryInput` | Binary input |
| `CLUSTER.BINARY_OUTPUT` | 16 | `binaryOutput` | `genBinaryOutput` | Binary output |
| `CLUSTER.MULTISTATE_INPUT` | 18 | `multistateInput` | `genMultistateInput` | Multi-state input |
| `CLUSTER.MULTISTATE_OUTPUT` | 19 | `multistateOutput` | `genMultistateOutput` | Multi-state output |
| `CLUSTER.MULTISTATE_VALUE` | 20 | `multistateValue` | `genMultistateValue` | Multi-state value |
| `CLUSTER.OTA` | 25 | `ota` | `genOta` | Firmware updates |
| `CLUSTER.POLL_CONTROL` | 32 | `pollControl` | `genPollCtrl` | ✅ **Poll config** |
| `CLUSTER.POWER_PROFILE` | 26 | `powerProfile` | `genPowerProfile` | Power profiling |
| `CLUSTER.COLOR_CONTROL` | 768 | `colorControl` | `lightingColorCtrl` | ✅ **Color/Temp** |
| `CLUSTER.BALLAST_CONFIGURATION` | 769 | `ballastConfiguration` | `lightingBallastCfg` | Ballast config |
| `CLUSTER.ILLUMINANCE_MEASUREMENT` | 1024 | `illuminanceMeasurement` | `msIlluminanceMeasurement` | ✅ **Lux** |
| `CLUSTER.ILLUMINANCE_LEVEL_SENSING` | 1025 | `illuminanceLevelSensing` | `msIlluminanceLevelSensing` | Lux threshold |
| `CLUSTER.TEMPERATURE_MEASUREMENT` | 1026 | `temperatureMeasurement` | `msTemperatureMeasurement` | ✅ **Temperature** |
| `CLUSTER.PRESSURE_MEASUREMENT` | 1027 | `pressureMeasurement` | `msPressureMeasurement` | ✅ **Pressure** |
| `CLUSTER.FLOW_MEASUREMENT` | 1028 | `flowMeasurement` | `msFlowMeasurement` | Flow rate |
| `CLUSTER.RELATIVE_HUMIDITY` | 1029 | `relativeHumidity` | `msRelativeHumidity` | ✅ **Humidity** |
| `CLUSTER.OCCUPANCY_SENSING` | 1030 | `occupancySensing` | `msOccupancySensing` | ✅ **Occupancy** |
| `CLUSTER.SOIL_MOISTURE` | 1032 | `soilMoisture` | `msSoilMoisture` | Soil moisture |
| `CLUSTER.PH_MEASUREMENT` | 1033 | `phMeasurement` | `msPhMeasurement` | pH level |
| `CLUSTER.ELECTRICAL_CONDUCTIVITY` | 1034 | `electricalConductivityMeasurement` | `msElectricalConductivity` | Conductivity |
| `CLUSTER.WIND_SPEED_MEASUREMENT` | 1035 | `windSpeedMeasurement` | `msWindSpeed` | Wind speed |
| `CLUSTER.CONCENTRATION_MEASUREMENT` | 1036 | `concentrationMeasurement` | `msConcentration` | Gas concentration |
| `CLUSTER.IAS_ZONE` | 1280 | `iasZone` | `ssIasZone` | ✅ **Motion/Contact** |
| `CLUSTER.IAS_ACE` | 1281 | `iasAce` | `ssIasAce` | Alarm panel |
| `CLUSTER.IAS_WD` | 1282 | `iasWd` | `ssIasWd` | Warning device |
| `CLUSTER.METERING` | 1794 | `metering` | `seMetering` | ✅ **Energy meter** |
| `CLUSTER.ELECTRICAL_MEASUREMENT` | 2820 | `electricalMeasurement` | `haElectricalMeasurement` | ✅ **Power meter** |
| `CLUSTER.DIAGNOSTICS` | 2821 | `diagnostics` | `haDiagnostic` | Network diagnostics |
| `CLUSTER.THERMOSTAT` | 513 | `thermostat` | `hvacThermostat` | ✅ **Thermostat** |
| `CLUSTER.FAN_CONTROL` | 514 | `fanControl` | `hvacFanCtrl` | Fan control |
| `CLUSTER.THERMOSTAT_UI_CONFIGURATION` | 516 | `thermostatUiConfiguration` | `hvacUserInterfaceCfg` | Thermostat UI |
| `CLUSTER.DOOR_LOCK` | 257 | `doorLock` | `closuresDoorLock` | ✅ **Door lock** |
| `CLUSTER.WINDOW_COVERING` | 258 | `windowCovering` | `closuresWindowCovering` | ✅ **Curtain/Blind** |

---

## 🔧 FORMAT RECOMMANDÉ

### ✅ CORRECT (Objet CLUSTER complet)
```javascript
const { CLUSTER } = require('zigbee-clusters');

// L'objet CLUSTER.* contient ID + NAME
this.registerCapability('onoff', CLUSTER.ON_OFF, {
  endpoint: 1,
  get: 'onOff',
  set: value => value ? 'setOn' : 'setOff'
});
```

### ✅ CORRECT (String legacy name)
```javascript
// Utilise le nom legacy zigbee-herdsman (compatibilité)
this.registerCapability('measure_battery', 'genPowerCfg', {
  endpoint: 1,
  get: 'batteryPercentageRemaining'
});
```

### ❌ INCORRECT (Référence invalide)
```javascript
// CLUSTER.POWER_CONFIGURATION existe MAIS le format attendu échoue
this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
  // ... ERROR: expected_cluster_id_number
});
```

---

## 🐛 CAUSE DU BUG

**Problème identifié**: Dans `homey-zigbeedriver/lib/util/index.js:171-174`:

```javascript
function assertClusterSpecification(cluster) {
  if (typeof cluster.ID !== 'number') throw new TypeError('expected_cluster_id_number');
  if (typeof cluster.NAME !== 'string') throw new TypeError('expected_cluster_name_string');
}
```

**Raison**: `CLUSTER.POWER_CONFIGURATION` est un objet mais la validation échoue.

**Solution**: Utiliser le format string legacy `'genPowerCfg'` ou vérifier que l'objet CLUSTER est correctement importé.

---

## 🔍 VÉRIFICATION DANS CODEBASE

```bash
# Trouver tous les usages CLUSTER.* dans registerCapability
grep -r "registerCapability.*CLUSTER\." drivers/
```

**Résultat**: 134 fichiers avec potentiellement ce problème

---

## 🛠️ SCRIPT DE CONVERSION AUTOMATIQUE

Voir: `scripts/fixes/fix-cluster-names.js`

**Stratégie**:
1. Scanner tous les fichiers `device.js`
2. Identifier `registerCapability(X, CLUSTER.Y, Z)`
3. Remplacer par format string legacy
4. Valider syntaxe
5. Tester validation Homey

---

## 📚 RÉFÉRENCES

- **zigbee-clusters**: `node_modules/zigbee-clusters/lib/clusters/`
- **homey-zigbeedriver**: `node_modules/homey-zigbeedriver/lib/ZigBeeDevice.js`
- **Homey SDK3 Docs**: https://athombv.github.io/node-homey-zigbeedriver/ZigBeeDevice.html
- **Zigbee Cluster Spec**: ZCL Specification (Zigbee Alliance)

---

**Créé**: 2025-01-19  
**Status**: 📊 RÉFÉRENCE COMPLÈTE POUR CORRECTIONS
