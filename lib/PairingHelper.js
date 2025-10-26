'use strict';

/**
 * PAIRING HELPER - SDK v3 Compliant
 * 
 * Fournit feedback utilisateur pendant le pairing
 * Basé sur Homey SDK v3 PairSession
 * 
 * Résout issue forum: "Nothing happens" pendant pairing
 */

class PairingHelper {
  constructor(driver) {
    this.driver = driver;
    this.logger = null;
  }

  /**
   * Setup pairing avec feedback utilisateur
   */
  setupPairing() {
    this.driver.onPair(async (session) => {
      
      // Handler: list_devices
      session.setHandler('list_devices', async () => {
        this.driver.log('[SEARCH] Searching for devices...');
        
        try {
          // Feedback: Scanning
          await session.emit('progress', { 
            message: 'Scanning Zigbee network...',
            progress: 0.3 
          });
          
          // Discover devices
          const devices = await this.discoverDevices();
          
          // Feedback: Found
          await session.emit('progress', { 
            message: `Found ${devices.length} device(s)`,
            progress: 1.0 
          });
          
          // Feedback: No devices
          if (devices.length === 0) {
            await session.emit('info', {
              message: 'No devices found. Make sure device is in pairing mode and close to Homey.'
            });
          }
          
          this.driver.log(`[OK] Found ${devices.length} devices`);
          return devices;
          
        } catch (err) {
          this.driver.error('[ERROR] Discovery failed:', err);
          
          await session.emit('error', {
            message: 'Failed to discover devices',
            details: err.message,
            help: 'Make sure Zigbee is enabled and device is in pairing mode'
          });
          
          throw err;
        }
      });

      // Handler: add_device
      session.setHandler('add_device', async (device) => {
        this.driver.log(`[OK] Adding device: ${device.name}`);
        
        try {
          // Feedback: Configuring
          await session.emit('progress', {
            message: 'Configuring device...',
            progress: 0.5
          });
          
          // Validate device
          await this.validateDevice(device);
          
          // Feedback: Ready
          await session.emit('progress', {
            message: 'Device ready!',
            progress: 1.0
          });
          
          this.driver.log(`[OK] Device added: ${device.data.ieeeAddress}`);
          return device;
          
        } catch (err) {
          this.driver.error('[ERROR] Failed to add device:', err);
          
          await session.emit('error', {
            message: 'Failed to add device',
            details: err.message,
            help: 'Try resetting device and pairing again'
          });
          
          throw err;
        }
      });
    });
  }

  /**
   * Discover devices (à override dans le driver)
   */
  async discoverDevices() {
    // Par défaut, retourne liste vide
    // Le driver doit override cette méthode
    return [];
  }

  /**
   * Validate device avant ajout
   */
  async validateDevice(device) {
    // Validation basique
    if (!device.data || !device.data.ieeeAddress) {
      throw new Error('Invalid device: missing IEEE address');
    }
    
    // Vérifier format IEEE address (conversion explicite en string)
    const ieeeAddr = String(device.data.ieeeAddress || '');
    if (!/^[0-9a-fA-F]{16}$/.test(String(ieeeAddr).replace(/:/g, ''))) {
      throw new Error('Invalid IEEE address format');
    }
    
    return true;
  }

  /**
   * Emit progress helper
   */
  async emitProgress(session, message, progress = 0.5) {
    try {
      await session.emit('progress', { message, progress });
    } catch (err) {
      // Ignore si session fermée
    }
  }

  /**
   * Emit info helper
   */
  async emitInfo(session, message) {
    try {
      await session.emit('info', { message });
    } catch (err) {
      // Ignore si session fermée
    }
  }

  /**
   * Emit error helper
   */
  async emitError(session, message, details, help) {
    try {
      await session.emit('error', { message, details, help });
    } catch (err) {
      // Ignore si session fermée
    }
  }
}

module.exports = PairingHelper;
