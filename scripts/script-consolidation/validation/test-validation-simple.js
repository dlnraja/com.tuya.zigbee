#!/usr/bin/env node
'use strict';

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
            
            // Afficher les clusters non numériques
            const nonNumericClusters = clusterMatches.filter(match => 
                !match.match(/"clusters":\s*\[\s*\d+/)
            );
            
            console.log('📋 Clusters non numériques:');
            nonNumericClusters.slice(0, 5).forEach((cluster, index) => {
                console.log(`   ${index + 1}. ${cluster}`);
            });
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
        stdio: 'pipe',
        timeout: 30000
    });
    
    console.log('✅ Validation réussie !');
    console.log('📋 Sortie:');
    console.log(result);
    
} catch (error) {
    console.log('❌ Validation échouée');
    
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
}

console.log('\n🎯 Test terminé');
