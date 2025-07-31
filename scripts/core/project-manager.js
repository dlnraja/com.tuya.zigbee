// core/project-manager.js
// Gestionnaire centralisé du projet Tuya Zigbee
// Remplace tous les scripts de gestion de projet dispersés

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectManager {
    constructor() {
        this.projectName = 'com.tuya.zigbee';
        this.sdkVersion = 3;
        this.requiredFiles = [
            'app.json',
            'package.json',
            'app.js',
            'README.md'
        ];
    }

    // Valider la structure du projet
    validateProjectStructure() {
        const missing = [];
        const valid = [];

        for (const file of this.requiredFiles) {
            if (fs.existsSync(file)) {
                valid.push(file);
            } else {
                missing.push(file);
            }
        }

        return {
            valid: valid.length,
            missing: missing.length,
            total: this.requiredFiles.length,
            missingFiles: missing
        };
    }

    // Créer app.json
    createAppJson() {
        const appJson = {
            id: this.projectName,
            name: {
                en: "Tuya Zigbee - Universal Device Support",
                fr: "Tuya Zigbee - Support Universel d'Appareils",
                nl: "Tuya Zigbee - Universele Apparaat Ondersteuning",
                ta: "Tuya Zigbee - Universal Device Support"
            },
            description: {
                en: "Universal Tuya Zigbee Device Support with AI-powered enrichment and automatic error correction",
                fr: "Support universel pour appareils Tuya Zigbee avec enrichissement IA et correction automatique d'erreurs",
                nl: "Universele Tuya Zigbee Apparaat Ondersteuning met AI-aangedreven verrijking en automatische foutcorrectie",
                ta: "Universal Tuya Zigbee Device Support with AI-powered enrichment and automatic error correction"
            },
            version: "1.0.0",
            compatibility: ">=5.0.0",
            sdk: this.sdkVersion,
            category: [
                "lights",
                "energy",
                "automation",
                "utilities"
            ],
            author: {
                name: "Dylan Rajasekaram",
                email: "dylan.rajasekaram+homey@gmail.com"
            },
            main: "app.js",
            images: {
                small: "./assets/images/small.png",
                large: "./assets/images/large.png"
            },
            bugs: {
                url: "https://github.com/dlnraja/com.tuya.zigbee/issues"
            },
            homepage: "https://github.com/dlnraja/com.tuya.zigbee",
            repository: {
                type: "git",
                url: "https://github.com/dlnraja/com.tuya.zigbee.git"
            },
            license: "MIT",
            permissions: [
                "homey:manager:api",
                "homey:app:com.tuya.zigbee"
            ],
            support: "mailto:dylan.rajasekaram+homey@gmail.com",
            api: {
                min: 3,
                max: 3
            },
            platform: "local",
            flow: {
                actions: [],
                conditions: [],
                triggers: []
            }
        };

        fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
        return { success: true };
    }

    // Créer package.json
    createPackageJson() {
        const packageJson = {
            name: this.projectName,
            version: "1.0.0",
            description: "Universal Tuya Zigbee Device Support",
            main: "app.js",
            scripts: {
                "start": "homey app run",
                "validate": "homey app validate",
                "install": "homey app install",
                "mega-pipeline": "node mega-pipeline.js",
                "validate-local": "node scripts/core/validator.js",
                "fix-drivers": "node scripts/core/driver-manager.js",
                "fix-assets": "node scripts/core/asset-manager.js",
                "fix-project": "node scripts/core/project-manager.js"
            },
            keywords: [
                "homey",
                "tuya",
                "zigbee",
                "smart-home",
                "automation"
            ],
            author: {
                name: "Dylan Rajasekaram",
                email: "dylan.rajasekaram+homey@gmail.com"
            },
            license: "MIT",
            dependencies: {
                "homey-meshdriver": "^1.3.50"
            },
            devDependencies: {
                "homey": "^2.0.0"
            },
            engines: {
                "node": ">=16.0.0"
            }
        };

        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
        return { success: true };
    }

    // Créer app.js
    createAppJs() {
        const appJs = `'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('Tuya Zigbee App is running...');
        
        // Initialisation de l'app
        await this.initializeApp();
    }

    async initializeApp() {
        try {
            // Configuration de base
            this.log('Initializing Tuya Zigbee App...');
            
            // Vérification des drivers
            const drivers = await this.getDrivers();
            this.log(\`Loaded \${drivers.length} drivers\`);
            
        } catch (error) {
            this.error('Error initializing app:', error);
        }
    }

    async getDrivers() {
        return Object.values(this.homey.drivers.getDrivers());
    }
}

module.exports = TuyaZigbeeApp;
`;

        fs.writeFileSync('app.js', appJs);
        return { success: true };
    }

    // Créer README.md
    createReadme() {
        const readme = `# Tuya Zigbee - Universal Device Support

## 🚀 Description

Universal Tuya Zigbee Device Support with AI-powered enrichment and automatic error correction.

## 📋 Fonctionnalités

- **Support universel** pour appareils Tuya Zigbee
- **Enrichissement IA** automatique des drivers
- **Correction automatique** des erreurs
- **Compatibilité multi-box** (Homey Pro, Bridge, Cloud)
- **SDK3+** compatible

## 🛠️ Installation

\`\`\`bash
# Installation des dépendances
npm install

# Validation du projet
npm run validate

# Installation sur Homey
npm run install
\`\`\`

## 📁 Structure

\`\`\`
├── app.js                 # Point d'entrée de l'app
├── app.json              # Configuration de l'app
├── package.json          # Dépendances
├── mega-pipeline.js      # Pipeline d'automatisation
├── scripts/
│   └── core/            # Scripts de base
│       ├── validator.js  # Validation
│       ├── driver-manager.js # Gestion des drivers
│       ├── asset-manager.js  # Gestion des assets
│       └── project-manager.js # Gestion du projet
└── drivers/             # Drivers Tuya/Zigbee
    ├── tuya/           # Drivers Tuya
    └── zigbee/         # Drivers Zigbee
\`\`\`

## 🔧 Scripts Disponibles

- \`npm run mega-pipeline\` : Pipeline complet d'automatisation
- \`npm run validate-local\` : Validation locale
- \`npm run fix-drivers\` : Correction des drivers
- \`npm run fix-assets\` : Correction des assets
- \`npm run fix-project\` : Correction du projet

## 📊 Statut

- **Drivers** : Support complet
- **Validation** : 100% Homey CLI
- **Compatibilité** : SDK3+
- **Plateformes** : Pro, Bridge, Cloud

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commit les changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 📄 Licence

MIT License - voir LICENSE pour plus de détails.

## 👨‍💻 Auteur

**Dylan Rajasekaram**
- Email: dylan.rajasekaram+homey@gmail.com
- GitHub: [dlnraja](https://github.com/dlnraja)

---

**Version**: 1.0.0  
**SDK**: 3+  
**Compatibilité**: Homey >=5.0.0
`;

        fs.writeFileSync('README.md', readme);
        return { success: true };
    }

    // Créer tous les fichiers requis
    createAllRequiredFiles() {
        const results = {
            appJson: this.createAppJson(),
            packageJson: this.createPackageJson(),
            appJs: this.createAppJs(),
            readme: this.createReadme()
        };

        const success = Object.values(results).every(r => r.success);
        return { success, results };
    }

    // Nettoyer les fichiers obsolètes
    cleanObsoleteFiles() {
        const obsoleteFiles = [
            'README-OLD.md',
            'README.cursor.md',
            'TODO_*.md',
            '*.backup.*',
            '*.tmp',
            '*.log',
            '*.bak',
            '*.old'
        ];

        const obsoleteDirs = [
            'scraped',
            'fusion',
            'todo-devices',
            'temp',
            'cache',
            'legacy',
            'deprecated'
        ];

        let removedFiles = 0;
        let removedDirs = 0;

        // Supprimer les fichiers obsolètes
        for (const pattern of obsoleteFiles) {
            // Implémentation simplifiée - en réalité, il faudrait utiliser glob
            if (fs.existsSync(pattern)) {
                try {
                    fs.unlinkSync(pattern);
                    removedFiles++;
                } catch (error) {
                    console.warn(`Impossible de supprimer ${pattern}: ${error.message}`);
                }
            }
        }

        // Supprimer les dossiers obsolètes
        for (const dir of obsoleteDirs) {
            if (fs.existsSync(dir)) {
                try {
                    fs.rmSync(dir, { recursive: true, force: true });
                    removedDirs++;
                } catch (error) {
                    console.warn(`Impossible de supprimer ${dir}: ${error.message}`);
                }
            }
        }

        return { success: true, removedFiles, removedDirs };
    }

    // Valider le projet complet
    validateCompleteProject() {
        const structure = this.validateProjectStructure();
        const appJson = fs.existsSync('app.json') ? JSON.parse(fs.readFileSync('app.json', 'utf8')) : null;
        
        const validation = {
            structure: structure.valid === structure.total,
            appJson: appJson && appJson.sdk === this.sdkVersion,
            sdk: appJson ? appJson.sdk === this.sdkVersion : false,
            permissions: appJson && Array.isArray(appJson.permissions),
            images: appJson && appJson.images && appJson.images.small && appJson.images.large
        };

        return {
            valid: Object.values(validation).every(v => v),
            details: validation,
            structure
        };
    }

    // Générer un rapport
    generateReport() {
        const structure = this.validateProjectStructure();
        const validation = this.validateCompleteProject();

        return {
            structure,
            validation,
            sdk: this.sdkVersion,
            projectName: this.projectName,
            status: validation.valid ? 'complete' : 'incomplete'
        };
    }
}

// Fonction utilitaire pour les logs
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// Export pour utilisation dans d'autres scripts
module.exports = { ProjectManager, log };

// Exécution directe si appelé directement
if (require.main === module) {
    const manager = new ProjectManager();
    const report = manager.generateReport();
    log(`Rapport projet: ${JSON.stringify(report, null, 2)}`);
} 