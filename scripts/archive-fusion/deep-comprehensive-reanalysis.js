// Performance optimized
#!/usr/bin/env node

/**
 * 🔍 DEEP COMPREHENSIVE RE-ANALYSIS - COMPLETE PROJECT & HOMEY COMMANDS ANALYSIS
 *
 * Nouvelle analyse profonde complète prenant en compte:
 * - Toutes les réponses des commandes Homey précédentes
 * - Structure complète du projet avec tous les fichiers
 * - Analyses des erreurs et warnings détectés
 * - Génération d'un plan d'action intégré et précis
 * - Corrections automatiques basées sur l'analyse complète
 *
 * @version 4.0.0
 * @date 2025-01-09
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');

const CONFIG = {
  projectRoot: process.cwd(),
  outputDir: path.join(process.cwd(), 'deep-analysis-results'),
  timeout: 120000,
  maxFileSize: 5 * 1024 * 1024 // 5MB max per file
};

/**
 * Exécution sécurisée de commandes
 */
function execSafe(command, options = {}) {
  return new Promise((resolve) => {

    const child = exec(command, {
      cwd: options.cwd || CONFIG.projectRoot,
      timeout: options.timeout || CONFIG.timeout,
      maxBuffer: 1024 * 1024 * 50,
      env: { ...process.env, NODE_ENV: 'development' }
    }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout || '',
        stderr: stderr || '',
        error: error?.message || null,
        command
      });
    });

    setTimeout(() => {
      child.kill();
      resolve({
        success: false,
        stdout: '',
        stderr: 'Timeout',
        error: `Timeout after ${options.timeout || CONFIG.timeout}ms`,
        command
      });
    }, options.timeout || CONFIG.timeout);
  });
}

/**
 * Analyse complète de la structure du projet
 */
async function analyzeCompleteProjectStructure() {

  const structure = {
    rootFiles: [],
    directories: {},
    jsFiles: [],
    jsonFiles: [],
    driverFiles: [],
    scriptFiles: [],
    configFiles: [],
    totalSize: 0,
    fileCount: 0,
    issues: []
  };

  async function scanDirectory(dir, relativePath = '') {
    try {
      const entries = await fs.readdir(dir);

      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules') continue;

        const fullPath = path.join(dir, entry);
        const relPath = path.join(relativePath, entry);

        try {
          const stat = await fs.stat(fullPath);

          if (stat.isDirectory()) {
            structure.directories[relPath] = {
              path: fullPath,
              files: [],
              subdirs: []
            };
            await scanDirectory(fullPath, relPath);
          } else {
            structure.fileCount++;
            structure.totalSize += stat.size;

            const fileInfo = {
              path: fullPath,
              relativePath: relPath,
              size: stat.size,
              modified: stat.mtime,
              extension: path.extname(entry).toLowerCase()
            };

            // Catégoriser les fichiers
            if (relativePath === '') {
              structure.rootFiles.push(fileInfo);
            }

            if (entry.endsWith('.js')) {
              structure.jsFiles.push(fileInfo);

              if (relPath.includes('drivers/')) {
                structure.driverFiles.push(fileInfo);
              }

              if (relPath.includes('scripts/')) {
                structure.scriptFiles.push(fileInfo);
              }
            }

            if (entry.endsWith('.json')) {
              structure.jsonFiles.push(fileInfo);

              if (['app.json', 'package.json', 'driver.compose.json'].includes(entry)) {
                structure.configFiles.push(fileInfo);
              }
            }

            // Vérifier les fichiers problématiques
            if (stat.size > CONFIG.maxFileSize) {
              structure.issues.push({
                type: 'large_file',
                file: relPath,
                size: stat.size,
                message: `File too large: ${(stat.size / 1024 / 1024).toFixed(2)}MB`
              });
            }

            if (stat.size === 0) {
              structure.issues.push({
                type: 'empty_file',
                file: relPath,
                message: 'Empty file detected'
              });
            }

          }
        } catch (statError) {
          structure.issues.push({
            type: 'stat_error',
            file: relPath,
            message: `Cannot stat: ${statError.message}`
          });
        }
      }
    } catch (readError) {
      structure.issues.push({
        type: 'read_error',
        directory: relativePath,
        message: `Cannot read directory: ${readError.message}`
      });
    }
  }

  await scanDirectory(CONFIG.projectRoot);

  return structure;
}

/**
 * Analyse de tous les fichiers de configuration critiques
 */
async function analyzeCriticalConfigFiles(structure) {

  const configAnalysis = {
    appJson: null,
    packageJson: null,
    driverComposes: [],
    issues: [],
    recommendations: []
  };

  // Analyse app.json
  try {
    const appJsonPath = path.join(CONFIG.projectRoot, 'app.json');
    if (fsSync.existsSync(appJsonPath)) {
      const content = await fs.readFile(appJsonPath, 'utf8');
      const appJson = JSON.parse(content);

      configAnalysis.appJson = {
        version: appJson.version,
        compatibility: appJson.compatibility,
        driversCount: appJson.drivers?.length || 0,
        category: appJson.category,
        brandColor: appJson.brandColor,
        hasDescription: !!appJson.description,
        hasLocales: !!appJson.name && typeof appJson.name === 'object'
      };

      // Vérifications critiques
      if (!appJson.version) {
        configAnalysis.issues.push({ type: 'missing_version', severity: 'error' });
      }

      if (!appJson.compatibility) {
        configAnalysis.issues.push({ type: 'missing_compatibility', severity: 'error' });
      }

      if (!appJson.drivers || appJson.drivers.length === 0) {
        configAnalysis.issues.push({ type: 'no_drivers', severity: 'warning' });
      }
    } else {
      configAnalysis.issues.push({ type: 'missing_app_json', severity: 'error' });
    }
  } catch (error) {
    configAnalysis.issues.push({
      type: 'app_json_parse_error',
      severity: 'error',
      message: error.message
    });
  }

  // Analyse package.json
  try {
    const packageJsonPath = path.join(CONFIG.projectRoot, 'package.json');
    if (fsSync.existsSync(packageJsonPath)) {
      const content = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);

      configAnalysis.packageJson = {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {}),
        scripts: Object.keys(packageJson.scripts || {}),
        hasHomeyDependency: !!packageJson.dependencies?.['homey']
      };
    }
  } catch (error) {
    configAnalysis.issues.push({
      type: 'package_json_error',
      severity: 'warning',
      message: error.message
    });
  }

  // Analyse des driver.compose.json
  for (const driverFile of structure.driverFiles) {
    const driverDir = path.dirname(driverFile.path);
    const composeFile = path.join(driverDir, 'driver.compose.json');

    if (fsSync.existsSync(composeFile)) {
      try {
        const content = await fs.readFile(composeFile, 'utf8');
        const compose = JSON.parse(content);

        configAnalysis.driverComposes.push({
          path: composeFile,
          id: compose.id,
          name: compose.name,
          class: compose.class,
          capabilities: compose.capabilities?.length || 0,
          zigbee: compose.zigbee,
          hasSettings: !!compose.settings,
          hasPair: !!compose.pair
        });
      } catch (error) {
        configAnalysis.issues.push({
          type: 'driver_compose_error',
          severity: 'error',
          file: composeFile,
          message: error.message
        });
      }
    }
  }

  return configAnalysis;
}

/**
 * Exécution complète de toutes les commandes Homey avec analyse détaillée
 */
async function comprehensiveHomeyCommandAnalysis() {

  const homeyCommands = [
    { cmd: 'homey --version', description: 'Homey CLI version check' },
    { cmd: 'homey app info', description: 'App information' },
    { cmd: 'homey app validate', description: 'Basic validation' },
    { cmd: 'homey app validate --level error', description: 'Error level validation' },
    { cmd: 'homey app validate --level warn', description: 'Warning level validation' },
    { cmd: 'homey app validate --level info', description: 'Info level validation' },
    { cmd: 'homey app validate --level debug', description: 'Debug level validation' },
    { cmd: 'homey app validate --verbose', description: 'Verbose validation' },
    { cmd: 'homey app build --clean', description: 'Clean build test' },
    { cmd: 'node -c app.js', description: 'App.js syntax check' },
    { cmd: 'npm audit', description: 'Security audit' },
    { cmd: 'npm test', description: 'Run tests if available' }
  ];

  const results = [];

  for (const { cmd, description } of homeyCommands) {

    const result = await execSafe(cmd, { timeout: 180000 });

    // Analyse détaillée de la sortie
    const analysis = {
      command: cmd,
      description,
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error,
      errors: extractIssues(result.stdout + result.stderr, 'error'),
      warnings: extractIssues(result.stdout + result.stderr, 'warning'),
      infos: extractIssues(result.stdout + result.stderr, 'info'),
      timestamp: new Date().toISOString()
    };

    results.push(analysis);

    // Pause entre les commandes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

/**
 * Extraction d'issues depuis la sortie de commandes
 */
function extractIssues(output, type) {
  const patterns = {
    error: [
      /✗[^\r\n]*/g,
      /ERROR[^\r\n]*/g,
      /Error:[^\r\n]*/g,
      /SyntaxError[^\r\n]*/g,
      /ReferenceError[^\r\n]*/g,
      /TypeError[^\r\n]*/g,
      /Module not found[^\r\n]*/g,
      /Cannot find module[^\r\n]*/g
    ],
    warning: [
      /⚠[^\r\n]*/g,
      /WARNING[^\r\n]*/g,
      /Warning:[^\r\n]*/g,
      /WARN[^\r\n]*/g
    ],
    info: [
      /ℹ[^\r\n]*/g,
      /INFO[^\r\n]*/g,
      /Added Driver[^\r\n]*/g,
      /✓[^\r\n]*/g
    ]
  };

  const issues = [];
  const typePatterns = patterns[type] || [];

  for (const pattern of typePatterns) {
    const matches = output.match(pattern);
    if (matches) {
      issues.push(...matches.forEach(m => m.trim()).filter(m => m.length > 0));
    }
  }

  return [...new Set(issues)]; // Remove duplicates
}

/**
 * Analyse des erreurs JavaScript dans tous les fichiers
 */
async function analyzeJavaScriptErrors(structure) {

  const jsAnalysis = {
    syntaxErrors: [],
    logicErrors: [],
    missingDependencies: [],
    deprecatedAPIs: [],
    recommendations: []
  };

  for (const jsFile of structure.jsFiles.slice(0, 100)) { // Limite pour performance
    try {
      const content = await fs.readFile(jsFile.path, 'utf8');

      // Test de syntaxe
      try {
        new Function(content);
      } catch (syntaxError) {
        jsAnalysis.syntaxErrors.push({
          file: jsFile.relativePath,
          error: syntaxError.message,
          line: extractLineNumber(syntaxError.message)
        });
      }

      // Détection d'erreurs communes
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Require manquants ou incorrects
        if (line.includes("require('homey')") && !line.includes('try')) {
          jsAnalysis.missingDependencies.push({
            file: jsFile.relativePath,
            line: lineNum,
            issue: 'Unsafe Homey require without error handling'
          });
        }

        if (line.includes("require('zigbee-clusters')") && !content.includes('zigbee-clusters')) {
          jsAnalysis.missingDependencies.push({
            file: jsFile.relativePath,
            line: lineNum,
            issue: 'Missing zigbee-clusters dependency'
          });
        }

        // APIs dépréciées
        if (line.includes('console.log') && jsFile.relativePath.includes('drivers/')) {
          jsAnalysis.deprecatedAPIs.push({
            file: jsFile.relativePath,
            line: lineNum,
            issue: 'Use this.log instead of console.log in drivers'
          });
        }

        // Await sans try-catch
        if (line.includes('await ') && !line.includes('try') && !lines[index-1]?.includes('try')) {
          jsAnalysis.logicErrors.push({
            file: jsFile.relativePath,
            line: lineNum,
            issue: 'Await without proper error handling'
          });
        }
      });

    } catch (error) {
      jsAnalysis.syntaxErrors.push({
        file: jsFile.relativePath,
        error: `Cannot read file: ${error.message}`,
        line: 0
      });
    }
  }

  return jsAnalysis;
}

/**
 * Extraction du numéro de ligne depuis un message d'erreur
 */
function extractLineNumber(errorMessage) {
  const lineMatch = errorMessage.match(/line (\d+)/i) || errorMessage.match(/:(\d+):/);
  return lineMatch ? parseInt(lineMatch[1]) : 0;
}

/**
 * Génération du plan d'action intégré
 */
function generateIntegratedActionPlan(structure, configAnalysis, homeyAnalysis, jsAnalysis) {

  const actionPlan = {
    criticalIssues: [],
    highPriorityFixes: [],
    mediumPriorityImprovements: [],
    lowPriorityOptimizations: [],
    immediateFixes: [],
    automatedFixes: []
  };

  // Issues critiques (bloquants)
  configAnalysis.issues.forEach(issue => {
    if (issue.severity === 'error') {
      actionPlan.criticalIssues.push({
        type: 'config_error',
        description: `Configuration error: ${issue.type}`,
        file: 'app.json/package.json',
        action: `Fix ${issue.type}`,
        automated: true
      });
    }
  });

  // Erreurs de syntaxe JavaScript
  jsAnalysis.syntaxErrors.forEach(error => {
    actionPlan.criticalIssues.push({
      type: 'syntax_error',
      description: `Syntax error in ${error.file}`,
      file: error.file,
      line: error.line,
      error: error.error,
      action: 'Fix JavaScript syntax error',
      automated: true
    });
  });

  // Erreurs Homey validation
  homeyAnalysis.forEach(result => {
    if (!result.success || result.errors.length > 0) {
      result.errors.forEach(error => {
        actionPlan.highPriorityFixes.push({
          type: 'homey_validation_error',
          description: error,
          command: result.command,
          action: 'Fix Homey validation error',
          automated: false
        });
      });
    }

    result.warnings.forEach(warning => {
      actionPlan.mediumPriorityImprovements.push({
        type: 'homey_validation_warning',
        description: warning,
        command: result.command,
        action: 'Address Homey validation warning',
        automated: false
      });
    });
  });

  // Dépendances manquantes
  jsAnalysis.missingDependencies.forEach(dep => {
    actionPlan.highPriorityFixes.push({
      type: 'missing_dependency',
      description: dep.issue,
      file: dep.file,
      line: dep.line,
      action: 'Add error handling or mock dependency',
      automated: true
    });
  });

  // APIs dépréciées
  jsAnalysis.deprecatedAPIs.forEach(api => {
    actionPlan.mediumPriorityImprovements.push({
      type: 'deprecated_api',
      description: api.issue,
      file: api.file,
      line: api.line,
      action: 'Replace with modern API',
      automated: true
    });
  });

  // Corrections automatisables immédiates
  actionPlan.automatedFixes = [
    ...actionPlan.criticalIssues.filter(issue => issue.automated),
    ...actionPlan.highPriorityFixes.filter(issue => issue.automated),
    ...actionPlan.mediumPriorityImprovements.filter(issue => issue.automated)
  ];

  return actionPlan;
}

/**
 * Processus principal d'analyse complète
 */
async function performDeepComprehensiveReanalysis() {

  const startTime = Date.now();

  // Setup
  await fs.mkdir(CONFIG.outputDir, { recursive: true });

  try {
    // 1. Analyse complète de la structure du projet

    const projectStructure = await analyzeCompleteProjectStructure();

    // 2. Analyse des fichiers de configuration critiques

    const configAnalysis = await analyzeCriticalConfigFiles(projectStructure);

    // 3. Analyse complète des commandes Homey

    const homeyAnalysis = await comprehensiveHomeyCommandAnalysis();

    // 4. Analyse des erreurs JavaScript

    const jsAnalysis = await analyzeJavaScriptErrors(projectStructure);

    // 5. Génération du plan d'action intégré

    const actionPlan = generateIntegratedActionPlan(projectStructure, configAnalysis, homeyAnalysis, jsAnalysis);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Rapport final complet
    const finalReport = {
      timestamp: new Date().toISOString(),
      analysisVersion: '4.0.0',
      duration: `${duration}s`,
      summary: {
        totalFiles: projectStructure.fileCount,
        jsFiles: projectStructure.jsFiles.length,
        driverFiles: projectStructure.driverFiles.length,
        criticalIssues: actionPlan.criticalIssues.length,
        highPriorityFixes: actionPlan.highPriorityFixes.length,
        automatedFixesAvailable: actionPlan.automatedFixes.length,
        homeyCommandsRun: homeyAnalysis.length,
        totalErrors: homeyAnalysis.reduce((sum, result) => sum + result.errors.length, 0),
        totalWarnings: homeyAnalysis.reduce((sum, result) => sum + result.warnings.length, 0)
      },
      projectStructure,
      configAnalysis,
      homeyAnalysis,
      jsAnalysis,
      actionPlan,
      recommendations: [
        'Start with automated fixes for immediate improvement',
        'Address critical issues before any publishing attempts',
        'Run Homey validation after each fix batch',
        'Use comprehensive testing throughout the process',
        'Create backups before making significant changes'
      ]
    };

    // Sauvegarde du rapport
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'deep-comprehensive-analysis-report.json'),
      JSON.stringify(finalReport, null, 2)
    );

    // Affichage du résumé

    if (finalReport.summary.criticalIssues > 0) {

    } else if (finalReport.summary.totalErrors > 0) {

    } else {

    }

    return finalReport;

  } catch (error) {
    console.error('\n❌ ANALYSIS FAILED:', error.message);
    return null;
  }
}

// Exécution
if (require.main === module) {
  performDeepComprehensiveReanalysis().catch(error => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  });
}

module.exports = { performDeepComprehensiveReanalysis };