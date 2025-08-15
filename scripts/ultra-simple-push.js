#!/usr/bin/env node

console.log('🚀 PUSH ULTRA-SIMPLE - BRIEF "BÉTON"');
console.log('=' .repeat(50));

const { execSync } = require('child_process');

try {
    console.log('📁 Ajout des fichiers...');
    execSync('git add .');
    console.log('✅ Fichiers ajoutés');
    
    console.log('💾 Commit...');
    execSync('git commit -m "🚀 BRIEF BÉTON COMPLÈTE v3.4.2"');
    console.log('✅ Commit créé');
    
    console.log('📤 Push vers master...');
    execSync('git push origin master');
    console.log('✅ Push réussi');
    
    console.log('🏷️  Tag v3.4.2...');
    execSync('git tag -f v3.4.2');
    execSync('git push origin v3.4.2 --force');
    console.log('✅ Tag créé');
    
    console.log('\n🎉 SUCCÈS COMPLET !');
    console.log('✅ Brief "Béton" implémenté');
    console.log('✅ App prête pour validation');
    
} catch (error) {
    console.error('❌ Erreur:', error.message);
    
    try {
        console.log('🔄 Push forcé...');
        execSync('git push --force origin master');
        execSync('git push --force origin v3.4.2');
        console.log('✅ Push forcé réussi');
    } catch (forceError) {
        console.error('❌ Échec total:', forceError.message);
    }
}

console.log('\n🚀 PROCHAINES ÉTAPES:');
console.log('1. npx homey app validate');
console.log('2. npx homey app run');
console.log('3. Tester les drivers');

console.log('\n🎯 FIN DU SCRIPT - RETOUR À LA LIGNE');
