#!/usr/bin/env node
/*
 * Diagnostic utility (cross-platform)
 * Mirrors scripts/diagnostic.bat behavior with richer details
 */
const os = require('os');
const { execSync } = require('child_process');

function exec(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  } catch (e) {
    return null;
  }
}

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

(function main() {
  console.log('=== Diagnostic du système ===');
  console.log(`Date: ${new Date().toLocaleString()}`);

  // 1/4 Informations système
  logSection('Informations système');
  console.log(`OS: ${os.type()} ${os.release()} (${os.platform()} ${os.arch()})`);
  const cpus = os.cpus();
  console.log(`Processeurs: ${cpus ? cpus.length : 'n/a'}`);
  console.log(`Mémoire totale: ${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB`);
  console.log(`Mémoire libre: ${(os.freemem() / (1024 ** 3)).toFixed(2)} GB`);

  // 2/4 Variables d'environnement
  logSection("Variables d'environnement");
  console.log(`PATH=${process.env.PATH || process.env.Path || ''}`);

  // 3/4 Vérification de Node.js
  logSection('Vérification de Node.js');
  const nodePath = exec(process.platform === 'win32' ? 'where node' : 'which node');
  if (nodePath) {
    console.log('✅ Node.js est installé');
    console.log(`Version: ${exec('node -v') || 'inconnue'}`);
  } else {
    console.log("❌ Node.js n'est pas installé ou n'est pas dans le PATH");
  }

  // 4/4 Vérification de npm
  logSection('Vérification de npm');
  const npmPath = exec(process.platform === 'win32' ? 'where npm' : 'which npm');
  if (npmPath) {
    console.log('✅ npm est installé');
    console.log(`Version: ${exec('npm -v') || 'inconnue'}`);
  } else {
    console.log("❌ npm n'est pas installé ou n'est pas dans le PATH");
  }

  console.log('\n=== Fin du diagnostic ===');
})();
