#  Guide de Dépannage Zigbee - Universal Tuya Zigbee

## Table des Matières
1. [Problèmes de Pairing](#1-problèmes-de-pairing)
2. [Problèmes de Flows](#2-problèmes-de-flows)
3. [Diagnostic et Vérification](#3-diagnostic-et-vérification)
4. [Solutions Implémentées](#4-solutions-implémentées)

---

## 1. Problèmes de Pairing

### 1.1 Limite des "Direct Children" (Routeurs vs End Devices)

**Problème :** Le coordinateur Zigbee de Homey a une limite d'appareils connectés directement (~15-20). Si vous avez beaucoup de capteurs sur piles et peu de routeurs, les nouveaux appareils seront rejetés.

**Symptômes :**
- L'appareil apparaît brièvement puis disparaît
- Message "Device not found" après pairing
- Pairing échoue systématiquement

**Solutions :**
1. Ajouter des routeurs (prises 220V, ampoules) avant les capteurs
2. Espacer les appareils pour étendre le maillage
3. Vérifier le mesh dans https://tools.developer.homey.app/zigbee

**Ce que fait l'app :** L'app utilise `PermissiveMatchingEngine` pour accepter les appareils même si le fingerprint n'est pas parfait, permettant un enrichissement post-pairing.

---

### 1.2 Interférences WiFi (Canaux 2.4GHz)

**Problème :** Le WiFi et Zigbee partagent la bande 2.4GHz. Les canaux qui se chevauchent causent des interférences.

**Canaux WiFi vs Zigbee :**
| WiFi Channel | Fréquence | Zigbee Channels affectés |
|--------------|-----------|-------------------------|
| 1 | 2.412 GHz | 11-14 |
| 6 | 2.437 GHz | 15-18 |
| 11 | 2.462 GHz | 19-22 |

**Solutions :**
1. Canal Zigbee 11 ou 25-26 (hors bande WiFi courante)
2. Vérifier: https://tools.developer.homey.app/zigbee
3. Éloigner Homey des routeurs WiFi

---

### 1.3 Tuya "Magic Spell" (Séquence d'Initialisation)

**Problème :** Certains appareils Tuya quittent le réseau après ~10 secondes s'ils ne reçoivent pas une trame de confirmation.

**Symptômes :**
- Device pairé puis disparaît après quelques secondes
- "Device unavailable" immédiatement après pairing
- Fonctions ne répondent pas

**Ce que fait l'app :**
```javascript
// Dans BaseHybridDevice.js - onNodeInit()
// 1. Lecture Basic cluster pour "réveiller" le device
await this.zclNode.endpoints[1].clusters.basic.readAttributes(['modelId', 'manufacturerName']);

// 2. Time Sync obligatoire pour Tuya
await this.tuyaEF00Manager?.syncTime();

// 3. Query DP initiale
await this.tuyaEF00Manager?.queryAllDPs();
```

**Fichiers concernés :**
- `lib/devices/BaseHybridDevice.js` - Initialisation universelle
- `lib/tuya/TuyaEF00Manager.js` - Time sync et DP queries
- `lib/tuya/TuyaSyncManager.js` - Synchronisation périodique

---

### 1.4 Timeout de l'Interview

**Problème :** L'appareil s'endort avant que Homey ait fini l'interview Zigbee.

**Solutions :**
1. Garder l'appareil éveillé (appuyer sur bouton toutes les secondes)
2. Pairer près de Homey (<1m)
3. Batterie chargée à 100%

**Ce que fait l'app :**
- Utilise `ZigbeeTimeout` avec des délais adaptés aux sleepy devices
- Mode passif pour les appareils batterie
- Retry automatique avec backoff exponentiel

---

## 2. Problèmes de Flows

### 2.1 Absence de "Reporting Configuration"

**Problème :** L'appareil est contrôlable depuis l'app mais les changements physiques ne déclenchent pas les Flows.

**Symptômes :**
- Contrôle OK depuis Homey  device
- Appui physique  rien dans Homey
- Flow triggers jamais activés

**Ce que fait l'app :**
```javascript
// Dans HybridSensorBase.js
async _configureAttributeReportingSDK3(zclNode) {
  // Configure reporting pour TOUS les clusters disponibles
  const reportingConfigs = [
    { cluster: 'temperatureMeasurement', attr: 'measuredValue', min: 60, max: 3600 },
    { cluster: 'relativeHumidity', attr: 'measuredValue', min: 60, max: 3600 },
    { cluster: 'onOff', attr: 'onOff', min: 0, max: 3600 },
    // ...
  ];
  
  for (const config of reportingConfigs) {
    await configureReportingWithRetry(endpoint, config);
  }
}
```

**Fichiers concernés :**
- `lib/utils/ReportingConfig.js` - Configuration centralisée
- `lib/utils/ZigbeeRetry.js` - Retry avec backoff

---

### 2.2 Mauvais Mapping des Endpoints (Multi-Gang)

**Problème :** Pour un switch 2-gang, le bouton 1 est sur endpoint 1 et bouton 2 sur endpoint 2. Si le driver n'écoute que endpoint 1, le bouton 2 ne déclenche rien.

**Ce que fait l'app :**
```javascript
// Dans MultiEndpointManager.js
async configureAllEndpoints() {
  const endpoints = this.device.zclNode.endpoints;
  
  for (const epId of Object.keys(endpoints)) {
    // Configure onOff pour CHAQUE endpoint
    if (endpoint.clusters?.onOff) {
      const capabilityId = epId === 1 ? 'onoff' : `onoff.${epId}`;
      
      onOff.on('attr.onOff', async (value) => {
        await device.setCapabilityValue(capabilityId, !!value);
      });
    }
  }
}
```

**Configuration driver.compose.json :**
```json
{
  "capabilities": ["onoff", "onoff.gang2", "onoff.gang3"],
  "zigbee": {
    "endpoints": {
      "1": { "clusters": [6] },
      "2": { "clusters": [6] },
      "3": { "clusters": [6] }
    }
  }
}
```

---

### 2.3 Capability Listeners Manquants

**Problème :** Une capability personnalisée est définie mais pas de listener enregistré.

**Ce que fait l'app :**
```javascript
// Dans BaseHybridDevice.js
async _registerUniversalCapabilityListeners() {
  // Enregistre AUTOMATIQUEMENT les listeners pour toutes les capabilities
  const capabilities = this.getCapabilities();
  
  for (const cap of capabilities) {
    if (!this._hasCapabilityListener(cap)) {
      this.registerCapabilityListener(cap, async (value) => {
        await this._handleCapabilityChange(cap, value);
      });
    }
  }
}
```

---

### 2.4 Conflit Cluster Standard vs Tuya Propriétaire (0xEF00)

**Problème :** Homey utilise ZCL standard (cluster 0x0006 onOff) mais le device Tuya utilise son protocole propriétaire (cluster 0xEF00 avec Data Points).

**Ce que fait l'app :**
```javascript
// Dans TuyaEF00Manager.js - Interception du cluster EF00
async initialize() {
  // Bind to Tuya cluster 0xEF00
  const tuyaCluster = this.device.zclNode.endpoints[1].clusters[0xEF00];
  
  if (tuyaCluster) {
    // Écoute les DP reports
    tuyaCluster.on('response', (frame) => {
      this._handleDPReport(frame);
    });
  }
  
  // Utilise aussi le mode passif (ZCL frame listener)
  this._setupPassiveListener();
}
```

**Fichiers concernés :**
- `lib/tuya/TuyaEF00Manager.js` - Gestionnaire principal
- `lib/tuya/TuyaDPParser.js` - Parsing des Data Points
- `lib/clusters/TuyaBoundCluster.js` - Cluster binding

---

## 3. Diagnostic et Vérification

### 3.1 Outils de Diagnostic

1. **Homey Developer Tools :** https://tools.developer.homey.app/
   - Zigbee mesh view
   - Device logs
   - App logs

2. **Dans l'app :**
   - Settings  Enable Debug Logging
   - Diagnostics Report (dans settings device)

### 3.2 Interprétation des Logs

**Si ça ne paire pas :**
```
[PAIRING] Device appeared briefly then left  Magic Spell manquant
[PAIRING] No response from device  Timeout/sleepy device
[PAIRING] Rejected by network  Limite children atteinte
```

**Si les Flows ne marchent pas :**
```
# Pas de log du tout  Reporting pas configuré (device ne parle pas)
[TUYA-DP] Received DP1 = true  OK, device parle
[FLOW] Trigger not found  Flow card ID incorrect
```

### 3.3 Commandes de Debug

Dans la console développeur Homey :
```javascript
// Voir l'état du device
Homey.devices.getDevice({ id: 'device-id' }).then(d => console.log(d));

// Forcer un refresh
device.refreshCapabilityValue('onoff');

// Voir le mesh Zigbee
Homey.zigbee.getState().then(console.log);
```

---

## 4. Solutions Implémentées

### 4.1 Architecture Hybride

L'app utilise une architecture hybride intelligente :

```

                    Device Init                          

  1. PermissiveMatchingEngine (pair first, identify later)
  2. TuyaEF00Manager (cluster 0xEF00 for TS0601)
  3. MultiEndpointManager (all endpoints configured)
  4. ReportingConfig (automatic reporting setup)
  5. DataRecoveryManager (periodic data refresh)

```

### 4.2 Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `lib/devices/BaseHybridDevice.js` | Base class universelle |
| `lib/tuya/TuyaEF00Manager.js` | Gestion cluster Tuya |
| `lib/managers/MultiEndpointManager.js` | Multi-gang/multi-endpoint |
| `lib/utils/ReportingConfig.js` | Configuration reporting |
| `lib/pairing/PermissiveMatchingEngine.js` | Pairing permissif |

### 4.3 Mode Passif pour Sleepy Devices

Pour les appareils batterie qui s'endorment :
```javascript
// TuyaEF00Manager.js
_setupPassiveListener() {
  // N'envoie PAS de commandes actives
  // Attend que le device se réveille et envoie des données
  this.device.log('[TUYA-PASSIVE] Mode passif activé');
  this.device.log('[TUYA-PASSIVE]  Device will report when it wakes up');
}
```

---

## Support

Pour signaler un problème :
1. Activer Debug Logging dans les settings de l'app
2. Reproduire le problème
3. Envoyer un Diagnostic Report depuis les settings du device
4. Ouvrir une issue GitHub avec les logs

**GitHub :** https://github.com/dlnraja/com.tuya.zigbee/issues
