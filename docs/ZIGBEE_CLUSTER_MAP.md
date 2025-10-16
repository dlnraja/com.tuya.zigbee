# 📋 Zigbee Cluster Map - Documentation Complete

**Module:** `lib/zigbee-cluster-map.js`  
**Version:** 3.0.30+  
**Status:** ✅ Production Ready

---

## 🎯 **OBJECTIF**

Le module `zigbee-cluster-map` fournit un système de correspondance global entre les noms symboliques des clusters Zigbee et leurs identifiants numériques. Il résout le problème des erreurs `NaN` causées par l'utilisation de noms de clusters au lieu de numéros.

---

## ❌ **PROBLÈME RÉSOLU**

### Avant (v3.0.25 et antérieur)
```javascript
// ❌ INCORRECT - Cause NaN errors
this.registerCapability('measure_battery', 'powerConfiguration');
this.registerCapability('measure_temperature', 'temperatureMeasurement');

// Résultat: TypeError: expected_cluster_id_number
// Cluster IDs = NaN
```

### Solution Initiale (v3.0.26)
```javascript
// ✅ Fonctionne mais pas flexible
this.registerCapability('measure_battery', 1);
this.registerCapability('measure_temperature', 1026);

// Problème: Numéros magiques, difficile à lire
```

### Solution Optimale (v3.0.30+)
```javascript
const ClusterMap = require('../../lib/zigbee-cluster-map');

// ✅ OPTIMAL - Lisible et flexible
this.registerCapability('measure_battery', ClusterMap.POWER_CONFIGURATION);
this.registerCapability('measure_temperature', ClusterMap.TEMPERATURE_MEASUREMENT);

// Ou encore plus flexible:
this.registerCapability('measure_battery', ClusterMap.get('POWER_CONFIGURATION'));
```

---

## 📚 **UTILISATION**

### 1. Import du Module

```javascript
const ClusterMap = require('../../lib/zigbee-cluster-map');
```

### 2. Méthodes Disponibles

#### `ClusterMap.get(identifier)`
Résout un nom de cluster vers son ID numérique.

```javascript
ClusterMap.get('POWER_CONFIGURATION')  // = 1
ClusterMap.get('ON_OFF')               // = 6
ClusterMap.get('TEMPERATURE_MEASUREMENT') // = 1026
ClusterMap.get(1026)                   // = 1026 (passthrough)
ClusterMap.get('UNKNOWN')              // = null
```

**Paramètres:**
- `identifier` (string|number) - Nom du cluster ou ID numérique

**Retourne:**
- `number` - ID du cluster
- `null` - Si non trouvé

**Features:**
- ✅ Case insensitive
- ✅ Accepte les nombres (passthrough)
- ✅ Support des aliases (genPowerCfg, msTemperatureMeasurement, etc.)
- ✅ Gère les préfixes CLUSTER.

---

#### `ClusterMap.resolve(value)`
Résout n'importe quel format vers un ID numérique.

```javascript
ClusterMap.resolve('POWER_CONFIGURATION')  // = 1
ClusterMap.resolve(1)                      // = 1
ClusterMap.resolve({ ID: 1 })              // = 1 (CLUSTER object)
ClusterMap.resolve(null)                   // = null
```

**Paramètres:**
- `value` (any) - Valeur à résoudre

**Retourne:**
- `number` - ID du cluster
- `null` - Si impossible à résoudre

**Use cases:**
- ✅ Strings
- ✅ Numbers
- ✅ CLUSTER objects (avec propriété ID)
- ✅ null/undefined handling

---

#### `ClusterMap.safeGet(value, fallback)`
Résolution avec valeur de secours.

```javascript
ClusterMap.safeGet('ON_OFF', 999)    // = 6
ClusterMap.safeGet('UNKNOWN', 999)   // = 999 (fallback)
ClusterMap.safeGet(null, 0)          // = 0 (fallback)
```

**Paramètres:**
- `value` (any) - Valeur à résoudre
- `fallback` (number) - Valeur de secours si résolution échoue

**Retourne:**
- `number` - ID résolu ou fallback

---

#### `ClusterMap.getName(id)`
Obtient le nom depuis l'ID.

```javascript
ClusterMap.getName(1)      // = 'POWER_CONFIGURATION'
ClusterMap.getName(1026)   // = 'TEMPERATURE_MEASUREMENT'
ClusterMap.getName(99999)  // = null
```

**Paramètres:**
- `id` (number) - ID du cluster

**Retourne:**
- `string` - Nom du cluster
- `null` - Si non trouvé

---

#### `ClusterMap.has(identifier)`
Vérifie si un cluster existe.

```javascript
ClusterMap.has('POWER_CONFIGURATION')  // = true
ClusterMap.has('ON_OFF')               // = true
ClusterMap.has(1026)                   // = true
ClusterMap.has('UNKNOWN')              // = false
```

**Paramètres:**
- `identifier` (string|number) - Nom ou ID du cluster

**Retourne:**
- `boolean` - true si existe

---

#### `ClusterMap.getAll()`
Récupère tous les mappings.

```javascript
const all = ClusterMap.getAll();
// Returns: { POWER_CONFIGURATION: 1, ON_OFF: 6, ... }
```

**Retourne:**
- `Object` - Tous les mappings cluster_name → cluster_id

---

### 3. Propriétés Directes (Constantes)

Pour les clusters les plus utilisés:

```javascript
ClusterMap.BASIC                    // = 0
ClusterMap.POWER_CONFIGURATION      // = 1
ClusterMap.IDENTIFY                 // = 3
ClusterMap.ON_OFF                   // = 6
ClusterMap.LEVEL_CONTROL            // = 8
ClusterMap.WINDOW_COVERING          // = 258
ClusterMap.COLOR_CONTROL            // = 768
ClusterMap.ILLUMINANCE_MEASUREMENT  // = 1024
ClusterMap.TEMPERATURE_MEASUREMENT  // = 1026
ClusterMap.RELATIVE_HUMIDITY        // = 1029
ClusterMap.OCCUPANCY_SENSING        // = 1030
ClusterMap.IAS_ZONE                 // = 1280
ClusterMap.METERING                 // = 1794
ClusterMap.ELECTRICAL_MEASUREMENT   // = 2820
ClusterMap.TUYA_PROPRIETARY         // = 61184
```

---

## 🔧 **CLUSTERS SUPPORTÉS**

### Foundation Clusters (0x0000-0x00FF)
```
BASIC                      = 0
POWER_CONFIGURATION        = 1
DEVICE_TEMPERATURE_CONFIGURATION = 2
IDENTIFY                   = 3
GROUPS                     = 4
SCENES                     = 5
ON_OFF                     = 6
ON_OFF_SWITCH_CONFIGURATION = 7
LEVEL_CONTROL              = 8
ALARMS                     = 9
TIME                       = 10
... (12 clusters supplémentaires)
```

### Closures (0x0100-0x01FF)
```
SHADE_CONFIGURATION        = 256
DOOR_LOCK                  = 257
WINDOW_COVERING            = 258
```

### HVAC (0x0200-0x02FF)
```
PUMP_CONFIGURATION_AND_CONTROL = 512
THERMOSTAT                 = 513
FAN_CONTROL                = 514
DEHUMIDIFICATION_CONTROL   = 515
THERMOSTAT_USER_INTERFACE_CONFIGURATION = 516
```

### Lighting (0x0300-0x03FF)
```
COLOR_CONTROL              = 768
BALLAST_CONFIGURATION      = 769
```

### Measurement & Sensing (0x0400-0x04FF)
```
ILLUMINANCE_MEASUREMENT    = 1024
ILLUMINANCE_LEVEL_SENSING  = 1025
TEMPERATURE_MEASUREMENT    = 1026
PRESSURE_MEASUREMENT       = 1027
FLOW_MEASUREMENT           = 1028
RELATIVE_HUMIDITY          = 1029
OCCUPANCY_SENSING          = 1030
SOIL_MOISTURE              = 1032
... (8 clusters supplémentaires)
```

### Security & Safety (0x0500-0x05FF)
```
IAS_ZONE                   = 1280
IAS_ACE                    = 1281
IAS_WD                     = 1282
```

### Smart Energy (0x0700-0x07FF)
```
PRICE                      = 1792
DEMAND_RESPONSE_AND_LOAD_CONTROL = 1793
METERING                   = 1794
MESSAGING                  = 1795
TUNNELING                  = 1796
PREPAYMENT                 = 1797
... (6 clusters supplémentaires)
```

### Home Automation (0x0B00-0x0BFF)
```
APPLIANCE_IDENTIFICATION   = 2816
METER_IDENTIFICATION       = 2817
APPLIANCE_EVENTS_AND_ALERT = 2818
APPLIANCE_STATISTICS       = 2819
ELECTRICAL_MEASUREMENT     = 2820
DIAGNOSTICS                = 2821
```

### Manufacturer Specific
```
TUYA_PROPRIETARY           = 61184 (0xEF00)
TUYA_ELECTRICAL_MEASUREMENT = 61185
TUYA_SWITCH_MODE           = 61186
XIAOMI_SWITCH              = 64512
LEGRAND_CLUSTER            = 64515
PHILIPS_ENTERTAINMENT      = 64769
```

### Aliases (Zigbee2MQTT Style)
```
genBasic                   = 0
genPowerCfg                = 1
genIdentify                = 3
genOnOff                   = 6
genLevelCtrl               = 8
lightingColorCtrl          = 768
msTemperatureMeasurement   = 1026
msRelativeHumidity         = 1029
ssIasZone                  = 1280
haElectricalMeasurement    = 2820
manuSpecificTuya           = 61184
... (plus d'aliases)
```

**Total: 80+ clusters supportés**

---

## 💡 **EXEMPLES PRATIQUES**

### Exemple 1: Driver Multi-Sensor

```javascript
const { ZigBeeDevice } = require('homey-zigbeedriver');
const ClusterMap = require('../../lib/zigbee-cluster-map');

class MultiSensorDevice extends ZigBeeDevice {
  async onNodeInit() {
    // ✅ Lisible et sans erreur
    this.registerCapability('measure_battery', ClusterMap.POWER_CONFIGURATION);
    this.registerCapability('measure_temperature', ClusterMap.TEMPERATURE_MEASUREMENT);
    this.registerCapability('measure_humidity', ClusterMap.RELATIVE_HUMIDITY);
    this.registerCapability('measure_luminance', ClusterMap.ILLUMINANCE_MEASUREMENT);
    this.registerCapability('alarm_motion', ClusterMap.IAS_ZONE);
  }
}

module.exports = MultiSensorDevice;
```

### Exemple 2: Vérification des Clusters

```javascript
async onNodeInit() {
  const requiredClusters = [
    { name: 'Battery', id: ClusterMap.POWER_CONFIGURATION },
    { name: 'Temperature', id: ClusterMap.TEMPERATURE_MEASUREMENT },
    { name: 'Humidity', id: ClusterMap.RELATIVE_HUMIDITY },
    { name: 'Motion', id: ClusterMap.IAS_ZONE }
  ];
  
  requiredClusters.forEach(({ name, id }) => {
    if (this.zclNode.endpoints[1].clusters[id]) {
      this.log(`✅ ${name} cluster (${id}) available`);
    } else {
      this.error(`❌ ${name} cluster (${id}) missing`);
    }
  });
}
```

### Exemple 3: Configuration Dynamique

```javascript
const clusterConfig = {
  sensors: ['TEMPERATURE_MEASUREMENT', 'RELATIVE_HUMIDITY', 'ILLUMINANCE_MEASUREMENT'],
  security: ['IAS_ZONE'],
  power: ['POWER_CONFIGURATION']
};

Object.entries(clusterConfig).forEach(([category, clusters]) => {
  clusters.forEach(clusterName => {
    const clusterId = ClusterMap.get(clusterName);
    this.log(`${category}: ${clusterName} = ${clusterId}`);
  });
});
```

### Exemple 4: Migration Anciens Drivers

```javascript
// AVANT (v3.0.25)
this.registerCapability('onoff', 'onOff'); // ❌ NaN error

// MIGRATION ÉTAPE 1 (v3.0.26)
this.registerCapability('onoff', 6); // ✅ Fonctionne

// MIGRATION FINALE (v3.0.30)
this.registerCapability('onoff', ClusterMap.ON_OFF); // ✅ Optimal
```

---

## 🧪 **TESTS**

Exécutez les tests unitaires:

```bash
node tests/zigbee-cluster-map.test.js
```

**Couverture:**
- ✅ Méthode get()
- ✅ Méthode resolve()
- ✅ Méthode safeGet()
- ✅ Méthode getName()
- ✅ Méthode has()
- ✅ Propriétés directes
- ✅ Exports CLUSTER_IDS/CLUSTER_NAMES
- ✅ Gestion d'erreurs
- ✅ Performance (50k opérations)

---

## 📊 **PERFORMANCE**

```
Benchmark: 50,000 opérations
Duration: <1000ms
Operations/sec: >50,000
Memory: Minimal (static map)
```

---

## 🔄 **MIGRATION GUIDE**

### Étape 1: Identifier les Problèmes

Cherchez dans vos drivers:
```javascript
// Patterns à remplacer:
this.registerCapability(..., 'powerConfiguration');
this.registerCapability(..., 'temperatureMeasurement');
this.registerCapability(..., 'onOff');
```

### Étape 2: Import du Module

Ajoutez en haut de device.js:
```javascript
const ClusterMap = require('../../lib/zigbee-cluster-map');
```

### Étape 3: Remplacer les Strings

```javascript
// Avant:
this.registerCapability('measure_battery', 'powerConfiguration');

// Après:
this.registerCapability('measure_battery', ClusterMap.POWER_CONFIGURATION);
```

### Étape 4: Tester

```bash
homey app validate
homey app run
```

---

## ⚠️ **NOTES IMPORTANTES**

### ✅ À Faire
- Utilisez ClusterMap dans device.js
- Gardez les numéros dans driver.compose.json
- Utilisez des constantes pour la lisibilité
- Testez après migration

### ❌ À Ne Pas Faire
- Ne pas mélanger strings et numéros
- Ne pas hardcoder les numéros dans device.js
- Ne pas utiliser des noms non-standard
- Ne pas ignorer les erreurs de résolution

---

## 🐛 **DEBUGGING**

### Problème: Cluster ID retourne null

```javascript
const clusterId = ClusterMap.get('MY_CLUSTER');
if (clusterId === null) {
  console.error('Cluster not found in map');
  console.log('Available clusters:', Object.keys(ClusterMap.getAll()));
}
```

### Problème: NaN Error Persiste

```javascript
// Vérifiez que vous utilisez bien resolve() ou get()
const clusterId = ClusterMap.resolve(yourValue);
console.log('Resolved:', clusterId, typeof clusterId, isNaN(clusterId));

if (clusterId === null || isNaN(clusterId)) {
  console.error('Invalid cluster ID');
}
```

---

## 📝 **CHANGELOG**

### v3.0.30 (16 Oct 2025)
- ✅ Module créé
- ✅ 80+ clusters mappés
- ✅ Tests unitaires complets
- ✅ Documentation complète
- ✅ Exemples d'utilisation

---

## 🔗 **LIENS**

- **Module:** `lib/zigbee-cluster-map.js`
- **Exemples:** `lib/zigbee-cluster-map-usage-example.js`
- **Tests:** `tests/zigbee-cluster-map.test.js`
- **Documentation:** Ce fichier

---

## 🎯 **CONCLUSION**

Le module `zigbee-cluster-map` résout définitivement le problème des erreurs NaN dans les drivers Zigbee en fournissant:

✅ **Correspondance globale** nom ↔ numéro  
✅ **Flexibilité** multiple méthodes d'accès  
✅ **Lisibilité** code auto-documenté  
✅ **Robustesse** gestion d'erreurs complète  
✅ **Performance** opérations ultra-rapides  
✅ **Compatibilité** support de tous les formats  

**→ Solution production-ready pour tous les drivers Zigbee!**

---

**Maintainer:** Dylan Rajasekaram (@dlnraja)  
**Version:** 3.0.30+  
**License:** MIT
