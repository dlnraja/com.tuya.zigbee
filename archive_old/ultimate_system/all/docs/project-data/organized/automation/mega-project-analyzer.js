#!/usr/bin/env node

/**
 * MEGA PROJECT ANALYZER - Ultimate Zigbee Hub
 * Analyse complète du projet et génération de rapports structurés
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MegaProjectAnalyzer {
    constructor() {
        this.projectRoot = process.cwd();
        this.analysis = {
            scripts: {
                automation: [],
                publication: [],
                validation: [],
                enhancement: [],
                scraping: [],
                utilities: [],
                deprecated: []
            },
            dataSources: {
                matrices: [],
                references: [],
                configs: [],
                databases: []
            },
            structure: {
                drivers: [],
                assets: [],
                documentation: [],
                workflows: []
            },
            duplicates: [],
            recommendations: []
        };
        
        console.log('🚀 MEGA PROJECT ANALYZER - Ultimate Zigbee Hub');
        console.log('📁 Projet:', this.projectRoot);
    }

    // Analyse tous les fichiers du projet
    async analyzeProject() {
        console.log('\n📊 ANALYSE COMPLÈTE DU PROJET');
        
        await this.scanDirectories();
        await this.analyzeDuplicates();
        await this.analyzeDataSources();
        await this.generateRecommendations();
        await this.saveReport();
        
        return this.analysis;
    }

    // Scan récursif de tous les répertoires
    async scanDirectories() {
        console.log('🔍 Scan des répertoires...');
        
        const scanDir = (dirPath, category = 'unknown') => {
            try {
                const items = fs.readdirSync(dirPath);
                
                for (const item of items) {
                    const fullPath = path.join(dirPath, item);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        // Skip node_modules, .git, etc.
                        if (['node_modules', '.git', '.homeybuild', 'dist'].includes(item)) continue;
                        
                        scanDir(fullPath, item);
                    } else if (stat.isFile()) {
                        this.analyzeFile(fullPath, category);
                    }
                }
            } catch (error) {
                console.log(`⚠️ Erreur scan ${dirPath}:`, error.message);
            }
        };

        scanDir(this.projectRoot);
        console.log(`✅ ${this.getTotalFiles()} fichiers analysés`);
    }

    // Analyse et catégorise un fichier
    analyzeFile(filePath, category) {
        const ext = path.extname(filePath).toLowerCase();
        const basename = path.basename(filePath).toLowerCase();
        const content = this.getFileContent(filePath);
        
        const fileInfo = {
            path: path.relative(this.projectRoot, filePath),
            size: fs.statSync(filePath).size,
            category,
            type: this.getFileType(ext, basename, content),
            functions: this.extractFunctions(content, ext),
            dependencies: this.extractDependencies(content, ext),
            lastModified: fs.statSync(filePath).mtime
        };

        // Catégoriser selon le type
        if (this.isScript(ext)) {
            this.categorizeScript(fileInfo, content);
        } else if (this.isDataSource(ext, basename)) {
            this.categorizeDataSource(fileInfo);
        } else {
            this.categorizeStructure(fileInfo);
        }
    }

    // Catégorise les scripts par fonction
    categorizeScript(fileInfo, content) {
        const { path: filePath } = fileInfo;
        const contentLower = content.toLowerCase();

        if (this.isAutomationScript(contentLower, filePath)) {
            this.analysis.scripts.automation.push(fileInfo);
        } else if (this.isPublicationScript(contentLower, filePath)) {
            this.analysis.scripts.publication.push(fileInfo);
        } else if (this.isValidationScript(contentLower, filePath)) {
            this.analysis.scripts.validation.push(fileInfo);
        } else if (this.isEnhancementScript(contentLower, filePath)) {
            this.analysis.scripts.enhancement.push(fileInfo);
        } else if (this.isScrapingScript(contentLower, filePath)) {
            this.analysis.scripts.scraping.push(fileInfo);
        } else if (this.isDeprecated(filePath)) {
            this.analysis.scripts.deprecated.push(fileInfo);
        } else {
            this.analysis.scripts.utilities.push(fileInfo);
        }
    }

    // Détecte les scripts d'automatisation
    isAutomationScript(content, filePath) {
        const keywords = ['automation', 'auto-publish', 'deploy', 'ci/cd', 'workflow', 'pipeline'];
        return keywords.some(keyword => 
            content.includes(keyword) || filePath.includes(keyword)
        );
    }

    // Détecte les scripts de publication
    isPublicationScript(content, filePath) {
        const keywords = ['publish', 'homey app publish', 'app store', 'release', 'deploy'];
        return keywords.some(keyword => 
            content.includes(keyword) || filePath.includes(keyword)
        );
    }

    // Détecte les scripts de validation
    isValidationScript(content, filePath) {
        const keywords = ['validate', 'validation', 'test', 'check', 'verify', 'lint'];
        return keywords.some(keyword => 
            content.includes(keyword) || filePath.includes(keyword)
        );
    }

    // Détecte les scripts d'amélioration
    isEnhancementScript(content, filePath) {
        const keywords = ['enhance', 'optimize', 'improve', 'fix', 'cleanup', 'refactor'];
        return keywords.some(keyword => 
            content.includes(keyword) || filePath.includes(keyword)
        );
    }

    // Détecte les scripts de scraping
    isScrapingScript(content, filePath) {
        const keywords = ['scrape', 'fetch', 'crawl', 'download', 'harvest', 'gather'];
        return keywords.some(keyword => 
            content.includes(keyword) || filePath.includes(keyword)
        );
    }

    // Analyse les doublons potentiels
    async analyzeDuplicates() {
        console.log('🔍 Analyse des doublons...');
        
        const allScripts = [
            ...this.analysis.scripts.automation,
            ...this.analysis.scripts.publication,
            ...this.analysis.scripts.validation,
            ...this.analysis.scripts.enhancement,
            ...this.analysis.scripts.scraping,
            ...this.analysis.scripts.utilities
        ];

        // Grouper par similarité de nom
        const groups = {};
        allScripts.forEach(script => {
            const baseName = this.getBaseName(script.path);
            if (!groups[baseName]) groups[baseName] = [];
            groups[baseName].push(script);
        });

        // Identifier les doublons
        Object.entries(groups).forEach(([baseName, scripts]) => {
            if (scripts.length > 1) {
                this.analysis.duplicates.push({
                    group: baseName,
                    scripts: scripts,
                    recommendation: this.getDuplicateRecommendation(scripts)
                });
            }
        });

        console.log(`🔍 ${this.analysis.duplicates.length} groupes de doublons détectés`);
    }

    // Analyse les sources de données
    async analyzeDataSources() {
        console.log('📊 Analyse des sources de données...');
        
        // Matrices
        const matrixFiles = this.findFilesByPattern(/matrix|matrices/i);
        this.analysis.dataSources.matrices = matrixFiles;

        // Références
        const referenceFiles = this.findFilesByPattern(/reference|ref/i);
        this.analysis.dataSources.references = referenceFiles;

        // Configurations
        const configFiles = this.findFilesByPattern(/config|\.json$/);
        this.analysis.dataSources.configs = configFiles;

        // Bases de données
        const dbFiles = this.findFilesByPattern(/database|db|data/i);
        this.analysis.dataSources.databases = dbFiles;

        console.log(`📊 Sources analysées: ${matrixFiles.length + referenceFiles.length + configFiles.length + dbFiles.length} fichiers`);
    }

    // Génère des recommandations d'optimisation
    async generateRecommendations() {
        console.log('💡 Génération des recommandations...');
        
        const recs = this.analysis.recommendations;

        // Scripts à fusionner
        if (this.analysis.scripts.publication.length > 3) {
            recs.push({
                type: 'merge',
                category: 'publication',
                description: `Fusionner ${this.analysis.scripts.publication.length} scripts de publication en un script unifié`,
                priority: 'high',
                files: this.analysis.scripts.publication.map(s => s.path)
            });
        }

        // Scripts obsolètes à archiver
        if (this.analysis.scripts.deprecated.length > 0) {
            recs.push({
                type: 'archive',
                category: 'cleanup',
                description: `Archiver ${this.analysis.scripts.deprecated.length} scripts obsolètes`,
                priority: 'medium',
                files: this.analysis.scripts.deprecated.map(s => s.path)
            });
        }

        // Système de scraping manquant
        if (this.analysis.scripts.scraping.length < 3) {
            recs.push({
                type: 'create',
                category: 'scraping',
                description: 'Créer un système de scraping unifié pour GitHub/forums/documentation',
                priority: 'high',
                suggestedName: 'mega-scraping-system.js'
            });
        }

        // Script maître manquant
        const masterScript = this.findMasterScript();
        if (!masterScript) {
            recs.push({
                type: 'create',
                category: 'orchestration',
                description: 'Créer un script maître orchestrant tous les autres',
                priority: 'critical',
                suggestedName: 'master-orchestrator.js'
            });
        }

        console.log(`💡 ${recs.length} recommandations générées`);
    }

    // Sauvegarde le rapport d'analyse
    async saveReport() {
        console.log('💾 Sauvegarde du rapport...');
        
        const report = {
            timestamp: new Date().toISOString(),
            project: 'Ultimate Zigbee Hub',
            version: this.getProjectVersion(),
            summary: this.generateSummary(),
            analysis: this.analysis
        };

        const reportPath = path.join(this.projectRoot, 'mega-analysis-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`✅ Rapport sauvegardé: ${reportPath}`);
        return reportPath;
    }

    // Utilitaires
    isScript(ext) {
        return ['.js', '.mjs', '.ts', '.py', '.ps1', '.bat', '.sh'].includes(ext);
    }

    isDataSource(ext, basename) {
        return ['.json', '.csv', '.md', '.txt'].includes(ext) || 
               basename.includes('matrix') || basename.includes('reference');
    }

    isDeprecated(filePath) {
        return filePath.includes('.backup') || 
               filePath.includes('deprecated') || 
               filePath.includes('old-');
    }

    getFileContent(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch {
            return '';
        }
    }

    getFileType(ext, basename, content) {
        if (ext === '.js' || ext === '.mjs') return 'javascript';
        if (ext === '.py') return 'python';
        if (ext === '.ps1') return 'powershell';
        if (ext === '.json') return 'json';
        if (ext === '.md') return 'markdown';
        return 'other';
    }

    extractFunctions(content, ext) {
        if (ext === '.js' || ext === '.mjs') {
            const matches = content.match(/(?:function|const|let|var)\s+(\w+)/g);
            return matches ? matches.map(m => m.split(/\s+/).pop()) : [];
        }
        return [];
    }

    extractDependencies(content, ext) {
        if (ext === '.js' || ext === '.mjs') {
            const requires = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
            const imports = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
            return [...requires, ...imports].map(m => m.match(/['"]([^'"]+)['"]/)[1]);
        }
        return [];
    }

    getBaseName(filePath) {
        return path.basename(filePath)
            .replace(/\.(js|mjs|py|ps1|bat|sh)$/, '')
            .replace(/[-_]\d+$/, '')
            .replace(/[-_](v|version)\d+/, '')
            .replace(/[-_](backup|old|deprecated)$/, '');
    }

    getDuplicateRecommendation(scripts) {
        const sizes = scripts.map(s => s.size);
        const largest = scripts[sizes.indexOf(Math.max(...sizes))];
        return `Conserver ${largest.path} (plus récent/complet), archiver les autres`;
    }

    findFilesByPattern(pattern) {
        const allFiles = this.getAllFiles();
        return allFiles.filter(file => 
            pattern.test(file.path) || pattern.test(path.basename(file.path))
        );
    }

    getAllFiles() {
        return [
            ...this.analysis.scripts.automation,
            ...this.analysis.scripts.publication,
            ...this.analysis.scripts.validation,
            ...this.analysis.scripts.enhancement,
            ...this.analysis.scripts.scraping,
            ...this.analysis.scripts.utilities,
            ...this.analysis.scripts.deprecated,
            ...this.analysis.dataSources.matrices,
            ...this.analysis.dataSources.references,
            ...this.analysis.dataSources.configs,
            ...this.analysis.dataSources.databases
        ];
    }

    findMasterScript() {
        const allScripts = this.getAllFiles();
        return allScripts.find(script => 
            script.path.includes('master') || 
            script.path.includes('orchestrator') ||
            script.path.includes('main')
        );
    }

    getTotalFiles() {
        return this.getAllFiles().length;
    }

    getProjectVersion() {
        try {
            const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
            return appJson.version;
        } catch {
            return 'unknown';
        }
    }

    generateSummary() {
        const total = this.getTotalFiles();
        return {
            totalFiles: total,
            scriptsByCategory: {
                automation: this.analysis.scripts.automation.length,
                publication: this.analysis.scripts.publication.length,
                validation: this.analysis.scripts.validation.length,
                enhancement: this.analysis.scripts.enhancement.length,
                scraping: this.analysis.scripts.scraping.length,
                utilities: this.analysis.scripts.utilities.length,
                deprecated: this.analysis.scripts.deprecated.length
            },
            duplicateGroups: this.analysis.duplicates.length,
            recommendations: this.analysis.recommendations.length
        };
    }

    categorizeDataSource(fileInfo) {
        const { path: filePath } = fileInfo;
        
        if (filePath.includes('matrix') || filePath.includes('matrices')) {
            this.analysis.dataSources.matrices.push(fileInfo);
        } else if (filePath.includes('reference') || filePath.includes('ref')) {
            this.analysis.dataSources.references.push(fileInfo);
        } else if (filePath.includes('config') || path.extname(filePath) === '.json') {
            this.analysis.dataSources.configs.push(fileInfo);
        } else {
            this.analysis.dataSources.databases.push(fileInfo);
        }
    }

    categorizeStructure(fileInfo) {
        const { path: filePath } = fileInfo;
        
        if (filePath.includes('drivers')) {
            this.analysis.structure.drivers.push(fileInfo);
        } else if (filePath.includes('assets')) {
            this.analysis.structure.assets.push(fileInfo);
        } else if (filePath.includes('docs') || path.extname(filePath) === '.md') {
            this.analysis.structure.documentation.push(fileInfo);
        } else if (filePath.includes('.github')) {
            this.analysis.structure.workflows.push(fileInfo);
        }
    }
}

// Exécution
async function main() {
    const analyzer = new MegaProjectAnalyzer();
    const analysis = await analyzer.analyzeProject();
    
    console.log('\n📋 RÉSUMÉ DE L\'ANALYSE');
    console.log('=======================');
    console.log(`📁 Total fichiers: ${analysis.summary?.totalFiles || 0}`);
    console.log(`🔧 Scripts automation: ${analysis.scripts.automation.length}`);
    console.log(`📤 Scripts publication: ${analysis.scripts.publication.length}`);
    console.log(`✅ Scripts validation: ${analysis.scripts.validation.length}`);
    console.log(`⚡ Scripts amélioration: ${analysis.scripts.enhancement.length}`);
    console.log(`🌐 Scripts scraping: ${analysis.scripts.scraping.length}`);
    console.log(`🔧 Scripts utilitaires: ${analysis.scripts.utilities.length}`);
    console.log(`📦 Scripts obsolètes: ${analysis.scripts.deprecated.length}`);
    console.log(`🔄 Groupes doublons: ${analysis.duplicates.length}`);
    console.log(`💡 Recommandations: ${analysis.recommendations.length}`);
    
    console.log('\n🎯 PROCHAINES ÉTAPES RECOMMANDÉES');
    analysis.recommendations.slice(0, 5).forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.description}`);
    });
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = MegaProjectAnalyzer;
