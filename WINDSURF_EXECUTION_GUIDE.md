# 🚀 WINDSURF AI - EXECUTION GUIDE

## 📚 Documents à Utiliser (dans l'ordre)

### 1️⃣ **WINDSURF_AI_PROMPT.md** (PRINCIPAL)
**Contenu**: Fixes critiques généraux
- IAS Zone / Motion / SOS (v.replace errors)
- Battery conversion (0..200 → %)
- Illuminance (log-lux → lux)
- Debug 0xNaN fix
- CI/CD pipeline
- Templates GitHub
- Documentation (Cookbook, README)
- Tuya DP Engine architecture

**Action**: Copier-coller TOUT ce fichier dans WindSurf en premier

---

### 2️⃣ **WINDSURF_ADDENDUM_FORUM_PRODUCTS.md** (SPÉCIFIQUE)
**Contenu**: 3 produits problématiques du forum #407
- Radar mmWave Sensor (AliExpress)
- Scene Switch 4-Gang (AliExpress)  
- Motion/SOS général (lié au prompt principal)

**Action**: Copier-coller APRÈS le prompt principal dans WindSurf

---

## 🎯 Workflow d'Exécution

### Phase 1: Configuration WindSurf (2 min)
```
1. Ouvrir WindSurf AI Editor
2. Ouvrir le projet: c:\Users\HP\Desktop\homey app\tuya_repair
3. Ouvrir le chat WindSurf AI
```

### Phase 2: Charger les Prompts (1 min)
```
1. Ouvrir WINDSURF_AI_PROMPT.md
2. Copier TOUT le contenu (Ctrl+A, Ctrl+C)
3. Coller dans WindSurf chat
4. Attendre confirmation de WindSurf

5. Ouvrir WINDSURF_ADDENDUM_FORUM_PRODUCTS.md  
6. Copier TOUT le contenu
7. Coller dans WindSurf chat (même conversation)
8. Dire à WindSurf: "Exécute toutes les fixes dans l'ordre de priorité"
```

### Phase 3: WindSurf Exécute (1-2 heures automatique)
WindSurf va:
1. ✅ Fixer IASZoneEnroller.js (safe strings, wait-ready, retries)
2. ✅ Créer lib/tuya-engine/converters/battery.js
3. ✅ Créer lib/tuya-engine/converters/illuminance.js
4. ✅ Créer lib/zigbee/wait-ready.js
5. ✅ Créer lib/zigbee/safe-io.js
6. ✅ Appliquer battery converter à TOUS les drivers *_battery
7. ✅ Fixer motion_sensor_battery/device.js (orphaned catch)
8. ✅ Créer .github/workflows/build.yml (CI/CD)
9. ✅ Créer scripts/build-device-matrix.js
10. ✅ Créer templates GitHub (Device Request, Bug, PR)
11. ✅ Créer docs/cookbook.md
12. ✅ Ajouter Transparency block au README
13. ✅ Ajouter TS011F fingerprint (_TZ3000_00mk2xzy)
14. ✅ Ajouter Hue LOM003 redirect
15. ✅ Vérifier drivers radar/scene pour produits AliExpress

### Phase 4: Validation (15 min)
```bash
# Dans terminal WindSurf ou externe:
cd "c:\Users\HP\Desktop\homey app\tuya_repair"

# Valider code
npx eslint .
npx homey app validate --level publish

# Générer matrice
node scripts/build-device-matrix.js

# Vérifier output
cat matrix/devices.json
cat matrix/devices.csv
```

### Phase 5: Test Manuel (optionnel, 30 min)
Si tu as les devices physiques:
1. Installer app sur Homey: `npx homey app run`
2. Appairer Motion sensor → vérifier trigger flow
3. Appairer SOS button → vérifier trigger flow
4. Vérifier battery % (0-100, pas 200)
5. Vérifier illuminance (lux réalistes)

### Phase 6: Commit & Push (5 min)
```bash
git add -A
git status  # Vérifier les fichiers

# Utiliser le message de commit du prompt:
git commit -F- <<EOF
fix(critical): IAS Zone + Battery + Illuminance + CI transparency

FIXES:
- IAS Zone: wait Zigbee ready, safe string handling, retries, single listeners
- Battery: uniform 0..200 → % conversion with clamping (all drivers)
- Illuminance: log-lux → lux conversion (profile option)
- Debug: no more 0xNaN cluster IDs
- Motion sensor: remove orphaned catch block, use IASZoneEnroller

ADDS:
- lib/zigbee/wait-ready.js: safe Zigbee init waiting
- lib/zigbee/safe-io.js: retry wrapper for timeouts
- lib/tuya-engine/converters/battery.js: standard converter
- lib/tuya-engine/converters/illuminance.js: log-lux converter
- .github/workflows/build.yml: CI validation + matrix export
- scripts/build-device-matrix.js: auto-generate device matrix
- .github/ISSUE_TEMPLATE/*: Device Request, Bug, Feature, PR
- docs/cookbook.md: Zigbee pairing/troubleshooting guide
- TS011F fingerprint (_TZ3000_00mk2xzy): Ian Gibbo smart plug

SOURCES:
- Homey SDK: https://apps.developer.homey.app/wireless/zigbee
- node-zigbee-clusters: https://github.com/athombv/node-zigbee-clusters
- Forum #407: https://community.homey.app/t/.../140352/407
- ChatGPT Analysis: https://chatgpt.com/share/68f0e31a-7cb4-8000-96b7-dec4e3a85e13

Closes: Forum #407 diagnostics, Ian Gibbo interview issues
EOF

git push origin master
```

### Phase 7: Réponse Forum (10 min)
Utiliser le template de `WINDSURF_ADDENDUM_FORUM_PRODUCTS.md`:
1. Copier la section "COMMUNICATION TEMPLATE"
2. Poster dans forum #407
3. Demander infos manquantes pour Radar mmWave et Scene Switch
4. Mentionner @Peter_van_Werkhoven

---

## ✅ Checklist Finale (Avant de Poster)

### Code Quality
- [ ] `npx eslint .` → 0 errors
- [ ] `npx homey app validate --level publish` → 0 errors
- [ ] No orphaned code blocks
- [ ] All imports correct
- [ ] No `v.replace is not a function` possible

### Functionality
- [ ] IASZoneEnroller.js has safe string handling
- [ ] All battery drivers use uniform converter
- [ ] Illuminance uses log-lux converter
- [ ] Motion sensor device.js cleaned
- [ ] SOS button uses IASZoneEnroller

### Infrastructure  
- [ ] CI workflow exists (.github/workflows/build.yml)
- [ ] Matrix script exists (scripts/build-device-matrix.js)
- [ ] Matrix generates successfully (matrix/devices.json + csv)
- [ ] Templates exist (.github/ISSUE_TEMPLATE/*)
- [ ] Cookbook exists (docs/cookbook.md)
- [ ] README has Transparency block

### New Devices
- [ ] TS011F fingerprint added
- [ ] Hue LOM003 redirect added
- [ ] Radar/Scene drivers checked for AliExpress IDs

### Git
- [ ] All changes committed
- [ ] Commit message detailed
- [ ] Pushed to master
- [ ] CI running (GitHub Actions)

---

## 🆘 Si Problèmes

### WindSurf ne comprend pas
**Solution**: Reformuler en étapes plus petites
```
Au lieu de: "Exécute toutes les fixes"
Dire: "Commence par fixer IASZoneEnroller.js - ajoute la fonction toSafeString"
```

### Erreurs de validation Homey
**Solution**: Lire le message d'erreur et demander à WindSurf
```
"J'ai cette erreur Homey: [copier l'erreur]
Comment la fixer selon les guidelines SDK3?"
```

### Git conflicts
**Solution**: 
```bash
git pull --rebase origin master
# Résoudre conflits
git add -A
git rebase --continue
git push origin master
```

### CI fails
**Solution**: Vérifier artifacts GitHub Actions
```
1. Aller sur GitHub → Actions
2. Cliquer sur le dernier run
3. Télécharger artifacts (validation logs, matrix)
4. Lire les erreurs
5. Fixer et re-push
```

---

## 📊 Résultats Attendus

### Immédiat (après exécution)
- ✅ Code valide (0 ESLint errors, 0 Homey errors)
- ✅ 10+ nouveaux fichiers créés (converters, CI, templates, docs)
- ✅ 50+ fichiers modifiés (battery drivers, IAS fixes)
- ✅ Git commit clean avec message détaillé
- ✅ CI pipeline running

### Court Terme (1-2 jours)
- ✅ Users testent v3.0.45
- ✅ Motion sensors trigger flows
- ✅ SOS buttons trigger flows  
- ✅ Battery shows correct %
- ✅ Illuminance shows realistic lux
- ✅ Users fournissent infos Radar/Scene

### Moyen Terme (1 semaine)
- ✅ Radar mmWave AliExpress supporté (après fingerprint)
- ✅ Scene Switch 4G AliExpress supporté (après fingerprint)
- ✅ Tous les produits forum #407 résolus
- ✅ CI génère matrix à chaque commit
- ✅ Transparence appréciée par communauté

---

## 🎉 Success Metrics

**Tu sauras que c'est réussi quand:**

1. ✅ Peter_van_Werkhoven confirme: "Motion and SOS work now!"
2. ✅ Aucune erreur `v.replace is not a function` dans nouveaux diagnostics
3. ✅ Battery affiche 0-100% pour TOUS les users
4. ✅ GitHub Actions badge "passing" dans README
5. ✅ Matrix devices visible en artifacts CI
6. ✅ Users utilisent templates pour device requests
7. ✅ Forum discussion devient positive
8. ✅ App rating augmente sur Homey App Store

---

## 📞 Ressources & Support

### Documentation
- **Prompt Principal**: `WINDSURF_AI_PROMPT.md`
- **Addendum Produits**: `WINDSURF_ADDENDUM_FORUM_PRODUCTS.md`
- **Ce Guide**: `WINDSURF_EXECUTION_GUIDE.md`

### Outils
- **WindSurf AI**: https://windsurf.ai/
- **Homey CLI**: `npx homey --version`
- **ESLint**: `npx eslint --version`

### Communauté
- **Forum Thread**: https://community.homey.app/t/.../140352/407
- **GitHub Repo**: https://github.com/dlnraja/com.tuya.zigbee
- **GitHub Issues**: https://github.com/dlnraja/com.tuya.zigbee/issues

---

**🚀 Prêt? Go!**

1. Ouvre WindSurf AI Editor
2. Charge les 2 prompts (principal + addendum)
3. Lance l'exécution
4. Valide le code
5. Commit & Push
6. Poste sur forum
7. Attends feedback users
8. Itère si nécessaire

**Bonne chance! 💪**
