# 🔍 INVESTIGATION - DOUBLONS ET IMAGES

**Date**: 24 Octobre 2025 22:15 UTC+2  
**Reporter**: User  
**Problèmes signalés**:
1. Doublons de devices dans la liste Homey
2. Images incorrectes pour les devices

---

## 📊 PROBLÈMES IDENTIFIÉS

### 1. Doublons de Drivers dans app.json

**Cause probable**: Duplicates dans le fichier `app.json` ou `.homeycompose/app.json`

**Vérification nécessaire**:
- Check app.json pour doublons
- Check .homeycompose/app.json
- Vérifier les drivers qui apparaissent en double

### 2. Images Incorrectes

**Cause probable**: 
- Images dans mauvais dossier (assets/ vs assets/images/)
- Images partagées entre drivers similaires
- Cache Homey pas rafraîchi

**Structure actuelle découverte**:
```
drivers/button_wireless_4/assets/
├── large.png (racine)
├── small.png (racine)
├── xlarge.png (racine)
└── images/
    ├── large.png (sous-dossier)
    ├── small.png (sous-dossier)
    └── xlarge.png (sous-dossier)
```

**Problème**: Duplication des images en 2 endroits!

---

## ✅ SOLUTION PROPOSÉE

### Étape 1: Nettoyer la Structure des Images

**Pour chaque driver affecté**:
1. Garder uniquement `assets/small.png` et `assets/large.png` (racine)
2. Supprimer le dossier `assets/images/` (doublon)
3. S'assurer que chaque driver a ses propres images uniques

### Étape 2: Vérifier app.json

**Rechercher**:
- Drivers dupliqués dans la liste
- Mauvaises références d'images
- Conflits de noms

### Étape 3: Reconstruire l'App

**Actions**:
```bash
# Nettoyer le build
Remove-Item -Recurse -Force .homeybuild

# Rebuild complet
homey app build

# Valider
homey app validate
```

### Étape 4: Version Bump

**Nécessaire car**:
- Changements structurels (images)
- Homey cache les images par version
- Forcer le refresh chez les utilisateurs

---

## 🔧 DRIVERS AFFECTÉS

### Buttons Wireless (6 drivers)

```
button_wireless_1
button_wireless_2
button_wireless_3
button_wireless_4
button_wireless_6
button_wireless_8
```

**Problème**: Tous utilisent possiblement les mêmes images ou ont des doublons

### Button Emergency SOS

```
button_emergency_sos
```

**Problème**: Même structure avec doublons d'images

---

## 📝 PLAN D'ACTION

### Phase 1: Investigation Complète ✓

```
✅ Vérifier structure images (FAIT)
⏳ Vérifier app.json pour doublons
⏳ Lister tous les drivers avec images dupliquées
⏳ Identifier les images manquantes ou incorrectes
```

### Phase 2: Nettoyage Images

```
⏳ Script PowerShell pour nettoyer assets/images/
⏳ Garder uniquement assets/*.png (racine)
⏳ Vérifier tailles correctes (75x75, 500x500)
⏳ S'assurer images uniques par driver
```

### Phase 3: Fix app.json

```
⏳ Supprimer doublons de drivers
⏳ Corriger références d'images
⏳ Valider structure JSON
```

### Phase 4: Test & Deploy

```
⏳ Build complet
⏳ Validation
⏳ Test local
⏳ Commit + Push
⏳ Version bump → v4.7.4
```

---

## 🎯 PROCHAINES ACTIONS IMMÉDIATES

1. **Vérifier app.json** pour doublons
2. **Créer script** de nettoyage des images
3. **Nettoyer** structure assets/
4. **Rebuild** + test
5. **Deploy** nouvelle version

---

**Status**: 🔍 **EN COURS D'INVESTIGATION**  
**Priority**: 🔴 **HIGH**  
**Impact**: Utilisateurs voient doublons + mauvaises images  
**ETA**: 30-45 minutes

**INVESTIGATION EN COURS...**
