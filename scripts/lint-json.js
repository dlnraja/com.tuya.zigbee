#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

/**
 * 🚀 VALIDATEUR JSON CROSS-PLATFORM
 * 
 * Valide tous les fichiers JSON du projet
 * Compatible Windows, Linux, macOS
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

class JsonValidator {
    constructor() {
        this.projectRoot = process.cwd();
        this.errors = [];
        this.warnings = [];
        this.stats = {
            total: 0,
            valid: 0,
            invalid: 0,
            bomRemoved: 0
        };
    }

    async run() {
        try {
            console.log('🚀 VALIDATEUR JSON CROSS-PLATFORM');
            console.log('=' .repeat(50));
            
            // 1. Trouver tous les fichiers JSON
            await this.findJsonFiles();
            
            // 2. Nettoyer les BOM
            await this.stripBOM();
            
            // 3. Valider le JSON
            await this.validateJson();
            
            // 4. Rapport final
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Erreur critique:', error.message);
            process.exit(1);
        }
    }

    async findJsonFiles() {
        console.log('\n🔍 Recherche des fichiers JSON...');
        
        const pattern = path.join(this.projectRoot, '**/*.json');
        const options = {
            ignore: [
                '**/node_modules/**',
                '**/.git/**',
                '**/dumps/**',
                '**/package-lock.json',
                '**/yarn.lock'
            ]
        };

        try {
            this.jsonFiles = glob.sync(pattern, options);
            this.stats.total = this.jsonFiles.length;
            console.log(`✅ ${this.stats.total} fichiers JSON trouvés`);
        } catch (error) {
            console.error('❌ Erreur recherche fichiers:', error.message);
            this.jsonFiles = [];
        }
    }

    async stripBOM() {
        console.log('\n🧹 Nettoyage des BOM UTF-8...');
        
        for (const filePath of this.jsonFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                
                // Vérifier si BOM présent
                if (content.charCodeAt(0) === 0xFEFF) {
                    const cleanContent = content.slice(1);
                    await fs.writeFile(filePath, cleanContent, 'utf8');
                    this.stats.bomRemoved++;
                    console.log(`  ✅ BOM retiré: ${path.relative(this.projectRoot, filePath)}`);
                }
            } catch (error) {
                console.error(`  ❌ Erreur lecture ${filePath}:`, error.message);
            }
        }
        
        if (this.stats.bomRemoved > 0) {
            console.log(`✅ ${this.stats.bomRemoved} BOM retirés`);
        } else {
            console.log('✅ Aucun BOM détecté');
        }
    }

    async validateJson() {
        console.log('\n🔍 Validation du JSON...');
        
        for (const filePath of this.jsonFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                
                // Essayer de parser le JSON
                JSON.parse(content);
                this.stats.valid++;
                console.log(`  ✅ ${path.relative(this.projectRoot, filePath)}`);
                
            } catch (error) {
                this.stats.invalid++;
                const relativePath = path.relative(this.projectRoot, filePath);
                const errorMsg = `  ❌ ${relativePath}: ${error.message}`;
                console.log(errorMsg);
                this.errors.push(`${relativePath}: ${error.message}`);
            }
        }
        
        console.log(`\n📊 Validation terminée: ${this.stats.valid}/${this.stats.total} valides`);
    }

    generateReport() {
        console.log('\n📋 RAPPORT DE VALIDATION JSON');
        console.log('=' .repeat(50));
        
        console.log(`📊 STATISTIQUES:`);
        console.log(`  Total fichiers: ${this.stats.total}`);
        console.log(`  Valides: ${this.stats.valid}`);
        console.log(`  Invalides: ${this.stats.invalid}`);
        console.log(`  BOM retirés: ${this.stats.bomRemoved}`);
        
        if (this.errors.length > 0) {
            console.log(`\n❌ ERREURS (${this.errors.length}):`);
            this.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (this.warnings.length > 0) {
            console.log(`\n⚠️  AVERTISSEMENTS (${this.warnings.length}):`);
            this.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        if (this.errors.length === 0) {
            console.log('\n🎉 VALIDATION JSON RÉUSSIE !');
            console.log('✅ Tous les fichiers JSON sont valides');
        } else {
            console.log('\n🔧 CORRECTIONS REQUISES:');
            console.log('  Corrigez les erreurs JSON ci-dessus avant de continuer');
        }
        
        console.log('\n🚀 PROCHAINES ÉTAPES:');
        if (this.errors.length === 0) {
            console.log('  1. Lancer: homey app validate -l debug');
            console.log('  2. Tester: homey app run');
            console.log('  3. Analyser les logs');
        } else {
            console.log('  1. Corriger les erreurs JSON ci-dessus');
            console.log('  2. Relancer la validation JSON');
        }
    }
}

// Exécuter
if (require.main === module) {
    const validator = new JsonValidator();
    validator.run().catch(console.error);
}

module.exports = JsonValidator;
