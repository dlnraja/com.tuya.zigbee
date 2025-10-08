# 📘 Guide de Publication - Tuya Zigbee App

## 🚀 Méthodes de Publication

### ⭐ Méthode Recommandée: GitHub Actions (Automatique)

**Avantages:**
- ✅ 100% automatisé
- ✅ Validation SDK3 intégrée
- ✅ Versioning intelligent
- ✅ Changelog automatique depuis commits
- ✅ GitHub Release créée
- ✅ Pas d'installation locale requise

**Comment:**
1. Modifier votre code localement
2. Commit avec message formaté:
   ```bash
   git commit -m "feat: nouvelle fonctionnalité"  # → version minor
   git commit -m "fix: correction bug"            # → version patch
   git commit -m "BREAKING: changement majeur"    # → version major
   ```
3. Push vers master:
   ```bash
   git push origin master
   ```
4. Le workflow **publish-auto.yml** se déclenche automatiquement!

**Script Windows:**
```batch
PUBLISH-GITHUB.bat
```
- Guide interactif
- Génération d'images optionnelle
- Validation locale optionnelle
- Push automatique vers GitHub
- Monitoring inclus

---

### 📋 Méthode Manuelle: GitHub UI

**Quand l'utiliser:**
- Déploiement urgent
- Contrôle précis de la version
- Test de workflow

**Comment:**
1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/actions
2. Sélectionner **"Manual Publish to Homey"**
3. Click **"Run workflow"**
4. Choisir:
   - Version: `patch` / `minor` / `major`
   - Changelog: Description des changements
5. Click **"Run workflow"**

---

## 🔧 Configuration Requise

### Secret GitHub: HOMEY_PAT

**Obtenir le token:**
1. Aller sur: https://tools.developer.homey.app/me
2. Copier le **Personal Access Token**

**Ajouter sur GitHub:**
1. Repository → **Settings**
2. **Secrets and variables** → **Actions**
3. **New repository secret**
4. Name: `HOMEY_PAT`
5. Value: Coller le token
6. **Add secret**

---

## 📊 Workflows Disponibles

### 1. `publish-auto.yml` - Publication Automatique
**Déclencheur:** Push sur master  
**Actions:**
1. ✅ Validation SDK3
2. 📋 Génération changelog depuis commits
3. 🔢 Détection version automatique
4. 🆙 Update version + changelog
5. 💾 Commit + tag [skip ci]
6. 🚀 Publication Homey App Store
7. 📦 GitHub Release

**Format commits pour version auto:**
- `fix:`, `docs:`, `style:` → **patch** (1.0.X)
- `feat:`, `feature:`, `minor:` → **minor** (1.X.0)
- `BREAKING:`, `major:` → **major** (X.0.0)

---

### 2. `manual-publish.yml` - Publication Manuelle
**Déclencheur:** workflow_dispatch (manuel)  
**Actions:**
1. ✅ Validation SDK3
2. 🆙 Update version (choix utilisateur)
3. 📝 Changelog (saisi par utilisateur)
4. 💾 Commit + tag [skip ci]
5. 🚀 Publication Homey App Store
6. 📦 GitHub Release

**Avantages:**
- Contrôle total de la version
- Changelog personnalisé
- Déploiement sur demande

---

### 3. `monthly-auto-enrichment.yml` - Enrichissement Mensuel
**Déclencheur:** Cron (1er du mois à 02:00 UTC)  
**Actions:**
1. 🌐 Enrichissement données externes
2. 🔄 Mise à jour productIds
3. 📊 Rapports d'enrichissement

**Pas de publication automatique** - Crée une PR pour review.

---

## 🎯 Actions Homey Officielles

### athombv/github-action-homey-app-validate
**Usage:**
```yaml
- uses: athombv/github-action-homey-app-validate@master
  with:
    level: publish  # debug, publish, verified
```

**Ce qu'elle fait:**
- Valide app.json
- Vérifie les drivers
- Contrôle les images (tailles SDK3)
- Teste la compatibilité

---

### athombv/github-action-homey-app-version
**Usage:**
```yaml
- uses: athombv/github-action-homey-app-version@master
  id: update_version
  with:
    version: patch  # patch, minor, major, ou semver (1.2.3)
    changelog: "Description des changements"
```

**Outputs:**
- `version`: Nouvelle version (ex: 1.2.3)
- `changelog`: Changelog en anglais

---

### athombv/github-action-homey-app-publish
**Usage:**
```yaml
- uses: athombv/github-action-homey-app-publish@master
  id: publish
  with:
    personal_access_token: ${{ secrets.HOMEY_PAT }}
```

**Outputs:**
- `url`: URL Homey Developer Dashboard

---

## 🐛 Troubleshooting

### ❌ Validation échoue

**Causes:**
- Images incorrectes (tailles non-SDK3)
- app.json invalide
- Drivers mal configurés

**Solution:**
```bash
# Local
homey app validate --level publish

# Voir les erreurs détaillées
```

**Images SDK3:**
- App: 250x175, 500x350, 1000x700
- Driver: 75x75, 500x500, 1000x1000

---

### ❌ Publication échoue

**Causes:**
- `HOMEY_PAT` manquant ou invalide
- Version déjà publiée
- Validation non passée

**Solutions:**
1. Vérifier secret `HOMEY_PAT`
2. Vérifier token: https://tools.developer.homey.app/me
3. Incrémenter la version manuellement

---

### ❌ Pas de changelog

**Causes:**
- Aucun commit depuis dernier tag
- Format commit incorrect

**Solutions:**
1. Vérifier tags: `git tag -l`
2. Vérifier commits: `git log --oneline`
3. Utiliser format: `feat:`, `fix:`, etc.

---

## 📈 Monitoring

### GitHub Actions
https://github.com/dlnraja/com.tuya.zigbee/actions

**Statuts:**
- 🟢 Vert = Succès
- 🟡 Jaune = En cours
- 🔴 Rouge = Échec

### Homey Dashboard
https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee

**Vérifier:**
- Version publiée
- Statut review
- Statistiques téléchargement

### App Store
https://homey.app/apps/com.dlnraja.tuya.zigbee

**Visible par:**
- Utilisateurs finaux
- Recherche Homey App Store

---

## 📁 Structure Projet

```
tuya_repair/
├── .github/
│   └── workflows/
│       ├── publish-auto.yml          # ⭐ Principal - Auto
│       ├── manual-publish.yml        # 📋 Manuel
│       ├── monthly-auto-enrichment.yml  # 🗓️ Mensuel
│       └── WORKFLOWS.md              # 📖 Documentation
│
├── drivers/                          # 163 drivers
│   └── [driver_name]/
│       ├── assets/
│       │   ├── small.png            # 75x75 ✅
│       │   ├── large.png            # 500x500 ✅
│       │   └── xlarge.png           # 1000x1000 ✅
│       ├── device.js
│       └── driver.compose.json
│
├── assets/
│   └── images/
│       ├── small.png                 # 250x175 ✅
│       ├── large.png                 # 500x350 ✅
│       └── xlarge.png                # 1000x700 ✅
│
├── scripts/
│   ├── SMART_IMAGE_GENERATOR.js     # Génération images
│   ├── FIX_ALL_IMAGES.js            # Correction images
│   └── VERIFY_IMAGES_COHERENCE.js   # Vérification
│
├── PUBLISH-GITHUB.bat                # 🪟 Script Windows
├── PUBLICATION_GUIDE.md              # 📘 Ce document
└── app.json                          # Configuration app
```

---

## 🎓 Best Practices

### Commits
```bash
# Bon ✅
git commit -m "feat: add new temperature sensor driver"
git commit -m "fix: correct image dimensions for SDK3"
git commit -m "docs: update README with new features"

# Mauvais ❌
git commit -m "update"
git commit -m "changes"
git commit -m "wip"
```

### Versions
- **Patch (1.0.X):** Bug fixes, corrections mineures
- **Minor (1.X.0):** Nouvelles fonctionnalités compatibles
- **Major (X.0.0):** Changements incompatibles, refonte

### Tests Avant Push
```bash
# 1. Validation
homey app validate --level publish

# 2. Build
homey app build

# 3. Test local (optionnel)
homey app install
```

---

## 🔗 Liens Utiles

- **GitHub Repo:** https://github.com/dlnraja/com.tuya.zigbee
- **GitHub Actions:** https://github.com/dlnraja/com.tuya.zigbee/actions
- **Homey Developer:** https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
- **App Store:** https://homey.app/apps/com.dlnraja.tuya.zigbee
- **Homey SDK3 Docs:** https://apps.developer.homey.app/the-basics/getting-started
- **Actions Marketplace:** https://github.com/marketplace?query=homey

---

## 💡 FAQ

**Q: Puis-je publier sans GitHub Actions?**  
A: Oui, via `homey app publish` en local, mais moins pratique.

**Q: Comment tester avant publication?**  
A: Utilisez `homey app validate` et `homey app build` localement.

**Q: Le workflow est bloqué, que faire?**  
A: Vérifier les logs GitHub Actions, souvent c'est `HOMEY_PAT`.

**Q: Puis-je annuler une publication?**  
A: Non, mais vous pouvez publier une nouvelle version immédiatement.

**Q: Combien de temps pour la review Athom?**  
A: Variable, de quelques heures à plusieurs jours.

---

**✨ Bonne publication!** 🚀
