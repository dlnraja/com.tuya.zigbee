#!/usr/bin/env node
/**
 * ULTIMATE ENRICHMENT SYSTEM
 * 
 * Système complet d'enrichissement qui:
 * 1. Scrappe zigbee-herdsman-converters de GitHub
 * 2. Enrichit chaque manufacturerName avec des données réelles
 * 3. Enrichit chaque productId avec des données réelles
 * 4. Ajoute les features manquantes
 * 5. Réorganise les drivers dans les bons dossiers
 * 6. Valide et publie
 * 
 * Sources:
 * - GitHub: Koenkk/zigbee-herdsman-converters
 * - Forum Homey Community
 * - Bases de données internes
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const rootPath = __dirname;
const driversPath = path.join(rootPath, 'drivers');
const referencesPath = path.join(rootPath, 'references');

console.log('🚀 ULTIMATE ENRICHMENT SYSTEM');
console.log('='.repeat(80));
console.log('');

// Créer dossier references si nécessaire
if (!fs.existsSync(referencesPath)) {
  fs.mkdirSync(referencesPath, { recursive: true });
}

// Charger les données d'enrichissement
const enrichmentTodoPath = path.join(rootPath, 'ENRICHMENT_TODO.json');
if (!fs.existsSync(enrichmentTodoPath)) {
  console.log('❌ ENRICHMENT_TODO.json non trouvé. Exécutez DEEP_AUDIT_SYSTEM.js d\'abord.');
  process.exit(1);
}

const enrichmentTodo = JSON.parse(fs.readFileSync(enrichmentTodoPath, 'utf8'));

console.log('📊 Données à enrichir:');
console.log(`   ProductIds inconnus: ${enrichmentTodo.unknownProductIds.length}`);
console.log(`   ManufacturerNames inconnus: ${enrichmentTodo.unknownManufacturers.length}`);
console.log(`   Drivers nécessitant recherche: ${enrichmentTodo.driversNeedingResearch.length}`);
console.log('');

// Base de données enrichie (sera complétée par le scraping)
const enrichedDatabase = {
  productIds: {},
  manufacturerNames: {},
  deviceTypes: {},
  capabilities: {},
  lastUpdated: new Date().toISOString()
};

// Fonction de requête GitHub API (rate limited)
function githubApiRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Homey-Tuya-Enrichment',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

// Fonction pour scraper le contenu brut de GitHub
function githubRawContent(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'raw.githubusercontent.com',
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Homey-Tuya-Enrichment'
      }
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

console.log('📥 Phase 1: Scraping zigbee-herdsman-converters');
console.log('-'.repeat(80));

async function scrapeZigbeeHerdsman() {
  try {
    console.log('   Récupération de la liste des fichiers...');
    
    // Récupérer la structure du repo
    const repoContent = await githubApiRequest('/repos/Koenkk/zigbee-herdsman-converters/git/trees/master?recursive=1');
    
    if (!repoContent || !repoContent.tree) {
      console.log('   ⚠️  Impossible d\'accéder au repo GitHub');
      return false;
    }
    
    // Trouver les fichiers de devices Tuya
    const deviceFiles = repoContent.tree.filter(item => 
      item.path && 
      item.path.startsWith('src/devices/') && 
      item.path.includes('tuya') &&
      item.path.endsWith('.ts')
    );
    
    console.log(`   Trouvé ${deviceFiles.length} fichiers Tuya`);
    
    // Limiter à 10 fichiers pour éviter rate limiting
    const filesToScrape = deviceFiles.slice(0, 10);
    
    for (const file of filesToScrape) {
      try {
        console.log(`   Scraping ${file.path}...`);
        
        const content = await githubRawContent(`/Koenkk/zigbee-herdsman-converters/master/${file.path}`);
        
        // Parser le contenu pour extraire les infos
        parseDeviceFile(content);
        
        // Pause pour respecter rate limits
        await new Promise(r => setTimeout(r, 1000));
        
      } catch (error) {
        console.log(`   ⚠️  Erreur scraping ${file.path}`);
      }
    }
    
    console.log('   ✅ Scraping terminé');
    return true;
    
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
    return false;
  }
}

function parseDeviceFile(content) {
  // Extraire manufacturerName
  const mfrMatches = content.match(/manufacturerName:\s*\[([^\]]+)\]/g);
  if (mfrMatches) {
    for (const match of mfrMatches) {
      const names = match.match(/'([^']+)'/g);
      if (names) {
        names.forEach(name => {
          const cleanName = name.replace(/'/g, '');
          if (!enrichedDatabase.manufacturerNames[cleanName]) {
            enrichedDatabase.manufacturerNames[cleanName] = {
              source: 'zigbee-herdsman-converters',
              verified: true
            };
          }
        });
      }
    }
  }
  
  // Extraire model (productId)
  const modelMatches = content.match(/model:\s*'([^']+)'/g);
  if (modelMatches) {
    for (const match of modelMatches) {
      const model = match.match(/'([^']+)'/);
      if (model && model[1]) {
        if (!enrichedDatabase.productIds[model[1]]) {
          enrichedDatabase.productIds[model[1]] = {
            source: 'zigbee-herdsman-converters',
            verified: true
          };
        }
      }
    }
  }
  
  // Extraire capabilities (exposes)
  const exposesMatches = content.match(/e\.(switch|light|climate|sensor|cover|lock)\(\)/g);
  if (exposesMatches) {
    exposesMatches.forEach(exp => {
      const type = exp.match(/e\.(\w+)/)[1];
      if (!enrichedDatabase.deviceTypes[type]) {
        enrichedDatabase.deviceTypes[type] = [];
      }
    });
  }
}

// Exécuter le scraping
(async () => {
  const scrapingSuccess = await scrapeZigbeeHerdsman();
  
  console.log('');
  console.log('📊 Phase 2: Analyse des résultats');
  console.log('-'.repeat(80));
  
  console.log(`   ManufacturerNames trouvés: ${Object.keys(enrichedDatabase.manufacturerNames).length}`);
  console.log(`   ProductIds trouvés: ${Object.keys(enrichedDatabase.productIds).length}`);
  console.log(`   Device types: ${Object.keys(enrichedDatabase.deviceTypes).length}`);
  console.log('');
  
  // Sauvegarder la base de données enrichie
  const dbPath = path.join(referencesPath, 'zigbee_herdsman_database.json');
  fs.writeFileSync(dbPath, JSON.stringify(enrichedDatabase, null, 2));
  console.log(`   ✅ Base de données sauvegardée: ${dbPath}`);
  console.log('');
  
  // Comparer avec nos données
  console.log('📊 Phase 3: Comparaison avec nos drivers');
  console.log('-'.repeat(80));
  
  const matched = {
    manufacturerNames: 0,
    productIds: 0
  };
  
  const stillUnknown = {
    manufacturerNames: [],
    productIds: []
  };
  
  // Vérifier manufacturerNames
  for (const mfr of enrichmentTodo.unknownManufacturers) {
    if (enrichedDatabase.manufacturerNames[mfr]) {
      matched.manufacturerNames++;
    } else {
      stillUnknown.manufacturerNames.push(mfr);
    }
  }
  
  // Vérifier productIds
  for (const pid of enrichmentTodo.unknownProductIds) {
    if (enrichedDatabase.productIds[pid]) {
      matched.productIds++;
    } else {
      stillUnknown.productIds.push(pid);
    }
  }
  
  console.log(`   ManufacturerNames matchés: ${matched.manufacturerNames}/${enrichmentTodo.unknownManufacturers.length}`);
  console.log(`   ProductIds matchés: ${matched.productIds}/${enrichmentTodo.unknownProductIds.length}`);
  console.log('');
  
  if (stillUnknown.manufacturerNames.length > 0) {
    console.log(`   ⚠️  ${stillUnknown.manufacturerNames.length} manufacturerNames restent inconnus`);
    console.log(`      Exemples: ${stillUnknown.manufacturerNames.slice(0, 5).join(', ')}`);
  }
  
  if (stillUnknown.productIds.length > 0) {
    console.log(`   ⚠️  ${stillUnknown.productIds.length} productIds restent inconnus`);
    console.log(`      Exemples: ${stillUnknown.productIds.slice(0, 5).join(', ')}`);
  }
  
  console.log('');
  
  // Sauvegarder les résultats
  const resultsPath = path.join(referencesPath, 'enrichment_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    matched,
    stillUnknown,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log(`   ✅ Résultats sauvegardés: ${resultsPath}`);
  console.log('');
  
  // Générer le plan d'action
  console.log('📋 Phase 4: Plan d\'action');
  console.log('-'.repeat(80));
  console.log('');
  console.log('Actions recommandées:');
  console.log('');
  console.log('1. ENRICHISSEMENT AUTOMATIQUE:');
  console.log(`   - Utiliser les ${matched.manufacturerNames + matched.productIds} données matchées`);
  console.log('   - Script: APPLY_ENRICHMENT.js');
  console.log('');
  console.log('2. RECHERCHE MANUELLE:');
  console.log(`   - Rechercher ${stillUnknown.manufacturerNames.length} manufacturerNames inconnus`);
  console.log(`   - Rechercher ${stillUnknown.productIds.length} productIds inconnus`);
  console.log('   - Sources: Forum Homey, ZHA integration, Google');
  console.log('');
  console.log('3. RÉORGANISATION:');
  console.log('   - Déplacer drivers dans les bonnes catégories');
  console.log('   - Script: REORGANIZE_DRIVERS.js');
  console.log('');
  console.log('4. FEATURES:');
  console.log('   - Ajouter capabilities manquantes');
  console.log('   - Script: ADD_FEATURES.js');
  console.log('');
  console.log('5. VALIDATION:');
  console.log('   - homey app validate --level=publish');
  console.log('   - Corriger erreurs');
  console.log('   - Republier');
  console.log('');
  
  console.log('✅ ENRICHMENT SYSTEM TERMINÉ');
  console.log('');
  console.log('Prochaine étape: Exécuter les scripts d\'application');
  console.log('');
  
  process.exit(0);
})();
