# 🚨 PUBLICATION URGENTE - v4.9.274

## ❌ SITUATION CRITIQUE

**L'app crash pour tous les utilisateurs sur v4.9.273!**

```
Error: Cannot find module './TuyaManufacturerCluster'
```

**Utilisateurs affectés:** TOUS  
**Impact:** App ne démarre pas, devices inaccessibles  

---

## ✅ FIX APPLIQUÉ

**Commit:** 1c269cd2cb  
**Version:** 4.9.274  
**Fix:** Chemin import corrigé dans `lib/registerClusters.js`

```javascript
// Fix appliqué
const TuyaManufacturerCluster = require('./tuya/TuyaManufacturerCluster');
```

**Status:**
- ✅ Code corrigé
- ✅ Version bumpée (4.9.273 → 4.9.274)
- ✅ Validation PASSED
- ✅ Build SUCCESS
- ✅ Commit + Push OK

---

## 🚀 PUBLICATION MAINTENANT

### Méthode 1: Commande Interactive (RECOMMANDÉ)

Ouvrez PowerShell et exécutez:

```powershell
cd "C:\Users\HP\Desktop\homey app\tuya_repair"
homey app publish
```

**Puis répondez:**

1. **Changelog:**
   ```
   CRITICAL FIX - Correct TuyaManufacturerCluster import path. Fixes app crash on startup for all users.
   ```

2. **Publish?**
   ```
   Y
   ```

**C'est tout!** La publication prendra ~2-3 minutes.

---

### Méthode 2: Via GitHub Release (Alternative)

```bash
git tag v4.9.274
git push origin v4.9.274
```

Puis créez une release sur GitHub. Le workflow publiera automatiquement.

---

## 📋 CHECKLIST PUBLICATION

- [x] Fix appliqué
- [x] Version bumpée (4.9.274)
- [x] Validation OK
- [x] Build OK
- [x] Commit + Push
- [ ] **Publication (À FAIRE MAINTENANT)**
- [ ] Vérifier sur Homey App Store
- [ ] Confirmer résolution

---

## 🎯 CHANGELOG SUGGÉRÉ

```markdown
# v4.9.274 - CRITICAL FIX

## 🚨 Critical Fixes
- **URGENT:** Fixed app crash on startup caused by incorrect import path for TuyaManufacturerCluster
- All users should update immediately to restore app functionality

## Details
- Corrected module path in lib/registerClusters.js
- No functional changes, only import path correction
- Resolves: "Cannot find module './TuyaManufacturerCluster'" error

## Impact
- Fixes app crash affecting all v4.9.273 users
- Restores normal app operation
- No data loss or configuration changes
```

---

## ⏱️ TEMPS ESTIMÉ

- Publication: 2-3 minutes
- Propagation Homey App Store: 5-10 minutes
- Disponibilité utilisateurs: ~15 minutes

---

## 📊 VERSIONS

- **v4.9.272** ✅ Working (dernière version stable)
- **v4.9.273** ❌ BROKEN (crash au démarrage)
- **v4.9.274** ✅ FIXED (ce fix)

---

## 🚨 ACTION REQUISE

**PUBLIEZ MAINTENANT** pour restaurer le service pour tous les utilisateurs!

```powershell
homey app publish
```

**ETA:** < 5 minutes

---

**Créé:** 2025-11-04 15:42  
**Priority:** CRITICAL  
**Status:** READY TO PUBLISH  
