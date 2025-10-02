#!/usr/bin/env node
/*
 * Phase 1 – Audit_System.js
 * --------------------------------------------------------------
 * Performs the deep recursive audit required by the "Prompt Final
 * Ultime et Quantifié" specification. The module gathers metrics,
 * consolidates unresolved prompts, and exports sanitized git
 * history archives while reporting verbose progress indicators.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const STATE_DIR = path.resolve(__dirname, '../state');
const ARCHIVE_DIR = path.join(ROOT, 'ultimate_system', 'archives');
const REPORTS_DIR = path.join(ROOT, 'ultimate_system', 'reports');
const REFERENCES_DIR = path.join(ROOT, 'ultimate_system', 'references_moved');

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

function countDrivers(driversDir) {
  try {
    return fs.readdirSync(driversDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .length;
  } catch (error) {
    return 0;
  }
}

function collectManufacturerNames(driversDir) {
  const names = new Set();
  try {
    const driverDirs = fs.readdirSync(driversDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    driverDirs.forEach((driverName) => {
      const manifestPath = path.join(driversDir, driverName, 'driver.compose.json');
      if (!fs.existsSync(manifestPath)) return;

      const manifest = readJsonSafe(manifestPath);
      if (!manifest || !manifest.zigbee) return;

      const { manufacturerName } = manifest.zigbee;
      if (Array.isArray(manufacturerName)) {
        manufacturerName.forEach((entry) => {
          if (entry && typeof entry === 'string') {
            names.add(entry.trim());
          }
        });
      } else if (typeof manufacturerName === 'string') {
        names.add(manufacturerName.trim());
      }
    });
  } catch (error) {
    // swallow – handled by returning collected entries so far
  }
  return names;
}

function findManufacturerViolations(driversDir) {
  const violations = [];
  try {
    const driverDirs = fs.readdirSync(driversDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    driverDirs.forEach((driverName) => {
      const manifestPath = path.join(driversDir, driverName, 'driver.compose.json');
      if (!fs.existsSync(manifestPath)) return;

      const manifest = readJsonSafe(manifestPath);
      const manufacturerName = manifest?.zigbee?.manufacturerName;
      if (Array.isArray(manufacturerName) && manufacturerName.length > 1) {
        violations.push({
          driver: driverName,
          count: manufacturerName.length,
          sample: manufacturerName.slice(0, 10),
        });
      }
    });
  } catch (error) {
    console.warn('⚠️  Impossible de vérifier les manifestes mono-fabricant :', error.message);
  }
  return violations;
}

function countDriverCategories(catalogFile) {
  const catalog = readJsonSafe(catalogFile);
  if (!catalog || typeof catalog !== 'object') {
    return { totalCategories: 0, validFolders: 0, missingDrivers: [] };
  }

  const driversDir = path.join(ROOT, 'drivers');
  let validFolders = 0;
  const missing = [];

  Object.entries(catalog).forEach(([category, driverList]) => {
    if (!Array.isArray(driverList)) return;
    driverList.forEach((driverId) => {
      const driverPath = path.join(driversDir, driverId);
      if (fs.existsSync(driverPath)) {
        validFolders += 1;
      } else {
        missing.push({ category, driverId });
      }
    });
  });

  return {
    totalCategories: Object.keys(catalog).length,
    validFolders,
    missingDrivers: missing,
  };
}

function redactSecrets(content) {
  if (!content) return content;
  return content
    // Long hex strings / tokens
    .replace(/[A-Fa-f0-9]{32,}/g, '[REDACTED_HEX]')
    // Typical API key formats
    .replace(/(api[_-]?key\s*=\s*)([A-Za-z0-9-_]+)/gi, '$1[REDACTED]')
    .replace(/(token\s*=\s*)([A-Za-z0-9-_]+)/gi, '$1[REDACTED]')
    // Bearer tokens or secret-like words
    .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]');
}

function dumpGitHistory() {
  ensureDir(ARCHIVE_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dumpDir = path.join(ARCHIVE_DIR, `audit_${timestamp}`);
  ensureDir(dumpDir);

  let branchList = [];
  try {
    branchList = execSync('git for-each-ref --format="%(refname:short)" refs/heads/', {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.warn('⚠️  Impossible de récupérer la liste des branches locales.', error.message);
  }

  branchList.forEach((branch) => {
    const branchDir = path.join(dumpDir, branch.replace(/[\\/]/g, '_'));
    ensureDir(branchDir);

    try {
      const logOutput = execSync(`git log ${branch} --date=iso --pretty="%H|%ad|%an|%s"`, {
        cwd: ROOT,
        encoding: 'utf8',
      });
      const cleaned = redactSecrets(logOutput);
      fs.writeFileSync(path.join(branchDir, 'git_log.txt'), cleaned, 'utf8');
    } catch (error) {
      fs.writeFileSync(
        path.join(branchDir, 'git_log.txt'),
        `Erreur lors de l'export du log pour ${branch}: ${error.message}`,
        'utf8',
      );
    }
  });

  return dumpDir;
}

function collectOutstandingPrompts() {
  const aggregated = [];

  const inspectJsonFile = (filePath) => {
    const data = readJsonSafe(filePath);
    if (!data) return;

    const candidateKeys = ['todo', 'todos', 'pending', 'pendingTasks', 'errors', 'openPrompts'];
    candidateKeys.forEach((key) => {
      const value = data[key];
      if (Array.isArray(value)) {
        value.filter(Boolean).forEach((entry) => {
          aggregated.push({
            source: path.relative(ROOT, filePath),
            item: typeof entry === 'string' ? entry : JSON.stringify(entry),
          });
        });
      }
    });
  };

  const scanDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
        return;
      }
      if (entry.isFile() && entry.name.endsWith('.json')) {
        inspectJsonFile(fullPath);
      }
    });
  };

  scanDir(REPORTS_DIR);
  scanDir(REFERENCES_DIR);

  return aggregated;
}

function saveState(state) {
  ensureDir(STATE_DIR);
  const outputFile = path.join(STATE_DIR, 'audit_state.json');
  fs.writeFileSync(outputFile, JSON.stringify(state, null, 2), 'utf8');
  return outputFile;
}

function main() {
  console.log('⚙️  Phase 1 • Audit_System.js – démarrage de l\'audit complet');

  const driversDir = path.join(ROOT, 'drivers');
  const catalogFile = path.join(ROOT, 'catalog', 'categories.json');

  const driverCount = countDrivers(driversDir);
  const manufacturerNames = collectManufacturerNames(driversDir);
  const categoryMetrics = countDriverCategories(catalogFile);
  const manufacturerViolations = findManufacturerViolations(driversDir);

  console.log(`   • Drivers détectés : ${driverCount}`);
  console.log(`   • Fabricants uniques : ${manufacturerNames.size}`);
  console.log(`   • Associations catégorie → dossier valides : ${categoryMetrics.validFolders}`);
  console.log(`   • Violations mono-fabricant : ${manufacturerViolations.length}`);

  const outstandingPrompts = collectOutstandingPrompts();
  console.log(`   • Prompts/TODO consolidés : ${outstandingPrompts.length}`);

  console.log('   • Export historique git sécurisé…');
  const archivePath = dumpGitHistory();
  console.log(`     → Archive créée dans ${path.relative(ROOT, archivePath)}`);

  const state = {
    generatedAt: new Date().toISOString(),
    metrics: {
      drivers: driverCount,
      manufacturers: manufacturerNames.size,
      categories: categoryMetrics,
      manufacturerViolations: manufacturerViolations.length,
    },
    outstandingPrompts,
    archivePath: path.relative(ROOT, archivePath),
    manufacturerViolations,
  };

  const stateFile = saveState(state);
  console.log(`   • État persisté dans ${path.relative(ROOT, stateFile)}`);
  if (manufacturerViolations.length) {
    console.error('❌ Des manifestes contiennent encore plusieurs manufacturerName. Voir manufacturerViolations dans audit_state.json.');
    process.exitCode = 1;
  }
  console.log('✅ Phase 1 terminée – passer à Data_Enricher.js');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Échec de l\'audit initial :', error);
    process.exitCode = 1;
  }
}

module.exports = {
  main,
};
