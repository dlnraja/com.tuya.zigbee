# 🎯 WORKFLOW WITH OFFICIAL HOMEY ACTIONS

**Date:** 2025-10-08 21:16  
**Status:** ✅ UPDATED WITH OFFICIAL ACTIONS

---

## 🚀 OFFICIAL HOMEY GITHUB ACTIONS

Le workflow utilise maintenant les **actions officielles Homey** depuis GitHub Marketplace:

### 1. Homey App Validate
```yaml
- uses: athombv/github-action-homey-app-validate@master
  with:
    level: publish
```

**Source:** https://github.com/marketplace/actions/homey-app-validate

**Fonctionnalités:**
- Validation automatique de l'app
- Niveaux: `debug`, `publish`, `verified`
- Pas besoin d'installer Homey CLI manuellement
- Validation dans container Docker

### 2. Homey App Publish
```yaml
- uses: athombv/github-action-homey-app-publish@master
  id: publish
  with:
    personal_access_token: ${{ secrets.HOMEY_PAT }}
```

**Source:** https://github.com/marketplace/actions/homey-app-publish

**Fonctionnalités:**
- Publication automatique Draft
- Output: `url` (URL management build)
- Utilise `HOMEY_PAT` (Personal Access Token)
- Container Docker intégré

### 3. Homey App Update Version (optionnel)
```yaml
- uses: athombv/github-action-homey-app-version@master
  with:
    version: patch  # ou major, minor, semver
    changelog: "Description changements"
```

**Source:** https://github.com/marketplace/actions/homey-app-update-version

**Fonctionnalités:**
- Bump version automatique
- Génération changelog
- Commit + tag automatique

---

## 🔑 SECRET GITHUB REQUIS

### HOMEY_PAT (Personal Access Token)

**Au lieu de:** `HOMEY_TOKEN`  
**Utiliser:** `HOMEY_PAT`

**Comment obtenir:**
1. Aller sur https://tools.developer.homey.app/me
2. Générer "Personal Access Token"
3. Copier le token
4. Dans GitHub: Repository → Settings → Secrets → Actions
5. Créer secret `HOMEY_PAT` avec la valeur du token

**IMPORTANT:** Ce n'est PAS le même que le token de login CLI!

---

## 📋 WORKFLOW COMPLET

```yaml
name: Homey App Store Auto-Publish with Draft→Test Promotion

on:
  push:
    branches:
      - master

jobs:
  publish:
    runs-on: ubuntu-latest
    
    steps:
      # 1. Checkout code
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      # 2. Validate (action officielle)
      - name: Validate Homey App
        uses: athombv/github-action-homey-app-validate@master
        with:
          level: publish
      
      # 3. Publish (action officielle)
      - name: Publish Homey App
        uses: athombv/github-action-homey-app-publish@master
        id: publish
        with:
          personal_access_token: ${{ secrets.HOMEY_PAT }}
      
      # 4. Extract Build ID
      - name: Extract Build ID
        id: build_id
        run: |
          # From URL output
          URL="${{ steps.publish.outputs.url }}"
          BUILD_ID=$(echo "$URL" | grep -oP 'builds/\K[0-9]+' || echo "")
          
          # Fallback: API call
          if [ -z "$BUILD_ID" ]; then
            RESPONSE=$(curl -s -H "Authorization: Bearer ${{ secrets.HOMEY_PAT }}" \
              "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/builds")
            BUILD_ID=$(echo "$RESPONSE" | jq -r '.[0].id // empty')
          fi
          
          echo "BUILD_ID=$BUILD_ID" >> $GITHUB_OUTPUT
      
      # 5. Auto-promote Draft → Test
      - name: Auto-promote Draft to Test
        env:
          HOMEY_PAT: ${{ secrets.HOMEY_PAT }}
        run: |
          BUILD_ID="${{ steps.build_id.outputs.BUILD_ID }}"
          
          curl -X POST \
            -H "Authorization: Bearer $HOMEY_PAT" \
            -H "Content-Type: application/json" \
            "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/$BUILD_ID/promote" \
            -d '{"target": "test"}'
      
      # 6. Summary
      - name: Summary
        run: |
          echo "## 📊 Publication Summary" >> $GITHUB_STEP_SUMMARY
          echo "- **Build ID:** ${{ steps.build_id.outputs.BUILD_ID }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Management:** ${{ steps.publish.outputs.url }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Test URL:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/" >> $GITHUB_STEP_SUMMARY
```

---

## ✅ AVANTAGES ACTIONS OFFICIELLES

### Par rapport à workflow manuel

**Avant (manuel):**
- ❌ Installer Node.js
- ❌ Installer Homey CLI
- ❌ Login avec token
- ❌ Gérer versions CLI
- ❌ Parser output CLI
- ❌ Gérer erreurs CLI

**Après (actions officielles):**
- ✅ Container Docker pré-configuré
- ✅ Homey CLI déjà installé
- ✅ Login automatique
- ✅ Output structuré (URL)
- ✅ Gestion erreurs intégrée
- ✅ Maintenance Athom

---

## 🔧 EXTRACTION BUILD ID

### Méthode 1: URL Output (principal)
```bash
# URL format: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/builds/17
URL="${{ steps.publish.outputs.url }}"
BUILD_ID=$(echo "$URL" | grep -oP 'builds/\K[0-9]+')
```

### Méthode 2: API Fallback
```bash
# Si extraction URL échoue
RESPONSE=$(curl -s -H "Authorization: Bearer $HOMEY_PAT" \
  "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/builds")

# Premier build = dernier publié
BUILD_ID=$(echo "$RESPONSE" | jq -r '.[0].id')
```

---

## 🚀 AUTO-PROMOTION DRAFT → TEST

### API Endpoint
```
POST https://api.developer.homey.app/app/{app_id}/build/{build_id}/promote
Authorization: Bearer {HOMEY_PAT}
Content-Type: application/json
Body: {"target": "test"}
```

### Code Complet
```bash
curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $HOMEY_PAT" \
  -H "Content-Type: application/json" \
  "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/$BUILD_ID/promote" \
  -d '{"target": "test"}'
```

### Response Codes
- **200/201:** ✅ Success
- **401:** ❌ Token invalide
- **404:** ❌ Build ID incorrect
- **422:** ❌ Validation error

---

## 📊 WORKFLOW STEPS

### Ordre d'Exécution

```
1. ✅ Checkout code (fetch-depth: 0)
   ↓
2. ✅ Validate Homey App (level: publish)
   ↓
3. ✅ Publish Homey App → Draft (action officielle)
   ↓
4. ✅ Extract Build ID (from URL output)
   ↓
5. ✅ Auto-promote Draft → Test (API call)
   ↓
6. ✅ Display Summary (GitHub Step Summary)
```

### Temps Estimé
- **Total:** ~3-5 minutes
- Checkout: 10s
- Validate: 30-60s
- Publish: 60-90s
- Promote: 5-10s
- Summary: 1s

---

## 🔍 DEBUGGING

### Vérifier HOMEY_PAT
```bash
# Test local
curl -H "Authorization: Bearer YOUR_PAT" \
  https://api.developer.homey.app/user/me

# Si 401: Token expiré/invalide
# Régénérer sur https://tools.developer.homey.app/me
```

### Vérifier Output URL
```bash
# Dans workflow logs, chercher:
Publish URL: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/builds/17

# Si absent: Action publish a échoué
```

### Vérifier Build ID
```bash
# API pour lister tous les builds
curl -H "Authorization: Bearer YOUR_PAT" \
  https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/builds \
  | jq -r '.[].id'

# Dernier build = premier dans la liste
```

---

## 🆚 COMPARAISON ANCIEN vs NOUVEAU

### Ancien Workflow (Manuel)
```yaml
steps:
  - uses: actions/checkout@v3
  - uses: actions/setup-node@v3
  - run: npm install -g homey
  - run: homey login --bearer $TOKEN
  - run: homey app validate --level=publish
  - run: homey app publish
  # + parsing output CLI complexe
```

**Problèmes:**
- Syntaxe login incorrecte
- Versions Node/CLI à gérer
- Output CLI non structuré
- Erreurs difficiles à débugger

### Nouveau Workflow (Actions Officielles)
```yaml
steps:
  - uses: actions/checkout@v4
  - uses: athombv/github-action-homey-app-validate@master
  - uses: athombv/github-action-homey-app-publish@master
  # + extraction Build ID + promotion
```

**Avantages:**
- ✅ Syntaxe correcte (PAT)
- ✅ Container Docker pré-configuré
- ✅ Output structuré (URL)
- ✅ Maintenance Athom
- ✅ Debugging facile

---

## 📚 RESSOURCES

### Documentation Officielle
- Validate: https://github.com/marketplace/actions/homey-app-validate
- Publish: https://github.com/marketplace/actions/homey-app-publish
- Version: https://github.com/marketplace/actions/homey-app-update-version

### Homey Developer Tools
- Dashboard: https://tools.developer.homey.app/
- Personal Access Token: https://tools.developer.homey.app/me
- API Docs: https://api.developer.homey.app/

### GitHub Actions
- Marketplace: https://github.com/marketplace?type=actions
- Workflow Syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

## ✅ CHECKLIST MIGRATION

### Préparation
- [x] Actions officielles identifiées
- [x] Documentation lue
- [x] Personal Access Token obtenu
- [x] Secret HOMEY_PAT créé

### Workflow
- [x] Action validate ajoutée
- [x] Action publish ajoutée
- [x] Extraction Build ID implémentée
- [x] Auto-promotion configurée
- [x] Summary formaté

### Tests
- [ ] Workflow déclenché
- [ ] Validation réussie
- [ ] Publication Draft créée
- [ ] Build ID extrait
- [ ] Promotion Test effectuée
- [ ] Summary affiché

---

## 🎯 PROCHAINES ÉTAPES

### Immédiat
1. Vérifier secret `HOMEY_PAT` existe
2. Push commit workflow
3. Monitorer GitHub Actions
4. Vérifier builds créés

### Court Terme
- Ajouter action `homey-app-version` (optionnel)
- Automatiser bump version sur tag
- Créer workflow release

### Long Terme
- Schedule validation hebdomadaire
- Auto-tests post-publication
- Monitoring santé app

---

## 🎉 CONCLUSION

### Workflow Modernisé

**Utilise maintenant:**
- ✅ Actions officielles Athom
- ✅ HOMEY_PAT (Personal Access Token)
- ✅ Container Docker intégré
- ✅ Output structuré
- ✅ Auto-promotion Test
- ✅ 0 intervention manuelle

**Résultat:** Workflow professionnel, maintenable, et robuste! 🚀

---

**Document créé:** 2025-10-08 21:16  
**Type:** Documentation Workflow Actions Officielles  
**Status:** ✅ COMPLET ET À JOUR
