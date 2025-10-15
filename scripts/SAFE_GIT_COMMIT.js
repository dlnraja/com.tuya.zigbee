#!/usr/bin/env node
'use strict';

/**
 * SAFE GIT COMMIT
 * Résout les problèmes de guillemets PowerShell avec git commit
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function safeGitCommit(message, additionalLines = []) {
  try {
    console.log('🔧 Safe Git Commit...\n');
    
    // Construire la commande avec échappement correct
    let cmd = `git commit -m "${message}"`;
    
    // Ajouter lignes additionnelles
    for (const line of additionalLines) {
      cmd += ` -m "${line}"`;
    }
    
    console.log('📝 Executing:', cmd.substring(0, 100) + '...\n');
    
    // Exécuter
    const output = execSync(cmd, { 
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(output);
    console.log('✅ Commit réussi!\n');
    
    // Push
    console.log('📤 Pushing to origin/master...\n');
    const pushOutput = execSync('git push origin master', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(pushOutput);
    console.log('✅ Push réussi!\n');
    
    return true;
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    if (err.stdout) console.log('Output:', err.stdout);
    if (err.stderr) console.error('Error:', err.stderr);
    return false;
  }
}

// Utilisation directe
if (require.main === module) {
  const message = process.argv[2] || 'chore: Update project files';
  const additionalLines = process.argv.slice(3);
  
  safeGitCommit(message, additionalLines);
}

module.exports = safeGitCommit;
