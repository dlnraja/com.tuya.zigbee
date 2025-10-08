const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 VÉRIFICATION TOTALE');

const checks = {
  backup: fs.existsSync('./backup'),
  fusion: fs.existsSync('./fusion'),
  drivers: fs.existsSync('./drivers') ? fs.readdirSync('./drivers').length : 0,
  scripts: fs.readdirSync('.').filter(f => f.endsWith('.js')).length,
  mappings: fs.existsSync('./fusion/networks.json') && fs.existsSync('./fusion/versions.json')
};

console.log('📋 ÉTAT SYSTÈME:');
console.log(`✅ Backup: ${checks.backup}`);
console.log(`✅ Fusion: ${checks.fusion}`);
console.log(`✅ Drivers: ${checks.drivers}`);
console.log(`✅ Scripts: ${checks.scripts}`);
console.log(`✅ Mappings: ${checks.mappings}`);

// Git status
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  console.log(`📝 Git changes: ${gitStatus.split('\n').length - 1}`);
} catch (e) {
  console.log('⚠️ Git non disponible');
}

console.log('🎉 VÉRIFICATION TERMINÉE');
