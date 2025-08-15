#!/usr/bin/env node

/**
 * 🚀 FINAL FOLDER PROCESSOR - BRIEF "BÉTON"
 * 
 * Script de traitement du dossier FINAL pour extraire toutes les informations utiles
 */

const fs = require('fs-extra');
const path = require('path');

class FinalFolderProcessor {
    constructor() {
        this.projectRoot = process.cwd();
        this.finalDir = 'D:\\Download\\FINAL';
        this.results = {
            filesFound: [],
            scriptsExtracted: [],
            configsFound: [],
            totalSize: 0
        };
    }

    async run() {
        try {
            console.log('🚀 FINAL FOLDER PROCESSOR - BRIEF "BÉTON"');
            console.log('=' .repeat(70));
            console.log('🎯 Traitement du dossier FINAL...\n');

            // 1. Vérification de l'existence du dossier FINAL
            if (!fs.existsSync(this.finalDir)) {
                console.log('❌ Dossier FINAL non trouvé dans D:\\Download');
                return;
            }

            // 2. Analyse complète du contenu
            await this.analyzeFinalFolder();
            
            // 3. Extraction des éléments utiles
            await this.extractUsefulElements();
            
            // 4. Rapport final
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Erreur lors du traitement du dossier FINAL:', error);
        }
    }

    async analyzeFinalFolder() {
        console.log('🔍 Analyse complète du dossier FINAL...');
        
        try {
            const items = fs.readdirSync(this.finalDir, { withFileTypes: true });
            console.log(`   📁 ${items.length} éléments trouvés dans FINAL`);
            
            for (const item of items) {
                const itemPath = path.join(this.finalDir, item.name);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    console.log(`   📁 ${item.name}/ (dossier)`);
                    await this.analyzeSubDirectory(itemPath, item.name);
                } else {
                    const sizeKB = (stats.size / 1024).toFixed(1);
                    console.log(`   📄 ${item.name} (${sizeKB} KB)`);
                    this.results.filesFound.push({
                        name: item.name,
                        path: itemPath,
                        size: stats.size,
                        type: 'file'
                    });
                    this.results.totalSize += stats.size;
                }
            }
            
            console.log('');
            
        } catch (error) {
            console.log(`   ❌ Erreur lors de l'analyse: ${error.message}`);
        }
    }

    async analyzeSubDirectory(dirPath, dirName) {
        try {
            const subItems = fs.readdirSync(dirPath, { withFileTypes: true });
            console.log(`      📊 ${subItems.length} sous-éléments dans ${dirName}`);
            
            for (const subItem of subItems.slice(0, 5)) { // Afficher les 5 premiers
                const subItemPath = path.join(dirPath, subItem.name);
                const subStats = fs.statSync(subItemPath);
                
                if (subStats.isDirectory()) {
                    console.log(`         📁 ${subItem.name}/`);
                } else {
                    const sizeKB = (subStats.size / 1024).toFixed(1);
                    console.log(`         📄 ${subItem.name} (${sizeKB} KB)`);
                }
            }
            
            if (subItems.length > 5) {
                console.log(`         ... et ${subItems.length - 5} autres éléments`);
            }
            
        } catch (error) {
            console.log(`         ❌ Erreur analyse sous-dossier: ${error.message}`);
        }
    }

    async extractUsefulElements() {
        console.log('🔧 Extraction des éléments utiles...');
        
        // 1. Recherche de scripts
        await this.extractScripts();
        
        // 2. Recherche de configurations
        await this.extractConfigs();
        
        // 3. Recherche de documentation
        await this.extractDocumentation();
        
        console.log('');
    }

    async extractScripts() {
        console.log('   📜 Extraction des scripts...');
        
        try {
            const scriptFiles = this.findFilesByExtension(this.finalDir, ['.js', '.ps1', '.bat', '.sh']);
            console.log(`      📊 ${scriptFiles.length} scripts trouvés`);
            
            for (const script of scriptFiles.slice(0, 10)) { // Afficher les 10 premiers
                console.log(`         📄 ${path.basename(script)}`);
                this.results.scriptsExtracted.push(script);
            }
            
            if (scriptFiles.length > 10) {
                console.log(`         ... et ${scriptFiles.length - 10} autres scripts`);
            }
            
        } catch (error) {
            console.log(`      ❌ Erreur extraction scripts: ${error.message}`);
        }
    }

    async extractConfigs() {
        console.log('   ⚙️ Extraction des configurations...');
        
        try {
            const configFiles = this.findFilesByExtension(this.finalDir, ['.json', '.yaml', '.yml', '.xml', '.conf', '.ini']);
            console.log(`      📊 ${configFiles.length} fichiers de configuration trouvés`);
            
            for (const config of configFiles.slice(0, 5)) { // Afficher les 5 premiers
                console.log(`         📄 ${path.basename(config)}`);
                this.results.configsFound.push(config);
            }
            
            if (configFiles.length > 5) {
                console.log(`         ... et ${configFiles.length - 5} autres configs`);
            }
            
        } catch (error) {
            console.log(`      ❌ Erreur extraction configs: ${error.message}`);
        }
    }

    async extractDocumentation() {
        console.log('   📚 Extraction de la documentation...');
        
        try {
            const docFiles = this.findFilesByExtension(this.finalDir, ['.md', '.txt', '.pdf', '.doc', '.docx']);
            console.log(`      📊 ${docFiles.length} fichiers de documentation trouvés`);
            
            // Analyser les fichiers de documentation importants
            for (const doc of docFiles.slice(0, 3)) {
                if (doc.toLowerCase().includes('readme') || doc.toLowerCase().includes('guide')) {
                    console.log(`         📖 ${path.basename(doc)} (IMPORTANT)`);
                    await this.analyzeImportantDocument(doc);
                }
            }
            
        } catch (error) {
            console.log(`      ❌ Erreur extraction docs: ${error.message}`);
        }
    }

    async analyzeImportantDocument(docPath) {
        try {
            if (docPath.toLowerCase().endsWith('.md') || docPath.toLowerCase().endsWith('.txt')) {
                const content = fs.readFileSync(docPath, 'utf8');
                const lines = content.split('\n');
                
                console.log(`            📝 ${lines.length} lignes de contenu`);
                
                // Rechercher des informations clés
                const keyInfo = this.extractKeyInformation(content);
                if (keyInfo.length > 0) {
                    console.log(`            🔑 Informations clés trouvées: ${keyInfo.length}`);
                    for (const info of keyInfo.slice(0, 3)) {
                        console.log(`               💡 ${info}`);
                    }
                }
            }
        } catch (error) {
            console.log(`            ❌ Erreur analyse document: ${error.message}`);
        }
    }

    extractKeyInformation(content) {
        const keyInfo = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Rechercher des informations importantes
            if (trimmedLine.includes('TODO') || trimmedLine.includes('FIXME')) {
                keyInfo.push(`Action requise: ${trimmedLine}`);
            } else if (trimmedLine.includes('IMPORTANT') || trimmedLine.includes('ATTENTION')) {
                keyInfo.push(`Important: ${trimmedLine}`);
            } else if (trimmedLine.includes('Version') || trimmedLine.includes('v3.')) {
                keyInfo.push(`Version: ${trimmedLine}`);
            } else if (trimmedLine.includes('Driver') || trimmedLine.includes('Capability')) {
                keyInfo.push(`Driver/Capability: ${trimmedLine}`);
            }
        }
        
        return keyInfo;
    }

    findFilesByExtension(rootDir, extensions) {
        const files = [];
        
        try {
            const items = fs.readdirSync(rootDir, { withFileTypes: true });
            
            for (const item of items) {
                const itemPath = path.join(rootDir, item.name);
                
                if (item.isDirectory()) {
                    // Récursion pour les sous-dossiers
                    files.push(...this.findFilesByExtension(itemPath, extensions));
                } else if (item.isFile()) {
                    const ext = path.extname(item.name).toLowerCase();
                    if (extensions.includes(ext)) {
                        files.push(itemPath);
                    }
                }
            }
        } catch (error) {
            // Ignorer les erreurs d'accès
        }
        
        return files;
    }

    generateReport() {
        console.log('🎯 RAPPORT FINAL DU TRAITEMENT FINAL');
        console.log('=' .repeat(70));
        console.log(`📊 Fichiers trouvés: ${this.results.filesFound.length}`);
        console.log(`📜 Scripts extraits: ${this.results.scriptsExtracted.length}`);
        console.log(`⚙️ Configurations trouvées: ${this.results.configsFound.length}`);
        console.log(`📦 Taille totale: ${(this.results.totalSize / 1024 / 1024).toFixed(1)} MB`);
        
        if (this.results.scriptsExtracted.length > 0) {
            console.log('\n📜 SCRIPTS IMPORTANTS TROUVÉS:');
            for (const script of this.results.scriptsExtracted.slice(0, 5)) {
                console.log(`   📄 ${path.basename(script)}`);
            }
        }
        
        if (this.results.configsFound.length > 0) {
            console.log('\n⚙️ CONFIGURATIONS IMPORTANTES:');
            for (const config of this.results.configsFound.slice(0, 3)) {
                console.log(`   📄 ${path.basename(config)}`);
            }
        }
        
        console.log('\n🚀 PROCHAINES ÉTAPES:');
        console.log('   1. ✅ Analyse du dossier FINAL terminée');
        console.log('   2. 🎯 Intégration des scripts utiles');
        console.log('   3. 🎯 Application des configurations');
        console.log('   4. 🎯 Fusion avec le projet principal');
        
        console.log('\n🎉 TRAITEMENT DU DOSSIER FINAL TERMINÉ AVEC SUCCÈS !');
    }
}

if (require.main === module) {
    const processor = new FinalFolderProcessor();
    processor.run().catch(console.error);
}

module.exports = FinalFolderProcessor;
