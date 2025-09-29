#!/usr/bin/env node
/**
 * FALLBACK_PUBLISH - Publication de secours si GitHub Actions échoue
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🆘 FALLBACK_PUBLISH - Publication de secours');

const rootDir = path.resolve(__dirname, '..', '..');

function validateApp() {
  try {
    console.log('✅ Validation app...');
    execSync('homey app validate', { cwd: rootDir, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('❌ Validation échouée');
    return false;
  }
}

function updateVersion() {
  try {
    const appPath = path.join(rootDir, 'app.json');
    const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
    
    const parts = app.version.split('.');
    parts[2] = String(parseInt(parts[2] || 0) + 1);
    app.version = parts.join('.');
    
    fs.writeFileSync(appPath, JSON.stringify(app, null, 2));
    console.log(`📝 Version mise à jour: ${app.version}`);
    return app.version;
  } catch (error) {
    console.error('❌ Erreur mise à jour version');
    return null;
  }
}

function publishWithExpect() {
  console.log('🚀 Publication avec expect...');
  
  const expectScript = `
spawn -noecho homey app publish
expect {
  "uncommitted changes" { send "y\\r"; exp_continue }
  "update.*version" { send "y\\r"; exp_continue }
  "What kind of update" { send "patch\\r"; exp_continue }
  "changelog" { send "🔄 Fallback publication - Enhanced Ultimate Zigbee Hub with comprehensive driver support\\r"; exp_continue }
  "Are you sure" { send "y\\r"; exp_continue }
  "published" { exit 0 }
  timeout { exit 1 }
}
`;
  
  try {
    fs.writeFileSync('/tmp/publish_expect.exp', expectScript);
    execSync('expect /tmp/publish_expect.exp', { 
      cwd: rootDir, 
      stdio: 'inherit',
      timeout: 300000 
    });
    return true;
  } catch (error) {
    console.error('❌ Publication expect échouée:', error.message);
    return false;
  }
}

function manualPublish() {
  console.log('💻 Publication manuelle interactive...');
  
  return new Promise((resolve) => {
    const publish = spawn('homey', ['app', 'publish'], {
      cwd: rootDir,
      stdio: 'inherit'
    });
    
    publish.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function executePublish() {
  console.log('🎯 DÉMARRAGE PUBLICATION DE SECOURS');
  
  // 1. Validation
  if (!validateApp()) {
    console.error('❌ App invalide - arrêt');
    return false;
  }
  
  // 2. Mise à jour version
  const newVersion = updateVersion();
  if (!newVersion) {
    console.error('❌ Erreur version - arrêt');
    return false;
  }
  
  // 3. Tentatives de publication
  const methods = [
    { name: 'Expect Script', func: publishWithExpect },
    { name: 'Interactive Manual', func: manualPublish }
  ];
  
  for (const method of methods) {
    console.log(`\n🔄 Tentative: ${method.name}`);
    
    try {
      const success = await method.func();
      if (success) {
        console.log(`✅ ${method.name} RÉUSSIE!`);
        
        // Commit version
        try {
          execSync('git add app.json', { cwd: rootDir });
          execSync(`git commit -m "🔖 Version ${newVersion} - Fallback publish"`, { cwd: rootDir });
          execSync('git push origin master', { cwd: rootDir });
          console.log('✅ Version committée');
        } catch (e) {
          console.log('⚠️  Commit version échoué');
        }
        
        return true;
      }
    } catch (error) {
      console.error(`❌ ${method.name} échouée:`, error.message);
    }
  }
  
  console.error('❌ TOUTES LES MÉTHODES DE SECOURS ONT ÉCHOUÉ');
  return false;
}

// Génération du rapport
function generateReport(success) {
  const report = {
    timestamp: new Date().toISOString(),
    type: 'FALLBACK_PUBLICATION',
    success,
    version: fs.existsSync(path.join(rootDir, 'app.json')) ? 
      JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8')).version : 'unknown',
    monitoring: {
      githubActions: 'https://github.com/dlnraja/com.tuya.zigbee/actions',
      homeyDashboard: 'https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub'
    }
  };
  
  const reportPath = path.join(__dirname, '..', 'reports', 'fallback_publish_report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`💾 Rapport: ${reportPath}`);
}

// Exécution
executePublish().then(success => {
  generateReport(success);
  
  if (success) {
    console.log('\n🎉 PUBLICATION DE SECOURS RÉUSSIE!');
    console.log('📱 Vérifiez le Dashboard Homey pour confirmation');
  } else {
    console.log('\n❌ PUBLICATION DE SECOURS ÉCHOUÉE');
    console.log('🔧 Intervention manuelle requise');
  }
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  generateReport(false);
});
