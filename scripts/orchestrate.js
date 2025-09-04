#!/usr/bin/env node
import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

// Configuration
const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REPORTS_DIR = path.join(ROOT, 'reports');
const REPORT_FILE = path.join(REPORTS_DIR, 'integration-report.md');

// ------------------------------------------------------------------
// Utilitaires
// ------------------------------------------------------------------
function run(cmd) {
  console.log(chalk.gray('▶'), cmd);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT });
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de l'exécution: ${cmd}`));
    console.error(chalk.red(error.message));
    return false;
  }
}

async function loadJSON(filePath) {
  try {
    return await fs.readJson(filePath);
  } catch (error) {
    console.error(chalk.red(`❌ Erreur de lecture du fichier JSON: ${filePath}`));
    throw error;
  }
}

async function saveJSON(filePath, data) {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJson(filePath, data, { spaces: 2 });
    console.log(chalk.green(`✅ Fichier sauvegardé: ${filePath}`));
  } catch (error) {
    console.error(chalk.red(`❌ Erreur d'écriture du fichier: ${filePath}`));
    throw error;
  }
}

// ------------------------------------------------------------------
// 1. Scan des drivers existants
// ------------------------------------------------------------------
async function scanDrivers() {
  console.log(chalk.blue('🔍 Scan des drivers...'));
  
  const drivers = [];
  const driverDirs = await fs.readdir(DRIVERS_DIR, { withFileTypes: true });
  
  for (const dirent of driverDirs) {
    if (!dirent.isDirectory()) continue;
    
    const driverPath = path.join(DRIVERS_DIR, dirent.name);
    const configPath = path.join(driverPath, 'driver.compose.json');
    
    const driver = {
      id: dirent.name,
      path: driverPath,
      hasConfig: false,
      hasDevice: false,
      hasIcons: false,
      issues: [],
      metadata: {}
    };
    
    // Vérifier le fichier de configuration
    if (await fs.pathExists(configPath)) {
      try {
        driver.metadata = await loadJSON(configPath);
        driver.hasConfig = true;
        
        // Vérifier les champs obligatoires
        const requiredFields = ['id', 'class', 'name'];
        for (const field of requiredFields) {
          if (!driver.metadata[field]) {
            driver.issues.push(`Champ manquant: ${field}`);
          }
        }
      } catch (error) {
        driver.issues.push(`Erreur de configuration: ${error.message}`);
      }
    } else {
      driver.issues.push('Fichier de configuration manquant');
    }
    
    // Vérifier le fichier device.js
    const devicePath = path.join(driverPath, 'device.js');
    if (await fs.pathExists(devicePath)) {
      driver.hasDevice = true;
    } else {
      driver.issues.push('Fichier device.js manquant');
    }
    
    // Vérifier les icônes
    const iconSvg = path.join(driverPath, 'assets', 'icon.svg');
    const iconPng = path.join(driverPath, 'assets', 'images', 'large.png');
    
    if (await fs.pathExists(iconSvg) && await fs.pathExists(iconPng)) {
      driver.hasIcons = true;
    } else {
      driver.issues.push('Icônes manquantes');
    }
    
    drivers.push(driver);
  }
  
  return drivers;
}

// ------------------------------------------------------------------
// 2. Validation & mise à jour
// ------------------------------------------------------------------
async function validateAndUpdate() {
  console.log(chalk.blue('🔍 Validation en cours...'));
  const success = run('homey app validate --level debug');
  return success;
}

// ------------------------------------------------------------------
// 3. Traductions
// ------------------------------------------------------------------
async function translate() {
  console.log(chalk.blue('🌍 Traduction des textes...'));
  return run('npx homey translate --force');
}

// ------------------------------------------------------------------
// 4. Auto-commit & version
// ------------------------------------------------------------------
async function commitVersion() {
  try {
    const appPath = path.join(ROOT, 'app.json');
    const app = await loadJSON(appPath);
    
    // Incrémenter le numéro de version (patch)
    const [maj, min, patch] = app.version.split('.').map(Number);
    app.version = `${maj}.${min}.${patch + 1}`;
    
    // Sauvegarder le nouveau numéro de version
    await saveJSON(appPath, app);
    
    // Faire le commit
    const commitMessage = `autobot: update drivers v${app.version}`;
    run('git add .');
    run(`git commit -m "${commitMessage}"`);
    run('git push');
    
    console.log(chalk.green(`✅ Version ${app.version} commitée avec succès`));
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors du commit:'));
    console.error(error);
    return false;
  }
}

// ------------------------------------------------------------------
// 5. Génération du rapport
// ------------------------------------------------------------------
async function generateReport(drivers) {
  console.log(chalk.blue('📊 Génération du rapport...'));
  
  const now = new Date().toISOString();
  const validDrivers = drivers.filter(d => d.issues.length === 0);
  const invalidDrivers = drivers.filter(d => d.issues.length > 0);
  
  let report = `# Rapport d'Intégration Tuya Zigbee

**Généré le:** ${now}  
**Dépôt:** [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee)

## 📊 Résumé

`;
  
  // Statistiques
  report += `- **Total des drivers:** ${drivers.length}\n`;
  report += `- **Drivers valides:** ${validDrivers.length} (${Math.round((validDrivers.length / drivers.length) * 100 || 0)}%)\n`;
  report += `- **Drivers avec problèmes:** ${invalidDrivers.length}\n\n`;
  
  // Tableau des drivers
  report += '## 📋 Liste des Drivers\n\n';
  report += '| Nom | Statut | Problèmes |\n';
  report += '|-----|--------|-----------|\n';
  
  for (const driver of drivers) {
    const status = driver.issues.length === 0 ? '✅ Valide' : `❌ ${driver.issues.length} problème(s)`;
    const issues = driver.issues.length > 0 ? driver.issues.join('<br>') : 'Aucun';
    report += `| ${driver.id} | ${status} | ${issues} |\n`;
  }
  
  // Détails des problèmes
  if (invalidDrivers.length > 0) {
    report += '\n## ⚠️ Problèmes Détail\n\n';
    
    for (const driver of invalidDrivers) {
      report += `### ${driver.id}\n`;
      for (const issue of driver.issues) {
        report += `- ${issue}\n`;
      }
      report += '\n';
    }
  }
  
  // Recommandations
  report += '## 🚀 Recommandations\n\n';
  report += '1. **Corriger les problèmes critiques**\n';
  report += `   - ${invalidDrivers.length} drivers nécessitent une attention immédiate\n`;
  report += '   - Mettre à jour les configurations manquantes ou invalides\n\n';
  
  report += '2. **Gestion des icônes**\n';
  report += `   - ${drivers.filter(d => !d.hasIcons).length} drivers n'ont pas d'icônes\n`;
  report += '   - Standardiser le format des icônes (SVG + PNG)\n\n';
  
  report += '3. **Validation des drivers**\n';
  report += '   - Implémenter des tests automatisés\n';
  report += '   - Vérifier la compatibilité avec les appareils cibles\n\n';
  
  // Sauvegarder le rapport
  await fs.ensureDir(REPORTS_DIR);
  await fs.writeFile(REPORT_FILE, report, 'utf8');
  
  console.log(chalk.green(`✅ Rapport généré: ${REPORT_FILE}`));
  return REPORT_FILE;
}

// ------------------------------------------------------------------
// Fonction principale
// ------------------------------------------------------------------
async function main() {
  try {
    console.log(chalk.blue.bold('🚀 Orchestrateur Tuya Zigbee - Démarrage'));
    console.log(chalk.blue('='.repeat(60)));
    
    // 1. Scanner les drivers existants
    const drivers = await scanDrivers();
    
    // 2. Générer le rapport
    await generateReport(drivers);
    
    // 3. Valider l'application
    const isValid = await validateAndUpdate();
    
    if (!isValid) {
      console.log(chalk.yellow('⚠️ Des problèmes ont été détectés. Veuillez les corriger avant de continuer.'));
      return;
    }
    
    // 4. Traduire les textes
    await translate();
    
    // 5. Faire le commit et mettre à jour la version
    await commitVersion();
    
    console.log(chalk.green.bold('\n✅ Orchestration terminée avec succès !'));
    
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Erreur critique lors de l\'orchestration:'));
    console.error(chalk.red(error.stack || error.message));
    process.exit(1);
  }
}

// Démarrer l'orchestrateur
main();
