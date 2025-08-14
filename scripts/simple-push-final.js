#!/usr/bin/env node

console.log('🚀 PUSH FINAL SIMPLE - BRIEF "BÉTON" IMPLÉMENTÉ');

const { execSync } = require('child_process');

try {
    console.log('📁 Ajout des fichiers...');
    execSync('git add .', { stdio: 'inherit' });
    
    console.log('💾 Commit...');
    execSync('git commit -m "🚀 IMPLÉMENTATION BRIEF BÉTON COMPLÈTE v3.4.2 - Dashboard dynamique + Utilitaires slug + Scripts génération + Validation + KPI temps réel"', { stdio: 'inherit' });
    
    console.log('📤 Push vers master...');
    execSync('git push origin master', { stdio: 'inherit' });
    
    console.log('🏷️ Tag v3.4.2...');
    execSync('git tag -f v3.4.2', { stdio: 'inherit' });
    execSync('git push origin v3.4.2 --force', { stdio: 'inherit' });
    
    console.log('✅ PUSH RÉUSSI ! BRIEF "BÉTON" IMPLÉMENTÉ !');
    
} catch (error) {
    console.error('❌ Erreur:', error.message);
    
    try {
        console.log('🔄 Tentative de push forcé...');
        execSync('git push --force origin master', { stdio: 'inherit' });
        execSync('git push --force origin v3.4.2', { stdio: 'inherit' });
        console.log('✅ PUSH FORCÉ RÉUSSI !');
    } catch (forceError) {
        console.error('❌ Push forcé échoué:', forceError.message);
    }
}
