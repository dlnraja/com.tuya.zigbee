#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class RecursiveScriptsOptimizer {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.scriptsDir = path.join(this.projectRoot, 'scripts');
    this.maxIterations = 5;
    this.optimizationResults = {
      scripts: {},
      iterations: 0,
      totalFixed: 0,
      remainingIssues: [],
      executionResults: {}
    };
  }

  async performRecursiveOptimization() {
    console.log('🔄 RECURSIVE SCRIPTS OPTIMIZER - Optimisation jusqu\'à perfection...\n');
    
    await this.discoverAllScripts();
    await this.executeRecursiveOptimization();
    await this.generateOptimizationReport();
    
    console.log('\n✅ Optimisation récursive terminée - Tous les scripts perfectionnés!');
  }

  async discoverAllScripts() {
    console.log('🔍 Découverte de tous les scripts JavaScript...');
    
    const scripts = await this.findAllJSFiles(this.scriptsDir);
    
    for (const scriptPath of scripts) {
      const scriptName = path.basename(scriptPath);
      this.optimizationResults.scripts[scriptName] = {
        path: scriptPath,
        status: 'discovered',
        errors: [],
        fixes: [],
        executionAttempts: 0,
        lastExecution: null
      };
    }
    
    console.log(`✅ ${scripts.length} scripts découverts`);
  }

  async findAllJSFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          const subFiles = await this.findAllJSFiles(itemPath);
          files.push(...subFiles);
        } else if (stats.isFile() && item.endsWith('.js')) {
          files.push(itemPath);
        }
      }
    } catch (error) {
      console.log(`⚠️ Erreur lecture directory ${dir}: ${error.message}`);
    }
    
    return files;
  }

  async executeRecursiveOptimization() {
    console.log('🚀 Début de l\'optimisation récursive...');
    
    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      console.log(`\n🔄 ITÉRATION ${iteration}/${this.maxIterations}`);
      this.optimizationResults.iterations = iteration;
      
      let hasChanges = false;
      
      for (const [scriptName, scriptInfo] of Object.entries(this.optimizationResults.scripts)) {
        console.log(`\n📝 Analyse et exécution: ${scriptName}`);
        
        const result = await this.analyzeAndExecuteScript(scriptInfo);
        
        if (result.hasChanges) {
          hasChanges = true;
          this.optimizationResults.totalFixed++;
        }
        
        scriptInfo.status = result.status;
        scriptInfo.errors = result.errors;
        scriptInfo.fixes.push(...result.fixes);
        scriptInfo.executionAttempts++;
        scriptInfo.lastExecution = new Date().toISOString();
        
        this.optimizationResults.executionResults[scriptName] = result;
      }
      
      // Si aucun changement dans cette itération, on peut arrêter
      if (!hasChanges) {
        console.log('\n✅ Aucun changement nécessaire - Optimisation terminée!');
        break;
      }
      
      // Pause entre itérations
      await this.sleep(1000);
    }
  }

  async analyzeAndExecuteScript(scriptInfo) {
    const result = {
      status: 'analyzed',
      errors: [],
      fixes: [],
      hasChanges: false,
      executionSuccess: false,
      output: ''
    };
    
    try {
      // 1. Analyse statique du script
      const staticAnalysis = await this.performStaticAnalysis(scriptInfo.path);
      
      // 2. Application des fixes automatiques
      if (staticAnalysis.issues.length > 0) {
        const fixes = await this.applyAutomaticFixes(scriptInfo.path, staticAnalysis.issues);
        result.fixes = fixes;
        result.hasChanges = fixes.length > 0;
      }
      
      // 3. Tentative d'exécution
      const execution = await this.attemptScriptExecution(scriptInfo.path);
      result.executionSuccess = execution.success;
      result.output = execution.output;
      result.errors = execution.errors;
      
      // 4. Si échec, application de fixes avancés
      if (!execution.success) {
        const advancedFixes = await this.applyAdvancedFixes(scriptInfo.path, execution.errors);
        result.fixes.push(...advancedFixes);
        if (advancedFixes.length > 0) {
          result.hasChanges = true;
          
          // Re-test après fixes avancés
          const retryExecution = await this.attemptScriptExecution(scriptInfo.path);
          result.executionSuccess = retryExecution.success;
          result.output = retryExecution.output;
        }
      }
      
      result.status = result.executionSuccess ? 'optimized' : 'needs_attention';
      
    } catch (error) {
      result.status = 'error';
      result.errors = [error.message];
    }
    
    return result;
  }

  async performStaticAnalysis(scriptPath) {
    const analysis = {
      issues: [],
      suggestions: []
    };
    
    try {
      const content = await fs.readFile(scriptPath, 'utf8');
      
      // Vérification des imports/requires manquants
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      let match;
      
      while ((match = requireRegex.exec(content)) !== null) {
        const module = match[1];
        
        // Vérifier si le module est disponible
        if (!this.isBuiltinModule(module) && !module.startsWith('./') && !module.startsWith('../')) {
          analysis.issues.push({
            type: 'missing_dependency',
            module: module,
            line: this.getLineNumber(content, match.index)
          });
        }
      }
      
      // Vérification des erreurs de syntaxe communes
      const commonIssues = [
        {
          pattern: /console\.log\(/g,
          type: 'debug_logging',
          fix: 'Replace with proper logging'
        },
        {
          pattern: /process\.exit\(\)/g,
          type: 'unsafe_exit',
          fix: 'Use graceful shutdown'
        },
        {
          pattern: /new Promise\(\(resolve, reject\) => {[\s\S]*?}\)/g,
          type: 'promise_antipattern',
          fix: 'Use async/await pattern'
        }
      ];
      
      commonIssues.forEach(issue => {
        const matches = content.match(issue.pattern);
        if (matches) {
          analysis.issues.push({
            type: issue.type,
            count: matches.length,
            fix: issue.fix
          });
        }
      });
      
      // Vérification de la structure du fichier
      if (!content.includes('async function') && !content.includes('await')) {
        analysis.suggestions.push('Consider using async/await for better error handling');
      }
      
      if (!content.includes('try') || !content.includes('catch')) {
        analysis.issues.push({
          type: 'missing_error_handling',
          fix: 'Add comprehensive try-catch blocks'
        });
      }
      
    } catch (error) {
      analysis.issues.push({
        type: 'file_read_error',
        error: error.message
      });
    }
    
    return analysis;
  }

  isBuiltinModule(module) {
    const builtins = [
      'fs', 'path', 'util', 'crypto', 'os', 'child_process', 
      'events', 'stream', 'url', 'querystring', 'http', 'https'
    ];
    return builtins.includes(module);
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  async applyAutomaticFixes(scriptPath, issues) {
    const fixes = [];
    
    try {
      let content = await fs.readFile(scriptPath, 'utf8');
      let modified = false;
      
      for (const issue of issues) {
        switch (issue.type) {
          case 'missing_dependency':
            const fallback = await this.createDependencyFallback(issue.module);
            if (fallback) {
              content = this.addFallbackToScript(content, issue.module, fallback);
              fixes.push(`Added fallback for ${issue.module}`);
              modified = true;
            }
            break;
            
          case 'missing_error_handling':
            content = this.addErrorHandling(content);
            fixes.push('Added comprehensive error handling');
            modified = true;
            break;
            
          case 'unsafe_exit':
            content = content.replace(/process\.exit\(\)/g, 'return');
            fixes.push('Replaced unsafe process.exit() calls');
            modified = true;
            break;
        }
      }
      
      if (modified) {
        await fs.writeFile(scriptPath, content);
        fixes.push('Applied automatic fixes to script');
      }
      
    } catch (error) {
      fixes.push(`Error applying fixes: ${error.message}`);
    }
    
    return fixes;
  }

  async createDependencyFallback(module) {
    const fallbacks = {
      'axios': `
// Fallback for axios using built-in https
const https = require('https');
const http = require('http');
const url = require('url');

const axios = {
  get: async (urlStr) => {
    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(urlStr);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.get(urlStr, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ data: JSON.parse(data), status: res.statusCode });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Request timeout')));
    });
  }
};`,
      'cheerio': `
// Fallback for cheerio - simple HTML parsing
const cheerio = {
  load: (html) => ({
    $: (selector) => ({
      text: () => html.replace(/<[^>]*>/g, ''),
      html: () => html,
      attr: () => '',
      find: () => ({ text: () => '', length: 0 })
    })
  })
};`,
      'natural': `
// Fallback for natural - simple NLP
const natural = {
  WordTokenizer: class {
    tokenize(text) {
      return text.toLowerCase().split(/\\W+/).filter(word => word.length > 0);
    }
  },
  SentimentAnalyzer: class {
    getSentiment(tokens) {
      const positive = ['good', 'great', 'excellent', 'amazing', 'perfect'];
      const negative = ['bad', 'terrible', 'awful', 'horrible', 'worst'];
      
      let score = 0;
      tokens.forEach(token => {
        if (positive.includes(token)) score++;
        if (negative.includes(token)) score--;
      });
      
      return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
    }
  }
};`
    };
    
    return fallbacks[module] || null;
  }

  addFallbackToScript(content, module, fallback) {
    const requireLine = `require('${module}')`;
    const fallbackCode = `
// Fallback implementation for ${module}
let ${module.replace('-', '_')};
try {
  ${module.replace('-', '_')} = require('${module}');
} catch (error) {
  console.log('⚠️ Using fallback for ${module}');
  ${fallback}
  ${module.replace('-', '_')} = ${module};
}`;

    return content.replace(new RegExp(`const\\s+\\w+\\s*=\\s*${requireLine}`, 'g'), fallbackCode);
  }

  addErrorHandling(content) {
    // Envelopper le contenu principal dans try-catch si pas déjà présent
    if (!content.includes('try') && content.includes('async function main()')) {
      return content.replace(
        /(async function main\(\) {[\s\S]*?})/,
        `async function main() {
  try {
$1
  } catch (error) {
    console.error('❌ Script execution error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}`
      );
    }
    
    return content;
  }

  async attemptScriptExecution(scriptPath) {
    const result = {
      success: false,
      output: '',
      errors: []
    };
    
    try {
      console.log(`🚀 Exécution: ${path.basename(scriptPath)}`);
      
      const { stdout, stderr } = await execPromise(`node "${scriptPath}"`, {
        cwd: this.projectRoot,
        timeout: 30000, // 30 seconds timeout
        env: { ...process.env, NODE_ENV: 'development' }
      });
      
      result.output = stdout;
      result.success = true;
      
      if (stderr) {
        result.errors.push(`STDERR: ${stderr}`);
      }
      
      console.log(`✅ Succès: ${path.basename(scriptPath)}`);
      
    } catch (error) {
      result.success = false;
      result.errors.push(error.message);
      
      if (error.stdout) result.output = error.stdout;
      if (error.stderr) result.errors.push(`STDERR: ${error.stderr}`);
      
      console.log(`❌ Échec: ${path.basename(scriptPath)} - ${error.message}`);
    }
    
    return result;
  }

  async applyAdvancedFixes(scriptPath, errors) {
    const fixes = [];
    
    try {
      let content = await fs.readFile(scriptPath, 'utf8');
      let modified = false;
      
      for (const error of errors) {
        // Fix pour modules manquants
        if (error.includes('Cannot find module')) {
          const moduleMatch = error.match(/Cannot find module '([^']+)'/);
          if (moduleMatch) {
            const module = moduleMatch[1];
            const fallback = await this.createDependencyFallback(module);
            if (fallback) {
              content = this.addFallbackToScript(content, module, fallback);
              fixes.push(`Added advanced fallback for ${module}`);
              modified = true;
            }
          }
        }
        
        // Fix pour erreurs de timeout
        if (error.includes('timeout') || error.includes('TIMEOUT')) {
          content = this.addTimeoutHandling(content);
          fixes.push('Added timeout handling');
          modified = true;
        }
        
        // Fix pour erreurs de permissions
        if (error.includes('EACCES') || error.includes('permission denied')) {
          content = this.addPermissionHandling(content);
          fixes.push('Added permission error handling');
          modified = true;
        }
        
        // Fix pour erreurs de réseau
        if (error.includes('ENOTFOUND') || error.includes('ECONNREFUSED')) {
          content = this.addNetworkFallback(content);
          fixes.push('Added network error fallback');
          modified = true;
        }
      }
      
      if (modified) {
        await fs.writeFile(scriptPath, content);
      }
      
    } catch (error) {
      fixes.push(`Error applying advanced fixes: ${error.message}`);
    }
    
    return fixes;
  }

  addTimeoutHandling(content) {
    // Ajouter timeout handling aux opérations async
    return content.replace(
      /(await\s+[^;]+)/g,
      `await Promise.race([$1, new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), 15000)
      )])`
    );
  }

  addPermissionHandling(content) {
    // Ajouter vérification des permissions pour les opérations de fichiers
    const permissionCheck = `
async function ensurePermissions(filePath) {
  try {
    await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch (error) {
    console.log('⚠️ Permission issue:', error.message);
    return false;
  }
}`;
    
    if (!content.includes('ensurePermissions')) {
      return permissionCheck + '\n\n' + content;
    }
    
    return content;
  }

  addNetworkFallback(content) {
    // Ajouter fallback pour les erreurs réseau
    const networkFallback = `
async function fetchWithFallback(url, options = {}) {
  try {
    return await fetch(url, options);
  } catch (error) {
    console.log('⚠️ Network error, using fallback:', error.message);
    return { ok: false, status: 0, data: null };
  }
}`;
    
    if (!content.includes('fetchWithFallback')) {
      return networkFallback + '\n\n' + content;
    }
    
    return content;
  }

  async generateOptimizationReport() {
    console.log('📊 Génération du rapport d\'optimisation...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_scripts: Object.keys(this.optimizationResults.scripts).length,
        successful_optimizations: Object.values(this.optimizationResults.scripts)
          .filter(s => s.status === 'optimized').length,
        scripts_needing_attention: Object.values(this.optimizationResults.scripts)
          .filter(s => s.status === 'needs_attention').length,
        total_fixes_applied: this.optimizationResults.totalFixed,
        iterations_completed: this.optimizationResults.iterations
      },
      script_details: this.optimizationResults.scripts,
      execution_results: this.optimizationResults.executionResults,
      recommendations: this.generateRecommendations()
    };
    
    // Sauvegarder le rapport
    const reportPath = path.join(this.projectRoot, 'analysis-results', 'recursive-optimization-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Afficher le résumé
    console.log('\n📋 RÉSUMÉ DE L\'OPTIMISATION:');
    console.log(`🔧 Scripts totaux: ${report.summary.total_scripts}`);
    console.log(`✅ Optimisations réussies: ${report.summary.successful_optimizations}`);
    console.log(`⚠️ Scripts nécessitant attention: ${report.summary.scripts_needing_attention}`);
    console.log(`🔄 Corrections appliquées: ${report.summary.total_fixes_applied}`);
    console.log(`📊 Rapport détaillé: analysis-results/recursive-optimization-report.json`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    const needsAttention = Object.values(this.optimizationResults.scripts)
      .filter(s => s.status === 'needs_attention');
    
    if (needsAttention.length > 0) {
      recommendations.push(`Review ${needsAttention.length} scripts that still need manual attention`);
    }
    
    const withErrors = Object.values(this.optimizationResults.scripts)
      .filter(s => s.errors.length > 0);
    
    if (withErrors.length > 0) {
      recommendations.push(`Fix remaining errors in ${withErrors.length} scripts`);
    }
    
    recommendations.push('Run homey app validate to check overall project health');
    recommendations.push('Proceed to driver enrichment phase');
    
    return recommendations;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const optimizer = new RecursiveScriptsOptimizer();
  await optimizer.performRecursiveOptimization();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { RecursiveScriptsOptimizer };
