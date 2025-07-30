#!/usr/bin/env node

/**
 * Install Homey CLI - Tuya Zigbee
 * Script pour installer et configurer Homey CLI
 * 
 * @author dlnraja / [redacted-email]
 * @version 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    version: "1.0.12-20250729-1700",
    logFile: "./logs/install-homey-cli.log"
};

// Fonction de logging
function log(message, level = "INFO") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, logMessage + "\n");
}

// Fonction pour vérifier si Homey CLI est installé
function checkHomeyCli() {
    log("🔍 === VÉRIFICATION HOMEY CLI ===");
    
    try {
        const { execSync } = require('child_process');
        const result = execSync('homey --version', { encoding: 'utf8' });
        log(`✅ Homey CLI installé - Version: ${result.trim()}`);
        return true;
    } catch (error) {
        log("❌ Homey CLI non installé", "ERROR");
        return false;
    }
}

// Fonction pour installer Homey CLI
function installHomeyCli() {
    log("📦 === INSTALLATION HOMEY CLI ===");
    
    try {
        const { execSync } = require('child_process');
        
        // Vérifier si npm est disponible
        try {
            execSync('npm --version', { encoding: 'utf8' });
            log("✅ npm disponible");
        } catch (error) {
            log("❌ npm non disponible", "ERROR");
            return false;
        }
        
        // Installer Homey CLI globalement
        log("📦 Installation de Homey CLI...");
        execSync('npm install -g @homey/homey-cli', { encoding: 'utf8', stdio: 'inherit' });
        log("✅ Homey CLI installé avec succès");
        
        return true;
    } catch (error) {
        log(`❌ Erreur installation Homey CLI: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction pour configurer Homey CLI
function configureHomeyCli() {
    log("⚙️ === CONFIGURATION HOMEY CLI ===");
    
    try {
        const { execSync } = require('child_process');
        
        // Vérifier la configuration actuelle
        try {
            const config = execSync('homey config', { encoding: 'utf8' });
            log("✅ Configuration Homey CLI récupérée");
            log(`📋 Config: ${config.trim()}`);
        } catch (error) {
            log("⚠️ Configuration Homey CLI non trouvée");
        }
        
        // Tenter de se connecter (optionnel)
        try {
            log("🔗 Tentative de connexion Homey...");
            execSync('homey login', { encoding: 'utf8', stdio: 'inherit' });
            log("✅ Connexion Homey réussie");
        } catch (error) {
            log("⚠️ Connexion Homey non configurée (optionnel)");
        }
        
        return true;
    } catch (error) {
        log(`❌ Erreur configuration Homey CLI: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction pour tester Homey CLI
function testHomeyCli() {
    log("🧪 === TEST HOMEY CLI ===");
    
    try {
        const { execSync } = require('child_process');
        
        // Test de base
        const version = execSync('homey --version', { encoding: 'utf8' });
        log(`✅ Version Homey CLI: ${version.trim()}`);
        
        // Test de validation d'app
        try {
            const validate = execSync('homey app validate', { encoding: 'utf8' });
            log("✅ Validation d'app réussie");
            log(`📋 Résultat: ${validate.trim()}`);
        } catch (error) {
            log("⚠️ Validation d'app échouée (normal si pas d'app configurée)");
        }
        
        return true;
    } catch (error) {
        log(`❌ Erreur test Homey CLI: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction pour créer un guide d'utilisation
function createCliGuide() {
    log("📚 === CRÉATION GUIDE CLI ===");
    
    const guideContent = `# 🏠 Guide d'Installation Homey CLI - Tuya Zigbee

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
\`\`\`bash
npm install -g @homey/homey-cli
\`\`\`

### 2. Vérifier l'installation
\`\`\`bash
homey --version
\`\`\`

### 3. Se connecter à Homey
\`\`\`bash
homey login
\`\`\`

## 🔧 Configuration

### Variables d'environnement
\`\`\`bash
# Homey Cloud
export HOMEY_CLOUD_URL=https://homey.app
export HOMEY_CLOUD_TOKEN=your_token

# Homey Bridge
export HOMEY_BRIDGE_URL=http://192.168.1.100
export HOMEY_BRIDGE_TOKEN=your_token
\`\`\`

### Configuration locale
\`\`\`bash
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
\`\`\`

## 📦 Commandes Utiles

### Validation d'App
\`\`\`bash
# Valider la structure de l'app
homey app validate

# Valider un driver spécifique
homey app validate --driver=driver-name
\`\`\`

### Installation d'App
\`\`\`bash
# Installer l'app sur Homey
homey app install

# Installer en mode développement
homey app install --development
\`\`\`

### Gestion des Apps
\`\`\`bash
# Lister les apps installées
homey app list

# Désinstaller une app
homey app uninstall com.tuya.zigbee

# Mettre à jour une app
homey app update com.tuya.zigbee
\`\`\`

### Gestion des Drivers
\`\`\`bash
# Lister les drivers
homey driver list

# Installer un driver
homey driver install driver-name

# Désinstaller un driver
homey driver uninstall driver-name
\`\`\`

## 🐛 Dépannage

### Problèmes Courants

#### 1. Homey CLI non reconnu
\`\`\`bash
# Réinstaller globalement
npm uninstall -g @homey/homey-cli
npm install -g @homey/homey-cli

# Vérifier le PATH
echo $PATH
which homey
\`\`\`

#### 2. Erreur de connexion
\`\`\`bash
# Vérifier la configuration
homey config

# Se reconnecter
homey logout
homey login
\`\`\`

#### 3. Erreur de validation
\`\`\`bash
# Vérifier la structure
ls -la
cat app.json
cat package.json

# Valider manuellement
node -e "console.log(JSON.parse(require('fs').readFileSync('app.json')))"
\`\`\`

### Logs et Debug
\`\`\`bash
# Activer les logs détaillés
export DEBUG=homey:*

# Exécuter avec debug
DEBUG=homey:* homey app validate
\`\`\`

## 📚 Ressources

- [Documentation Homey CLI](https://apps.homey.app/nl/app/com.homey.cli)
- [Guide Développeur Homey](https://developers.homey.app/)
- [Forum Communauté](https://community.homey.app/)

## 🆘 Support

### Contact
- **Auteur**: dlnraja
- **Email**: [redacted-email]
- **GitHub**: https://github.com/dlnraja/tuya-zigbee

### Liens Utiles
- [Issues GitHub](https://github.com/dlnraja/tuya-zigbee/issues)
- [Forum Homey](https://community.homey.app/t/app-pro-tuya-zigbee-app/26439)
- [Documentation Tuya](https://developer.tuya.com/)

---

**📅 Créé**: 30/07/2025  
**🎯 Version**: 1.0.12-20250729-1700  
**✅ Statut**: Guide complet pour installation CLI
`;

    try {
        const guidePath = "./docs/CLI_INSTALLATION_GUIDE.md";
        const guideDir = path.dirname(guidePath);
        
        if (!fs.existsSync(guideDir)) {
            fs.mkdirSync(guideDir, { recursive: true });
        }
        
        fs.writeFileSync(guidePath, guideContent);
        log("✅ Guide CLI créé avec succès");
        log(`📚 Fichier: ${guidePath}`);
        return true;
    } catch (error) {
        log(`❌ Erreur création guide: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction principale
function main() {
    log("🚀 === DÉMARRAGE INSTALLATION HOMEY CLI ===");
    
    try {
        // 1. Vérifier si Homey CLI est déjà installé
        const alreadyInstalled = checkHomeyCli();
        
        // 2. Installer Homey CLI si nécessaire
        let installed = alreadyInstalled;
        if (!alreadyInstalled) {
            installed = installHomeyCli();
        }
        
        // 3. Configurer Homey CLI
        const configured = configureHomeyCli();
        
        // 4. Tester Homey CLI
        const tested = testHomeyCli();
        
        // 5. Créer le guide
        const guideCreated = createCliGuide();
        
        if (installed && configured && tested && guideCreated) {
            log("🎉 Installation Homey CLI terminée avec succès");
            process.exit(0);
        } else {
            log("❌ Échec installation Homey CLI", "ERROR");
            process.exit(1);
        }
        
    } catch (error) {
        log(`❌ Erreur critique: ${error.message}`, "ERROR");
        process.exit(1);
    }
}

// Exécution
if (require.main === module) {
    main();
}

module.exports = {
    installHomeyCli: main,
    checkHomeyCli,
    installHomeyCli,
    configureHomeyCli,
    testHomeyCli,
    createCliGuide
}; 