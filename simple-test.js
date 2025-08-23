#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 TEST VALIDATION HOMEY SIMPLE');
console.log('================================');

// Vérifier app.json
if (fs.existsSync('app.json')) {
    console.log('✅ app.json trouvé');
    
    const stats = fs.statSync('app.json');
    console.log(`📊 Taille: ${stats.size} bytes`);
    
    // Vérifier les clusters
    const content = fs.readFileSync('app.json', 'utf8');
    const clusterMatches = content.match(/"clusters":\s*\[[^\]]*\]/g);
    
    if (clusterMatches) {
        console.log(`✅ ${clusterMatches.length} sections clusters trouvées`);
        
        // Vérifier si les clusters sont numériques
        const numericClusters = clusterMatches.filter(match => 
            match.match(/"clusters":\s*\[\s*\d+/)
        );
        
        console.log(`✅ ${numericClusters.length} sections avec clusters numériques`);
        
        if (numericClusters.length === clusterMatches.length) {
            console.log('🎉 TOUS les clusters sont numériques !');
        } else {
            console.log('⚠️  Certains clusters ne sont pas numériques');
        }
    }
} else {
    console.log('❌ app.json non trouvé');
    process.exit(1);
}

console.log('\n🚀 Test de validation Homey...');

try {
    const result = execSync('homey app validate', { 
        encoding: 'utf8',
        stdio: 'pipe'
    });
    
    console.log('✅ Validation réussie !');
    console.log('📋 Sortie:');
    console.log(result);
    
} catch (error) {
    console.log('❌ Validation échouée');
    console.log('📋 Erreur:');
    console.log(error.stdout || error.message);
    
    if (error.stderr) {
        console.log('📋 Stderr:');
        console.log(error.stderr);
    }
}

console.log('\n🎯 Test terminé');
