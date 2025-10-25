#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * RENAME WALL TOUCH FLOW CARDS
 * Enlève le suffixe _hybrid des noms de fichiers et des filter driver_id
 */

const FLOW_BASE = path.join(__dirname, '..', '.homeycompose', 'flow');
const FLOW_TYPES = ['actions', 'triggers', 'conditions'];

console.log('🔧 RENAMING WALL TOUCH FLOW CARDS (removing _hybrid)\n');

let renamed = 0;
let updated = 0;

FLOW_TYPES.forEach(flowType => {
  const flowDir = path.join(FLOW_BASE, flowType);
  if (!fs.existsSync(flowDir)) return;

  const files = fs.readdirSync(flowDir).filter(f => 
    f.includes('wall_touch') && f.includes('_hybrid') && f.endsWith('.json')
  );

  files.forEach(file => {
    const oldPath = path.join(flowDir, file);
    const newFileName = file.replace(/_hybrid/g, '');
    const newPath = path.join(flowDir, newFileName);

    // Lire le contenu
    let content = fs.readFileSync(oldPath, 'utf8');
    let json = JSON.parse(content);

    // Mettre à jour les filter driver_id
    let changed = false;
    if (json.args) {
      json.args.forEach(arg => {
        if (arg.filter && arg.filter.includes('wall_touch') && arg.filter.includes('_hybrid')) {
          arg.filter = arg.filter.replace(/_hybrid/g, '');
          changed = true;
        }
      });
    }

    // Écrire le nouveau fichier
    if (changed) {
      fs.writeFileSync(newPath, JSON.stringify(json, null, 2));
      updated++;
    } else {
      fs.renameSync(oldPath, newPath);
    }

    // Supprimer l'ancien si différent
    if (oldPath !== newPath && fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }

    console.log(`  ✅ ${file} -> ${newFileName}`);
    renamed++;
  });
});

console.log(`\n📊 Renamed ${renamed} files, updated ${updated} driver filters\n`);
