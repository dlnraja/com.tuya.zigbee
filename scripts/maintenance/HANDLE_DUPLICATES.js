#!/usr/bin/env node
'use strict';

/**
 * HANDLE DUPLICATES
 * Gère les fichiers JS duplicatas détectés
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

class HandleDuplicates {
  constructor() {
    this.handled = [];
    this.kept = [];
  }

  log(msg, icon = '🔄') {
    console.log(`${icon} ${msg}`);
  }

  // Lire le rapport d'organisation
  getOrganizationReport() {
    const reportPath = path.join(ROOT, 'reports', 'ORGANIZE_ALL_JS_FILES_REPORT.json');
    
    if (!fs.existsSync(reportPath)) {
      this.log('Rapport d\'organisation introuvable', '❌');
      return null;
    }

    return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  }

  // Archiver un fichier duplicata
  archiveDuplicate(duplicatePath) {
    try {
      const archiveDir = path.join(ROOT, '.archive', 'duplicates');
      
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      const fileName = path.basename(duplicatePath);
      const timestamp = Date.now();
      const archivedName = `${path.basename(fileName, '.js')}_${timestamp}.js`;
      const archivePath = path.join(archiveDir, archivedName);

      fs.renameSync(duplicatePath, archivePath);
      
      return archivedName;
    } catch (err) {
      this.log(`Erreur archivage: ${err.message}`, '❌');
      return null;
    }
  }

  // Gérer les duplicatas
  async handleDuplicates() {
    const report = this.getOrganizationReport();
    
    if (!report || !report.details.duplicates || report.details.duplicates.length === 0) {
      this.log('Aucun duplicata à gérer', '✅');
      return;
    }

    this.log(`${report.details.duplicates.length} duplicatas détectés`, '🔄');
    console.log('═'.repeat(70));

    for (const dup of report.details.duplicates) {
      if (fs.existsSync(dup.duplicate)) {
        const archived = this.archiveDuplicate(dup.duplicate);
        if (archived) {
          this.handled.push({
            original: dup.file,
            archived: archived,
            from: dup.duplicate
          });
          this.log(`${dup.file} → .archive/duplicates/${archived}`, '  ✅');
        }
      } else {
        this.kept.push(dup.file);
        this.log(`${dup.file} déjà géré`, '  ℹ️');
      }
    }
  }

  // Générer rapport
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      handled: this.handled.length,
      kept: this.kept.length,
      details: {
        handled: this.handled,
        kept: this.kept
      }
    };

    const reportPath = path.join(ROOT, 'reports', 'HANDLE_DUPLICATES_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     HANDLE DUPLICATES - GESTION DUPLICATAS                         ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    await this.handleDuplicates();
    const report = this.generateReport();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`✅ Archivés: ${report.handled}`);
    console.log(`ℹ️  Déjà gérés: ${report.kept}`);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ DUPLICATAS GÉRÉS');
    console.log('═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const handler = new HandleDuplicates();
  handler.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = HandleDuplicates;
