#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  scriptsDir: __dirname,
  outputDir: path.join(__dirname, '../docs/generated'),
  reportsDir: path.join(__dirname, '../reports')
};

// Couleurs pour la sortie console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

// Fonction pour exécuter une commande
function runCommand(command, cwd = CONFIG.rootDir) {
  console.log(`${colors.cyan}${colors.bright}▶${colors.reset} ${colors.dim}${command}${colors.reset}`);
  try {
    const output = execSync(command, { cwd, stdio: 'inherit' });
    return { success: true, output };
  } catch (error) {
    console.error(`${colors.red}${colors.bright}✖ Erreur lors de l'exécution: ${command}${colors.reset}`);
    return { success: false, error };
  }
}

// Vérifier les dépendances
function checkDependencies() {
  console.log(`${colors.blue}${colors.bright}🔍 Vérification des dépendances...${colors.reset}`);
  
  const requiredDeps = ['canvas', 'fs-extra'];
  const missingDeps = [];
  
  requiredDeps.forEach(dep => {
    try {
      require.resolve(dep);
      console.log(`  ${colors.green}✓${colors.reset} ${dep}`);
    } catch (e) {
      missingDeps.push(dep);
      console.log(`  ${colors.red}✖${colors.reset} ${dep} (manquant)`);
    }
  });
  
  if (missingDeps.length > 0) {
    console.log(`\n${colors.yellow}Installation des dépendances manquantes...${colors.reset}`);
    const installCmd = `npm install --save-dev ${missingDeps.join(' ')}`;
    const { success } = runCommand(installCmd);
    if (!success) {
      console.error(`${colors.red}Impossible d'installer les dépendances manquantes.${colors.reset}`);
      process.exit(1);
    }
  }
}

// Exécuter les scripts d'analyse
async function runAnalysis() {
  console.log(`\n${colors.blue}${colors.bright}🔍 Analyse du projet...${colors.reset}`);
  
  // Créer les répertoires nécessaires
  [CONFIG.outputDir, CONFIG.reportsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Exécuter le script d'analyse des drivers
  const { success } = runCommand(`node ${path.join(CONFIG.scriptsDir, 'auto-documenter.js')}`);
  
  if (!success) {
    console.error(`${colors.red}L'analyse a échoué.${colors.reset}`);
    process.exit(1);
  }
  
  // Copier le rapport vers le dossier des rapports avec horodatage
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportSource = path.join(CONFIG.outputDir, 'report.json');
  const reportDest = path.join(CONFIG.reportsDir, `report-${timestamp}.json`);
  
  if (fs.existsSync(reportSource)) {
    fs.copyFileSync(reportSource, reportDest);
    console.log(`\n${colors.green}✓ Rapport sauvegardé: ${reportDest}${colors.reset}`);
  }
}

// Vérifier les mises à jour Git
function checkGitStatus() {
  console.log(`\n${colors.blue}${colors.bright}🔍 Vérification du statut Git...${colors.reset}`);
  
  try {
    // Vérifier si c'est un dépôt Git
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    
    // Vérifier les modifications non commitées
    const status = execSync('git status --porcelain').toString().trim();
    if (status) {
      console.log(`${colors.yellow}⚠️  Des modifications non commitées ont été détectées:${colors.reset}`);
      console.log(status);
      
      // Demander à l'utilisateur s'il souhaite commiter les modifications
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('\nVoulez-vous commiter ces modifications ? (o/N) ', async (answer) => {
        readline.close();
        
        if (answer.toLowerCase() === 'o') {
          const commitMessage = 'Mise à jour automatique des drivers et de la documentation';
          runCommand('git add .');
          runCommand(`git commit -m "${commitMessage}"`);
          
          // Demander si l'utilisateur souhaite pousser les modifications
          const pushAnswer = await new Promise(resolve => {
            const rl = require('readline').createInterface({
              input: process.stdin,
              output: process.stdout
            });
            rl.question('Voulez-vous pousser les modifications vers le dépôt distant ? (o/N) ', (ans) => {
              rl.close();
              resolve(ans);
            });
          });
          
          if (pushAnswer.toLowerCase() === 'o') {
            runCommand('git push');
          }
        }
        
        process.exit(0);
      });
    } else {
      console.log(`${colors.green}✓ Aucune modification non commitée.${colors.reset}`);
      process.exit(0);
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Ce n'est pas un dépôt Git.${colors.reset}`);
    process.exit(0);
  }
}

// Fonction principale
async function main() {
  console.log(`\n${colors.blue}${colors.bright}🚀 Intégration du projet Tuya Zigbee${colors.reset}`);
  console.log(`${colors.dim}========================================${colors.reset}\n`);
  
  // Vérifier les dépendances
  checkDependencies();
  
  // Exécuter l'analyse
  await runAnalysis();
  
  // Vérifier le statut Git
  checkGitStatus();
}

// Démarrer le processus
main().catch(error => {
  console.error(`${colors.red}${colors.bright}❌ Erreur:${colors.reset}`, error);
  process.exit(1);
});
