# 📧 Réponse Utilisateur - MaxListenersExceeded & Pas de Température

## Diagnostic ID: c685fb8b-3edd-4207-959b-41f8fc5431ef

---

## 🔍 Ce que montrent les logs

### Problème 1: MaxListenersExceededWarning
```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
11 dataReport listeners added to [TemperatureMeasurement]...
11 attr.measuredValue listeners added to [RelativeHumidityCluster]...
```

**Cause** : L'app configurait les listeners sur les clusters pour chaque capteur, mais en cas de redémarrage ou double initialisation, les listeners s'accumulaient.

### Problème 2: Invalid Capability
```
[INIT] super.onNodeInit() ERROR: Invalid Capability: measure_temperature
```

**Cause** : L'app essayait d'enregistrer des capabilities qui n'existaient pas encore sur certains appareils.

---

## ✅ Correctifs v5.3.63

| Fichier | Correctif |
|---------|-----------|
| `AutoAdaptiveDevice.js` | Guard `_autoAdaptiveInited` |
| `climate_sensor/device.js` | Guard `_climateSensorInited` + `_bumpClusterMaxListeners()` |
| `BaseHybridDevice.js` | Déjà protégé |

### Chaîne de protection :
```
ClimateSensor._climateSensorInited
  └→ AutoAdaptiveDevice._autoAdaptiveInited
      └→ BaseHybridDevice._baseHybridInitialized
```

Triple protection contre les initialisations doubles !

---

## 📧 Texte de réponse

```
Bonjour,

Merci pour le diagnostic c685fb8b-3edd-4207-959b-41f8fc5431ef.

Dans les logs, on voit deux problèmes :

1. **MaxListenersExceededWarning** : Les listeners s'accumulaient sur les clusters ZCL à chaque initialisation de capteur.

2. **Invalid Capability: measure_temperature** : Certains capteurs n'avaient pas les capabilities correctement déclarées.

J'ai ajouté les correctifs suivants dans la v5.3.63 :

- **Protection anti-double init** : Chaque niveau (ClimateSensor, AutoAdaptiveDevice, BaseHybridDevice) vérifie maintenant s'il a déjà été initialisé avant d'ajouter des listeners.

- **maxListeners augmenté** : Les clusters supportent maintenant jusqu'à 50 listeners au lieu de 10 par défaut, ce qui évite les warnings même avec beaucoup de capteurs.

- **Migration capabilities** : Les capabilities manquantes (température, humidité) sont automatiquement ajoutées avant l'initialisation.

**Pour appliquer le correctif :**

1. Mets à jour l'app Universal Tuya Zigbee
2. Redémarre l'app (ou Homey)
3. Les warnings devraient disparaître

Si un capteur spécifique n'affiche toujours pas la température après la mise à jour, supprime-le et ré-appaire-le.

Merci encore pour le retour détaillé ! 🙏

Dylan
```

---

## 🔧 Commit

```
83b0e48eea - fix(v5.3.63): CRITICAL - Fix MaxListenersExceeded & Invalid Capability
```

---
*Support Universal Tuya Zigbee v5.3.63*
