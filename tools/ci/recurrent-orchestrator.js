#!/usr/bin/env node
/**
 * P32.5 — Recurrent Orchestrator
 *
 * Runs ALL analyzers in a pipeline, 100% offline-first.
 * AI is a bonus layer (--ai flag) that NEVER blocks.
 *
 * Pipeline:
 *  1. Smart variant handler  → variant-matrix.json
 *  2. Battery cartography    → battery-cartography.json
 *  3. Battery gaps            → battery-gaps.json
 *  4. Activity fetcher       → activity-snapshot.json
 *  5. Offline crash analyzer → crash-analysis.json
 *  6. Smart auto-fix         → auto-fix-proposals.json
 *  7. Temporal monitor       → temporal-monitor-report.json
 *  8. LocalFirstEngine       → runs all 35 rules from P1-P31 history
 *  9. Predictor               → predictIssues
 *  10. AI bonus (optional)    → adds LLM suggestions if API available
 *
 * All steps save JSON to .github/state/. Each is independent.
 * If one step fails, the others continue.
 *
 * Usage:
 *   node tools/ci/recurrent-orchestrator.js          # offline mode (default)
 *   node tools/ci/recurrent-orchestrator.js --ai     # + AI bonus
 *   node tools/ci/recurrent-orchestrator.js --quick  # skip heavy steps
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const stateDir = path.join(repoRoot, '.github', 'state');
const outputFile = path.join(stateDir, 'recurrent-orchestrator-report.json');
const nodeBin = process.execPath;

const useAI = process.argv.includes('--ai');
const isQuick = process.argv.includes('--quick');

function log(...args) { console.log('[orchestrator]', ...args); }

async function runStep(name, scriptPath, args = []) {
  const t0 = Date.now();
  try {
    const stdout = execFileSync(nodeBin, [scriptPath, ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, NODE_OPTIONS: '' },
    });
    const duration = Date.now() - t0;
    log(`  ✅ ${name} (${duration}ms)`);
    return { name, status: 'ok', duration, output: stdout.split('\n').slice(-5).join('\n') };
  } catch (err) {
    const duration = Date.now() - t0;
    log(`  ❌ ${name} failed (${duration}ms): ${err.message.split('\n')[0]}`);
    return { name, status: 'failed', duration, error: err.message };
  }
}

async function runLocalFirstEngine() {
  const t0 = Date.now();
  try {
    const LocalFirstEngine = require(path.join(repoRoot, 'lib', 'LocalFirstEngine.js'));
    
    // Run predictIssues
    const fpsPath = path.join(repoRoot, 'lib', 'tuya', 'fingerprints.json');
    const driversDir = path.join(repoRoot, 'drivers');
    
    if (!fs.existsSync(fpsPath)) return { name: 'LocalFirstEngine', status: 'skipped', reason: 'no fingerprints.json' };
    
    const fps = JSON.parse(fs.readFileSync(fpsPath, 'utf8'));
    
    // Build driverCompose map
    const driverCompose = {};
    for (const d of fs.readdirSync(driversDir)) {
      const cf = path.join(driversDir, d, 'driver.compose.json');
      if (!fs.existsSync(cf)) continue;
      try {
        const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
        driverCompose[c.id || d] = {
          manufacturerName: c.zigbee?.manufacturerName || [],
          productId: c.zigbee?.productId || [],
        };
      } catch { /* ignore */ }
    }
    
    const predictions = LocalFirstEngine.predictIssues({
      fingerprints: fps,
      driverCompose,
    });
    
    // Save predictions
    fs.writeFileSync(
      path.join(stateDir, 'local-first-engine-predictions.json'),
      JSON.stringify(predictions, null, 2)
    );
    
    return {
      name: 'LocalFirstEngine',
      status: 'ok',
      duration: Date.now() - t0,
      predictions: predictions.length,
      bySeverity: {
        high: predictions.filter(p => p.severity === 'high').length,
        medium: predictions.filter(p => p.severity === 'medium').length,
        low: predictions.filter(p => p.severity === 'low').length,
      },
      rulesCount: LocalFirstEngine.rulesCount,
      categories: LocalFirstEngine.categories,
    };
  } catch (err) {
    return { name: 'LocalFirstEngine', status: 'failed', error: err.message };
  }
}

async function callAIBonus(report) {
  if (!useAI) return null;
  try {
    const LocalFirstEngine = require(path.join(repoRoot, 'lib', 'LocalFirstEngine.js'));
    const summary = {
      steps: report.steps.map(s => `${s.name}: ${s.status}`),
      predictions: report.steps.find(s => s.name === 'LocalFirstEngine')?.bySeverity || {},
    };
    const prompt = `Briefly analyze this Tuya app diagnostic summary and suggest 1-2 additional checks. Max 100 words.

${JSON.stringify(summary, null, 2)}`;

    const result = await LocalFirstEngine.callAI(prompt, { maxTokens: 200 });
    if (result) {
      log(`  🤖 AI bonus: ${result.provider} responded`);
      return { provider: result.provider, content: result.content };
    } else {
      log('  ⚠️ AI bonus: no provider available (no API key) — engine still works 100% offline');
    }
  } catch (e) {
    log(`  ⚠️ AI bonus failed: ${e.message}`);
  }
  return null;
}

async function main() {
  const t0 = Date.now();
  log('═'.repeat(60));
  log('RECURRENT ORCHESTRATOR v1.0 — ' + new Date().toISOString());
  log('Mode:', useAI ? 'AI-augmented (bonus only)' : 'OFFLINE-FIRST (default)');
  log('═'.repeat(60));

  fs.mkdirSync(stateDir, { recursive: true });

  const report = {
    runAt: new Date().toISOString(),
    mode: useAI ? 'ai-bonus' : 'offline-first',
    engine: 'LocalFirstEngine v1.0',
    aiAvailable: !!process.env.OPENAI_API_KEY || !!process.env.GITHUB_TOKEN || !!process.env.ANTHROPIC_API_KEY,
    steps: [],
  };

  // Step 1: Smart variant handler
  log('Step 1/10: Smart variant handler...');
  report.steps.push(await runStep('Smart variant', path.join(repoRoot, 'tools/ci/smart-variant-handler.js')));

  if (!isQuick) {
    // Step 2: Battery cartography
    log('Step 2/10: Battery cartography...');
    report.steps.push(await runStep('Battery cartography', path.join(repoRoot, 'tools/ci/battery-cartography.js')));

    // Step 3: Battery gaps
    log('Step 3/10: Battery gaps...');
    report.steps.push(await runStep('Battery gaps', path.join(repoRoot, 'tools/ci/battery-gaps.js')));

    // Step 4: Activity fetcher
    log('Step 4/10: Activity fetcher...');
    report.steps.push(await runStep('Activity', path.join(repoRoot, 'tools/ci/fetch-all-activity.js')));

    // Step 5: Offline crash analyzer
    log('Step 5/10: Offline crash analyzer...');
    report.steps.push(await runStep('Crash analyzer', path.join(repoRoot, 'tools/ci/offline-crash-analyzer.js')));

    // Step 6: Smart auto-fix
    log('Step 6/10: Smart auto-fix...');
    const autoFixArgs = useAI ? ['--ai'] : [];
    report.steps.push(await runStep('Auto-fix', path.join(repoRoot, 'tools/ci/smart-auto-fix.js'), autoFixArgs));

    // Step 7: Temporal monitor
    log('Step 7/10: Temporal monitor...');
    report.steps.push(await runStep('Temporal monitor', path.join(repoRoot, 'tools/ci/temporal-monitor.js')));

    // Step 8: Session-start
    log('Step 8/10: Session-start...');
    report.steps.push(await runStep('Session start', path.join(repoRoot, 'tools/ci/session-start.js')));
  }

  // Step 9: LocalFirstEngine rules + predictions
  log('Step 9/10: LocalFirstEngine (rules + predictions)...');
  report.steps.push(await runLocalFirstEngine());

  // Step 10: AI bonus (optional)
  if (useAI) {
    log('Step 10/10: AI bonus layer...');
    const aiResult = await callAIBonus(report);
    if (aiResult) {
      report.steps.push({
        name: 'AI bonus',
        status: 'ok',
        provider: aiResult.provider,
        content: aiResult.content.substring(0, 1000),
      });
    } else {
      report.steps.push({
        name: 'AI bonus',
        status: 'skipped (no provider)',
        reason: 'No OPENAI_API_KEY / GITHUB_TOKEN / ANTHROPIC_API_KEY — engine still works offline',
      });
    }
  } else {
    log('Step 10/10: AI bonus SKIPPED (--ai flag not set)');
  }

  // Summary
  const totalDuration = Date.now() - t0;
  const ok = report.steps.filter(s => s.status === 'ok').length;
  const failed = report.steps.filter(s => s.status === 'failed').length;

  report.summary = {
    totalSteps: report.steps.length,
    ok,
    failed,
    totalDuration,
    localFirstEngine: report.steps.find(s => s.name === 'LocalFirstEngine'),
  };

  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));

  log('');
  log('─'.repeat(60));
  log('SUMMARY:');
  log(`  Steps: ${report.steps.length} total (${ok} ok, ${failed} failed)`);
  log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  log(`  AI: ${report.aiAvailable ? 'available' : 'NOT available'} (mode: ${report.mode})`);
  if (report.summary.localFirstEngine) {
    log(`  LocalFirstEngine: ${report.summary.localFirstEngine.predictions} predictions`);
    log(`    By severity: ${JSON.stringify(report.summary.localFirstEngine.bySeverity)}`);
  }
  log('─'.repeat(60));
  log('Report:', outputFile, `(${Math.round(fs.statSync(outputFile).size / 1024)}KB)`);
  log('✅ Engine ran offline:', !useAI || failed === 0);
}

main().catch(err => {
  console.error('[orchestrator] FATAL:', err);
  process.exit(1);
});
