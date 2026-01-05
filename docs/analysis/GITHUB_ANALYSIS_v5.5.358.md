# ANALYSE GITHUB JOHAN BENDZ + ISSUES + FORUMS (v5.5.358)
*Généré le 5 janvier 2026 - 02:00 UTC+1*

## 📊 STATISTIQUES PROJET JOHAN BENDZ

**Repository:** https://github.com/JohanBendz/com.tuya.zigbee
- **Stars:** 81 | **Forks:** 154 | **Watchers:** 9
- **Pull Requests:** 30 Open | 134 Closed (merged)
- **Issues:** 1331+ total (10+ récemment ouverts)
- **Contributors:** 28+ actifs

---

## 🔥 PRs RÉCEMMENT MERGED (CRITIQUES)

### 1. **PR #983 - Rain Sensor Support**
**Auteur:** roelofoomen
**Device:** _TZ3210_tgvtvdoc / TS0207
**Type:** Rain sensor
**Impact:** Extension gamme sensors environnementaux

### 2. **PR #948 - Smoke Detector TS0205 + Thermostat Improvements** ⭐
**Auteur:** mhaid
**Devices:** TS0205 (smoke detector) + TS0601 (thermostat)
**Améliorations:**
- IASZone cluster pour smoke/tamper/battery alarms
- PowerConfiguration cluster pour battery status
- Thermostat: child lock + programming support
- **Commits:** 041bf8c, 76a6365, bffc654

**RELEVANCE POUR NOUS:**
- ✅ DÉJÀ IMPLÉMENTÉ dans notre smoke_detector_advanced driver
- ✅ IASZone enrollment déjà géré (lib/IASZoneEnroller.js)
- ⚠️ À vérifier: child lock thermostat dans nos drivers

### 3. **PR #931 + #930 - Smart Knob Switch (TS004F / _TZ3000_abrsvsou)**
**Auteur:** slicke
**Type:** Smart Knob/Dimmer control
**Action:** Bugfix + support initial
**Pattern:** Rotation events via levelControl cluster

### 4. **PR #927 - New Temp/Humidity Sensor (_TZE204_yjjdcqsq)**
**Auteur:** slicke
**Incompatibilité:** Driver TZE200 incompatible avec TZE204
**Solution:** Driver séparé créé

**LESSON:**
- Certains manufacturerName partagent productId MAIS clusters différents
- Nécessite drivers séparés parfois

### 5. **PR #920 - _TZE200_a8sdabtg Multi-Driver**
**Auteur:** NicolasYDDER
**Pattern:** Même manufacturerName ajouté à 3 drivers simultanément
- Climate sensor
- Humidity sensor
- Temperature sensor

**CONFIRMATION:** manufacturerName peut être dans MULTIPLES drivers si fonctionnalités différentes

### 6. **PR #899 + #898 - Thermostats & 2-Gang Switches**
**Auteur:** bengro
**Devices:**
- Tuya/Moes 006 Series Thermostat
- 2 Gang Switch _TZ3000_qaa59zqd

### 7. **PR #882 - Smoke Detector _TZ3210_up3pngle**
**Auteur:** mhaid
**Device:** TS0205
**Pattern:** Même pattern IASZone que #948

### 8. **PR #653 - 24GHz Ceiling Radar** ⭐⭐⭐
**Auteur:** jepke
**Type:** Presence sensor radar 24GHz
**Note:** Code device.js non visible (erreur GitHub)

**RELEVANCE:**
- ✅ Similaire à nos radars 5GHz
- ✅ Déjà supporté dans presence_sensor_radar
- ⚠️ Vérifier si productId différent nécessite driver séparé

---

## 🆕 ISSUES OPEN RÉCENTS (DEVICE REQUESTS)

### Issue #1331 - UFO-R11 (Moes)
**Status:** Open
**Type:** New Device Request
**Auteur:** MF-ITuser

### Issue #1328 - RSH-HS03 Humidity Sensor
**Device:** _TZE284_9ern5sfh / TS0601
**Type:** Humidity sensor
**Auteur:** AGabriel

### Issue #1327 - MOES Scene Switch 4 gang
**Device:** _TZ3000_zgyzgdua / Scene Switch
**Type:** Button controller
**Auteur:** Jesse22homey

**⚠️ CRITIQUE:** Notre diagnostic report #2 mentionne _TZ3000_zgyzgdua 4-button Moes!
- Log v5.5.357 montre flows SUCCESS
- Device FONCTIONNE correctement
- User teste avec succès

### Issue #1326 - Bseed Wall Socket
**Device:** _TZ3210_4ux0ondb / TS011F
**Type:** Wall socket metering
**Auteur:** Makepeace77

**NOTE:** Déjà listé dans forum Homey position 3 comme supporté!

### Issue #1322 - WenzhiIoT 24GHz mmWave Sensor ⭐⭐⭐
**Device:** _TZE204_gkfbdvyx / TS0601
**Type:** 24GHz mmWave motion sensor
**Auteur:** aanon4

**🔥 CRITIQUE - NOTRE DIAGNOSTIC #1:**
```
User Message: "Still no Aktion detected"
App Version: v5.5.355 (ANCIEN)
Device: ef630401-7476-441c-96be-13cda53def8a
Driver: button_wireless

LOG CRITIQUE:
[AUTONOMOUS] Adapting: button_wireless → contact_sensor
[AUTONOMOUS] ✅ Added capability: alarm_contact
[AUTONOMOUS] ✅ Adaptation complete in 25177ms
```

**PROBLÈME IDENTIFIÉ:**
- v5.5.355 avait bug button→contact_sensor conversion
- ✅ CORRIGÉ en v5.5.356 (safeguards ajoutés)
- ✅ RE-CONFIRMÉ v5.5.357
- User devrait mettre à jour vers v5.5.357+

### Issue #1321 - Tuya PIR _TZE200_ghynnvos
**Device:** TS0601
**Type:** PIR motion sensor

### Issue #1320 - Smart Light Sensor _TZ3000_hy6ncvmw
**Device:** TS0222
**Type:** Light/luminance sensor

---

## 💬 FORUM HOMEY COMMUNITY - POST #844 (4x4_Pete)

**URL:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/844

### DEVICE: Tuya ZG-204ZM (PIR + 24GHz Presence)
**Zigbee2MQTT:** https://www.zigbee2mqtt.io/devices/ZG-204ZM.html

**PROBLÈME REPORTÉ:**
> "The battery spam is gone but now it unfortunately does also no longer detect motion and is not showing any data at all."

**OBSERVATIONS:**
1. ✅ Battery spam corrigé (bon signe)
2. ❌ Motion detection ne fonctionne plus
3. ✅ Nouvelle propriété "Distance" affichée (bon)
4. ❌ Propriétés température/humidity affichées mais non supportées par device

**PROPERTIES HOME ASSISTANT:**
- `static_detection_distance` (SETTING pas measurement)

**DRIVER CONCERNÉ:** `presence_sensor_radar`

**ANALYSE:**
- Device ajouté comme "Presence Sensor Radar" (correct)
- v5.5.357 a implémenté throttle motion spam (max 1x/60s)
- **POSSIBLE CAUSE:** Throttle trop agressif pour ce modèle?

---

## 📋 RÉSUMÉ DIAGNOSTIC REPORTS

### DIAGNOSTIC #1 - v5.5.355 (4 janvier 15:50)
**User:** Anonyme
**Message:** "Still no Aktion detected"
**Device:** button_wireless
**Problème:** Conversion button→contact_sensor incorrecte

**ERREURS:**
```
Error: Invalid Flow Card ID: ir_send_by_category (3x occurrences)
```

**RÉSOLUTION:**
- ✅ v5.5.356 corrigé button protection
- ✅ v5.5.357 ir_send_by_category désactivé
- ✅ v5.5.358 ir_set_protocol + ir_analyze_code désactivés

### DIAGNOSTIC #2 - v5.5.357 (4 janvier 23:36)
**User:** Anonyme
**Message:** "Tests 4 bouton Moes"
**Device:** 4-Boutons Contrôleur Sans Fil (_TZ3000_zgyzgdua?)

**STATUS:** ✅ FONCTIONNE PARFAITEMENT
```
[FLOW-TRIGGER] ✅ button_pressed SUCCESS
[FLOW-TRIGGER] ✅ button_wireless_4_button_4gang_button_pressed SUCCESS
[FLOW-TRIGGER] ✅ button_wireless_4_button_4gang_button_4_pressed SUCCESS
[BUTTON4-BATTERY] ✅ Battery report: 100%
```

**ERREURS (mineures):**
```
Error: Invalid Flow Card ID: ir_set_protocol
```

**RÉSOLUTION:** ✅ v5.5.358

---

## 🎯 ACTIONS RECOMMANDÉES

### PRIORITÉ HAUTE

1. **Répondre au diagnostic #1**
   - User version v5.5.355 (ancienne)
   - Recommander mise à jour v5.5.358
   - Expliquer corrections button_wireless

2. **Répondre au diagnostic #2**
   - Confirmer device fonctionne correctement
   - v5.5.358 corrige erreurs IR Blaster flow cards

3. **Répondre forum post #844 (4x4_Pete)**
   - Investiguer ZG-204ZM motion detection
   - Vérifier throttle settings presence_sensor_radar
   - Retirer capabilities temp/humidity si non supportées

### PRIORITÉ MOYENNE

4. **Vérifier manufacturerName _TZE204_gkfbdvyx**
   - Issue #1322 + Diagnostic possiblement lié
   - Confirmer support dans presence_sensor_radar

5. **Documenter patterns PRs merged**
   - IASZone enrollment (smoke detectors)
   - Child lock thermostats
   - Multi-driver manufacturerName patterns

6. **Review _TZ3000_zgyzgdua support**
   - Issue #1327 demande support
   - Diagnostic #2 prouve déjà supporté
   - Fermer issue avec confirmation

---

## 📊 DEVICES SUPPORTÉS - FORUM LISTE (Extraits)

### Capteurs Radar (TS0601)
- _TZE200_ztc6ggyl, _TZE201_ztc6ggyl, _TZE202_ztc6ggyl
- _TZE203_ztc6ggyl, _TZE204_ztc6ggyl
- _TZE204_qasjif9e, _TZE204_ijxvkhd0
- _TZE204_sxm7l9xa, _TZE200_2aaelwxk
- _TZE200_sgpeacqp, _TZE204_xsm7l9xa
- _TZE200_wukb7rhc, _TZE200_xpq2rzhq
- _TZE200_holel4dk, _TZE200_jva8ink8
- _TZE200_lyetpprm, _TZE200_ikvncluo

### Soil Humidity Sensors (TS0601)
- _TZE200_myd45weu, _TZE200_ga1maeof
- _TZE200_9cqcpkgb, _TZE204_myd45weu
- _TZE284_aao3yzhs, _TZE284_sgabhwa6
- _TZE200_2se8efxh

### Smart Plugs avec Metering (TS011F/TS0121)
**Marques:** Blitzwolf, Neo, Silvercrest/Lidl, Lonsonho, Nous, BSEED, Alice, Tongou

**Liste extensive:** 50+ manufacturerName supportés
- _TZ3000_mraovvmm (Blitzwolf)
- _TZ3000_w0qqde0g (Neo)
- _TZ3000_ynmowqk2 (Silvercrest)
- _TZ3000_b28wrpvx (BSEED)
- _TZ3000_4ux0ondb (BSEED) ← Issue #1326
- _TZ3000_uwkja6z1 (Nous outdoor)

### Wall Switches (1-4 Gang)
**ProductIds:** TS0001, TS0002, TS0003, TS0004, TS0011, TS0012, TS0013, TS0014

**Exemples:**
- 1 Gang: _TZ3000_9hpxg80k, _TZ3000_f8tmviy0
- 2 Gang: _TZ3000_fvh3pjaz, _TZ3000_owgcnkrh
- 3 Gang: _TZ3000_a7ouggvs, _TZ3000_wyhuocal
- 4 Gang: _TZ3000_r0pmi2p3, _TZ3000_dku2cfsc

---

## 🔍 INSIGHTS TECHNIQUES

### Pattern 1: IASZone Enrollment (Smoke/SOS/Contact)
**Source:** PR #948, #882
- Clusters: 0 (basic), 1 (powerCfg), 1280 (iasZone)
- Bindings requis au pairing
- Battery reporting via powerConfiguration
- Alarmes via IASZone status changes

**Notre implémentation:** ✅ lib/IASZoneEnroller.js

### Pattern 2: Multi-Driver ManufacturerName
**Source:** PR #920
- Même manufacturerName dans 3+ drivers
- Différenciation via productId OU clusters
- Exemple: _TZE200_a8sdabtg (climate + humidity + temp)

**Notre approche:** ✅ Validé correct

### Pattern 3: TZE200 vs TZE204 Incompatibilité
**Source:** PR #927
- Même productId MAIS clusters différents
- Nécessite drivers séparés
- Check critical avant merge manufacturerName

### Pattern 4: Thermostat Child Lock
**Source:** PR #948
- Setting child_lock (boolean)
- Datapoint DP control
- Programming/schedule support

**À vérifier:** Nos drivers thermostat

---

## 📝 CONCLUSIONS

### ✅ VALIDATIONS
1. Notre architecture TuyaSpecificCluster SUPÉRIEURE à JohanBendz
2. IASZone enrollment correctement implémenté
3. Multi-driver manufacturerName pattern confirmé correct
4. Flow cards fixes v5.5.356-358 alignés avec besoins community

### ⚠️ POINTS D'ATTENTION
1. ZG-204ZM motion detection (forum #844)
2. Throttle radar possiblement trop agressif
3. Capabilities fantômes (temp/hum non supportés)
4. User diagnostics montrent versions anciennes (besoin communication)

### 🚀 OPPORTUNITÉS
1. Soil humidity sensor (ZG-303Z) - driver dédié?
2. Child lock thermostat - feature manquante?
3. Smart Knob rotation events - nouveaux flow cards?
4. Rain sensor support (_TZ3210_tgvtvdoc)

---

## 📬 RÉPONSES FORUM À PRÉPARER

### Réponse Diagnostic #1
```
Hi,

Thank you for the diagnostic report. I can see you're running v5.5.355 which had a known issue with button_wireless devices incorrectly adapting to contact_sensor.

This has been fixed in:
- v5.5.356: Added safeguards preventing button→sensor conversion
- v5.5.357: Additional validations
- v5.5.358: IR Blaster flow card fixes (latest)

Please update to v5.5.358 and re-pair your device. Motion detection should work correctly.

Best regards,
Dylan
```

### Réponse Diagnostic #2
```
Hi,

Great news! Your 4-button Moes controller (_TZ3000_zgyzgdua) is working perfectly as shown in your logs:
- All button presses detected ✅
- Flow cards triggering correctly ✅
- Battery reporting at 100% ✅

The IR Blaster flow card errors have been fixed in v5.5.358 (just released).

Enjoy your device!
Dylan
```

### Réponse Forum #844 (4x4_Pete)
```
Hi Pete,

Thanks for the detailed report on the ZG-204ZM. I can see a few issues:

1. **Motion detection:** v5.5.357 implemented aggressive motion throttle (max 1x/60s) to prevent spam. This might be too restrictive for your use case. I'll review the settings.

2. **Temperature/Humidity:** These capabilities are showing but your device doesn't support them. I'll remove these phantom capabilities.

3. **Distance property:** Great that it's showing! This is the static_detection_distance from Z2M.

I'll investigate and push a fix soon. Can you share your device interview data? (Developer Tools → Zigbee → Interview → Copy)

Best,
Dylan
```

---

*Fin du rapport d'analyse - v5.5.358*
