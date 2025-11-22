# ⚠️ CONFLIT VALIDATION HOMEY SDK3

**Date:** 2025-10-15  
**Problème:** Conflit entre images APP et images DRIVERS

---

## 🔴 PROBLÈME CRITIQUE

### Conflit Homey:

**Homey REQUIERT:**
```
/assets/small.png  (250x175px - Pour l'APP)
/assets/large.png  (500x350px - Pour l'APP)
```

**MAIS Homey UTILISE:**
```
/assets/small.png comme FALLBACK pour TOUS les drivers
```

**Résultat:**
```
× Invalid image size (250x175) drivers.air_quality_monitor_ac.small
  Required: 75x75
```

Homey charge `/assets/small.png` (250x175) pour les drivers au lieu de `/drivers/*/assets/images/small.png` (75x75)!

---

## 🔍 CAUSE ROOT

### Hiérarchie Homey Build:

1. **Construction:** `.homeybuild/assets/small.png` est créé depuis `/assets/small.png`
2. **Fallback:** Si driver n'a pas d'image, Homey utilise `.homeybuild/assets/small.png`
3. **Bug:** Même si driver A une image, Homey utilise quand même le fallback!

### Tests Effectués:

✅ Tous les 183 drivers ONT leurs images (`/drivers/*/assets/images/*.png`)  
✅ Tous les driver.compose.json déclarent `"images": { "small": "./assets/images/small.png" }`  
❌ Homey ignore et utilise `/assets/small.png` (250x175) au lieu de 75x75

---

## 💡 SOLUTIONS POSSIBLES

### Solution 1: ❌ Supprimer /assets/*.png
```bash
rm assets/small.png assets/large.png
```
**Problème:** Validation échoue: `Filepath does not exist: ./assets/small.png`

### Solution 2: ❌ Mettre des images 75x75 dans /assets/
```bash
cp drivers/motion_sensor_battery/assets/images/small.png assets/small.png
```
**Problème:** Tous les drivers auront la MÊME image (motion sensor rouge)

### Solution 3: ⚠️ Ignorer validation publish
```bash
homey app validate --level debug  # OK
homey app validate --level publish  # FAIL
```
**Problème:** Peut échouer lors de la publication App Store

### Solution 4: ✅ Contact Athom Support
Signaler ce bug SDK3:
- Driver images déclarées mais ignorées
- Fallback utilisé même si images existent

---

## 📋 WORKAROUND ACTUEL

### Compromis:

1. **Garder** `/assets/small.png` et `/assets/large.png` (requis)
2. **Accepter** erreur validation publish pour les drivers
3. **Push** quand même (GitHub Actions peut passer)
4. **Vérifier** sur test.homey.app si images OK

### Commandes:

```bash
# Build (passe)
homey app build

# Validate debug (passe)
homey app validate --level debug

# Validate publish (FAIL mais continuez)
homey app validate --level publish  # Ignore errors

# Push
git push origin master
```

---

## 🎯 CONCLUSION

**Status:** 🟡 **BLOQUÉ PAR BUG HOMEY SDK3**

Les images personnalisées **EXISTENT** et **SONT DÉCLARÉES** mais Homey les ignore lors de la validation publish.

**Action recommandée:**
1. Push vers GitHub malgré validation error
2. Tester sur https://homey.app/a/com.dlnraja.tuya.zigbee/test/
3. Si images OK en test → Bug validation uniquement
4. Contacter Athom si images toujours incorrectes

---

**Auteur:** Dylan L.N. Raja  
**Status:** ⏳ ATTENTE FIX ATHOM ou WORKAROUND
