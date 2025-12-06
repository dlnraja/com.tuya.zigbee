# 📱 Créer la Pull Request depuis ton Smartphone Android

Tu as **3 options** pour créer la PR. Choisis la plus pratique pour toi !

---

## ✅ Option 1: Lien Direct GitHub (LE PLUS SIMPLE)

**Étape 1**: Ouvre ce lien dans ton navigateur mobile :

```
https://github.com/dlnraja/com.tuya.zigbee/compare/master...claude/mmwave-climate-sensor-fixes-014ZhNyRSqrt7fYWXPTYrLDr?quick_pull=1&title=v5.4.3:%20Fix%20critical%20issues%20-%20mmWave%20radar,%20soil%20sensor,%20measure_soil_moisture
```

**Étape 2**: GitHub va te demander de te connecter si ce n'est pas déjà fait

**Étape 3**: Clique sur "Create pull request"

**Étape 4**: Dans le champ "Description", copie-colle le contenu du fichier `PR_DESCRIPTION.md`

**Étape 5**: Clique sur "Create pull request" pour finaliser !

---

## ✅ Option 2: Via GitHub Mobile App

**Étape 1**: Ouvre l'app GitHub sur ton Android

**Étape 2**: Va sur le repo `dlnraja/com.tuya.zigbee`

**Étape 3**: Clique sur "Branches"

**Étape 4**: Trouve la branche `claude/mmwave-climate-sensor-fixes-014ZhNyRSqrt7fYWXPTYrLDr`

**Étape 5**: Clique sur "New pull request"

**Étape 6**: Configure :
- **Base**: `master` (ou la branche principale)
- **Compare**: `claude/mmwave-climate-sensor-fixes-014ZhNyRSqrt7fYWXPTYrLDr`

**Étape 7**: Titre :
```
v5.4.3: Fix critical issues - mmWave radar, soil sensor, measure_soil_moisture
```

**Étape 8**: Description : Copie le contenu de `PR_DESCRIPTION.md`

**Étape 9**: Crée la PR !

---

## ✅ Option 3: Depuis le navigateur GitHub (Manuelle)

**Étape 1**: Ouvre GitHub.com dans Chrome/Firefox sur ton Android

**Étape 2**: Va sur : https://github.com/dlnraja/com.tuya.zigbee

**Étape 3**: Tu devrais voir un bandeau jaune qui dit :  
"**claude/mmwave-climate-sensor-fixes-014ZhNyRSqrt7fYWXPTYrLDr** had recent pushes"

**Étape 4**: Clique sur "**Compare & pull request**"

**Étape 5**: Remplis le formulaire :

**Titre** :
```
v5.4.3: Fix critical issues - mmWave radar, soil sensor, measure_soil_moisture
```

**Description** : Copie tout le contenu de `PR_DESCRIPTION.md` (disponible dans ce répertoire)

**Étape 6**: Vérifie que :
- Base: `master` (ou branche principale du repo)
- Compare: `claude/mmwave-climate-sensor-fixes-014ZhNyRSqrt7fYWXPTYrLDr`

**Étape 7**: Clique sur "Create pull request" !

---

## 📋 Contenu de la PR (à copier-coller)

Le fichier `PR_DESCRIPTION.md` dans ce répertoire contient toute la description formatée.

Ouvre-le et copie **tout le contenu** pour le coller dans le champ "Description" de la PR sur GitHub.

---

## 🎯 Résumé de ce qui sera dans la PR

### Fichiers modifiés :
1. ✅ `app.json` - Version 5.4.3 + nouvelle capability measure_soil_moisture
2. ✅ `drivers/motion_sensor_radar_mmwave/device.js` - Fix DP101 mapping
3. ✅ `drivers/soil_sensor/*` - Nouveau driver complet (4 fichiers)

### Problèmes résolus :
1. ✅ mmWave radar DP101 mal mappé (forum /290)
2. ✅ Soil sensor _TZE284_oitavov2 non supporté  
3. ✅ Nouvelle capability measure_soil_moisture

### Statistiques :
- **Commit**: ea924bf
- **Fichiers changés**: 8
- **Insertions**: +234 lignes
- **Suppressions**: -679 lignes

---

## ❓ Besoin d'aide ?

Si tu as des problèmes pour créer la PR depuis ton smartphone :

1. **Copie le lien de l'Option 1** et ouvre-le dans Chrome
2. **Connecte-toi à GitHub** si nécessaire
3. **Copie le contenu de PR_DESCRIPTION.md** dans la description
4. **Clique sur "Create pull request"** !

C'est tout ! 🚀

---

## 🔍 Vérifier que la PR est bien créée

Une fois la PR créée, tu devrais voir :
- Un numéro de PR (ex: #85, #86, etc.)
- Un lien permanent vers la PR
- Les 8 fichiers modifiés listés
- Les checks qui commencent à tourner

Tu peux partager le lien de la PR sur le forum Homey pour que la communauté puisse tester !
