# Configuration du HOMEY_TOKEN pour GitHub Actions

## ⚠️ ACTION REQUISE AVANT LE PREMIER PUSH

Pour que les workflows GitHub Actions fonctionnent, vous devez configurer le `HOMEY_TOKEN`.

---

## 📋 Étapes de Configuration

### 1. Créer le Token Homey

1. **Visitez:** https://tools.developer.homey.app/tools/api
2. **Connectez-vous** avec votre compte Homey Developer
3. **Cliquez sur** "Create Token" ou "Generate API Token"
4. **Copiez le token** (il ressemble à: `8701e2d4175d4cabc1475816db753a7a0f65afb7`)

⚠️ **IMPORTANT:** Le token ne sera affiché qu'une seule fois. Sauvegardez-le dans un endroit sûr.

---

### 2. Ajouter le Secret sur GitHub

1. **Allez sur GitHub:** https://github.com/dlnraja/com.tuya.zigbee
2. **Cliquez sur:** `Settings` (en haut à droite du repo)
3. **Dans le menu gauche:** `Secrets and variables` → `Actions`
4. **Cliquez sur:** `New repository secret`
5. **Remplissez:**
   - **Name:** `HOMEY_TOKEN`
   - **Secret:** Collez le token que vous avez copié
6. **Cliquez sur:** `Add secret`

---

## ✅ Vérification

### Vérifier que le Secret est Configuré

1. Allez sur: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
2. Vous devriez voir: `HOMEY_TOKEN` dans la liste des secrets
3. Le secret apparaîtra comme: `HOMEY_TOKEN` • Updated X time ago

---

## 🚀 Test du Workflow

Une fois le secret configuré, testez le workflow:

### Méthode 1: Push Automatique

```bash
# Le workflow se déclenchera automatiquement
git add -A
git commit -m "test: verify GitHub Actions workflow"
git push origin master
```

### Méthode 2: Déclenchement Manuel

1. Allez sur: https://github.com/dlnraja/com.tuya.zigbee/actions
2. Cliquez sur: `Homey App - Official Publish`
3. Cliquez sur: `Run workflow`
4. Sélectionnez: `master` branch
5. Cliquez sur: `Run workflow`

---

## 📊 Vérifier le Résultat

### Pendant l'Exécution

1. **Actions Tab:** https://github.com/dlnraja/com.tuya.zigbee/actions
2. Vous verrez les jobs s'exécuter:
   - ✅ Validate App
   - ✅ Update Version
   - ✅ Publish to Homey App Store

### Après l'Exécution

1. **Homey Dashboard:** https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
2. Vous devriez voir:
   - Nouvelle version publiée
   - Status: "Draft" ou "In Review"

---

## 🐛 Dépannage

### Erreur: `HOMEY_API_TOKEN not found`

**Cause:** Le secret n'est pas configuré ou mal nommé

**Solution:**
1. Vérifiez que le secret s'appelle exactement `HOMEY_TOKEN` (sensible à la casse)
2. Re-créez le secret si nécessaire
3. Re-déclenchez le workflow

### Erreur: `Authentication failed`

**Cause:** Token invalide ou expiré

**Solution:**
1. Générez un nouveau token: https://tools.developer.homey.app/tools/api
2. Mettez à jour le secret GitHub avec le nouveau token
3. Re-déclenchez le workflow

### Workflow ne se Déclenche Pas

**Vérifications:**
1. Le fichier est bien `.github/workflows/homey-official-publish.yml`
2. Le push est sur la branche `master`
3. Le fichier YAML n'a pas d'erreurs de syntaxe

---

## 🔒 Sécurité

### Bonnes Pratiques

- ✅ **NE JAMAIS** committer le token dans le code
- ✅ **NE JAMAIS** afficher le token dans les logs
- ✅ **TOUJOURS** utiliser les GitHub Secrets
- ✅ Régénérer le token si compromis

### Token Compromis?

Si votre token est exposé:

1. **Immédiatement:** Allez sur https://tools.developer.homey.app/tools/api
2. **Révoquez** le token compromis
3. **Générez** un nouveau token
4. **Mettez à jour** le secret GitHub
5. **Vérifiez** qu'aucune activité suspecte n'a eu lieu

---

## 📚 Références

- **Homey API Tools:** https://tools.developer.homey.app/tools/api
- **GitHub Secrets Guide:** https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **Workflow Documentation:** `.github/workflows/OFFICIAL_WORKFLOWS_README.md`

---

## ✅ Checklist Finale

Avant de push:

- [ ] Token créé sur Homey Developer Tools
- [ ] Secret `HOMEY_TOKEN` ajouté sur GitHub
- [ ] Secret vérifié dans Settings → Secrets and variables → Actions
- [ ] Prêt à tester le workflow

**Une fois tout configuré, supprimez ce fichier pour éviter de le committer avec des informations sensibles.**

---

**Date:** 2025-10-13  
**Status:** ⚠️ Configuration requise avant le premier push
