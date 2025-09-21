#!/usr/bin/env node

/**
 * 🔍 GIT HISTORY COMPREHENSIVE ANALYSIS
 * 
 * Analyse complète de l'historique Git pour enrichissement du projet:
 * - Analyse tous les commits et messages
 * - Extraction des ressources historiques
 * - Identification des améliorations possibles
 * - Compilation des meilleures pratiques
 * - NLP analysis des contenus
 * 
 * @version 11.0.0
 * @date 2025-09-10
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');

const CONFIG = {
  projectRoot: process.cwd(),
  outputDir: path.join(process.cwd(), 'git-analysis-results'),
  timeout: 120000
};

/**
 * Exécution de commandes Git avec gestion d'erreur
 */
async function execGit(command) {
  return new Promise((resolve) => {
    exec(`git ${command}`, {
      cwd: CONFIG.projectRoot,
      timeout: CONFIG.timeout,
      maxBuffer: 1024 * 1024 * 50
    }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        output: stdout || '',
        error: stderr || error?.message || '',
        command: `git ${command}`
      });
    });
  });
}

/**
 * Analyse des commits et messages
 */
async function analyzeCommitHistory() {
  console.log('📝 Analyzing commit history and messages...\n');
  
  // Récupération de l'historique complet
  const logResult = await execGit('log --oneline --all --graph --decorate --no-merges -200');
  
  if (!logResult.success) {
    console.log('⚠️  No git history found or git not initialized');
    return { commits: [], insights: [] };
  }
  
  const commits = [];
  const lines = logResult.output.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const match = line.match(/([a-f0-9]{7,})\s+(.+)/);
    if (match) {
      commits.push({
        hash: match[1],
        message: match[2].trim(),
        timestamp: new Date().toISOString() // Simplified
      });
    }
  }
  
  // Analyse NLP basique des messages de commit
  const insights = analyzeCommitMessages(commits);
  
  console.log(`✅ Analyzed ${commits.length} commits`);
  console.log(`📊 Found ${insights.length} insights`);
  
  return { commits, insights };
}

/**
 * Analyse NLP des messages de commit
 */
function analyzeCommitMessages(commits) {
  const insights = [];
  const keywords = {
    features: ['add', 'feat', 'feature', 'implement', 'create', 'new'],
    fixes: ['fix', 'bug', 'error', 'issue', 'correct', 'repair'],
    improvements: ['improve', 'enhance', 'optimize', 'update', 'upgrade'],
    drivers: ['driver', 'device', 'tuya', 'zigbee', 'sensor', 'switch'],
    config: ['config', 'setting', 'manifest', 'package', 'json']
  };
  
  const categories = {};
  
  commits.forEach(commit => {
    const message = commit.message.toLowerCase();
    
    Object.entries(keywords).forEach(([category, words]) => {
      const found = words.some(word => message.includes(word));
      if (found) {
        if (!categories[category]) categories[category] = [];
        categories[category].push(commit);
      }
    });
  });
  
  Object.entries(categories).forEach(([category, commits]) => {
    insights.push({
      type: 'commit_category',
      category,
      count: commits.length,
      percentage: ((commits.length / commits.length) * 100).toFixed(1),
      examples: commits.slice(0, 3).map(c => c.message)
    });
  });
  
  return insights;
}

/**
 * Analyse des fichiers historiques modifiés
 */
async function analyzeHistoricalFiles() {
  console.log('\n📁 Analyzing historical file changes...\n');
  
  // Fichiers les plus modifiés
  const statResult = await execGit('log --name-only --pretty=format: | sort | uniq -c | sort -nr | head -20');
  
  const fileStats = [];
  if (statResult.success) {
    const lines = statResult.output.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      const match = line.trim().match(/(\d+)\s+(.+)/);
      if (match) {
        fileStats.push({
          path: match[2],
          changes: parseInt(match[1]),
          type: getFileType(match[2])
        });
      }
    });
  }
  
  console.log(`📈 Found ${fileStats.length} frequently modified files`);
  
  return fileStats;
}

/**
 * Détermination du type de fichier
 */
function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();
  
  if (ext === '.js') return 'javascript';
  if (ext === '.json') return 'config';
  if (ext === '.md') return 'documentation';
  if (basename.includes('driver')) return 'driver';
  if (basename.includes('device')) return 'device';
  if (filePath.includes('assets')) return 'asset';
  
  return 'other';
}

/**
 * Extraction des ressources historiques
 */
async function extractHistoricalResources() {
  console.log('\n💎 Extracting historical resources and patterns...\n');
  
  const resources = {
    drivers: [],
    configs: [],
    algorithms: [],
    matrices: []
  };
  
  // Recherche de patterns dans les drivers
  const driverFiles = await findFilesByPattern('drivers/**/*.js');
  
  for (const file of driverFiles.slice(0, 10)) { // Limite pour performance
    try {
      const content = await fs.readFile(file, 'utf8');
      
      // Extraction de patterns utiles
      const patterns = extractCodePatterns(content);
      
      resources.drivers.push({
        file: path.relative(CONFIG.projectRoot, file),
        patterns,
        size: content.length,
        complexity: calculateComplexity(content)
      });
      
    } catch (error) {
      // Ignore errors
    }
  }
  
  // Recherche dans les matrices et configs
  const configFiles = await findFilesByPattern('**/*.json');
  
  for (const file of configFiles.slice(0, 15)) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const json = JSON.parse(content);
      
      if (file.includes('matrix') || file.includes('config')) {
        resources.matrices.push({
          file: path.relative(CONFIG.projectRoot, file),
          type: file.includes('matrix') ? 'matrix' : 'config',
          keys: Object.keys(json).length,
          structure: analyzeJsonStructure(json)
        });
      }
      
    } catch (error) {
      // Ignore JSON parse errors
    }
  }
  
  console.log(`🚗 Found ${resources.drivers.length} driver resources`);
  console.log(`📊 Found ${resources.matrices.length} config/matrix resources`);
  
  return resources;
}

/**
 * Recherche de fichiers par pattern
 */
async function findFilesByPattern(pattern) {
  const files = [];
  
  try {
    const glob = pattern.replace('**/', '');
    const searchPath = pattern.includes('drivers') ? 
      path.join(CONFIG.projectRoot, 'drivers') : 
      CONFIG.projectRoot;
    
    if (fsSync.existsSync(searchPath)) {
      const items = await fs.readdir(searchPath, { recursive: true });
      
      for (const item of items) {
        const fullPath = path.join(searchPath, item);
        
        try {
          const stat = await fs.stat(fullPath);
          
          if (stat.isFile() && item.endsWith(glob.replace('*.', '.'))) {
            files.push(fullPath);
          }
        } catch (error) {
          // Ignore stat errors
        }
      }
    }
  } catch (error) {
    // Ignore directory read errors
  }
  
  return files;
}

/**
 * Extraction de patterns de code
 */
function extractCodePatterns(content) {
  const patterns = [];
  
  // Recherche de patterns communs
  const commonPatterns = [
    { name: 'capability_registration', regex: /registerCapability\(['"](.*?)['"]/ },
    { name: 'cluster_usage', regex: /clusters?\.(.*?)\./g },
    { name: 'error_handling', regex: /catch\s*\(\s*(\w+)\s*\)/g },
    { name: 'async_functions', regex: /async\s+(\w+)/g },
    { name: 'homey_methods', regex: /this\.(log|error|warn)/g }
  ];
  
  commonPatterns.forEach(pattern => {
    const matches = content.match(pattern.regex);
    if (matches && matches.length > 0) {
      patterns.push({
        type: pattern.name,
        count: matches.length,
        examples: matches.slice(0, 3)
      });
    }
  });
  
  return patterns;
}

/**
 * Calcul de la complexité du code
 */
function calculateComplexity(content) {
  const lines = content.split('\n').length;
  const functions = (content.match(/function|=>/g) || []).length;
  const conditions = (content.match(/if|switch|case/g) || []).length;
  const loops = (content.match(/for|while/g) || []).length;
  
  return {
    lines,
    functions,
    conditions,
    loops,
    score: functions + conditions * 2 + loops * 2
  };
}

/**
 * Analyse de la structure JSON
 */
function analyzeJsonStructure(json) {
  if (Array.isArray(json)) {
    return {
      type: 'array',
      length: json.length,
      itemTypes: [...new Set(json.map(item => typeof item))]
    };
  } else if (typeof json === 'object') {
    return {
      type: 'object',
      keys: Object.keys(json).length,
      nestedObjects: Object.values(json).filter(v => typeof v === 'object').length
    };
  }
  
  return { type: typeof json };
}

/**
 * Génération de recommandations d'amélioration
 */
function generateImprovementRecommendations(analysis) {
  const recommendations = [];
  
  // Basé sur l'analyse des commits
  if (analysis.commits.insights) {
    const fixCommits = analysis.commits.insights.find(i => i.category === 'fixes');
    if (fixCommits && fixCommits.count > 10) {
      recommendations.push({
        type: 'code_quality',
        priority: 'high',
        message: `High number of fix commits (${fixCommits.count}) suggests need for better testing`,
        action: 'Implement comprehensive test suite and CI/CD validation'
      });
    }
  }
  
  // Basé sur les drivers
  if (analysis.resources.drivers.length > 0) {
    const avgComplexity = analysis.resources.drivers.reduce((acc, d) => acc + d.complexity.score, 0) / analysis.resources.drivers.length;
    
    if (avgComplexity > 50) {
      recommendations.push({
        type: 'driver_optimization',
        priority: 'medium',
        message: `Driver complexity average (${avgComplexity.toFixed(1)}) suggests refactoring opportunities`,
        action: 'Split complex drivers into smaller, focused modules'
      });
    }
  }
  
  // Recommandations générales
  recommendations.push({
    type: 'documentation',
    priority: 'medium',
    message: 'Enhance inline documentation and code comments',
    action: 'Add JSDoc comments to all public methods and classes'
  });
  
  recommendations.push({
    type: 'testing',
    priority: 'high',
    message: 'Implement automated testing for driver functionality',
    action: 'Create mock tests for all device capabilities and flows'
  });
  
  return recommendations;
}

/**
 * Processus principal d'analyse Git
 */
async function performGitHistoryAnalysis() {
  console.log('🔍 STARTING GIT HISTORY COMPREHENSIVE ANALYSIS\n');
  
  const startTime = Date.now();
  
  // Setup
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  
  try {
    // 1. Analyse des commits
    const commitAnalysis = await analyzeCommitHistory();
    
    // 2. Analyse des fichiers historiques
    const fileAnalysis = await analyzeHistoricalFiles();
    
    // 3. Extraction des ressources
    const resources = await extractHistoricalResources();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Compilation des résultats
    const analysis = {
      commits: commitAnalysis,
      files: fileAnalysis,
      resources,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`
    };
    
    // Génération des recommandations
    const recommendations = generateImprovementRecommendations(analysis);
    
    // Rapport final
    const finalReport = {
      ...analysis,
      recommendations,
      summary: {
        totalCommits: commitAnalysis.commits.length,
        totalInsights: commitAnalysis.insights.length,
        analyzedFiles: fileAnalysis.length,
        extractedDrivers: resources.drivers.length,
        extractedMatrices: resources.matrices.length,
        recommendationsCount: recommendations.length
      }
    };
    
    // Sauvegarde
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'git-history-analysis.json'),
      JSON.stringify(finalReport, null, 2)
    );
    
    // Affichage
    console.log('\n' + '='.repeat(80));
    console.log('🔍 GIT HISTORY ANALYSIS COMPLETE');
    console.log('='.repeat(80));
    console.log(`📝 Commits Analyzed: ${finalReport.summary.totalCommits}`);
    console.log(`📁 Files Tracked: ${finalReport.summary.analyzedFiles}`);
    console.log(`🚗 Drivers Extracted: ${finalReport.summary.extractedDrivers}`);
    console.log(`📊 Matrices Found: ${finalReport.summary.extractedMatrices}`);
    console.log(`💡 Recommendations: ${finalReport.summary.recommendationsCount}`);
    console.log(`⏱️ Duration: ${duration}s`);
    console.log('='.repeat(80));
    
    return finalReport;
    
  } catch (error) {
    console.error('\n❌ GIT ANALYSIS FAILED:', error.message);
    return null;
  }
}

// Exécution
if (require.main === module) {
  performGitHistoryAnalysis().catch(error => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  });
}

module.exports = { performGitHistoryAnalysis };
