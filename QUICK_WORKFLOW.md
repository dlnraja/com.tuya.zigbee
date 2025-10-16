# ⚡ WORKFLOW RAPIDE - RÉFÉRENCE QUOTIDIENNE

---

## 🎯 WORKFLOW EN 3 ÉTAPES

```bash
# 1. VALIDER EN LOCAL
homey app validate --level publish

# 2. COMMIT & PUSH
git add -A
git commit -m "Votre message"
git push origin master

# 3. GITHUB ACTIONS FAIT LE RESTE!
# ✅ Validate → Version bump → Publish
# ⏱️ Durée: ~3 minutes
```

---

## ✅ UTILISER EN LOCAL

```bash
homey app build                    # ✅ OK (build)
homey app validate --level publish # ✅ OK (validation)
```

---

## ❌ NE JAMAIS UTILISER EN LOCAL

```bash
homey app publish      # ❌ GitHub Actions le fait!
homey app version      # ❌ GitHub Actions le fait!
```

---

## 🔗 LIENS UTILES

**GitHub Actions:**  
https://github.com/dlnraja/com.tuya.zigbee/actions

**Homey Dashboard:**  
https://tools.developer.homey.app/apps

---

## 📊 MONITORING

```bash
# Voir le dernier run
gh run list --limit 1

# Status du workflow
gh run list --workflow=homey-official-publish.yml --limit 1
```

---

**Workflow File:** `.github/workflows/homey-official-publish.yml`  
**Doc Complète:** `WORKFLOW_GUIDE.md`
