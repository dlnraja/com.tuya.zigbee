const { execSync } = require('child_process');

console.log('🚀 TEST DE TERMINAL MEGA');

try {
    // Test de commandes basiques
    console.log('✅ Test echo...');
    execSync('echo "Test terminal"', { stdio: 'inherit' });
    
    console.log('✅ Test git status...');
    execSync('git status --porcelain', { stdio: 'inherit' });
    
    console.log('✅ Test node...');
    execSync('node --version', { stdio: 'inherit' });
    
    console.log('✅ Test npm...');
    execSync('npm --version', { stdio: 'inherit' });
    
    console.log('🎉 TOUS LES TESTS TERMINAL RÉUSSIS');
} catch (error) {
    console.error('❌ ERREUR TERMINAL:', error.message);
}
