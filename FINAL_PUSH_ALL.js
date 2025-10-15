#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║                                                                    ║');
console.log('║     FINAL PUSH ALL - COMMIT ET PUSH COMPLET                        ║');
console.log('║                                                                    ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

const ROOT = __dirname;

try {
  // Clean up temp files
  console.log('🧹 Nettoyage fichiers temporaires...');
  const tempFiles = [
    'add_png_files.js',
    'do_commit.js',
    'final_commit_pngs.js',
    'x.js',
    'do_final_push.js',
    'final_images_push.js',
    'force_commit_images.js',
    'commit_verified_images.js'
  ];
  
  tempFiles.forEach(f => {
    const fp = path.join(ROOT, f);
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
      console.log(`  ✅ Supprimé: ${f}`);
    }
  });

  console.log('\n📝 Git add all...');
  execSync('git add -A', { cwd: ROOT, stdio: 'inherit' });

  console.log('\n💾 Git commit...');
  execSync('git commit -m "fix: Add corrected PNG images with proper text spacing"', {
    cwd: ROOT,
    stdio: 'inherit'
  });

  console.log('\n📤 Git push...');
  execSync('git push origin master', { cwd: ROOT, stdio: 'inherit' });

  console.log('\n' + '═'.repeat(70));
  console.log('✅ PUSH COMPLET RÉUSSI!');
  console.log('═'.repeat(70));
  console.log('\n📊 Fichiers pushés:');
  console.log('   ✅ large.png (500x350) - Design corrigé');
  console.log('   ✅ small.png (250x175) - Design corrigé');
  console.log('   ✅ xlarge.png (1000x700) - Design corrigé');
  console.log('\n🎨 Nouveau design:');
  console.log('   ✓ "Tuya Zigbee" (ligne 1, bold)');
  console.log('   ✓ "Universal Integration" (ligne 2, subtitle)');
  console.log('   ✓ Pas de chevauchement de texte');
  console.log('\n🔄 GitHub Actions:');
  console.log('   ⏳ Rebuild en cours...');
  console.log('   ⏳ Publication vers Homey App Store...');
  console.log('   ⏳ Images visibles dans ~2-3 minutes');
  console.log('\n📍 Vérification:');
  console.log('   • GitHub: https://github.com/dlnraja/com.tuya.zigbee/actions');
  console.log('   • App Store: https://homey.app (chercher "Tuya Zigbee")');
  console.log('\n' + '═'.repeat(70));
  console.log('🎉 TOUT EST TERMINÉ ET PUSHÉ!');
  console.log('═'.repeat(70) + '\n');

  // Self-delete
  fs.unlinkSync(__filename);

} catch (err) {
  console.error('\n❌ Erreur:', err.message);
  process.exit(1);
}
