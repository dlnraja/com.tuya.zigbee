# 🎯 MOTION AWARE - Détection Présence via Ampoules Zigbee

**Date:** 21 Octobre 2025  
**Feature:** Presence detection using Zigbee bulbs  
**Source:** https://www.domo-blog.fr/decouverte-configuration-hue-motion-aware-philips-hue-invente-detection-presence-par-ampoules/

---

## 🔍 CONCEPT

**Philips Hue Motion Aware** utilise les ampoules Zigbee connectées comme **capteurs de présence passifs**.

### Principe de Fonctionnement

```
1. Ampoule Zigbee émet signal régulier
2. Homey/Hub mesure force signal (RSSI)
3. Personne passe → Perturbation signal
4. Algorithme détecte changement → Présence détectée
5. Trigger flows automatiques
```

### Avantages

```
✅ Pas besoin capteurs motion dédiés
✅ Utilise infrastructure existante
✅ Coût: 0€ (si ampoules déjà installées)
✅ Couverture étendue (plusieurs pièces)
✅ Détection passive (pas de PIR)
```

---

## 🔬 IMPLÉMENTATION TECHNIQUE

### Architecture Zigbee

```javascript
/**
 * RSSI Monitoring pour détection présence
 * 
 * Zigbee LQI (Link Quality Indicator) et RSSI peuvent
 * détecter perturbations causées par mouvement humain
 */

// Homey SDK3 expose:
// - node.broadcast
// - node.endpoints[x].clusters
// - LQI values
// - RSSI values

class MotionAwarePresenceDetector {
  
  async enablePresenceDetection(device) {
    const zclNode = device.zclNode;
    
    // Monitor RSSI changes
    zclNode.on('lqi', (lqi) => {
      this.analyzeLQIChange(lqi);
    });
    
    // Alternative: Periodic ping + measure response time
    this.startPeriodicMonitoring(zclNode);
  }
  
  analyzeLQIChange(lqi) {
    // Baseline: RSSI moyen sur 60 secondes
    const baseline = this.calculateBaseline();
    
    // Changement significatif = présence
    if (Math.abs(lqi - baseline) > THRESHOLD) {
      this.triggerPresenceEvent();
    }
  }
  
  async startPeriodicMonitoring(zclNode) {
    setInterval(async () => {
      try {
        const before = Date.now();
        await zclNode.endpoints[1].clusters.basic.readAttributes(['zclVersion']);
        const latency = Date.now() - before;
        
        // Latence anormale = obstruction = présence
        if (latency > NORMAL_LATENCY * 1.5) {
          this.triggerPresenceEvent();
        }
      } catch (err) {
        // Connection issues peuvent aussi indiquer présence
      }
    }, 5000); // Check every 5s
  }
}
```

---

## 🎯 IMPLÉMENTATION HOMEY

### Nouvelle Capability: `presence_zigbee`

```json
{
  "capabilities": [
    "onoff",
    "dim",
    "light_hue",
    "light_saturation",
    "light_temperature",
    "presence_zigbee"  // NEW
  ]
}
```

### Settings

```json
{
  "id": "enable_motion_aware",
  "type": "checkbox",
  "label": {
    "en": "Enable Motion Aware (Presence Detection)",
    "fr": "Activer Motion Aware (Détection Présence)"
  },
  "value": false,
  "hint": {
    "en": "Uses Zigbee signal strength to detect presence. Experimental feature.",
    "fr": "Utilise la force du signal Zigbee pour détecter la présence. Fonctionnalité expérimentale."
  }
},
{
  "id": "motion_aware_sensitivity",
  "type": "dropdown",
  "label": {
    "en": "Sensitivity",
    "fr": "Sensibilité"
  },
  "value": "medium",
  "values": [
    { "id": "low", "label": { "en": "Low", "fr": "Faible" } },
    { "id": "medium", "label": { "en": "Medium", "fr": "Moyenne" } },
    { "id": "high", "label": { "en": "High", "fr": "Élevée" } }
  ]
}
```

### Flow Cards

```json
{
  "triggers": [
    {
      "id": "motion_aware_presence_detected",
      "title": {
        "en": "Presence detected (Motion Aware)",
        "fr": "Présence détectée (Motion Aware)"
      },
      "hint": {
        "en": "Triggered when presence is detected via Zigbee signal analysis",
        "fr": "Déclenché quand présence détectée via analyse signal Zigbee"
      }
    },
    {
      "id": "motion_aware_presence_cleared",
      "title": {
        "en": "Presence cleared (Motion Aware)",
        "fr": "Présence terminée (Motion Aware)"
      }
    }
  ]
}
```

---

## 📊 DÉFIS TECHNIQUES

### 1. **RSSI Access**

```
❓ Homey SDK3 expose-t-il RSSI en temps réel?
   → Vérifier: zclNode.rssi / node.lqi
   
❓ Frequency de mise à jour?
   → Test requis
```

### 2. **False Positives**

```
⚠️ Interférences WiFi/Bluetooth
⚠️ Autres devices Zigbee nearby
⚠️ Portes/fenêtres qui bougent
⚠️ Animaux domestiques

Solution: Machine Learning pour pattern recognition
```

### 3. **Calibration**

```
🎯 Besoin baseline per room
🎯 Apprentissage initial (24-48h)
🎯 Auto-ajustement selon environnement
```

---

## 🚀 PLAN D'IMPLÉMENTATION

### Phase 1: Research & Proof of Concept

```
1. ✅ Document research
2. ⏳ Test RSSI access in Homey SDK3
3. ⏳ Create prototype driver (1 bulb)
4. ⏳ Measure baseline stability
5. ⏳ Test presence detection accuracy
```

### Phase 2: Algorithm Development

```
1. Baseline calculation (rolling average)
2. Threshold tuning per sensitivity
3. False positive reduction
4. Timeout logic (presence cleared after X seconds)
```

### Phase 3: Integration

```
1. Add capability to all light drivers
2. Create flow cards
3. Settings UI
4. Documentation user
```

### Phase 4: Testing & Refinement

```
1. Beta testing (10 users)
2. Collect feedback
3. Adjust algorithm
4. Publish stable version
```

---

## 📚 RÉFÉRENCES

### Articles

1. **Philips Hue Motion Aware**
   - https://www.domo-blog.fr/decouverte-configuration-hue-motion-aware-philips-hue-invente-detection-presence-par-ampoules/
   
2. **Ampoules Zigbee comme détecteurs**
   - https://www.domo-blog.fr/les-ampoules-zigbee-existantes-pourrait-devenir-des-detecteurs-mouvements-prochainement/

### Technique

1. **Zigbee LQI/RSSI**
   - https://www.zigbee2mqtt.io/guide/usage/lqi.html
   
2. **Homey SDK3 Zigbee**
   - https://apps-sdk-v3.developer.homey.app/tutorial-Zigbee.html

---

## ⚠️ LIMITATIONS

### Hardware

```
❌ Ne fonctionne PAS avec:
   - Devices Zigbee end-devices (battery)
   - Bulbs trop éloignées du hub
   - Espaces très grands (>50m²)
   
✅ Fonctionne MIEUX avec:
   - Bulbs router (AC powered)
   - Distances courtes (<10m)
   - Espaces confinés (chambres, bureaux)
```

### Précision

```
⚠️ Moins précis que PIR motion sensor
⚠️ Délai détection: 3-10 secondes
⚠️ Ne détecte pas direction
⚠️ Ne compte pas nombre personnes
```

---

## 🎯 CONCLUSION

**Motion Aware via ampoules Zigbee = Feature innovante MAIS:**

1. **Recherche technique approfondie requise**
2. **Test extensif nécessaire**
3. **Peut être Phase 2 (après stabilisation app)**

**Recommendation:** 
- ⏳ Feature à implémenter APRÈS résolution problèmes actuels
- 🎯 Excellent USP (Unique Selling Point)
- 🔬 Nécessite R&D dédiée

**Priorité:** **MEDIUM** (après bugs critiques, avant polish UI)

---

**Status:** 📝 Documented - Awaiting Phase 1 Research
