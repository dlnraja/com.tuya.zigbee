# Guide d'Installation - Version 1.2.0 (Intelligent Driver System)

## 📋 **Prérequis**
- Node.js 18 ou supérieur
- Git
- Accès au repository GitHub
- Permissions d'écriture sur le système

## 🚀 **Installation Rapide**

### 1. Cloner le Repository
```bash
git clone https://github.com/dlnraja/tuya_repair.git
cd tuya_repair
```

### 2. Installer les Dépendances
```bash
npm install
```

### 3. Vérifier la Version
```bash
node tools/version-functional-release.js --check-version 1.2.0
```

### 4. Tester la Fonctionnalité
```bash
node tools/version-functional-release.js --test-functionality 1.2.0
```

## 🔧 **Installation Détaillée**

### Composants Fonctionnels

#### intelligent-driver-system.json
```bash
# Vérifier l'existence
ls -la tools/intelligent-driver-system.json

# Tester la fonctionnalité
node tools/intelligent-driver-system.json --test
```


#### intelligent-driver-determination.yml
```bash
# Vérifier l'existence
ls -la tools/intelligent-driver-determination.yml

# Tester la fonctionnalité
node tools/intelligent-driver-determination.yml --test
```


#### test-intelligent-system.js
```bash
# Vérifier l'existence
ls -la tools/test-intelligent-system.js

# Tester la fonctionnalité
node tools/test-intelligent-system.js --test
```


#### dynamic-repo-recognition.ps1
```bash
# Vérifier l'existence
ls -la tools/dynamic-repo-recognition.ps1

# Tester la fonctionnalité
node tools/dynamic-repo-recognition.ps1 --test
```


### Workflows GitHub Actions

#### Workflow 1
```yaml
# Vérifier la configuration
cat .github/workflows/workflow-1.yml

# Tester le workflow
gh workflow run workflow-1
```


#### Workflow 2
```yaml
# Vérifier la configuration
cat .github/workflows/workflow-2.yml

# Tester le workflow
gh workflow run workflow-2
```


#### Workflow 3
```yaml
# Vérifier la configuration
cat .github/workflows/workflow-3.yml

# Tester le workflow
gh workflow run workflow-3
```


#### Workflow 4
```yaml
# Vérifier la configuration
cat .github/workflows/workflow-4.yml

# Tester le workflow
gh workflow run workflow-4
```


#### Workflow 5
```yaml
# Vérifier la configuration
cat .github/workflows/workflow-5.yml

# Tester le workflow
gh workflow run workflow-5
```


#### Workflow 6
```yaml
# Vérifier la configuration
cat .github/workflows/workflow-6.yml

# Tester le workflow
gh workflow run workflow-6
```


#### Workflow 7
```yaml
# Vérifier la configuration
cat .github/workflows/workflow-7.yml

# Tester le workflow
gh workflow run workflow-7
```


## 🧪 **Tests de Validation**

### Test de Fonctionnalité
```bash
node tools/version-functional-release.js --verify 1.2.0
```

### Test de Performance
```bash
node tools/version-functional-release.js --benchmark 1.2.0
```

### Test de Compatibilité
```bash
node tools/version-functional-release.js --compatibility 1.2.0
```

## 🔄 **Migration depuis les Versions Précédentes**

### Migration depuis 1.2.0
```bash
# Sauvegarder les données existantes
cp -r drivers drivers_backup_1.2.0

# Mettre à jour vers 1.3.0
git pull origin master
npm install

# Vérifier la migration
node tools/version-functional-release.js --migrate 1.2.0 1.3.0
```

### Migration depuis 1.1.0
```bash
# Sauvegarder les données existantes
cp -r drivers drivers_backup_1.1.0

# Mettre à jour vers 1.3.0
git pull origin master
npm install

# Vérifier la migration
node tools/version-functional-release.js --migrate 1.1.0 1.3.0
```

## 🛠️ **Configuration**

### Configuration de Base
```javascript
// config/version-1.2.0.json
{
  "version": "1.2.0",
  "codename": "Intelligent Driver System",
  "release_date": "2025-01-28",
  "functional_components": [
  "intelligent-driver-system.json",
  "intelligent-driver-determination.yml",
  "test-intelligent-system.js",
  "dynamic-repo-recognition.ps1"
],
  "features": [
  "Intelligent driver determination",
  "Exhaustive manufacturer support",
  "Confidence-based strategies",
  "Fallback mechanisms",
  "Dynamic repository recognition",
  "Multi-language support"
]
}
```

### Configuration Avancée
```javascript
// config/advanced-1.2.0.json
{
  "performance": {
    "optimization": true,
    "caching": true,
    "compression": true
  },
  "security": {
    "validation": true,
    "encryption": true,
    "audit": true
  },
  "monitoring": {
    "logs": true,
    "metrics": true,
    "alerts": true
  }
}
```

## 📊 **Validation de l'Installation**

### Vérification des Composants
```bash
# Liste des composants installés
node tools/version-functional-release.js --list-components 1.2.0
```

### Vérification des Fonctionnalités
```bash
# Liste des fonctionnalités actives
node tools/version-functional-release.js --list-features 1.2.0
```

### Vérification des Drivers
```bash
# Nombre de drivers disponibles
node tools/version-functional-release.js --count-drivers 1.2.0
```

## 🚨 **Dépannage**

### Problèmes Courants
1. **Erreur de dépendances**: `npm install --force`
2. **Erreur de permissions**: `sudo npm install`
3. **Erreur de version Node.js**: Mettre à jour vers Node.js 18+
4. **Erreur de Git**: Vérifier les permissions Git

### Logs de Diagnostic
```bash
# Générer les logs de diagnostic
node tools/version-functional-release.js --diagnose 1.2.0

# Analyser les logs
cat logs/diagnostic-1.2.0.log
```

## 📞 **Support**

### Documentation
- [Guide d'utilisation](docs/user-guide.md)
- [API Reference](docs/api-reference.md)
- [FAQ](docs/faq.md)

### Contact
- Email: [redacted-email]
- GitHub: [dlnraja](https://github.com/dlnraja)
- Issues: [GitHub Issues](https://github.com/dlnraja/tuya_repair/issues)

---
**Guide généré automatiquement pour la version 1.2.0**
