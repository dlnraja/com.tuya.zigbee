# 🔄 PROBLÈME CACHE IMAGES CDN HOMEY

**Date:** 2025-10-15  
**Version:** 2.15.104  
**Issue:** Images personnalisées pas visibles en mode test

---

## 🔍 DIAGNOSTIC

### Chemins Vérifiés ✅
Tous les `driver.compose.json` pointent CORRECTEMENT vers:
```json
"images": {
  "small": "./assets/images/small.png",
  "large": "./assets/images/large.png"
}
```

### Images Générées ✅
- ✅ 366 images PNG personnalisées créées
- ✅ Chaque driver a ses propres images uniques
- ✅ Couleurs par type (Motion rouge, Switch gris, etc.)
- ✅ Badges énergie (🔋 battery, ⚡ AC)

### Problème Identifié
❌ **CACHE CDN HOMEY**

Le CDN Homey (apps.homeycdn.net) sert encore les **ANCIENNES** images génériques au lieu des nouvelles images personnalisées.

---

## 🔄 SOLUTION

### Option 1: Forcer Nouveau Build (RECOMMANDÉ)
1. Incrémenter version (2.15.104 → 2.15.105)
2. Rebuild app
3. Resubmit for certification
4. CDN sera forcé à refresh

### Option 2: Attendre Cache Expiration
- Durée: 24-48h
- Pas recommandé

### Option 3: Contact Athom Support
- Demander cache invalidation manuelle
- build #176

---

## 📊 URLS ACTUELLES

**CDN Build 176:**
```
https://apps.homeycdn.net/app/com.dlnraja.tuya.zigbee/176/a82f5cb3-ed7e-416d-8ea2-c058a5a93e4b/
```

**Exemples d'images servies (anciennes):**
```
.../drivers/motion_sensor_battery/assets/small.png  ← GENERIQUE
.../drivers/smart_switch_1gang_ac/assets/small.png  ← GENERIQUE
```

**Devrait servir (nouvelles):**
```
.../drivers/motion_sensor_battery/assets/images/small.png  ← ROUGE + 🔋
.../drivers/smart_switch_1gang_ac/assets/images/small.png  ← GRIS + ⚡
```

---

## ✅ ACTION REQUISE

Rebuild et resubmit avec version 2.15.105 pour forcer CDN refresh.

```bash
# 1. Build
homey app build

# 2. Validate  
homey app validate --level publish

# 3. Git commit & push
git add -A
git commit -m "chore: Bump to v2.15.105 to force CDN cache refresh for personalized images"
git push

# 4. Wait for GitHub Actions
# 5. Images will be updated on next build
```

---

**Status:** ⏳ ATTENTE NOUVEAU BUILD
