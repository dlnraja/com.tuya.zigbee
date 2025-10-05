# 🔐 Configuration HOMEY_TOKEN — Guide Complet

**Date**: 2025-10-05T21:50:00+02:00  
**Problème**: GitHub Actions échoue à l'étape "Publish to Homey App Store"

---

## 🚨 Diagnostic

### Erreur Actuelle
```
❌ Étape échouée: "Publish to Homey App Store"
❌ Cause probable: HOMEY_TOKEN manquant ou invalide
```

### Vérification Secrets
```bash
gh secret list
# Vérifier si HOMEY_TOKEN existe
```

---

## ✅ Solution: Configurer HOMEY_TOKEN

### Méthode 1: Via Interface GitHub (Recommandé)

#### Étape 1: Obtenir le Token Localement
```bash
# Se connecter localement
homey login

# Le token est stocké dans:
# Windows: %USERPROFILE%\.homeyrc
# Linux/Mac: ~/.homeyrc
```

#### Étape 2: Lire le Token
```powershell
# Windows PowerShell
Get-Content "$env:USERPROFILE\.homeyrc" | ConvertFrom-Json | Select-Object -ExpandProperty token

# Ou manuellement ouvrir le fichier
notepad %USERPROFILE%\.homeyrc
```

**Format du fichier .homeyrc**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "..."
  }
}
```

#### Étape 3: Ajouter sur GitHub
```
1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

2. Cliquer: "New repository secret"

3. Remplir:
   Name: HOMEY_TOKEN
   Value: [copier la valeur de "token" depuis .homeyrc]

4. Cliquer: "Add secret"
```

---

### Méthode 2: Via GitHub CLI

```bash
# Lire token local
$token = (Get-Content "$env:USERPROFILE\.homeyrc" | ConvertFrom-Json).token

# Ajouter secret
gh secret set HOMEY_TOKEN --body "$token"

# Vérifier
gh secret list
```

---

## 🔍 Vérification Token Valide

### Test Local
```bash
# Vérifier que le token fonctionne
homey whoami
# Doit afficher: votre email/ID utilisateur
```

### Renouveler Token (Si Expiré)
```bash
# Se déconnecter
homey logout

# Se reconnecter
homey login

# Récupérer nouveau token
Get-Content "$env:USERPROFILE\.homeyrc"
```

---

## 🔄 Relancer GitHub Actions

### Après Configuration Token

#### Option 1: Push un Commit
```bash
git commit --allow-empty -m "Trigger: Test GitHub Actions avec token"
git push origin master
```

#### Option 2: Relance Manuelle
```bash
# Via GitHub CLI
gh workflow run homey.yml

# Ou via interface web
# https://github.com/dlnraja/com.tuya.zigbee/actions
# → "Homey Publication" → "Run workflow"
```

---

## 📊 Workflow Attendu (Avec Token)

```
✅ Checkout
✅ Setup Node.js
✅ Install Homey CLI
✅ Debug Environment
✅ Clean environment
✅ Validate App
✅ Publish to Homey App Store  ← Devrait réussir
✅ Success Report
```

---

## 🎯 Résultat Final

### Si Token Valide
```
✅ Publication automatique sur Homey App Store
✅ Version 2.1.23 disponible
✅ Dashboard: https://tools.developer.homey.app
```

### Si Token Invalide/Manquant
```
❌ Erreur: HOMEY_TOKEN not configured!
→ Action: Suivre ce guide pour configurer
```

---

## 📝 Notes Importantes

1. **Sécurité**: Ne JAMAIS commiter le token dans Git
2. **Validité**: Token peut expirer, renouveler si nécessaire
3. **Permissions**: Token doit avoir droits publication
4. **Format**: Token est un JWT (commence par "eyJ")

---

## 🔗 Liens Utiles

- **GitHub Secrets**: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
- **GitHub Actions**: https://github.com/dlnraja/com.tuya.zigbee/actions
- **Homey Dashboard**: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub
- **Homey CLI Docs**: https://apps.developer.homey.app/the-homey-app/cli

---

**Action Immédiate**: Configurer HOMEY_TOKEN puis relancer workflow
