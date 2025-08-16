#!/usr/bin/env node
'use strict';

/**
 * 🚀 Orchestrateur MEGA Principal - Version 3.5.0
 * Orchestration unifiée de tous les processus du projet Tuya Zigbee
 */

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

class MEGAOrchestrator {
  constructor() {
    this.config = {
      version: '3.5.0',
      modes: ['FAST', 'FULL', 'VALIDATE_ONLY', 'DEPLOY_ONLY'],
      defaultMode: 'FULL',
      timeout: 300000, // 5 minutes
      logLevel: 'info'
    };
    
    this.stats = {
      startTime: Date.now(),
      steps: [],
      errors: [],
      warnings: [],
      success: true
    };
  }

  /**
   * 🎯 Point d'entrée principal
   */
  async run() {
    const mode = process.env.MODE || this.config.defaultMode;
    const useMCP = process.env.USE_MCP === '1';
    const useFallbacks = process.env.USE_FALLBACKS === '1';
    const offline = process.env.OFFLINE === '1';

    console.log('🚀 MEGA Orchestrator v' + this.config.version);
    console.log('📊 Mode:', mode);
    console.log('🤖 MCP:', useMCP ? '✅' : '❌');
    console.log('🔄 Fallbacks:', useFallbacks ? '✅' : '❌');
    console.log('🌐 Offline:', offline ? '✅' : '❌');
    console.log('');

    try {
      await this.executePipeline(mode, { useMCP, useFallbacks, offline });
      this.generateReport();
      process.exit(0);
    } catch (error) {
      console.error('❌ Erreur fatale:', error.message);
      this.stats.success = false;
      this.stats.errors.push(error.message);
      this.generateReport();
      process.exit(1);
    }
  }

  /**
   * 🔄 Exécution du pipeline principal
   */
  async executePipeline(mode, options) {
    const pipeline = this.getPipelineSteps(mode, options);
    
    for (const step of pipeline) {
      if (!this.stats.success && step.critical) {
        console.log(`⚠️ Étape critique ignorée: ${step.name}`);
        continue;
      }

      await this.executeStep(step);
      
      if (!this.stats.success && step.critical) {
        throw new Error(`Étape critique échouée: ${step.name}`);
      }
    }
  }

  /**
   * 📋 Définition des étapes du pipeline
   */
  getPipelineSteps(mode, options) {
    const baseSteps = [
      {
        name: 'Préparation',
        command: 'node',
        args: ['tools/core/preparation.js'],
        critical: true,
        timeout: 60000
      },
      {
        name: 'Validation structure',
        command: 'node',
        args: ['tools/core/validator.js'],
        critical: true,
        timeout: 120000
      }
    ];

    if (mode === 'VALIDATE_ONLY') {
      return baseSteps;
    }

    const buildSteps = [
      {
        name: 'Génération matrices',
        command: 'node',
        args: ['tools/core/matrix-builder.js'],
        critical: false,
        timeout: 180000
      },
      {
        name: 'Construction dashboard',
        command: 'node',
        args: ['tools/core/dashboard-builder.js'],
        critical: false,
        timeout: 120000
      }
    ];

    if (mode === 'FAST') {
      return [...baseSteps, ...buildSteps];
    }

    const enrichmentSteps = [
      {
        name: 'Collecte evidence',
        command: 'node',
        args: ['tools/core/evidence-collector.js'],
        critical: false,
        timeout: 300000
      },
      {
        name: 'Enrichissement heuristique',
        command: 'node',
        args: ['tools/core/enricher.js'],
        critical: false,
        timeout: 240000
      }
    ];

    if (!options.offline) {
      enrichmentSteps.push({
        name: 'Enrichissement web',
        command: 'node',
        args: ['tools/core/web-enricher.js'],
        critical: false,
        timeout: 300000
      });
    }

    const finalSteps = [
      {
        name: 'Validation finale',
        command: 'node',
        args: ['tools/core/final-validator.js'],
        critical: false,
        timeout: 120000
      }
    ];

    if (mode === 'DEPLOY_ONLY') {
      return [
        {
          name: 'Déploiement',
          command: 'node',
          args: ['tools/core/deployer.js'],
          critical: true,
          timeout: 180000
        }
      ];
    }

    return [...baseSteps, ...buildSteps, ...enrichmentSteps, ...finalSteps];
  }

  /**
   * ⚡ Exécution d'une étape
   */
  async executeStep(step) {
    console.log(`🔄 ${step.name}...`);
    const startTime = Date.now();

    try {
      const result = await this.runCommand(step.command, step.args, step.timeout);
      
      this.stats.steps.push({
        name: step.name,
        success: true,
        duration: Date.now() - startTime,
        output: result
      });

      console.log(`✅ ${step.name} terminé en ${Date.now() - startTime}ms`);
    } catch (error) {
      this.stats.steps.push({
        name: step.name,
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });

      if (step.critical) {
        this.stats.success = false;
        throw error;
      } else {
        this.stats.warnings.push(`${step.name}: ${error.message}`);
        console.log(`⚠️ ${step.name} échoué (non critique): ${error.message}`);
      }
    }
  }

  /**
   * 🖥️ Exécution d'une commande
   */
  runCommand(command, args, timeout) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeout || this.config.timeout
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Commande échouée avec le code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Erreur d'exécution: ${error.message}`));
      });

      process.on('timeout', () => {
        process.kill();
        reject(new Error(`Commande expirée après ${timeout}ms`));
      });
    });
  }

  /**
   * 📊 Génération du rapport final
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      version: this.config.version,
      success: this.stats.success,
      duration: Date.now() - this.stats.startTime,
      steps: this.stats.steps,
      errors: this.stats.errors,
      warnings: this.stats.warnings,
      summary: {
        totalSteps: this.stats.steps.length,
        successfulSteps: this.stats.steps.filter(s => s.success).length,
        failedSteps: this.stats.steps.filter(s => !s.success).length,
        totalErrors: this.stats.errors.length,
        totalWarnings: this.stats.warnings.length
      }
    };

    const reportPath = `MEGA_ORCHESTRATOR_REPORT_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('');
    console.log('📊 RAPPORT FINAL');
    console.log('================');
    console.log(`✅ Succès: ${report.summary.successfulSteps}/${report.summary.totalSteps}`);
    console.log(`❌ Échecs: ${report.summary.failedSteps}`);
    console.log(`⚠️ Avertissements: ${report.summary.totalWarnings}`);
    console.log(`⏱️ Durée totale: ${Math.round(report.duration / 1000)}s`);
    console.log(`📄 Rapport sauvegardé: ${reportPath}`);

    if (this.stats.success) {
      console.log('🎉 Pipeline MEGA terminé avec succès !');
    } else {
      console.log('💥 Pipeline MEGA terminé avec des erreurs !');
    }
  }
}

// Point d'entrée
if (require.main === module) {
  const orchestrator = new MEGAOrchestrator();
  orchestrator.run().catch(console.error);
}

module.exports = MEGAOrchestrator;
