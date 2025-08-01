// core/validator.js
// Script de validation centralisé pour le projet Tuya Zigbee
// Remplace tous les scripts de validation dispersés

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class HomeyValidator {
    constructor() {
        this.cache = new Map();
        this.results = {
            app: { valid: false, errors: [] },
            drivers: { total: 0, valid: 0, invalid: 0, errors: [] },
            assets: { valid: false, errors: [] },
            structure: { valid: false, errors: [] }
        };
    }

    // Validation de l'app principale
    validateApp() {
        try {
            const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
            
            // Vérifications obligatoires
            const required = ['id', 'name', 'version', 'sdk', 'main'];
            const missing = required.filter(field => !appJson[field]);
            
            if (missing.length > 0) {
                this.results.app.errors.push(`Champs manquants: ${missing.join(', ')}`);
                return false;
            }

            // Vérification SDK3+
            if (appJson.sdk !== 3) {
                this.results.app.errors.push('SDK doit être 3');
                return false;
            }

            // Vérification des permissions
            if (!appJson.permissions || !Array.isArray(appJson.permissions)) {
                this.results.app.errors.push('Permissions manquantes ou invalides');
                return false;
            }

            this.results.app.valid = true;
            return true;
        } catch (error) {
            this.results.app.errors.push(`Erreur JSON: ${error.message}`);
            return false;
        }
    }

    // Validation des drivers
    validateDrivers() {
        const driversDir = 'drivers';
        if (!fs.existsSync(driversDir)) {
            this.results.drivers.errors.push('Dossier drivers manquant');
            return false;
        }

        const scanDrivers = (dir) => {
            const items = fs.readdirSync(dir);
            let count = 0;

            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    const composePath = path.join(fullPath, 'driver.compose.json');
                    const devicePath = path.join(fullPath, 'device.js');

                    if (fs.existsSync(composePath)) {
                        count++;
                        if (this.validateDriver(composePath, devicePath)) {
                            this.results.drivers.valid++;
                        } else {
                            this.results.drivers.invalid++;
                        }
                    } else {
                        // Récursion pour les sous-dossiers
                        count += scanDrivers(fullPath);
                    }
                }
            }

            return count;
        };

        this.results.drivers.total = scanDrivers(driversDir);
        return this.results.drivers.total > 0;
    }

    // Validation d'un driver individuel
    validateDriver(composePath, devicePath) {
        try {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            
            // Vérifications obligatoires
            const required = ['id', 'name', 'class', 'capabilities'];
            const missing = required.filter(field => !compose[field]);
            
            if (missing.length > 0) {
                this.results.drivers.errors.push(`${composePath}: Champs manquants ${missing.join(', ')}`);
                return false;
            }

            // Vérification des capabilities
            if (!Array.isArray(compose.capabilities) || compose.capabilities.length === 0) {
                this.results.drivers.errors.push(`${composePath}: Capabilities manquantes`);
                return false;
            }

            // Vérification du device.js
            if (!fs.existsSync(devicePath)) {
                this.results.drivers.errors.push(`${composePath}: device.js manquant`);
                return false;
            }

            return true;
        } catch (error) {
            this.results.drivers.errors.push(`${composePath}: ${error.message}`);
            return false;
        }
    }

    // Validation des assets
    validateAssets() {
        const requiredAssets = [
            'assets/icon-small.png',
            'assets/icon-large.png',
            'assets/images/small.png',
            'assets/images/large.png'
        ];

        for (const asset of requiredAssets) {
            if (!fs.existsSync(asset)) {
                this.results.assets.errors.push(`Asset manquant: ${asset}`);
            }
        }

        this.results.assets.valid = this.results.assets.errors.length === 0;
        return this.results.assets.valid;
    }

    // Validation de la structure
    validateStructure() {
        const required = [
            'app.json',
            'package.json',
            'app.js',
            'README.md'
        ];

        for (const file of required) {
            if (!fs.existsSync(file)) {
                this.results.structure.errors.push(`Fichier manquant: ${file}`);
            }
        }

        this.results.structure.valid = this.results.structure.errors.length === 0;
        return this.results.structure.valid;
    }

    // Validation Homey CLI (optionnelle)
    async validateHomeyCLI(level = 'debug') {
        try {
            const result = execSync(`homey app validate --level ${level}`, { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            return { success: true, output: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Validation complète
    async validateAll() {
        log('🔍 Démarrage validation complète...');

        this.validateApp();
        this.validateDrivers();
        this.validateAssets();
        this.validateStructure();

        const summary = {
            app: this.results.app.valid,
            drivers: `${this.results.drivers.valid}/${this.results.drivers.total}`,
            assets: this.results.assets.valid,
            structure: this.results.structure.valid,
            errors: [
                ...this.results.app.errors,
                ...this.results.drivers.errors,
                ...this.results.assets.errors,
                ...this.results.structure.errors
            ]
        };

        log(`✅ Validation terminée: ${JSON.stringify(summary, null, 2)}`);
        return summary;
    }
}

// Fonction utilitaire pour les logs
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// Export pour utilisation dans d'autres scripts
module.exports = { HomeyValidator, log };

// Exécution directe si appelé directement
if (require.main === module) {
    const validator = new HomeyValidator();
    validator.validateAll().then(summary => {
        process.exit(summary.errors.length === 0 ? 0 : 1);
    });
} 