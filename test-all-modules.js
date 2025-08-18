/**
 * Script de test pour tous les modules
 * Version: 3.7.0
 */

const fs = require('fs');
const path = require('path');

async function testAllModules() {
  console.log('🧪 Test de tous les modules...\n');
  
  const results = [];
  
  // Test des modules core
  console.log('📁 Test des modules core...');
  const coreModules = [
    'orchestrator',
    'preparation',
    'validator',
    'matrix-builder',
    'dashboard-builder',
    'enricher',
    'web-enricher',
    'final-validator',
    'deployer'
  ];
  
  for (const moduleName of coreModules) {
    try {
      const modulePath = path.join('src', 'core', `${moduleName}.js`);
      if (fs.existsSync(modulePath)) {
        const module = require(`./src/core/${moduleName}`);
        
        // Gestion spéciale pour l'orchestrateur
        let instance;
        if (moduleName === 'orchestrator') {
          instance = module.orchestrator || module;
        } else {
          instance = new module();
        }
        
        if (instance && typeof instance.initialize === 'function') {
          await instance.initialize();
          results.push({
            module: moduleName,
            type: 'core',
            status: '✅ OK',
            version: instance.version || 'N/A'
          });
          console.log(`  ✅ ${moduleName} - OK`);
        } else {
          results.push({
            module: moduleName,
            type: 'core',
            status: '❌ Interface invalide',
            version: 'N/A'
          });
          console.log(`  ❌ ${moduleName} - Interface invalide`);
        }
      } else {
        results.push({
          module: moduleName,
          type: 'core',
          status: '❌ Fichier manquant',
          version: 'N/A'
        });
        console.log(`  ❌ ${moduleName} - Fichier manquant`);
      }
    } catch (error) {
      results.push({
        module: moduleName,
        type: 'core',
        status: '❌ Erreur',
        version: 'N/A',
        error: error.message
      });
      console.log(`  ❌ ${moduleName} - Erreur: ${error.message}`);
    }
  }
  
  // Test des modules utils
  console.log('\n📁 Test des modules utils...');
  const utilModules = [
    'script-converter'
  ];
  
  for (const moduleName of utilModules) {
    try {
      const modulePath = path.join('src', 'utils', `${moduleName}.js`);
      if (fs.existsSync(modulePath)) {
        const module = require(`./src/utils/${moduleName}`);
        const instance = new module();
        
        if (instance && typeof instance.initialize === 'function') {
          await instance.initialize();
          results.push({
            module: moduleName,
            type: 'utils',
            status: '✅ OK',
            version: instance.version || 'N/A'
          });
          console.log(`  ✅ ${moduleName} - OK`);
        } else {
          results.push({
            module: moduleName,
            type: 'utils',
            status: '❌ Interface invalide',
            version: 'N/A'
          });
          console.log(`  ❌ ${moduleName} - Interface invalide`);
        }
      } else {
        results.push({
          module: moduleName,
          type: 'utils',
          status: '❌ Fichier manquant',
          version: 'N/A'
        });
        console.log(`  ❌ ${moduleName} - Fichier manquant`);
      }
    } catch (error) {
      results.push({
        module: moduleName,
        type: 'utils',
        status: '❌ Erreur',
        version: 'N/A',
        error: error.message
      });
      console.log(`  ❌ ${moduleName} - Erreur: ${error.message}`);
    }
  }
  
  // Test des drivers
  console.log('\n📁 Test des drivers...');
  const driverModules = [
    'tuya/tuya-bulb-rgb'
  ];
  
  for (const moduleName of driverModules) {
    try {
      const modulePath = path.join('src', 'drivers', `${moduleName}.js`);
      if (fs.existsSync(modulePath)) {
        results.push({
          module: moduleName,
          type: 'driver',
          status: '✅ OK',
          version: '3.7.0'
        });
        console.log(`  ✅ ${moduleName} - OK`);
      } else {
        results.push({
          module: moduleName,
          type: 'driver',
          status: '❌ Fichier manquant',
          version: 'N/A'
        });
        console.log(`  ❌ ${moduleName} - Fichier manquant`);
      }
    } catch (error) {
      results.push({
        module: moduleName,
        type: 'driver',
        status: '❌ Erreur',
        version: 'N/A',
        error: error.message
      });
      console.log(`  ❌ ${moduleName} - Erreur: ${error.message}`);
    }
  }
  
  // Test des fichiers de configuration
  console.log('\n📁 Test des fichiers de configuration...');
  const configFiles = [
    'package.json',
    'src/homey/homey-compose.json',
    'README.md'
  ];
  
  for (const fileName of configFiles) {
    try {
      if (fs.existsSync(fileName)) {
        const stats = fs.statSync(fileName);
        if (stats.size > 0) {
          results.push({
            module: fileName,
            type: 'config',
            status: '✅ OK',
            version: '3.7.0'
          });
          console.log(`  ✅ ${fileName} - OK (${stats.size} bytes)`);
        } else {
          results.push({
            module: fileName,
            type: 'config',
            status: '❌ Fichier vide',
            version: 'N/A'
          });
          console.log(`  ❌ ${fileName} - Fichier vide`);
        }
      } else {
        results.push({
          module: fileName,
          type: 'config',
          status: '❌ Fichier manquant',
          version: 'N/A'
        });
        console.log(`  ❌ ${fileName} - Fichier manquant`);
      }
    } catch (error) {
      results.push({
        module: fileName,
        type: 'config',
        status: '❌ Erreur',
        version: 'N/A',
        error: error.message
      });
      console.log(`  ❌ ${fileName} - Erreur: ${error.message}`);
    }
  }
  
  // Résumé des tests
  console.log('\n📊 Résumé des tests...');
  console.log('=' .repeat(50));
  
  const total = results.length;
  const ok = results.filter(r => r.status === '✅ OK').length;
  const failed = total - ok;
  
  console.log(`Total: ${total}`);
  console.log(`✅ OK: ${ok}`);
  console.log(`❌ Échecs: ${failed}`);
  console.log(`Taux de succès: ${Math.round((ok / total) * 100)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Modules en échec:');
    results.filter(r => r.status !== '✅ OK').forEach(r => {
      console.log(`  - ${r.module} (${r.type}): ${r.status}`);
      if (r.error) {
        console.log(`    Erreur: ${r.error}`);
      }
    });
  }
  
  // Sauvegarde des résultats
  const testResults = {
    timestamp: new Date().toISOString(),
    version: '3.7.0',
    summary: {
      total,
      ok,
      failed,
      successRate: Math.round((ok / total) * 100)
    },
    results
  };
  
  const distDir = 'dist';
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(distDir, 'test-results.json'),
    JSON.stringify(testResults, null, 2)
  );
  
  console.log('\n💾 Résultats sauvegardés dans dist/test-results.json');
  
  return testResults;
}

// Exécution du test
if (require.main === module) {
  testAllModules()
    .then(results => {
      console.log('\n🎉 Tests terminés !');
      process.exit(results.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n💥 Erreur lors des tests:', error.message);
      process.exit(1);
    });
}

module.exports = { testAllModules };
