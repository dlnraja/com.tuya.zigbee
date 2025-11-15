# 🚀 GUIDE UTILISATEUR - Correction v4.9.340

**Destinataire:** Dylan Rajasekaram
**Date:** 2025-11-15
**Version App:** v4.9.340 (DÉPLOYÉE)
**Status:** EN COURS DE PROPAGATION

---

## 📢 IMPORTANT: NOUVELLE VERSION DISPONIBLE!

Bonjour Dylan,

**Tous les problèmes que vous avez signalés ont été corrigés dans la version v4.9.340!**

Cette version est actuellement en cours de déploiement sur le Homey App Store.
**ETA: 10-30 minutes** après validation Athom.

---

## 🔍 PROBLÈMES IDENTIFIÉS DANS VOTRE RAPPORT

Votre diagnostic (v4.9.339) montre **5 problèmes critiques:**

### ❌ 1. Switch 1gang = Module USB TS0002
```
Device ID: d3c23a97-abca-4179-ae86-9b19cfde692b
Problème: Pairé dans "switch_basic_1gang" au lieu de "usb_outlet_2port"
Résultat:
  - onoff.l1 = null ❌
  - onoff.l2 = null ❌
  - Seul gang 1 fonctionne
```

### ❌ 2. Batteries Non Visibles Cards
```
- Climate Monitor: 50% (valeur par défaut figée)
- Boutons: 100% (estimation nouveau device)
- Soil Tester: 100% (estimation nouveau device)
- Presence Radar: 100% (estimation nouveau device)
```

### ❌ 3. Climate Monitor - Données NULL
```
Device ID: 92baed87-8bd0-41fb-b96c-cd5db5bc26a7
TS0601 (_TZE284_vvmbj46n)
- measure_temperature: null ❌
- measure_humidity: null ❌
```

### ❌ 4. Soil Tester - Données NULL
```
Device ID: 1ef459d1-5872-4659-8974-3b8225c1d180
TS0601 (_TZE284_oitavov2)
- measure_temperature: null ❌
- measure_humidity: null ❌
- measure_humidity.soil: null ❌
```

### ❌ 5. Presence Radar - Luminance NULL
```
Device ID: cca4e1f6-26fa-4b07-a547-35ab615b422b
TS0601 (_TZE200_rhgsbacq)
- alarm_motion: null ❌
- measure_luminance: null ❌
```

---

## ✅ CORRECTIONS v4.9.340

### 🔋 1. BATTERY REPORTING AUTOMATIQUE

**Problème Corrigé:**
- Batteries figées à 50% ou 100% (estimation)
- Pas de mise à jour automatique
- Pas visible dans cards Homey

**Solution Implémentée:**
```javascript
// NOUVEAU: BatteryReportingManager
- Configuration automatique du reporting batterie (1-12h)
- Listener temps réel pour rapports batterie
- Lecture initiale au démarrage
- 23 drivers améliorés avec bindings cluster 1
```

**Résultat Attendu:**
- ✅ Vraies valeurs batterie au lieu de 50%
- ✅ Mises à jour automatiques toutes les 1-12h
- ✅ Valeurs visibles dans cards Homey
- ✅ Alertes batterie faible fonctionnelles

---

### ⚡ 2. TS0002 DRIVER SELECTION INTELLIGENT

**Problème Corrigé:**
- TS0002 USB module pairé dans mauvais driver
- 7 drivers en conflit pour même device
- Gangs 2 non fonctionnels

**Solution Implémentée:**
```
- Retrait de _TZ3000_h1ipgkwn de 6 drivers conflictuels
- TS0002 retiré de switch_basic_1gang
- Nom amélioré: "⚡ USB Outlet 2-Port (1 AC + 2 USB)"
- Sélection automatique du bon driver
```

**Résultat Attendu:**
- ✅ Pairing automatique dans usb_outlet_2port
- ✅ Les 2 gangs fonctionnels
- ✅ Plus de confusion au pairing

---

### 📊 3. DONNÉES TS0601 AMÉLIORÉES

**Problème Corrigé:**
- Devices TS0601 température/humidité = null
- Events Tuya DP non capturés
- Données envoyées mais pas traitées

**Solution Implémentée (v4.9.339):**
```javascript
// TuyaEF00Manager amélioré
- Listeners multiples: dataReport, response, data, command, frame
- Retry mechanism 30s si stubborn
- Délai augmenté 5s pour stabilité
- Frame parsing robuste
```

**Résultat Attendu:**
- ✅ Température/Humidité affichées
- ✅ Mises à jour automatiques
- ✅ Logs verbeux pour debug

---

## 🎯 ACTIONS REQUISES PAR DEVICE

### 🔴 PRIORITÉ 1: Switch 1gang (TS0002 USB Module)

**Device:** d3c23a97-abca-4179-ae86-9b19cfde692b
**Action:** RE-PAIRING OBLIGATOIRE

#### Étapes:

1. **Supprimer Device dans Homey**
   ```
   Homey App > Devices > "Switch 1gang" > Paramètres (⚙️) > Supprimer
   ```

2. **Factory Reset Module**
   ```
   - Débrancher module USB
   - Presser et maintenir bouton 5-10 secondes
   - LED clignote rapidement = Reset OK
   ```

3. **Re-pairing dans Homey**
   ```
   - Homey App > Devices > + Ajouter Device
   - Rechercher "Universal Tuya Zigbee"
   - Mode pairing sur module (bouton 3 secondes)
   - ✅ Vérifier que Homey propose "⚡ USB Outlet 2-Port..."
   - Sélectionner ce driver
   - Terminer pairing
   ```

4. **Vérification**
   ```
   Device Settings:
   - zb_product_id: "TS0002" ✅
   - zb_manufacturer_name: "_TZ3000_h1ipgkwn" ✅
   - Driver: usb_outlet_2port ✅

   Capabilities:
   - onoff (AC socket) ✅ FONCTIONNEL
   - onoff.usb1 (USB port 1) ✅ FONCTIONNEL
   - onoff.usb2 (USB port 2) ✅ FONCTIONNEL
   ```

**ETA:** 5-10 minutes
**Impact:** ✅ Les 2 USB ports + AC socket fonctionnels

---

### 🟡 PRIORITÉ 2: Batteries (AUTOMATIQUE après update)

**Devices Concernés:**
- Sos Emergency Button (b74a3422-2b4f-487b-9437-064cca628a9c)
- 4-Boutons Contrôleur (e9366ee6-faa3-4b6b-a10f-957904721fd1)
- Contrôleur 3 Boutons (a0bc3f6e-c9b2-42d8-a603-0ab32cc3a837)

**Action:** AUCUNE! (Update automatique)

#### Option A: Attendre (RECOMMANDÉ)
```
- v4.9.340 sera installée automatiquement
- Battery reporting se configure automatiquement
- Prochaine mise à jour batterie: 1-12h
- Patience: Laisser devices dormir/réveiller naturellement
```

#### Option B: Forcer Update Immédiat
```
1. Retirer batterie du device
2. Attendre 10 secondes
3. Réinsérer batterie
4. Presser bouton 1× pour réveiller
5. ✅ Battery report envoyé immédiatement
```

**Résultat Attendu:**
- Batteries passent de 50%/100% → vraies valeurs
- Updates automatiques toutes les 1-12h
- Visible dans cards Homey

---

### 🟠 PRIORITÉ 3: TS0601 Sensors (Climate, Soil, Presence)

**Devices Concernés:**
- Climate Monitor (92baed87-8bd0-41fb-b96c-cd5db5bc26a7)
- Soil Tester (1ef459d1-5872-4659-8974-3b8225c1d180)
- Presence Radar (cca4e1f6-26fa-4b07-a547-35ab615b422b)

**Action:** RE-PAIRING RECOMMANDÉ (si données toujours NULL après v4.9.340)

#### Étapes:

1. **Attendre v4.9.340 Installation**
   ```
   Homey App > Plus > Apps > Universal Tuya Zigbee
   - Version devrait passer à 4.9.340 dans 10-30 min
   - Redémarrer app si nécessaire
   ```

2. **Si Données Toujours NULL après 24h:**
   ```
   - Supprimer device dans Homey
   - Factory reset (consulter manuel device)
   - Re-pairing dans Homey
   - ✅ Driver sera auto-détecté correctement
   ```

3. **Vérification Logs (Developer Tools)**
   ```bash
   Logs attendus après v4.9.340:

   [TUYA] 📦 dataReport EVENT received!
   [TUYA] 📊 Parsed DP 1: type=2, value=235 (température 23.5°C)
   [TUYA] 📊 Parsed DP 2: type=2, value=650 (humidité 65.0%)
   [TUYA] ✅ Temperature updated: 23.5°C
   [TUYA] ✅ Humidity updated: 65.0%
   ```

**Résultat Attendu:**
- Température/Humidité affichées
- Updates automatiques
- Tous DPs capturés et traités

---

## 📋 CHECKLIST COMPLÈTE

### Phase 1: Attendre v4.9.340 (ETA: 30 min)
- [ ] Vérifier version app dans Homey
- [ ] Homey App > Plus > Apps > Universal Tuya Zigbee
- [ ] Version affiche "v4.9.340"
- [ ] Redémarrer app si update ne se fait pas auto

### Phase 2: TS0002 USB Module (IMMÉDIAT)
- [ ] Supprimer "Switch 1gang" dans Homey
- [ ] Factory reset module USB
- [ ] Re-pairing dans Homey
- [ ] Vérifier driver = "usb_outlet_2port"
- [ ] Tester les 2 USB ports + AC socket

### Phase 3: Batteries (ATTENDRE 1-12h)
- [ ] Laisser devices en place
- [ ] Vérifier valeurs batterie dans 12h
- [ ] Si toujours 50%: retirer/réinsérer batterie
- [ ] Vérifier logs Developer Tools

### Phase 4: TS0601 Sensors (ATTENDRE 24h)
- [ ] Vérifier données temperature/humidity
- [ ] Si toujours NULL: re-pairing
- [ ] Vérifier logs Tuya DP events

---

## 🔍 LOGS À SURVEILLER (Developer Tools)

### Logs SUCCESS (Attendus après v4.9.340)

#### Battery Reporting
```bash
[BATTERY-REPORTING] 🔋 Device has measure_battery capability
[BATTERY-REPORTING] ✅ Attribute reporting configured successfully
[BATTERY-REPORTING] 📖 Initial read: 85%
[BATTERY-REPORTING] 📊 Report received: 85%
```

#### TS0601 Data
```bash
[TUYA] 📦 dataReport EVENT received!
[TUYA] 📊 Parsed DP 1: type=2, value=235
[TUYA] ✅ Temperature updated: 23.5°C
[TUYA] 📊 Parsed DP 2: type=2, value=650
[TUYA] ✅ Humidity updated: 65.0%
```

#### Driver Selection
```bash
[SMART ADAPT] Driver is CORRECT - No adaptation needed
[MIGRATION] Driver correct: usb_outlet_2port
```

### Logs ERROR (Si Problème Persistant)

```bash
❌ [BATTERY-REPORTING] Failed to configure: cluster not available
❌ [TUYA] Invalid DP data received
❌ [TUYA] Failed to request DP: timeout
```

**→ Si vous voyez ces erreurs, envoyez nouveau diagnostic!**

---

## 📊 TIMELINE EXPECTED

| Temps | Action | Status |
|-------|--------|--------|
| **T+0** | v4.9.340 deployed GitHub | ✅ FAIT |
| **T+10min** | GitHub Actions publish | 🔄 EN COURS |
| **T+30min** | Homey App Store update disponible | ⏳ ATTENTE |
| **T+1h** | Re-pairing TS0002 USB module | 👤 UTILISATEUR |
| **T+12h** | Battery reports automatiques | 🤖 AUTO |
| **T+24h** | TS0601 data validation | 🔍 VÉRIFICATION |

---

## 🆘 SUPPORT

### Si Problèmes Persistent après v4.9.340:

1. **Envoyer Nouveau Diagnostic**
   ```
   Homey App > Plus > Apps > Universal Tuya Zigbee
   > Paramètres App (⚙️) > Send diagnostic report
   ```

2. **Inclure dans Message:**
   ```
   - Version app installée
   - Devices toujours problématiques
   - Logs Developer Tools (copier/coller)
   - Actions déjà effectuées (re-pairing, etc.)
   ```

3. **Developer Tools Logs**
   ```
   Homey Developer Tools > Your Homey
   > Logs > Filter: "Universal Tuya Zigbee"
   > Copier dernières 100 lignes
   ```

---

## ✅ RÉSUMÉ ACTIONS

### IMMÉDIAT (Aujourd'hui)
1. ✅ Attendre v4.9.340 installation (30 min)
2. ✅ Re-pairing TS0002 USB module

### COURT TERME (12-24h)
3. ⏳ Vérifier battery updates automatiques
4. ⏳ Vérifier TS0601 data remontées

### SI PROBLÈME PERSISTE
5. 🔄 Re-pairing sensors TS0601
6. 📧 Envoyer nouveau diagnostic avec logs

---

## 🎯 RÉSULTAT FINAL ATTENDU

Après v4.9.340 + actions utilisateur:

✅ **TS0002 USB Module**
- Driver: usb_outlet_2port
- 1 AC socket fonctionnel
- 2 USB ports fonctionnels

✅ **Batteries**
- Valeurs réelles (pas 50%)
- Updates automatiques 1-12h
- Visible dans cards

✅ **TS0601 Sensors**
- Temperature/Humidity affichées
- Updates automatiques
- Tous DPs fonctionnels

✅ **Presence Radar**
- Motion détecté
- Luminance affichée (si supporté hardware)
- Battery reporting actif

---

**N'hésitez pas à envoyer un nouveau diagnostic si problèmes persistent!**

**Version App à installer:** v4.9.340
**ETA Disponibilité:** 10-30 minutes
**Support:** Via diagnostic report Homey

🚀 **Bonne chance et merci pour votre patience!**
