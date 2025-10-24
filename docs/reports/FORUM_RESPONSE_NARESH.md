# 📋 RÉPONSE FORUM - Naresh_Kodali Battery OK mais Motion/Lux NON

**Date:** 12 Octobre 2025 03:50  
**Utilisateur:** Naresh_Kodali (Post #274)  
**Version:** 2.11.1  
**Problème:** Battery fonctionne, Motion et Illumination ne reportent PAS

---

## 🎯 PROBLÈME IDENTIFIÉ

### Status Actuel
```
✅ Battery: Fonctionne (reporting OK)
❌ Motion: Ne reporte pas
❌ Illumination: Ne reporte pas
```

### Version Utilisée
```
Version: 2.11.1
Status: Ancienne (2 versions derrière)
Latest: 2.11.3 (vient d'être publiée)
```

---

## 🔍 ANALYSE TECHNIQUE

### Pourquoi Battery fonctionne mais pas Motion/Lux?

**Cause probable:**

1. **Reporting Configuration**
   - Battery: Cluster 1 (Power Configuration) - report automatique
   - Motion: IAS Zone (cluster 1280) - requiert enrollment
   - Illuminance: Cluster 1024 - requiert configuration reporting

2. **IAS Zone Enrollment**
   - Le device doit être "enrolled" dans IAS Zone
   - Homey doit être configuré comme CIE (Control and Indicating Equipment)
   - Si enrollment échoue → motion ne reporte pas

3. **Bindings Manquants**
   - Illuminance requiert binding au cluster 1024
   - Si binding non configuré → pas de reports

---

## ✅ SOLUTIONS

### Solution 1: Update vers v2.11.3 (RECOMMANDÉ)

**Pourquoi?**
- Corrections IAS Zone enrollment
- Meilleurs bindings automatiques
- Fixes reporting configuration
- Cluster 3 (Identify) ajouté pour certains devices

**Comment:**
```markdown
1. Settings → Apps → Universal Tuya Zigbee
2. Click "Update" (ou supprimer/réinstaller)
3. Redémarrer Homey
4. Supprimer devices existants
5. Re-pairer devices
6. Attendre 5-10 minutes pour premiers reports
```

### Solution 2: Forcer Re-enrollment IAS Zone

**Via Homey Developer Tools:**
```bash
1. Aller sur: https://developer.athom.com/tools/zigbee
2. Se connecter avec Homey
3. Sélectionner le device motion sensor
4. Dans "Clusters" → IAS Zone (1280)
5. Vérifier "zoneState": doit être "enrolled"
6. Vérifier "iasCIEAddress": doit correspondre à Homey
```

**Si non enrolled:**
- Re-pairer le device
- Ou utiliser "Configure" dans device settings

### Solution 3: Vérifier Bindings

**Problème possible:**
- Illuminance cluster (1024) non bindé
- Motion reports non configurés

**Solution:**
```bash
# Via Homey CLI (si disponible)
homey app run
# Puis dans logs, chercher "binding failed" ou "reporting config failed"
```

### Solution 4: Test Motion Physique

**Important:**
- Motion sensors ont souvent un "timeout"
- Après détection, ils ne reportent pas pendant X minutes
- Essayer de déclencher motion après 3-5 minutes d'inactivité

**Pour Illuminance:**
- Changer drastiquement la lumière (lampe ON/OFF)
- Attendre 1-2 minutes pour report
- Certains sensors reportent seulement si changement > 10%

---

## 🎯 RÉPONSE FORUM SUGGÉRÉE

```markdown
Hi Naresh!

Thanks for testing and the detailed feedback! Great to hear **battery is now working**! 👍

**For Motion & Illumination not reporting:**

This is likely a **reporting configuration** or **IAS Zone enrollment** issue.

**Quick fix - Try this first:**

1. **Update to v2.11.3** (just released!)
   - Settings → Apps → Universal Tuya Zigbee → Update
   - Restart Homey
   - Remove devices
   - Re-pair them

2. **Wait 5-10 minutes** after pairing
   - First motion/lux reports can take time
   - Device needs to configure reporting intervals

3. **Test motion physically:**
   - Wait 5 minutes without movement
   - Walk in front of sensor
   - Check if motion triggers

4. **Test illuminance:**
   - Turn lights ON/OFF (drastic change)
   - Wait 1-2 minutes
   - Check if lux changes

**Why this happens:**

Motion sensors use **IAS Zone** (cluster 1280) which requires:
- Device "enrollment" with Homey
- Proper CIE address configuration
- Sometimes takes 2-3 pairing attempts

Illuminance uses **cluster 1024** which needs:
- Reporting configuration
- Proper bindings
- Significant light change to trigger

**v2.11.3 improvements:**
✅ Better IAS Zone enrollment
✅ Improved reporting configuration
✅ Better bindings setup
✅ Added cluster 3 (Identify) for some sensors

**Can you also provide:**
- Device manufacturer name?
- Model/Product ID?
- Screenshot of device settings → Advanced?

This helps me verify if your specific sensor needs additional fixes.

**Debugging (if still issues):**

1. Go to: https://developer.athom.com/tools/zigbee
2. Select your motion sensor
3. Check IAS Zone cluster (1280):
   - zoneState: should be "enrolled"
   - iasCIEAddress: should match Homey address
4. Check Illuminance cluster (1024):
   - Look for "measuredValue"
   - Should show current lux

Let me know after trying v2.11.3!

Best regards,
Dylan
```

---

## 🔧 CORRECTIONS POTENTIELLES v2.11.4

Si le problème persiste après v2.11.3:

### 1. Améliorer IAS Zone Enrollment

**Dans device.js:**
```javascript
// Forcer re-enrollment après pairing
async onZigbeeNodeInit({ node }) {
  // Existing code...
  
  // Force IAS Zone enrollment
  if (node.endpoints[1].clusters.iasZone) {
    try {
      await node.endpoints[1].clusters.iasZone.enrollResponse({
        enrollResponseCode: 0, // Success
        zoneId: 0
      });
      this.log('IAS Zone enrollment success');
    } catch (err) {
      this.error('IAS Zone enrollment failed:', err);
    }
  }
}
```

### 2. Améliorer Reporting Configuration

**Pour Illuminance:**
```javascript
// Configure reporting pour illuminance
await node.endpoints[1].clusters.illuminanceMeasurement
  .configureReporting({
    measuredValue: {
      minInterval: 60,        // Min 1 minute
      maxInterval: 3600,      // Max 1 hour
      minChange: 100          // Min change 100 lux
    }
  });
```

### 3. Ajouter Bindings Explicites

```javascript
// Bind illuminance cluster
await node.endpoints[1].clusters.illuminanceMeasurement
  .bind();
```

---

## 📊 DIAGNOSTIC CHECKLIST

Pour Naresh, vérifier:

- [ ] Device model/manufacturer
- [ ] IAS Zone enrollment status
- [ ] Illuminance cluster binding
- [ ] Reporting configuration intervals
- [ ] Physical test motion (wait 5 min, move)
- [ ] Physical test lux (lights ON/OFF)
- [ ] Logs Zigbee errors
- [ ] Re-pairing après v2.11.3

---

## 🎯 ACTIONS PRIORITAIRES

### Court terme
1. Réponse forum à Naresh
2. Demander manufacturer/model
3. Demander test après v2.11.3

### Si problème persiste (v2.11.4)
1. Ajouter force IAS enrollment
2. Améliorer reporting config
3. Ajouter bindings explicites
4. Logger enrollment status

---

## 💡 NOTES IMPORTANTES

### IAS Zone Behavior
- Enrollment peut échouer silencieusement
- Certains sensors nécessitent 2-3 pairings
- CIE address doit matcher Homey
- Zone ID 0 standard

### Illuminance Reporting
- Beaucoup de sensors ont minChange élevé
- Certains reportent seulement grandes variations
- Intervals typiques: 1-60 minutes
- Binding requis pour reports

### Motion Timeout
- La plupart ont timeout 3-5 minutes
- Pendant timeout: pas de nouveaux reports
- Normal comportement pour économie batterie

---

**Status:** ✅ **RÉPONSE PRÊTE** - Attente feedback Naresh après v2.11.3
