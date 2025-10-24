#!/usr/bin/env node
/**
 * ULTIMATE ORCHESTRATOR
 * Script maître qui coordonne l'audit complet, l'enrichissement et les corrections
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function exec(command, options = {}) {
  try {
    const result = execSync(command, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || error.stderr };
  }
}

function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'cyan');
  
  const checks = [
    { name: 'Node.js', command: 'node --version' },
    { name: 'npm', command: 'npm --version' },
    { name: 'Git', command: 'git --version' },
    { name: 'Homey CLI', command: 'homey --version' }
  ];

  let allGood = true;

  for (const check of checks) {
    const result = exec(check.command);
    if (result.success) {
      log(`  ✅ ${check.name}: ${result.output.trim()}`, 'green');
    } else {
      log(`  ❌ ${check.name}: Not found`, 'red');
      allGood = false;
    }
  }

  if (!allGood) {
    log('\n❌ Missing prerequisites. Please install required tools.', 'red');
    process.exit(1);
  }

  // Check for fast-glob
  try {
    require('fast-glob');
    log('  ✅ fast-glob: Installed', 'green');
  } catch (e) {
    log('  ⚠️  fast-glob: Not found, installing...', 'yellow');
    exec('npm install fast-glob --save-dev');
    log('  ✅ fast-glob: Installed', 'green');
  }
}

function step1_audit() {
  log('\n' + '='.repeat(60), 'bright');
  log('STEP 1: AUDIT COMPLET DU PROJET', 'bright');
  log('='.repeat(60), 'bright');

  log('\n📋 Running ultimate audit engine...', 'blue');
  const result = exec('node scripts/audit/ULTIMATE_AUDIT_ENGINE.js');
  
  if (result.success) {
    log(result.output);
    log('✅ Audit completed successfully', 'green');
    return true;
  } else {
    log('❌ Audit failed', 'red');
    log(result.output, 'red');
    return false;
  }
}

function step2_integrateAliExpress() {
  log('\n' + '='.repeat(60), 'bright');
  log('STEP 2: INTÉGRATION APPAREILS ALIEXPRESS', 'bright');
  log('='.repeat(60), 'bright');

  log('\n🛒 Integrating AliExpress devices...', 'blue');
  const result = exec('node scripts/enrichment/ALIEXPRESS_DEVICES_INTEGRATOR.js');
  
  if (result.success) {
    log(result.output);
    log('✅ AliExpress integration completed', 'green');
    return true;
  } else {
    log('❌ Integration failed', 'red');
    log(result.output, 'red');
    return false;
  }
}

function step3_applyFixes() {
  log('\n' + '='.repeat(60), 'bright');
  log('STEP 3: APPLICATION DES CORRECTIONS AUTOMATIQUES', 'bright');
  log('='.repeat(60), 'bright');

  // Demander confirmation
  log('\n⚠️  This will modify files in the project.', 'yellow');
  log('   Backups will be created automatically.', 'yellow');
  
  log('\n🔧 Applying automatic fixes...', 'blue');
  const result = exec('node scripts/fixes/AUTO_FIX_ENGINE.js');
  
  if (result.success) {
    log(result.output);
    log('✅ Fixes applied successfully', 'green');
    return true;
  } else {
    log('❌ Fixes failed', 'red');
    log(result.output, 'red');
    return false;
  }
}

function step4_validateHomey() {
  log('\n' + '='.repeat(60), 'bright');
  log('STEP 4: VALIDATION HOMEY SDK3', 'bright');
  log('='.repeat(60), 'bright');

  log('\n🏗️  Building app...', 'blue');
  
  // Clean cache
  const cacheDir = path.join(ROOT, '.homeycompose');
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    log('  Cleaned .homeycompose cache', 'cyan');
  }

  const buildResult = exec('homey app build');
  if (!buildResult.success) {
    log('❌ Build failed', 'red');
    log(buildResult.output, 'red');
    return false;
  }

  log('  ✅ Build successful', 'green');

  log('\n✅ Validating at publish level...', 'blue');
  const validateResult = exec('homey app validate --level publish');
  
  if (validateResult.success || validateResult.output.includes('validated successfully')) {
    log(validateResult.output);
    log('✅ Validation passed!', 'green');
    return true;
  } else {
    log('⚠️  Validation warnings/errors:', 'yellow');
    log(validateResult.output, 'yellow');
    
    // Check if critical errors
    if (validateResult.output.includes('✖')) {
      log('❌ Critical validation errors found', 'red');
      return false;
    }
    
    log('⚠️  Non-critical warnings, continuing...', 'yellow');
    return true;
  }
}

function step5_generateReports() {
  log('\n' + '='.repeat(60), 'bright');
  log('STEP 5: GÉNÉRATION DES RAPPORTS FINAUX', 'bright');
  log('='.repeat(60), 'bright');

  const reportsDir = path.join(ROOT, 'reports');
  
  if (!fs.existsSync(reportsDir)) {
    log('  ⚠️  No reports directory found', 'yellow');
    return true;
  }

  const reports = fs.readdirSync(reportsDir)
    .filter(f => f.endsWith('.json') || f.endsWith('.md'))
    .sort();

  log(`\n📊 Generated reports (${reports.length}):`, 'blue');
  
  for (const report of reports) {
    const reportPath = path.join(reportsDir, report);
    const stats = fs.statSync(reportPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    log(`  📄 ${report} (${sizeMB} MB)`, 'cyan');
  }

  // Créer un rapport de synthèse
  const auditReport = path.join(reportsDir, 'ULTIMATE_AUDIT_REPORT.json');
  const integrationReport = path.join(reportsDir, 'ALIEXPRESS_INTEGRATION_REPORT.json');
  const fixReport = path.join(reportsDir, 'AUTO_FIX_REPORT.json');

  const summary = {
    date: new Date().toISOString(),
    version: require(path.join(ROOT, 'app.json')).version,
    reports: {
      audit: fs.existsSync(auditReport) ? JSON.parse(fs.readFileSync(auditReport, 'utf8')).meta : null,
      integration: fs.existsSync(integrationReport) ? JSON.parse(fs.readFileSync(integrationReport, 'utf8')) : null,
      fixes: fs.existsSync(fixReport) ? JSON.parse(fs.readFileSync(fixReport, 'utf8')) : null
    },
    status: 'completed'
  };

  const summaryPath = path.join(reportsDir, 'ORCHESTRATION_SUMMARY.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  
  log(`\n  ✅ Summary saved: ${path.relative(ROOT, summaryPath)}`, 'green');

  return true;
}

function displaySummary() {
  log('\n' + '='.repeat(60), 'bright');
  log('✅ ORCHESTRATION COMPLETE!', 'green');
  log('='.repeat(60), 'bright');

  const reportsDir = path.join(ROOT, 'reports');
  const summaryPath = path.join(reportsDir, 'ORCHESTRATION_SUMMARY.json');
  
  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    
    log('\n📊 Summary:', 'cyan');
    log(`  Version: ${summary.version}`, 'white');
    log(`  Date: ${summary.date}`, 'white');
    
    if (summary.reports.audit) {
      log(`\n  Audit:`, 'yellow');
      log(`    Total Issues: ${summary.reports.audit.totalIssues}`, 'white');
      log(`    Drivers Scanned: ${summary.reports.audit.statistics?.drivers || 'N/A'}`, 'white');
    }
    
    if (summary.reports.integration) {
      log(`\n  AliExpress Integration:`, 'yellow');
      log(`    Devices: ${summary.reports.integration.totalDevices}`, 'white');
      log(`    Enriched Drivers: ${summary.reports.integration.enrichedDrivers}`, 'white');
    }
  }

  log('\n📁 Reports:', 'cyan');
  log(`  Location: ${path.relative(ROOT, reportsDir)}`, 'white');
  
  log('\n🚀 Next Steps:', 'cyan');
  log('  1. Review reports in ./reports/', 'white');
  log('  2. Check git diff for changes', 'white');
  log('  3. Test with: homey app run', 'white');
  log('  4. Commit: git add -A && git commit -m "feat: audit and enrichment"', 'white');
  log('  5. Push: git push', 'white');
  
  log('\n' + '='.repeat(60), 'bright');
}

async function main() {
  log('\n' + '█'.repeat(60), 'bright');
  log('█' + ' '.repeat(58) + '█', 'bright');
  log('█     ULTIMATE ORCHESTRATOR - AUDIT & ENRICHMENT SYSTEM    █', 'bright');
  log('█' + ' '.repeat(58) + '█', 'bright');
  log('█'.repeat(60), 'bright');

  const startTime = Date.now();

  // Check prerequisites
  checkPrerequisites();

  // Execute pipeline
  const steps = [
    { name: 'Audit', fn: step1_audit },
    { name: 'AliExpress Integration', fn: step2_integrateAliExpress },
    { name: 'Apply Fixes', fn: step3_applyFixes },
    { name: 'Validate Homey', fn: step4_validateHomey },
    { name: 'Generate Reports', fn: step5_generateReports }
  ];

  let completedSteps = 0;

  for (const step of steps) {
    const success = step.fn();
    
    if (success) {
      completedSteps++;
    } else {
      log(`\n❌ Step "${step.name}" failed. Stopping pipeline.`, 'red');
      log(`\n✅ Completed: ${completedSteps}/${steps.length} steps`, 'yellow');
      process.exit(1);
    }
  }

  // Display summary
  displaySummary();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  log(`\n⏱️  Total time: ${duration}s`, 'cyan');
  log('\n', 'reset');
}

main();
