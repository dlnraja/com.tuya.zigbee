/**
 * Driver Tuya RGB Bulb
 * Version: 3.7.0
 * Compatible: Homey SDK 3
 */

const { ZigbeeDevice } = require('homey-zigbeedriver');

class TuyaBulbRGB extends ZigbeeDevice {
  async onNodeInit({ zclNode }) {
    // Log de l'initialisation
    this.log('Tuya RGB Bulb initialisé');
    
    // Configuration des capacités
    await this.configureCapabilities(zclNode);
  }

  async configureCapabilities(zclNode) {
    try {
      // Capacité onoff
      if (this.hasCapability('onoff')) {
        await this.configureOnOff(zclNode);
      }
      
      // Capacité dim
      if (this.hasCapability('dim')) {
        await this.configureDim(zclNode);
      }
      
      // Capacité light_hue
      if (this.hasCapability('light_hue')) {
        await this.configureLightHue(zclNode);
      }
      
      // Capacité light_saturation
      if (this.hasCapability('light_saturation')) {
        await this.configureLightSaturation(zclNode);
      }
      
      this.log('Capacités configurées avec succès');
    } catch (error) {
      this.error('Erreur lors de la configuration des capacités:', error);
    }
  }

  async configureOnOff(zclNode) {
    // Configuration de la capacité onoff
    this.registerCapability('onoff', 'genOnOff', {
      get: 'onOff',
      set: 'toggle',
      setParser: () => ({}),
      report: 'onOff',
      reportParser: (value) => value === 1,
    });
  }

  async configureDim(zclNode) {
    // Configuration de la capacité dim
    this.registerCapability('dim', 'genLevelCtrl', {
      get: 'currentLevel',
      set: 'moveToLevel',
      setParser: (value) => ({
        level: Math.round(value * 254),
        transtime: 0,
      }),
      report: 'currentLevel',
      reportParser: (value) => value / 254,
    });
  }

  async configureLightHue(zclNode) {
    // Configuration de la capacité light_hue
    this.registerCapability('light_hue', 'lightingColorCtrl', {
      get: 'currentHue',
      set: 'moveToHue',
      setParser: (value) => ({
        hue: Math.round(value * 254),
        direction: 0,
        transitionTime: 0,
      }),
      report: 'currentHue',
      reportParser: (value) => value / 254,
    });
  }

  async configureLightSaturation(zclNode) {
    // Configuration de la capacité light_saturation
    this.registerCapability('light_saturation', 'lightingColorCtrl', {
      get: 'currentSaturation',
      set: 'moveToSaturation',
      setParser: (value) => ({
        saturation: Math.round(value * 254),
        transitionTime: 0,
      }),
      report: 'currentSaturation',
      reportParser: (value) => value / 254,
    });
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Paramètres mis à jour:', changedKeys);
  }

  async onRenamed(name) {
    this.log('Appareil renommé en:', name);
  }
}

module.exports = TuyaBulbRGB;
