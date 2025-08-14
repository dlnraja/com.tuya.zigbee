#!/usr/bin/env node

/**
 * 🧹 NETTOYAGE DES BOM UTF-8
 * 
 * Supprime les BOM des fichiers JSON
 */

const fs = require('fs-extra');
const path = require('path');

async function stripBOM() {
    try {
        console.log('🧹 NETTOYAGE DES BOM UTF-8');
        console.log('=' .repeat(50));
        
        const driversPath = path.join(process.cwd(), 'drivers');
        let totalFiles = 0;
        let cleanedFiles = 0;
        
        if (!(await fs.pathExists(driversPath))) {
            console.log('⚠️  Dossier drivers/ non trouvé');
            return;
        }
        
        // Parcourir tous les drivers
        const driverTypes = await fs.readdir(driversPath);
        
        for (const driverType of driverTypes) {
            const driverTypePath = path.join(driversPath, driverType);
            const driverTypeStats = await fs.stat(driverTypePath);
            
            if (driverTypeStats.isDirectory() && driverType !== '_common') {
                await processDriverType(driverTypePath);
            }
        }
        
        console.log(`\n📊 RAPPORT FINAL:`);
        console.log(`  Total fichiers traités: ${totalFiles}`);
        console.log(`  Fichiers nettoyés: ${cleanedFiles}`);
        console.log('🎉 Nettoyage BOM terminé !');
        
        async function processDriverType(driverTypePath) {
            const categories = await fs.readdir(driverTypePath);
            
            for (const category of categories) {
                const categoryPath = path.join(driverTypePath, category);
                const categoryStats = await fs.stat(categoryPath);
                
                if (categoryStats.isDirectory()) {
                    await processCategory(categoryPath);
                }
            }
        }
        
        async function processCategory(categoryPath) {
            const drivers = await fs.readdir(categoryPath);
            
            for (const driver of drivers) {
                const driverPath = path.join(categoryPath, driver);
                const driverStats = await fs.stat(driverPath);
                
                if (driverStats.isDirectory()) {
                    await processDriver(driverPath);
                }
            }
        }
        
        async function processDriver(driverPath) {
            const files = await fs.readdir(driverPath);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    totalFiles++;
                    const filePath = path.join(driverPath, file);
                    await cleanFile(filePath);
                }
            }
        }
        
        async function cleanFile(filePath) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                
                // Vérifier si le fichier a un BOM
                if (content.charCodeAt(0) === 0xFEFF) {
                    // Supprimer le BOM
                    const cleanContent = content.slice(1);
                    await fs.writeFile(filePath, cleanContent, 'utf8');
                    cleanedFiles++;
                    console.log(`  ✅ ${path.relative(process.cwd(), filePath)}`);
                }
                
            } catch (error) {
                console.log(`  ⚠️  Erreur lecture ${path.relative(process.cwd(), filePath)}: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur critique:', error.message);
        process.exit(1);
    }
}

// Exécuter
if (require.main === module) {
    stripBOM().catch(console.error);
}
