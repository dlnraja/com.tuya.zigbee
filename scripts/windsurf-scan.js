#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const AGENTS = [
  { name: 'SCOUT', file: 'scout.js' },
  { name: 'ARCHITECT', file: 'architect.js' },
  { name: 'LOCALIZER', file: 'localizer.js' },
  { name: 'OPTIMIZER', file: 'optimizer.js' },
  { name: 'VALIDATOR', file: 'validator.js' }
];

async function runAgent(agent) {
  return new Promise((resolve) => {
    console.log(`\n${chalk.blue.bold(`🚀 ${agent.name}`)} - Exécution...`);
    const startTime = Date.now();
    
    const child = spawn('node', [path.join(__dirname, agent.file)], {
      stdio: 'inherit',
      cwd: ROOT,
      shell: true
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      if (code === 0) {
        console.log(chalk.green(`✅ ${agent.name} terminé en ${duration}s`));
      } else {
        console.error(chalk.red(`❌ ${agent.name} échoué (code ${code})`));
      }
      resolve();
    });
  });
}

async function main() {
  console.log(chalk.cyan.bold('\n🔍 Démarrage du scan multi-IA pour Tuya Zigbee\n'));
  
  try {
    for (const agent of AGENTS) {
      await runAgent(agent);
    }
    
    console.log(chalk.green.bold('\n✅ Analyse terminée avec succès !'));
    console.log(chalk.cyan('💡 Utilisez `git status` pour voir les modifications.\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ Erreur lors de l\'exécution du scan:'), error);
    process.exit(1);
  }
}

main().catch(console.error);
