#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎯 VALIDATION FINALE HOMEY - EXÉCUTION IMMÉDIATE');
console.log('==================================================');

// Configuration
const TIMEOUT = 60000; // 60 secondes
const MAX_RETRIES = 3;

// Fonction de validation des clusters
function validateClusters() {
    console.log('\n🔍 VALIDATION DES CLUSTERS...');
    
    if (!fs.existsSync('app.json')) {
        console.log('❌ app.json non trouvé');
        return false;
    }
    
    const content = fs.readFileSync('app.json', 'utf8');
    const clusterMatches = content.match(/"clusters":\s*\[[^\]]*\]/g);
    
    if (!clusterMatches) {
        console.log('❌ Aucune section clusters trouvée');
        return false;
    }
    
    console.log(`📊 ${clusterMatches.length} sections clusters trouvées`);
    
    // Vérifier si les clusters sont numériques
    const numericClusters = clusterMatches.filter(match => 
        match.match(/"clusters":\s*\[\s*\d+/)
    );
    
    const nonNumericClusters = clusterMatches.filter(match => 
        !match.match(/"clusters":\s*\[\s*\d+/)
    );
    
    console.log(`✅ ${numericClusters.length} sections avec clusters numériques`);
    
    if (nonNumericClusters.length > 0) {
        console.log(`❌ ${nonNumericClusters.length} sections avec clusters non numériques`);
        console.log('📋 Exemples de clusters non numériques:');
        nonNumericClusters.slice(0, 3).forEach((cluster, index) => {
            console.log(`   ${index + 1}. ${cluster}`);
        });
        return false;
    }
    
    console.log('🎉 TOUS les clusters sont numériques !');
    return true;
}

// Fonction de validation Homey
function validateHomey() {
    console.log('\n🚀 VALIDATION HOMEY APP...');
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`\n📋 Tentative ${attempt}/${MAX_RETRIES}...`);
        
        try {
            console.log('⏳ Exécution de homey app validate...');
            
            const result = execSync('homey app validate', { 
                encoding: 'utf8',
                stdio: 'pipe',
                timeout: TIMEOUT
            });
            
            console.log('✅ Validation Homey RÉUSSIE !');
            console.log('📋 Sortie complète:');
            console.log(result);
            
            return { success: true, output: result };
            
        } catch (error) {
            console.log(`❌ Tentative ${attempt} échouée`);
            
            if (error.stdout) {
                console.log('📋 Stdout:');
                console.log(error.stdout);
            }
            
            if (error.stderr) {
                console.log('📋 Stderr:');
                console.log(error.stderr);
            }
            
            if (error.message) {
                console.log('📋 Message d\'erreur:');
                console.log(error.message);
            }
            
            if (attempt < MAX_RETRIES) {
                console.log(`⏳ Attente avant nouvelle tentative...`);
                // Attendre 2 secondes entre les tentatives
                setTimeout(() => {}, 2000);
            }
        }
    }
    
    console.log(`\n❌ Toutes les ${MAX_RETRIES} tentatives ont échoué`);
    return { success: false, error: 'Toutes les tentatives ont échoué' };
}

// Fonction de génération de rapport
function generateReport(results) {
    console.log('\n📋 GÉNÉRATION DU RAPPORT FINAL...');
    
    const report = {
        timestamp: new Date().toISOString(),
        validation: {
            clusters: results.clusters,
            homey: results.homey.success,
            overall: results.clusters && results.homey.success
        },
        details: {
            clustersValid: results.clusters,
            homeyValid: results.homey.success,
            homeyOutput: results.homey.output || results.homey.error
        },
        recommendations: []
    };
    
    if (results.clusters && results.homey.success) {
        report.recommendations.push(
            '🎉 VALIDATION COMPLÈTE RÉUSSIE !',
            '🚀 Prêt pour les prochaines étapes',
            '📋 Continuer avec les tests des drivers',
            '📋 Procéder à l\'enrichissement continu'
        );
    } else if (results.clusters && !results.homey.success) {
        report.recommendations.push(
            '⚠️  Clusters valides mais validation Homey échouée',
            '🔧 Vérifier la configuration Homey',
            '🔧 Relancer la validation après correction'
        );
    } else {
        report.recommendations.push(
            '❌ Validation des clusters échouée',
            '🔧 Corriger les clusters avant validation Homey',
            '🔧 Utiliser les scripts de correction'
        );
    }
    
    // Sauvegarder le rapport
    const reportPath = 'homey-validation-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Rapport sauvegardé: ${reportPath}`);
    
    return report;
}

// Exécution principale
async function main() {
    console.log('🚀 Début de la validation finale...\n');
    
    try {
        // Validation des clusters
        const clustersValid = validateClusters();
        
        // Validation Homey
        const homeyResult = validateHomey();
        
        // Résultats
        const results = {
            clusters: clustersValid,
            homey: homeyResult
        };
        
        // Rapport final
        const report = generateReport(results);
        
        // Affichage du résumé
        console.log('\n📊 RÉSUMÉ FINAL:');
        console.log('==================');
        console.log(`🔍 Clusters: ${results.clusters ? '✅ VALIDE' : '❌ INVALIDE'}`);
        console.log(`🔍 Homey: ${results.homey.success ? '✅ VALIDE' : '❌ INVALIDE'}`);
        console.log(`🎯 Global: ${report.validation.overall ? '✅ RÉUSSI' : '❌ ÉCHEC'}`);
        
        if (report.validation.overall) {
            console.log('\n🎉 VALIDATION COMPLÈTE RÉUSSIE !');
            console.log('🚀 Prêt pour les prochaines étapes');
            console.log('📋 Prochaines actions recommandées:');
            console.log('   1. Tests des drivers individuels');
            console.log('   2. Enrichissement continu');
            console.log('   3. Préparation publication');
        } else {
            console.log('\n⚠️  VALIDATION INCOMPLÈTE');
            console.log('🔧 Actions correctives nécessaires');
        }
        
        console.log('\n🎯 Validation finale terminée');
        
    } catch (error) {
        console.log(`❌ Erreur générale: ${error.message}`);
        process.exit(1);
    }
}

// Exécution
main();
