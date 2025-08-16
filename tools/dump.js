#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const archiver = require('archiver');

class HomeyDumper {
  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.dumpDir = `dumps/${this.timestamp}`;
    this.dumpPath = `dumps/dump-${this.timestamp}`;
    this.runSeconds = parseInt(process.argv[2]) || 300;
  }

  async run() {
    console.log('🚀 HOMEY DUMP BUNDLE - BRIEF "BÉTON"');
    console.log('='.repeat(60));

    // Créer le dossier de dump
    await this.createDumpDirectory();
    
    // 1. Capture de l'environnement
    await this.captureEnvironment();
    
    // 2. Copie app.json
    await this.copyAppJson();
    
    // 3. Strip BOM des JSON
    await this.stripBOM();
    
    // 4. Lint JSON
    await this.lintJSON();
    
    // 5. Tree de l'arborescence
    await this.generateTree();
    
    // 6. Validation Homey (debug)
    await this.validateHomey();
    
    // 7. Lancement Homey app run
    await this.runHomeyApp();
    
    // 8. Création du ZIP final
    await this.createZip();
    
    // 9. Rapport final
    this.generateFinalReport();
  }

  async createDumpDirectory() {
    if (!fs.existsSync('dumps')) {
      fs.mkdirSync('dumps');
    }
    fs.mkdirSync(this.dumpDir, { recursive: true });
    console.log(`📁 Dossier de dump créé: ${this.dumpDir}`);
  }

  async captureEnvironment() {
    console.log('🔍 Capture de l\'environnement...');
    
    const env = [
      '=== ENVIRONNEMENT ===',
      `Date: ${new Date().toISOString()}`,
      `PWD: ${process.cwd()}`,
      `Node: ${process.version}`,
      `NPM: ${this.getNpmVersion()}`,
      `Homey CLI: ${this.getHomeyVersion()}`,
      `Git: ${this.getGitVersion()}`
    ].join('\n');

    fs.writeFileSync(path.join(this.dumpDir, 'env.txt'), env);
    console.log('✅ Environnement capturé');
  }

  getNpmVersion() {
    try {
      const result = spawnSync('npm', ['--version'], { encoding: 'utf8' });
      return result.stdout.trim();
    } catch {
      return 'Non installé';
    }
  }

  getHomeyVersion() {
    try {
      const result = spawnSync('homey', ['--version'], { encoding: 'utf8' });
      return result.stdout.trim();
    } catch {
      return 'Non installé';
    }
  }

  getGitVersion() {
    try {
      const result = spawnSync('git', ['--version'], { encoding: 'utf8' });
      return result.stdout.trim();
    } catch {
      return 'Non installé';
    }
  }

  async copyAppJson() {
    if (fs.existsSync('app.json')) {
      fs.copyFileSync('app.json', path.join(this.dumpDir, 'app.json'));
      console.log('✅ app.json copié');
    } else {
      console.log('❌ app.json non trouvé');
    }
  }

  async stripBOM() {
    console.log('🧹 Nettoyage BOM des JSON...');
    
    const bomLog = [];
    const jsonFiles = this.findJsonFiles('.');
    
    for (const file of jsonFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.charCodeAt(0) === 0xFEFF) {
          const cleanContent = content.slice(1);
          fs.writeFileSync(file, cleanContent);
          bomLog.push(`✅ BOM retiré: ${file}`);
        }
      } catch (error) {
        bomLog.push(`❌ Erreur: ${file} - ${error.message}`);
      }
    }

    fs.writeFileSync(path.join(this.dumpDir, 'strip-bom.log'), bomLog.join('\n'));
    console.log(`✅ BOM nettoyé sur ${jsonFiles.length} fichiers`);
  }

  findJsonFiles(dir, excludeDirs = ['node_modules', '.git', 'dumps']) {
    const files = [];
    
    function scan(currentDir) {
      if (excludeDirs.some(exclude => currentDir.includes(exclude))) {
        return;
      }
      
      try {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scan(fullPath);
          } else if (item.endsWith('.json')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignorer les erreurs de permission
      }
    }
    
    scan(dir);
    return files;
  }

  async lintJSON() {
    console.log('🔍 Validation JSON...');
    
    const lintLog = [];
    const invalidJson = [];
    const jsonFiles = this.findJsonFiles('.');
    
    for (const file of jsonFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        JSON.parse(content);
        lintLog.push(`✅ ${file}`);
      } catch (error) {
        lintLog.push(`❌ ${file} - ${error.message}`);
        invalidJson.push(file);
      }
    }

    fs.writeFileSync(path.join(this.dumpDir, 'lint-json.log'), lintLog.join('\n'));
    console.log(`✅ JSON validé: ${jsonFiles.length - invalidJson.length}/${jsonFiles.length} valides`);
  }

  async generateTree() {
    console.log('🌳 Génération de l\'arborescence...');
    
    const tree = ['=== ARBORESCENCE PROJET ===', `Date: ${new Date().toISOString()}`, ''];
    
    function getTreeStructure(currentPath, level = 0) {
      const indent = '  '.repeat(level);
      
      try {
        const items = fs.readdirSync(currentPath).sort();
        
        for (const item of items) {
          if (!['node_modules', '.git', 'dumps'].includes(item)) {
            const fullPath = path.join(currentPath, item);
            const stat = fs.statSync(fullPath);
            
            tree.push(`${indent}${item}/`);
            
            if (stat.isDirectory()) {
              getTreeStructure(fullPath, level + 1);
            }
          }
        }
      } catch (error) {
        // Ignorer les erreurs de permission
      }
    }
    
    getTreeStructure('.');
    fs.writeFileSync(path.join(this.dumpDir, 'tree.txt'), tree.join('\n'));
    console.log('✅ Arborescence générée');
  }

  async validateHomey() {
    console.log('🔍 Validation Homey (debug)...');
    
    try {
      const result = spawnSync('homey', ['app', 'validate', '-l', 'debug'], { 
        encoding: 'utf8'
      });
      
      const output = (result.stdout || '') + (result.stderr || '');
      fs.writeFileSync(path.join(this.dumpDir, 'validate.log'), output);
      
      if (output.includes('✓')) {
        console.log('✅ Validation Homey réussie');
      } else {
        console.log('⚠️ Validation Homey avec avertissements');
      }
    } catch (error) {
      const errorMsg = `❌ Erreur validation: ${error.message}`;
      fs.writeFileSync(path.join(this.dumpDir, 'validate.log'), errorMsg);
      console.log(errorMsg);
    }
  }

  async runHomeyApp() {
    console.log('🚀 Lancement Homey app run...');
    console.log(`⏱️ Durée: ${this.runSeconds} secondes`);
    console.log(`🛑 Arrêt automatique dans ${this.runSeconds} secondes (Ctrl+C pour arrêt manuel)`);
    
    const runLog = [
      '=== LOGS HOMEY APP RUN ===',
      `Date: ${new Date().toISOString()}`,
      `Durée: ${this.runSeconds} secondes`,
      ''
    ];
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const homeyProcess = spawn('homey', ['app', 'run'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      
      homeyProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });
      
      homeyProcess.stderr.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stderr.write(text);
      });
      
      // Timer pour arrêt automatique
      const timer = setTimeout(() => {
        console.log('\n🛑 Arrêt automatique...');
        homeyProcess.kill();
        resolve();
      }, this.runSeconds * 1000);
      
      // Gestion de la fin du processus
      homeyProcess.on('close', (code) => {
        clearTimeout(timer);
        console.log(`\n✅ Homey app run terminé avec le code: ${code}`);
        resolve();
      });
      
      // Gestion des erreurs
      homeyProcess.on('error', (error) => {
        clearTimeout(timer);
        console.log(`\n❌ Erreur: ${error.message}`);
        resolve();
      });
      
      // Gestion de l'interruption
      process.on('SIGINT', () => {
        clearTimeout(timer);
        console.log('\n🛑 Arrêt manuel...');
        homeyProcess.kill();
        resolve();
      });
    }).then(() => {
      // Sauvegarder les logs
      const logs = runLog.join('\n') + (output || '');
      fs.writeFileSync(path.join(this.dumpDir, 'run.log'), logs);
    });
  }

  async createZip() {
    console.log('📦 Création du ZIP final...');
    
    try {
      const output = fs.createWriteStream(`${this.dumpPath}.zip`);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        console.log(`✅ ZIP créé: ${this.dumpPath}.zip`);
      });
      
      archive.on('error', (err) => {
        throw err;
      });
      
      archive.pipe(output);
      archive.directory(this.dumpDir, false);
      await archive.finalize();
      
    } catch (error) {
      console.log(`❌ Erreur création ZIP: ${error.message}`);
      // Fallback: copie simple
      console.log('⚠️ Fallback: copie simple');
      fs.cpSync(this.dumpDir, this.dumpPath, { recursive: true });
    }
  }

  generateFinalReport() {
    const duration = Math.floor((Date.now() - new Date(this.timestamp.replace(/-/g, ':')).getTime()) / 1000);
    
    console.log('\n🎉 DUMP COMPLET TERMINÉ !');
    console.log('='.repeat(60));
    console.log(`📁 Dossier: ${this.dumpDir}`);
    console.log(`📦 Archive: ${this.dumpPath}.zip`);
    console.log(`⏱️ Durée totale: ${duration} secondes`);
    
    console.log('\n📋 CONTENU DU DUMP:');
    try {
      const items = fs.readdirSync(this.dumpDir);
      items.forEach(item => {
        console.log(`  📄 ${item}`);
      });
    } catch (error) {
      console.log('  ❌ Erreur lecture contenu');
    }
    
    console.log('\n🚀 PROCHAINES ÉTAPES:');
    console.log(`1. Analyser les logs dans ${this.dumpDir}`);
    console.log('2. Corriger les erreurs JSON si nécessaire');
    console.log('3. Relancer la validation si besoin');
    console.log('4. Tester l\'appairage des devices');
  }
}

// Exécution principale
if (require.main === module) {
  const dumper = new HomeyDumper();
  dumper.run().catch(console.error);
}

module.exports = HomeyDumper;
