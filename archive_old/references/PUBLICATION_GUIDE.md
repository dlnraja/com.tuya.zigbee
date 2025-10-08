# 🚀 Guide de Publication Complet — Local & GitHub Actions

**Généré**: 2025-10-05T19:47:00+02:00  
**Version**: 2.1.22  
**Status**: Prêt pour publication

---

## 🎯 DEUX MÉTHODES DISPONIBLES

### Méthode A: Publication Locale (Immédiate) ✅
**Avantage**: Contrôle total, résultats immédiats  
**Temps**: 2-5 minutes

### Méthode B: GitHub Actions (Automatisée) ✅
**Avantage**: Automatisation complète, pas de CLI local requis  
**Temps**: 5-10 minutes (après configuration)

---

## 📋 MÉTHODE A: PUBLICATION LOCALE

### Prérequis
```
✅ Node.js installé
✅ Git synchronisé
✅ Compte Homey Developer
```

### Étape 1: Exécuter le Script
```powershell
cd c:\Users\HP\Desktop\tuya_repair
pwsh -File tools/force_publish_local.ps1
```

### Étape 2: Suivre les Prompts Interactifs

**Le script va automatiquement**:
1. ✅ Valider JSON (165 fichiers)
2. ✅ Valider SDK3 (publish-level)
3. ✅ Vérifier Git status
4. ✅ Installer Homey CLI (si nécessaire)
5. 🔐 **Demander vos credentials Homey**
6. 📦 **Demander confirmation de publication**

**Vous devez fournir**:
- Email Homey (lors du login)
- Mot de passe Homey (lors du login)
- Confirmation (y/n)

### Étape 3: Credentials Homey

**Lors de `homey login`**:
```
? Email: votre.email@example.com
? Password: ••••••••••••
✅ Successfully logged in
```

**Si vous avez déjà un token**:
```powershell
# Option alternative (si vous avez le token)
$env:HOMEY_TOKEN = "votre_token_ici"
homey app publish
```

### Étape 4: Confirmation Publication

**Le script affichera**:
```
📦 Version à publier: 2.1.22

📝 Changelog suggéré:
---
🎯 N6 Protocol Complete
- Historical analysis: 50 commits + 10 forks analyzed
- Intelligent enrichment: +810 manufacturers (1236 total)
- Category-based targeting: 9 device types
- BDU N6 consolidated: All sources integrated
- Validation: 0 errors (JSON + SDK3 + coherence)
- Images: 327 SDK3-compliant assets
- IA image generation: Automation scripts added
---

Continuer la publication? (y/n)
```

**Répondre**: `y`

### Résultat Attendu
```
🎉 PUBLICATION RÉUSSIE!

📊 Détails:
  Version: 2.1.22
  App: Ultimate Zigbee Hub
  Drivers: 162
  Manufacturers: 1236

🔗 Liens utiles:
  Dashboard: https://tools.developer.homey.app
  App Store: https://homey.app
  Forum: https://community.homey.app/t/140352
```

---

## 📋 MÉTHODE B: GITHUB ACTIONS

### Étape 1: Configuration du Token (UNE FOIS)

#### Option 1A: Obtenir le Token via CLI (Recommandé)
```powershell
# Se connecter à Homey
homey login

# Obtenir le token
homey --version
# Le token est stocké dans: %USERPROFILE%\.homeyrc
```

#### Option 1B: Obtenir le Token via Dashboard
```
1. Aller sur: https://tools.developer.homey.app
2. Se connecter
3. Aller dans Settings → API Tokens
4. Créer un nouveau token
5. Copier le token généré
```

### Étape 2: Ajouter le Secret GitHub

```
1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

2. Cliquer: "New repository secret"

3. Remplir:
   Name: HOMEY_TOKEN
   Value: [coller votre token]

4. Cliquer: "Add secret"
```

### Étape 3: Déclencher le Workflow

#### Option 3A: Push sur master (Automatique)
```bash
git add -A
git commit -m "Trigger publication"
git push origin master
```

#### Option 3B: Déclenchement Manuel
```
1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/actions

2. Sélectionner: "Homey Publication"

3. Cliquer: "Run workflow"

4. Sélectionner: Branch "master"

5. Cliquer: "Run workflow"
```

### Étape 4: Monitoring

**URL**: https://github.com/dlnraja/com.tuya.zigbee/actions

**Étapes du workflow**:
```
1. ✅ Checkout code
2. ✅ Setup Node.js
3. ✅ Install Homey CLI
4. ✅ Debug Environment
5. ✅ Clean environment
6. ✅ Validate App
7. 🔐 Login via HOMEY_TOKEN
8. 📦 Publish to Homey App Store
9. ✅ Success Report
```

**Durée estimée**: 5-10 minutes

### Résultat Attendu

**Succès**:
```
✅ All checks passed
🎉 PUBLICATION COMPLETED!
📱 App: Ultimate Zigbee Hub - Professional Edition
```

**Échec possible**:
```
❌ HOMEY_TOKEN not configured!
→ Solution: Retour à Étape 1
```

---

## 🔍 TROUBLESHOOTING

### Problème 1: Login Échoue (Local)
```
Erreur: Login failed
Cause: Credentials incorrects ou connexion

Solutions:
1. Vérifier email/password
2. Vérifier connexion Internet
3. Réinitialiser mot de passe: https://my.homey.app
```

### Problème 2: Token Invalide (GitHub Actions)
```
Erreur: HOMEY_TOKEN not configured
Cause: Secret manquant ou expiré

Solutions:
1. Vérifier secret existe: GitHub → Settings → Secrets
2. Régénérer token: homey login + copier nouveau token
3. Mettre à jour secret GitHub
```

### Problème 3: CLI Installation Fail
```
Erreur: homey command not found
Cause: Installation échouée

Solutions:
npm install -g homey --no-audit --no-fund
# ou
npm install -g athom-cli --no-audit --no-fund
```

### Problème 4: Validation Échoue
```
Erreur: App validation failed
Cause: Erreurs dans app.json ou drivers

Solutions:
node tools/validate_all_json.js
node tools/homey_validate.js
# Corriger les erreurs affichées
```

---

## 📊 COMPARAISON DES MÉTHODES

| Critère | Local | GitHub Actions |
|---------|-------|----------------|
| **Setup** | Immédiat | Config token (1 fois) |
| **Temps** | 2-5 min | 5-10 min |
| **Automatisation** | Semi-auto | Full auto |
| **Contrôle** | Total | Limité |
| **Debugging** | Facile | Logs GitHub |
| **Reproductibilité** | Manuelle | Automatique |
| **Recommandé pour** | Test/Debug | Production |

---

## ✅ CHECKLIST PRÉ-PUBLICATION

### Validation Technique
- [x] JSON: 165 fichiers, 0 erreurs ✅
- [x] SDK3: Publish-level PASSED ✅
- [x] Git: Synchronized ✅
- [x] Version: 2.1.22 ✅
- [x] Drivers: 162 validés ✅
- [x] Images: 327 conformes ✅

### Préparation Publication
- [ ] Méthode choisie: Local OU GitHub Actions
- [ ] Credentials Homey prêts (si local)
- [ ] Token configuré (si GitHub Actions)
- [ ] Changelog préparé
- [ ] Backup créé (optionnel)

---

## 🚀 COMMANDES RAPIDES

### Publication Locale (Rapide)
```powershell
pwsh -File tools/force_publish_local.ps1
```

### Publication GitHub Actions (Auto)
```bash
# Trigger automatique
git push origin master

# OU déclenchement manuel
# → Aller sur: https://github.com/dlnraja/com.tuya.zigbee/actions
# → Cliquer: "Run workflow"
```

---

## 📞 SUPPORT

### Liens Utiles
- **Homey Developer**: https://tools.developer.homey.app
- **Homey CLI Docs**: https://apps-sdk-v3.developer.homey.app/
- **Forum Thread**: https://community.homey.app/t/140352
- **GitHub Repo**: https://github.com/dlnraja/com.tuya.zigbee

### En cas de Blocage
1. Vérifier logs: `tools/force_publish_local.ps1` (local)
2. Vérifier logs: GitHub Actions (remote)
3. Consulter: `references/COMPREHENSIVE_FINAL_STATUS.md`
4. Re-valider: `node tools/validate_all_json.js`

---

## 🎯 RECOMMANDATION

**Pour publication IMMÉDIATE**:
```powershell
pwsh -File tools/force_publish_local.ps1
```

**Pour automatisation FUTURE**:
```
1. Configurer HOMEY_TOKEN (une fois)
2. Push vers master (automatique)
```

---

**FIN DU GUIDE — Prêt pour Publication**
