# 🎨 HOMEY IMAGES - BEST PRACTICES & RÈGLES CRITIQUES

**Date:** 2025-10-15  
**Version:** 2.16.0  
**Projet:** Universal Tuya Zigbee

---

## ⚠️ RÈGLES CRITIQUES DÉCOUVERTES

### 1. HIÉRARCHIE DE PRIORITÉ HOMEY

Homey charge les images selon cette priorité:

```
1. /assets/large.png          ← ❌ FALLBACK GLOBAL (si existe)
2. /assets/small.png          ← ❌ FALLBACK GLOBAL (si existe)
3. /drivers/*/assets/images/large.png  ← ✅ IMAGE DRIVER
4. /drivers/*/assets/images/small.png  ← ✅ IMAGE DRIVER
```

**CONSÉQUENCE:** Si `/assets/large.png` et `/assets/small.png` existent, Homey les utilise pour TOUS les drivers au lieu des images personnalisées!

### 2. SOLUTION

**SUPPRIMER** les fichiers PNG de la racine `/assets/`:
```bash
# À SUPPRIMER (causent fallback)
❌ /assets/large.png
❌ /assets/small.png
❌ /assets/xlarge.png

# À GARDER (images de l'APP dans le store)
✅ /assets/images/large.png
✅ /assets/images/small.png
✅ /assets/images/xlarge.png
```

---

## 📂 STRUCTURE OPTIMALE

### Architecture Correcte:

```
/assets/
├── icon.svg                    (REQUIS - Icône app)
├── temp_alarm.svg              (Capability custom)
├── README.md
├── icons/                      (Icônes custom capabilities)
├── templates/                  (Templates)
└── images/                     (Images APP - store uniquement)
    ├── large.png               (500x350px - APP)
    ├── small.png               (250x175px - APP)
    └── xlarge.png              (1000x700px - APP)

/drivers/*/assets/
├── icon.svg                    (Icône driver - REQUIS)
└── images/                     (Images driver)
    ├── small.png               (75x75px - Liste drivers)
    └── large.png               (500x500px - Détail driver)
```

---

## 🎨 IMAGES PERSONNALISÉES PAR DRIVER

### Dimensions:

**Driver images:**
- `small.png`: 75x75px (liste)
- `large.png`: 500x500px (détail)

**App images:**
- `small.png`: 250x175px (store)
- `large.png`: 500x350px (store)
- `xlarge.png`: 1000x700px (store)

### Design Personnalisé:

Chaque driver doit avoir des couleurs/icônes uniques:

| Type | Couleur | Icône | Badge |
|------|---------|-------|-------|
| Motion | 🔴 Rouge | 👁️ | 🔋 |
| Contact | 🟦 Cyan | 🚪 | 🔋 |
| Temperature | 🟠 Orange | 🌡️ | 🔋 |
| Switch | 🔘 Gris | ⭕ | ⚡ |
| Light | 💡 Jaune | 💡 | ⚡ |

---

## 📏 TAILLE DE L'APP

### Limite Homey:
- **Maximum:** 50 MB
- **Recommandé:** < 30 MB

### Optimisations:

1. **Préférer PNG au SVG** pour les images:
   - PNG optimisé < SVG non optimisé
   - PNG: compression native
   - SVG: XML verbeux

2. **Supprimer fichiers inutiles:**
   - ❌ Dupliquer images
   - ❌ Fichiers temporaires
   - ❌ SVG non utilisés

3. **Dimensions optimales:**
   - Ne pas dépasser les tailles requises
   - Compression PNG: TinyPNG, ImageOptim

---

## 🔧 SCRIPTS D'OPTIMISATION

### Générer Images Personnalisées:
```bash
node scripts/tools/GENERATE_UNIQUE_PERSONALIZED_IMAGES.js
```

### Nettoyer Assets:
```bash
# Supprimer fallback
rm assets/large.png assets/small.png

# Supprimer SVG inutiles
rm assets/images/icon*.svg
```

---

## ✅ CHECKLIST VALIDATION

Avant chaque build:

- [ ] Pas de PNG dans `/assets/` (sauf `/assets/images/`)
- [ ] Chaque driver a `small.png` et `large.png`
- [ ] Taille app < 50 MB
- [ ] `homey app validate --level publish` passe
- [ ] Images visibles dans developer portal

---

## 🐛 PROBLÈMES COMMUNS

### Problème 1: Images génériques pour tous les drivers
**Cause:** `/assets/large.png` existe  
**Solution:** Supprimer ce fichier

### Problème 2: App trop lourde
**Cause:** Trop de SVG ou images non optimisées  
**Solution:** Utiliser PNG, optimiser tailles

### Problème 3: Images CDN pas à jour
**Cause:** Cache CDN Athom  
**Solution:** Incrémenter version (changement version = nouveau CDN URL)

---

## 📚 RÉFÉRENCES

- Homey SDK3 Images: https://apps.developer.homey.app/the-basics/app/assets
- App Store Guidelines: https://apps.developer.homey.app/app-store/guidelines
- Crownstone App: https://github.com/crownstone/crownstone-homey

---

**Auteur:** Dylan L.N. Raja  
**Dernière mise à jour:** 2025-10-15  
**Status:** ✅ Validé et testé
