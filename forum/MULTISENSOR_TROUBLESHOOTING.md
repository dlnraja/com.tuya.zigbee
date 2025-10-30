# 🌡️ Motion + Temperature + Humidity + Illumination Multisensor - Guide de dépannage

## Problème signalé (Forum Posts #365-366)

**Utilisateur:** No readings at all on Multisensor, last seen 56 years ago  
**Device:** Motion + Temp + Humidity + Illumination Sensor (4-in-1)  
**Versions:** v2.15.125 et v2.15.133

## 🔍 Diagnostic du problème

### Symptômes
1. ✅ Température fonctionne (14°C détectée)
2. ❌ Humidité: pas de données
3. ❌ Illuminance: pas de données  
4. ❌ Motion: pas de données
5. ❌ "Last seen": affiche 1969 (= timestamp 0 = jamais vu)

### Erreur technique identifiée
```
TypeError: Cannot read properties of undefined (reading 'ID')
at assertClusterSpecification
at registerCapability (measure_humidity)
```

**Cause:** Le cluster `CLUSTER.RELATIVE_HUMIDITY` n'existe pas dans zigbee-clusters. Il faut utiliser l'ID numérique `1029`.

## ✅ Solutions appliquées

### 1. Correction cluster humidity (1029)
```javascript
// AVANT (❌ ne fonctionne pas)
this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY, { ... });

// APRÈS (✅ fonctionne)
this.registerCapability('measure_humidity', 1029, {
  get: 'measuredValue',
  report: 'measuredValue',
  reportParser: value => value / 100
});
```

### 2. Suppression import tuya-cluster-handler manquant
```javascript
// ❌ Supprimé (module n'existe pas)
// const IASZoneEnroller = require('../../utils/tuya-cluster-handler');

// ✅ Import correct
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
```

### 3. Reporting configuration robuste
```javascript
// Configuration reporting pour tous les clusters
await endpoint.clusters.temperatureMeasurement.configureReporting({
  measuredValue: {
    minInterval: 60,    // 1 minute
    maxInterval: 3600,  // 1 heure
    minChange: 50       // 0.5°C
  }
});

await endpoint.clusters[1029].configureReporting({
  measuredValue: {
    minInterval: 60,
    maxInterval: 3600,
    minChange: 100      // 1% humidity
  }
});

await endpoint.clusters.illuminanceMeasurement.configureReporting({
  measuredValue: {
    minInterval: 60,
    maxInterval: 3600,
    minChange: 100      // Changement luminosité
  }
});
```

### 4. Motion IAS Zone avec fallback
```javascript
// Motion via IAS Zone (cluster 1280)
const enroller = new IASZoneEnroller(this, endpoint, {
  zoneType: 13, // Motion sensor
  capability: 'alarm_motion',
  pollInterval: 60000,
  autoResetTimeout: 60000 // Auto-reset après 60s
});

await enroller.enroll(zclNode);

// Fallback: si IAS échoue, essayer cluster 1030
if (!enrolled) {
  this.registerCapability('alarm_motion', 1030, {
    cluster: 'occupancySensing',
    get: 'occupancy',
    report: 'occupancy',
    reportParser: value => value === 1
  });
}
```

## 🧪 Tests à effectuer

### Test 1: Vérifier tous les clusters
```javascript
// Dans les logs, chercher:
✅ Temperature cluster registered
✅ Humidity cluster registered
✅ Illuminance cluster registered
✅ Motion IAS Zone enrolled
✅ Battery capability registered
```

### Test 2: Déclencher motion
1. Passer la main devant le capteur
2. Logs devraient montrer: `🚶 Motion detected: true`
3. Après 60s: `🚶 Motion cleared: false`

### Test 3: Vérifier reporting
1. Attendre 5 minutes
2. Vérifier que température/humidité se mettent à jour
3. Si pas de mise à jour → Re-configurer reporting

### Test 4: Tester illuminance
1. Allumer/éteindre lumière près du capteur
2. Logs: `💡 Illuminance: XXX lux`
3. Valeur doit changer significativement

## 📋 Capabilities disponibles

| Capability | Cluster | Update Interval | Description |
|------------|---------|-----------------|-------------|
| `measure_temperature` | 1026 | 1-60 min | Température (°C) |
| `measure_humidity` | 1029 | 1-60 min | Humidité (%) |
| `measure_luminance` | 1024 | 1-60 min | Luminosité (lux) |
| `alarm_motion` | 1280 | Immédiat | Mouvement détecté |
| `measure_battery` | 1 | 1-24h | Batterie (%) |

## 🔧 Corrections appliquées (v2.15.134+)

### Fichier: `drivers/motion_temp_humidity_illumination_multi_battery/device.js`

**Changements critiques:**
1. ✅ Cluster humidity: `CLUSTER.RELATIVE_HUMIDITY` → `1029`
2. ✅ Import supprimé: `tuya-cluster-handler` (n'existe pas)
3. ✅ Reporting configuration ajoutée pour tous clusters
4. ✅ IAS Zone enrollment + fallback cluster 1030
5. ✅ Logs détaillés pour debugging

### Nouveau comportement:
- **Température:** Update toutes les 1-60 minutes (ou si change >0.5°C)
- **Humidité:** Update toutes les 1-60 minutes (ou si change >1%)
- **Luminosité:** Update toutes les 1-60 minutes (ou si change significativement)
- **Motion:** Immédiat via IAS Zone, auto-reset 60s
- **Battery:** Update toutes les 1-24 heures

## 🚨 Si ça ne fonctionne toujours pas

### Problème: Humidity/Illuminance toujours vides

**Solution 1: Re-interview device**
```bash
# Dans Homey CLI
homey app run
# Logs → chercher "Endpoint 1 clusters"
# Vérifier que 1029 et 1024 sont présents
```

**Solution 2: Factory reset + re-pair**
1. Retirer device de Homey
2. Factory reset: retirer batterie 10s + bouton reset 5s
3. Re-ajouter dans Universal Tuya Zigbee

**Solution 3: Forcer configuration reporting**
```javascript
// Dans settings device, ajouter bouton "Re-configure reporting"
await endpoint.clusters[1029].configureReporting({ ... });
```

### Problème: "Last seen 56 years ago"

**Cause:** Timestamp = 0 (epoch Unix = 1 Jan 1970)  
**Signification:** Device jamais vu/communiqué depuis ajout

**Solutions:**
1. Vérifier distance Zigbee (< 10m de Homey ou répéteur)
2. Ajouter répéteur Zigbee (smart plug AC) entre device et Homey
3. Réduire interférences (éloigner de Wi-Fi 2.4GHz, micro-ondes)
4. Vérifier batterie (si <20%, remplacer)

### Problème: Motion ne se reset pas

**Solution:** Ajuster `autoResetTimeout`
```javascript
// Dans device.js
const enroller = new IASZoneEnroller(this, endpoint, {
  zoneType: 13,
  capability: 'alarm_motion',
  pollInterval: 60000,
  autoResetTimeout: 30000  // 30s au lieu de 60s
});
```

## 📊 Informations techniques

### Clusters utilisés (tous numériques pour SDK3):
- **0 (Basic):** Infos device, manufacturer
- **1 (Power Configuration):** Batterie CR2032
- **3 (Identify):** Identification visuelle
- **1024 (Illuminance Measurement):** Luminosité (10^((value-1)/10000) lux)
- **1026 (Temperature Measurement):** Temp (value/100 °C)
- **1029 (Relative Humidity):** Humidity (value/100 %)
- **1280 (IAS Zone):** Motion detection (bit 0 = alarm)

### Endpoints:
- **Endpoint 1:** Tous les sensors (multi-endpoint rare sur ce type device)

### Power source:
- **CR2032 battery** (durée vie ~12 mois selon usage)
- Reporting fréquent = drain batterie plus rapide
- Mode "low power" recommandé: maxInterval = 3600s

## 🔗 Ressources complémentaires

- [Zigbee Cluster Library Spec](https://zigbeealliance.org/wp-content/uploads/2019/12/07-5123-06-zigbee-cluster-library-specification.pdf)
- [Homey SDK3 Zigbee Docs](https://apps-sdk-v3.developer.homey.app/tutorial-Zigbee-Advanced.html)
- [IAS Zone Tutorial](https://apps-sdk-v3.developer.homey.app/tutorial-Zigbee-IASZone.html)

## ✅ Statut correction

- **Version:** v2.15.134+
- **Status:** ✅ Correction appliquée (humidity cluster + reporting config)
- **Test:** En attente retour utilisateurs
- **ETA:** Disponible dans prochaine mise à jour app

---

**Note importante:** Si après re-pair le device fonctionne mais "last seen" reste à 1969, c'est un bug d'affichage Homey. Le device communique correctement si les valeurs se mettent à jour.

*Dernière mise à jour: 16 Octobre 2025*
