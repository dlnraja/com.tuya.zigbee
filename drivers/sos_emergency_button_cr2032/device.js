'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

/**
 * SOS EMERGENCY BUTTON - CR2032
 * Fix pour stabilité connexion - Forum #353
 */
class SOSEmergencyButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // Keep-alive mechanism
    this.keepAliveInterval = null;
    
    // IAS Zone enrollment robuste
    try {
      await this.enrollIASZone();
    } catch (err) {
      this.error('IAS Zone enrollment error:', err);
      // Retry après 30s
      this.homey.setTimeout(() => this.enrollIASZone(), 30000);
    }

    // Register capabilities
    this.registerCapability('alarm_generic', 'ssIasZone', {
      reportParser: (value) => {
        this.log('SOS button pressed:', value);
        return value?.zoneStatus?.alarm1 === 1;
      }
    });

    this.registerCapability('alarm_tamper', 'ssIasZone', {
      reportParser: (value) => {
        return value?.zoneStatus?.tamper === 1;
      }
    });

    this.registerCapability('measure_battery', 'genPowerCfg', {
      reportParser: (value) => {
        const battery = value === 200 ? 100 : value / 2;
        this.log('Battery:', battery + '%');
        
        // Alert si batterie faible
        if (battery < 20) {
          this.log('⚠️  Low battery detected!');
          this.setWarning('Battery low - Replace CR2032 soon');
        }
        
        return battery;
      }
    });

    // Keep-alive: poll battery chaque 30 min
    this.startKeepAlive();
    
    // Marquer disponible
    await this.setAvailable();
    this.log('✅ SOS Button initialized successfully');
  }

  /**
   * Enrollment IAS Zone robuste
   */
  async enrollIASZone() {
    this.log('Starting IAS Zone enrollment...');
    
    try {
      const enroller = new IASZoneEnroller(this);
      const success = await enroller.enroll();
      
      if (success) {
        this.log('✅ IAS Zone enrolled successfully');
        return true;
      } else {
        throw new Error('Enrollment failed');
      }
    } catch (err) {
      this.error('IAS Zone enrollment failed:', err);
      throw err;
    }
  }

  /**
   * Keep-alive mechanism
   */
  startKeepAlive() {
    if (this.keepAliveInterval) {
      this.homey.clearInterval(this.keepAliveInterval);
    }
    
    this.keepAliveInterval = this.homey.setInterval(async () => {
      try {
        // Poll battery pour maintenir connexion
        const battery = await this.zclNode.endpoints[1].clusters.genPowerCfg
          .readAttributes(['batteryPercentageRemaining'])
          .catch(() => null);
        
        if (battery) {
          this.log('Keep-alive: Device responding ✅');
          await this.setAvailable();
        } else {
          this.log('Keep-alive: No response ⚠️');
        }
      } catch (err) {
        this.log('Keep-alive error:', err.message);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Gestion rename
   */
  async onRenamed(name) {
    this.log('Device renamed to:', name);
    // Ne pas réinitialiser - garder config
  }

  /**
   * Gestion settings change
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
    // Préserver connexion pendant changement settings
  }

  /**
   * Cleanup proper
   */
  async onDeleted() {
    this.log('Device deleted - cleanup');
    
    if (this.keepAliveInterval) {
      this.homey.clearInterval(this.keepAliveInterval);
    }
    
    // Nettoyer IAS Zone
    try {
      await this.zclNode.endpoints[1].clusters.ssIasZone
        .writeAttributes({ iasCieAddress: '00:00:00:00:00:00:00:00' })
        .catch(() => null);
    } catch (err) {
      // Ignore
    }
  }

}

module.exports = SOSEmergencyButtonDevice;
