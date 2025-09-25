#!/usr/bin/env node

// tools/validate-json.js
// Valide tous les fichiers JSON du projet. Option --fix pour tenter une réparation automatique.

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');
const REPORT_PATH = path.join(REPORTS_DIR, 'json-validation.json');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

const IGNORES = new Set(['.git', 'node_modules', 'dist', 'final-release', 'releases']);

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORES.has(e.name)) continue;
      walk(full, cb);
    } else {
      cb(full);
    }
  }
}

function repairJson(content) {
  return content
    .replace(/\uFEFF/g, '') // remove BOM
    .replace(/,\s*([}\]])/g, '$1') // trailing commas
    .replace(/(['"])\s*:\s*(['"]?)([^'"]*?)\2(?=\s*[,}])/g, '"$3": "$3"') // naive
    .replace(/([{,]\s*)([A-Za-z0-9_\-]+)\s*:/g, '$1"$2":') // quote keys
    .replace(/'([^']*)'/g, '"$1"'); // single to double quotes
}

function main() {
  const args = process.argv.slice(2);
  const FIX = args.includes('--fix');

  ensureDir(REPORTS_DIR);
  const report = { start: new Date().toISOString(), ok: [], fixed: [], failed: [], errors: 0 };

  walk(PROJECT_ROOT, (file) => {
    if (!file.endsWith('.json')) return;
    try {
      const raw = fs.readFileSync(file, 'utf8');
      try {
        JSON.parse(raw);
        report.ok.push(path.relative(PROJECT_ROOT, file));
      } catch (e) {
        // try repair
        const repaired = repairJson(raw);
        try {
          const parsed = JSON.parse(repaired);
          if (FIX) {
            fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
          }
          report.fixed.push(path.relative(PROJECT_ROOT, file));
        } catch (e2) {
          report.failed.push({ file: path.relative(PROJECT_ROOT, file), error: e2.message });
          report.errors++;
        }
      }
    } catch (e) {
      report.failed.push({ file: path.relative(PROJECT_ROOT, file), error: e.message });
      report.errors++;
    }
  });

  report.end = new Date().toISOString();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`JSON validation report written to ${REPORT_PATH}`);
  if (report.errors > 0) {
    console.error(`Validation finished with ${report.errors} error(s).`);
    process.exit(1);
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('Fatal error:', e); process.exit(1); }
}
