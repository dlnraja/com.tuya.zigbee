/**
 * EXEMPLE D'UTILISATION - ZIGBEE CLUSTER MAP
 *
 * Ce fichier montre comment utiliser le module zigbee-cluster-map
 * dans vos drivers Homey pour éviter les erreurs NaN
 */

const ClusterMap = require('./zigbee-cluster-map');

// ============================================
// MÉTHODE 1: Utilisation directe des constantes
// ============================================

// Au lieu de:
// this.registerCapability('measure_battery', 'powerConfiguration'); // [ERROR] NaN error

// Utilisez:
this.registerCapability('measure_battery', ClusterMap.POWER_CONFIGURATION); // [OK] = 1

// ============================================
// MÉTHODE 2: Utilisation de get()
// ============================================

// Résolution depuis un nom (flexible)
const clusterId1 = ClusterMap.get('POWER_CONFIGURATION'); // = 1
const clusterId2 = ClusterMap.get('powerConfiguration'); // = 1
const clusterId3 = ClusterMap.get('genPowerCfg'); // = 1 (alias)

// Si déjà un nombre, retourne le nombre
const clusterId4 = ClusterMap.get(1); // = 1

// ============================================
// MÉTHODE 3: Utilisation de resolve()
// ============================================

// Résout n'importe quel format
const clusterA = ClusterMap.resolve('TEMPERATURE_MEASUREMENT'); // = 1026
const clusterB = ClusterMap.resolve(1026); // = 1026
const clusterC = ClusterMap.resolve({ ID: 1026 }); // = 1026 (CLUSTER object)

// ============================================
// MÉTHODE 4: Utilisation de safeGet() avec fallback
// ============================================

// Si la valeur n'existe pas, utilise le fallback
const safe1 = ClusterMap.safeGet('UNKNOWN_CLUSTER', 0); // = 0
const safe2 = ClusterMap.safeGet('ON_OFF', 0); // = 6
const safe3 = ClusterMap.safeGet(null, 999); // = 999

// ============================================
// EXEMPLE COMPLET DANS UN DRIVER
// ============================================

class ExampleDevice extends ZigBeeDevice {
  async onNodeInit() {
    // Au lieu de coder en dur les numéros OU utiliser des strings
    // Utilisez ClusterMap pour la flexibilité

    // [OK] CORRECT - Avec ClusterMap
    this.registerCapability('measure_battery', ClusterMap.POWER_CONFIGURATION);
    this.registerCapability('measure_temperature', ClusterMap.TEMPERATURE_MEASUREMENT);
    this.registerCapability('measure_humidity', ClusterMap.RELATIVE_HUMIDITY);
    this.registerCapability('measure_luminance', ClusterMap.ILLUMINANCE_MEASUREMENT);
    this.registerCapability('alarm_motion', ClusterMap.IAS_ZONE);

    // Ou avec get() si vous préférez les strings
    this.registerCapability('onoff', ClusterMap.get('ON_OFF'));
    this.registerCapability('dim', ClusterMap.get('LEVEL_CONTROL'));

    // Ou avec resolve() pour gérer n'importe quel format
    const clusters = ['BASIC', 'IDENTIFY', 1280]; // mix string/number
    clusters.forEach(cluster => {
      const id = ClusterMap.resolve(cluster);
      console.log(`Cluster ${cluster} = ID ${id}`);
    });
  }
}

// ============================================
// VÉRIFICATION D'EXISTENCE
// ============================================

if (ClusterMap.has('POWER_CONFIGURATION')) {
  console.log('[OK] Cluster exists');
}

if (!ClusterMap.has('FAKE_CLUSTER')) {
  console.log('[ERROR] Cluster does not exist');
}

// ============================================
// OBTENIR LE NOM DEPUIS L'ID
// ============================================

const name = ClusterMap.getName(1026); // = 'TEMPERATURE_MEASUREMENT'
console.log(`Cluster 1026 is: ${name}`);

// ============================================
// OBTENIR TOUS LES CLUSTERS
// ============================================

const allClusters = ClusterMap.getAll();
console.log('Total clusters:', Object.keys(allClusters).length);

// ============================================
// UTILISATION AVEC TUYA PROPRIETARY CLUSTER
// ============================================

// Pour les devices Tuya qui utilisent le cluster 0xEF00 (61184)
this.registerCapability('custom_tuya_dp', ClusterMap.TUYA_PROPRIETARY);

// Ou
this.registerCapability('custom_tuya_dp', ClusterMap.get('TUYA_PROPRIETARY'));

// ============================================
// CONVERSION DEPUIS CLUSTER OBJECT (zigbee-clusters)
// ============================================

// Si vous avez un objet CLUSTER depuis zigbee-clusters
const CLUSTER = require('zigbee-clusters');

// Au lieu de:
// this.registerCapability('onoff', CLUSTER.ON_OFF.ID); // Peut causer NaN

// Utilisez:
this.registerCapability('onoff', ClusterMap.resolve(CLUSTER.ON_OFF)); // [OK] Safe

// ============================================
// GESTION D'ERREUR
// ============================================

function registerCapabilitySafe(capability, clusterIdentifier) {
  const clusterId = ClusterMap.resolve(clusterIdentifier);

  if (clusterId === null) {
    console.error(`[ERROR] Unknown cluster: ${clusterIdentifier}`);
    return false;
  }

  if (isNaN(clusterId)) {
    console.error(`[ERROR] Invalid cluster ID: ${clusterId} for ${clusterIdentifier}`);
    return false;
  }

  this.registerCapability(capability, clusterId);
  console.log(`[OK] Registered ${capability} on cluster ${clusterId}`);
  return true;
}

// ============================================
// DEBUGGING
// ============================================

function debugClusters() {
  console.log('=== CLUSTER DEBUG ===');

  const testCases = [
    'POWER_CONFIGURATION',
    'ON_OFF',
    'TEMPERATURE_MEASUREMENT',
    'IAS_ZONE',
    'TUYA_PROPRIETARY',
    1026,
    { ID: 1280 },
    'UNKNOWN_CLUSTER'
  ];

  testCases.forEach(test => {
    const result = ClusterMap.resolve(test);
    console.log(`${JSON.stringify(test)} => ${result}`);
  });
}

// ============================================
// MIGRATION DEPUIS ANCIEN CODE
// ============================================

// AVANT (v3.0.25 et antérieur):
// this.registerCapability('measure_battery', 'powerConfiguration'); // [ERROR] NaN
// this.registerCapability('measure_temperature', 'temperatureMeasurement'); // [ERROR] NaN

// APRÈS (v3.0.26+):
// this.registerCapability('measure_battery', 1); // [OK] Fonctionne mais pas flexible
// this.registerCapability('measure_temperature', 1026); // [OK] Fonctionne mais pas flexible

// MAINTENANT (v3.0.30+):
this.registerCapability('measure_battery', ClusterMap.POWER_CONFIGURATION); // [OK] Meilleur
this.registerCapability('measure_temperature', ClusterMap.TEMPERATURE_MEASUREMENT); // [OK] Meilleur

// Ou encore plus flexible:
this.registerCapability('measure_battery', ClusterMap.get('POWER_CONFIGURATION')); // [OK] Très flexible
this.registerCapability('measure_temperature', ClusterMap.get('TEMPERATURE_MEASUREMENT')); // [OK] Très flexible

// ============================================
// CONFIGURATION DEPUIS driver.compose.json
// ============================================

// Dans driver.compose.json, gardez les numéros:
// {
//   "zigbee": {
//     "clusters": [0, 1, 3, 1026, 1029, 1024, 1280]
//   }
// }

// Mais dans device.js, utilisez ClusterMap pour la lisibilité:
const requiredClusters = [
  ClusterMap.BASIC,
  ClusterMap.POWER_CONFIGURATION,
  ClusterMap.IDENTIFY,
  ClusterMap.TEMPERATURE_MEASUREMENT,
  ClusterMap.RELATIVE_HUMIDITY,
  ClusterMap.ILLUMINANCE_MEASUREMENT,
  ClusterMap.IAS_ZONE
];

// Vérifier que tous les clusters requis sont présents
requiredClusters.forEach(clusterId => {
  const clusterName = ClusterMap.getName(clusterId);
  // TODO: Wrap in try/catch
  if (this.zclNode.endpoints[1].clusters[clusterId]) {
    console.log(`[OK] Cluster ${clusterName} (${clusterId}) available`);
  } else {
    console.warn(`[WARN]  Cluster ${clusterName} (${clusterId}) missing`);
  }
});

module.exports = ExampleDevice;
