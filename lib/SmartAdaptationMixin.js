'use strict';

const SmartDriverAdaptation = require('./SmartDriverAdaptation');

/**
 * Mixin pour ajouter l'adaptation intelligente à n'importe quel device
 * 
 * Usage:
 * const SmartAdaptationMixin = require('./SmartAdaptationMixin');
 * 
 * class MyDevice extends SmartAdaptationMixin(ZigBeeDevice) {
 *   async onNodeInit() {
 *     // L'adaptation intelligente se fera automatiquement
 *     await super.onNodeInit();
 *     // ... reste du code
 *   }
 * }
 */

function SmartAdaptationMixin(superclass) {
  return class extends superclass {
    
    async onNodeInit() {
      // Appeler le onNodeInit parent d'abord
      if (super.onNodeInit) {
        await super.onNodeInit();
      }
      
      // Activer l'adaptation intelligente si configurée
      const enableSmartAdaptation = this.getSetting('enable_smart_adaptation');
      
      // Par défaut, activé pour tous
      if (enableSmartAdaptation !== false) {
        await this.runSmartAdaptation();
      }
    }
    
    /**
     * Exécute l'adaptation intelligente
     */
    async runSmartAdaptation() {
      this.log('🤖 [SMART ADAPT] Starting intelligent driver adaptation...');
      
      try {
        // Attendre que le ZCL node soit prêt
        await this.waitForZclNode();
        
        // Créer l'instance d'adaptation
        this.smartAdaptation = new SmartDriverAdaptation(this);
        
        // Exécuter l'analyse et l'adaptation
        const result = await this.smartAdaptation.analyzeAndAdapt();
        
        // Sauvegarder le résultat
        this.smartAdaptationResult = result;
        
        // Générer et logger le rapport
        const report = this.smartAdaptation.generateReport(result);
        this.log(report);
        
        // Sauvegarder le rapport dans les settings
        try {
          await this.setSettings({
            smart_adaptation_report: report,
            smart_adaptation_date: new Date().toISOString()
          });
        } catch (err) {
          // Ignore si les settings ne sont pas configurés
        }
        
        return result;
        
      } catch (err) {
        this.error('❌ [SMART ADAPT] Failed to run smart adaptation:', err.message);
        this.error('   Stack:', err.stack);
        return { success: false, error: err };
      }
    }
    
    /**
     * Attend que le ZCL node soit prêt
     */
    async waitForZclNode(maxWaitMs = 10000) {
      const startTime = Date.now();
      
      while (!this.zclNode && (Date.now() - startTime) < maxWaitMs) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!this.zclNode) {
        throw new Error('ZCL Node not available after waiting');
      }
    }
    
    /**
     * Force une nouvelle adaptation (peut être appelé manuellement)
     */
    async forceSmartAdaptation() {
      this.log('🔄 [SMART ADAPT] Forcing re-adaptation...');
      return await this.runSmartAdaptation();
    }
    
    /**
     * Retourne le résultat de la dernière adaptation
     */
    getSmartAdaptationResult() {
      return this.smartAdaptationResult || null;
    }
  };
}

module.exports = SmartAdaptationMixin;
