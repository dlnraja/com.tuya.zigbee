const Homey = require('homey');

class TuyaZigbeeLiteApp extends Homey.App {
  async onInit() {
    this.log('🚀 Tuya Zigbee (Lite) App initialisée');
    
    // Initialiser les modules
    await this.initializeModules();
    
    this.log('✅ App initialisée avec succès');
  }
  
  async initializeModules() {
    try {
      // Initialiser les modules heuristiques
      const dpGuess = require('./lib/heuristics/dp-guess');
      const zclGuess = require('./lib/heuristics/zcl-guess');
      const scoring = require('./lib/heuristics/scoring-engine');
      
      this.log('🤖 Modules IA initialisés');
      
    } catch (error) {
      this.log('⚠️ Erreur initialisation modules:', error.message);
    }
  }
}

module.exports = TuyaZigbeeLiteApp;