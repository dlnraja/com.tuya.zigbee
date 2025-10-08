#!/usr/bin/env node
/**
 * FORCE PUBLISH - Publication automatique forcée
 * Utilise stdin pour répondre automatiquement aux prompts
 */

const { spawn } = require('child_process');
const path = require('path');

const rootPath = path.resolve(__dirname, '..', '..');

console.log('🚀 FORCE PUBLISH - Publication Automatique Forcée');
console.log('='.repeat(80));
console.log(`📂 Working directory: ${rootPath}\n`);

// Réponses automatiques pour homey app publish
const responses = [
  'y',      // Uncommitted changes? Yes
  'y',      // Update version? Yes
  '',       // Version type? (Enter for patch)
  'Fix: Settings infinite loop + homey-zigbeedriver dependency + 28 flow cards',  // Changelog
  'y',      // Commit? Yes
  'y'       // Push? Yes
];

let responseIndex = 0;

const publish = spawn('homey', ['app', 'publish'], {
  cwd: rootPath,
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true,
  env: { ...process.env }
});

// Auto-réponse avec timeout
const sendResponse = () => {
  if (responseIndex < responses.length) {
    const response = responses[responseIndex];
    console.log(`\n🤖 Auto-réponse #${responseIndex + 1}: "${response || '[Enter]'}"`);
    publish.stdin.write(response + '\n');
    responseIndex++;
    
    // Prochaine réponse après 1 seconde
    setTimeout(sendResponse, 1000);
  } else {
    publish.stdin.end();
  }
};

// Démarrer les réponses automatiques après 2 secondes
setTimeout(sendResponse, 2000);

publish.on('close', (code) => {
  console.log('\n' + '='.repeat(80));
  if (code === 0) {
    console.log('✅ PUBLICATION RÉUSSIE !');
    console.log('🔗 Vérifier sur: https://tools.developer.homey.app/apps');
    process.exit(0);
  } else {
    console.log('❌ PUBLICATION ÉCHOUÉE');
    console.log(`Code sortie: ${code}`);
    process.exit(1);
  }
});

publish.on('error', (err) => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
