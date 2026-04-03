'use strict';

/**
 * SystemLogsCollector - Collecte les logs système et autres logs utiles
 * pour inclusion dans les rapports diagnostics de l'app
 */

class SystemLogsCollector {
  
  constructor(homey) {
    this.homey = homey;
    this.log = console.log.bind(console);
    this.error = console.error.bind(console);
  }
  
  /**
   * Collecte TOUS les logs système et utiles
   */
  async collectAllLogs() {
    this.log('📊 [SYSTEM LOGS] Collecting all system logs...');
    
    const allLogs = {
      timestamp: new Date().toISOString(),
      homeyInfo: await this.collectHomeyInfo(),
      systemLogs: await this.collectSystemLogs(),
      zigbeeLogs: await this.collectZigbeeLogs(),
      appLogs: await this.collectAppLogs(),
      deviceLogs: await this.collectDeviceLogs(),
      networkInfo: await this.collectNetworkInfo(),
      performanceInfo: await this.collectPerformanceInfo(),
      errorLogs: await this.collectErrorLogs()
    };
    
    this.log('✅ [SYSTEM LOGS] All logs collected');
    
    return allLogs;
  }
  
  /**
   * Collecte les informations Homey
   */
  async collectHomeyInfo() {
    this.log('   📱 Collecting Homey info...');
    
    const info = {
      version: this.homey.version || 'unknown',
      platform: this.homey.platform || 'unknown',
      platformVersion: this.homey.platformVersion || 'unknown',
      model: 'unknown',
      id: 'unknown'
    };
    
    try {
      // Essayer de récupérer plus d'infos via API
      const systemInfo = await this.homey.api.system.getInfo();
      if (systemInfo) {
        info.model = systemInfo.model || info.model;
        info.id = systemInfo.id || info.id;
        info.hostname = systemInfo.hostname || 'unknown';
        info.uptime = systemInfo.uptime || 0;
      }
    } catch (err) {
      this.log('   ⚠️  Could not get extended system info:', err.message);
    }
    
    return info;
  }
  
  /**
   * Collecte les logs système généraux
   */
  async collectSystemLogs() {
    this.log('   📋 Collecting system logs...');
    
    const logs = {
      recent: [],
      errors: [],
      warnings: []
    };
    
    try {
      // Essayer de récupérer les logs via l'API Homey
      if (this.homey.api && this.homey.api.system) {
        const systemLogs = await this.homey.api.system.getSystemLog({ limit: 100 });
        
        if (systemLogs && Array.isArray(systemLogs)) {
          logs.recent = systemLogs.slice(0, 50).map(log => ({
            timestamp: log.timestamp || log.time,
            level: log.level || log.type,
            message: log.message || log.msg,
            source: log.source || log.app
          }));
          
          logs.errors = systemLogs.filter(l => 
            (l.level || l.type) === 'error'
          ).slice(0, 20);
          
          logs.warnings = systemLogs.filter(l => 
            (l.level || l.type) === 'warning'
          ).slice(0, 20);
        }
      }
    } catch (err) {
      this.log('   ⚠️  Could not get system logs:', err.message);
      logs.error = err.message;
    }
    
    return logs;
  }
  
  /**
   * Collecte les logs Zigbee spécifiques
   */
  async collectZigbeeLogs() {
    this.log('   🔷 Collecting Zigbee logs...');
    
    const logs = {
      devices: [],
      network: {},
      errors: []
    };
    
    try {
      // Récupérer les devices Zigbee
      const devices = await this.homey.drivers.getDevices();
      
      for (const device of Object.values(devices)) {
        if (device.driver && device.driver.id && 
            device.driver.manifest && device.driver.manifest.connectivity) {
          
          const connectivity = device.driver.manifest.connectivity;
          if (connectivity.includes('zigbee')) {
            logs.devices.push({
              id: device.id,
              name: device.name,
              driverId: device.driver.id,
              available: device.available,
              lastSeen: device.lastSeen || 'unknown',
              zigbeeInfo: {
                ieee: device.data?.ieee || 'unknown',
                nodeId: device.data?.nodeId || 'unknown'
              }
            });
          }
        }
      }
      
      // Tenter de récupérer info réseau Zigbee
      if (this.homey.zigbee) {
        logs.network = {
          channel: this.homey.zigbee.channel || 'unknown',
          panId: this.homey.zigbee.panId || 'unknown',
          extendedPanId: this.homey.zigbee.extendedPanId || 'unknown'
        };
      }
      
    } catch (err) {
      this.log('   ⚠️  Could not get Zigbee logs:', err.message);
      logs.error = err.message;
    }
    
    return logs;
  }
  
  /**
   * Collecte les logs de l'app actuelle
   */
  async collectAppLogs() {
    this.log('   📱 Collecting app logs...');
    
    const logs = {
      appId: this.homey.manifest.id,
      version: this.homey.manifest.version,
      recentLogs: [],
      errors: [],
      stats: {}
    };
    
    try {
      // Récupérer les logs de l'app
      if (this.homey.api && this.homey.api.apps) {
        const appLogs = await this.homey.api.apps.getAppLogs({
          uri: `app:${this.homey.manifest.id}`,
          limit: 200
        });
        
        if (appLogs && Array.isArray(appLogs)) {
          logs.recentLogs = appLogs.slice(0, 100).map(log => ({
            timestamp: log.timestamp || log.time,
            level: log.level || 'log',
            message: log.message || log.msg,
            data: log.data
          }));
          
          logs.errors = appLogs.filter(l => 
            (l.level || 'log') === 'error'
          ).slice(0, 30);
          
          // Statistiques
          logs.stats = {
            total: appLogs.length,
            errors: appLogs.filter(l => (l.level || 'log') === 'error').length,
            warnings: appLogs.filter(l => (l.level || 'log') === 'warn').length,
            info: appLogs.filter(l => (l.level || 'log') === 'log').length
          };
        }
      }
    } catch (err) {
      this.log('   ⚠️  Could not get app logs:', err.message);
      logs.error = err.message;
    }
    
    return logs;
  }
  
  /**
   * Collecte les logs par device
   */
  async collectDeviceLogs() {
    this.log('   🔧 Collecting device logs...');
    
    const logs = {
      devices: [],
      problemDevices: [],
      offlineDevices: []
    };
    
    try {
      const devices = await this.homey.drivers.getDevices();
      
      for (const device of Object.values(devices)) {
        const deviceLog = {
          id: device.id,
          name: device.name,
          driverId: device.driver?.id || 'unknown',
          available: device.available,
          class: device.class,
          capabilities: device.capabilities || [],
          capabilityValues: {}
        };
        
        // Récupérer les valeurs des capabilities
        for (const cap of deviceLog.capabilities) {
          try {
            deviceLog.capabilityValues[cap] = await device.getCapabilityValue(cap);
          } catch (err) {
            deviceLog.capabilityValues[cap] = `ERROR: ${err.message}`;
          }
        }
        
        logs.devices.push(deviceLog);
        
        // Identifier devices à problèmes
        if (!device.available) {
          logs.offlineDevices.push(deviceLog);
        }
        
        // Devices avec erreurs dans capabilities
        const hasErrors = Object.values(deviceLog.capabilityValues).some(v => 
          typeof v === 'string' && v.startsWith('ERROR:')
        );
        
        if (hasErrors) {
          logs.problemDevices.push(deviceLog);
        }
      }
      
    } catch (err) {
      this.log('   ⚠️  Could not get device logs:', err.message);
      logs.error = err.message;
    }
    
    return logs;
  }
  
  /**
   * Collecte les informations réseau
   */
  async collectNetworkInfo() {
    this.log('   🌐 Collecting network info...');
    
    const info = {
      wifi: {},
      ethernet: {},
      connectivity: 'unknown'
    };
    
    try {
      if (this.homey.api && this.homey.api.system) {
        const networkInfo = await this.homey.api.system.getNetworkInfo();
        
        if (networkInfo) {
          info.wifi = networkInfo.wifi || {};
          info.ethernet = networkInfo.ethernet || {};
          info.connectivity = networkInfo.connectivity || 'unknown';
        }
      }
    } catch (err) {
      this.log('   ⚠️  Could not get network info:', err.message);
      info.error = err.message;
    }
    
    return info;
  }
  
  /**
   * Collecte les informations de performance
   */
  async collectPerformanceInfo() {
    this.log('   ⚡ Collecting performance info...');
    
    const info = {
      memory: {},
      cpu: {},
      storage: {}
    };
    
    try {
      if (this.homey.api && this.homey.api.system) {
        // Memory
        try {
          const memInfo = await this.homey.api.system.getMemoryInfo();
          if (memInfo) {
            info.memory = {
              total: memInfo.total,
              free: memInfo.free,
              used: memInfo.used,
              percentUsed: ((memInfo.used / memInfo.total) * 100).toFixed(2) + '%'
            };
          }
        } catch (err) {
          info.memory.error = err.message;
        }
        
        // CPU
        try {
          const cpuInfo = await this.homey.api.system.getCpuInfo();
          if (cpuInfo) {
            info.cpu = {
              usage: cpuInfo.usage,
              temperature: cpuInfo.temperature,
              cores: cpuInfo.cores
            };
          }
        } catch (err) {
          info.cpu.error = err.message;
        }
        
        // Storage
        try {
          const storageInfo = await this.homey.api.system.getStorageInfo();
          if (storageInfo) {
            info.storage = {
              total: storageInfo.total,
              free: storageInfo.free,
              used: storageInfo.used,
              percentUsed: ((storageInfo.used / storageInfo.total) * 100).toFixed(2) + '%'
            };
          }
        } catch (err) {
          info.storage.error = err.message;
        }
      }
    } catch (err) {
      this.log('   ⚠️  Could not get performance info:', err.message);
      info.error = err.message;
    }
    
    return info;
  }
  
  /**
   * Collecte les logs d'erreurs critiques
   */
  async collectErrorLogs() {
    this.log('   ❌ Collecting error logs...');
    
    const logs = {
      criticalErrors: [],
      recentErrors: [],
      errorPatterns: {}
    };
    
    try {
      if (this.homey.api && this.homey.api.system) {
        const errorLogs = await this.homey.api.system.getSystemLog({
          level: 'error',
          limit: 100
        });
        
        if (errorLogs && Array.isArray(errorLogs)) {
          logs.recentErrors = errorLogs.slice(0, 50).map(log => ({
            timestamp: log.timestamp,
            message: log.message,
            source: log.source,
            stack: log.stack
          }));
          
          // Identifier erreurs critiques
          logs.criticalErrors = errorLogs.filter(log => 
            log.message && (
              log.message.includes('crash') ||
              log.message.includes('fatal') ||
              log.message.includes('critical')
            )
          ).slice(0, 20);
          
          // Patterns d'erreurs
          const errorMessages = errorLogs.map(l => l.message).filter(Boolean);
          logs.errorPatterns = this.analyzeErrorPatterns(errorMessages);
        }
      }
    } catch (err) {
      this.log('   ⚠️  Could not get error logs:', err.message);
      logs.error = err.message;
    }
    
    return logs;
  }
  
  /**
   * Analyse les patterns d'erreurs
   */
  analyzeErrorPatterns(messages) {
    const patterns = {};
    
    for (const msg of messages) {
      // Extraire le type d'erreur (première partie avant :)
      const match = msg.match(/^([^:]+):/);
      if (match) {
        const errorType = match[1].trim();
        patterns[errorType] = (patterns[errorType] || 0) + 1;
      }
    }
    
    return patterns;
  }
  
  /**
   * Formate tous les logs pour inclusion dans rapport diagnostic
   */
  async formatForDiagnosticReport() {
    this.log('📊 [SYSTEM LOGS] Formatting logs for diagnostic report...');
    
    const allLogs = await this.collectAllLogs();
    
    const report = [];
    
    report.push('═'.repeat(80));
    report.push('📊 SYSTEM LOGS - COMPREHENSIVE DIAGNOSTIC REPORT');
    report.push('═'.repeat(80));
    report.push('');
    report.push(`Generated: ${allLogs.timestamp}`);
    report.push('');
    
    // Homey Info
    report.push('─'.repeat(80));
    report.push('📱 HOMEY INFORMATION');
    report.push('─'.repeat(80));
    report.push(`Version: ${allLogs.homeyInfo.version}`);
    report.push(`Platform: ${allLogs.homeyInfo.platform} ${allLogs.homeyInfo.platformVersion}`);
    report.push(`Model: ${allLogs.homeyInfo.model}`);
    report.push(`ID: ${allLogs.homeyInfo.id}`);
    report.push(`Hostname: ${allLogs.homeyInfo.hostname || 'unknown'}`);
    report.push(`Uptime: ${this.formatUptime(allLogs.homeyInfo.uptime || 0)}`);
    report.push('');
    
    // System Logs
    report.push('─'.repeat(80));
    report.push('📋 SYSTEM LOGS (Recent 20)');
    report.push('─'.repeat(80));
    if (allLogs.systemLogs.recent && allLogs.systemLogs.recent.length > 0) {
      allLogs.systemLogs.recent.slice(0, 20).forEach(log => {
        report.push(`[${log.timestamp}] [${log.level}] ${log.source || 'system'}: ${log.message}`);
      });
    } else {
      report.push('No system logs available');
    }
    report.push('');
    
    // System Errors
    if (allLogs.systemLogs.errors && allLogs.systemLogs.errors.length > 0) {
      report.push('─'.repeat(80));
      report.push(`❌ SYSTEM ERRORS (${allLogs.systemLogs.errors.length})`);
      report.push('─'.repeat(80));
      allLogs.systemLogs.errors.slice(0, 10).forEach(log => {
        report.push(`[${log.timestamp}] ${log.message}`);
      });
      report.push('');
    }
    
    // Zigbee Info
    report.push('─'.repeat(80));
    report.push('🔷 ZIGBEE INFORMATION');
    report.push('─'.repeat(80));
    report.push(`Network Channel: ${allLogs.zigbeeLogs.network.channel || 'unknown'}`);
    report.push(`PAN ID: ${allLogs.zigbeeLogs.network.panId || 'unknown'}`);
    report.push(`Extended PAN ID: ${allLogs.zigbeeLogs.network.extendedPanId || 'unknown'}`);
    report.push(`Zigbee Devices: ${allLogs.zigbeeLogs.devices.length}`);
    report.push('');
    
    // App Logs
    report.push('─'.repeat(80));
    report.push('📱 APP LOGS');
    report.push('─'.repeat(80));
    report.push(`App: ${allLogs.appLogs.appId} v${allLogs.appLogs.version}`);
    if (allLogs.appLogs.stats) {
      report.push(`Total Logs: ${allLogs.appLogs.stats.total}`);
      report.push(`Errors: ${allLogs.appLogs.stats.errors}`);
      report.push(`Warnings: ${allLogs.appLogs.stats.warnings}`);
    }
    report.push('');
    
    // Recent App Logs
    if (allLogs.appLogs.recentLogs && allLogs.appLogs.recentLogs.length > 0) {
      report.push('Recent App Logs (Last 15):');
      allLogs.appLogs.recentLogs.slice(0, 15).forEach(log => {
        report.push(`[${log.timestamp}] [${log.level}] ${log.message}`);
      });
      report.push('');
    }
    
    // App Errors
    if (allLogs.appLogs.errors && allLogs.appLogs.errors.length > 0) {
      report.push(`❌ APP ERRORS (${allLogs.appLogs.errors.length}):`);
      allLogs.appLogs.errors.slice(0, 10).forEach(log => {
        report.push(`[${log.timestamp}] ${log.message}`);
      });
      report.push('');
    }
    
    // Device Status
    report.push('─'.repeat(80));
    report.push('🔧 DEVICE STATUS');
    report.push('─'.repeat(80));
    report.push(`Total Devices: ${allLogs.deviceLogs.devices.length}`);
    report.push(`Offline Devices: ${allLogs.deviceLogs.offlineDevices.length}`);
    report.push(`Problem Devices: ${allLogs.deviceLogs.problemDevices.length}`);
    report.push('');
    
    // Offline Devices
    if (allLogs.deviceLogs.offlineDevices.length > 0) {
      report.push('⚠️  OFFLINE DEVICES:');
      allLogs.deviceLogs.offlineDevices.forEach(dev => {
        report.push(`   • ${dev.name} (${dev.driverId})`);
      });
      report.push('');
    }
    
    // Network Info
    report.push('─'.repeat(80));
    report.push('🌐 NETWORK INFORMATION');
    report.push('─'.repeat(80));
    report.push(`Connectivity: ${allLogs.networkInfo.connectivity}`);
    if (allLogs.networkInfo.wifi && allLogs.networkInfo.wifi.connected) {
      report.push('WiFi: Connected');
      report.push(`  SSID: ${allLogs.networkInfo.wifi.ssid || 'unknown'}`);
      report.push(`  Signal: ${allLogs.networkInfo.wifi.signal || 'unknown'}`);
    }
    report.push('');
    
    // Performance Info
    report.push('─'.repeat(80));
    report.push('⚡ PERFORMANCE INFORMATION');
    report.push('─'.repeat(80));
    if (allLogs.performanceInfo.memory.total) {
      report.push(`Memory: ${allLogs.performanceInfo.memory.percentUsed} used`);
      report.push(`  Total: ${this.formatBytes(allLogs.performanceInfo.memory.total)}`);
      report.push(`  Used: ${this.formatBytes(allLogs.performanceInfo.memory.used)}`);
      report.push(`  Free: ${this.formatBytes(allLogs.performanceInfo.memory.free)}`);
    }
    if (allLogs.performanceInfo.cpu.usage !== undefined) {
      report.push(`CPU Usage: ${allLogs.performanceInfo.cpu.usage}%`);
    }
    if (allLogs.performanceInfo.storage.total) {
      report.push(`Storage: ${allLogs.performanceInfo.storage.percentUsed} used`);
    }
    report.push('');
    
    // Error Patterns
    if (allLogs.errorLogs.errorPatterns && Object.keys(allLogs.errorLogs.errorPatterns).length > 0) {
      report.push('─'.repeat(80));
      report.push('📊 ERROR PATTERNS');
      report.push('─'.repeat(80));
      const sortedPatterns = Object.entries(allLogs.errorLogs.errorPatterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      sortedPatterns.forEach(([pattern, count]) => {
        report.push(`   ${pattern}: ${count} occurrences`);
      });
      report.push('');
    }
    
    report.push('═'.repeat(80));
    report.push('END OF SYSTEM LOGS REPORT');
    report.push('═'.repeat(80));
    
    return report.join('\n');
  }
  
  /**
   * Helpers
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = SystemLogsCollector;
