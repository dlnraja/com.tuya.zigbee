# 🚀 PLAN FINAL DES CORRECTIONS v4.11.0

**Date:** 2025-11-21
**Version Cible:** 4.11.0
**Base:** v4.10.1 (ZG-204ZL fix deployed)

---

## 📊 RÉSUMÉ EXÉCUTIF

Après recherche approfondie sur **Blakadder Zigbee Database**, **Zigbee2MQTT**, **documentation Homey SDK3**, et analyse du code source actuel, voici le plan complet pour v4.11.0.

### Issues Traités:
1. ✅ **ZG-204ZL Motion Sensor** - DÉJÀ CORRIGÉ dans v4.10.1
2. ✅ **ZM-P1 Motion Sensor** - DÉJÀ CORRIGÉ (c'est un ZG-204ZL!)
3. 🔧 **Smart Button Flow Triggers** - CORRECTION IDENTIFIÉE
4. 🟡 **SOS Emergency Button** - BESOIN FINGERPRINT
5. 🟡 **_TZE200_rhgsbacq Presence** - TUYA DP COMPLEXE
6. 🟡 **2-Gang Energy Socket** - BESOIN INTERVIEW

---

## 1. 🔘 BOUTONS SANS FIL - FLOW TRIGGERS FIX

### Problème Identifié

**Source:** Analyse `lib/devices/ButtonDevice.js` ligne 125

```javascript
// LIGNE 125 - PROBLÈME CRITIQUE!
this.log(`[BIND] ⚠️  OnOff cluster bind not supported (SDK3 limitation)`);
```

**Diagnostic de Cam (027cb6c9):** Le bouton est reconnu mais les flows ne se déclenchent pas.

**Cause racine:**
- Le binding SDK3 n'est pas supporté comme SDK2
- Les commandes ne sont pas reçues par Homey
- Alternative: utiliser `reportOpts` au lieu de `bind()`

### Solution: Mise à Jour driver.compose.json

**File:** `drivers/button_wireless_1/driver.compose.json`

**Modification CRITIQUE:**

```json
{
  "endpoints": {
    "1": {
      "clusters": [
        0,      // basic
        1,      // powerConfiguration
        3,      // identify
        4,      // groups
        5,      // scenes
        6,      // onOff
        1280    // iasZone ← AJOUTER CECI!
      ],
      "bindings": [
        6,      // onOff
        1280    // iasZone ← AJOUTER CECI!
      ]
    }
  }
}
```

**Explication:**
- Ajouter cluster `1280` (IAS Zone) - beaucoup de boutons Tuya utilisent ceci
- Ajouter binding `1280` pour recevoir les notifications IAS Zone
- Permet la détection alternative via `zoneStatusChangeNotification`

### Nouveau Code device.js - IAS Zone Support

**Ajouter dans `lib/devices/ButtonDevice.js` après ligne 166:**

```javascript
// PRIORITY 4: IAS Zone cluster (alternative for button detection)
const iasZoneCluster = this.zclNode.endpoints[ep]?.clusters?.iasZone;
if (iasZoneCluster) {
  this.log(`[SETUP] Listening to IAS Zone cluster on endpoint ${ep}...`);

  // IAS Zone enrollment (CRITICAL!)
  iasZoneCluster.onZoneEnrollRequest = async () => {
    this.log(`[IAS] Received Zone Enroll Request from button ${ep}`);
    try {
      await iasZoneCluster.zoneEnrollResponse({
        enrollResponseCode: 0, // Success
        zoneId: ep, // Use endpoint as zone ID
      });
      this.log(`[IAS] ✅ Button ${ep} enrolled successfully`);
    } catch (err) {
      this.error(`[IAS] Enrollment failed for button ${ep}:`, err);
    }
  };

  // Proactive enrollment (in case request was missed)
  try {
    await iasZoneCluster.zoneEnrollResponse({
      enrollResponseCode: 0,
      zoneId: ep,
    });
    this.log(`[IAS] Proactive enrollment sent for button ${ep}`);
  } catch (err) {
    // Ignore - device may not need it
  }

  // Listen for zone status changes (button presses!)
  iasZoneCluster.on('zoneStatusChangeNotification', async (data) => {
    this.log(`[IAS] 🔘 Button ${ep} zone status change:`, data);

    // Parse zone status bits
    const alarm1 = (data.zoneStatus & 0x01) !== 0; // Bit 0 = Alarm1
    const alarm2 = (data.zoneStatus & 0x02) !== 0; // Bit 1 = Alarm2

    this.log(`[IAS] Alarm1: ${alarm1}, Alarm2: ${alarm2}`);

    if (alarm1) {
      this.log(`[IAS] ✅ Button ${ep} pressed (via IAS Zone)`);
      await this.triggerButtonPress(ep, 'single');
    }

    if (alarm2) {
      this.log(`[IAS] ✅ Button ${ep} long pressed (via IAS Zone)`);
      await this.triggerButtonPress(ep, 'long');
    }
  });

  this.log(`[OK] ✅ Button ${ep} IAS Zone detection configured`);
}
```

### Manufacturer IDs à Ajouter (Blakadder Research)

**Ajouter dans `driver.compose.json` manufacturerName:**

```json
"manufacturerName": [
  // ... existing IDs ...

  // TS0041 (1-button) - Blakadder confirmed
  "_TZ3000_pzui3skt",  // Eardatek ESW-0ZAD-EU
  "_TZ3400_keyjqthh",  // AG-Security DP-ZSR001

  // TS0043 (3-button) - Blakadder confirmed
  "_TZ3000_bi6lpsew",  // LoraTap SS600ZB
  "_TZ3000_famkxci2",  // LoraTap SS600ZB variant
  "_TZ3000_rrjr1q0u",  // Eardatek ESW-0ZAB-EU
  "_TZ3000_gbm10jnj",  // Moes ZT-B-EU3
  "_TZ3000_sj7jbgks",  // Moes ZT-B-EU3 variant
  "_TZ3400_key8kk7r",  // Zemismart ZM-ZS-3

  // TS0044 (4-button) - Blakadder confirmed
  "_TZ3000_abci1hiu",  // Moes ZS-SR4-2169
  "_TZ3000_mh9px7cq",  // Moes ZS-SR4-2169 variant
  "_TZ3000_wkai4ga5",  // Eardatek ESW-0ZBA-EU
  "_TZ3000_ygvf9xzp",  // Tuya 4keyremote
  "_TZ3000_vp6clf9d",  // Eardatek ESW-0ZAA-EU
]
```

### Testing Plan

**Étapes pour Cam:**

1. Mettre à jour vers v4.11.0
2. Supprimer le bouton existant
3. Factory reset: maintenir bouton 5-10 secondes
4. Re-pairing
5. Vérifier logs Homey: chercher "[IAS]" et "zoneStatusChangeNotification"
6. Tester flow triggers:
   - Simple press
   - Long press
   - Double press (si supporté)

**Logs attendus:**
```
[IAS] ✅ Button 1 enrolled successfully
[IAS] 🔘 Button 1 zone status change: { zoneStatus: 1, ... }
[IAS] ✅ Button 1 pressed (via IAS Zone)
[FLOW-TRIGGER] 🔘 BUTTON PRESS DETECTED!
[FLOW-TRIGGER] ✅ button_pressed SUCCESS
```

---

## 2. 🚨 BOUTON SOS D'URGENCE

### Recherche Blakadder/LoraTap

**Spécifications LoraTap SOSZB:**
```
Protocol: Tuya ZigBee 3.0
Model: SOSZB, TS0211
Battery: CR2032
Clusters: basic, powerConfiguration, identify, iasZone
```

### Action Requise

**Demander à Peter (forum):**

```markdown
Hi @Peter_van_Werkhoven,

Pour corriger le bouton SOS, j'ai besoin du device fingerprint. Pouvez-vous:

1. Ouvrir Homey Developer Tools (Settings > Developer)
2. Aller dans "Zigbee Devtools"
3. Trouver votre bouton SOS
4. Copier TOUTES les informations et me les envoyer:
   - manufacturerName
   - modelId
   - Clusters (input/output)
   - Device signature complète

Ou plus simple: Partager un diagnostic report de votre bouton SOS:
Homey > Devices > SOS Button > Settings > "Send Diagnostic Report"

Merci! 🙏
Dylan
```

### Driver Template (à créer si Peter répond)

**File:** `drivers/button_emergency_sos/driver.compose.json`

```json
{
  "name": {
    "en": "Emergency SOS Panic Button",
    "fr": "Bouton Panique SOS d'Urgence"
  },
  "class": "button",
  "capabilities": [
    "alarm_generic",
    "measure_battery"
  ],
  "zigbee": {
    "manufacturerName": [
      "LoraTap",
      "_TZ3000_xxxxxxxx"  // À compléter avec fingerprint de Peter
    ],
    "productId": ["TS0211", "SOSZB"],
    "endpoints": {
      "1": {
        "clusters": [0, 1, 3, 1280],
        "bindings": [1280]
      }
    }
  },
  "energy": {
    "batteries": ["CR2032"]
  }
}
```

---

## 3. 🎯 CAPTEUR PRÉSENCE _TZE200_rhgsbacq

### Problème

**Device Type:** TS0601 (Tuya Proprietary Protocol)
**Manufacturer:** _TZE200_rhgsbacq
**Issue:** Utilise Tuya Datapoints, pas des clusters Zigbee standard

### Recherche Zigbee2MQTT

**Tuya Datapoints:**
```javascript
[1, 'presence_state', lookup({ none: 0, motion: 1, stationary: 2 })],
[3, 'near_detection', divideBy100],      // 0.1-6m
[4, 'far_detection', divideBy100],       // 0.1-6m
[9, 'target_distance_closest', divideBy100],
[101, 'static_sensitivity', raw],        // 0-10
[102, 'motion_sensitivity', raw],        // 0-10
```

### Limitation Homey SDK3

**CRITIQUE:** Homey SDK3 ne supporte PAS nativement le parsing Tuya Datapoints (DP).

**Options:**

**Option A:** Attendre support officiel Athom
**Option B:** Implémenter parser Tuya DP custom (complexe)
**Option C:** Demander à Laborhexe de tester avec driver `motion_sensor_multi` actuel

### Action Immédiate

**Réponse forum pour Laborhexe:**

```markdown
Hi @Laborhexe,

Le capteur _TZE200_rhgsbacq est déjà dans le driver `motion_sensor_multi`, mais c'est un TS0601 qui utilise le protocole propriétaire Tuya.

Pouvez-vous:
1. Vérifier qu'il est bien appairé avec "Motion Temp Humidity Illumination Multi"
2. Partager un diagnostic report complet
3. Tester si `alarm_motion` fonctionne après mouvement

Le problème peut être que Homey ne parse pas correctement les Tuya Datapoints. Je suis en train de chercher une solution.

Merci!
Dylan
```

**Status:** 🟡 **INVESTIGATION EN COURS** - Besoin de plus d'infos utilisateur

---

## 4. 📦 2-GANG ENERGY MONITORING SOCKET

### Action Requise

**Demander à David (forum):**

```markdown
Hi @David_Piper,

Pour ajouter le support de votre 2-gang energy socket, j'ai besoin de l'interview data complète.

Pouvez-vous:
1. Partager un diagnostic report du device
2. Ou copier l'interview JSON que vous avez mentionné

Une fois que j'ai le fingerprint, je peux créer le driver en quelques heures.

Merci!
Dylan
```

**Status:** 🟡 **ATTENTE INFO UTILISATEUR**

---

## 5. ✅ CONFIRMATIONS v4.10.1

### ZG-204ZL Motion Sensor - DÉJÀ CORRIGÉ

**File:** `drivers/motion_sensor_multi/driver.compose.json`

✅ Ajouté:
```json
"manufacturerName": [
  "HOBEIAN",
  "_TZ3000_1o6x1bl0",
  // ...
],
"productId": [
  "ZG-204ZL",
  "ZG-204ZM",
  // ...
]
```

**Status:** ✅ **DEPLOYED dans v4.10.1**

### ZM-P1 Motion Sensor - DÉJÀ CORRIGÉ

**DÉCOUVERTE:** Le ZM-P1 est en fait un ZG-204ZL!

**Preuve:** GitHub Zigbee2MQTT issue #28103:
```json
{
  "manufacturerName": "HOBEIAN",
  "modelId": "ZG-204ZL",
  "type": "EndDevice",
  "powerSource": "Battery"
}
```

**Conclusion:** Le fix ZG-204ZL corrige aussi le ZM-P1 de Wesley!

**Status:** ✅ **DEPLOYED dans v4.10.1**

---

## 📋 CHECKLIST v4.11.0

### Code Changes

- [ ] **1. Button Wireless Drivers - Ajouter IAS Zone**
  - [ ] Modifier `drivers/button_wireless_1/driver.compose.json`
  - [ ] Modifier `drivers/button_wireless_2/driver.compose.json`
  - [ ] Modifier `drivers/button_wireless_3/driver.compose.json`
  - [ ] Modifier `drivers/button_wireless_4/driver.compose.json`
  - [ ] Ajouter cluster `1280` et binding `1280`

- [ ] **2. ButtonDevice.js - Ajouter IAS Zone Listener**
  - [ ] Modifier `lib/devices/ButtonDevice.js`
  - [ ] Ajouter IAS Zone enrollment
  - [ ] Ajouter `zoneStatusChangeNotification` listener
  - [ ] Mapper alarm bits vers button presses

- [ ] **3. Ajouter Manufacturer IDs Blakadder**
  - [ ] Ajouter 13 nouveaux manufacturer IDs trouvés
  - [ ] TS0041, TS0043, TS0044 variants

### Documentation

- [ ] **4. Mettre à jour CHANGELOG**
  - [ ] v4.11.0 entry
  - [ ] Détailler fix button flows
  - [ ] Mentionner nouveaux manufacturer IDs

- [ ] **5. Préparer Forum Response**
  - [ ] Message pour Cam (button fix)
  - [ ] Demandes d'info (Peter, Laborhexe, David)
  - [ ] Status update général

### Testing

- [ ] **6. Validation**
  - [ ] `homey app validate`
  - [ ] Vérifier pas d'erreurs SDK3
  - [ ] Test local si possible

- [ ] **7. User Testing**
  - [ ] Cam teste button flow triggers
  - [ ] Collecter fingerprints manquants
  - [ ] Monitor forum pour confirmations

---

## 🎯 PRIORITÉS

### P0 - CRITIQUE (v4.11.0 immediate)

1. **Button Flow Triggers Fix** (Cam)
   - Impact: CRITICAL - fonctionnalité complètement cassée
   - Complexité: MEDIUM - code change identifié
   - Users: 1+ (peut-être plus non reportés)
   - **ETA: 4-6 heures de développement**

2. **Ajouter Manufacturer IDs Blakadder**
   - Impact: MEDIUM - améliore compatibilité
   - Complexité: LOW - simple ajout liste
   - Users: Inconnu (préventif)
   - **ETA: 1 heure**

### P1 - HAUTE (v4.11.0 ou v4.12.0)

3. **SOS Emergency Button** (Peter)
   - Impact: HIGH - dispositif de sécurité
   - Complexité: LOW-MEDIUM (si fingerprint fourni)
   - Users: 1
   - **ETA: 2-3 heures APRÈS réception fingerprint**

### P2 - MOYENNE (v4.12.0)

4. **_TZE200_rhgsbacq Presence** (Laborhexe)
   - Impact: MEDIUM - device spécifique
   - Complexité: HIGH - Tuya DP parsing
   - Users: 1
   - **ETA: 6-8 heures (ou attente support Athom)**

5. **2-Gang Energy Socket** (David)
   - Impact: LOW-MEDIUM - enhancement
   - Complexité: MEDIUM (si interview fourni)
   - Users: 1
   - **ETA: 3-4 heures APRÈS réception interview**

---

## 📅 TIMELINE PROPOSÉ

### Semaine 1 (Nov 21-27)

**Lundi-Mardi:**
- ✅ v4.10.1 deployed (ZG-204ZL fix)
- ✅ Recherche Blakadder complète
- ✅ Documentation conversion SDK3

**Mercredi-Jeudi:**
- 🔧 Implémenter IAS Zone fix pour boutons
- 🔧 Ajouter nouveaux manufacturer IDs
- 🔧 Testing local

**Vendredi:**
- 📝 Préparer v4.11.0
- 📝 Update changelog
- 📝 Préparer forum posts
- 🚀 Deploy v4.11.0

### Semaine 2 (Nov 28 - Dec 4)

**Lundi-Mardi:**
- 📊 Monitor user feedback v4.11.0
- ❓ Attendre fingerprints (SOS, 2-gang socket)
- 📧 Follow-up forum

**Mercredi-Vendredi:**
- 🔧 Implémenter SOS button (si fingerprint reçu)
- 🔧 Implémenter 2-gang socket (si interview reçu)
- 🔍 Investiguer Tuya DP pour presence sensor

### Semaine 3 (Dec 5-11)

**Si infos reçues:**
- 🚀 Deploy v4.12.0 avec SOS + 2-gang
- 📊 Monitor feedback
- 🎉 Célébrer succès!

**Si infos pas reçues:**
- 📧 Relance utilisateurs
- 📝 Documentation "how to get fingerprint"
- 🔄 Attente

---

## 📨 MESSAGES FORUM À POSTER

### Message Principal (après v4.11.0 deploy)

```markdown
# 🚀 v4.11.0 - CRITICAL FIX: Wireless Button Flow Triggers

Hi everyone! 👋

Great news for wireless button users!

## ✅ FIXED IN v4.11.0

### 1️⃣ Wireless Button Flow Triggers NOW WORKING! 🎉

**Affected User:** @Cam

**The Problem:**
Your wireless buttons (TS0041/TS0043/TS0044) were recognized but flow triggers weren't firing when you pressed the buttons.

**Root Cause Found:**
- SDK3 binding limitations prevented command reception
- Missing IAS Zone cluster support
- Buttons were sending events that Homey wasn't listening to

**The Fix:**
✅ Added IAS Zone cluster support (1280)
✅ Implemented `zoneStatusChangeNotification` listener
✅ Added proper IAS Zone enrollment
✅ Alternative detection method when scenes/onOff don't work

**How to Update:**
1. Update app to v4.11.0 (available in 24-48 hours)
2. **CRITICAL:** Remove your wireless buttons from Homey
3. Factory reset buttons (hold 5 seconds until LED flashes)
4. Re-pair - flows should now trigger correctly!
5. Test all button press types (single, double, long)

### 2️⃣ Expanded Device Compatibility

Added support for 13+ new device variants from Blakadder database:
✅ LoraTap SS600ZB (3-button)
✅ Moes ZT-B-EU3, ZS-SR4-2169
✅ Eardatek ESW series
✅ Zemismart ZM-ZS-3
✅ And more!

## 📊 STATUS UPDATE

### Already Fixed (v4.10.1)
✅ **ZG-204ZL Motion Sensor** (5+ users)
✅ **ZM-P1 Motion Sensor** (it's actually a ZG-204ZL!)

### Under Investigation
🔍 **SOS Emergency Button** (@Peter_van_Werkhoven)
  - Need device fingerprint - please share diagnostic!

🔍 **_TZE200_rhgsbacq Presence Sensor** (@Laborhexe)
  - Tuya DP protocol complexity - need more testing

🔍 **2-Gang Energy Socket** (@David_Piper)
  - Need interview data - please reshare!

## 📈 COMING IN v4.12.0 (2-3 weeks)

If I receive the missing device fingerprints:
- SOS emergency button support
- 2-gang energy monitoring socket
- Additional Tuya DP improvements

## 🙏 THANK YOU!

Special thanks to:
- @Cam for detailed diagnostics
- Blakadder Zigbee Database for device research
- All users reporting issues with patience

Vos rapports aident toute la communauté! 🎉

Questions? Reply below!
Dylan
```

### Message pour Cam (individual)

```markdown
@Cam - Your wireless button issue is **FIXED in v4.11.0**! 🎉

The problem was SDK3 binding limitations. I've implemented IAS Zone support as an alternative detection method.

**CRITICAL:** You MUST remove and re-pair your buttons after updating to v4.11.0 for this fix to work.

Steps:
1. Wait for v4.11.0 (24-48h)
2. Remove buttons from Homey
3. Factory reset (hold 5s)
4. Re-pair
5. Test flows!

Let me know if it works! 🙏
```

### Message Demandes d'Info

```markdown
@Peter_van_Werkhoven - For the SOS button, I need the device fingerprint. Can you share a diagnostic report? Settings > Send Diagnostic Report

@Laborhexe - For _TZE200_rhgsbacq, can you verify it paired as "Motion Temp Humidity Illumination Multi" and share a diagnostic report?

@David_Piper - Can you reshare the interview data for the 2-gang energy socket?

Thanks everyone! 🙏
```

---

## 📁 FILES TO MODIFY

### Priority 1 (v4.11.0)

```
drivers/button_wireless_1/driver.compose.json   ← Add IAS Zone + new IDs
drivers/button_wireless_2/driver.compose.json   ← Add IAS Zone + new IDs
drivers/button_wireless_3/driver.compose.json   ← Add IAS Zone + new IDs
drivers/button_wireless_4/driver.compose.json   ← Add IAS Zone + new IDs
lib/devices/ButtonDevice.js                     ← Add IAS Zone listener
.homeychangelog.json                            ← Add v4.11.0 entry
app.json                                        ← Bump version to 4.11.0
docs/FORUM_RESPONSE_v4.11.0.md                  ← New forum post draft
```

### Priority 2 (v4.12.0 - conditional)

```
drivers/button_emergency_sos/*                  ← New driver (if fingerprint)
drivers/socket_2gang_energy/*                   ← New driver (if interview)
drivers/motion_sensor_multi/device.js           ← Tuya DP support (if feasible)
```

---

## ✅ SUCCESS CRITERIA

### v4.11.0 Release

- [ ] `homey app validate` passes
- [ ] No SDK3 errors
- [ ] Cam confirms button flows working (>80% confidence)
- [ ] At least 2-3 users test and confirm
- [ ] No regressions in existing features

### v4.12.0 Release (conditional)

- [ ] SOS button added (if fingerprint received)
- [ ] 2-gang socket added (if interview received)
- [ ] Peter/David confirm devices working

---

**Document Status:** ✅ READY FOR IMPLEMENTATION
**Next Action:** Implement button IAS Zone fix
**Owner:** Dylan Rajasekaram
**Target Date:** v4.11.0 by Nov 27, 2025
