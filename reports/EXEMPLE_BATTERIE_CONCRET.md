# 🔋 EXEMPLE CONCRET: Motion Sensor Battery

## 📱 CAS RÉEL: Capteur de mouvement Tuya

---

## 1️⃣ AVANT MES MODIFICATIONS

### `driver.compose.json` (INCOMPLET):
```json
{
  "name": {
    "en": "PIR Motion Sensor Battery"
  },
  "capabilities": [
    "alarm_motion",
    "measure_battery"  // ← Capability SANS metadata
  ]
  // ❌ MANQUE: energy.batteries
}
```

### Validation Homey:
```bash
homey app validate --level publish

❌ ERREUR:
"drivers.motion_sensor_battery is missing an array 
 'energy.batteries' because the capability measure_battery 
 is being used."
```

### Conséquence:
```
❌ Publication impossible
❌ App Store reject
```

---

## 2️⃣ APRÈS MES MODIFICATIONS

### `driver.compose.json` (COMPLET):
```json
{
  "name": {
    "en": "PIR Motion Sensor Battery"
  },
  "capabilities": [
    "alarm_motion",
    "measure_battery"
  ],
  "energy": {
    "batteries": ["CR2032"]  // ✅ AJOUTÉ
  }
}
```

### Validation Homey:
```bash
homey app validate --level publish

✅ SUCCESS:
"App validated successfully against level 'publish'"
```

---

## 3️⃣ CODE FONCTIONNEL (INCHANGÉ)

### `device.js` - Comment la batterie est VRAIMENT gérée:

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionSensorBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // ... autres initialisations ...
    
    // ═══════════════════════════════════════════════════════
    // MESURE BATTERIE - CODE EXISTANT (INCHANGÉ)
    // ═══════════════════════════════════════════════════════
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        
        // Lire la valeur actuelle
        get: 'batteryPercentageRemaining',
        
        // S'abonner aux rapports automatiques
        report: 'batteryPercentageRemaining',
        
        // Parser quand valeur reçue du device
        reportParser: (value) => {
          // Tuya envoie 0-200, on convertit en 0-100%
          const percentage = Math.max(0, Math.min(100, value / 2));
          this.log('Battery level:', percentage + '%');
          return percentage;
        },
        
        // Parser quand on lit manuellement
        getParser: (value) => {
          return Math.max(0, Math.min(100, value / 2));
        }
      });
    }
  }
}

module.exports = MotionSensorBatteryDevice;
```

---

## 4️⃣ COMMUNICATION ZIGBEE (Réel)

### Protocole Zigbee entre Device et Homey:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Device Tuya (Capteur mouvement)                     │
│    • Pile CR2032 installée                             │
│    • Niveau: 174/200 (87%)                             │
└─────────────────────────────────────────────────────────┘
                    │
                    │ Zigbee Report (Cluster 1 - genPowerCfg)
                    │ Attribute: batteryPercentageRemaining
                    │ Value: 174
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Homey Zigbee Stack                                   │
│    • Reçoit: 174                                        │
│    • Passe au driver                                    │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Driver (device.js)                                   │
│    reportParser: value => value / 2                     │
│    • Calcule: 174 / 2 = 87                             │
│    • Retourne: 87%                                      │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Homey Core                                           │
│    • Stocke: measure_battery = 87                       │
│    • Lit metadata: batteries = ["CR2032"]              │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Interface Homey (App/Web)                           │
│    • Affiche: 🔋 87%                                   │
│    • Info: "Uses CR2032 battery"                       │
│    • Energy Dashboard: tracked                          │
└─────────────────────────────────────────────────────────┘
```

---

## 5️⃣ CE QUE VOIT L'UTILISATEUR

### Dans l'app Homey:

```
╔═══════════════════════════════════════════════╗
║ 🚶 PIR Motion Sensor Battery                  ║
║                                               ║
║ 🔴 Motion detected                            ║
║                                               ║
║ 🔋 Battery: 87%  ⓘ CR2032                   ║
║    └─ Last updated: 2 minutes ago            ║
║                                               ║
║ Settings:                                     ║
║   • Battery type: CR2032  ← DE energy.batteries
║   • Last motion: 5 min ago                    ║
║   • Signal strength: Excellent               ║
╚═══════════════════════════════════════════════╝
```

### Energy Dashboard:

```
╔═══════════════════════════════════════════════╗
║ 📊 Battery Devices                            ║
║                                               ║
║ Device                    Battery  Type       ║
║ ────────────────────────────────────────────  ║
║ Motion Sensor 1           87%     CR2032 ✓   ║
║ Door Sensor               65%     CR2032 ⚠️   ║
║ Remote Switch             100%    CR2032 ✓   ║
║ Temperature Sensor        45%     AAA    ⚠️   ║
╚═══════════════════════════════════════════════╝
```

---

## 6️⃣ NOTIFICATIONS AUTOMATIQUES

### Quand batterie faible (<20%):

```javascript
// Homey déclenche automatiquement (built-in):

Flow:
  WHEN: Battery level below 20%
  AND:  Device = Motion Sensor Battery
  THEN: Send notification "Change CR2032 battery"
        └─ Info type prise de energy.batteries
```

---

## 7️⃣ SCÉNARIOS PRATIQUES

### A. Installation nouveau device:

```
Utilisateur:
1. Appaire capteur Tuya
2. Homey lit metadata: "batteries": ["CR2032"]
3. Interface affiche: "⚠️ Requires CR2032 battery"
4. Utilisateur sait quelle pile acheter!
```

### B. Maintenance:

```
Homey Energy Dashboard:
1. Voit tous devices avec batterie
2. Type pile affiché pour chacun
3. Liste de courses intelligente:
   • 3x CR2032 (capteurs)
   • 2x AAA (télécommandes)
   • 1x AA (détecteur fumée)
```

### C. Remplacement batterie:

```
Notification Homey:
"Motion Sensor battery low (15%)"
"Requires: CR2032"  ← DE energy.batteries

Utilisateur:
1. Lit notification
2. Sait exactement quelle pile prendre
3. Change pile
4. Device reprend communication
5. Homey lit nouveau %: 100%
```

---

## 8️⃣ DEBUGGING (Si problèmes)

### Vérifier que tout fonctionne:

```bash
# 1. Lire logs Homey CLI
homey app log

# Output attendu:
✓ Battery level: 87%
✓ Battery report received: 174
✓ Parsed battery value: 87%

# 2. Tester communication Zigbee
# Dans Homey Developer Tools → Device:
{
  "capabilities": {
    "measure_battery": 87  ✓
  },
  "energy": {
    "batteries": ["CR2032"]  ✓
  }
}

# 3. Forcer lecture manuelle
# Homey App → Device → Advanced → Test capability
Capability: measure_battery
Action: GET
Result: 87%  ✓
```

---

## 🎯 CONCLUSION

### Ce qui a changé:
```json
"energy": {
  "batteries": ["CR2032"]  // ← JUSTE ÇA
}
```

### Ce qui fonctionne:
```javascript
// TOUT CE CODE EXISTAIT DÉJÀ ET FONCTIONNE:
this.registerCapability('measure_battery', 'genPowerCfg', {
  report: 'batteryPercentageRemaining',
  reportParser: value => value / 2
});
```

### Bénéfices:
- ✅ Validation SDK3 réussie
- ✅ Info pile affichée utilisateur
- ✅ Energy Dashboard complet
- ✅ Notifications intelligentes
- ✅ Meilleure UX

### Aucun risque:
- ❌ Code fonctionnel inchangé
- ❌ Communication Zigbee identique
- ❌ Rien de cassé

---

**Simple métadonnée = Grande amélioration UX! 🎯**
