# 🚀 GUIDE COMPLET - PUBLICATION VIA GITHUB ACTIONS

**Date:** 2025-01-09 06:10 UTC+01:00  
**Version:** v4.9.321  
**Méthode:** Workflows GitHub Actions officiels Athom

---

## 📋 **WORKFLOWS DISPONIBLES**

### **1. Validate → Fix → Publish** ⭐ RECOMMANDÉ
**Fichier:** `.github/workflows/validate-fix-publish.yml`  
**Trigger:** Manuel uniquement

**Ce workflow fait TOUT automatiquement:**
1. 🧹 **Cleanup intelligent** - Archive fichiers legacy
2. ✅ **Validation officielle** - Action Athom `homey-app-validate`
3. 🔧 **Auto-fix erreurs** - Corrige automatiquement
4. 🚀 **Publication** - Action Athom `homey-app-publish`
5. 📊 **Rapports complets** - Cleanup + Validation + Publication

**Comment l'utiliser:**

```
1. Va sur: https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/validate-fix-publish.yml

2. Clique: "Run workflow" (bouton en haut à droite)

3. Configure:
   - Branch: master ✅
   - Force publish: false (ou true si validation échoue)
   - Channel: test (ou live pour production)

4. Clique: "Run workflow"

5. Attends 5-10 minutes - TOUT est automatique!
```

**Résultat:**
- ✅ Repo nettoyé (fichiers legacy archivés)
- ✅ App validée (niveau publish)
- ✅ Erreurs corrigées automatiquement
- ✅ App publiée sur Homey App Store
- ✅ GitHub Release créée
- ✅ Rapports disponibles en artifacts

---

### **2. Homey App Store Publisher**
**Fichier:** `.github/workflows/homey-publish.yml`  
**Trigger:** Push tag `v*` (ex: `v4.9.321`)

**Usage simple:**
```bash
git tag -a v4.9.321 -m "Release v4.9.321"
git push origin v4.9.321
```

**Le workflow:**
- Valide l'app
- Build l'app
- Publie sur Homey App Store
- Crée GitHub Release

---

### **3. Auto Organize Root**
**Fichier:** `.github/workflows/auto-organize.yml`  
**Trigger:** Push sur master (automatique)

**Ce qu'il fait:**
- Nettoie la racine du projet
- Organise fichiers par catégorie
- Valide après organisation
- Commit si validation OK

---

## 🔑 **PRÉREQUIS CRITIQUE: HOMEY_PAT**

**TOUS** les workflows de publication nécessitent le secret `HOMEY_PAT`.

### **Comment le configurer (1× seulement):**

#### **Étape 1: Créer le token Homey**
1. Va sur: **https://developer.athom.com/tools/tokens**
2. Login avec ton compte Athom
3. Clique: **"Generate Personal Access Token"**
4. Configure:
   - **Name:** `GitHub Actions Publisher`
   - **Permissions:** ✅ **App Store Publisher**
   - **Expiration:** 1 year (ou Never)
5. Clique: **"Generate token"**
6. **COPIE LE TOKEN** immédiatement!
   - Format: `homey_pat_abc123def456...`
   - ⚠️ Tu ne pourras plus le voir après!

#### **Étape 2: Ajouter le secret sur GitHub**
1. Va sur: **https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions**
2. Clique: **"New repository secret"**
3. Configure:
   - **Name:** `HOMEY_PAT` (exactement ce nom!)
   - **Secret:** Colle le token Homey copié
4. Clique: **"Add secret"**

**✅ C'est fait! Le secret est maintenant disponible pour tous les workflows!**

---

## 📊 **WORKFLOW RECOMMANDÉ: VALIDATE → FIX → PUBLISH**

### **Pourquoi ce workflow?**

| Avantage | Description |
|----------|-------------|
| ✅ **Tout-en-un** | Cleanup + Validate + Fix + Publish en 1 clic |
| ✅ **Intelligent** | Auto-fix des erreurs courantes |
| ✅ **Sécurisé** | Validation avant publication |
| ✅ **Propre** | Nettoyage automatique du repo |
| ✅ **Officiel** | Utilise actions Athom validées |
| ✅ **Rapports** | Artifacts pour chaque étape |

---

### **Étapes détaillées du workflow:**

#### **Job 1: Cleanup & Organization 🧹**
```yaml
Durée: ~1 minute

Actions:
1. Checkout repo
2. Déplace fichiers legacy vers archive/:
   - CRITICAL_FIX_v4.9.279.js → archive/legacy-scripts/
   - EMERGENCY_FIX_v4.9.276.js → archive/legacy-scripts/
   - ULTRA_FIX_v4.9.277.js → archive/legacy-scripts/
   - *.bat → tools/bat-scripts/
   - ROOT_ORGANIZATION.md → archive/old-docs/
   - lib_backup_* → archive/
3. Commit changements
4. Push vers master

Résultat:
✅ Repo propre et organisé
✅ Fichiers essentiels uniquement à la racine
```

#### **Job 2: Validate App ✅**
```yaml
Durée: ~2 minutes

Actions:
1. Checkout master (après cleanup)
2. Install dependencies (npm ci --production)
3. Validate avec action officielle Athom:
   - Level: publish (le plus strict)
   - Check app.json structure
   - Check drivers/ directory
   - Check all required files

Résultat:
✅ validation_status: success/failure
✅ has_errors: true/false
✅ Rapport validation en artifact
```

#### **Job 3: Auto-Fix Errors 🔧**
```yaml
Durée: ~2 minutes
Condition: Si validation a échoué

Actions:
1. Regenerate app.json via homey build
2. Validate package.json structure
3. Reinstall dependencies si corrupted
4. Re-validate après fixes

Fixes automatiques:
✅ app.json regeneration
✅ package.json validation
✅ node_modules cleanup
✅ Homey compose rebuild

Résultat:
✅ Erreurs corrigées automatiquement
✅ Commit des fixes
✅ Re-validation
```

#### **Job 4: Publish to Homey 🚀**
```yaml
Durée: ~3 minutes
Condition: Si validation OK OU force_publish=true

Actions:
1. Checkout master (après cleanup + fixes)
2. Install dependencies + Homey CLI
3. Build app (homey app build)
4. Publish via action officielle Athom:
   - Uses: athombv/github-action-homey-app-publish@master
   - Requires: HOMEY_PAT secret
   - Channel: test (défaut) ou live (si spécifié)
5. Create GitHub Release
6. Upload rapport publication

Résultat:
✅ App publiée sur Homey App Store!
✅ GitHub Release créée
✅ Disponible en 15-30 min
```

#### **Job 5: Final Report 📊**
```yaml
Durée: ~30 secondes
Condition: Toujours (always)

Actions:
1. Collecte résultats de tous les jobs
2. Génère rapport final complet
3. Affiche dans Summary GitHub Actions

Résultat:
✅ Vue d'ensemble complète
✅ Status de chaque étape
✅ Timeline complète
```

---

## 🎯 **UTILISATION PRATIQUE**

### **Scénario 1: Première publication (avec cleanup)**

```
1. Va sur:
   https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/validate-fix-publish.yml

2. Clique: "Run workflow"

3. Configure:
   - Branch: master
   - Force publish: false
   - Channel: test

4. Clique: "Run workflow"

5. Attends 8-10 minutes

Résultat:
✅ Repo nettoyé
✅ App validée
✅ App publiée en Test channel
✅ Prêt pour monitoring 24-48h
```

---

### **Scénario 2: Publication urgente (force publish)**

Si validation échoue mais tu veux publier quand même:

```
1. Run workflow avec:
   - Force publish: true ⚠️
   - Channel: test (ou live si très urgent)

2. Le workflow va:
   - Nettoyer quand même
   - Essayer d'auto-fix
   - Publier même si erreurs mineures

⚠️ Utilise force publish uniquement si:
- Erreurs mineures non-bloquantes
- Fix urgent pour users
- Tu as testé manuellement
```

---

### **Scénario 3: Publication Live (production)**

Après monitoring 24-48h en Test channel:

```
1. Run workflow avec:
   - Branch: master
   - Force publish: false
   - Channel: live ⭐

2. Le workflow va:
   - Nettoyer repo
   - Valider strictement
   - Publier en Live channel
   - Tous users auront la mise à jour

Timeline:
- 0-5 min: Workflow complet
- 5-15 min: Indexation Homey
- 15-30 min: Disponible pour tous users
```

---

## 📁 **ARTIFACTS GÉNÉRÉS**

Chaque run du workflow crée des artifacts téléchargeables:

| Artifact | Contenu | Rétention |
|----------|---------|-----------|
| `cleanup-report` | Fichiers déplacés, changements | 30 jours |
| `validation-report` | Résultats validation Athom | 30 jours |
| `publish-report` | Version, channel, URL manage | 90 jours |

**Comment les télécharger:**
1. Va sur le run du workflow
2. Scroll en bas de la page
3. Section "Artifacts"
4. Clique pour télécharger

---

## 🔍 **MONITORING POST-PUBLICATION**

### **Immédiat (0-30 min):**
1. **Vérifie Homey Developer Dashboard:**
   - https://developer.athom.com
   - Apps → Universal Tuya Zigbee
   - Versions → v4.9.321 devrait apparaître

2. **Vérifie GitHub Release:**
   - https://github.com/dlnraja/com.tuya.zigbee/releases
   - Release v4.9.321 créée automatiquement

---

### **Court terme (24-48h):**
1. **Monitor diagnostic reports:**
   - Dashboard → Diagnostics
   - Vérifie aucun nouveau crash

2. **Collecte feedback:**
   - Forum Homey Community
   - GitHub Issues
   - Email users

3. **Vérifie métriques:**
   - Crash rate < 1%
   - Energy-KPI: 0 crash
   - Zigbee retry: succès

---

### **Promotion Live (après 48h):**

Si Test channel stable:

**Option A: Re-run workflow avec channel=live**
```
1. Actions → Validate → Fix → Publish
2. Run workflow
3. Channel: live
```

**Option B: Promote manuellement via Dashboard**
```
1. https://developer.athom.com
2. Apps → Universal Tuya Zigbee → Versions
3. v4.9.321 → Promote to Live
```

---

## 🆘 **TROUBLESHOOTING**

### **Workflow échoue au Job "Cleanup"**
```
Cause probable:
- Conflits git
- Permissions insuffisantes

Solution:
1. Pull master localement
2. Résous conflits
3. Push
4. Re-run workflow
```

---

### **Workflow échoue au Job "Validate"**
```
Cause probable:
- app.json invalide
- Fichiers manquants
- Structure incorrecte

Solution:
1. Vérifie logs du job "Validate"
2. Lis erreur exacte
3. Si auto-fix n'a pas marché → fix manuellement
4. Commit + push
5. Re-run workflow
```

---

### **Workflow échoue au Job "Publish"**
```
Erreur: "personal_access_token is required"

Solution:
1. HOMEY_PAT secret manquant
2. Suis les étapes "PRÉREQUIS CRITIQUE" ci-dessus
3. Re-run workflow après ajout du secret
```

---

### **App publiée mais ne s'affiche pas**
```
Cause:
- Délai d'indexation Homey (15-30 min)

Solution:
1. Attends 30 minutes
2. Refresh Homey Developer Dashboard
3. Check email Athom pour confirmation
```

---

## ✅ **CHECKLIST COMPLÈTE**

### **Avant première utilisation:**
- [ ] HOMEY_PAT secret créé et ajouté
- [ ] Compte Athom actif
- [ ] App v4.9.321 prête (code committé)

### **Lancement workflow:**
- [ ] Workflow "Validate → Fix → Publish" lancé
- [ ] Channel sélectionné (test recommandé)
- [ ] Force publish = false (sauf urgence)

### **Pendant exécution (8-10 min):**
- [ ] Job Cleanup: ✅ Success
- [ ] Job Validate: ✅ Success (ou auto-fixed)
- [ ] Job Publish: ✅ Success
- [ ] Artifacts générés

### **Après publication:**
- [ ] App visible dans Dashboard (30 min)
- [ ] GitHub Release créée
- [ ] Email confirmation Athom reçu
- [ ] User diagnostic 2cc6d9e1 contacté

### **Monitoring (24-48h):**
- [ ] Aucun nouveau crash Energy-KPI
- [ ] Aucun nouveau crash Zigbee
- [ ] Feedback users positif
- [ ] Métriques stables

### **Promotion Live:**
- [ ] Test channel stable 48h
- [ ] Re-run workflow avec channel=live
- [ ] OU promote manuellement via Dashboard
- [ ] Annonce publique (forum, release notes)

---

## 🎉 **RÉSUMÉ EXÉCUTIF**

### **Comment publier v4.9.321 en 3 clics:**

```
1. CLIQUE: https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/validate-fix-publish.yml

2. CLIQUE: "Run workflow"

3. CLIQUE: "Run workflow" (confirmer)

✅ FAIT! Tout le reste est automatique!

- Cleanup ✅
- Validation ✅
- Auto-fix ✅
- Publication ✅
- Release ✅

Durée: 8-10 minutes
Résultat: App publiée sur Homey App Store!
```

---

**Date:** 2025-01-09 06:10 UTC+01:00  
**Status:** ✅ Workflow prêt à l'emploi  
**Next action:** Lancer le workflow! 🚀
