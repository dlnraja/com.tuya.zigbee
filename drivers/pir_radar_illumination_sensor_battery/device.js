'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

class PirRadarIlluminationSensorBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('pir_radar_illumination_sensor_battery initialized');

    // Call parent
    await super.onNodeInit({ zclNode });
    
    // Initialiser le système de batterie intelligent V2 (Homey Persistent Storage)
    try {
      const BatteryIntelligenceSystemV2 = require('../../utils/battery-intelligence-system-v2');
      this.batterySystem = new BatteryIntelligenceSystemV2(this);
      await this.batterySystem.load();
      this.log('✅ Battery Intelligence System V2 loaded (Homey Storage)');
    } catch (err) {
      this.log('⚠️  Battery Intelligence System V2 not available:', err.message);
      this.log('   → Fallback to basic mode will be used');
    }

    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('pir_radar_illumination_sensor_battery');
    const tuyaInitialized = await TuyaClusterHandler.init(this, zclNode, deviceType);
    
    if (tuyaInitialized) {
      this.log('✅ Tuya cluster handler initialized for type:', deviceType);
    } else {
      this.log('⚠️  No Tuya cluster found, using standard Zigbee');
      
      // Fallback to standard cluster handling if needed
      await this.registerStandardCapabilities();
    }

    // Mark device as available
    await this.setAvailable();
  }

  /**
   * Register standard Zigbee capabilities (fallback)
   * Fixed v2.15.17 - Added motion + illuminance + IAS Zone enrollment
   * v2.15.18 - Intelligent Battery System with learning
   */
  async registerStandardCapabilities() {
    const { zclNode } = this;
    
    // Battery - Intelligent System with learning
    if (this.hasCapability('measure_battery')) {
      try {
        // Récupérer le manufacturerName du device
        const manufacturerName = this.getData().manufacturerName || 'unknown';
        this.log('Device manufacturer:', manufacturerName);
        
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: async (value) => {
            this.log('🔋 Battery raw value:', value);
            
            // Essayer de récupérer voltage + current si disponibles
            let voltage = null;
            let current = null;
            
            try {
              if (zclNode.endpoints[1] && zclNode.endpoints[1].clusters.powerConfiguration) {
                const attrs = await zclNode.endpoints[1].clusters.powerConfiguration.readAttributes([
                  'batteryVoltage',
                  'batteryCurrentCapacity'
                ]).catch(() => ({}));
                
                if (attrs.batteryVoltage) {
                  voltage = attrs.batteryVoltage / 10; // Convertir en volts
                  this.log('🔋 Battery voltage:', voltage, 'V');
                }
                
                if (attrs.batteryCurrentCapacity) {
                  current = attrs.batteryCurrentCapacity / 1000; // Convertir en mA
                  this.log('🔋 Battery current:', current, 'mA');
                }
              }
            } catch (err) {
              // Mesures physiques non disponibles, on continue sans
              this.log('ℹ️  Physical measurements not available:', err.message);
            }
            
            // ========== CASCADE DE FALLBACK INTELLIGENT ==========
            
            // NIVEAU 1: Système intelligent V2 (meilleure option)
            if (this.batterySystem) {
              try {
                const batteryType = this.getSetting('battery_type') || 'CR2032';
                const analysis = await this.batterySystem.analyzeValue(
                  value, 
                  manufacturerName, 
                  voltage, 
                  current, 
                  batteryType
                );
                
                this.log(`🔋 Intelligent V2 analysis:`, {
                  percent: analysis.percent,
                  confidence: analysis.confidence,
                  method: analysis.method,
                  source: analysis.source
                });
                
                // Sauvegarder périodiquement si en mode learning
                if (analysis.needsLearning) {
                  await this.batterySystem.save().catch(err => {
                    this.error('Failed to save battery learning:', err);
                  });
                }
                
                return analysis.percent;
              } catch (err) {
                this.error('⚠️  Battery Intelligence V2 failed:', err.message);
                // Continue vers fallback niveau 2
              }
            }
            
            // NIVEAU 2: Calcul voltage si disponible (sans système intelligent)
            if (voltage) {
              const batteryType = this.getSetting('battery_type') || 'CR2032';
              const voltagePercent = this.calculateSimpleVoltagePercent(voltage, batteryType);
              if (voltagePercent !== null) {
                this.log('🔋 Using simple voltage calculation:', voltagePercent);
                return voltagePercent;
              }
            }
            
            // NIVEAU 3: Détection intelligente du format de données
            let percent;
            if (value <= 100) {
              // Format 0-100
              percent = value;
              this.log('🔋 Detected format: 0-100');
            } else if (value <= 200) {
              // Format 0-200
              percent = value / 2;
              this.log('🔋 Detected format: 0-200');
            } else if (value <= 255) {
              // Format 0-255
              percent = Math.round(value / 2.55);
              this.log('🔋 Detected format: 0-255');
            } else {
              // Format inconnu - conservateur
              percent = Math.min(100, value);
              this.log('⚠️  Unknown format, using conservative approach');
            }
            
            return Math.max(0, Math.min(100, Math.round(percent)));
          },
          getParser: async (value) => {
            const manufacturerName = this.getData().manufacturerName || 'unknown';
            
            if (this.batterySystem) {
              const batteryType = this.getSetting('battery_type') || 'CR2032';
              const analysis = this.batterySystem.analyzeValue(value, manufacturerName, null, batteryType);
              return analysis.percent;
            }
            
            // Fallback
            if (value <= 100) {
              return Math.max(0, Math.min(100, value));
            } else {
              return Math.max(0, Math.min(100, value / 2));
            }
          }
        });
        this.log('✅ Battery capability registered with Intelligent System');
      } catch (err) {
        this.log('Battery capability failed:', err.message);
      }
    }

    // Illuminance Measurement
    if (this.hasCapability('measure_luminance')) {
      try {
        this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT);
        this.log('✅ Illuminance cluster registered');
      } catch (err) {
        this.log('Illuminance cluster failed:', err.message);
      }
    }

    // Motion via IAS Zone - FIXED v2.15.17
    if (this.hasCapability('alarm_motion')) {
      try {
        this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
          get: 'zoneStatus',
          report: 'zoneStatus',
          reportParser: value => {
            this.log('Motion IAS Zone status:', value);
            return (value & 1) === 1;
          }
        });
        
        // IAS Zone enrollment - Use correct Homey Zigbee API
        const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)];
        if (endpoint && endpoint.clusters.iasZone) {
          try {
            // Method 1: Write IAS CIE Address
            this.log('Writing IAS CIE address for motion...');
            await endpoint.clusters.iasZone.writeAttributes({
              iasCieAddress: zclNode.ieeeAddress
            });
            this.log('✅ IAS CIE address written');
            
            // Method 2: Configure reporting
            await endpoint.clusters.iasZone.configureReporting({
              zoneStatus: {
                minInterval: 0,
                maxInterval: 300,
                minChange: 1
              }
            });
            this.log('✅ IAS Zone reporting configured');
            
            // Method 3: Listen for notifications
            endpoint.clusters.iasZone.on('zoneStatusChangeNotification', (payload) => {
              this.log('IAS Zone motion notification:', payload);
              if (this.hasCapability('alarm_motion')) {
                const motionDetected = (payload.zoneStatus & 1) === 1;
                this.setCapabilityValue('alarm_motion', motionDetected).catch(this.error);
              }
            });
            this.log('✅ IAS Zone motion listener registered');
            
          } catch (enrollErr) {
            this.log('IAS Zone enrollment failed:', enrollErr.message);
          }
        }
      } catch (err) {
        this.log('IAS Zone motion failed:', err.message);
      }
    }
  }

  /**
   * Calcul simple de voltage (fallback sans système intelligent)
   */
  calculateSimpleVoltagePercent(voltage, batteryType) {
    // Courbes simplifiées
    const curves = {
      'CR2032': { nominal: 3.0, cutoff: 2.0 },
      'CR2450': { nominal: 3.0, cutoff: 2.0 },
      'CR2477': { nominal: 3.0, cutoff: 2.0 },
      'AAA': { nominal: 1.5, cutoff: 0.8 },
      'AA': { nominal: 1.5, cutoff: 0.8 }
    };
    
    const curve = curves[batteryType];
    if (!curve) return null;
    
    if (voltage >= curve.nominal) return 100;
    if (voltage <= curve.cutoff) return 0;
    
    // Interpolation linéaire simple
    const range = curve.nominal - curve.cutoff;
    const position = voltage - curve.cutoff;
    return Math.round((position / range) * 100);
  }

  async onDeleted() {
    this.log('pir_radar_illumination_sensor_battery deleted');
    
    // Sauvegarder une dernière fois le système de batterie
    if (this.batterySystem) {
      try {
        await this.batterySystem.save();
        this.log('✅ Battery Intelligence saved before deletion');
      } catch (err) {
        this.error('Failed to save Battery Intelligence on deletion:', err);
      }
    }
  }

}

module.exports = PirRadarIlluminationSensorBatteryDevice;
