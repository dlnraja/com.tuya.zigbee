#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 TEST HOMEY SIMPLE');
console.log('=====================');

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
            console.log('🚀 Prêt pour validation Homey');
            console.log('\n📋 COMMANDE À EXÉCUTER:');
            console.log('   homey app validate');
        } else {
            console.log('⚠️  Certains clusters ne sont pas numériques');
        }
    }
} else {
    console.log('❌ app.json non trouvé');
}

console.log('\n🎯 Test terminé');
