#!/usr/bin/env node

/**
 * Homey Build Script
 * Build manuel sans CLI Homey
 * 
 * @author Dylan Rajasekaram
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class HomeyBuilder {
  constructor() {
    this.buildDir = '.homeybuild';
    this.stats = {
      files_copied: 0,
      errors: 0,
      warnings: 0
    };
  }

  /**
   * Crée le dossier de build
   */
  createBuildDirectory() {
    try {
      if (fs.existsSync(this.buildDir)) {
        fs.rmSync(this.buildDir, { recursive: true, force: true });
      }
      fs.mkdirSync(this.buildDir, { recursive: true });
      console.log(chalk.green(`✅ Dossier de build créé: ${this.buildDir}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`❌ Erreur création dossier build: ${error.message}`));
      return false;
    }
  }

  /**
   * Copie les fichiers de base
   */
  copyBaseFiles() {
    const baseFiles = [
      'app.json',
      'package.json',
      'README.md',
      'LICENSE'
    ];

    baseFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const targetPath = path.join(this.buildDir, file);
        fs.copyFileSync(file, targetPath);
        this.stats.files_copied++;
        console.log(chalk.green(`✅ Fichier copié: ${file}`));
      } else {
        console.log(chalk.yellow(`⚠️  Fichier non trouvé: ${file}`));
      }
    });
  }

  /**
   * Copie les assets
   */
  copyAssets() {
    const assetsDir = path.join(this.buildDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });

    // Copie des assets principaux
    const mainAssets = [
      { source: 'assets/small.png', target: 'assets/small.png' },
      { source: 'assets/large.png', target: 'assets/large.png' },
      { source: 'assets/icon.png', target: 'assets/icon.png' }
    ];

    mainAssets.forEach(asset => {
      if (fs.existsSync(asset.source)) {
        const targetPath = path.join(this.buildDir, asset.target);
        fs.copyFileSync(asset.source, targetPath);
        this.stats.files_copied++;
        console.log(chalk.green(`✅ Asset copié: ${asset.source}`));
      } else {
        console.log(chalk.red(`❌ Asset manquant: ${asset.source}`));
        this.stats.errors++;
      }
    });
  }

  /**
   * Copie les drivers
   */
  copyDrivers() {
    const driversDir = path.join(this.buildDir, 'drivers');
    fs.mkdirSync(driversDir, { recursive: true });

    const sourceDriversDir = 'drivers';
    if (!fs.existsSync(sourceDriversDir)) {
      console.log(chalk.red('❌ Dossier drivers source non trouvé'));
      this.stats.errors++;
      return;
    }

    const driverDirs = fs.readdirSync(sourceDriversDir)
      .filter(item => fs.statSync(path.join(sourceDriversDir, item)).isDirectory());

    console.log(chalk.blue(`📁 Copie de ${driverDirs.length} drivers...`));

    driverDirs.forEach(driverDir => {
      const sourcePath = path.join(sourceDriversDir, driverDir);
      const targetPath = path.join(driversDir, driverDir);
      
      try {
        // Copie récursive du driver
        this.copyDirectoryRecursive(sourcePath, targetPath);
        this.stats.files_copied++;
        console.log(chalk.green(`✅ Driver copié: ${driverDir}`));
      } catch (error) {
        console.log(chalk.red(`❌ Erreur copie driver ${driverDir}: ${error.message}`));
        this.stats.errors++;
      }
    });
  }

  /**
   * Copie récursive d'un dossier
   */
  copyDirectoryRecursive(source, target) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const items = fs.readdirSync(source);
    items.forEach(item => {
      const sourcePath = path.join(source, item);
      const targetPath = path.join(target, item);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        this.copyDirectoryRecursive(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    });
  }

  /**
   * Copie la configuration HomeyCompose
   */
  copyHomeyCompose() {
    const homeyComposeDir = path.join(this.buildDir, '.homeycompose');
    fs.mkdirSync(homeyComposeDir, { recursive: true });

    const sourceComposeDir = '.homeycompose';
    if (fs.existsSync(sourceComposeDir)) {
      try {
        this.copyDirectoryRecursive(sourceComposeDir, homeyComposeDir);
        console.log(chalk.green('✅ Configuration HomeyCompose copiée'));
      } catch (error) {
        console.log(chalk.red(`❌ Erreur copie HomeyCompose: ${error.message}`));
        this.stats.errors++;
      }
    }
  }

  /**
   * Génère le rapport de build
   */
  generateBuildReport() {
    console.log(chalk.green('\n📊 RAPPORT DE BUILD HOMEY'));
    console.log(chalk.green('============================'));
    console.log(chalk.blue(`Fichiers copiés: ${this.stats.files_copied}`));
    console.log(chalk.red(`Erreurs: ${this.stats.errors}`));
    console.log(chalk.yellow(`Avertissements: ${this.stats.warnings}`));
    console.log(chalk.blue(`Dossier de build: ${this.buildDir}`));

    if (this.stats.errors === 0) {
      console.log(chalk.green('\n🎉 Build réussi ! Dossier .homeybuild créé.'));
      console.log(chalk.blue('📁 Vous pouvez maintenant tester votre app Homey.'));
    } else {
      console.log(chalk.red(`\n💥 Build échoué avec ${this.stats.errors} erreur(s).`));
    }
  }

  /**
   * Exécute le build complet
   */
  async build() {
    console.log(chalk.blue('🚀 Démarrage du build Homey...'));
    
    if (!this.createBuildDirectory()) {
      return false;
    }

    this.copyBaseFiles();
    this.copyAssets();
    this.copyDrivers();
    this.copyHomeyCompose();
    
    this.generateBuildReport();
    
    return this.stats.errors === 0;
  }
}

// Exécution principale
async function main() {
  try {
    const builder = new HomeyBuilder();
    const success = await builder.build();
    
    if (success) {
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red(`\n💥 Erreur fatale: ${error.message}`));
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  main();
}

module.exports = HomeyBuilder;
