# 🚨 SOS Emergency Button - Guide de dépannage complet

## Problème signalé (Forum Post #366)

**Utilisateur:** Pas de changements détectés, pas de réponse dans les flows  
**Device:** SOS Emergency Button CR2032  
**Version app:** v2.15.125 et v2.15.133

## 🔍 Diagnostic du problème

### Symptômes
1. ✅ Batterie détectée correctement (97%)
2. ✅ IAS Zone enrollment réussi  
3. ❌ Pas de trigger quand le bouton SOS est pressé
4. ❌ Pas d'événement dans les flows

### Cause racine identifiée
Le device s'enregistre correctement en IAS Zone, mais les **événements de pression** ne sont pas écoutés/traités correctement.

## ✅ Solutions appliquées

### 1. IAS Zone Status Change Listener amélioré
```javascript
// Ajout d'un listener robuste pour alarm_generic
this.registerCapabilityListener('alarm_generic', async (value) => {
  this.log('🚨 SOS Button pressed! Alarm:', value);
  
  // Trigger flow card
  const triggerId = value ? 'sos_button_pressed' : 'sos_button_released';
  try {
    await this.homey.flow.getDeviceTriggerCard(triggerId).trigger(this);
    this.log(`✅ Flow triggered: ${triggerId}`);
  } catch (error) {
    this.error('Flow trigger error:', error.message);
  }
});
```

### 2. Zone Status Notification Handler
```javascript
// Direct IAS Zone status notification
endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
  this.log('🚨 IAS Zone Status Notification:', payload);
  
  const alarm = (payload.zoneStatus & 0x01) !== 0;
  this.setCapabilityValue('alarm_generic', alarm).catch(this.error);
  
  // Trigger flow immédiatement
  const triggerId = alarm ? 'sos_button_pressed' : 'sos_button_released';
  this.homey.flow.getDeviceTriggerCard(triggerId)
    .trigger(this)
    .catch(this.error);
};
```

### 3. Fallback: Polling manuel (si notifications ne fonctionnent pas)
```javascript
// Poll IAS Zone status every 30s as fallback
this.pollInterval = setInterval(async () => {
  try {
    const zoneStatus = await endpoint.clusters.iasZone.readAttributes(['zoneStatus']);
    const alarm = (zoneStatus.zoneStatus & 0x01) !== 0;
    
    const currentAlarm = this.getCapabilityValue('alarm_generic');
    if (alarm !== currentAlarm) {
      this.log('🚨 SOS Status changed (poll):', alarm);
      this.setCapabilityValue('alarm_generic', alarm);
    }
  } catch (error) {
    this.error('Poll error:', error);
  }
}, 30000);
```

## 🧪 Tests à effectuer

### Test 1: Vérifier enrollment
1. Aller dans les paramètres du device
2. Vérifier que "IAS Zone Enrolled" = true
3. Log devrait montrer: `✅ SOS IAS Zone enrolled via: auto-enroll`

### Test 2: Tester le bouton
1. Presser le bouton SOS
2. Dans les logs Homey, chercher: `🚨 SOS Button pressed! Alarm: true`
3. Vérifier que le flow est déclenché: `✅ Flow triggered: sos_button_pressed`

### Test 3: Tester le flow
1. Créer un flow simple:
   - **WHEN:** SOS Button pressed
   - **THEN:** Notification "SOS ACTIVÉ!"
2. Presser le bouton
3. Vérifier notification

## 📋 Flow Cards disponibles

### Triggers (WHEN)
- **SOS Button Pressed** (`sos_button_pressed`)
- **SOS Button Released** (`sos_button_released`)  
- **Battery Changed** (`battery_changed`)
- **Device Online/Offline** (`device_online`, `device_offline`)

### Conditions (AND)
- **SOS is active** (`sos_is_active`)
- **Battery level below X%** (`battery_below`)

### Actions (THEN)
- Aucune action directe (device en lecture seule)

## 🔧 Corrections appliquées (v2.15.134+)

### Fichier modifié: `drivers/sos_emergency_button_cr2032/device.js`

**Changements:**
1. ✅ Ajout listener `alarm_generic` robuste
2. ✅ Ajout handler `onZoneStatusChangeNotification`
3. ✅ Ajout polling fallback (30s)
4. ✅ Logs détaillés pour debugging
5. ✅ Cleanup interval lors destruction device

### Nouveau comportement attendu:
- Pression bouton → IAS Zone notification → `alarm_generic` = true → Flow triggered
- Si notification échoue → Polling détecte changement → Flow triggered
- Logs montrent exactement ce qui se passe

## 🚨 Si ça ne fonctionne toujours pas

### Étape 1: Re-pair le device
1. Retirer le device de Homey
2. Factory reset du bouton: retirer batterie 10s
3. Re-ajouter dans Universal Tuya Zigbee

### Étape 2: Vérifier distance Zigbee
- Device doit être < 10m de Homey ou répéteur
- Ajouter répéteur Zigbee (smart plug AC) si trop loin

### Étape 3: Envoyer diagnostic
1. Presser bouton SOS 3x
2. Dans Homey app → Device → Settings → Send diagnostic
3. Partager dans forum avec:
   - Log ID
   - Timestamp précis de pression bouton
   - Comportement observé

## 📊 Informations techniques

### IAS Zone Type: 21 (Emergency Button)
- `zoneType: 21` = Bouton d'urgence
- `zoneStatus bit 0` = Alarm active/inactive
- Auto-reset: NON (reste actif jusqu'à acquittement)

### Clusters utilisés:
- **0 (Basic):** Informations device
- **1 (Power Configuration):** Batterie
- **3 (Identify):** Identification
- **1280 (IAS Zone):** Alarme SOS

### Endpoints:
- **Endpoint 1:** Toutes les capabilities

## 🔗 Ressources

- [IAS Zone Specification](https://zigbeealliance.org/wp-content/uploads/2019/12/07-5123-06-zigbee-cluster-library-specification.pdf) (Section 8.2)
- [Homey Zigbee Driver Docs](https://apps-sdk-v3.developer.homey.app/tutorial-Zigbee-Advanced.html)
- [Forum Discussion](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/366)

## ✅ Statut correction

- **Version:** v2.15.134+
- **Status:** ✅ Correction appliquée
- **Test:** En attente retour utilisateurs
- **ETA:** Disponible dans prochaine mise à jour app

---

*Dernière mise à jour: 16 Octobre 2025*
