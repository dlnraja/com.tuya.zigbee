# 🛠️ Scripts de Nettoyage & Validation

**Date**: 2025-10-05T22:35:30+02:00

---

## 🔁 Correctifs Ciblés

- **tools/fixers/FIX_BATTERY_OFFICIAL.js** : ajuste `energy.batteries` et capacités liées aux capteurs sur pile.
- **tools/fixers/FIX_ENERGY_OFFICIAL_RULES.js** : applique les règles SDK3 d'énergie sur tous les drivers.
- **tools/fixers/REMOVE_UNDEFINED_ENERGY.js** : supprime les champs `energy` invalides après enrichissement.

Ces scripts sont regroupés dans le dossier `tools/fixers/` et peuvent être lancés individuellement via `node tools/fixers/<script>.js` pour des corrections ciblées.
## 🎯 Script Principal (Recommandé)

### **node tools/clean_and_validate.js**

**Utilisation**:
```bash
node tools/clean_and_validate.js
```

**Actions automatiques**:
1. ✅ Suppression fichiers problématiques (`.placeholder`, `*-spec.json`, `*.svg`)
2. ✅ Suppression caches (`.homeybuild`, `.homeycompose`)
3. ✅ Validation JSON (165 fichiers)
4. ✅ Vérification assets (506 PNG)
5. ✅ Build Homey (`homey app build`)
6. ✅ Validation publish (`homey app validate --level publish`)

**Avantages**:
- 🚀 Tout-en-un
- ✅ 100% Node.js
- 📊 Rapport complet
- ⚡ Rapide (~10 secondes)


## 📋 Scripts Alternatifs

### 1. **./tools/scripts/clean_cache.bat** (Windows simple)
```cmd
./tools/scripts/clean_cache.bat
```
- ✅ Suppression cache uniquement
- ✅ Rapide (3 secondes)
- ✅ Windows natif

### 2. **./tools/scripts/CLEANUP_PERMANENT.ps1** (PowerShell complet)
```powershell
./tools/scripts/CLEANUP_PERMANENT.ps1
```
- ✅ Nettoyage complet
- ✅ Build + validation
- ⚠️ Plus lent (~20 secondes)

{{ ... }}

## 🔧 Scripts de Validation

### Validation JSON seule
```bash
node tools/validate_all_json.js
```

### Vérification Assets seule
```bash
node tools/verify_driver_assets_v38.js
```

### Validation SDK3 seule
```bash
homey app validate --level publish
```

---

## 🚀 Workflow Complet

### Développement
```bash
# 1. Nettoyer + Valider (tout-en-un)
node tools/clean_and_validate.js

# 2. Si OK, commit
git add -A
git commit -m "Update: Description"
git push origin master
```

### Publication
```bash
# 1. Valider
node tools/clean_and_validate.js

# 2. Publier
homey login
homey app publish
```

---

## 📊 Comparaison Scripts

| Script | Durée | Actions | Validation | Recommandé |
|--------|-------|---------|------------|------------|
| **clean_and_validate.js** | ~10s | 6 | ✅ Complète | ✅ **OUI** |
| clean_cache.bat | ~3s | 1 | ❌ Non | Pour debug |
| CLEANUP_PERMANENT.ps1 | ~20s | 6 | ✅ Complète | Alternative |

---

## ⚠️ Problèmes Connus & Solutions

### Erreur: ENOTEMPTY
**Cause**: Cache `.homeybuild` bloqué

**Solution**:
```bash
# Méthode 1 (recommandée)
node tools/clean_and_validate.js

# Méthode 2 (Windows)
.\clean_cache.bat

# Méthode 3 (manuelle)
taskkill /F /IM node.exe
rmdir /s /q .homeybuild
```

### Erreur: .placeholder
**Cause**: Fichiers de génération résiduels

**Solution**: Automatiquement géré par `clean_and_validate.js`

---

## ✅ Validation Finale

**Après exécution réussie**:
```
✅ JSON: 165 fichiers, 0 erreurs
✅ Build: Successful
✅ Validation: publish-level PASSED
✅ Version: 2.1.23
✅ Drivers: 162
✅ Assets: 506 PNG
```

**Prêt pour**: `homey app publish`

---

## 🔗 Liens Utiles

- **Homey CLI Docs**: https://apps.developer.homey.app/the-homey-app/cli
- **GitHub Repo**: https://github.com/dlnraja/com.tuya.zigbee
- **GitHub Actions**: https://github.com/dlnraja/com.tuya.zigbee/actions

---

**Script principal**: `node tools/clean_and_validate.js` ✅
