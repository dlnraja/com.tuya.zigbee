# GitHub Actions Integration - Homey App Validate

## 🚀 Configuration

Ce projet intègre l'action GitHub officielle pour la validation des apps Homey.

### 📋 Action Utilisée

- **Nom**: athombv/github-action-homey-app-validate
- **Version**: v1
- **Créateur**: athombv (Verified creator)
- **Source**: [GitHub Marketplace](https://github.com/marketplace/actions/homey-app-validate)

### 🎯 Niveaux de Validation

1. **Debug** - Validation basique pour développement
2. **Publish** - Validation complète pour publication
3. **Verified** - Validation maximale pour vérification

### 📁 Workflow GitHub Actions

Le workflow est configuré dans `.github/workflows/validate-homey-app.yml`:

```yaml
name: Validate Homey App
on:
  workflow_dispatch:
  push:
  pull_request:

jobs:
  validate:
    name: Validate Homey App
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: athombv/github-action-homey-app-validate@master
        with:
          level: verified
```

### 🔧 Utilisation Locale

```bash
# Validation debug
node scripts/local-validation.js

# Validation manuelle
homey app validate --level debug
homey app validate --level publish
homey app validate --level verified
```

### 📊 Rapports

Les rapports de validation sont générés dans:
- `reports/validation-report.json`
- `reports/development-mode-report.json`

### 🎯 Intégration Mega Pipeline

La validation GitHub Actions est intégrée dans le mega-pipeline.js comme étape 17.

### 🔄 Déclencheurs

- **workflow_dispatch**: Déclenchement manuel
- **push**: Déclenchement automatique sur push
- **pull_request**: Déclenchement automatique sur PR

### 📈 Monitoring

- Validation continue
- Rapports automatiques
- Intégration CI/CD
- Fallback local

---

**Note**: Cette intégration assure une validation continue et automatisée du projet Homey.
