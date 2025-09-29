#!/usr/bin/env node

/**
 * PROJECT REORGANIZER - Ultimate Zigbee Hub
 * 
 * Réorganise automatiquement tous les fichiers en pagaille dans la racine
 * vers des dossiers structurés et logiques selon leur fonction
 */

const fs = require('fs-extra');
const path = require('path');

class ProjectReorganizer {
    constructor() {
        this.projectRoot = process.cwd();
        this.moved = [];
        this.errors = [];
        
        // Mapping des fichiers vers leurs dossiers de destination
        this.fileMapping = {
            // Scripts d'automation
            'organized/automation': [
                'auto-publish-*.bat', 'auto-publish*.js', 'auto-publish*.ps1',
                'automated_*.js', 'automated_*.py', 'automation*.js',
                'master-orchestrator.js', 'mega-*.js', 'orchestration*.json'
            ],
            
            // Scripts de publication
            'organized/publishing': [
                '*publish*.js', '*publish*.py', '*publish*.ps1', '*publish*.bat',
                'direct-publish.js', 'force-publish*.js', 'final-publish*.js',
                'simple-publish*.js', 'smart-publish.js', 'ultimate-publish.js',
                'interactive_publish*.js', 'interactive_publish*.py',
                'working_interactive_publish.py', 'intelligent-publish.py',
                'truly_working_publish.js', 'complete-publish.bat'
            ],
            
            // Scripts de validation et correction
            'organized/validation': [
                'fix_*.py', 'fix_*.js', 'comprehensive_*.py',
                'enrich_*.py', 'force_clean_*.py', 'intelligent_*.py',
                'mass_*.py', 'update_*.py', 'create_*.py'
            ],
            
            // Scripts d'amélioration et génération
            'organized/enhancement': [
                'enhanced_*.py', 'enhanced_*.js', 'driver_*.py',
                'comprehensive_driver_*.py', 'comprehensive_english_*.py',
                'reorganize_*.py', 'image_generation*.py', 'mass_image*.py'
            ],
            
            // Analyses et rapports
            'organized/analysis': [
                '*analysis*.py', '*analysis*.json', '*analyzer*.py',
                'comprehensive_source_*.json', 'mega-analysis*.json',
                'orchestration-report.json', '*report*.json'
            ],
            
            // Documentation
            'organized/documentation': [
                '*.md', 'README.txt', 'COMMIT_MESSAGE.md', 'COMMUNITY_FEEDBACK.md',
                'CONTRIBUTING.md', 'CREDITS.md', 'DEVELOPMENT.md', 'MASTER_*.md'
            ],
            
            // Legacy et backup
            'organized/legacy': [
                'backup_*.js', 'backup_*.py', 'temp_*.txt', 'responses.txt',
                'auto_responses.txt', '*_backup.json'
            ]
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '📋',
            success: '✅',
            error: '❌',
            move: '📦',
            skip: '⏭️'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    // Vérifier si un fichier correspond à un pattern
    matchesPattern(filename, pattern) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
        return regex.test(filename);
    }

    // Déplacer un fichier vers sa destination
    async moveFile(source, destination, reason) {
        try {
            await fs.ensureDir(path.dirname(destination));
            await fs.move(source, destination, { overwrite: true });
            this.moved.push({ source, destination, reason });
            this.log(`Moved: ${path.basename(source)} → ${path.relative(this.projectRoot, destination)}`, 'move');
        } catch (error) {
            this.errors.push({ source, error: error.message });
            this.log(`Error moving ${source}: ${error.message}`, 'error');
        }
    }

    // Réorganiser tous les fichiers
    async reorganize() {
        this.log('🚀 DÉMARRAGE RÉORGANISATION PROJET');
        
        try {
            const rootFiles = await fs.readdir(this.projectRoot);
            
            for (const filename of rootFiles) {
                const fullPath = path.join(this.projectRoot, filename);
                const stat = await fs.stat(fullPath);
                
                // Skip directories et fichiers critiques
                if (stat.isDirectory() || 
                    ['app.js', 'app.json', 'package.json', 'package-lock.json', 'tsconfig.json', 
                     'jest.config.js', 'eslint.config.js', 'babel.config.js', 'nodemon.json',
                     '.env', '.gitignore', '.homeyignore', '.prettierrc', '.prettierignore',
                     '.homeychangelog.json', 'LICENSE'].includes(filename)) {
                    this.log(`Skipped critical file: ${filename}`, 'skip');
                    continue;
                }
                
                // Trouver la destination appropriée
                let moved = false;
                for (const [destination, patterns] of Object.entries(this.fileMapping)) {
                    for (const pattern of patterns) {
                        if (this.matchesPattern(filename, pattern)) {
                            const destPath = path.join(this.projectRoot, destination, filename);
                            await this.moveFile(fullPath, destPath, `Matched pattern: ${pattern}`);
                            moved = true;
                            break;
                        }
                    }
                    if (moved) break;
                }
                
                if (!moved) {
                    this.log(`No pattern matched for: ${filename}`, 'skip');
                }
            }
            
            // Rapport final
            this.log('📊 RAPPORT DE RÉORGANISATION:', 'info');
            this.log(`Fichiers déplacés: ${this.moved.length}`, this.moved.length > 0 ? 'success' : 'info');
            this.log(`Erreurs: ${this.errors.length}`, this.errors.length > 0 ? 'error' : 'success');
            
            if (this.moved.length > 0) {
                this.log('FICHIERS DÉPLACÉS:', 'success');
                this.moved.forEach(({ source, destination }) => {
                    this.log(`  - ${path.basename(source)} → ${path.relative(this.projectRoot, destination)}`, 'move');
                });
            }
            
            if (this.errors.length > 0) {
                this.log('ERREURS RENCONTRÉES:', 'error');
                this.errors.forEach(({ source, error }) => {
                    this.log(`  - ${source}: ${error}`, 'error');
                });
            }
            
            this.log('🎉 RÉORGANISATION TERMINÉE!', 'success');
            return this.errors.length === 0;
            
        } catch (error) {
            this.log(`Erreur durant réorganisation: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Exécution si appelé directement
if (require.main === module) {
    const reorganizer = new ProjectReorganizer();
    reorganizer.reorganize()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            console.error('❌ Échec réorganisation:', error);
            process.exit(1);
        });
}

module.exports = ProjectReorganizer;
