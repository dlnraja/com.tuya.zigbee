#!/usr/bin/env node
'use strict';

/**
 * Driver Module Manager - Script unifié pour gérer toutes les catégories
 * Fusionne les fonctionnalités des scripts ai-adv-script-*
 */

const fs = require('fs');
const path = require('path');

class DriverModuleManager {
  constructor(category = 'pipeline', priority = 'medium') {
    this.category = category;
    this.priority = priority;
    this.modules = {
      pipeline: require('./modules/pipeline'),
      analysis: require('./modules/analysis'),
      // Autres modules à importer
    };
    this.validCategories = Object.keys(this.modules);
  }

  async run() {
    console.log(`🚀 Exécution du module ${this.category} (${this.priority})`);
    
    try {
      if (!this.validCategories.includes(this.category)) {
        throw new Error(`Catégorie invalide. Options: ${this.validCategories.join(', ')}`);
      }
      
      await this.modules[this.category].execute();
      console.log(`✅ Module ${this.category} exécuté avec succès`);
    } catch (error) {
      console.error(`❌ Erreur dans le module ${this.category}:`, error.message);
      process.exit(1);
    }
  }
}

// Support CLI
if (require.main === module) {
  const [,, category, priority] = process.argv;
  new DriverModuleManager(category, priority).run().catch(console.error);
}

module.exports = DriverModuleManager;
