# 🚀 GUIDE PUBLICATION AUTOMATIQUE + PROMOTION TEST

**Date:** 2025-10-08 22:55  
**Status:** ✅ AUTOMATISÉ

---

## 🎯 OBJECTIF

**Publication + Promotion automatiques en 1 commande:**
- ✅ Publish app vers Homey App Store
- ✅ Extraction automatique Build ID
- ✅ Promotion automatique Draft → Test
- ✅ 0 clic manuel requis!

---

## 📋 PRÉREQUIS

### 1. Token HOMEY_PAT

**Obtenir le token:**
```
https://tools.developer.homey.app/me
```

**Définir dans PowerShell:**
```powershell
$env:HOMEY_PAT = "COLLER_VOTRE_TOKEN_ICI"
```

**⚠️ IMPORTANT:** Utiliser le vrai token, pas "votre_token"!

---

## 🚀 MÉTHODE 1: SCRIPT LOCAL (Recommandé)

### Usage

```powershell
# 1. Définir token (une fois par session)
$env:HOMEY_PAT = "votre_token_homey_ici"

# 2. Exécuter script complet
.\scripts\publish_and_promote.ps1
```

### Ce que fait le script

```
1. ✅ Login Homey avec token
2. ✅ Publish app vers Homey App Store
3. ✅ Extraction automatique Build ID
4. ✅ Attente 2 secondes (build ready)
5. ✅ API Call: Promote Draft → Test
6. ✅ Vérification succès
7. ✅ Affichage liens Test
```

### Output Attendu

```
🚀 PUBLICATION AUTOMATIQUE + PROMOTION TEST
=============================================

✅ Token trouvé

📦 ÉTAPE 1: Publication de l'app...

   Login Homey...
   Publication en cours...
   
✓ Submitting com.dlnraja.tuya.zigbee@2.1.4...
✓ Created Build ID 26
✓ Uploading...

✅ Build ID extrait: 26

=============================================

🎯 ÉTAPE 2: Promotion automatique Draft → Test...

   API Call: promote build/26...

✅ Build #26 promu vers Test avec succès!

=============================================

🔗 LIENS UTILES:

   Build #26 Dashboard:
   https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/26

   Test Installation:
   https://homey.app/a/com.dlnraja.tuya.zigbee/test/

🎉 TERMINÉ!
```

---

## 🤖 MÉTHODE 2: GITHUB ACTIONS (Automatique)

### Configuration

**Secret GitHub déjà configuré:** `HOMEY_PAT`

### Déclenchement

```bash
# Push n'importe quel changement
git add .
git commit -m "feat: nouveau changement"
git push origin master

# Workflow se déclenche automatiquement
```

### Process GitHub Actions

```
1. ✅ Checkout code
2. ✅ Validate Homey App (level: publish)
3. ✅ Generate User-Friendly Changelog
4. ✅ Auto-Increment Version (patch)
5. ✅ Commit Version Bump [skip ci]
6. ✅ Setup Node.js + Homey CLI
7. ✅ Publish Homey App
8. ✅ Extract Build ID from CLI output
9. ✅ Auto-promote Draft → Test
10. ✅ Display Summary with links
```

### Vérification Workflow

**GitHub Actions:**
```
https://github.com/dlnraja/com.tuya.zigbee/actions
```

**Logs attendus:**
```
✅ Build ID extracted: 26
🚀 Promoting Build #26 from Draft to Test...
⏳ Waiting 3 seconds for build to be ready...
📡 API Call: POST /build/26/promote
HTTP Status: 200
✅ Build #26 promoted to Test successfully!
🔗 Test URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
```

---

## 🔍 TROUBLESHOOTING

### Erreur: "HOMEY_PAT not set"

**Cause:** Token non défini

**Solution:**
```powershell
$env:HOMEY_PAT = "votre_vrai_token"
```

### Erreur: "Authentication failed (401)"

**Cause:** Token invalide ou expiré

**Solution:**
1. Obtenir nouveau token: https://tools.developer.homey.app/me
2. Redéfinir `$env:HOMEY_PAT`
3. Réexécuter script

### Erreur: "Build not found (404)"

**Cause:** Build ID incorrect

**Solution:**
- Vérifier dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
- Noter le Build ID correct
- Utiliser script promote_build_XX.ps1 avec bon ID

### Erreur: "Promotion failed (405)"

**Cause:** Build déjà promu ou supprimé

**Solution:**
- Vérifier status build sur dashboard
- Si Draft → Réessayer
- Si Test → Déjà OK! ✅

### Build créé mais pas extrait

**Cause:** Pattern matching échoue

**Solution:**
- Vérifier output CLI contient "Created Build ID XX"
- Workflow amélioré gère ça automatiquement

---

## 📊 COMPARAISON MÉTHODES

### Script Local

**Avantages:**
- ✅ Contrôle total
- ✅ Feedback immédiat
- ✅ Debug facile
- ✅ Pas besoin git push

**Usage:**
- Tests locaux
- Debug
- Publication urgente

### GitHub Actions

**Avantages:**
- ✅ 100% automatique
- ✅ Version bump auto
- ✅ Changelog auto
- ✅ Historique complet

**Usage:**
- Workflow normal
- CI/CD automatique
- Collaboration équipe

---

## 🎯 WORKFLOW COMPLET

### Développement Normal

```powershell
# 1. Faire changements code
# Modifier drivers, ajouter IDs, etc.

# 2. Commit local
git add .
git commit -m "feat: add new device IDs"

# 3. Push (déclenche workflow auto)
git push origin master

# 4. Attendre 4-6 minutes
# GitHub Actions fait tout automatiquement:
# - Bump version
# - Publish
# - Promote Test

# 5. Vérifier Test URL
# https://homey.app/a/com.dlnraja.tuya.zigbee/test/
```

### Publication Urgente Locale

```powershell
# 1. Définir token
$env:HOMEY_PAT = "token"

# 2. Publish + Promote en 1 commande
.\scripts\publish_and_promote.ps1

# 3. Vérifier immédiatement
# Build promu en Test en < 1 minute
```

---

## 📋 CHECKLIST PUBLICATION

### Avant Publish
- [ ] Token HOMEY_PAT défini
- [ ] Changements testés localement
- [ ] Validation Homey réussie (`homey app validate`)
- [ ] Images correctes (328 PNG SDK3)
- [ ] README.txt présent

### Après Publish
- [ ] Build ID extrait correctement
- [ ] Promotion Test réussie
- [ ] Dashboard vérifié (status Test)
- [ ] Test URL fonctionne
- [ ] Installation possible mobile

### Test Fonctionnel
- [ ] App s'installe depuis Test
- [ ] Devices détectés
- [ ] Nouveaux IDs fonctionnent
- [ ] Aucune régression

---

## 🔗 LIENS RAPIDES

### Outils
```
Token:     https://tools.developer.homey.app/me
Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
Test URL:  https://homey.app/a/com.dlnraja.tuya.zigbee/test/
Actions:   https://github.com/dlnraja/com.tuya.zigbee/actions
```

### Scripts Disponibles
```
scripts/publish_and_promote.ps1    → Publish + Promote auto
scripts/promote_build_14.ps1       → Promote Build #14 seul
scripts/promote_all_builds.ps1     → Promote builds multiples
```

---

## 🎉 RÉSULTAT FINAL

### Workflow Automatisé 100%

**Avant (Manuel):**
```
1. homey app publish
2. Attendre upload
3. Ouvrir dashboard
4. Cliquer "Promote to Test"
5. Confirmer
⏱️ Temps: 5-10 minutes + clics manuels
```

**Après (Automatique):**
```
1. git push origin master
   OU
   .\scripts\publish_and_promote.ps1

✅ TOUT EST AUTOMATIQUE!
⏱️ Temps: 4-6 minutes, 0 clic manuel
```

---

**Document créé:** 2025-10-08 22:55  
**Type:** Guide Publication Automatique  
**Status:** ✅ OPÉRATIONNEL  
**Usage:** Script local + GitHub Actions
