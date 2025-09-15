#!/usr/bin/env node

// tools/reorganize-root.js
// Réorganisation des fichiers à la racine du projet (dry-run par défaut)

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOG_FILE = path.join(PROJECT_ROOT, 'file-organization.log');

function log(message) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function moveFile(src, dest, apply) {
  ensureDir(path.dirname(dest));
  if (apply) {
    fs.renameSync(src, dest);
    log(`MOVE: ${path.relative(PROJECT_ROOT, src)} -> ${path.relative(PROJECT_ROOT, dest)}`);
  } else {
    log(`DRY:  ${path.relative(PROJECT_ROOT, src)} -> ${path.relative(PROJECT_ROOT, dest)}`);
  }
}

function isHomeyCriticalRoot(name) {
  const critical = new Set([
    'app.json', 'app.js', 'package.json', 'tsconfig.json', 'jest.config.js', 'nodemon.json',
    '.gitignore', '.homeyignore', '.env',
  ]);
  return critical.has(name);
}

function isHomeyCriticalDir(name) {
  const criticalDirs = new Set([
    'drivers', '.homeycompose', 'assets', 'lib', 'tools', 'scripts', 'docs', 'tests', 'types', 'schemas', '.github',
  ]);
  return criticalDirs.has(name);
}

function planMoves(apply = false) {
  const rootItems = fs.readdirSync(PROJECT_ROOT, { withFileTypes: true });
  const moves = [];

  for (const dirent of rootItems) {
    const name = dirent.name;
    const full = path.join(PROJECT_ROOT, name);

    if (dirent.isDirectory()) {
      if (isHomeyCriticalDir(name) || name.startsWith('.')) continue;
      // Pas de déplacement de dossiers par défaut, on log seulement
      log(`KEEP-DIR: ${name}`);
      continue;
    }

    // Fichiers à conserver à la racine
    if (isHomeyCriticalRoot(name) || name.toLowerCase() === 'readme.md' || name.toLowerCase() === 'changelog.md') {
      log(`KEEP: ${name}`);
      continue;
    }

    const ext = path.extname(name).toLowerCase();
    let target;

    // Règles spécifiques par nom/finalité avant le switch par extension
    if (!target) {
      // Fichier CODEOWNERS à déplacer dans .github/
      if (name === 'CODEOWNERS') {
        target = path.join(PROJECT_ROOT, '.github', name);
      }

      // Artéfacts TypeScript
      // .d.ts.map doit être détecté avant .d.ts
      if (!target && name.endsWith('.d.ts.map')) {
        target = path.join(PROJECT_ROOT, 'types', name);
      }
      if (!target && name.endsWith('.d.ts')) {
        target = path.join(PROJECT_ROOT, 'types', name);
      }

      // Fichier de cache/trace TypeScript
      if (!target && name === 'tsconfig.tsbuildinfo') {
        target = path.join(PROJECT_ROOT, 'temp', name);
      }

      // Scripts PowerShell
      if (!target && name.toLowerCase().endsWith('.ps1')) {
        target = path.join(PROJECT_ROOT, 'scripts', 'windows', name);
      }
    }

    switch (ext) {
      case '.md':
        target = path.join(PROJECT_ROOT, 'docs', name);
        break;
      case '.txt':
        target = path.join(PROJECT_ROOT, 'reports', name);
        break;
      case '.cmd':
      case '.bat':
        target = path.join(PROJECT_ROOT, 'scripts', 'windows', name);
        break;
      case '.sh':
        target = path.join(PROJECT_ROOT, 'scripts', 'unix', name);
        break;
      case '.py':
        target = path.join(PROJECT_ROOT, 'tools', 'python', name);
        break;
      case '.log':
        target = path.join(PROJECT_ROOT, 'logs', name);
        break;
      case '.csv':
        target = path.join(PROJECT_ROOT, 'data', 'exports', name);
        break;
      default:
        // Si aucune règle spécifique n'a déjà catégorisé le fichier, laisser tel quel
        if (!target) {
          log(`SKIP: ${name}`);
          continue;
        }
    }

    moves.push({ src: full, dest: target });
  }

  for (const m of moves) moveFile(m.src, m.dest, apply);
  log(`Résumé: ${moves.length} fichier(s) ${apply ? 'déplacé(s)' : 'prévu(s)'}\n`);
}

function main() {
  const apply = process.argv.includes('--apply');
  const dry = process.argv.includes('--dry-run') || !apply;

  log(`Reorganization started. mode=${apply ? 'APPLY' : 'DRY-RUN'}`);
  planMoves(apply && !dry);
  log('Reorganization finished.');
}

if (require.main === module) {
  try { main(); } catch (e) { log(`ERROR: ${e.message}`); process.exit(1); }
}
