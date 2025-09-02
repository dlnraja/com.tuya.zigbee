#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Configuration
const phasesConfig = {
  0: { steps: 10, script: 'phase0.js' },
  1: { steps: 20, script: 'phase1.js' },
  // ... autres phases
};

const runPhase = (phaseNumber) => {
  console.log(chalk.blue(`Démarrage de la phase ${phaseNumber}`));
  
  // Exécuter le script spécifique à la phase
  const phaseScript = path.join(__dirname, `phase${phaseNumber}.js`);
  if (fs.existsSync(phaseScript)) {
    execSync(`node ${phaseScript}`, { stdio: 'inherit' });
  } else {
    console.log(chalk.yellow(`Aucun script trouvé pour la phase ${phaseNumber}`));
  }
};

// Vérifier les arguments
const phase = process.argv[2];
if (!phase || isNaN(phase)) {
  console.error(chalk.red('Usage: node run_phase.js <phase_number>'));
  process.exit(1);
}

runPhase(parseInt(phase));
