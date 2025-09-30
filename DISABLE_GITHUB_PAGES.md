# 🔧 Désactiver GitHub Pages

## ⚠️ PROBLÈME DÉTECTÉ

GitHub Pages essaie de build automatiquement avec Jekyll mais échoue car:
- Répertoire `/docs` n'existe pas
- Ce n'est pas nécessaire pour une app Homey

## ✅ SOLUTION

### **Méthode 1: Via GitHub (Recommandé)**

1. Allez sur: https://github.com/dlnraja/com.tuya.zigbee/settings/pages
2. Dans "Source", sélectionnez **"None"** ou **"Disable"**
3. Sauvegardez

### **Méthode 2: Via fichier de configuration**

Créer `.github/workflows/pages.yml` avec:
```yaml
# This file disables GitHub Pages
```

## 🎯 RÉSULTAT ATTENDU

Après désactivation:
- ❌ GitHub Pages: Désactivé
- ✅ Homey Publication workflow: Actif
- ✅ Publication Homey App Store: Fonctionne

## 📊 WORKFLOWS ACTUELLEMENT ACTIFS

1. **homey.yml** - ✅ GARDER (Publication Homey)
2. **test-cli.yml** - ⚠️ Optionnel (Tests CLI)
3. **GitHub Pages (Jekyll)** - ❌ À DÉSACTIVER

## 🔗 LIEN RAPIDE

**Désactiver GitHub Pages:**
https://github.com/dlnraja/com.tuya.zigbee/settings/pages

**Sélectionnez "None" dans "Source"**
