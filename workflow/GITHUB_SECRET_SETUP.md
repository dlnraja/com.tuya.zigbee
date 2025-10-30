# 🔐 GitHub Secret Configuration

## ❌ Problème Identifié

La publication GitHub Actions échoue avec l'erreur:
```
Unknown argument: token
```

## 🔍 Cause

L'action officielle Athom (`athombv/github-action-homey-app-publish@master`) utilise une **CLI Homey obsolète** qui essaie `homey login --token`, une syntaxe qui n'existe plus.

## ✅ Solution: Mettre à Jour le Secret GitHub

### Étape 1: Accéder aux Secrets

1. Allez sur: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
2. Authentifiez-vous si nécessaire

### Étape 2: Obtenir votre Personal Access Token

1. Allez sur: https://tools.developer.homey.app/me
2. Copiez votre **Personal Access Token**
3. ⚠️ **Gardez ce token en sécurité!**

### Étape 3: Créer le Secret `HOMEY_PAT`

**Option A - Si `HOMEY_TOKEN` existe déjà:**
1. Cliquez sur `HOMEY_TOKEN`
2. Notez la valeur (ou utilisez le token depuis https://tools.developer.homey.app/me)
3. Retournez à la liste des secrets
4. Cliquez "New repository secret"
5. **Name**: `HOMEY_PAT`
6. **Value**: Collez votre Personal Access Token
7. Cliquez "Add secret"
8. *(Optionnel)* Supprimez l'ancien `HOMEY_TOKEN`

**Option B - Si aucun secret n'existe:**
1. Cliquez "New repository secret"
2. **Name**: `HOMEY_PAT`
3. **Value**: Collez votre Personal Access Token depuis https://tools.developer.homey.app/me
4. Cliquez "Add secret"

### Étape 4: Vérifier la Configuration

Le workflow devrait maintenant ressembler à:

```yaml
- name: Publish to Homey App Store
  uses: athombv/github-action-homey-app-publish@master
  id: publish
  with:
    personal_access_token: ${{ secrets.HOMEY_PAT }}
```

## 📚 Documentation Officielle

- [Homey Apps SDK - Publishing](https://apps.developer.homey.app/app-store/publishing#automating-within-github-actions)
- [GitHub Action - Homey App Publish](https://github.com/marketplace/actions/homey-app-publish)
- [Homey Developer Tools](https://tools.developer.homey.app)

## ✅ Test

Une fois le secret configuré:

1. Push les changements vers GitHub
2. Le workflow devrait se déclencher automatiquement
3. Vérifiez les logs dans: https://github.com/dlnraja/com.tuya.zigbee/actions

## 🚀 Prochains Steps

Après configuration du secret:

```bash
git push origin master
```

Le workflow sera déclenché automatiquement et publiera l'app sur le Homey App Store.

---

**Date de création**: 27 octobre 2025  
**Version**: 4.9.69  
**Statut**: ✅ Workflow corrigé - Secret requis
