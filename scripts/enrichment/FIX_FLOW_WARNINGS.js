#!/usr/bin/env node
'use strict';

/**
 * FIX FLOW WARNINGS
 * Corrige les avertissements de validation des flows
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');

console.log('🔧 Correction des avertissements flow...\n');

// Lire app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

let fixed = 0;

// Corriger les flows conditions
if (appJson.flow && appJson.flow.conditions) {
  for (const condition of appJson.flow.conditions) {
    // Ajouter titleFormatted si manquant et qu'il y a des args
    if (!condition.titleFormatted && condition.args && condition.args.length > 0) {
      // Générer titleFormatted depuis title et args
      const title = condition.title.en || condition.title;
      const argNames = condition.args.map(arg => `[[${arg.name}]]`).join(' ');
      condition.titleFormatted = {
        en: `${title} ${argNames}`
      };
      console.log(`✅ Ajouté titleFormatted pour: ${condition.id}`);
      fixed++;
    }
  }
}

// Corriger les flows triggers
if (appJson.flow && appJson.flow.triggers) {
  for (const trigger of appJson.flow.triggers) {
    if (!trigger.titleFormatted && trigger.args && trigger.args.length > 0) {
      const title = trigger.title.en || trigger.title;
      const argNames = trigger.args.map(arg => `[[${arg.name}]]`).join(' ');
      trigger.titleFormatted = {
        en: `${title} ${argNames}`
      };
      console.log(`✅ Ajouté titleFormatted pour: ${trigger.id}`);
      fixed++;
    }
  }
}

// Corriger les flows actions
if (appJson.flow && appJson.flow.actions) {
  for (const action of appJson.flow.actions) {
    if (!action.titleFormatted && action.args && action.args.length > 0) {
      const title = action.title.en || action.title;
      const argNames = action.args.map(arg => `[[${arg.name}]]`).join(' ');
      action.titleFormatted = {
        en: `${title} ${argNames}`
      };
      console.log(`✅ Ajouté titleFormatted pour: ${action.id}`);
      fixed++;
    }
  }
}

// Sauvegarder
if (fixed > 0) {
  fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2) + '\n');
  console.log(`\n✅ ${fixed} flows corrigés`);
} else {
  console.log('\n✅ Aucune correction nécessaire');
}

console.log('✅ Terminé');
