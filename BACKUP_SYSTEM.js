#!/usr/bin/env node
/**
 * BACKUP_SYSTEM.js - Backup sécurisé Git
 * Partie du Script Ultime V25
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('💾 BACKUP_SYSTEM - Backup sécurisé');

if (!fs.existsSync('backup')) fs.mkdirSync('backup', { recursive: true });

try {
  // Toutes branches
  const branches = execSync('git branch -a', { encoding: 'utf8' })
    .split('\n')
    .map(b => b.trim().replace(/^\*\s*/, '').replace('remotes/origin/', ''))
    .filter(b => b && !b.includes('HEAD'));
  
  console.log(`📦 ${branches.length} branches détectées`);
  
  // History complète
  const history = execSync('git log --all --format="%H|%an|%ad|%s" --date=short', 
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  
  // Sécuriser (retirer données sensibles)
  const sanitized = history
    .replace(/token[=:]\s*[a-zA-Z0-9_-]+/gi, 'token=***')
    .replace(/password[=:]\s*\S+/gi, 'password=***')
    .replace(/key[=:]\s*[a-zA-Z0-9_-]+/gi, 'key=***')
    .replace(/secret[=:]\s*\S+/gi, 'secret=***');
  
  fs.writeFileSync('backup/git_history_all_branches.txt', sanitized);
  
  // Backup branch actuelle
  const current = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  fs.writeFileSync('backup/current_branch.txt', current);
  
  console.log(`✅ History sauvegardée (${branches.length} branches)`);
  console.log(`✅ Branch actuelle: ${current}`);
  console.log('🔒 Données sensibles masquées');
} catch (e) {
  console.log(`⚠️ Erreur backup: ${e.message}`);
}

console.log('📁 Backup: backup/');
