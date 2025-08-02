# 🏠 Guide d'Installation Homey CLI - Tuya Zigbee

## 📋 Prérequis

### Système
- Node.js >= 14.0.0
- npm >= 6.0.0
- Windows 10/11, macOS, ou Linux

### Compte Homey
- Compte Homey Cloud ou Bridge
- Accès développeur activé

## 🚀 Installation

### 1. Installer Homey CLI
```bash
npm install -g @homey/homey-cli
```

### 2. Vérifier l'installation
```bash
homey --version
```

### 3. Se connecter à Homey
```bash
homey login
```

## 🔧 Configuration

### Variables d'environnement
```bash
# Homey Cloud
export HOMEY_CLOUD_URL=https://homey.app
export HOMEY_CLOUD_TOKEN=your_token

# Homey Bridge
export HOMEY_BRIDGE_URL=http://192.168.1.100
export HOMEY_BRIDGE_TOKEN=your_token
```

### Configuration locale
```bash
# Créer le fichier de configuration
mkdir -p ~/.homey
echo '{
  "cloud": {
    "url": "https://homey.app",
    "token": "your_token"
  },
  "bridge": {
    "url": "http://192.168.1.100",
    "token": "your_token"
  }
}' > ~/.homey/config.json
```

## 📦 Commandes Utiles

### Validation d'App
```bash
# Valider la structure de l'app
homey app validate

# Valider un driver spécifique
homey app validate --driver=driver-name
```

### Installation d'App
```bash
# Installer l'app sur Homey
homey app install

# Installer en mode développement
homey app install --development
```

### Gestion des Apps
```bash
# Lister les apps installées
homey app list

# Désinstaller une app
homey app uninstall com.tuya.zigbee

# Mettre à jour une app
homey app update com.tuya.zigbee
```

### Gestion des Drivers
```bash
# Lister les drivers
homey driver list

# Installer un driver
homey driver install driver-name

# Désinstaller un driver
homey driver uninstall driver-name
```

## 🐛 Dépannage

### Problèmes Courants

#### 1. Homey CLI non reconnu
```bash
# Réinstaller globalement
npm uninstall -g @homey/homey-cli
npm install -g @homey/homey-cli

# Vérifier le PATH
echo $PATH
which homey
```

#### 2. Erreur de connexion
```bash
# Vérifier la configuration
homey config

# Se reconnecter
homey logout
homey login
```

#### 3. Erreur de validation
```bash
# Vérifier la structure
ls -la
cat app.json
cat package.json

# Valider manuellement
node -e "console.log(JSON.parse(require('fs').readFileSync('app.json')))"
```

### Logs et Debug
```bash
# Activer les logs détaillés
export DEBUG=homey:*

# Exécuter avec debug
DEBUG=homey:* homey app validate
```

## 📚 Ressources

- [Documentation Homey CLI](https://apps.homey.app/nl/app/com.homey.cli)
- [Guide Développeur Homey](https://developers.homey.app/)
- [Forum Communauté](https://community.homey.app/)

## 🆘 Support

### Contact
- **Auteur**: dlnraja
- **Email**: dylan.rajasekaram+homey@gmail.com
- **GitHub**: https://github.com/dlnraja/tuya-zigbee

### Liens Utiles
- [Issues GitHub](https://github.com/dlnraja/tuya-zigbee/issues)
- [Forum Homey](https://community.homey.app/t/app-pro-tuya-zigbee-app/26439)
- [Documentation Tuya](https://developer.tuya.com/)

---

**📅 Créé**: 30/07/2025  
**🎯 Version**: 1.0.12-20250729-1700  
**✅ Statut**: Guide complet pour installation CLI
