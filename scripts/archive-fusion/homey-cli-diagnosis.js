// Performance optimized
#!/usr/bin/env node

/**
 * 🔍 HOMEY CLI ROOT CAUSE DIAGNOSIS
 *
 * Diagnostic approfondi des échecs Homey CLI:
 * - Vérification de l'installation et configuration Homey CLI
 * - Analyse de la structure de projet Homey
 * - Test d'authentification et de connectivité
 * - Diagnostic des problèmes de validation et build
 * - Réparation automatique des problèmes détectés
 *
 * @version 7.0.0
 * @date 2025-01-09
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const CONFIG = {
  projectRoot: process.cwd(),
  outputDir: path.join(process.cwd(), 'homey-diagnosis-results'),
  timeout: 60000,
  logLevel: 'debug'
};

/**
 * Exécution avec timeout et logging détaillé
 */
async function execWithTimeout(command, timeout = CONFIG.timeout) {

  return new Promise((resolve) => {
    const child = exec(command, {
      cwd: CONFIG.projectRoot,
      timeout,
      maxBuffer: 1024 * 1024 * 10, // 10MB
      env: {
        ...process.env,
        HOMEY_DEBUG: '1',
        HOMEY_LOG_LEVEL: 'debug',
        NODE_ENV: 'development'
      }
    }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout || '',
        stderr: stderr || '',
        error: error?.message || null,
        code: error?.code || 0,
        signal: error?.signal || null,
        command
      });
    });

    setTimeout(() => {
      child.kill('SIGKILL');
      resolve({
        success: false,
        stdout: '',
        stderr: 'Command timeout',
        error: `Timeout after ${timeout}ms`,
        code: 1,
        signal: 'SIGKILL',
        command
      });
    }, timeout);
  });
}

/**
 * Diagnostic complet de l'installation Homey CLI
 */
async function diagnoseHomeyCliInstallation() {

  const diagnostics = [];

  // 1. Vérification de l'installation Homey CLI

  const versionResult = await execWithTimeout('homey --version', 10000);
  diagnostics.push({
    test: 'CLI Installation',
    success: versionResult.success,
    details: versionResult.success ? `Version: ${versionResult.stdout.trim()}` : versionResult.error,
    output: versionResult
  });

  // 2. Vérification de l'aide Homey CLI

  const helpResult = await execWithTimeout('homey --help', 15000);
  diagnostics.push({
    test: 'CLI Help',
    success: helpResult.success,
    details: helpResult.success ? 'Help accessible' : helpResult.error,
    output: helpResult
  });

  // 3. Test des sous-commandes app

  const appHelpResult = await execWithTimeout('homey app --help', 15000);
  diagnostics.push({
    test: 'App Subcommands',
    success: appHelpResult.success,
    details: appHelpResult.success ? 'App commands available' : appHelpResult.error,
    output: appHelpResult
  });

  // 4. Vérification du status d'authentification

  const authResult = await execWithTimeout('homey whoami', 10000);
  diagnostics.push({
    test: 'Authentication',
    success: authResult.success,
    details: authResult.success ? `Logged in as: ${authResult.stdout.trim()}` : 'Not authenticated',
    output: authResult
  });

  // 5. Vérification de la configuration Homey

  const homeyConfigDir = path.join(os.homedir(), '.homey');
  const configExists = fsSync.existsSync(homeyConfigDir);

  diagnostics.push({
    test: 'Homey Config Directory',
    success: configExists,
    details: configExists ? `Config dir exists: ${homeyConfigDir}` : 'No config directory found',
    output: { configDir: homeyConfigDir, exists: configExists }
  });

  if (configExists) {
    try {
      const configFiles = await fs.readdir(homeyConfigDir);
      diagnostics.push({
        test: 'Homey Config Contents',
        success: configFiles.length > 0,
        details: `Config files: ${configFiles.join(', ')}`,
        output: { files: configFiles }
      });
    } catch (error) {
      diagnostics.push({
        test: 'Homey Config Contents',
        success: false,
        details: `Error reading config: ${error.message}`,
        output: { error: error.message }
      });
    }
  }

  return diagnostics;
}

/**
 * Diagnostic de la structure du projet Homey
 */
async function diagnoseProjectStructure() {

  const diagnostics = [];
  const requiredFiles = [
    { file: 'app.json', critical: true, description: 'Homey app manifest' },
    { file: 'package.json', critical: true, description: 'Node.js package manifest' },
    { file: 'app.js', critical: true, description: 'Main app entry point' },
    { file: '.homeycompose/app.json', critical: false, description: 'Homey compose manifest' },
    { file: 'drivers', critical: false, description: 'Drivers directory' },
    { file: 'assets', critical: false, description: 'Assets directory' }
  ];

  for (const item of requiredFiles) {
    const filePath = path.join(CONFIG.projectRoot, item.file);
    const exists = fsSync.existsSync(filePath);

    let details = exists ? 'File exists' : 'File missing';
    let additionalInfo = null;

    if (exists && item.file.endsWith('.json')) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const json = JSON.parse(content);

        if (item.file === 'app.json') {
          const requiredFields = ['id', 'version', 'compatibility', 'name'];
          const missingFields = requiredFields.filter(field => !json[field]);
          details = missingFields.length === 0 ? 'Valid app.json' : `Missing fields: ${missingFields.join(', ')}`;
          additionalInfo = {
            id: json.id,
            version: json.version,
            compatibility: json.compatibility,
            driversCount: json.drivers ? json.drivers.length : 0
          };
        } else if (item.file === 'package.json') {
          details = json.name && json.version ? 'Valid package.json' : 'Invalid package.json';
          additionalInfo = {
            name: json.name,
            version: json.version,
            hasHomeyDep: !!(json.dependencies?.homey || json.devDependencies?.homey)
          };
        }
      } catch (error) {
        details = `JSON parse error: ${error.message}`;
      }
    }

    diagnostics.push({
      test: `${item.description} (${item.file})`,
      success: exists,
      critical: item.critical,
      details,
      additionalInfo,
      path: filePath
    });

  }

  // Vérification des permissions

  try {
    const appJsonPath = path.join(CONFIG.projectRoot, 'app.json');
    if (fsSync.existsSync(appJsonPath)) {
      await fs.access(appJsonPath, fs.constants.R_OK | fs.constants.W_OK);
      diagnostics.push({
        test: 'File Permissions',
        success: true,
        details: 'Read/write permissions OK',
        critical: true
      });

    }
  } catch (error) {
    diagnostics.push({
      test: 'File Permissions',
      success: false,
      details: `Permission error: ${error.message}`,
      critical: true
    });

  }

  return diagnostics;
}

/**
 * Tests de connectivité et réseau
 */
async function diagnoseConnectivity() {

  const diagnostics = [];

  // Test de connectivité Internet

  const pingResult = await execWithTimeout('ping -n 1 google.com', 10000);
  diagnostics.push({
    test: 'Internet Connectivity',
    success: pingResult.success,
    details: pingResult.success ? 'Internet accessible' : 'No internet connection',
    output: pingResult
  });

  // Test de connectivité Homey Cloud

  const homeyPingResult = await execWithTimeout('ping -n 1 cloud.athom.com', 10000);
  diagnostics.push({
    test: 'Homey Cloud Connectivity',
    success: homeyPingResult.success,
    details: homeyPingResult.success ? 'Homey Cloud accessible' : 'Cannot reach Homey Cloud',
    output: homeyPingResult
  });

  // Test DNS

  const nslookupResult = await execWithTimeout('nslookup athom.com', 10000);
  diagnostics.push({
    test: 'DNS Resolution',
    success: nslookupResult.success,
    details: nslookupResult.success ? 'DNS working' : 'DNS issues',
    output: nslookupResult
  });

  return diagnostics;
}

/**
 * Tentatives de réparation automatique
 */
async function attemptAutomaticRepairs(allDiagnostics) {

  const repairs = [];
  const issues = allDiagnostics.flat().filter(d => !d.success && d.critical);

  for (const issue of issues) {

    try {
      let repairAttempted = false;
      let repairResult = { success: false, details: 'No repair available' };

      // Réparations spécifiques
      switch (issue.test) {
        case 'Authentication':

          // Note: Login interactif non supporté en automatique
          repairResult = {
            success: false,
            details: 'Interactive login required - run: homey login'
          };
          repairAttempted = true;
          break;

        case 'Valid app.json (app.json)':
          if (issue.details.includes('Missing fields')) {

            const appJsonPath = path.join(CONFIG.projectRoot, 'app.json');
            try {
              const content = await fs.readFile(appJsonPath, 'utf8');
              const appJson = JSON.parse(content);

              // Ajout des champs manquants
              if (!appJson.id) appJson.id = 'com.tuya.zigbee';
              if (!appJson.version) appJson.version = '3.0.0';
              if (!appJson.compatibility) appJson.compatibility = '>=3.0.0';
              if (!appJson.name) appJson.name = { en: 'Tuya Zigbee' };

              await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
              repairResult = { success: true, details: 'Fixed missing app.json fields' };
            } catch (error) {
              repairResult = { success: false, details: `Failed to fix app.json: ${error.message}` };
            }
            repairAttempted = true;
          }
          break;

        case 'File Permissions':

          // Tentative de réparation des permissions (limitée sur Windows)
          repairResult = {
            success: false,
            details: 'Cannot auto-fix permissions on Windows - check folder access rights'
          };
          repairAttempted = true;
          break;
      }

      repairs.push({
        issue: issue.test,
        attempted: repairAttempted,
        success: repairResult.success,
        details: repairResult.details
      });

    } catch (error) {
      repairs.push({
        issue: issue.test,
        attempted: true,
        success: false,
        details: `Repair failed: ${error.message}`
      });

    }
  }

  return repairs;
}

/**
 * Tests de validation post-réparation
 */
async function runPostRepairValidation() {

  const tests = [
    { cmd: 'homey app info', description: 'App info test', timeout: 30000 },
    { cmd: 'homey app validate --level error', description: 'Basic validation test', timeout: 60000 },
    { cmd: 'node -c app.js', description: 'Syntax check', timeout: 5000 }
  ];

  const results = [];

  for (const test of tests) {

    const result = await execWithTimeout(test.cmd, test.timeout);

    results.push({
      test: test.description,
      command: test.cmd,
      success: result.success,
      details: result.success ? 'Passed' : result.error,
      output: result
    });

  }

  return results;
}

/**
 * Processus principal de diagnostic Homey CLI
 */
async function performHomeyCliDiagnosis() {

  const startTime = Date.now();

  // Setup
  await fs.mkdir(CONFIG.outputDir, { recursive: true });

  try {
    // 1. Diagnostic CLI
    const cliDiagnostics = await diagnoseHomeyCliInstallation();

    // 2. Diagnostic structure projet
    const structureDiagnostics = await diagnoseProjectStructure();

    // 3. Diagnostic connectivité
    const connectivityDiagnostics = await diagnoseConnectivity();

    const allDiagnostics = [cliDiagnostics, structureDiagnostics, connectivityDiagnostics];

    // 4. Tentatives de réparation
    const repairs = await attemptAutomaticRepairs(allDiagnostics);

    // 5. Tests de validation post-réparation
    const postRepairTests = await runPostRepairValidation();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Analyse des résultats
    const summary = {
      cli: {
        total: cliDiagnostics.length,
        passed: cliDiagnostics.filter(d => d.success).length,
        critical: cliDiagnostics.filter(d => !d.success && d.critical !== false).length
      },
      structure: {
        total: structureDiagnostics.length,
        passed: structureDiagnostics.filter(d => d.success).length,
        critical: structureDiagnostics.filter(d => !d.success && d.critical).length
      },
      connectivity: {
        total: connectivityDiagnostics.length,
        passed: connectivityDiagnostics.filter(d => d.success).length,
        critical: connectivityDiagnostics.filter(d => !d.success).length
      },
      repairs: {
        attempted: repairs.filter(r => r.attempted).length,
        successful: repairs.filter(r => r.success).length
      },
      postRepair: {
        total: postRepairTests.length,
        passed: postRepairTests.filter(t => t.success).length
      }
    };

    // Identification de la cause racine probable
    let rootCause = 'Unknown';
    let recommendations = [];

    if (summary.cli.critical > 0) {
      if (cliDiagnostics.find(d => d.test === 'Authentication' && !d.success)) {
        rootCause = 'Authentication Required';
        recommendations.push('Run: homey login');
        recommendations.push('Ensure valid Athom developer account');
      } else if (cliDiagnostics.find(d => d.test === 'CLI Installation' && !d.success)) {
        rootCause = 'CLI Installation Issue';
        recommendations.push('Reinstall Homey CLI: npm install -g homey');
        recommendations.push('Check Node.js version compatibility');
      }
    } else if (summary.structure.critical > 0) {
      rootCause = 'Project Structure Issues';
      recommendations.push('Fix missing or invalid project files');
      recommendations.push('Ensure proper app.json and package.json structure');
    } else if (summary.connectivity.critical > 0) {
      rootCause = 'Connectivity Issues';
      recommendations.push('Check internet connection');
      recommendations.push('Verify firewall/proxy settings');
    }

    // Rapport final
    const finalReport = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      rootCause,
      summary,
      diagnostics: {
        cli: cliDiagnostics,
        structure: structureDiagnostics,
        connectivity: connectivityDiagnostics
      },
      repairs,
      postRepairTests,
      recommendations,
      nextSteps: summary.postRepair.passed === summary.postRepair.total ? [
        'Homey CLI issues resolved',
        'Proceed with intensive validation testing',
        'Continue with publication preparation'
      ] : [
        'Manual intervention required',
        'Address remaining critical issues',
        'Retry validation after fixes'
      ]
    };

    // Sauvegarde
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'homey-cli-diagnosis-report.json'),
      JSON.stringify(finalReport, null, 2)
    );

    // Affichage final

    recommendations.forEach(rec => console.log(`   - ${rec}`));

    return finalReport;

  } catch (error) {
    console.error('\n❌ DIAGNOSIS FAILED:', error.message);
    return null;
  }
}

// Exécution
if (require.main === module) {
  performHomeyCliDiagnosis().catch(error => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  });
}

module.exports = { performHomeyCliDiagnosis };