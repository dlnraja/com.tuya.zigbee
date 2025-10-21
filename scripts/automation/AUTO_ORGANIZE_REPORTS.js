#!/usr/bin/env node
'use strict';

/**
 * AUTO ORGANIZE REPORTS
 * Déplace automatiquement tous les rapports vers reports/
 * Évite pollution de la racine
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

class AutoOrganizeReports {
  constructor() {
    this.moved = [];
    this.kept = [];
    
    // Fichiers autorisés à la racine
    this.allowedAtRoot = [
      'README.md',
      'README.txt',  // Requis pour Homey App Store
      'CHANGELOG.md',
      'LICENSE',
      'package.json',
      'package-lock.json',
      'app.json',
      '.gitignore',
      '.gitattributes',
      '.homeyignore',
      '.homeychangelog.json',
      '.homeychangelog.json.backup',
      '.prettierrc',
      '.prettierignore',
      '.env.example'
    ];
  }

  log(msg, icon = '📁') {
    console.log(`${icon} ${msg}`);
  }

  // Vérifier si fichier doit rester à la racine
  shouldKeepAtRoot(filename) {
    // Fichiers autorisés explicitement
    if (this.allowedAtRoot.includes(filename)) return true;
    
    // Dossiers
    if (fs.statSync(path.join(ROOT, filename)).isDirectory()) return true;
    
    // Fichiers système
    if (filename.startsWith('.')) return true;
    
    return false;
  }

  // Organiser fichiers racine
  organizeRoot() {
    this.log('Organisation racine en cours...', '🧹');
    console.log('═'.repeat(70));

    const files = fs.readdirSync(ROOT);
    
    for (const file of files) {
      const filePath = path.join(ROOT, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        // Ignorer dossiers
        if (stat.isDirectory()) continue;
        
        // Vérifier si doit rester
        if (this.shouldKeepAtRoot(file)) {
          this.kept.push(file);
          continue;
        }

        // Déterminer destination
        let targetDir = null;
        
        // Rapports et status
        if (file.match(/(REPORT|STATUS|SUMMARY|COMPLETE|FIX|DEPLOY|SESSION)/i)) {
          targetDir = 'reports';
        }
        // Documentation
        else if (file.match(/\.(md|txt)$/i)) {
          targetDir = 'docs';
        }
        // Scripts batch/PowerShell
        else if (file.match(/\.(bat|ps1|cmd)$/i)) {
          targetDir = '.archive/old-scripts';
        }
        // JSON data
        else if (file.match(/\.json$/i)) {
          targetDir = 'project-data';
        }
        // Images
        else if (file.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
          targetDir = '.archive/old-files';
        }
        // Autres fichiers temporaires
        else if (file.match(/\.(tmp|log|bak|old)$/i)) {
          targetDir = '.archive/old-files';
        }

        // Déplacer si destination trouvée
        if (targetDir) {
          const targetPath = path.join(ROOT, targetDir);
          
          // Créer dossier si n'existe pas
          if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
          }

          const target = path.join(targetPath, file);
          
          // Ne pas écraser si existe déjà
          if (!fs.existsSync(target)) {
            fs.renameSync(filePath, target);
            this.moved.push({ file, from: 'root', to: targetDir });
            this.log(`${file} → ${targetDir}/`, '  ✅');
          } else {
            // Si existe, archiver avec timestamp
            const timestamp = Date.now();
            const [name, ext] = file.split(/\.(?=[^.]+$)/);
            const archivedName = `${name}_${timestamp}.${ext}`;
            const archivedPath = path.join(targetPath, archivedName);
            fs.renameSync(filePath, archivedPath);
            this.moved.push({ file, from: 'root', to: `${targetDir}/${archivedName}` });
            this.log(`${file} → ${targetDir}/${archivedName}`, '  ✅');
          }
        }
      } catch (err) {
        this.log(`Erreur ${file}: ${err.message}`, '  ⚠️');
      }
    }

    console.log('═'.repeat(70));
    this.log(`${this.moved.length} fichiers déplacés`, '✅');
    this.log(`${this.kept.length} fichiers gardés à la racine`, 'ℹ️');
  }

  // Créer règle gitignore
  updateGitignore() {
    this.log('Mise à jour .gitignore...', '📝');

    const gitignorePath = path.join(ROOT, '.gitignore');
    let content = '';
    
    if (fs.existsSync(gitignorePath)) {
      content = fs.readFileSync(gitignorePath, 'utf8');
    }

    // Règles à ajouter
    const rules = [
      '',
      '# Auto-cleanup rules - Ne pas créer ces fichiers à la racine',
      '*_REPORT*.md',
      '*_STATUS*.md',
      '*_SUMMARY*.md',
      '*_COMPLETE*.md',
      '*_FIX*.md',
      '*_DEPLOY*.md',
      '*_SESSION*.md',
      '*.tmp',
      '*.log',
      '*.bak',
      'temp_*.bat',
      'temp_*.js'
    ];

    let added = false;
    for (const rule of rules) {
      if (!content.includes(rule)) {
        content += '\n' + rule;
        added = true;
      }
    }

    if (added) {
      fs.writeFileSync(gitignorePath, content);
      this.log('Règles ajoutées au .gitignore', '✅');
    }
  }

  // Générer rapport
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      moved: this.moved.length,
      kept: this.kept.length,
      files: {
        moved: this.moved,
        kept: this.kept
      },
      rules: {
        allowedAtRoot: this.allowedAtRoot,
        autoMove: {
          reports: 'reports/',
          docs: 'docs/',
          scripts: '.archive/old-scripts/',
          data: 'project-data/',
          temp: '.archive/old-files/'
        }
      }
    };

    const reportPath = path.join(ROOT, 'reports', 'AUTO_ORGANIZE_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  // Exécution
  run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     AUTO ORGANIZE REPORTS - NETTOYAGE RACINE                       ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Organiser
    this.organizeRoot();
    
    // Mettre à jour gitignore
    this.updateGitignore();
    
    // Générer rapport
    const report = this.generateReport();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Résumé
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ ORGANISATION');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`📁 Fichiers déplacés: ${this.moved.length}`);
    console.log(`✅ Fichiers gardés: ${this.kept.length}`);
    console.log(`📝 Règles .gitignore: ajoutées`);

    if (this.moved.length > 0) {
      console.log('\n📦 Déplacements:');
      this.moved.forEach(m => {
        console.log(`  ${m.file} → ${m.to}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ ORGANISATION TERMINÉE');
    console.log('═'.repeat(70));
    console.log('\n💡 Astuce: Les nouveaux rapports seront automatiquement exclus de git\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const organizer = new AutoOrganizeReports();
  organizer.run();
}

module.exports = AutoOrganizeReports;
