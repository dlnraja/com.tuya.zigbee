# ⚠️ ACTION REQUISE - CONFIGURER HOMEY_PAT

**URGENT:** Le workflow nécessite un nouveau secret GitHub!

---

## 🔑 SECRET À CRÉER: HOMEY_PAT

Le workflow utilise maintenant les **actions officielles Homey** qui requièrent un **Personal Access Token** différent du token de login CLI.

### ❌ Ancien Secret (ne fonctionne plus)
```
HOMEY_TOKEN → Token CLI (ne fonctionne pas avec actions officielles)
```

### ✅ Nouveau Secret (requis)
```
HOMEY_PAT → Personal Access Token (requis pour actions officielles)
```

---

## 📋 ÉTAPES À SUIVRE

### 1. Obtenir Personal Access Token

**URL:** https://tools.developer.homey.app/me

**Instructions:**
1. Ouvrir https://tools.developer.homey.app/me
2. Section "Personal Access Token"
3. Cliquer "Generate New Token" ou copier l'existant
4. **Copier le token** (format: long string alphanumerique)

**IMPORTANT:** Ce token est différent du token de login CLI!

### 2. Créer Secret GitHub

**URL:** https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

**Instructions:**
1. Aller sur le repository GitHub
2. Settings → Secrets and variables → Actions
3. Cliquer "New repository secret"
4. **Name:** `HOMEY_PAT`
5. **Secret:** Coller le token obtenu à l'étape 1
6. Cliquer "Add secret"

### 3. Vérifier Configuration

**Dans GitHub:**
- Repository → Settings → Secrets → Actions
- Vérifier que `HOMEY_PAT` existe dans la liste

**Test:**
```bash
# Si vous avez le token, tester localement:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.developer.homey.app/user/me

# Devrait retourner vos infos utilisateur (200 OK)
```

---

## 🚀 RÉSULTAT ATTENDU

### Après Configuration HOMEY_PAT

**Le workflow pourra:**
1. ✅ Valider l'app avec action officielle
2. ✅ Publier en Draft avec action officielle
3. ✅ Extraire Build ID automatiquement
4. ✅ Promouvoir Draft → Test via API
5. ✅ Afficher summary complet

### Logs Workflow Attendus
```
✅ Checkout code
✅ Validate Homey App (athombv/github-action-homey-app-validate)
✅ Publish Homey App (athombv/github-action-homey-app-publish)
✅ Extract Build ID
✅ Auto-promote Draft to Test
✅ Summary

## 📊 Publication Summary

- **Build ID:** 17
- **Management URL:** https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/builds/17
- **Test Install URL:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
```

---

## ⚠️ SI HOMEY_PAT N'EST PAS CONFIGURÉ

### Erreur Attendue
```
Error: Input required and not supplied: personal_access_token
```

### Workflow Échoue À
```
❌ Step: Publish Homey App
Error: personal_access_token is required
```

### Solution
1. Configurer `HOMEY_PAT` selon étapes ci-dessus
2. Re-trigger workflow (push nouveau commit ou re-run workflow)

---

## 🔍 DEBUGGING

### Vérifier Token Valide
```bash
# Test API avec votre token
curl -H "Authorization: Bearer YOUR_HOMEY_PAT" \
  https://api.developer.homey.app/user/me

# Success (200):
{
  "id": "...",
  "email": "...",
  "name": "..."
}

# Error (401):
{
  "error": "Unauthorized"
}
```

### Vérifier Secret GitHub
1. GitHub Repository → Settings
2. Secrets and variables → Actions
3. Chercher `HOMEY_PAT` dans la liste
4. Si absent: Créer selon étapes ci-dessus
5. Si présent mais workflow échoue: Régénérer token

### Régénérer Token Si Nécessaire
1. https://tools.developer.homey.app/me
2. "Revoke" ancien token
3. "Generate New Token"
4. Copier nouveau token
5. Mettre à jour secret `HOMEY_PAT` dans GitHub

---

## 📚 DOCUMENTATION COMPLÈTE

### Fichiers Créés
- `WORKFLOW_OFFICIAL_ACTIONS.md` → Guide complet actions officielles
- `WORKFLOW_FIX.md` → Corrections erreurs précédentes
- `ACTION_REQUISE_HOMEY_PAT.md` → Ce fichier (action requise)

### Workflow Modifié
- `.github/workflows/homey-app-store.yml` → Nouveau workflow avec actions officielles

### Actions Utilisées
- `athombv/github-action-homey-app-validate@master`
- `athombv/github-action-homey-app-publish@master`

---

## 🎯 CHECKLIST RAPIDE

### Configuration
- [ ] Obtenir Personal Access Token depuis https://tools.developer.homey.app/me
- [ ] Créer secret `HOMEY_PAT` dans GitHub (Settings → Secrets)
- [ ] Vérifier secret créé correctement

### Vérification
- [ ] Workflow déclenché après configuration
- [ ] Step "Validate Homey App" passe
- [ ] Step "Publish Homey App" passe (plus d'erreur token)
- [ ] Build ID extrait correctement
- [ ] Promotion Test effectuée
- [ ] Summary affiché

### Test
- [ ] Nouveau commit poussé
- [ ] Workflow GitHub Actions succès complet
- [ ] Build visible sur dashboard
- [ ] App installable depuis URL Test

---

## 🆘 BESOIN D'AIDE?

### Ressources
- Dashboard Homey: https://tools.developer.homey.app/
- GitHub Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Actions Homey: https://github.com/marketplace?query=homey

### Vérifications
1. ✅ Token obtenu depuis https://tools.developer.homey.app/me
2. ✅ Secret `HOMEY_PAT` créé dans GitHub
3. ✅ Workflow re-déclenché après configuration
4. ✅ Logs workflow vérifiés

---

## 🎉 APRÈS CONFIGURATION

### Workflow 100% Automatisé

**Sur chaque push master:**
1. ✅ Validation automatique (level: publish)
2. ✅ Publication Draft automatique
3. ✅ Promotion Test automatique
4. ✅ Build disponible ~3-5 minutes
5. ✅ 0 intervention manuelle!

**URL Test:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/

---

## 📊 RÉSUMÉ

### Ancien Système (Ne Fonctionne Plus)
```
HOMEY_TOKEN (login CLI) → ❌ Erreur avec actions officielles
Manual CLI commands → ❌ Syntaxe incorrecte
```

### Nouveau Système (Actions Officielles)
```
HOMEY_PAT (Personal Access Token) → ✅ Requis!
Official Athom Actions → ✅ Docker + CLI intégré
Auto-promotion API → ✅ Draft → Test automatique
```

### Action Immédiate
```
⚠️  CRÉER SECRET HOMEY_PAT MAINTENANT!
```

**Instructions:** Suivre étapes ci-dessus 👆

---

**Document créé:** 2025-10-08 21:16  
**Type:** Action Requise - Configuration  
**Priorité:** 🔴 URGENT  
**Status:** ⏳ EN ATTENTE CONFIGURATION
