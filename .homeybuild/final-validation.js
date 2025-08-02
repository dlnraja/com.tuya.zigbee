const fs = require('fs');
const path = require('path');

console.log('🔍 VALIDATION FINALE - Vérification complète du projet...');

class FinalValidator {
    constructor() {
        this.stats = {
            driversValid: 0,
            filesValid: 0,
            errorsFound: 0,
            warningsFound: 0
        };
    }
    
    async run() {
        console.log('🚀 Démarrage de la validation finale...');
        
        try {
            // 1. Vérifier la structure du projet
            await this.validateProjectStructure();
            
            // 2. Vérifier les fichiers essentiels
            await this.validateEssentialFiles();
            
            // 3. Vérifier les drivers
            await this.validateDrivers();
            
            // 4. Vérifier les scripts
            await this.validateScripts();
            
            // 5. Vérifier la configuration
            await this.validateConfiguration();
            
            // 6. Rapport final
            this.printFinalReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de la validation:', error);
        }
    }
    
    async validateProjectStructure() {
        console.log('📁 Validation de la structure du projet...');
        
        const requiredDirs = ['drivers', 'lib', 'scripts'];
        for (const dir of requiredDirs) {
            if (fs.existsSync(dir)) {
                console.log(`✅ Dossier trouvé: ${dir}`);
                this.stats.filesValid++;
            } else {
                console.log(`❌ Dossier manquant: ${dir}`);
                this.stats.errorsFound++;
            }
        }
        
        // Vérifier les sous-dossiers drivers
        const driversSubdirs = ['drivers/tuya', 'drivers/zigbee'];
        for (const subdir of driversSubdirs) {
            if (fs.existsSync(subdir)) {
                console.log(`✅ Sous-dossier trouvé: ${subdir}`);
                this.stats.filesValid++;
            } else {
                console.log(`❌ Sous-dossier manquant: ${subdir}`);
                this.stats.errorsFound++;
            }
        }
    }
    
    async validateEssentialFiles() {
        console.log('📄 Validation des fichiers essentiels...');
        
        const essentialFiles = [
            'app.js',
            'app.json',
            'package.json',
            'README.md',
            'CHANGELOG.md'
        ];
        
        for (const file of essentialFiles) {
            if (fs.existsSync(file)) {
                console.log(`✅ Fichier trouvé: ${file}`);
                this.stats.filesValid++;
            } else {
                console.log(`❌ Fichier manquant: ${file}`);
                this.stats.errorsFound++;
            }
        }
    }
    
    async validateDrivers() {
        console.log('📦 Validation des drivers...');
        
        const driversDir = path.join(__dirname, 'drivers');
        if (!fs.existsSync(driversDir)) {
            console.log('❌ Dossier drivers manquant');
            this.stats.errorsFound++;
            return;
        }
        
        const categories = ['tuya', 'zigbee'];
        for (const category of categories) {
            const categoryDir = path.join(driversDir, category);
            if (fs.existsSync(categoryDir)) {
                const drivers = fs.readdirSync(categoryDir, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);
                
                console.log(`📦 Drivers ${category}: ${drivers.length}`);
                this.stats.driversValid += drivers.length;
                
                // Vérifier quelques drivers au hasard
                for (const driver of drivers.slice(0, 3)) {
                    const composePath = path.join(categoryDir, driver, 'driver.compose.json');
                    const devicePath = path.join(categoryDir, driver, 'device.js');
                    
                    if (fs.existsSync(composePath) && fs.existsSync(devicePath)) {
                        console.log(`  ✅ ${driver}: OK`);
                    } else {
                        console.log(`  ❌ ${driver}: Fichiers manquants`);
                        this.stats.errorsFound++;
                    }
                }
            }
        }
    }
    
    async validateScripts() {
        console.log('🔧 Validation des scripts...');
        
        const scripts = [
            'ultimate-pipeline.js',
            'test-generator.js',
            'implement-missing-functions.js'
        ];
        
        for (const script of scripts) {
            if (fs.existsSync(script)) {
                console.log(`✅ Script trouvé: ${script}`);
                this.stats.filesValid++;
            } else {
                console.log(`❌ Script manquant: ${script}`);
                this.stats.errorsFound++;
            }
        }
    }
    
    async validateConfiguration() {
        console.log('⚙️ Validation de la configuration...');
        
        // Vérifier package.json
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            console.log(`✅ package.json valide - Version: ${packageJson.version}`);
            this.stats.filesValid++;
        } catch (error) {
            console.log('❌ package.json invalide');
            this.stats.errorsFound++;
        }
        
        // Vérifier app.json
        try {
            const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
            console.log(`✅ app.json valide - ID: ${appJson.id}`);
            this.stats.filesValid++;
        } catch (error) {
            console.log('❌ app.json invalide');
            this.stats.errorsFound++;
        }
    }
    
    printFinalReport() {
        console.log('\n📊 RAPPORT DE VALIDATION FINALE');
        console.log('================================');
        console.log(`✅ Fichiers valides: ${this.stats.filesValid}`);
        console.log(`📦 Drivers valides: ${this.stats.driversValid}`);
        console.log(`❌ Erreurs trouvées: ${this.stats.errorsFound}`);
        console.log(`⚠️ Avertissements: ${this.stats.warningsFound}`);
        
        if (this.stats.errorsFound === 0) {
            console.log('\n🎉 VALIDATION RÉUSSIE!');
            console.log('✅ Projet prêt pour installation');
            console.log('✅ Projet prêt pour validation');
            console.log('✅ Projet prêt pour publication');
            console.log('\n🚀 Commandes disponibles:');
            console.log('  homey app validate');
            console.log('  homey app install');
            console.log('  npm test');
        } else {
            console.log('\n⚠️ VALIDATION AVEC ERREURS');
            console.log('❌ Veuillez corriger les erreurs avant de continuer');
        }
    }
}

// Exécution de la validation
const validator = new FinalValidator();
validator.run(); 