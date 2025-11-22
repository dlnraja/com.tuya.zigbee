'use strict';

/**
 * BATTERY MONITORING SYSTEM
 * Système intelligent de monitoring batterie pour tous les drivers
 */

class BatteryMonitoringSystem {
  constructor(device) {
    this.device = device;
    this.thresholds = {
      critical: 10,
      low: 20,
      warning: 30,
      good: 50,
      excellent: 80
    };
    
    this.batteryTypes = {
      'CR2032': { voltage: 3.0, capacity: 225, life: '2-3 years' },
      'CR2450': { voltage: 3.0, capacity: 620, life: '3-5 years' },
      'CR123A': { voltage: 3.0, capacity: 1500, life: '3-5 years' },
      'AAA': { voltage: 1.5, capacity: 1200, life: '1-2 years' },
      'AA': { voltage: 1.5, capacity: 2850, life: '2-4 years' },
      '9V': { voltage: 9.0, capacity: 565, life: '1-2 years' }
    };

    this.lastBatteryLevel = null;
    this.checkInterval = null;
  }

  /**
   * Initialiser le monitoring
   */
  async init() {
    try {
      // Vérifier si le device a measure_battery
      if (!this.device.hasCapability('measure_battery')) {
        return false;
      }

      // Écouter les changements de batterie
      this.device.registerCapabilityListener('measure_battery', async (value) => {
        await this.onBatteryChanged(value);
      });

      // Check initial
      const currentLevel = this.device.getCapabilityValue('measure_battery');
      if (currentLevel !== null && currentLevel !== undefined) {
        await this.checkBatteryLevel(currentLevel);
      }

      // Monitoring périodique (toutes les 6 heures)
      this.startPeriodicCheck();

      this.device.log('[OK] Battery monitoring system initialized');
      return true;
    } catch (err) {
      this.device.error('Battery monitoring init error:', err);
      return false;
    }
  }

  /**
   * Check niveau batterie
   */
  async checkBatteryLevel(level) {
    try {
      if (level === null || level === undefined) return;

      const previousLevel = this.lastBatteryLevel;
      this.lastBatteryLevel = level;

      // Déterminer le statut
      let status = 'excellent';
      if (level <= this.thresholds.critical) {
        status = 'critical';
      } else if (level <= this.thresholds.low) {
        status = 'low';
      } else if (level <= this.thresholds.warning) {
        status = 'warning';
      } else if (level <= this.thresholds.good) {
        status = 'good';
      }

      // Actions selon le statut
      switch (status) {
      case 'critical':
        await this.device.setWarning(`[WARN] CRITICAL: Battery ${level}% - Replace immediately!`);
        this.device.log(`🔴 Battery CRITICAL: ${level}%`);
          
        // Trigger flow
        if (this.device.homey && this.device.homey.flow) {
          try {
            await this.device.homey.flow.getDeviceTriggerCard('battery_critical')
              .trigger(this.device, { battery: level })
              .catch(() => {});
          } catch (e) {}
        }
        break;

      case 'low':
        await this.device.setWarning(`Battery low: ${level}% - Replace soon`);
        this.device.log(`🟠 Battery LOW: ${level}%`);
          
        // Trigger flow low_battery_alert
        if (this.device.homey && this.device.homey.flow) {
          try {
            await this.device.homey.flow.getDeviceTriggerCard('low_battery_alert')
              .trigger(this.device, {
                device: this.device.getName(),
                battery: level,
                battery_type: this.getBatteryTypeString()
              })
              .catch(() => {});
          } catch (e) {}
        }
        break;

      case 'warning':
        this.device.log(`🟡 Battery WARNING: ${level}%`);
        break;

      default:
        // Unset warning si batterie bonne
        try {
          await this.device.unsetWarning();
        } catch (e) {}
        this.device.log(`🟢 Battery ${status}: ${level}%`);
      }

      // Détection remplacement batterie
      if (previousLevel !== null && previousLevel < 30 && level > 80) {
        this.device.log('[BATTERY] Battery replacement detected!');
        
        if (this.device.homey && this.device.homey.flow) {
          try {
            await this.device.homey.flow.getDeviceTriggerCard('device_battery_changed')
              .trigger(this.device, {
                device: this.device.getName(),
                old_battery: previousLevel,
                new_battery: level
              })
              .catch(() => {});
          } catch (e) {}
        }

        // Clear warnings
        try {
          await this.device.unsetWarning();
        } catch (e) {}
      }

      // Estimation durée restante
      if (level <= this.thresholds.low) {
        const estimatedDays = Math.floor((level / this.thresholds.low) * 30);
        this.device.log(`⏱️  Estimated remaining: ~${estimatedDays} days`);
      }

    } catch (err) {
      this.device.error('Battery level check error:', err);
    }
  }

  /**
   * Handler changement batterie
   */
  async onBatteryChanged(newLevel) {
    await this.checkBatteryLevel(newLevel);
  }

  /**
   * Get battery type string
   */
  getBatteryTypeString() {
    try {
      const settings = this.device.getSettings();
      if (settings && settings.battery_type) {
        return settings.battery_type;
      }

      // Fallback: essayer de détecter depuis driver
      const driverData = this.device.driver?.manifest;
      if (driverData && driverData.energy && driverData.energy.batteries) {
        return driverData.energy.batteries.join(', ');
      }

      return 'Unknown';
    } catch (err) {
      return 'Unknown';
    }
  }

  /**
   * Monitoring périodique
   */
  startPeriodicCheck() {
    // Clear existing interval
    if (this.checkInterval) {
      this.device.homey.clearInterval(this.checkInterval);
    }

    // Check toutes les 6 heures
    this.checkInterval = this.device.homey.setInterval(async () => {
      try {
        const level = this.device.getCapabilityValue('measure_battery');
        if (level !== null && level !== undefined) {
          await this.checkBatteryLevel(level);
        }
      } catch (err) {
        this.device.error('Periodic battery check error:', err);
      }
    }, 6 * 60 * 60 * 1000); // 6 heures
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.checkInterval) {
      this.device.homey.clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

module.exports = BatteryMonitoringSystem;
