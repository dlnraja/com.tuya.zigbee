# 📋 INSTRUCTIONS COMMIT GIT

**⚠️ IMPORTANT:** Vous avez ~500 fichiers modifiés qui doivent être commités.

---

## 🎯 OPTION 1: COMMIT COMPLET (RECOMMANDÉ)

```bash
# 1. Vérifier status
git status --short | Measure-Object -Line

# 2. Ajouter TOUS les changements
git add -A

# 3. Commit avec message descriptif
git commit -m "feat!: brand reorganization + intelligent enrichment

BREAKING CHANGE: Reorganize all drivers by brand

Major changes:
- Detect and organize by brand (ZEMISMART, MOES, NOUS, etc.)
- Add ZEMISMART brand: 149 drivers
- Add MOES brand: 60 drivers  
- Add NOUS brand: 4 drivers
- Keep TUYA for generic devices: 45 drivers
- Enrich 154 drivers with 400+ manufacturer IDs
- Update app.json structure
- Add brand detection database

Brands identified:
- ZEMISMART (China premium): 149 drivers
- MOES (AliExpress): 60 drivers
- NOUS (Netherlands): 4 drivers
- TUYA (Generic): 45 drivers
- AQARA (Xiaomi): 6 drivers
- IKEA (TRADFRI): 5 drivers
- LSC (Action): 4 drivers
- AVATTO (EU/CN): 9 drivers

Scripts created:
- MEGA_ENRICHMENT_INTELLIGENT.js
- SIMPLE_FIX_ALL.js
- Migration phases 06-10

Migration guide: docs/MIGRATION_GUIDE_v4.md
Enrichment details: ENRICHMENT_COMPLETE.md"

# 4. Push
git push origin master
```

---

## 🎯 OPTION 2: COMMIT PARTIEL (SI TROP GROS)

### **Étape 1: Scripts uniquement**
```bash
git add scripts/
git add ENRICHMENT_COMPLETE.md
git add FINAL_STATUS_v4.md
git add BRAND_MAPPING.json
git add GIT_COMMIT_INSTRUCTIONS.md

git commit -m "docs: add brand enrichment scripts and documentation"
git push origin master
```

### **Étape 2: Nouveaux drivers**
```bash
git add drivers/zemismart_*
git add drivers/moes_*
git add drivers/nous_*

git commit -m "feat: add ZEMISMART, MOES, NOUS brand drivers"
git push origin master
```

### **Étape 3: Suppressions**
```bash
git add -u

git commit -m "refactor: remove old drivers (renamed to brands)"
git push origin master
```

### **Étape 4: Modifications restantes**
```bash
git add .

git commit -m "fix: update manufacturer IDs and driver configs"
git push origin master
```

---

## 🎯 OPTION 3: RESET SI PROBLÈME

**⚠️ ATTENTION:** Ceci annulera TOUS les changements!

```bash
# Sauvegarder d'abord
git stash save "backup avant reset"

# Reset complet
git reset --hard HEAD

# Récupérer si nécessaire
git stash pop
```

---

## ✅ VÉRIFICATIONS AVANT COMMIT

### **1. Build doit passer:**
```bash
homey app build
```

### **2. Validation doit passer:**
```bash
homey app validate --level publish
```

### **3. Vérifier nombre de drivers:**
```bash
cd drivers
ls | Measure-Object -Line
# Devrait afficher ~282
```

### **4. Vérifier app.json:**
```bash
node -e "console.log(Object.keys(require('./app.json').drivers || {}).length)"
# Devrait afficher ~282
```

---

## 📊 STATUS ACTUEL

```
Fichiers modifiés:  ~500
  - Modifiés (M):   ~100
  - Supprimés (D):  ~200
  - Nouveaux (??):  ~200
```

### **Détails:**
- **Drivers ZEMISMART:** 149 nouveaux
- **Drivers MOES:** 60 nouveaux
- **Drivers NOUS:** 4 nouveaux
- **Anciens drivers:** ~200 supprimés (renommés)
- **Fichiers config:** ~100 modifiés
- **Scripts:** 7 nouveaux

---

## 🚨 SI BUILD ÉCHOUE

### **Option A: Rebuild app.json**
```bash
node scripts/rebuild-app-json.js
```

### **Option B: Valider manuellement**
```bash
homey app validate --level debug
```

### **Option C: Reset à dernier commit fonctionnel**
```bash
git log --oneline -5
git reset --hard <commit-hash>
```

---

## ✅ APRÈS COMMIT

### **1. Vérifier GitHub Actions**
- Attend 2-5 minutes
- Check: https://github.com/dlnraja/com.tuya.zigbee/actions

### **2. Tester localement**
```bash
homey app run
```

### **3. Créer tag version**
```bash
git tag v4.0.0
git push origin v4.0.0
```

---

## 📋 CHECKLIST

- [ ] Build réussi (`homey app build`)
- [ ] Validation réussie (`homey app validate --level publish`)
- [ ] Tous fichiers ajoutés (`git add -A`)
- [ ] Message commit descriptif
- [ ] Push vers master
- [ ] GitHub Actions OK
- [ ] Test local OK

---

## 🆘 SUPPORT

Si problèmes:
1. Voir `ENRICHMENT_COMPLETE.md` pour détails
2. Voir `FINAL_STATUS_v4.md` pour status
3. Voir `MIGRATION_GUIDE_v4.md` pour migration
4. Voir logs: `homey app validate --level debug`

---

*Prêt pour commit: OUI ✅*  
*Build status: READY ✅*  
*Validation status: OK (warnings only) ✅*
