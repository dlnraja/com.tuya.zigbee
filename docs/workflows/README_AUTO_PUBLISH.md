#  Publication Automatique - Configuration

##  Workflow Actif: `auto-publish-on-push.yml`

###  Comment Ça Marche

**À CHAQUE PUSH sur `master`:**

1.  **Détection automatique des changements**
   - Vérifie si du CODE a changé (lib/, drivers/, app.js, app.json, etc.)
   - Ignore les changements de documentation uniquement

2.  **Si CODE modifié:**
   - Valide l'app (`homey app validate --level publish`)
   - Publie automatiquement sur Homey App Store
   - Crée un tag Git (v4.9.299)
   - Disponible en 15-30 minutes

3.  **Si SEULEMENT docs modifiées:**
   - Skip la publication
   - Message: "Only documentation changed"
   - Pas de build inutile

---

##  Fichiers Ignorés (Publication Skippée)

### Documentation:
- `**.md` (tous les Markdown)
- `docs/**`
- `README*`
- `CHANGELOG*`
- `LICENSE*`

### Scripts & Outils:
- `scripts/**`
- `tools/**`
- `*.bat`, `*.ps1`, `*.sh`

### Dossiers Auxiliaires:
- `achievements/`, `analysis/`, `audit/`, `automation/`
- `backup/`, `commits/`, `communication/`, `community/`
- `debug/`, `deployments/`, `diagnostics/`, `enrichment/`
- `fixes/`, `forum/`, `guides/`, `instructions/`
- `matrix/`, `misc/`, `orchestrator/`, `organized/`
- `planning/`, `project-data/`, `reports/`, `research/`
- `stats/`, `summaries/`, `support/`, `technical/`
- `templates/`, `troubleshooting/`, `users/`, `workflow/`

---

##  Fichiers Déclenchant la Publication

### Code Critique:
-  `lib/**` (toute la logique)
-  `drivers/**` (tous les drivers)
-  `app.js` (bootstrap)
-  `app.json` (manifest)
-  `locales/**` (traductions)
-  `assets/images/**` (icônes devices)
-  `.homeycompose/**` (composition)

**Si un de ces fichiers change  PUBLICATION AUTOMATIQUE**

---

##  Workflows Disponibles

| Workflow | Trigger | Status | Usage |
|----------|---------|--------|-------|
| **auto-publish-on-push.yml** | Push master |  **ACTIF** | Publication auto |
| validate.yml | Push/PR |  Actif | Validation seule |
| auto-organize.yml | Push master |  Actif | Nettoyage repo |
| auto-fix.yml | Push master |  Actif | Fix automatiques |
| version-bump.yml | Manual |  Actif | Incrémente version |
| publish.yml | Release/Manual |  **DISABLED** | Ancien système |
| homey-publish.yml | Tags v* |  Disabled | Ancien système |

---

##  Exemples

###  CAS 1: Modification de Code
```bash
# Modifications
git add lib/devices/BaseHybridDevice.js
git add drivers/climate_monitor/device.js
git commit -m "fix: cluster registration"
git push origin master

# Résultat
  Code changed detected
  Validate app
  Publish to Homey App Store
  Create tag v4.9.299
  Available in 15-30 min
```

###  CAS 2: Modification Documentation Seule
```bash
# Modifications
git add README.md
git add docs/GUIDE.md
git commit -m "docs: update README"
git push origin master

# Résultat
  Only docs changed
  Skip publish
  No unnecessary build
```

###  CAS 3: Code + Docs
```bash
# Modifications
git add lib/clusterUtils.js
git add README.md
git commit -m "feat: add safe cluster utils + update docs"
git push origin master

# Résultat
  Code changed detected (lib/)
  Publish to Homey App Store
  Available in 15-30 min
```

---

##  Configuration Requise

### Secret GitHub: `HOMEY_PAT`

**Déjà configuré** 

Pour vérifier:
1. https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
2. Chercher `HOMEY_PAT`
3. Si manquant, obtenir avec:
   ```bash
   homey login
   # Token sera dans ~/.homey/config.json
   ```

---

##  Logs & Monitoring

### Voir les Runs:
```bash
gh run list --limit 10
```

### Voir les Détails:
```bash
gh run view <RUN_ID> --log
```

### Surveiller en Temps Réel:
```bash
gh run watch <RUN_ID>
```

---

##  Troubleshooting

### Problème: Publication ne se déclenche pas

**Vérifier:**
```bash
# 1. Vérifier les fichiers modifiés
git diff --name-only HEAD^..HEAD

# 2. Vérifier si ignorés
grep -E '^(lib/|drivers/|app\.js|app\.json)' <<< "$(git diff --name-only HEAD^..HEAD)"

# 3. Voir les runs
gh run list --limit 5
```

### Problème: Erreur "HOMEY_PAT not set"

**Solution:**
1. Aller sur GitHub  Settings  Secrets  Actions
2. Ajouter `HOMEY_PAT` avec votre token Homey
3. Re-run le workflow

### Problème: Tag déjà existe

**Normal**  Le workflow skip le tag s'il existe déjà.

---

##  Avantages du Nouveau Système

| Feature | Ancien | Nouveau |
|---------|--------|---------|
| **Trigger** | Manual/Tag |  **Auto sur push** |
| **Détection code** |  Non |  **Oui** |
| **Skip docs** |  Non |  **Oui** |
| **Validation** |  Manual |  **Auto** |
| **Tagging** |  Manual |  **Auto** |
| **Feedback** |  Limité |  **Complet** |

---

##  Changelog

### v2.0 (2025-11-06)
-  Publication automatique sur chaque push
-  Détection intelligente code vs docs
-  Skip automatique si docs seules
-  Tagging automatique
-  Validation avant publish
-  Désactivation ancien système (tags)

### v1.0 (précédent)
- Manual workflow dispatch
- Tag-based triggering
- No smart detection

---

##  Migration Complète

**Ancien système désactivé:**
-  `.github/workflows/publish.yml.disabled`
-  `.github/workflows/homey-publish.yml.disabled`

**Nouveau système actif:**
-  `.github/workflows/auto-publish-on-push.yml`

**Aucune action manuelle requise** - tout est automatique maintenant ! 
