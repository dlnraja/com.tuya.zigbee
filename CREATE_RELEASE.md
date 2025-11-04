# 🚀 CRÉER LA RELEASE GITHUB - v4.9.274

**Tag créé:** ✅ v4.9.274  
**Tag pushé:** ✅ Sur GitHub  

---

## 📦 CRÉER LA RELEASE (2 options)

### Option 1: Via GitHub Web (FACILE)

1. **Allez sur:** https://github.com/dlnraja/com.tuya.zigbee/releases/new

2. **Remplissez:**
   - **Tag:** `v4.9.274` (déjà créé)
   - **Release title:** `v4.9.274 - CRITICAL FIX`
   - **Description:**
   
   ```markdown
   # 🚨 CRITICAL FIX - v4.9.274
   
   ## Critical Fixes
   - **URGENT:** Fixed app crash on startup caused by incorrect import path for TuyaManufacturerCluster
   - All users should update immediately to restore app functionality
   
   ## Details
   - Corrected module path in `lib/registerClusters.js`
   - Changed: `require('./TuyaManufacturerCluster')` → `require('./tuya/TuyaManufacturerCluster')`
   - No functional changes, only import path correction
   
   ## Resolved Issues
   - Fixes: "Cannot find module './TuyaManufacturerCluster'" error
   - Resolves app crash affecting all v4.9.273 users
   - Restores normal app operation
   
   ## Impact
   - 🚨 Critical fix for production
   - ✅ No data loss or configuration changes
   - ✅ Immediate update recommended
   
   ## Changelog
   - fix(critical): Correct TuyaManufacturerCluster import path
   - chore: Bump version to 4.9.274
   - docs: Add publication guides
   ```

3. **Cochez:** ✅ Set as the latest release

4. **Cliquez:** **Publish release**

**Le workflow GitHub Actions publiera automatiquement!** 🎉

---

### Option 2: Via GitHub CLI (RAPIDE)

Si vous avez GitHub CLI installé:

```bash
gh release create v4.9.274 \
  --title "v4.9.274 - CRITICAL FIX" \
  --notes "🚨 CRITICAL FIX - Correct TuyaManufacturerCluster import path. Fixes app crash on startup for all users."
```

---

## ⚙️ QUE SE PASSE-T-IL ENSUITE?

1. **Workflow GitHub Actions démarre** (`.github/workflows/publish.yml`)
2. **Étapes automatiques:**
   - ✅ Checkout code
   - ✅ Setup Node.js 20
   - ✅ Install dependencies
   - ✅ Install Homey CLI
   - ✅ Validate app (--level publish)
   - ✅ Build app
   - ✅ **Publish to Homey App Store** (avec HOMEY_TOKEN)
   - ✅ Upload build artifact

3. **Résultat:**
   - 🎉 App publiée automatiquement
   - 📦 Build sauvegardé (90 jours)
   - ✅ Utilisateurs peuvent mettre à jour

---

## 📊 MONITORING

**Vérifier le workflow:**
https://github.com/dlnraja/com.tuya.zigbee/actions

**Temps estimé:** 3-5 minutes

---

## ✅ PRÉREQUIS

- [x] Tag v4.9.274 créé ✅
- [x] Tag pushé sur GitHub ✅
- [x] Workflow publish.yml configuré ✅
- [x] HOMEY_TOKEN configuré dans Secrets ⚠️ (à vérifier)
- [ ] **Release créée** ← À FAIRE MAINTENANT

---

## 🔑 VÉRIFIER HOMEY_TOKEN

Si le workflow échoue, vérifiez que `HOMEY_TOKEN` est configuré:

1. Allez sur: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
2. Vérifiez que `HOMEY_TOKEN` existe
3. Si manquant:
   - Générez un token: https://tools.developer.homey.app/tools/api
   - Ajoutez-le dans les secrets GitHub

---

**CRÉEZ LA RELEASE MAINTENANT!** 🚀

https://github.com/dlnraja/com.tuya.zigbee/releases/new
