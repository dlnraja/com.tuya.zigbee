#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const LITE_ROOT = path.join(ROOT, 'tuya-light');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  // Créer le répertoire racine de la version lite
  if (fs.existsSync(LITE_ROOT)) {
    fs.rmSync(LITE_ROOT, { recursive: true, force: true });
  }
  fs.mkdirSync(LITE_ROOT, { recursive: true });

  // Copier les répertoires nécessaires
  const dirsToCopy = [
    'drivers',
    'assets',
    'docs',
    '.github',
    'schemas'
  ];

  // Copier les fichiers nécessaires
  const filesToCopy = [
    'README.md',
    'device-matrix.md',
    'LICENSE',
    'CHANGELOG.md',
    'app.js',
    'app.json'
  ];

  // Copier les répertoires
  for (const dir of dirsToCopy) {
    const src = path.join(ROOT, dir);
    if (fs.existsSync(src)) {
      copyDir(src, path.join(LITE_ROOT, dir));
    }
  }

  // Copier les fichiers
  for (const file of filesToCopy) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(LITE_ROOT, file));
    }
  }

  console.log('Lite version built at: ' + LITE_ROOT);
}

main();
