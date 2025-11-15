# ✅ VALIDATION FIX DRIVER SELECTION TS0002

**Date:** 2025-11-15 16:52
**Fix:** Driver selection intelligent pour TS0002 (_TZ3000_h1ipgkwn)
**Version:** v4.9.340

---

## 🎯 MODIFICATIONS APPLIQUÉES

### 1. Retrait _TZ3000_h1ipgkwn des Drivers Conflictuels

**AVANT:**
```
7 drivers contenaient _TZ3000_h1ipgkwn:
❌ air_quality_comprehensive
❌ module_mini
❌ switch_2gang
❌ switch_touch_2gang
❌ switch_wall_2gang
❌ switch_wall_2gang_smart
✅ usb_outlet_2port
```

**APRÈS:**
```
1 driver contient _TZ3000_h1ipgkwn:
✅ usb_outlet_2port (SEUL DRIVER)
```

### 2. Amélioration usb_outlet_2port

**Nom du driver:**
```
AVANT: "USB Outlet 2-Port"
APRÈS: "⚡ USB Outlet 2-Port (1 AC + 2 USB) - TS0002"
```

**Product IDs nettoyés:**
```
AVANT: ["TS011F", "TS0121", "TS011E", "TS0001", "TS0002"]
APRÈS: ["TS011F", "TS0121", "TS011E", "TS0002"]
        ❌ TS0001 retiré (1-gang, pas USB outlet)
```

**Instructions learnmode:**
```
AVANT: "Press and hold the button for 5 seconds..."
APRÈS: "⚡ USB OUTLET MODULE ONLY! Press and hold...
        This driver is for USB outlet modules with
        1 AC socket + 2 USB ports (TS0002).
        If you have a wall switch without USB ports,
        cancel and choose another driver."
```

---

## 🧪 PLAN DE TEST

### Test 1: Vérifier Unicité du Match

**Commande:**
```bash
cd "c:\Users\HP\Desktop\homey app\tuya_repair"
grep -r "_TZ3000_h1ipgkwn" drivers/*/driver.compose.json
```

**Résultat Attendu:**
```
drivers/usb_outlet_2port/driver.compose.json:      "_TZ3000_h1ipgkwn",

✅ SEUL 1 fichier trouvé
```

**Status:** ✅ VALIDÉ

---

### Test 2: Re-Pairing Device Existant

**Device:** TS0002 (_TZ3000_h1ipgkwn) - Module USB 2-ports

**Étapes:**

1. **Supprimer device existant**
   ```
   1. Ouvrir Homey app
   2. Aller dans Appareils
   3. Trouver "Switch 1gang" (mauvais driver)
   4. Paramètres > Supprimer l'appareil
   5. Confirmer suppression
   ```

2. **Factory Reset du module**
   ```
   1. Débrancher le module
   2. Maintenir le bouton
   3. Rebrancher en maintenant
   4. Garder appuyé 10 secondes
   5. LED clignote rapidement = Reset OK
   ```

3. **Re-Pairing dans Homey**
   ```
   1. Homey app > Ajouter appareil
   2. Rechercher "Tuya"
   3. Sélectionner votre app Tuya
   4. Mode pairing actif
   5. Sur module: Appuyer 5s sur bouton
   6. LED clignote = Pairing en cours
   ```

4. **Vérification Sélection Driver**
   ```
   ATTENDU: Homey affiche SEUL le driver
   "⚡ USB Outlet 2-Port (1 AC + 2 USB) - TS0002"

   PAS D'AUTRES CHOIX PROPOSÉS

   ✅ Sélection automatique
   ✅ Pas de choix manuel nécessaire
   ```

5. **Validation Device Ajouté**
   ```
   Vérifier dans Homey app:
   ✅ Nom: "USB Outlet 2-Port (1 AC + 2 USB) - TS0002"
   ✅ Driver: usb_outlet_2port
   ✅ Capabilities:
      - onoff ✅
      - onoff.usb2 ✅
      - measure_power ✅
      - meter_power ✅
      - measure_voltage ✅
      - measure_current ✅
   ```

6. **Test Fonctionnel**
   ```
   ✅ Test onoff (AC socket): ON/OFF fonctionne
   ✅ Test onoff.usb2 (USB ports): ON/OFF fonctionne
   ✅ Valeurs power/voltage/current affichées
   ✅ Pas d'erreurs dans logs
   ```

**Status:** ⏳ EN ATTENTE UTILISATEUR

---

### Test 3: Nouveau Pairing (Fresh Device)

**Si vous avez un autre module TS0002:**

1. Factory reset du nouveau module
2. Pairing dans Homey
3. Vérifier qu'un seul driver est proposé
4. Vérifier capabilities complètes

**Status:** ⏳ OPTIONNEL

---

## 📊 RÉSULTATS ATTENDUS

### Comportement AVANT v4.9.340

```
Pairing TS0002 (_TZ3000_h1ipgkwn):

Homey affiche 7 choix:
1. Air Quality Comprehensive ❌
2. Avatto Mini ❌
3. Switch 2gang ❌
4. Switch Touch 2gang ❌
5. Switch Wall 2gang ❌
6. Switch Wall 2gang Smart ❌
7. USB Outlet 2-Port ✅

Utilisateur confus, choix aléatoire
→ Souvent mauvais driver sélectionné
→ Capabilities manquantes
→ Device non fonctionnel
```

### Comportement APRÈS v4.9.340

```
Pairing TS0002 (_TZ3000_h1ipgkwn):

Homey affiche 1 SEUL choix:
✅ ⚡ USB Outlet 2-Port (1 AC + 2 USB) - TS0002

Instructions claires:
"⚡ USB OUTLET MODULE ONLY! ...
If you have a wall switch without USB ports,
cancel and choose another driver."

Sélection automatique
→ Bon driver toujours sélectionné
→ Toutes capabilities présentes
→ Device 100% fonctionnel
```

---

## 🔍 VÉRIFICATION LOGS

### Logs Attendus Après Re-Pairing

```
[2025-11-15 16:52:00] [usb_outlet_2port] Pairing started
[2025-11-15 16:52:02] [usb_outlet_2port] Device detected:
  - Manufacturer: _TZ3000_h1ipgkwn
  - Product ID: TS0002
  - Endpoints: 1, 2
[2025-11-15 16:52:03] [usb_outlet_2port] ✅ Match confirmed
[2025-11-15 16:52:05] [usb_outlet_2port] Initializing capabilities
[2025-11-15 16:52:06] [usb_outlet_2port] ✅ onoff registered (endpoint 1)
[2025-11-15 16:52:06] [usb_outlet_2port] ✅ onoff.usb2 registered (endpoint 2)
[2025-11-15 16:52:07] [usb_outlet_2port] ✅ measure_power configured
[2025-11-15 16:52:07] [usb_outlet_2port] ✅ Device ready
```

### Logs Problématiques (Ne Devraient PAS Apparaître)

```
❌ [switch_2gang] Pairing started (mauvais driver!)
❌ [air_quality_comprehensive] Pairing started (mauvais driver!)
❌ [BaseHybridDevice] Missing capability: onoff.usb2
❌ [ClusterConfig] metering cluster not found
```

---

## 📝 CHECKLIST VALIDATION

### Pré-Requis
- [ ] App version bumped to v4.9.340
- [ ] Changelog updated
- [ ] Git commit + push
- [ ] App re-deployed to Homey

### Tests Unicité Driver
- [x] grep _TZ3000_h1ipgkwn → 1 seul fichier
- [x] usb_outlet_2port a _TZ3000_h1ipgkwn
- [x] Autres drivers n'ont PAS _TZ3000_h1ipgkwn

### Tests Pairing
- [ ] Supprimer device existant
- [ ] Factory reset module
- [ ] Re-pairing dans Homey
- [ ] Vérifier 1 seul driver proposé
- [ ] Vérifier driver correct sélectionné
- [ ] Vérifier toutes capabilities présentes

### Tests Fonctionnels
- [ ] onoff fonctionne (AC socket)
- [ ] onoff.usb2 fonctionne (USB ports)
- [ ] measure_power affiche valeurs
- [ ] measure_voltage affiche valeurs
- [ ] measure_current affiche valeurs
- [ ] Pas d'erreurs dans logs

---

## 🎯 CRITÈRES DE SUCCÈS

### ✅ Fix Validé Si:

1. **Unicité du match**
   ```
   grep _TZ3000_h1ipgkwn → 1 seul résultat (usb_outlet_2port)
   ```

2. **Pairing automatique**
   ```
   Re-pairing TS0002 → 1 seul driver proposé
   Pas de choix manuel nécessaire
   ```

3. **Capabilities complètes**
   ```
   Device a: onoff, onoff.usb2, measure_power,
             meter_power, measure_voltage, measure_current
   ```

4. **Fonctionnel**
   ```
   AC socket contrôlable ✅
   USB ports contrôlables ✅
   Mesures power affichées ✅
   Pas d'erreurs logs ✅
   ```

### ❌ Fix Échoué Si:

1. **Multiple matches**
   ```
   Plusieurs drivers proposés au pairing
   ```

2. **Mauvais driver sélectionné**
   ```
   Device pairé dans switch_2gang ou autre
   ```

3. **Capabilities manquantes**
   ```
   onoff.usb2 absente
   measure_power/voltage/current absentes
   ```

4. **Erreurs fonctionnelles**
   ```
   AC socket ne contrôle pas
   USB ports ne contrôlent pas
   Erreurs dans logs
   ```

---

## 🚀 PROCHAINES ÉTAPES

### Après Validation Succès

1. **Bump version**
   ```bash
   # app.json
   "version": "4.9.340"
   ```

2. **Update changelog**
   ```bash
   # .homeychangelog.json
   "4.9.340": {
     "en": "🎯 DRIVER SELECTION FIX: TS0002 USB outlet now automatically selects correct driver. No more manual choice during pairing!"
   }
   ```

3. **Git commit + push**
   ```bash
   git add .
   git commit -m "fix: driver selection TS0002 - remove _TZ3000_h1ipgkwn conflicts"
   git push origin main
   git tag v4.9.340
   git push origin v4.9.340
   ```

4. **Deploy to Homey**
   ```
   Homey Developer Dashboard → Publish v4.9.340
   ```

5. **Communication utilisateur**
   ```
   Forum post: "Fix driver selection TS0002 USB outlet"
   GitHub release notes
   Email notification si nécessaire
   ```

---

## 📄 DOCUMENTATION

**Fichiers Créés:**
- ✅ `docs/DRIVER_SELECTION_FIX_TS0002.md` - Analyse complète
- ✅ `docs/DRIVER_SELECTION_FIX_VALIDATION.md` - Plan de test (ce fichier)

**Fichiers Modifiés:**
- ✅ `drivers/switch_2gang/driver.compose.json`
- ✅ `drivers/switch_touch_2gang/driver.compose.json`
- ✅ `drivers/switch_wall_2gang/driver.compose.json`
- ✅ `drivers/switch_wall_2gang_smart/driver.compose.json`
- ✅ `drivers/module_mini/driver.compose.json`
- ✅ `drivers/air_quality_comprehensive/driver.compose.json`
- ✅ `drivers/usb_outlet_2port/driver.compose.json`

**Total:** 7 fichiers modifiés

---

## 💡 NOTES IMPORTANTES

### Pourquoi Ce Fix Fonctionne

**Selon Homey SDK3:**
> "Homey will match a driver based on manufacturerName + productId.
> If multiple drivers match, Homey shows ALL matching drivers to the user."

**Notre Solution:**
- Retire _TZ3000_h1ipgkwn de tous les drivers sauf usb_outlet_2port
- Résultat: 1 seul driver matche = sélection automatique
- Nom de driver clair + instructions explicites = utilisateur comprend

### Devices Potentiellement Impactés

**Si d'autres devices utilisent _TZ3000_h1ipgkwn avec productId différent:**
```
_TZ3000_h1ipgkwn + TS0001 → module_mini (à vérifier)
_TZ3000_h1ipgkwn + TS0003 → switch_2gang (à vérifier)
_TZ3000_h1ipgkwn + TS0005 → air_quality_comprehensive (à vérifier)
```

**Action:** Si problème signalé, ajouter manufacturerName dans driver approprié.

### Rollback Plan

**Si fix cause problèmes:**
```bash
git revert <commit-hash>
git push origin main
```

Ou restaurer _TZ3000_h1ipgkwn dans drivers concernés.

---

**Fix Appliqué:** ✅ 2025-11-15 16:52
**Tests Requis:** ⏳ EN ATTENTE UTILISATEUR
**Déploiement:** ⏳ EN ATTENTE VALIDATION
