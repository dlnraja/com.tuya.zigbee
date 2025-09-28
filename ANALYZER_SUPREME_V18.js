const fs = require('fs');
const path = require('path');

console.log('🔬 ANALYZER SUPREME V18 - ANALYSE PROFONDE RÉCURSIVE');
console.log('🏛️ Analyse complète répertoires backup + Sources + Manufacturer IDs');

// Phase 1: Scan récursif intelligent du dossier backup
const scanBackupRecursive = (dir, results = {sources: [], manufacturerIDs: [], patterns: {}}) => {
  if (!fs.existsSync(dir)) return results;
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Récursion dans les sous-dossiers
        scanBackupRecursive(itemPath, results);
      } else if (item.endsWith('.json') || item.endsWith('.js')) {
        // Analyse des fichiers de code/config
        try {
          const content = fs.readFileSync(itemPath, 'utf8');
          
          // Extraction manufacturer IDs
          const tzMatches = content.match(/_TZ[0-9A-Z_]+/g) || [];
          const tsMatches = content.match(/TS[0-9A-Z]+/g) || [];
          [...tzMatches, ...tsMatches].forEach(id => {
            if (!results.manufacturerIDs.includes(id)) {
              results.manufacturerIDs.push(id);
            }
          });
          
          // Détection sources (URLs, forums, références)
          const urlMatches = content.match(/https?:\/\/[^\s"']+/g) || [];
          const forumMatches = content.match(/(community\.homey|github\.com|reddit\.com|zigbee2mqtt)/g) || [];
          [...urlMatches, ...forumMatches].forEach(source => {
            if (source.length > 5 && !results.sources.includes(source)) {
              results.sources.push(source);
            }
          });
          
          // Patterns par préfixe manufacturer ID
          [...tzMatches, ...tsMatches].forEach(id => {
            const prefix = id.substring(0, 7);
            results.patterns[prefix] = (results.patterns[prefix] || 0) + 1;
          });
          
        } catch(e) {}
      }
    });
    
  } catch(e) {}
  
  return results;
};

// Phase 2: Enrichissement base de données références
const enrichReferences = (analysisData) => {
  console.log('\n📚 PHASE 2: Enrichissement base références');
  
  // Chargement référentiel existant
  let driverRefs = {};
  if (fs.existsSync('./references/driver_references.json')) {
    try {
      driverRefs = JSON.parse(fs.readFileSync('./references/driver_references.json', 'utf8'));
    } catch(e) {}
  }
  
  // Enrichissement avec données analysées
  analysisData.manufacturerIDs.forEach(id => {
    if (!driverRefs[id]) {
      // Classification intelligente par préfixe
      let category = 'unknown';
      let features = [];
      
      if (id.includes('_TZ3000_')) {
        category = 'smart_switch';
        features = ['onoff', 'measure_power'];
      } else if (id.includes('_TZE200_')) {
        category = 'climate_sensor';
        features = ['measure_temperature', 'measure_humidity'];
      } else if (id.startsWith('TS02')) {
        category = 'sensor';
        features = ['measure_temperature'];
      } else if (id.startsWith('TS01')) {
        category = 'smart_plug';
        features = ['onoff', 'measure_power'];
      }
      
      driverRefs[id] = {
        manufacturerID: id,
        category,
        features,
        sources: 'Historical analysis V18',
        addedBy: 'ANALYZER_SUPREME_V18',
        timestamp: new Date().toISOString()
      };
    }
  });
  
  // Sauvegarde référentiel enrichi
  fs.writeFileSync('./references/driver_references.json', JSON.stringify(driverRefs, null, 2));
  
  return Object.keys(driverRefs).length;
};

// Phase 3: Identification sources d'enrichissement
const identifySources = (sources) => {
  console.log('\n🌐 PHASE 3: Sources d\'enrichissement identifiées');
  
  const sourceCategories = {
    github: sources.filter(s => s.includes('github.com')),
    forums: sources.filter(s => s.includes('community.') || s.includes('forum')),
    documentation: sources.filter(s => s.includes('docs') || s.includes('.md')),
    zigbee: sources.filter(s => s.includes('zigbee') || s.includes('z2m')),
    others: sources.filter(s => !s.includes('github') && !s.includes('community') && !s.includes('docs'))
  };
  
  console.log(`  🐙 GitHub: ${sourceCategories.github.length} sources`);
  console.log(`  💬 Forums: ${sourceCategories.forums.length} sources`);
  console.log(`  📖 Documentation: ${sourceCategories.documentation.length} sources`);
  console.log(`  🔗 Zigbee: ${sourceCategories.zigbee.length} sources`);
  console.log(`  🌟 Autres: ${sourceCategories.others.length} sources`);
  
  return sourceCategories;
};

// Exécution analyse complète
console.log('🚀 DÉMARRAGE ANALYZER SUPREME V18\n');

console.log('🔍 PHASE 1: Scan récursif backup/');
const analysisResults = scanBackupRecursive('./backup');

console.log(`\n📊 RÉSULTATS ANALYSE:`);
console.log(`   🏭 ${analysisResults.manufacturerIDs.length} manufacturer IDs détectés`);
console.log(`   🌐 ${analysisResults.sources.length} sources identifiées`);
console.log(`   📈 ${Object.keys(analysisResults.patterns).length} patterns détectés`);

const enrichedCount = enrichReferences(analysisResults);
console.log(`   📚 ${enrichedCount} références dans base de données`);

const sourceCategories = identifySources(analysisResults.sources);

// Sauvegarde analyse complète
const finalAnalysis = {
  version: 'V18.0.0',
  timestamp: new Date().toISOString(),
  analysis: analysisResults,
  sourceCategories,
  enrichedReferences: enrichedCount,
  patterns: analysisResults.patterns
};

fs.writeFileSync('./references/analysis_supreme_v18.json', JSON.stringify(finalAnalysis, null, 2));

console.log('\n🎉 === ANALYZER V18 TERMINÉ - BASE DONNÉES ENRICHIE ===');
console.log(`📄 Rapport: ./references/analysis_supreme_v18.json`);
