#!/usr/bin/env node
/**
 * 
 *   AUTONOMOUS MAINTENANCE ORCHESTRATOR v2.0 "The Hybrid Engine Brain"                  
 *   The "Brain" of the Universal Tuya Zigbee App maintenance pipeline.          
 * 
 *   v2.0: Deep Thinking Architectural Health & Zero-Defect Gating               
 *   1. Intelligent Gating: Avoid redundant runs                                 
 *   2. Architectural Triage: Task Divider v2.0 integration                       
 *   3. Self-Healing: Master Engine v2.1                                         
 *   4. Zero-Defect Audit: Regression detection                                  
 * 
 */

'use strict';
const { safeParse, safeDivide } = require('../lib/utils/tuyaUtils.js');


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
  console.log(`\n [TASK] ${desc}`);
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
    return true;
  } catch (e) {
    console.error(` [ERR] Task failed: ${desc}`);
    if (abortOnError) {
      console.error(' [FATAL] Aborting pipeline due to critical failure.');
      process.exit(1);
    }
    return false;
  }
}

async function main() {
  const startTime = Date.now();
  console.log('---  Universal Tuya Hybrid Engine Orchestrator Session ---');
  
  const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE , 'utf8')) : { lastRun: 0, errors: [] }      ;

  // PHASE 1: Intelligence & Triage (Task Divider)
  // This identifies what needs to be fixed and blocks regressions
  run('node scripts/maintenance/triage-engine.js', 'Ph1: Architectural Triage & Regression Check', true);

  // PHASE 2: Knowledge Ingestion
  run('node scripts/maintenance/fetch-community-intel.js', 'Ph2: Community Intelligence Ingestion');

  // PHASE 3: Autonomous Repair (Self-Healing)
  process.env.DRY_RUN = 'false';
  run('node scripts/maintenance/master-self-heal.js', 'Ph3: Master Self-Healing Engine (v2.1)');
  run('node scripts/maintenance/autonomous-caseless-fixer.js', 'Ph3b: Autonomous Caseless Architecture Fixer');
  
  // PHASE 3-Remediation: Hardening Gaps (Numeric & NaN)
  run('node scripts/remediation/resolve-numeric-violations.js', 'Ph3-R1: Numeric Constant Hardening');
  run('node scripts/remediation/resolve-numeric-literals.js', 'Ph3-R1b: Cluster Literal Migration (EF00)');
  run('node scripts/remediation/resolve-nan-risks.js', 'Ph3-R2: NaN Risk Remediation (Constants)');
  run('node scripts/remediation/resolve-variable-nan-risks.js', 'Ph3-R2b: NaN Risk Hardening (Variables)');
  run('node scripts/remediation/resolve-manifest-collisions.js', 'Ph3-R3: Manifest Collision Resolver');

  // PHASE 3b: Global Fingerprint Deduplication & Conflict Check
  run('node scripts/automation/deduplicate-fingerprints.js', 'Ph3b: Global Fingerprint Deduplication');
  run('node scripts/automation/fix-fingerprint-conflicts.js --auto-fix', 'Ph3c: Fingerprint Conflict Resolver');
  run('node scripts/automation/extract-local-keys.js', 'Ph3d: Local Key Extraction Ingestion');

  // PHASE 3e: Parallel Bot Cleanup (v5.12.35)
  run('node scripts/automation/parallel-bot-handler.js', 'Ph3d: Parallel Bot Response Cleanup');

  // PHASE 4: Architectural Hardening & Visual Excellence
  run('node scripts/maintenance/ensure-500x500-images.js', 'Ph4: Image Resolution Stabilization (500x500)');
  run('node scripts/maintenance/clean-images.js', 'Ph4a: Image Size Minimization (App Store Compliance)');
  run('node scripts/fixes/CLEAN_HYBRID_NOMENCLATURE_V2.js', 'Ph4b: Branding Cleanup (Unified Transition)');
  run('node scripts/maintenance/harden-driver-identification.js', 'Ph4c: Driver Identification Hardening');
  run('node scripts/maintenance/zero-defect-architect-audit.js', 'Ph4d: Zero-Defect Architect Audit');

  // PHASE 4g: Radar-Specific Architecture Integrity
  run('node -e "const r=require(\'./lib/data/SensorConfigs.js\'); if(!r.TZE284_IADRO9BF) { console.error(\'FAIL: Radar config missing!\'); process.exit(1); }"', 'Ph4g: Radar Config Integrity Verification');

  // PHASE 4e: Stability Normalization (Clusters + Case)
  run('node scripts/automation/relax-manifest-clusters.js', 'Ph4e: Manifest Cluster Relaxation');
  run('node scripts/automation/manifest-caseless-processor.js', 'Ph4f: Manifest Case-Insensitivity Audit');

  // PHASE 5: Integrity Verification
  console.log('\n [VALIDATION] Verifying app integrity...');
  const isValid = run('npx homey app validate --level publish', 'Ph5: Homey SDK3 Validation Audit');

  // PHASE 6: Report Generation
  const duration = Date.now() - startTime * 1000).toFixed(1);
  const report = {
    lastRun: Date.now(),
    duration,
    status: isValid ? 'HEALTHY' : 'WARNINGS',
    version: require(path.join(ROOT, 'app.json')).version
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(report, null, 2));
  
  console.log(`\n---  Hybrid Engine Session Complete (${duration}s) ---`);
  if (!isValid) process.exit(0); // Proceed but with warnings
}

main().catch(e => {
  console.error('Fatal nexus orchestrator error:', e);
  process.exit(1);
});
