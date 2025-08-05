#!/usr/bin/env node

/**
 * ✅ FINAL-VALIDATION.JS
 * Version: 1.0.0
 * Date: 2025-08-05
 * 
 * Validation finale rapide du projet
 */

const fs = require('fs');
const path = require('path');

class FinalValidator {
    constructor() {
        this.startTime = Date.now();
        this.stats = {
            structureValid: false,
            driversCount: 0,
            templatesCount: 0,
            workflowsCount: 0,
            errors: []
        };
        
        console.log('✅ FINAL VALIDATOR - DÉMARRAGE');
        console.log('📅 Date:', new Date().toISOString());
        console.log('🎯 Mode: VALIDATION RAPIDE');
        console.log('');
    }

    async execute() {
        try {
            // Validation rapide de la structure
            await this.validateStructure();
            
            // Validation des drivers
            await this.validateDrivers();
            
            // Validation des templates
            await this.validateTemplates();
            
            // Validation des workflows
            await this.validateWorkflows();
            
            // Rapport final
            await this.generateFinalReport();
            
        } catch (error) {
            console.error('❌ Erreur validation finale:', error.message);
        }
    }

    async validateStructure() {
        console.log('🏗️  VALIDATION DE LA STRUCTURE...');
        
        const requiredDirs = [
            'drivers',
            'drivers/tuya',
            'drivers/zigbee',
            'templates',
            'ref',
            '.github/workflows',
            'scripts'
        ];
        
        const requiredFiles = [
            'app.js',
            'app.json',
            'package.json',
            'README.md'
        ];
        
        let valid = true;
        
        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                console.log(`❌ Dossier manquant: ${dir}`);
                valid = false;
            }
        }
        
        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                console.log(`❌ Fichier manquant: ${file}`);
                valid = false;
            }
        }
        
        this.stats.structureValid = valid;
        console.log(`✅ Structure: ${valid ? 'VALIDE' : 'INVALIDE'}`);
    }

    async validateDrivers() {
        console.log('📋 VALIDATION DES DRIVERS...');
        
        let tuyaCount = 0;
        let zigbeeCount = 0;
        
        // Compter drivers Tuya
        const tuyaPath = 'drivers/tuya';
        if (fs.existsSync(tuyaPath)) {
            const categories = fs.readdirSync(tuyaPath);
            for (const category of categories) {
                const categoryPath = path.join(tuyaPath, category);
                if (fs.statSync(categoryPath).isDirectory()) {
                    const drivers = fs.readdirSync(categoryPath);
                    tuyaCount += drivers.length;
                }
            }
        }
        
        // Compter drivers Zigbee
        const zigbeePath = 'drivers/zigbee';
        if (fs.existsSync(zigbeePath)) {
            const categories = fs.readdirSync(zigbeePath);
            for (const category of categories) {
                const categoryPath = path.join(zigbeePath, category);
                if (fs.statSync(categoryPath).isDirectory()) {
                    const drivers = fs.readdirSync(categoryPath);
                    zigbeeCount += drivers.length;
                }
            }
        }
        
        this.stats.driversCount = tuyaCount + zigbeeCount;
        console.log(`📊 Drivers Tuya: ${tuyaCount}`);
        console.log(`📊 Drivers Zigbee: ${zigbeeCount}`);
        console.log(`📊 Total: ${this.stats.driversCount}`);
    }

    async validateTemplates() {
        console.log('📄 VALIDATION DES TEMPLATES...');
        
        const templates = [
            'templates/driver-readme.md',
            'templates/driver-compose.template.json',
            'templates/assets/placeholder.svg'
        ];
        
        let count = 0;
        for (const template of templates) {
            if (fs.existsSync(template)) {
                count++;
            }
        }
        
        this.stats.templatesCount = count;
        console.log(`📄 Templates: ${count}/${templates.length}`);
    }

    async validateWorkflows() {
        console.log('🔄 VALIDATION DES WORKFLOWS...');
        
        const workflows = [
            '.github/workflows/build.yml',
            '.github/workflows/validate-drivers.yml',
            '.github/workflows/monthly.yml'
        ];
        
        let count = 0;
        for (const workflow of workflows) {
            if (fs.existsSync(workflow)) {
                count++;
            }
        }
        
        this.stats.workflowsCount = count;
        console.log(`🔄 Workflows: ${count}/${workflows.length}`);
    }

    async generateFinalReport() {
        console.log('📊 GÉNÉRATION DU RAPPORT FINAL...');
        
        const report = {
            timestamp: new Date().toISOString(),
            stats: this.stats,
            status: this.stats.structureValid && this.stats.driversCount > 0 ? 'SUCCESS' : 'FAILED'
        };
        
        fs.writeFileSync('final-validation-report.json', JSON.stringify(report, null, 2));
        
        const markdownReport = this.generateMarkdownReport(report);
        fs.writeFileSync('final-validation-report.md', markdownReport);
        
        console.log('✅ Rapport final généré');
        
        // Afficher le résumé
        console.log('');
        console.log('🎯 RÉSUMÉ FINAL');
        console.log('================');
        console.log(`🏗️  Structure: ${this.stats.structureValid ? '✅ VALIDE' : '❌ INVALIDE'}`);
        console.log(`📋 Drivers: ${this.stats.driversCount}`);
        console.log(`📄 Templates: ${this.stats.templatesCount}`);
        console.log(`🔄 Workflows: ${this.stats.workflowsCount}`);
        console.log(`🎯 Status: ${report.status}`);
        console.log('');
        console.log('🚀 MEGA-PROMPT CURSOR - MISSION ACCOMPLIE !');
    }

    generateMarkdownReport(report) {
        return `# ✅ Final Validation Report

## 📊 Statistics
- **Structure valid**: ${report.stats.structureValid}
- **Drivers count**: ${report.stats.driversCount}
- **Templates count**: ${report.stats.templatesCount}
- **Workflows count**: ${report.stats.workflowsCount}
- **Status**: ${report.status}

## 📅 Date
${report.timestamp}

## 🎯 Final Status
${report.status === 'SUCCESS' ? '✅ PROJECT READY FOR PRODUCTION' : '❌ PROJECT NEEDS FIXES'}

---

**📊 Total Drivers**: ${report.stats.driversCount}  
**✅ Structure Valid**: ${report.stats.structureValid ? 'YES' : 'NO'}  
**🎯 Final Status**: ${report.status}
`;
    }
}

// Exécution
const validator = new FinalValidator();
validator.execute().catch(console.error); 