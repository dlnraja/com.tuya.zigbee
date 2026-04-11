'use strict';

/**
 * HardwareDetectionShim - Runtime hardware detection & capability correction
 * 
 * Détecte le hardware réel d'un device et corrige automatiquement les capabilities
 * si le driver assigné ne correspond pas au hardware.
 * 
 * Cas d'usage:
 * - USB outlet assigné à switch_basic_2gang → détecte USB + ajoute voltage/current
 * - Switch assigné à USB outlet → détecte switch + retire voltage/current
 * - Device avec Tuya EF00 mal détecté → ajoute DP capabilities
 * 
 * Évite le re-pairing pour l'utilisateur!
 */

class HardwareDetectionShim {
  
  constructor(device) {
    this.device = device;
    this.log = device.log.bind(device);
    this.error = device.error.bind(device);
  }
  
  /**
   * Détecte le hardware réel et corrige les capabilities si nécessaire
   */
  async detectAndCorrect(zclNode) {
    this.log('[SHIM] 🔍 Hardware detection started...');
    
    try {
      const detection = await this.detectHardware(zclNode);
      this.log('[SHIM] 📊 Detection results:', JSON.stringify(detection, null, 2));
      
      const corrections = await this.calculateCorrections(detection);
      
      if (corrections.length > 0) {
        this.log(`[SHIM] 🔧 Applying ${corrections.length} corrections...`);
        await this.applyCorrections(corrections);
        this.log('[SHIM] ✅ Hardware corrections applied');
        return true;
      } else {
        this.log('[SHIM] ✅ Hardware matches driver - no corrections needed');
        return false;
      }
      
    } catch (err) {
      this.error('[SHIM] ❌ Detection failed:', err);
      return false;
    }
  }
  
  /**
   * Détecte le hardware réel du device
   */
  async detectHardware(zclNode) {
    const detection = {
      deviceType: 'unknown',
      powerSource: 'unknown',
      hasUSB: false,
      hasTuyaEF00: false,
      tuyaDPs: [],
      endpoints: [],
      clusters: {},
      features: [],
    };
    
    // 1. Detect endpoints
    if (zclNode && zclNode.endpoints) {
      detection.endpoints = Object.keys(zclNode.endpoints)
        .filter(ep => ep !== 'getDeviceEndpoint')
        .map(ep => parseInt(ep));
      
      this.log(`[SHIM] Found ${detection.endpoints.length} endpoints`);
    }
    
    // 2. Detect power source
    try {
      const endpoint1 = zclNode?.endpoints?.[1];
      if (endpoint1?.clusters?.powerConfiguration) {
        const powerData = await endpoint1.clusters.powerConfiguration
          .readAttributes(['powerSource'])
          .catch(() => null);
        
        if (powerData && powerData.powerSource) {
          const ps = powerData.powerSource.toString().toLowerCase();
          if (ps.includes('mains') || ps.includes('dc') || ps.includes('ac')) {
            detection.powerSource = 'AC';
          } else if (ps.includes('battery')) {
            detection.powerSource = 'BATTERY';
          }
        }
      }
    } catch (err) {
      // Fallback: check if device is router (= AC powered)
      if (this.device.getData && this.device.getData().zb_device_type === 'router') {
        detection.powerSource = 'AC';
      }
    }
    
    this.log(`[SHIM] Power source: ${detection.powerSource}`);
    
    // 3. Detect Tuya EF00
    for (const epId of detection.endpoints) {
      const endpoint = zclNode.endpoints[epId];
      if (endpoint?.clusters) {
        const hasTuya = endpoint.clusters.tuya || 
                       endpoint.clusters.tuyaManufacturerCluster || 
                       endpoint.clusters[0xEF00];
        
        if (hasTuya) {
          detection.hasTuyaEF00 = true;
          this.log(`[SHIM] Tuya EF00 detected on endpoint ${epId}`);
        }
        
        // Store all clusters
        const clusterNames = Object.keys(endpoint.clusters)
          .filter(c => c !== 'getClusterById' && c !== 'bind' && c !== 'unbind');
        
        detection.clusters[epId] = clusterNames;
      }
    }
    
    // 4. Detect USB outlet features (voltage, current, LED)
    if (detection.hasTuyaEF00) {
      // Try to read Tuya DPs to detect USB outlet
      try {
        const tuyaManager = this.device.tuyaEF00Manager;
        if (tuyaManager) {
          // Check for USB-specific DPs
          const usbDPs = [16, 17, 20]; // LED, Voltage, Current
          
          for (const dp of usbDPs) {
            // Check if DP exists (we can't read directly, but we can check settings)
            const settings = this.device.getSettings();
            if (settings && settings.tuya_dp_configuration) {
              const dpConfig = JSON.parse(settings.tuya_dp_configuration || '{}');
              if (dpConfig[dp]) {
                detection.tuyaDPs.push(dp);
              }
            }
          }
          
          if (detection.tuyaDPs.includes(17) || detection.tuyaDPs.includes(20)) {
            detection.hasUSB = true;
            detection.deviceType = 'usb_outlet';
            detection.features.push('measure_voltage', 'measure_current');
          }
          
          if (detection.tuyaDPs.includes(16)) {
            detection.features.push('led_mode');
          }
        }
      } catch (err) {
        this.log('[SHIM] Could not detect USB DPs:', err.message);
      }
    }
    
    // 5. Detect device type from clusters
    if (!detection.hasUSB) {
      // Check for electrical measurement cluster (plugs/outlets)
      for (const clusters of Object.values(detection.clusters)) {
        if (clusters.includes('electricalMeasurement') || 
            clusters.includes('haElectricalMeasurement') ||
            clusters.includes('metering')) {
          detection.deviceType = 'outlet_with_metering';
          detection.features.push('measure_power', 'meter_power');
        }
        
        if (clusters.includes('onOff')) {
          if (!detection.deviceType.includes('outlet')) {
            detection.deviceType = 'switch';
          }
        }
      }
    }
    
    // 6. Detect multi-endpoint switches
    const onOffEndpoints = detection.endpoints.filter(ep => {
      const clusters = detection.clusters[ep] || [];
      return clusters.includes('onOff');
    });
    
    if (onOffEndpoints.length > 1) {
      detection.deviceType = `switch_${onOffEndpoints.length}gang`;
      detection.features.push('multi_endpoint');
    }
    
    return detection;
  }
  
  /**
   * Calculate corrections needed based on detection
   */
  async calculateCorrections(detection) {
    const corrections = [];
    const currentCapabilities = this.device.getCapabilities();
    const driverId = this.device.driver?.id || 'unknown';
    
    this.log(`[SHIM] Current driver: ${driverId}`);
    this.log('[SHIM] Current capabilities:', currentCapabilities);
    
    // Correction 1: Remove battery from AC devices
    if (detection.powerSource === 'AC' && currentCapabilities.includes('measure_battery')) {
      corrections.push({
        type: 'remove',
        capability: 'measure_battery',
        reason: 'AC-powered device should not have battery capability',
      });
    }
    
    // Correction 2: Add USB outlet features if detected
    if (detection.hasUSB) {
      if (!currentCapabilities.includes('measure_voltage')) {
        corrections.push({
          type: 'add',
          capability: 'measure_voltage',
          reason: 'USB outlet detected (DP 17)',
        });
      }
      
      if (!currentCapabilities.includes('measure_current')) {
        corrections.push({
          type: 'add',
          capability: 'measure_current',
          reason: 'USB outlet detected (DP 20)',
        });
      }
      
      if (detection.tuyaDPs.includes(16) && !currentCapabilities.includes('led_mode')) {
        corrections.push({
          type: 'add',
          capability: 'led_mode',
          reason: 'USB outlet with LED control (DP 16)',
        });
      }
      
      // Rename onoff.button2 → onoff.usb2 if switch driver
      if (currentCapabilities.includes('onoff.button2') && !currentCapabilities.includes('onoff.usb2')) {
        corrections.push({
          type: 'rename',
          from: 'onoff.button2',
          to: 'onoff.usb2',
          reason: 'USB outlet should use onoff.usb2 instead of onoff.button2',
        });
      }
    }
    
    // Correction 3: Remove USB features if NOT USB outlet
    if (!detection.hasUSB && driverId.includes('usb')) {
      if (currentCapabilities.includes('measure_voltage')) {
        corrections.push({
          type: 'remove',
          capability: 'measure_voltage',
          reason: 'Not a USB outlet (no voltage DP detected)',
        });
      }
      
      if (currentCapabilities.includes('measure_current')) {
        corrections.push({
          type: 'remove',
          capability: 'measure_current',
          reason: 'Not a USB outlet (no current DP detected)',
        });
      }
    }
    
    // Correction 4: Add Tuya DP pool if EF00 detected
    if (detection.hasTuyaEF00) {
      for (let i = 1; i <= 12; i++) {
        const dpCap = `tuya_dp_${i}`;
        if (!currentCapabilities.includes(dpCap)) {
          corrections.push({
            type: 'add',
            capability: dpCap,
            reason: 'Tuya EF00 device - add DP pool',
            silent: true, // Don't log each DP add
          });
        }
      }
    }
    
    return corrections;
  }
  
  /**
   * Apply corrections
   */
  async applyCorrections(corrections) {
    for (const correction of corrections) {
      if (correction.silent) continue; // Skip logging for silent corrections
      
      this.log(`[SHIM] ${correction.type.toUpperCase()}: ${correction.capability || `${correction.from} → ${correction.to}`}`);
      this.log(`[SHIM]   Reason: ${correction.reason}`);
      
      try {
        if (correction.type === 'add') {
          await this.device.addCapability(correction.capability);
          this.log(`[SHIM] ✅ Added: ${correction.capability}`);
          
        } else if (correction.type === 'remove') {
          await this.device.removeCapability(correction.capability);
          this.log(`[SHIM] ✅ Removed: ${correction.capability}`);
          
        } else if (correction.type === 'rename') {
          // Rename = remove old + add new
          await this.device.addCapability(correction.to);
          await this.device.removeCapability(correction.from);
          this.log(`[SHIM] ✅ Renamed: ${correction.from} → ${correction.to}`);
        }
        
      } catch (err) {
        this.error('[SHIM] ❌ Failed to apply correction:', err.message);
      }
    }
    
    // Apply silent corrections (DP pool)
    const silentCorrections = corrections.filter(c => c.silent);
    if (silentCorrections.length > 0) {
      this.log(`[SHIM] Adding ${silentCorrections.length} DP pool capabilities...`);
      for (const correction of silentCorrections) {
        try {
          await this.device.addCapability(correction.capability);
        } catch (err) {
          // Ignore errors for DP pool (might already exist)
        }
      }
      this.log('[SHIM] ✅ DP pool capabilities added');
    }
  }
}

module.exports = HardwareDetectionShim;
