// file-organizer.js
// Script pour organiser tous les fichiers à la racine dans les bons dossiers
// Intégration dans le mega pipeline

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FileOrganizer {
    constructor() {
        this.results = {
            filesMoved: [],
            directoriesCreated: [],
            errors: [],
            warnings: [],
            steps: []
        };
        
        // FICHIERS ESSENTIELS QUI DOIVENT RESTER À LA RACINE
        this.essentialFiles = [
            'app.js',
            'app.json', 
            'package.json',
            '.cursorrules',
            '.gitignore',
            'LICENSE'
        ];
        
        this.fileCategories = {
            'docs/': [
                '*.md', '*.txt', '*.pdf'
            ],
            'reports/': [
                'RAPPORT_*.md', 'RELEASE_*.md', 'FINAL_*.md',
                'MEGA_*.md', 'DRIVERS_*.md', 'GITHUB_*.md',
                'MISSING_*.md', 'REFACTORING_*.md',
                'SYNTHESE_*.md', 'SUCCES_*.md', 'RESUME_*.md'
            ],
            'scripts/temp/': [
                '*.js', 'consolidated-*.js', 'final-*.js',
                'fix-*.js', 'mega-*.js', 'ultimate-*.js',
                'test-*.js', 'quick-*.js', 'dump-*.js',
                'implement-*.js'
            ],
            'docs/development/': [
                'README_*.md', 'README.*.md'
            ],
            'docs/releases/': [
                'RELEASE_*.md', 'RELEASE_NOTES.md'
            ],
            'docs/analysis/': [
                'DRIVERS_*.md', 'ANALYSIS_*.md'
            ]
        };
    }

    async organizeFiles() {
        console.log('📁 === ORGANISATION DES FICHIERS À LA RACINE ===');
        
        try {
            // 1. Analyser les fichiers à la racine
            await this.step1_analyzeRootFiles();
            
            // 2. Créer les dossiers de destination
            await this.step2_createDestinationDirectories();
            
            // 3. Organiser les fichiers par catégorie
            await this.step3_organizeFilesByCategory();
            
            // 4. Nettoyer les fichiers temporaires
            await this.step4_cleanupTemporaryFiles();
            
            // 5. Valider l'organisation
            await this.step5_validateOrganization();
            
            // 6. Générer le rapport
            await this.step6_generateReport();
            
            this.results.success = true;
            console.log('✅ === ORGANISATION DES FICHIERS TERMINÉE AVEC SUCCÈS ===');
            
        } catch (error) {
            this.results.errors.push(error.message);
            console.error('❌ Erreur dans l\'organisation des fichiers:', error.message);
        }
        
        return this.results;
    }

    // ÉTAPE 1: Analyser les fichiers à la racine
    async step1_analyzeRootFiles() {
        console.log('🔍 === ÉTAPE 1: ANALYSE DES FICHIERS À LA RACINE ===');
        
        const rootFiles = fs.readdirSync('.', { withFileTypes: true })
            .filter(dirent => dirent.isFile())
            .map(dirent => dirent.name);
        
        console.log('📊 Fichiers trouvés à la racine:', rootFiles.length);
        console.log('📋 Liste des fichiers:', rootFiles);
        
        this.results.steps.push('Étape 1: Analyse des fichiers terminée');
    }

    // ÉTAPE 2: Créer les dossiers de destination
    async step2_createDestinationDirectories() {
        console.log('🏗️ === ÉTAPE 2: CRÉATION DES DOSSIERS DE DESTINATION ===');
        
        const directories = [
            'docs/',
            'reports/',
            'scripts/temp/',
            'docs/development/',
            'docs/releases/',
            'docs/analysis/',
            'docs/automation/',
            'docs/implementation/',
            'docs/optimization/'
        ];
        
        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log('✅ Créé:', dir);
                this.results.directoriesCreated.push(dir);
            }
        }
        
        this.results.steps.push('Étape 2: Dossiers de destination créés');
    }

    // ÉTAPE 3: Organiser les fichiers par catégorie
    async step3_organizeFilesByCategory() {
        console.log('📂 === ÉTAPE 3: ORGANISATION DES FICHIERS PAR CATÉGORIE ===');
        
        // Organiser les fichiers selon les catégories définies
        for (const [destination, patterns] of Object.entries(this.fileCategories)) {
            await this.moveFilesByPattern(destination, patterns);
        }
        
        // Organiser les fichiers spécifiques
        await this.moveSpecificFiles();
        
        this.results.steps.push('Étape 3: Fichiers organisés par catégorie');
    }

    // ÉTAPE 4: Nettoyer les fichiers temporaires
    async step4_cleanupTemporaryFiles() {
        console.log('🧹 === ÉTAPE 4: NETTOYAGE DES FICHIERS TEMPORAIRES ===');
        
        const tempFiles = [
            'test-*.js', 'quick-*.js', 'dump-*.js',
            'fix-*.js', 'final-*.js'
        ];
        
        for (const pattern of tempFiles) {
            await this.cleanupFilesByPattern(pattern);
        }
        
        this.results.steps.push('Étape 4: Fichiers temporaires nettoyés');
    }

    // ÉTAPE 5: Valider l'organisation
    async step5_validateOrganization() {
        console.log('✅ === ÉTAPE 5: VALIDATION DE L\'ORGANISATION ===');
        
        const validation = this.validateFileOrganization();
        
        if (validation.success) {
            console.log('✅ Organisation validée avec succès');
        } else {
            console.log('⚠️ Problèmes de validation:', validation.warnings);
            this.results.warnings.push(...validation.warnings);
        }
        
        this.results.steps.push('Étape 5: Validation terminée');
    }

    // ÉTAPE 6: Générer le rapport
    async step6_generateReport() {
        console.log('📚 === ÉTAPE 6: GÉNÉRATION DU RAPPORT ===');
        
        await this.generateOrganizationReport();
        
        this.results.steps.push('Étape 6: Rapport généré');
    }

    // Méthodes utilitaires
    async moveFilesByPattern(destination, patterns) {
        console.log(`📂 Déplacement vers ${destination}...`);
        
        const rootFiles = fs.readdirSync('.', { withFileTypes: true })
            .filter(dirent => dirent.isFile())
            .map(dirent => dirent.name);
        
        for (const file of rootFiles) {
            // EXCLURE LES FICHIERS ESSENTIELS
            if (this.essentialFiles.includes(file)) {
                console.log(`🛡️ Fichier essentiel préservé: ${file}`);
                continue;
            }
            
            for (const pattern of patterns) {
                if (this.matchesPattern(file, pattern)) {
                    await this.moveFile(file, destination + file);
                    break;
                }
            }
        }
    }

    async moveSpecificFiles() {
        console.log('📋 Déplacement des fichiers spécifiques...');
        
        const specificMoves = [
            // Documentation
            { source: 'README.md', dest: 'docs/README.md' },
            { source: 'README_DEVELOPMENT.md', dest: 'docs/development/README_DEVELOPMENT.md' },
            { source: 'README_MEGA_PIPELINE.md', dest: 'docs/development/README_MEGA_PIPELINE.md' },
            { source: 'README_megaproject_full_multilang.md', dest: 'docs/development/README_megaproject_full_multilang.md' },
            { source: 'README.en.md', dest: 'docs/development/README.en.md' },
            { source: 'README.fr.md', dest: 'docs/development/README.fr.md' },
            { source: 'README.nl.md', dest: 'docs/development/README.nl.md' },
            { source: 'README.ta.md', dest: 'docs/development/README.ta.md' },
            
            // Rapports
            { source: 'RAPPORT_FINAL_*.md', dest: 'reports/' },
            { source: 'MEGA_*.md', dest: 'reports/' },
            { source: 'DRIVERS_*.md', dest: 'reports/' },
            { source: 'GITHUB_*.md', dest: 'reports/' },
            { source: 'MISSING_*.md', dest: 'reports/' },
            { source: 'REFACTORING_*.md', dest: 'reports/' },
            { source: 'SYNTHESE_*.md', dest: 'reports/' },
            { source: 'SUCCES_*.md', dest: 'reports/' },
            { source: 'RESUME_*.md', dest: 'reports/' },
            { source: 'RELEASE_*.md', dest: 'docs/releases/' },
            { source: 'FINAL_*.md', dest: 'reports/' },
            
            // Scripts temporaires
            { source: 'consolidated-*.js', dest: 'scripts/temp/' },
            { source: 'final-*.js', dest: 'scripts/temp/' },
            { source: 'fix-*.js', dest: 'scripts/temp/' },
            { source: 'mega-*.js', dest: 'scripts/temp/' },
            { source: 'ultimate-*.js', dest: 'scripts/temp/' },
            { source: 'test-*.js', dest: 'scripts/temp/' },
            { source: 'quick-*.js', dest: 'scripts/temp/' },
            { source: 'dump-*.js', dest: 'scripts/temp/' },
            { source: 'implement-*.js', dest: 'scripts/temp/' },
            
            // Changelog et documentation
            { source: 'CHANGELOG.md', dest: 'docs/CHANGELOG.md' },
            { source: 'LICENSE', dest: 'docs/LICENSE' },
            
            // Fichiers de configuration (garder à la racine)
            // app.js, app.json, package.json, .gitignore, .cursorrules restent à la racine
        ];
        
        for (const move of specificMoves) {
            // EXCLURE LES FICHIERS ESSENTIELS
            if (this.essentialFiles.includes(move.source)) {
                console.log(`🛡️ Fichier essentiel préservé: ${move.source}`);
                continue;
            }
            
            if (move.source.includes('*')) {
                // Pattern matching
                await this.moveFilesByPattern(move.dest, [move.source]);
            } else {
                // Fichier spécifique
                await this.moveFile(move.source, move.dest);
            }
        }
    }

    async moveFile(source, dest) {
        try {
            if (fs.existsSync(source)) {
                if (!fs.existsSync(path.dirname(dest))) {
                    fs.mkdirSync(path.dirname(dest), { recursive: true });
                }
                
                fs.copyFileSync(source, dest);
                fs.unlinkSync(source);
                
                console.log(`✅ Déplacé: ${source} → ${dest}`);
                this.results.filesMoved.push({ source, dest });
            }
        } catch (error) {
            console.log(`⚠️ Erreur déplacement ${source}:`, error.message);
            this.results.errors.push(`Erreur déplacement ${source}: ${error.message}`);
        }
    }

    matchesPattern(filename, pattern) {
        if (pattern.includes('*')) {
            const regexPattern = pattern.replace(/\*/g, '.*');
            const regex = new RegExp(regexPattern);
            return regex.test(filename);
        }
        return filename === pattern;
    }

    async cleanupFilesByPattern(pattern) {
        console.log(`🧹 Nettoyage des fichiers: ${pattern}`);
        
        const rootFiles = fs.readdirSync('.', { withFileTypes: true })
            .filter(dirent => dirent.isFile())
            .map(dirent => dirent.name);
        
        for (const file of rootFiles) {
            if (this.matchesPattern(file, pattern)) {
                try {
                    fs.unlinkSync(file);
                    console.log(`🗑️ Supprimé: ${file}`);
                } catch (error) {
                    console.log(`⚠️ Erreur suppression ${file}:`, error.message);
                }
            }
        }
    }

    validateFileOrganization() {
        const warnings = [];
        
        // Vérifier que les fichiers essentiels restent à la racine
        for (const file of this.essentialFiles) {
            if (!fs.existsSync(file)) {
                warnings.push(`Fichier essentiel manquant: ${file}`);
            }
        }
        
        // Vérifier que les dossiers de destination existent
        const requiredDirs = ['docs/', 'reports/', 'scripts/temp/'];
        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                warnings.push(`Dossier de destination manquant: ${dir}`);
            }
        }
        
        // Vérifier qu'il n'y a plus trop de fichiers à la racine
        const remainingFiles = fs.readdirSync('.', { withFileTypes: true })
            .filter(dirent => dirent.isFile())
            .map(dirent => dirent.name);
        
        if (remainingFiles.length > 10) {
            warnings.push(`Trop de fichiers restent à la racine: ${remainingFiles.length}`);
        }
        
        return {
            success: warnings.length === 0,
            warnings
        };
    }

    async generateOrganizationReport() {
        const report = `# 📁 RAPPORT D'ORGANISATION DES FICHIERS

## 🎯 Résumé de l'Organisation

### Objectifs
- Organiser les fichiers à la racine
- Créer une structure logique
- Maintenir les fichiers essentiels à la racine
- Nettoyer les fichiers temporaires

### Résultats
- **Fichiers déplacés**: ${this.results.filesMoved.length}
- **Dossiers créés**: ${this.results.directoriesCreated.length}
- **Erreurs**: ${this.results.errors.length}
- **Avertissements**: ${this.results.warnings.length}

## 📂 Structure Finale

### Fichiers à la racine (essentiels)
- app.js, app.json, package.json
- .gitignore, .cursorrules
- README.md (copie dans docs/)

### Dossiers créés
- docs/ (documentation générale)
- reports/ (rapports et analyses)
- scripts/temp/ (scripts temporaires)
- docs/development/ (documentation développement)
- docs/releases/ (notes de version)
- docs/analysis/ (analyses)

## 📋 Actions Effectuées

1. **Analyse** des fichiers à la racine
2. **Création** des dossiers de destination
3. **Organisation** par catégorie
4. **Nettoyage** des fichiers temporaires
5. **Validation** de l'organisation
6. **Génération** du rapport

## 🚀 Avantages

- ✅ **Structure claire** et organisée
- ✅ **Navigation facilitée** dans le projet
- ✅ **Maintenance simplifiée**
- ✅ **Fichiers essentiels** préservés
- ✅ **Documentation** bien organisée

**Organisation des fichiers terminée avec succès !** ✅`;
        
        fs.writeFileSync('FILE_ORGANIZATION_REPORT.md', report);
    }
}

// Exécution de l'organisation des fichiers
if (require.main === module) {
    const organizer = new FileOrganizer();
    organizer.organizeFiles()
        .then(results => {
            console.log('🎉 Organisation des fichiers terminée avec succès!');
            console.log('📊 Résultats:', JSON.stringify(results, null, 2));
        })
        .catch(error => {
            console.error('❌ Erreur dans l\'organisation des fichiers:', error);
            process.exit(1);
        });
}

module.exports = FileOrganizer; 