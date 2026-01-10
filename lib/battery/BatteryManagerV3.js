'use strict';

/**
 * Battery Manager V3 - Centralisé & Simple
 *
 * Basé sur:
 * - Audit V2 recommendations
 * - Patterns Xiaomi/Aqara apps
 * - Homey guidelines
 *
 * Priorité:
 * 1. Tuya DP (DP 4, 15, 14)
 * 2. ZCL Cluster 0x0001
 * 3. null (pas de valeur fictive)
 *
 * Intervals optimisés:
 * - Buttons: 12h (event-driven)
 * - Motion sensors: 4h
 * - Climate sensors: 2h
 * - Contact sensors: 4h
 */

class BatteryManagerV3 {

  static INTERVALS = {
    button: 43200,        // 12h
    remote: 43200,        // 12h
    sensor_motion: 14400, // 4h
    sensor_climate: 7200, // 2h
    sensor_contact: 14400,// 4h
    sensor_water: 14400,  // 4h
    default: 10800        // 3h fallback
  };

  constructor(device) {
    this.device = device;
    this.method = null;
    this.interval = null;
  }

  /**
   * Démarrer monitoring batterie
   */
  async startMonitoring() {
    this.device.log('[BATTERY-V3] Starting...');

    // Détecter type device
    const deviceType = this.detectDeviceType();
    this.device.log(`[BATTERY-V3] Device type: ${deviceType}`);

    // Interval adapté
    const intervalMs = BatteryManagerV3.INTERVALS[deviceType] || BatteryManagerV3.INTERVALS.default;
    this.device.log(`[BATTERY-V3] Polling interval: ${intervalMs / 1000}s (${intervalMs / 3600}h)`);

    // Méthode 1: Tuya DP
    if (await this.tryTuyaDP()) {
      this.method = 'tuya_dp';
      this.device.log('[BATTERY-V3] ✅ Method: Tuya DP');
      this.startPolling(intervalMs);
      return true;
    }

    // Méthode 2: ZCL Cluster 0x0001
    if (await this.tryZCL()) {
      this.method = 'zcl_0x0001';
      this.device.log('[BATTERY-V3] ✅ Method: ZCL 0x0001');
      this.startPolling(intervalMs);
      return true;
    }

    // Pas de batterie
    this.device.log('[BATTERY-V3] ⚠️ No battery method available');
    return false;
  }

  /**
   * Détecter type device
   */
  detectDeviceType() {
    const driverUri = this.device.driver?.id || '';

    if (driverUri.includes('button') || driverUri.includes('remote')) {
      return 'button';
    }
    if (driverUri.includes('motion') || driverUri.includes('pir') || driverUri.includes('radar')) {
      return 'sensor_motion';
    }
    if (driverUri.includes('climate') || driverUri.includes('temp') || driverUri.includes('humidity')) {
      return 'sensor_climate';
    }
    if (driverUri.includes('contact') || driverUri.includes('door')) {
      return 'sensor_contact';
    }
    if (driverUri.includes('water') || driverUri.includes('leak')) {
      return 'sensor_water';
    }

    return 'default';
  }

  /**
   * Essayer Tuya DP
   */
  async tryTuyaDP() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) return false;

      // Check Tuya cluster
      const tuyaCluster = endpoint.clusters.tuyaSpecific
        || endpoint.clusters.tuyaManufacturer
        || endpoint.clusters[0xEF00];

      if (!tuyaCluster) return false;

      // Subscribe à Tuya DP events (via TuyaEF00Manager)
      if (this.device.tuyaEF00Manager) {
        // DP 4 ou 15 = battery %
        this.device.tuyaEF00Manager.on('dp-4', (value) => {
          this.updateBattery(value);
        });
        this.device.tuyaEF00Manager.on('dp-15', (value) => {
          this.updateBattery(value);
        });

        // Request initial value
        await this.device.tuyaEF00Manager.requestDP(4).catch(() => { });
        await this.device.tuyaEF00Manager.requestDP(15).catch(() => { });
      }

      return true;
    } catch (err) {
      this.device.log('[BATTERY-V3] Tuya DP failed:', err.message);
      return false;
    }
  }

  /**
   * Essayer ZCL 0x0001
   */
  async tryZCL() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint?.clusters?.genPowerCfg) return false;

      // Subscribe à attribute reports
      endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', (value) => {
        const battery = Math.round(value / 2);
        this.updateBattery(battery);
      });

      // Configure reporting (min 1h, max 12h, ±2%)
      await endpoint.clusters.genPowerCfg.configureReporting({
        attributes: [{
          id: 33, // batteryPercentageRemaining
          minimumReportInterval: 3600,
          maximumReportInterval: 43200,
          reportableChange: 2
        }]
      }).catch(() => { });

      // Read initial value
      const { batteryPercentageRemaining } = await endpoint.clusters.genPowerCfg.readAttributes(['batteryPercentageRemaining']).catch(() => ({}));
      if (batteryPercentageRemaining !== undefined) {
        const battery = Math.round(batteryPercentageRemaining / 2);
        this.updateBattery(battery);
      }

      return true;
    } catch (err) {
      this.device.log('[BATTERY-V3] ZCL failed:', err.message);
      return false;
    }
  }

  /**
   * Update capability
   */
  updateBattery(value) {
    if (typeof value !== 'number' || value < 0 || value > 100) {
      this.device.log('[BATTERY-V3] Invalid value:', value);
      return;
    }

    const rounded = Math.round(value);
    this.device.log(`[BATTERY-V3] Battery: ${rounded}%`);

    if (this.device.hasCapability('measure_battery')) {
      this.device.setCapabilityValue('measure_battery', parseFloat(rounded)).catch(this.device.error);
    }

    // Alarm si <20%
    if (this.device.hasCapability('alarm_battery')) {
      this.device.setCapabilityValue('alarm_battery', rounded < 20).catch(this.device.error);
    }
  }

  /**
   * Start polling
   */
  startPolling(intervalMs) {
    if (this.interval) {
      this.device.homey.clearInterval(this.interval);
    }

    this.interval = this.device.homey.setInterval(async () => {
      if (this.method === 'tuya_dp') {
        if (this.device.tuyaEF00Manager) {
          await this.device.tuyaEF00Manager.requestDP(4).catch(() => { });
          await this.device.tuyaEF00Manager.requestDP(15).catch(() => { });
        }
      } else if (this.method === 'zcl_0x0001') {
        try {
          const endpoint = this.device.zclNode?.endpoints?.[1];
          if (endpoint?.clusters?.genPowerCfg) {
            const { batteryPercentageRemaining } = await endpoint.clusters.genPowerCfg.readAttributes(['batteryPercentageRemaining']).catch(() => ({}));
            if (batteryPercentageRemaining !== undefined) {
              this.updateBattery(Math.round(batteryPercentageRemaining / 2));
            }
          }
        } catch (err) {
          // Silent fail (device asleep)
        }
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.interval) {
      this.device.homey.clearInterval(this.interval);
      this.interval = null;
    }
    this.device.log('[BATTERY-V3] Stopped');
  }
}

module.exports = BatteryManagerV3;
