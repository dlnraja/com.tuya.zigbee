# 🚀 SETUP GITHUB ACTIONS - FAIRE MAINTENANT!

## ⚡ 3 ÉTAPES RAPIDES (2 minutes)

### ÉTAPE 1: Obtenir Token Homey

**Option A: Via fichier de config**

```powershell
# Le token est dans:
$env:USERPROFILE\.athom-cli\
# ou
$env:APPDATA\.athom-cli\

# Ouvre le fichier config.json et copie le token
```

**Option B: Générer nouveau token**

1. Va sur: https://tools.developer.homey.app/
2. Clique ton profil (en haut à droite)
3. **Account Settings** → **API Tokens**
4. Clique **Generate New Token**
5. Nom: "GitHub Actions"
6. **Copie le token** (il apparaît une seule fois!)

---

### ÉTAPE 2: Ajouter Token à GitHub

1. **Va sur**: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

2. **Clique**: "New repository secret"

3. **Remplis**:
   - Name: `HOMEY_TOKEN`
   - Secret: (colle ton token ici)

4. **Clique**: "Add secret"

---

### ÉTAPE 3: Push pour Déclencher

Une fois le token ajouté:

```bash
cd "c:\Users\HP\Desktop\homey app\tuya_repair"
git status
git push origin master
```

**GitHub Actions se déclenchera automatiquement!** 🎉

---

## 🔍 VÉRIFIER LE WORKFLOW

Après push, regarde:
https://github.com/dlnraja/com.tuya.zigbee/actions

Tu verras:
- ⚙️ Workflow en cours...
- ✅ Validation OK
- ✅ Publication OK
- 🎉 v4.9.58 en ligne!

---

## ⚠️ IMPORTANT

**Le token est SECRET!**
- ✅ Dans GitHub Secrets = Sécurisé
- ❌ Ne le partage JAMAIS publiquement
- ❌ Ne le commit JAMAIS dans le code

---

## 🆘 SI PROBLÈME

**Token invalide?**
- Génère nouveau token sur tools.developer.homey.app
- Re-ajoute dans GitHub Secrets

**Workflow ne démarre pas?**
- Vérifie que HOMEY_TOKEN existe dans Secrets
- Vérifie que tu as push vers master
- Check les logs: github.com/dlnraja/com.tuya.zigbee/actions

---

**C'EST TOUT! Après setup token = auto-publish à chaque push! 🚀**
