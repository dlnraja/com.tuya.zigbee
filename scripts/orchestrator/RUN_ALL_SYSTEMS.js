#!/usr/bin/env node

/**
 * 🚀 RUN ALL SYSTEMS - ORCHESTRATION COMPLÈTE
 * 
 * Lance TOUS les systèmes Ultimate dans l'ordre optimal:
 * 1. MEGA_ORCHESTRATOR_AI (scraping, analysis, optimization)
 * 2. Tuya Cloud to Local conversions (examples)
 * 3. SDK3 validation fixes
 * 4. Build & Validate
 * 5. Comprehensive report generation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '../..');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'docs/reports');

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║     🚀 RUN ALL SYSTEMS - ORCHESTRATION COMPLÈTE v1.0           ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

const startTime = Date.now();
const results = {
  timestamp: new Date().toISOString(),
  systems: [],
  totalTime: 0,
  success: true,
};

/**
 * Execute a system and track results
 */
function runSystem(name, command, description) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔄 ${name}`);
  console.log(`   ${description}`);
  console.log('═'.repeat(70) + '\n');
  
  const systemStart = Date.now();
  
  try {
    const output = execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: 'inherit',
    });
    
    const duration = Date.now() - systemStart;
    
    results.systems.push({
      name,
      description,
      status: 'SUCCESS',
      duration,
    });
    
    console.log(`\n✅ ${name} completed in ${(duration / 1000).toFixed(2)}s\n`);
    return true;
    
  } catch (err) {
    const duration = Date.now() - systemStart;
    
    results.systems.push({
      name,
      description,
      status: 'FAILED',
      duration,
      error: err.message,
    });
    
    console.error(`\n❌ ${name} failed after ${(duration / 1000).toFixed(2)}s`);
    console.error(`   Error: ${err.message}\n`);
    
    results.success = false;
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM 1: MEGA ORCHESTRATOR AI
// ═══════════════════════════════════════════════════════════════════════════

runSystem(
  'MEGA ORCHESTRATOR AI',
  'node scripts/orchestrator/MEGA_ORCHESTRATOR_AI.js',
  'Multi-source scraping, analysis, optimization, KPI tracking'
);

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM 2: TUYA CLOUD TO LOCAL CONVERTER (Examples)
// ═══════════════════════════════════════════════════════════════════════════

runSystem(
  'TUYA CLOUD TO LOCAL CONVERTER',
  'node scripts/conversion/TUYA_CLOUD_TO_LOCAL_CONVERTER.js',
  'Cloud→Local capability conversion with device identification'
);

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM 3: SDK3 CAPABILITIES CHECK
// ═══════════════════════════════════════════════════════════════════════════

if (fs.existsSync(path.join(PROJECT_ROOT, 'scripts/validation/CHECK_CAPABILITIES_SDK3.js'))) {
  runSystem(
    'SDK3 CAPABILITIES CHECK',
    'node scripts/validation/CHECK_CAPABILITIES_SDK3.js',
    'Validate all capabilities against SDK3 standards'
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM 4: BUILD & VALIDATE
// ═══════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(70)}`);
console.log('🏗️  BUILD & VALIDATION');
console.log('   Clean build and publish-level validation');
console.log('═'.repeat(70) + '\n');

const buildStart = Date.now();

try {
  // Clean
  console.log('🧹 Cleaning build directories...');
  try {
    execSync('Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .homeybuild,.homeychangelog', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      shell: 'powershell.exe',
    });
  } catch (err) {
    // Ignore clean errors
  }
  
  // Build
  console.log('🔨 Building app...');
  execSync('homey app build', {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  
  // Validate
  console.log('✅ Validating app (publish level)...');
  const validation = execSync('homey app validate --level publish', {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });
  
  const buildDuration = Date.now() - buildStart;
  
  const passed = validation.includes('✓');
  
  results.systems.push({
    name: 'BUILD & VALIDATION',
    description: 'Clean build and publish-level validation',
    status: passed ? 'SUCCESS' : 'WARNINGS',
    duration: buildDuration,
    output: validation,
  });
  
  console.log(`\n${passed ? '✅' : '⚠️'} Build & Validation completed in ${(buildDuration / 1000).toFixed(2)}s\n`);
  
} catch (err) {
  const buildDuration = Date.now() - buildStart;
  
  results.systems.push({
    name: 'BUILD & VALIDATION',
    description: 'Clean build and publish-level validation',
    status: 'FAILED',
    duration: buildDuration,
    error: err.message,
  });
  
  console.error(`\n❌ Build & Validation failed after ${(buildDuration / 1000).toFixed(2)}s`);
  console.error(`   Error: ${err.message}\n`);
  
  results.success = false;
}

// ═══════════════════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════════════════

results.totalTime = Date.now() - startTime;

console.log('\n' + '═'.repeat(70));
console.log('📊 ORCHESTRATION COMPLETE - FINAL REPORT');
console.log('═'.repeat(70) + '\n');

console.log(`⏱️  Total Time: ${(results.totalTime / 1000).toFixed(2)}s\n`);

console.log('📋 Systems Executed:\n');

results.systems.forEach((system, i) => {
  const icon = system.status === 'SUCCESS' ? '✅' : system.status === 'WARNINGS' ? '⚠️' : '❌';
  console.log(`${i + 1}. ${icon} ${system.name}`);
  console.log(`   Status: ${system.status}`);
  console.log(`   Duration: ${(system.duration / 1000).toFixed(2)}s`);
  if (system.error) {
    console.log(`   Error: ${system.error}`);
  }
  console.log();
});

console.log('═'.repeat(70));

if (results.success) {
  console.log('✅ ALL SYSTEMS OPERATIONAL');
} else {
  console.log('⚠️  SOME SYSTEMS HAD ISSUES (see above)');
}

console.log('═'.repeat(70) + '\n');

// Save comprehensive report
const reportPath = path.join(REPORTS_DIR, `orchestration_complete_${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

console.log(`📄 Comprehensive report saved to:`);
console.log(`   ${reportPath}\n`);

// Generate summary markdown
const summaryPath = path.join(REPORTS_DIR, 'ORCHESTRATION_SUMMARY.md');
const summary = `# 🚀 ORCHESTRATION COMPLETE - SUMMARY

**Date**: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}  
**Total Duration**: ${(results.totalTime / 1000).toFixed(2)}s  
**Status**: ${results.success ? '✅ SUCCESS' : '⚠️ PARTIAL SUCCESS'}

---

## Systems Executed

${results.systems.map((s, i) => {
  const icon = s.status === 'SUCCESS' ? '✅' : s.status === 'WARNINGS' ? '⚠️' : '❌';
  return `### ${i + 1}. ${icon} ${s.name}

**Description**: ${s.description}  
**Status**: ${s.status}  
**Duration**: ${(s.duration / 1000).toFixed(2)}s  
${s.error ? `**Error**: ${s.error}` : ''}
`;
}).join('\n')}

---

## Next Steps

${results.success ? `
✅ All systems operational
✅ App ready for publication
✅ Documentation complete

**Recommended Actions**:
1. Review orchestration reports
2. Test key devices
3. Publish to Homey App Store
` : `
⚠️ Review failed systems above
⚠️ Fix issues before publication

**Recommended Actions**:
1. Check error logs
2. Re-run failed systems
3. Validate fixes
`}

---

**Generated by**: RUN_ALL_SYSTEMS.js  
**Version**: 4.7.2
`;

fs.writeFileSync(summaryPath, summary);

console.log(`📄 Summary markdown saved to:`);
console.log(`   ${summaryPath}\n`);

console.log('🎉 ORCHESTRATION COMPLETE! 🎉\n');

process.exit(results.success ? 0 : 1);
