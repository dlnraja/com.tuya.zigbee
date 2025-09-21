const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 FORCE REGENERATE APP.JSON');

// Force clean
try { fs.rmSync('.homeybuild', {recursive: true}); } catch(e) {}

// Force homey compose
console.log('1. Force homey compose...');
try {
    execSync('homey app compose', {stdio: 'inherit', cwd: process.cwd()});
    console.log('✅ Compose réussi');
} catch(e) {
    console.log('⚠️ Compose échoué, continuons...');
}

// Force rebuild
console.log('2. Force rebuild...');
try {
    execSync('homey app build', {stdio: 'inherit', cwd: process.cwd()});
    console.log('✅ Build réussi');
} catch(e) {
    console.log('⚠️ Build échoué, continuons...');
}

console.log('3. Test validation...');
try {
    execSync('homey app validate', {stdio: 'inherit', cwd: process.cwd()});
    console.log('🎉 VALIDATION RÉUSSIE !');
} catch(e) {
    console.log('❌ Validation échoue encore');
}

console.log('\n🔄 FORCE REGENERATE TERMINÉ');
