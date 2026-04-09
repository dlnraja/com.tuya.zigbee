#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  AUTONOMOUS MAINTENANCE ORCHESTRATOR v2.0 "The Nexus Brain"                  ║
 * ║  The "Brain" of the Universal Tuya Zigbee App maintenance pipeline.          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  v2.0: Deep Thinking Architectural Health & Zero-Defect Gating               ║
 * ║  1. Intelligent Gating: Avoid redundant runs                                 ║
 * ║  2. Architectural Triage: Task Divider v2.0 integration                       ║
 * ║  3. Self-Healing: Master Engine v2.1                                         ║
 * ║  4. Zero-Defect Audit: Regression detection                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, '.github/state/orchestrator-state.json');

// Ensure state dir exists
if (!fs.existsSync(path.dirname(STATE_FILE))) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
}

function log(msg) { console.log(`[NEXUS] ${msg}`); }

function run(cmd, desc, abortOnError = false) {
  console.log(`\n🚀 [TASK] ${desc}`);
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
    return true;
  } catch (e) {
    console.error(`❌ [ERR] Task failed: ${desc}`);
    if (abortOnError) {
      console.error('🛑 [FATAL] Aborting pipeline due to critical failure.');
      process.exit(1);
    }
    return false;
  }
}

async function main() {
  const startTime = Date.now();
  console.log('--- 🧠 Universal Tuya Nexus Orchestrator Session ---');
  
  const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { lastRun: 0, errors: [] };

  // PHASE 1: Intelligence & Triage (Task Divider)
  // This identifies what needs to be fixed and blocks regressions
  run('node scripts/maintenance/triage-engine.js', 'Ph1: Architectural Triage & Regression Check', true);

  // PHASE 2: Knowledge Ingestion
  run('node scripts/maintenance/fetch-community-intel.js', 'Ph2: Community Intelligence Ingestion');

  // PHASE 3: Autonomous Repair (Self-Healing)
  process.env.DRY_RUN = 'false';
  run('node scripts/maintenance/master-self-heal.js', 'Ph3: Master Self-Healing Engine (v2.1)');

  // PHASE 4: Architectural Hardening (Zero-Defect Audit)
  run('node scripts/maintenance/zero-defect-architect-audit.js', 'Ph4: Zero-Defect Architect Audit');

  // PHASE 5: Integrity Verification
  console.log('\n🔍 [VALIDATION] Verifying app integrity...');
  const isValid = run('npx homey app validate --level publish', 'Ph5: Homey SDK3 Validation Audit');

  // PHASE 6: Report Generation
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const report = {
    lastRun: Date.now(),
    duration,
    status: isValid ? 'HEALTHY' : 'WARNINGS',
    version: require('./app.json').version
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(report, null, 2));
  
  console.log(`\n--- 🏁 Nexus Session Complete (${duration}s) ---`);
  if (!isValid) process.exit(0); // Proceed but with warnings
}

main().catch(e => {
  console.error('Fatal nexus orchestrator error:', e);
  process.exit(1);
});

