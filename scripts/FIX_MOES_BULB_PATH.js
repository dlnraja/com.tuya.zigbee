#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const APP_JSON = path.join(__dirname, '..', 'app.json');

console.log('🔧 Correction du chemin moes_bulb_tunable_ac\n');

let content = fs.readFileSync(APP_JSON, 'utf8');
const before = content;

// Remplacer toutes les occurrences
content = String(content).replace(/drivers\/moes_bulb_tunable_ac\//g, 'drivers/avatto_bulb_tunable_ac/');

if (content !== before) {
  fs.writeFileSync(APP_JSON, content);
  console.log('✅ Chemins corrigés avec succès\n');
} else {
  console.log('ℹ️  Aucune correction nécessaire\n');
}
