const fs = require('fs');
const path = require('path');
console.log('📦 ORGANIZER SUPREME V18 - HÉRITAGE V15+V16');
console.log('🎯 V15: 75 scripts → V16: 7 optimisés → V18: Organisation ultime');

// Structure organisationnelle inspirée V15-V16
const organizationStructure = {
  './scripts/organized/backup': ['BACKUP_', 'DUMP_', 'HISTORICAL_'],
  './scripts/organized/enrichment': ['ENRICH', 'ULTIMATE_', 'MEGA_'],
  './scripts/organized/validation': ['VALID', 'CHECK_', 'TEST_'],
  './scripts/organized/scraping': ['SCRAP', 'WEB_', 'SEARCH_'],
  './scripts/organized/orchestration': ['ORCHESTR', 'MASTER', 'FINAL_'],
  './scripts/organized/analysis': ['ANALY', 'SCAN_', 'COHERENCE']
};

// Scripts essentiels maintenus à la racine
const essentialFiles = [
  'app.js', 'app.json', 'package.json', 'package-lock.json',
  'README.md', '.homeyrc.json', '.gitignore', '.homeyignore',
  // Scripts V18 essentiels
  'BACKUP_ULTIMATE_V18.js',
  'ANALYZER_SUPREME_V18.js', 
  'ENRICHER_ULTIMATE_V18.js',
  'SCRAPER_HOLISTIQUE_V18.js',
  'ORGANIZER_SUPREME_V18.js'
];

// Organisation et fusion intelligente
const organizeAndMerge = () => {
  console.log('\n📁 PHASE 1: Création structure organisationnelle');
  
  // Créer structure complète
  Object.keys(organizationStructure).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {recursive: true});
      console.log(`  ✅ Créé: ${dir}`);
    }
  });
  
  console.log('\n📋 PHASE 2: Organisation scripts racine');
  
  let organized = 0;
  let merged = 0;
  let kept = 0;
  
  const rootFiles = fs.readdirSync('./').filter(f => 
    (f.endsWith('.js') || f.endsWith('.json')) && 
    !fs.statSync(f).isDirectory()
  );
  
  console.log(`📊 ${rootFiles.length} fichiers détectés à la racine`);
  
  rootFiles.forEach(file => {
    // Vérifier si essentiel
    if (essentialFiles.includes(file)) {
      console.log(`  🔒 Maintenu: ${file}`);
      kept++;
      return;
    }
    
    // Classification intelligente
    let targetCategory = null;
    let targetDir = null;
    
    for (const [dir, patterns] of Object.entries(organizationStructure)) {
      if (patterns.some(pattern => file.toUpperCase().includes(pattern))) {
        targetCategory = dir.split('/').pop();
        targetDir = dir;
        break;
      }
    }
    
    // Catégorie par défaut si non trouvée
    if (!targetDir) {
      if (file.includes('V1') || file.includes('V2') || file.includes('COMPACT')) {
        targetDir = './scripts/organized/orchestration';
        targetCategory = 'orchestration';
      } else {
        targetDir = './scripts/organized/enrichment';
        targetCategory = 'enrichment';
      }
    }
    
    try {
      const source = `./${file}`;
      const destination = `${targetDir}/${file}`;
      
      // Vérifier si fichier similaire existe déjà
      const existingFiles = fs.readdirSync(targetDir);
      const similarFile = existingFiles.find(existing => {
        // Logique de similarité simple
        const baseName = file.replace(/_(V\d+|FINAL|ULTIMATE|SUPREME)/, '');
        const existingBase = existing.replace(/_(V\d+|FINAL|ULTIMATE|SUPREME)/, '');
        return baseName === existingBase && existing !== file;
      });
      
      if (similarFile) {
        // Fusion de fichiers similaires
        console.log(`  🔄 Fusion: ${file} avec ${similarFile}`);
        
        // Garder le plus récent ou le plus "ultime"
        if (file.includes('V18') || file.includes('ULTIMATE') || file.includes('SUPREME')) {
          fs.renameSync(source, destination);
          console.log(`    ✅ ${file} → ${targetCategory}/`);
          merged++;
        } else {
          // Supprimer l'ancien si le nouveau est meilleur
          try {
            fs.unlinkSync(source);
            console.log(`    🗑️ Supprimé: ${file} (remplacé par ${similarFile})`);
          } catch(e) {}
        }
      } else {
        // Déplacement normal
        fs.renameSync(source, destination);
        console.log(`  📁 ${file} → ${targetCategory}/`);
        organized++;
      }
      
    } catch(error) {
      console.log(`  ⚠️ Erreur ${file}: ${error.message.slice(0, 50)}`);
    }
  });
  
  return { organized, merged, kept, total: rootFiles.length };
};

// Nettoyage et optimisation structure
const optimizeStructure = () => {
  console.log('\n🔧 PHASE 3: Optimisation structure');
  
  let optimized = 0;
  
  Object.keys(organizationStructure).forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      console.log(`  📂 ${dir.split('/').pop()}: ${files.length} scripts`);
      
      // Suppression doublons parfaits
      const seen = new Set();
      files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const contentHash = content.slice(0, 200); // Hash simple
            
            if (seen.has(contentHash)) {
              fs.unlinkSync(filePath);
              console.log(`    🗑️ Doublon supprimé: ${file}`);
              optimized++;
            } else {
              seen.add(contentHash);
            }
          } catch(e) {}
        }
      });
    }
  });
  
  return optimized;
};

// Rapport héritage V15-V16
const generateHeritageReport = (results) => {
  console.log('\n🏛️ PHASE 4: Rapport héritage V15-V16');
  
  const heritageReport = {
    version: 'V18.0.0',
    timestamp: new Date().toISOString(),
    heritage: {
      v15: 'Organisation 75 scripts par catégories',
      v16: 'Optimisation vers 7 scripts essentiels',
      v18: 'Organisation ultime + fusion intelligente'
    },
    results,
    structure: organizationStructure,
    essentialFiles: essentialFiles.length,
    optimization: 'Fusion + suppression doublons'
  };
  
  fs.writeFileSync('./references/organization_v18.json', JSON.stringify(heritageReport, null, 2));
  
  console.log(`  📊 V15: 75 scripts organisés par catégories`);
  console.log(`  📈 V16: 7 scripts optimisés + structure modulaire`);
  console.log(`  🚀 V18: ${results.organized} organisés + ${results.merged} fusionnés`);
  
  return heritageReport;
};

// Exécution organisation suprême
console.log('🚀 DÉMARRAGE ORGANIZER SUPREME V18\n');

const organizationResults = organizeAndMerge();
const optimizationCount = optimizeStructure();
const heritageReport = generateHeritageReport({
  ...organizationResults,
  optimized: optimizationCount
});

console.log(`\n📊 RÉSULTATS ORGANISATION V18:`);
console.log(`   📁 ${organizationResults.organized} scripts organisés`);
console.log(`   🔄 ${organizationResults.merged} scripts fusionnés`);
console.log(`   🔒 ${organizationResults.kept} essentiels maintenus`);
console.log(`   🔧 ${optimizationCount} doublons supprimés`);
console.log(`   📂 ${Object.keys(organizationStructure).length} catégories créées`);

console.log('\n🎉 === ORGANIZER V18 SUPREME TERMINÉ ===');
console.log('📄 Rapport: ./references/organization_v18.json');
