#!/usr/bin/env node

console.log('🧪 TEST SIMPLE - Node.js fonctionne !');
console.log('📁 Dossier actuel:', process.cwd());
console.log('📦 Version Node:', process.version);

// Test simple de fs
import fs from 'fs';
import path from 'path';

try {
  const files = fs.readdirSync('.');
  console.log('📁 Fichiers dans le dossier racine:', files.length);
  console.log('✅ Test réussi !');
} catch (error) {
  console.error('❌ Erreur:', error.message);
}
