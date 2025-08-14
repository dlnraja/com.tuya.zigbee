/**
 * 🏠 Universal Tuya Zigbee - Homey App
 * Main application entry point with Full/Lite modes
 */

const { Log } = require('homey-log');
const { DriverLoader } = require('./lib/loader/discover');
const { FallbackHandler } = require('./lib/loader/fallback');

class UniversalTuyaZigbeeApp extends Log {
  constructor() {
    super({
      logLevel: process.env.TUYA_LOG_LEVEL || 'info',
      prefix: 'UniversalTuyaZigbee'
    });

    this.mode = process.env.TUYA_MODE || 'full'; // 'full' or 'lite'
    this.driverLoader = new DriverLoader(this);
    this.fallbackHandler = new FallbackHandler(this);
    
    this.log('🚀 Universal Tuya Zigbee App starting...');
    this.log(`📱 Mode: ${this.mode.toUpperCase()}`);
    this.log(`🏠 Homey SDK: ${Homey.manifest.sdk}`);
    this.log(`🔧 Compatibility: ${Homey.manifest.compatibility}`);
  }

  /**
   * App initialization
   */
  async onInit() {
    try {
      this.log('🔧 Initializing Universal Tuya Zigbee App...');
      
      // Initialize driver loader
      await this.driverLoader.init();
      
      // Load drivers based on mode
      const drivers = await this.loadDrivers();
      
      this.log(`✅ App initialized successfully with ${drivers.length} drivers`);
      this.log(`🎯 Mode: ${this.mode.toUpperCase()}`);
      
      // Set up health monitoring
      this.setupHealthMonitoring();
      
    } catch (error) {
      this.error('❌ App initialization failed:', error);
      await this.fallbackHandler.handleInitError(error);
    }
  }

  /**
   * Load drivers based on current mode
   */
  async loadDrivers() {
    try {
      if (this.mode === 'lite') {
        this.log('🔒 Loading LITE mode drivers (no heuristic flags)...');
        return await this.driverLoader.loadLiteDrivers();
      } else {
        this.log('🚀 Loading FULL mode drivers (all features)...');
        return await this.driverLoader.loadFullDrivers();
      }
    } catch (error) {
      this.error('❌ Driver loading failed:', error);
      return await this.fallbackHandler.loadFallbackDrivers();
    }
  }

  /**
   * Setup health monitoring
   */
  setupHealthMonitoring() {
    // Monitor app health every 5 minutes
    this.healthInterval = setInterval(async () => {
      try {
        const health = await this.checkHealth();
        if (!health.healthy) {
          this.warn('⚠️ App health check failed:', health);
        }
      } catch (error) {
        this.error('❌ Health check error:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Check app health
   */
  async checkHealth() {
    try {
      const drivers = await this.driverLoader.getLoadedDrivers();
      const totalDrivers = drivers.length;
      const healthyDrivers = drivers.filter(d => d.healthy).length;
      
      const health = {
        timestamp: new Date().toISOString(),
        healthy: healthyDrivers > 0,
        mode: this.mode,
        totalDrivers,
        healthyDrivers,
        healthPercentage: totalDrivers > 0 ? Math.round((healthyDrivers / totalDrivers) * 100) : 0,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };
      
      return health;
      
    } catch (error) {
      this.error('❌ Health check failed:', error);
      return {
        timestamp: new Date().toISOString(),
        healthy: false,
        error: error.message,
        mode: this.mode
      };
    }
  }

  /**
   * App cleanup
   */
  async onUninit() {
    try {
      this.log('🧹 Cleaning up Universal Tuya Zigbee App...');
      
      if (this.healthInterval) {
        clearInterval(this.healthInterval);
      }
      
      await this.driverLoader.cleanup();
      await this.fallbackHandler.cleanup();
      
      this.log('✅ App cleanup completed');
      
    } catch (error) {
      this.error('❌ App cleanup failed:', error);
    }
  }

  /**
   * Get app information
   */
  getAppInfo() {
    return {
      name: Homey.manifest.name.en,
      version: Homey.manifest.version,
      sdk: Homey.manifest.sdk,
      compatibility: Homey.manifest.compatibility,
      mode: this.mode,
      author: Homey.manifest.author.name,
      repository: Homey.manifest.repository
    };
  }

  /**
   * Get driver statistics
   */
  async getDriverStats() {
    try {
      const drivers = await this.driverLoader.getLoadedDrivers();
      
      const stats = {
        total: drivers.length,
        byType: {},
        byBrand: {},
        byCategory: {},
        capabilities: new Set(),
        clusters: new Set(),
        tuyaDPs: new Set()
      };
      
      for (const driver of drivers) {
        // Count by type
        const type = driver.type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        
        // Count by brand
        const brand = driver.brand || 'unknown';
        stats.byBrand[brand] = (stats.byBrand[brand] || 0) + 1;
        
        // Count by category
        const category = driver.category || 'unknown';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        
        // Collect capabilities
        if (driver.capabilities) {
          driver.capabilities.forEach(cap => stats.capabilities.add(cap));
        }
        
        // Collect clusters
        if (driver.clusters) {
          driver.clusters.forEach(cluster => stats.clusters.add(cluster));
        }
        
        // Collect Tuya DPs
        if (driver.tuyaDPs) {
          Object.keys(driver.tuyaDPs).forEach(dp => stats.tuyaDPs.add(dp));
        }
      }
      
      // Convert Sets to arrays for JSON serialization
      stats.capabilities = Array.from(stats.capabilities);
      stats.clusters = Array.from(stats.clusters);
      stats.tuyaDPs = Array.from(stats.tuyaDPs);
      
      return stats;
      
    } catch (error) {
      this.error('❌ Failed to get driver stats:', error);
      return { error: error.message };
    }
  }
}

// Export app instance
module.exports = UniversalTuyaZigbeeApp;