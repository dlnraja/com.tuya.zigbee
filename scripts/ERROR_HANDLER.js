#!/usr/bin/env node
/**
 * ERROR_HANDLER.js - Analyse des échecs et TODO
 * Partie du Script Ultime V25
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 ERROR_HANDLER - Analyse échecs et TODO');

const results = {
  errors: [],
  todos: [],
  gitFailures: []
};

// 1. Analyser logs Git (erreurs, rejets push)
try {
  const gitLog = execSync('git log --all --grep="error\\|fix\\|fail\\|reject" -50 --format="%h|%s|%ad"', 
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  gitLog.split('\n').filter(Boolean).forEach(line => {
    const [hash, msg, date] = line.split('|');
    if (msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('fail')) {
      results.gitFailures.push({ hash, msg, date });
    }
    results.errors.push({ type: 'git', hash, msg, date });
  });
} catch (e) {
  results.errors.push({ type: 'git_command', error: e.message });
}

// 2. Scanner TODO/FIXME dans code
function scanTodos(dir, exclude = ['.git', 'node_modules', 'backup', '.homeybuild']) {
  try {
    fs.readdirSync(dir).forEach(file => {
      if (exclude.includes(file)) return;
      const fullPath = `${dir}/${file}`;
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          scanTodos(fullPath, exclude);
        } else if (file.match(/\.(js|json|md)$/)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          content.split('\n').forEach((line, idx) => {
            if (line.match(/TODO|FIXME|XXX|HACK/i)) {
              results.todos.push({ 
                file: fullPath, 
                line: idx + 1, 
                text: line.trim().substring(0, 100) 
              });
            }
          });
        }
      } catch (e) {}
    });
  } catch (e) {}
}

scanTodos('.');

// 3. Analyser erreurs validation Homey passées
try {
  const recent = execSync('git log --all --grep="validate\\|publish" -20 --format="%B"', 
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  const errors = recent.match(/×.+/g) || [];
  errors.forEach(err => {
    results.errors.push({ type: 'homey_validation', error: err.trim() });
  });
} catch (e) {}

// Sauvegarder résultats
if (!fs.existsSync('references')) fs.mkdirSync('references', { recursive: true });
fs.writeFileSync('references/error_analysis.json', JSON.stringify(results, null, 2));

console.log(`✅ ${results.errors.length} erreurs analysées`);
console.log(`✅ ${results.todos.length} TODO trouvés`);
console.log(`✅ ${results.gitFailures.length} échecs Git détectés`);
console.log('📁 Résultats: references/error_analysis.json');
