#!/usr/bin/env node
/**
 * ITERATIVE COMPLETE SYSTEM - Execute 5 iterations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

console.log('🔄 ITERATIVE COMPLETE SYSTEM - 5 Iterations\n');
console.log('═'.repeat(70));

const iterations = 5;
const results = [];

for (let i = 1; i <= iterations; i++) {
  console.log(`\n\n🔄 ITERATION ${i}/${iterations}`);
  console.log('─'.repeat(70));
  
  const startTime = Date.now();
  
  try {
    // Run autonomous system
    console.log('\n📦 Running autonomous_complete_system.js...');
    execSync('node tools/autonomous_complete_system.js', {
      cwd: ROOT,
      stdio: 'inherit'
    });
    
    // Sync app.json
    console.log('\n🔄 Syncing app.json...');
    execSync('node tools/sync_app_json.js', {
      cwd: ROOT,
      stdio: 'inherit'
    });
    
    // Validate
    console.log('\n✅ Running coherence check...');
    execSync('node tools/coherence_checker.js', {
      cwd: ROOT,
      stdio: 'pipe'
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    results.push({
      iteration: i,
      success: true,
      elapsed: `${elapsed}s`,
      timestamp: new Date().toISOString()
    });
    
    console.log(`\n✅ Iteration ${i} completed in ${elapsed}s`);
    
  } catch (error) {
    console.error(`\n❌ Iteration ${i} failed:`, error.message);
    results.push({
      iteration: i,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Summary
console.log('\n\n═'.repeat(70));
console.log('📊 ITERATIVE EXECUTION SUMMARY');
console.log('═'.repeat(70));

const successful = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;

console.log(`\n✅ Successful iterations: ${successful}/${iterations}`);
console.log(`❌ Failed iterations: ${failed}/${iterations}`);

results.forEach(r => {
  const status = r.success ? '✅' : '❌';
  const time = r.elapsed || 'N/A';
  console.log(`  ${status} Iteration ${r.iteration}: ${time}`);
});

// Save report
const report = {
  timestamp: new Date().toISOString(),
  totalIterations: iterations,
  successful,
  failed,
  results
};

const reportPath = path.join(ROOT, 'project-data', 'reports', 'iterative_execution_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n📄 Report saved: ${path.relative(ROOT, reportPath)}`);
console.log('\n═'.repeat(70));

if (failed === 0) {
  console.log('✅ ALL ITERATIONS SUCCESSFUL - SYSTEM READY FOR PUBLICATION\n');
  process.exit(0);
} else {
  console.log(`⚠️  ${failed} iterations failed - Review above\n`);
  process.exit(1);
}
