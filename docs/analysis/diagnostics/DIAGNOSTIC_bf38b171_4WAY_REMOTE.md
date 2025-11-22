# 🔴 NOUVEAU DIAGNOSTIC v3.1.4 - "Unable to get service by id"

**Date**: 2025-10-19 16:31 UTC+02:00  
**Log ID**: `bf38b171-6fff-4a92-b95b-117639f5140f`  
**App Version**: v3.1.4 (notre hotfix!)  
**Homey Version**: v12.8.0  
**Priority**: 🔴 HIGH

---

## 📋 User Message

> "Asding 4 way as a remote. Then unable to get sevice by id"

**Traduction/Interprétation**:
- User essaie d'ajouter un "4 way" (switch/remote 4 gang) en tant que télécommande
- Erreur: "unable to get service by id"

---

## 🔍 Analyse Erreur

### Type d'Erreur
**"unable to get service by id"** est une erreur Homey standard qui se produit quand:
1. Un driver référence un service qui n'existe pas
2. Un flow card référence un service invalide
3. Un capability ou device class invalide

### Contexte
- ✅ Tous les drivers s'initialisent correctement
- ✅ v3.1.4 est installée (avec nos corrections cluster)
- ❌ Erreur se produit durant le **pairing process**

---

## 🎯 Drivers "4 Way" Possibles

### Scene Controllers 4-Button
1. **scene_controller_4button_cr2032**
   - Flow cards: ✅ Registered (log: "Flow cards registered")
   - Driver init: ✅ Success

2. **wireless_scene_controller_4button_battery**
   - Flow cards: ✅ Registered
   - Driver init: ✅ Success

### Switches 4-Gang
3. **switch_4gang_ac**
   - Driver init: ✅ Success

4. **switch_4gang_battery_cr2032**
   - Driver init: ✅ Success

5. **wireless_switch_4gang_cr2032**
   - Driver init: ✅ Success

6. **wireless_switch_4gang_cr2450**
   - Driver init: ✅ Success

7. **touch_switch_4gang_ac**
   - Driver init: ✅ Success

8. **wall_switch_4gang_ac**
   - Driver init: ✅ Success

9. **wall_switch_4gang_dc**
   - Driver init: ✅ Success

10. **smart_switch_4gang_hybrid**
    - Driver init: ✅ Success

---

## 🔬 Cause Probable

### Hypothèse #1: Flow Card Service ID Invalide (80%)

**Problème**: Les scene controllers 4-button ont des flow cards custom. Si un flow card référence un service ID qui n'existe plus ou est mal formaté, cette erreur se produit.

**Code suspect** - Scene Controllers:
```javascript
// Probablement dans driver.js ou device.js
this.homey.flow.getDeviceTriggerCard('button_X_pressed')
  .trigger(this, tokens, state);
```

Si `button_X_pressed` n'est pas déclaré dans `driver.compose.json` ou `flow/`, erreur!

---

### Hypothèse #2: Device Class/Capability Invalide (15%)

**Problème**: Si le driver déclare un device class invalide ou une capability non supportée.

**Vérification nécessaire**:
- `driver.compose.json` ou `app.json`: Quelle class?
- Capabilities déclarées vs capabilities supportées

---

### Hypothèse #3: Problème Corrections v3.1.4 (5%)

**Problème**: Nos corrections cluster ont peut-être cassé quelque chose dans les scene controllers.

**Rappel corrections v3.1.4**:
- Scene controller 4-button: `CLUSTER.ON_OFF` → `'genOnOff'` (2 occurrences)

**Vérification**: Ce changement a-t-il cassé quelque chose?

---

## 🔍 Analyse Logs Détaillée

### Drivers Initialisés Avant Erreur
```
2025-10-19T14:23:22.802Z [log] [ManagerDrivers] [Driver:switch_4gang_battery_cr2032] Tuya Zigbee Driver has been initialized
```

### Pas d'Erreur Visible
- ❌ Aucune stack trace dans les logs
- ❌ Aucun message d'erreur explicite
- ✅ Tous les drivers initialisés avec succès

**Conclusion**: L'erreur se produit **pendant le pairing**, pas à l'initialisation.

---

## 🛠️ Actions Immédiates

### 1. Vérifier Flow Cards Scene Controllers

**Fichiers à vérifier**:
```
drivers/scene_controller_4button_cr2032/driver.compose.json
drivers/scene_controller_4button_cr2032/device.js
drivers/wireless_scene_controller_4button_battery/driver.compose.json
drivers/wireless_scene_controller_4button_battery/device.js
```

**Rechercher**:
- Déclarations flow cards
- Service IDs référencés
- Trigger/action/condition cards

---

### 2. Vérifier Device Class

**Dans driver.compose.json ou app.json**:
```json
{
  "class": "???"  // Quelle valeur?
}
```

**Classes valides**:
- `sensor`, `light`, `socket`, `button`, `remote` (pas `switch`!)

---

### 3. Vérifier Capabilities

**Capabilities déclarées vs supportées**:
- `onoff` - ✅ Standard
- `button` - ⚠️ Custom? Deprecated?
- `alarm_*` - ✅ Standard

---

### 4. Comparer Avant/Après Corrections v3.1.4

**Correction appliquée** (scene_controller_4button_cr2032):
```javascript
// AVANT v3.1.4
this.registerCapability('onoff', CLUSTER.ON_OFF, { ... });

// APRÈS v3.1.4
this.registerCapability('onoff', 'genOnOff', { ... });
```

**Impact**: Devrait être transparent, mais vérifier...

---

## 📊 Comparaison Peter vs Cet Utilisateur

### Peter (46c66060)
- **Version**: Probablement v3.1.2/v3.1.3
- **Problème**: Devices ne fonctionnent pas (bugs connus)
- **Status**: Attente confirmation version

### Cet Utilisateur (bf38b171)
- **Version**: v3.1.4 (confirmé!)
- **Problème**: "unable to get service by id" au pairing
- **Status**: Nouveau bug à investiguer

---

## 🎯 Plan d'Action

### Immédiat (30 min)
1. ✅ Lire code scene_controller_4button drivers
2. ✅ Vérifier flow cards declarations
3. ✅ Identifier service ID manquant/invalide

### Court Terme (2h)
4. 🔧 Corriger service ID si nécessaire
5. 🧪 Tester pairing process
6. 📦 Préparer hotfix v3.1.5 si besoin

### Communication
7. ✉️ Répondre à l'utilisateur pour plus d'infos:
   - Quel device exact?
   - Screenshot de l'erreur?
   - Étape précise où ça échoue?

---

## 📧 Email Template Utilisateur

```
Subject: RE: Diagnostic bf38b171 - "Unable to get service by id"

Hi,

Thank you for the diagnostic report (bf38b171).

I see you're trying to add a 4-way switch/remote and encountering 
"unable to get service by id" error.

To help investigate, could you please provide:

1. **Exact device model**: Is it a:
   - Scene controller (4 buttons)?
   - Wall switch (4 gang)?
   - Wireless switch (4 gang)?
   - Other?

2. **When does the error appear**:
   - During device search/pairing?
   - After pairing completes?
   - When trying to use the device?

3. **Screenshot** if possible (optional but helpful)

This will help me identify and fix the issue quickly.

Best regards,
Dylan Rajasekaram
```

---

## 🔴 PRIORITÉ

**HIGH** - C'est un bug dans notre v3.1.4 qui vient de sortir!

**Impact**:
- User ne peut pas pairing son device
- Probablement affecte tous les scene controller 4-button
- Besoin hotfix v3.1.5 rapidement si confirmé

---

## 📝 Notes

### Timing Suspect
v3.1.4 déployé: ~2h ago  
Ce diagnostic: ~15 min ago  

**Coïncidence?** Probablement pas - nos corrections ont peut-être introduit un bug.

### Vérifications Nécessaires
- [ ] Code scene_controller_4button
- [ ] Flow cards declarations
- [ ] Device class validity
- [ ] Capability compatibility
- [ ] Service ID references

---

**Status**: 🔴 INVESTIGATION EN COURS  
**ETA**: Identification cause: 30 min  
**ETA**: Fix si nécessaire: 2-4 heures
