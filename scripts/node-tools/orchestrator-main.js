#!/usr/bin/env node

/**
 * Main orchestrator - Run all tools in sequence
 * Converted from ORCHESTRATOR_MAIN.ps1
 */

import { logger } from './lib/logger.js';
import diagnoseDriverImages from './diagnose-driver-images.js';
import extractManufacturerIDs from './extract-manufacturer-ids.js';
import ProjectOrganizer from './organize-project.js';

class Orchestrator {
  constructor(options = {}) {
    this.options = options;
    this.results = {
      startTime: Date.now(),
      steps: [],
      errors: []
    };
  }

  async run() {
    logger.title('🎯 ORCHESTRATION COMPLÈTE - UNIVERSAL TUYA ZIGBEE');
    
    try {
      await this.step('Organization', 'Rangement et organisation des fichiers', async () => {
        const organizer = new ProjectOrganizer();
        await organizer.organize();
      });

      await this.step('Image Diagnostic', 'Diagnostic des images de drivers', async () => {
        return await diagnoseDriverImages({
          verbose: this.options.verbose,
          exportReport: true
        });
      });

      await this.step('ID Extraction', 'Extraction des manufacturer IDs', async () => {
        return await extractManufacturerIDs();
      });

      // Display final summary
      this.displayFinalSummary();
      
      logger.success('\n🎉 ORCHESTRATION TERMINÉE AVEC SUCCÈS!\n');
      
    } catch (error) {
      logger.error(`Erreur lors de l'orchestration: ${error.message}`);
      this.results.errors.push(error);
      throw error;
    }
  }

  async step(name, description, fn) {
    const stepResult = {
      name,
      description,
      startTime: Date.now(),
      status: 'running'
    };

    logger.section(`▶️  ${name}: ${description}`);
    
    try {
      const result = await fn();
      
      stepResult.endTime = Date.now();
      stepResult.duration = stepResult.endTime - stepResult.startTime;
      stepResult.status = 'success';
      stepResult.result = result;
      
      logger.success(`✓ ${name} terminé en ${(stepResult.duration / 1000).toFixed(2)}s\n`);
      
    } catch (error) {
      stepResult.endTime = Date.now();
      stepResult.duration = stepResult.endTime - stepResult.startTime;
      stepResult.status = 'error';
      stepResult.error = error.message;
      
      logger.error(`✗ ${name} échoué: ${error.message}\n`);
      this.results.errors.push(error);
    }
    
    this.results.steps.push(stepResult);
  }

  displayFinalSummary() {
    const totalDuration = Date.now() - this.results.startTime;
    const successCount = this.results.steps.filter(s => s.status === 'success').length;
    const errorCount = this.results.steps.filter(s => s.status === 'error').length;
    
    logger.title('📊 RÉSUMÉ FINAL DE L\'ORCHESTRATION');
    
    logger.summary('Statistiques Globales', [
      { label: 'Étapes exécutées', value: this.results.steps.length, status: 'success' },
      { label: 'Réussies', value: successCount, status: 'success' },
      { label: 'Échouées', value: errorCount, status: errorCount > 0 ? 'error' : 'success' },
      { label: 'Durée totale', value: `${(totalDuration / 1000).toFixed(2)}s`, status: 'success' }
    ]);

    // Steps details
    logger.section('📋 Détails des étapes');
    this.results.steps.forEach(step => {
      const icon = step.status === 'success' ? '✅' : '❌';
      const color = step.status === 'success' ? 'green' : 'red';
      const duration = (step.duration / 1000).toFixed(2);
      
      logger.log(`  ${icon} ${step.name} - ${duration}s`, { color });
      logger.log(`     ${step.description}`, { color: 'gray' });
      
      if (step.error) {
        logger.log(`     Erreur: ${step.error}`, { color: 'red' });
      }
    });
    
    console.log('');

    // Recommendations
    if (errorCount === 0) {
      logger.success('🎉 Toutes les étapes ont été exécutées avec succès!');
      logger.info('\n💡 Prochaines étapes recommandées:');
      logger.log('  1. Vérifier les rapports générés dans project-data/');
      logger.log('  2. Committer les changements avec git');
      logger.log('  3. Exécuter les tests de validation');
      logger.log('  4. Publier sur Homey App Store\n');
    } else {
      logger.warning('⚠️  Certaines étapes ont échoué. Veuillez vérifier les erreurs ci-dessus.');
    }
  }

  getResults() {
    return this.results;
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = {
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    skipOrganize: process.argv.includes('--skip-organize'),
    skipDiagnostic: process.argv.includes('--skip-diagnostic')
  };

  const orchestrator = new Orchestrator(options);
  
  orchestrator.run()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error(`Erreur fatale: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    });
}

export default Orchestrator;
