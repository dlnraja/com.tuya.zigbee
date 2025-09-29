#!/usr/bin/env node
/*
 * Create an integration report (cross-platform)
 * Mirrors scripts/create-report.bat with safe Node.js implementation
 */
const fs = require('fs');
const path = require('path');

function listDirs(root) {
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'node_modules')
      .map(d => d.name);
  } catch (e) { return []; }
}

function listFiles(root) {
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter(d => d.isFile())
      .map(d => d.name)
      .filter(n => !n.startsWith('.'));
  } catch (e) { return []; }
}

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

(function main() {
  const cwd = process.cwd();
  const reportPath = path.join(cwd, 'integration-report.txt');
  const lines = [];

  lines.push('===== RAPPORT D\'INTÉGRATION =====');
  lines.push(`Date: ${new Date().toLocaleString()}`);
  lines.push('');
  
  // Structure
  lines.push('=== STRUCTURE DU PROJET ===');
  lines.push('');
  lines.push('Dossiers racine:');
  for (const d of listDirs(cwd)) lines.push(d);
  lines.push('');
  lines.push('Fichiers racine:');
  for (const f of listFiles(cwd)) lines.push(f);
  lines.push('');

  // Drivers
  lines.push('=== DRIVERS ===');
  const driversDir = path.join(cwd, 'drivers');
  let count = 0;
  if (fs.existsSync(driversDir)) {
    const driverDirs = listDirs(driversDir);
    for (const d of driverDirs) {
      count++;
      lines.push(`[${d}]`);
      const composePath = path.join(driversDir, d, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        lines.push('- Configuration: OUI');
        const json = readJsonSafe(composePath);
        if (json) {
          if (json.name) lines.push(`name: ${JSON.stringify(json.name)}`);
          if (json.class) lines.push(`class: ${JSON.stringify(json.class)}`);
        }
      } else {
        lines.push('- Configuration: NON');
      }
      lines.push('');
    }
  }

  // Summary
  lines.push('');
  lines.push('=== RÉSUMÉ ===');
  lines.push(`Nombre total de drivers: ${count}`);
  lines.push('');
  lines.push('===== FIN DU RAPPORT =====');

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`Rapport généré avec succès: ${reportPath}`);
})();
