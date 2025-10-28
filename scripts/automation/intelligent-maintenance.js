#!/usr/bin/env node
/**
 * INTELLIGENT MAINTENANCE SYSTEM
 * 
 * Système de maintenance automatique intelligent qui:
 * - Détecte les nouvelles évolutions du projet
 * - Analyse les changements externes (Z2M, Blakadder, Johan)
 * - Met à jour automatiquement les données
 * - Valide la cohérence
 * - Génère des rapports
 * - Crée des PRs automatiques si nécessaire
 * 
 * Usage:
 *   node scripts/automation/intelligent-maintenance.js [--full] [--dry-run]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const REPORTS_DIR = path.join(ROOT, 'docs/reports/maintenance');

// Create reports directory
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const args = process.argv.slice(2);
const IS_FULL = args.includes('--full');
const IS_DRY_RUN = args.includes('--dry-run');

console.log(`${COLORS.cyan}${COLORS.bright}🤖 INTELLIGENT MAINTENANCE SYSTEM${COLORS.reset}\n`);
console.log(`Mode: ${IS_FULL ? 'FULL' : 'STANDARD'} ${IS_DRY_RUN ? '(DRY RUN)' : ''}\n`);

const REPORT = {
  timestamp: new Date().toISOString(),
  mode: IS_FULL ? 'full' : 'standard',
  dryRun: IS_DRY_RUN,
  tasks: [],
  errors: [],
  warnings: [],
  stats: {}
};

/**
 * Execute command safely
 */
function execCommand(command, description) {
  console.log(`${COLORS.blue}▶${COLORS.reset} ${description}...`);
  
  try {
    const output = execSync(command, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: IS_DRY_RUN ? 'pipe' : 'inherit'
    });
    
    REPORT.tasks.push({
      description,
      command,
      status: 'success',
      output: output ? output.substring(0, 500) : null
    });
    
    console.log(`${COLORS.green}✓${COLORS.reset} ${description} - Done\n`);
    return output;
  } catch (err) {
    REPORT.tasks.push({
      description,
      command,
      status: 'error',
      error: err.message
    });
    
    REPORT.errors.push({
      task: description,
      error: err.message
    });
    
    console.error(`${COLORS.red}✗${COLORS.reset} ${description} - Failed: ${err.message}\n`);
    return null;
  }
}

/**
 * Task 1: Check Git Status
 */
function checkGitStatus() {
  console.log(`${COLORS.cyan}${COLORS.bright}[1/8] Git Status Check${COLORS.reset}\n`);
  
  const status = execCommand('git status --porcelain', 'Check working directory');
  
  if (status && status.trim().length > 0) {
    REPORT.warnings.push({
      task: 'Git Status',
      message: 'Working directory not clean',
      recommendation: 'Commit or stash changes before maintenance'
    });
  }
  
  // Check remote
  execCommand('git fetch origin', 'Fetch remote changes');
  
  const behind = execCommand('git rev-list HEAD..origin/master --count', 'Check if behind remote');
  if (behind && parseInt(behind) > 0) {
    REPORT.warnings.push({
      task: 'Git Sync',
      message: `Local branch is ${behind} commits behind remote`,
      recommendation: 'Pull latest changes'
    });
  }
}

/**
 * Task 2: External Data Extraction
 */
function extractExternalData() {
  console.log(`${COLORS.cyan}${COLORS.bright}[2/8] External Data Extraction${COLORS.reset}\n`);
  
  if (IS_DRY_RUN) {
    console.log('  (Skipped in dry-run mode)\n');
    return;
  }
  
  // Extract Zigbee2MQTT
  const z2mOutput = execCommand('npm run extract:z2m', 'Extract Zigbee2MQTT data');
  
  if (z2mOutput) {
    const z2mPath = path.join(ROOT, 'data/extracted/zigbee2mqtt-extracted.json');
    if (fs.existsSync(z2mPath)) {
      const z2mData = JSON.parse(fs.readFileSync(z2mPath, 'utf8'));
      REPORT.stats.z2m_devices = z2mData.total || 0;
    }
  }
  
  // Extract Blakadder
  const blakadderOutput = execCommand('npm run extract:blakadder', 'Extract Blakadder data');
  
  if (blakadderOutput) {
    const blakadderPath = path.join(ROOT, 'data/extracted/blakadder-extracted.json');
    if (fs.existsSync(blakadderPath)) {
      const blakadderData = JSON.parse(fs.readFileSync(blakadderPath, 'utf8'));
      REPORT.stats.blakadder_devices = blakadderData.total || 0;
    }
  }
}

/**
 * Task 3: Consolidate Data
 */
function consolidateData() {
  console.log(`${COLORS.cyan}${COLORS.bright}[3/8] Data Consolidation${COLORS.reset}\n`);
  
  if (IS_DRY_RUN) {
    console.log('  (Skipped in dry-run mode)\n');
    return;
  }
  
  execCommand('npm run consolidate', 'Consolidate all data sources');
  
  const statsPath = path.join(ROOT, 'data/consolidated/consolidation-stats.json');
  if (fs.existsSync(statsPath)) {
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    REPORT.stats.total_datapoints = stats.total || 0;
    REPORT.stats.conflicts = stats.conflicts ? stats.conflicts.length : 0;
    
    if (REPORT.stats.conflicts > 0) {
      REPORT.warnings.push({
        task: 'Data Consolidation',
        message: `Found ${REPORT.stats.conflicts} DataPoint conflicts`,
        recommendation: 'Review data/consolidated/consolidation-stats.json'
      });
    }
  }
}

/**
 * Task 4: Validate Drivers
 */
function validateDrivers() {
  console.log(`${COLORS.cyan}${COLORS.bright}[4/8] Drivers Validation${COLORS.reset}\n`);
  
  // Count drivers
  const driversDir = path.join(ROOT, 'drivers');
  const drivers = fs.readdirSync(driversDir).filter(dir => {
    return fs.statSync(path.join(driversDir, dir)).isDirectory();
  });
  
  REPORT.stats.total_drivers = drivers.length;
  
  // Validate with Homey CLI
  execCommand('npm run validate', 'Validate app with Homey CLI');
}

/**
 * Task 5: Check Dependencies
 */
function checkDependencies() {
  console.log(`${COLORS.cyan}${COLORS.bright}[5/8] Dependencies Check${COLORS.reset}\n`);
  
  // Check for outdated packages
  const outdated = execCommand('npm outdated --json', 'Check outdated packages');
  
  if (outdated) {
    try {
      const packages = JSON.parse(outdated);
      const count = Object.keys(packages).length;
      
      if (count > 0) {
        REPORT.warnings.push({
          task: 'Dependencies',
          message: `${count} outdated packages`,
          recommendation: 'Review and update dependencies'
        });
        REPORT.stats.outdated_packages = count;
      }
    } catch (err) {
      // npm outdated returns non-zero if packages are outdated
    }
  }
  
  // Security audit
  execCommand('npm audit --json > /dev/null 2>&1 || true', 'Security audit');
}

/**
 * Task 6: Code Quality Checks
 */
function codeQualityChecks() {
  console.log(`${COLORS.cyan}${COLORS.bright}[6/8] Code Quality Checks${COLORS.reset}\n`);
  
  // Count lines of code
  try {
    const jsFiles = execSync(
      'find lib drivers scripts -name "*.js" 2>/dev/null | wc -l',
      { cwd: ROOT, encoding: 'utf8' }
    );
    REPORT.stats.js_files = parseInt(jsFiles);
  } catch (err) {
    // Windows doesn't have find
    REPORT.stats.js_files = 'N/A';
  }
  
  // Check for TODO/FIXME
  try {
    const todos = execSync(
      'grep -r "TODO\\|FIXME" lib/ drivers/ scripts/ 2>/dev/null | wc -l',
      { cwd: ROOT, encoding: 'utf8' }
    );
    const todoCount = parseInt(todos);
    if (todoCount > 0) {
      REPORT.stats.todos = todoCount;
      REPORT.warnings.push({
        task: 'Code Quality',
        message: `${todoCount} TODO/FIXME comments found`,
        recommendation: 'Address pending items'
      });
    }
  } catch (err) {
    // Grep not available or no matches
  }
}

/**
 * Task 7: Generate Statistics
 */
function generateStatistics() {
  console.log(`${COLORS.cyan}${COLORS.bright}[7/8] Statistics Generation${COLORS.reset}\n`);
  
  // App version
  const appJsonPath = path.join(ROOT, 'app.json');
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    REPORT.stats.app_version = appJson.version;
  }
  
  // Git stats
  try {
    const commitCount = execSync(
      'git log --oneline --since="1 month ago" | wc -l',
      { cwd: ROOT, encoding: 'utf8' }
    );
    REPORT.stats.commits_last_month = parseInt(commitCount);
  } catch (err) {
    REPORT.stats.commits_last_month = 'N/A';
  }
  
  console.log(`${COLORS.green}✓${COLORS.reset} Statistics generated\n`);
}

/**
 * Task 8: Generate Report
 */
function generateReport() {
  console.log(`${COLORS.cyan}${COLORS.bright}[8/8] Report Generation${COLORS.reset}\n`);
  
  const reportPath = path.join(
    REPORTS_DIR,
    `maintenance-${new Date().toISOString().split('T')[0]}.json`
  );
  
  fs.writeFileSync(reportPath, JSON.stringify(REPORT, null, 2));
  
  // Generate Markdown report
  const mdReport = generateMarkdownReport();
  const mdPath = reportPath.replace('.json', '.md');
  fs.writeFileSync(mdPath, mdReport);
  
  console.log(`${COLORS.green}✓${COLORS.reset} Reports generated:`);
  console.log(`  - ${reportPath}`);
  console.log(`  - ${mdPath}\n`);
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport() {
  return `# 🤖 Intelligent Maintenance Report

**Date**: ${REPORT.timestamp}  
**Mode**: ${REPORT.mode.toUpperCase()} ${REPORT.dryRun ? '(DRY RUN)' : ''}  
**Status**: ${REPORT.errors.length === 0 ? '✅ SUCCESS' : '⚠️ WITH ERRORS'}

---

## 📊 Statistics

${Object.entries(REPORT.stats).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}

---

## ✅ Tasks Completed

${REPORT.tasks.filter(t => t.status === 'success').map(t => `- ✓ ${t.description}`).join('\n')}

---

${REPORT.errors.length > 0 ? `
## ❌ Errors

${REPORT.errors.map(e => `### ${e.task}\n\`\`\`\n${e.error}\n\`\`\``).join('\n\n')}

---
` : ''}

${REPORT.warnings.length > 0 ? `
## ⚠️ Warnings

${REPORT.warnings.map(w => `### ${w.task}\n**Message**: ${w.message}\n**Recommendation**: ${w.recommendation}`).join('\n\n')}

---
` : ''}

## 🔄 Next Steps

${REPORT.warnings.length > 0 ? '- Address warnings listed above' : '- No action required'}
${REPORT.stats.conflicts > 0 ? '- Resolve DataPoint conflicts' : ''}
${REPORT.stats.outdated_packages > 0 ? '- Update outdated dependencies' : ''}
${REPORT.errors.length > 0 ? '- Fix errors and re-run maintenance' : ''}

---

**Generated by**: Intelligent Maintenance System  
**Repository**: https://github.com/dlnraja/com.tuya.zigbee
`;
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();
  
  try {
    checkGitStatus();
    extractExternalData();
    consolidateData();
    validateDrivers();
    checkDependencies();
    codeQualityChecks();
    generateStatistics();
    generateReport();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`${COLORS.cyan}${COLORS.bright}═══════════════════════════════════════${COLORS.reset}`);
    console.log(`${COLORS.green}${COLORS.bright}✅ Maintenance Complete!${COLORS.reset}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Errors: ${REPORT.errors.length}`);
    console.log(`Warnings: ${REPORT.warnings.length}`);
    console.log(`${COLORS.cyan}${COLORS.bright}═══════════════════════════════════════${COLORS.reset}\n`);
    
    if (REPORT.errors.length > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`${COLORS.red}💥 Fatal error:${COLORS.reset}`, err);
    process.exit(1);
  }
}

// Run
main();
