#!/usr/bin/env node
/*
 * Ultimate_Quantified_Orchestrator.js
 * --------------------------------------------------------------
 * Executes the Prompt Final Ultime et Quantifié cycle until all
 * success criteria are met. Each phase module is invoked in order,
 * and metrics are collected to decide whether recursion is needed.
 */

const fs = require('fs');
const path = require('path');

const auditPhase = require('./modules/Audit_System');
const enrichPhase = require('./modules/Data_Enricher');
const classifyPhase = require('./modules/Driver_Classifier_Corrector');
const publishPhase = require('./modules/Publisher_CI');

const ROOT = path.resolve(__dirname, '../..');
const STATE_DIR = path.resolve(__dirname, 'state');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const MAX_ITERATIONS = 3;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function getStateSnapshots() {
  return {
    audit: readJsonSafe(path.join(STATE_DIR, 'audit_state.json')),
    enrichment: readJsonSafe(path.join(STATE_DIR, 'data_enrichment.json')),
    classifier: readJsonSafe(path.join(STATE_DIR, 'driver_classifier_state.json')),
    publisher: readJsonSafe(path.join(STATE_DIR, 'publisher_ci_state.json')),
  };
}

function collectManufacturers() {
  const manufacturers = new Set();
  try {
    const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    driverDirs.forEach((driverId) => {
      const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
      if (!fs.existsSync(composePath)) return;
      const manifest = readJsonSafe(composePath);
      if (!manifest || !manifest.zigbee) return;
      const entry = manifest.zigbee.manufacturerName;
      if (Array.isArray(entry)) {
        entry.forEach((value) => typeof value === 'string' && manufacturers.add(value.trim()));
      } else if (typeof entry === 'string') {
        manufacturers.add(entry.trim());
      }
    });
  } catch (error) {
    // ignore
  }
  return manufacturers;
}

function hasWildcards(manufacturers) {
  for (const name of manufacturers) {
    if (!name) continue;
    if (name.includes('*') || /PLACEHOLDER/i.test(name) || /_TZ[0-9A-Z]*_$/.test(name)) {
      return true;
    }
  }
  return false;
}

function detectDuplicates(manufacturers) {
  const map = new Map();
  manufacturers.forEach((name) => {
    map.set(name, (map.get(name) || 0) + 1);
  });
  for (const count of map.values()) {
    if (count > 1) return true;
  }
  return false;
}

function summarizeClassifierMetrics(classifier) {
  if (!classifier || !classifier.metrics) {
    return {
      manufacturersCorrected: 0,
      driversRelocated: 0,
      duplicatesResolved: 0,
    };
  }
  return classifier.metrics;
}

function runIteration(iteration) {
  console.log(`\n🔁 Itération ${iteration}/${MAX_ITERATIONS}`);

  console.log(' • Phase 1');
  auditPhase.main();

  console.log(' • Phase 2');
  enrichPhase.main();

  console.log(' • Phase 3');
  classifyPhase.main();

  console.log(' • Phase 4');
  publishPhase.main();

  const states = getStateSnapshots();
  const manufacturers = collectManufacturers();
  const classifierMetrics = summarizeClassifierMetrics(states.classifier);

  const validationOk = !!(states.publisher && states.publisher.metrics && states.publisher.metrics.validationSuccess);
  const gitOk = states.publisher && states.publisher.metrics && ['success', 'success_after_pull'].includes(states.publisher.metrics.gitPushStatus);
  const wildcardsPresent = hasWildcards(manufacturers);
  const duplicatesPresent = detectDuplicates(manufacturers);

  const success = validationOk && gitOk && !wildcardsPresent && !duplicatesPresent;

  return {
    success,
    states,
    manufacturers: Array.from(manufacturers),
    metrics: {
      validationOk,
      gitOk,
      wildcardsPresent,
      duplicatesPresent,
      classifierMetrics,
    },
  };
}

function saveSummary(summary) {
  ensureDir(STATE_DIR);
  const filePath = path.join(STATE_DIR, 'orchestrator_summary.json');
  fs.writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf8');
  return filePath;
}

function main() {
  console.log('🚀 Lancement du Ultimate Quantified Orchestrator');
  const timelines = [];
  let finalResult = null;

  for (let i = 1; i <= MAX_ITERATIONS; i += 1) {
    const iterationResult = runIteration(i);
    timelines.push({
      iteration: i,
      success: iterationResult.success,
      metrics: iterationResult.metrics,
    });

    if (iterationResult.success) {
      finalResult = iterationResult;
      console.log('✅ Critères atteints – arrêt de la boucle.');
      break;
    }
    console.log('   • Critères non satisfaits, relance complète requise.');
  }

  if (!finalResult) {
    console.warn('⚠️ Aucun cycle n\'a satisfait tous les critères.');
    finalResult = timelines[timelines.length - 1];
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    iterations: timelines,
    finalMetrics: finalResult.metrics,
    manufacturerSample: (finalResult.manufacturers || []).slice(0, 20),
  };

  const summaryFile = saveSummary(summary);
  console.log(`📝 Résumé orchestration sauvegardé dans ${path.relative(ROOT, summaryFile)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Orchestrateur interrompu :', error);
    process.exitCode = 1;
  }
}

module.exports = {
  main,
};
