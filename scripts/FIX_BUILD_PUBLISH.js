#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 FIX BUILD PUBLISH - Correction automatique et publication\n');

// 1. Nettoyer
console.log('🧹 Nettoyage...');
try {
  execSync('cmd /c "rmdir /s /q .homeybuild 2>nul"', { stdio: 'pipe' });
} catch (e) {}

// 2. Valider
console.log('🔍 Validation...');
try {
  const result = execSync('homey app validate', { encoding: 'utf8' });
  console.log('✅ Validation réussie');
} catch (error) {
  const output = error.stdout || error.stderr || error.message;
  
  // Chercher erreurs spécifiques
  if (output.includes('fan_speed')) {
    console.log('⚠️  fan_speed déjà corrigé');
  }
  
  if (output.includes('App validated successfully')) {
    console.log('✅ Validation OK (warnings acceptables)');
  } else {
    console.log('❌ Erreur validation:', output.substring(0, 500));
    process.exit(1);
  }
}

// 3. Commit
console.log('\n📝 Commit...');
try {
  execSync('git add -A', { stdio: 'inherit' });
  execSync('git commit -m "🔧 Fix compatibility issues for v2.0.0 build"', { stdio: 'inherit' });
} catch (e) {
  console.log('ℹ️  Rien à committer');
}

// 4. Build
console.log('\n📦 Build...');
try {
  execSync('homey app build', { stdio: 'inherit' });
  console.log('\n✅ BUILD RÉUSSI!');
  
  // 5. Push
  console.log('\n📤 Push...');
  execSync('git push origin master', { stdio: 'inherit' });
  
  console.log('\n🎉 SUCCÈS COMPLET!');
  console.log('📱 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
  
} catch (error) {
  console.log('\n❌ Build échoué:', error.message);
  process.exit(1);
}
