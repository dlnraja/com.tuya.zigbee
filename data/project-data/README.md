# 🗄️ Project Data - Fichiers Temporaires

Ce dossier contient les fichiers temporaires et archives du projet.

## 📦 Contenu

### Archives (.tar.gz)
- `build_23.tar.gz` - Build #23 téléchargé pour analyse comparative
- `temp_app.tar.gz` - Archive temporaire

### Scripts de Génération (.js)
- `fix_images_and_workflow.js` - Script génération images + workflow auto-promotion
- `cleanup_root.js` - Script nettoyage racine projet

### Fichiers Développement
- `.nojekyll` - Configuration GitHub Pages (désactivée)
- `README.txt` - Ancienne documentation texte

## ⚠️ Important

**Ces fichiers ne sont PAS inclus dans:**
- Publication Homey App (.homeyignore)
- Repository Git (listés dans .gitignore si nécessaire)
- Build production

## 🔧 Scripts Utilitaires

### fix_images_and_workflow.js
Génère toutes les images professionnelles:
- 328 images PNG (app + drivers)
- Palette 9 couleurs catégorisées
- Workflow auto-promotion Draft→Test

**Utilisation:**
```bash
node project-data/fix_images_and_workflow.js
```

### cleanup_root.js
Nettoie la racine du projet:
- Déplace documentation vers docs/
- Déplace fichiers temporaires ici
- Garde seulement fichiers essentiels Homey

**Utilisation:**
```bash
node project-data/cleanup_root.js
```

## 📊 Archives Build

### build_23.tar.gz
Archive du Build #23 téléchargée pour:
- Analyse comparative images
- Référence style visuel
- Comparaison avant/après

### temp_app.tar.gz
Archive temporaire utilisée pour:
- Tests locaux
- Validation build
- Debugging

## 🗑️ Nettoyage

Pour supprimer les fichiers temporaires:
```bash
# Windows
del /Q project-data\*.tar.gz

# Linux/Mac
rm project-data/*.tar.gz
```

**Note:** Toujours garder les scripts .js car réutilisables!

## 📂 Structure Recommandée

```
project-data/
├── README.md              (ce fichier)
├── *.tar.gz              (archives temporaires)
├── *.js                  (scripts réutilisables)
└── *.txt                 (fichiers temporaires)
```

---

**Retour à la racine:** `cd ..`  
**Documentation complète:** `../docs/`
