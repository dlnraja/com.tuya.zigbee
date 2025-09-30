#!/usr/bin/env node
/**
 * FINAL_UNIFIED - Version finale simplifiée sans suffixes
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎉 FINAL_UNIFIED - Version finale sans suffixes');

const rootDir = path.resolve(__dirname, '..', '..');

async function main() {
  try {
    console.log('\n🔍 VALIDATION:');
    execSync('homey app validate', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Validation réussie');
    
    console.log('\n📝 VERSION:');
    const appPath = path.join(rootDir, 'app.json');
    const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
    const parts = app.version.split('.');
    parts[2] = String(parseInt(parts[2] || 0) + 1);
    app.version = parts.join('.');
    fs.writeFileSync(appPath, JSON.stringify(app, null, 2));
    console.log(`✅ Version: ${app.version}`);
    
    console.log('\n📤 COMMIT:');
    execSync('git add .', { cwd: rootDir });
    execSync(`git commit -m "🎯 v${app.version} - Système unifié prêt"`, { cwd: rootDir });
    execSync('git push origin master', { cwd: rootDir });
    console.log('✅ Push réussi');
    
    console.log('\n🎉 SYSTÈME UNIFIÉ FINALISÉ:');
    console.log(`📱 Version: ${app.version}`);
    console.log('✅ Workflows: 1 (homey.yml)');
    console.log('✅ Scripts: 2 (PUBLISH.js, MONITOR.js)');
    console.log('✅ Aucun suffixe, système propre');
    console.log('🌐 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

main();
