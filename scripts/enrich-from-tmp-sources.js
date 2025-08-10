'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const CONFIG = {
  TMP_DIR: '.tmp_tuya_zip_work',
  DRIVERS_DIR: 'drivers',
  ASSETS_DIR: 'assets',
  SOURCES_TO_ANALYZE: [
    'com.tuya.zigbee-master (1)_1754813877011',
    'tuya-zigbee-universal-3.0.0-local-bundle_1754813249833',
    'com.tuya.zigbee.rebuild.kimi_1754813246903'
  ]
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function echo() {
  console.log('\n');
}

// Analyser une source spécifique
async function analyzeSource(sourcePath) {
  log(`🔍 ANALYSE DE LA SOURCE: ${path.basename(sourcePath)}`);
  
  const analysis = {
    source: path.basename(sourcePath),
    path: sourcePath,
    drivers: [],
    assets: [],
    structure: {},
    improvements: []
  };
  
  try {
    // Analyser les drivers
    const driversPath = path.join(sourcePath, 'drivers');
    if (fs.existsSync(driversPath)) {
      analysis.drivers = await analyzeDriversInSource(driversPath);
    }
    
    // Analyser les assets
    const assetsPath = path.join(sourcePath, 'assets');
    if (fs.existsSync(assetsPath)) {
      analysis.assets = await analyzeAssetsInSource(assetsPath);
    }
    
    // Analyser la structure
    analysis.structure = await analyzeSourceStructure(sourcePath);
    
    // Identifier les améliorations
    analysis.improvements = identifyImprovements(analysis);
    
  } catch (error) {
    log(`❌ Erreur lors de l'analyse de ${sourcePath}: ${error.message}`, 'error');
  }
  
  return analysis;
}

// Analyser les drivers dans une source
async function analyzeDriversInSource(driversPath) {
  const drivers = [];
  
  try {
    const items = await fsp.readdir(driversPath);
    
    for (const item of items) {
      const itemPath = path.join(driversPath, item);
      const stat = await fsp.stat(itemPath);
      
      if (stat.isDirectory()) {
        const driverInfo = await extractDriverInfoFromSource(itemPath);
        if (driverInfo) {
          drivers.push(driverInfo);
        }
      }
    }
  } catch (error) {
    log(`⚠️  Erreur lors de l'analyse des drivers: ${error.message}`, 'warning');
  }
  
  return drivers;
}

// Extraire les informations d'un driver depuis une source
async function extractDriverInfoFromSource(driverPath) {
  try {
    const driverName = path.basename(driverPath);
    const composeFile = path.join(driverPath, 'driver.compose.json');
    const jsonFile = path.join(driverPath, 'driver.json');
    
    let driverData = {};
    
    if (fs.existsSync(composeFile)) {
      try {
        const content = await fsp.readFile(composeFile, 'utf8');
        driverData = JSON.parse(content);
      } catch (parseError) {
        log(`⚠️  Erreur de parsing JSON pour ${driverName}: ${parseError.message}`, 'warning');
        return null;
      }
    } else if (fs.existsSync(jsonFile)) {
      try {
        const content = await fsp.readFile(jsonFile, 'utf8');
        driverData = JSON.parse(content);
      } catch (parseError) {
        log(`⚠️  Erreur de parsing JSON pour ${driverName}: ${parseError.message}`, 'warning');
        return null;
      }
    }
    
    return {
      name: driverName,
      path: driverPath,
      data: driverData,
      capabilities: driverData.capabilities || [],
      manufacturerName: driverData.zigbee?.manufacturerName || [],
      modelId: driverData.zigbee?.productId || [],
      class: driverData.class || 'other'
    };
    
  } catch (error) {
    log(`⚠️  Erreur lors de l'extraction des infos du driver: ${error.message}`, 'warning');
    return null;
  }
}

// Analyser les assets dans une source
async function analyzeAssetsInSource(assetsPath) {
  const assets = [];
  
  try {
    const items = await fsp.readdir(assetsPath);
    
    for (const item of items) {
      const itemPath = path.join(assetsPath, item);
      const stat = await fsp.stat(itemPath);
      
      if (stat.isFile()) {
        assets.push({
          name: item,
          path: itemPath,
          size: stat.size,
          type: path.extname(item)
        });
      } else if (stat.isDirectory()) {
        const subAssets = await analyzeAssetsInSource(itemPath);
        assets.push(...subAssets);
      }
    }
  } catch (error) {
    log(`⚠️  Erreur lors de l'analyse des assets: ${error.message}`, 'warning');
  }
  
  return assets;
}

// Analyser la structure d'une source
async function analyzeSourceStructure(sourcePath) {
  const structure = {
    hasDrivers: false,
    hasAssets: false,
    hasDocs: false,
    hasWorkflows: false,
    hasTests: false,
    fileCount: 0,
    dirCount: 0
  };
  
  try {
    const items = await fsp.readdir(sourcePath);
    
    for (const item of items) {
      const itemPath = path.join(sourcePath, item);
      const stat = await fsp.stat(itemPath);
      
      if (stat.isDirectory()) {
        structure.dirCount++;
        
        if (item === 'drivers') structure.hasDrivers = true;
        if (item === 'assets') structure.hasAssets = true;
        if (item === 'docs') structure.hasDocs = true;
        if (item === '.github') structure.hasWorkflows = true;
        if (item === 'test' || item === 'tests') structure.hasTests = true;
        
      } else {
        structure.fileCount++;
      }
    }
  } catch (error) {
    log(`⚠️  Erreur lors de l'analyse de la structure: ${error.message}`, 'warning');
  }
  
  return structure;
}

// Identifier les améliorations basées sur l'analyse
function identifyImprovements(analysis) {
  const improvements = [];
  
  // Améliorations basées sur les drivers
  if (analysis.drivers.length > 0) {
    improvements.push({
      type: 'drivers',
      description: `${analysis.drivers.length} drivers trouvés pour enrichissement`,
      priority: 'high'
    });
  }
  
  // Améliorations basées sur les assets
  if (analysis.assets.length > 0) {
    improvements.push({
      type: 'assets',
      description: `${analysis.assets.length} assets trouvés pour enrichissement`,
      priority: 'medium'
    });
  }
  
  // Améliorations basées sur la structure
  if (analysis.structure.hasDocs) {
    improvements.push({
      type: 'documentation',
      description: 'Documentation disponible pour enrichissement',
      priority: 'medium'
    });
  }
  
  if (analysis.structure.hasWorkflows) {
    improvements.push({
      type: 'workflows',
      description: 'Workflows GitHub disponibles pour amélioration',
      priority: 'low'
    });
  }
  
  return improvements;
}

// Analyser toutes les sources .tmp*
async function analyzeAllTmpSources() {
  log('🔍 ANALYSE DE TOUTES LES SOURCES .tmp*...');
  echo();
  
  const analyses = [];
  const tmpDir = path.join(process.cwd(), CONFIG.TMP_DIR);
  
  if (!fs.existsSync(tmpDir)) {
    log(`❌ Dossier .tmp* non trouvé: ${tmpDir}`, 'error');
    return analyses;
  }
  
  try {
    const sources = await fsp.readdir(tmpDir);
    
    for (const source of sources) {
      const sourcePath = path.join(tmpDir, source);
      const stat = await fsp.stat(sourcePath);
      
      if (stat.isDirectory()) {
        log(`📁 Analyse de: ${source}`);
        const analysis = await analyzeSource(sourcePath);
        analyses.push(analysis);
        echo();
      }
    }
  } catch (error) {
    log(`❌ Erreur lors de l'analyse des sources: ${error.message}`, 'error');
  }
  
  return analyses;
}

// Générer un rapport d'analyse
async function generateAnalysisReport(analyses) {
  const report = {
    timestamp: new Date().toISOString(),
    totalSources: analyses.length,
    summary: {
      totalDrivers: 0,
      totalAssets: 0,
      totalImprovements: 0
    },
    sources: analyses,
    recommendations: []
  };
  
  // Calculer les totaux
  for (const analysis of analyses) {
    report.summary.totalDrivers += analysis.drivers.length;
    report.summary.totalAssets += analysis.assets.length;
    report.summary.totalImprovements += analysis.improvements.length;
  }
  
  // Générer des recommandations
  if (report.summary.totalDrivers > 0) {
    report.recommendations.push({
      type: 'drivers',
      action: 'Enrichir les drivers existants avec les nouvelles fonctionnalités trouvées',
      priority: 'high'
    });
  }
  
  if (report.summary.totalAssets > 0) {
    report.recommendations.push({
      type: 'assets',
      action: 'Intégrer les nouveaux assets et icônes',
      priority: 'medium'
    });
  }
  
  return report;
}

// Afficher un résumé de l'analyse
function displayAnalysisSummary(report) {
  log('📊 RÉSUMÉ DE L\'ANALYSE DES SOURCES .tmp*');
  echo();
  
  log(`📁 Sources analysées: ${report.totalSources}`);
  log(`🔧 Drivers trouvés: ${report.summary.totalDrivers}`);
  log(`🎨 Assets trouvés: ${report.summary.totalAssets}`);
  log(`💡 Améliorations identifiées: ${report.summary.totalImprovements}`);
  
  echo();
  
  if (report.recommendations.length > 0) {
    log('💡 RECOMMANDATIONS:');
    for (const rec of report.recommendations) {
      const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      log(`   ${priority} ${rec.action}`);
    }
  }
  
  echo();
}

// Fonction principale d'enrichissement
async function enrichFromTmpSources() {
  try {
    log('🚀 ENRICHISSEMENT DU PROJET INSPIRÉ DE .tmp*...');
    echo();
    
    // Étape 1: Analyser toutes les sources
    const analyses = await analyzeAllTmpSources();
    
    if (analyses.length === 0) {
      log('⚠️  Aucune source analysée', 'warning');
      return false;
    }
    
    // Étape 2: Générer le rapport
    const report = await generateAnalysisReport(analyses);
    
    // Étape 3: Afficher le résumé
    displayAnalysisSummary(report);
    
    // Étape 4: Sauvegarder le rapport
    const reportPath = path.join(process.cwd(), 'tmp-sources-analysis-report.json');
    await fsp.writeFile(reportPath, JSON.stringify(report, null, 2));
    log(`📄 Rapport sauvegardé: ${reportPath}`);
    
    echo();
    log('✅ ENRICHISSEMENT INSPIRÉ DE .tmp* TERMINÉ !');
    
    return true;
    
  } catch (error) {
    log(`❌ Erreur lors de l'enrichissement: ${error.message}`, 'error');
    return false;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  enrichFromTmpSources()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`❌ Erreur d'exécution: ${error.message}`, 'error');
      process.exit(1);
    });
}

module.exports = {
  enrichFromTmpSources,
  analyzeAllTmpSources,
  CONFIG
};
