const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 ULTRA_SCANNER V15 - AUDIT HOLISTIQUE');

// Phase 1: Backup sécurisé et audit
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup', {recursive: true});

// Sécurisation exclusions
['.gitignore', '.homeyignore'].forEach(file => {
  let content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (!content.includes('backup/')) {
    fs.appendFileSync(file, '\nbackup/\nscripts/organized/\n*.log\n');
  }
});

// Audit dynamique de l'architecture
const auditReport = {
  timestamp: new Date().toISOString(),
  version: 'V15.0.0',
  architecture: {},
  issues: [],
  sources: []
};

// Scan drivers
if (fs.existsSync('./drivers')) {
  const drivers = fs.readdirSync('./drivers');
  auditReport.architecture.drivers = drivers.length;
  
  let manufacturerIds = new Set();
  drivers.slice(0, 10).forEach(driver => { // Limité pour éviter timeout
    const composePath = `./drivers/${driver}/driver.compose.json`;
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath));
        if (compose.id) manufacturerIds.add(compose.id);
      } catch(e) {
        auditReport.issues.push(`${driver}: JSON malformé`);
      }
    } else {
      auditReport.issues.push(`${driver}: Manque driver.compose.json`);
    }
  });
  
  auditReport.architecture.uniqueManufacturerIds = manufacturerIds.size;
}

// Scan scripts à la racine
const rootScripts = fs.readdirSync('./')
  .filter(f => f.endsWith('.js') && !['app.js', 'package.json'].includes(f));
auditReport.architecture.rootScripts = rootScripts.length;

// Détection sources historiques
try {
  const commits = execSync('git log --oneline -5', {encoding: 'utf8'})
    .split('\n').filter(c => c);
  commits.forEach(commit => {
    if (commit.includes('TZ') || commit.includes('v')) {
      auditReport.sources.push(`Historical: ${commit.slice(0, 20)}`);
    }
  });
} catch(e) {
  auditReport.issues.push('Git log inaccessible');
}

// Sauvegarde rapport
fs.writeFileSync('./references/ultra_scan_v15.json', JSON.stringify(auditReport, null, 2));
console.log(`✅ Audit V15: ${auditReport.architecture.drivers} drivers, ${auditReport.issues.length} issues détectées`);
