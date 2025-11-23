'use strict';

/**
 * TUYA DP DISCOVERY SYSTEM
 *
 * Inspiré de:
 * - Zigbee2MQTT (automatic DP detection)
 * - LocalTuya (device datapoints lists)
 * - Tuya IoT Platform (developer tools)
 * - Home Assistant Community
 *
 * Permet de:
 * - Découvrir automatiquement les DP d'un device
 * - Logger tous les messages Tuya
 * - Identifier les types de DP (BOOL, VALUE, ENUM, etc.)
 * - Créer un rapport détaillé pour debug
 * - Apprendre de nouveaux devices
 */

const { findDPProfile } = require('./TuyaDPDatabase');

class TuyaDPDiscovery {

  constructor(device) {
    this.device = device;
    this.discoveredDPs = new Map();
    this.dpHistory = [];
    this.enabled = false;
    this.startTime = Date.now();
  }

  /**
   * Start DP discovery mode
   */
  startDiscovery() {
    this.device.log('[DP-DISCOVERY] 🔍 Starting discovery mode...');
    this.enabled = true;
    this.startTime = Date.now();
    this.discoveredDPs.clear();
    this.dpHistory = [];

    // Log device info
    this.logDeviceInfo();

    // Listen to all Tuya messages
    this.setupListeners();

    this.device.log('[DP-DISCOVERY] ✅ Discovery active - interact with device!');
  }

  /**
   * Stop discovery and generate report
   */
  stopDiscovery() {
    this.enabled = false;
    this.device.log('[DP-DISCOVERY] 🛑 Stopping discovery...');

    const report = this.generateReport();
    this.device.log('[DP-DISCOVERY] 📊 DISCOVERY REPORT:');
    this.device.log(report);

    return report;
  }

  /**
   * Log device basic info
   */
  logDeviceInfo() {
    const node = this.device.zclNode;
    if (!node) return;

    const info = {
      manufacturerName: node.manufacturerName || 'Unknown',
      modelId: node.modelId || 'Unknown',
      powerSource: node.powerSource || 'Unknown',
      endpoints: Object.keys(node.endpoints || {})
    };

    this.device.log('[DP-DISCOVERY] 📱 Device Info:', JSON.stringify(info, null, 2));

    // Check if known profile exists
    const profile = findDPProfile(info.manufacturerName, info.modelId);
    if (profile) {
      this.device.log(`[DP-DISCOVERY] ✅ Known profile: ${profile.name}`);
      this.device.log(`[DP-DISCOVERY] Expected DPs: ${Object.keys(profile.dps || {}).join(', ')}`);
    } else {
      this.device.log('[DP-DISCOVERY] ⚠️  Unknown device - full discovery needed!');
    }
  }

  /**
   * Setup Tuya message listeners
   */
  setupListeners() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.device.log('[DP-DISCOVERY] ❌ No endpoint 1');
        return;
      }

      // Listen to Tuya cluster 0xEF00
      const tuyaCluster = endpoint.clusters.tuyaSpecific
        || endpoint.clusters.tuyaManufacturer
        || endpoint.clusters[0xEF00];

      if (!tuyaCluster) {
        this.device.log('[DP-DISCOVERY] ❌ No Tuya cluster');
        return;
      }

      // Listen to dataReport events
      tuyaCluster.on('dataReport', (data) => {
        this.handleDataReport(data);
      });

      // Listen to raw frames
      if (typeof endpoint.on === 'function') {
        endpoint.on('frame', (frame) => {
          if (frame.cluster === 0xEF00) {
            this.handleRawFrame(frame);
          }
        });
      }

      // If TuyaEF00Manager exists, hook into it
      if (this.device.tuyaEF00Manager) {
        const manager = this.device.tuyaEF00Manager;
        const originalEmit = manager.emit.bind(manager);

        manager.emit = (event, ...args) => {
          if (event.startsWith('dp-')) {
            const dpNum = parseInt(event.split('-')[1]);
            this.recordDP(dpNum, args[0]);
          }
          return originalEmit(event, ...args);
        };
      }

      this.device.log('[DP-DISCOVERY] ✅ Listeners active');
    } catch (err) {
      this.device.error('[DP-DISCOVERY] Listener setup failed:', err);
    }
  }

  /**
   * Handle Tuya dataReport
   */
  handleDataReport(data) {
    if (!this.enabled) return;

    this.device.log('[DP-DISCOVERY] 📥 dataReport:', JSON.stringify(data, null, 2));

    // Parse DP data
    if (data.dp !== undefined && data.data !== undefined) {
      this.recordDP(data.dp, data.data, data.datatype);
    }
  }

  /**
   * Handle raw Tuya frame
   */
  handleRawFrame(frame) {
    if (!this.enabled) return;

    try {
      // Parse Tuya frame format: [status:1][seq:1][dp:1][type:1][len:2][data:len]
      const payload = frame.data;
      if (!payload || payload.length < 6) return;

      const status = payload.readUInt8(0);
      const seq = payload.readUInt8(1);
      const dp = payload.readUInt8(2);
      const type = payload.readUInt8(3);
      const len = payload.readUInt16BE(4);
      const data = payload.slice(6, 6 + len);

      this.device.log(`[DP-DISCOVERY] 📡 RAW Frame: DP=${dp}, Type=${type}, Len=${len}`);
      this.device.log(`[DP-DISCOVERY]    Data: ${data.toString('hex')}`);

      // Decode value based on type
      let value = null;
      switch (type) {
        case 0x00: // RAW
          value = data;
          break;
        case 0x01: // BOOL
          value = data.readUInt8(0) === 1;
          break;
        case 0x02: // VALUE (uint32)
          value = data.readUInt32BE(0);
          break;
        case 0x03: // STRING
          value = data.toString('utf8');
          break;
        case 0x04: // ENUM
          value = data.readUInt8(0);
          break;
        case 0x05: // FAULT
          value = data.readUInt8(0);
          break;
        default:
          value = data;
      }

      this.recordDP(dp, value, type);
    } catch (err) {
      this.device.error('[DP-DISCOVERY] Frame parse error:', err);
    }
  }

  /**
   * Record discovered DP
   */
  recordDP(dp, value, type = null) {
    if (!this.enabled) return;

    const timestamp = Date.now();
    const elapsed = Math.round((timestamp - this.startTime) / 1000);

    // Detect type from value if not provided
    if (type === null) {
      if (typeof value === 'boolean') type = 0x01;
      else if (typeof value === 'number') type = 0x02;
      else if (typeof value === 'string') type = 0x03;
      else if (Buffer.isBuffer(value)) type = 0x00;
    }

    const typeNames = {
      0x00: 'RAW',
      0x01: 'BOOL',
      0x02: 'VALUE',
      0x03: 'STRING',
      0x04: 'ENUM',
      0x05: 'FAULT'
    };

    const typeName = typeNames[type] || 'UNKNOWN';

    // Store in discovered map
    if (!this.discoveredDPs.has(dp)) {
      this.discoveredDPs.set(dp, {
        dp,
        type,
        typeName,
        firstSeen: timestamp,
        values: [],
        count: 0
      });
    }

    const dpInfo = this.discoveredDPs.get(dp);
    dpInfo.count++;
    dpInfo.lastSeen = timestamp;

    // Store unique values (max 10)
    const valueStr = this.valueToString(value);
    if (!dpInfo.values.includes(valueStr) && dpInfo.values.length < 10) {
      dpInfo.values.push(valueStr);
    }

    // Add to history
    this.dpHistory.push({
      time: elapsed,
      dp,
      type: typeName,
      value: valueStr
    });

    // Log discovery
    this.device.log(`[DP-DISCOVERY] 🔍 DP ${dp} (${typeName}): ${valueStr} [seen ${dpInfo.count}x]`);
  }

  /**
   * Convert value to string
   */
  valueToString(value) {
    if (Buffer.isBuffer(value)) {
      return value.toString('hex');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Generate discovery report
   */
  generateReport() {
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    const node = this.device.zclNode;

    let report = '\n';
    report += '╔════════════════════════════════════════════════════════════════╗\n';
    report += '║               TUYA DP DISCOVERY REPORT                        ║\n';
    report += '╚════════════════════════════════════════════════════════════════╝\n\n';

    // Device info
    report += '📱 DEVICE INFORMATION:\n';
    report += `   Manufacturer: ${node?.manufacturerName || 'Unknown'}\n`;
    report += `   Model: ${node?.modelId || 'Unknown'}\n`;
    report += `   Power: ${node?.powerSource || 'Unknown'}\n`;
    report += `   Discovery duration: ${duration}s\n\n`;

    // Discovered DPs
    report += '🔍 DISCOVERED DATA POINTS:\n';

    if (this.discoveredDPs.size === 0) {
      report += '   ⚠️  No DPs discovered - interact with device!\n\n';
    } else {
      const dps = Array.from(this.discoveredDPs.values()).sort((a, b) => a.dp - b.dp);

      for (const dp of dps) {
        report += `\n   DP ${dp.dp} (0x${dp.dp.toString(16).padStart(2, '0')}):\n`;
        report += `      Type: ${dp.typeName} (0x${(dp.type || 0).toString(16).padStart(2, '0')})\n`;
        report += `      Seen: ${dp.count} times\n`;
        report += `      Values: ${dp.values.join(', ')}\n`;
      }

      report += '\n';
    }

    // Timeline
    if (this.dpHistory.length > 0) {
      report += '📊 TIMELINE (last 20 events):\n';
      const recentHistory = this.dpHistory.slice(-20);

      for (const event of recentHistory) {
        report += `   [${String(event.time).padStart(4, ' ')}s] DP ${String(event.dp).padStart(3, ' ')} (${event.type}): ${event.value}\n`;
      }

      report += '\n';
    }

    // Code template
    if (this.discoveredDPs.size > 0) {
      report += '💻 HOMEY DRIVER CODE TEMPLATE:\n';
      report += '```javascript\n';
      report += 'async onNodeInit({ zclNode }) {\n';
      report += '  // Tuya DP Listeners\n';

      const dps = Array.from(this.discoveredDPs.values()).sort((a, b) => a.dp - b.dp);
      for (const dp of dps) {
        report += `  this.tuyaEF00Manager.on('dp-${dp.dp}', (value) => {\n`;
        report += `    this.log('DP ${dp.dp} (${dp.typeName}):', value);\n`;
        report += `    // TODO: Map to capability\n`;
        report += `  });\n\n`;
      }

      report += '}\n';
      report += '```\n\n';
    }

    // Database entry template
    if (this.discoveredDPs.size > 0) {
      report += '📚 TUYADPDATABASE.JS ENTRY:\n';
      report += '```javascript\n';
      report += `'${node?.modelId || 'UNKNOWN'}_${node?.manufacturerName?.replace(/[^a-zA-Z0-9]/g, '_') || 'UNKNOWN'}': {\n`;
      report += `  manufacturers: ['${node?.manufacturerName || 'UNKNOWN'}'],\n`;
      report += `  model: '${node?.modelId || 'TS0601'}',\n`;
      report += '  dps: {\n';

      const dps = Array.from(this.discoveredDPs.values()).sort((a, b) => a.dp - b.dp);
      for (const dp of dps) {
        report += `    ${dp.dp}: { name: 'unknown_${dp.dp}', type: ${dp.type}, capability: 'TODO' },\n`;
      }

      report += '  }\n';
      report += '},\n';
      report += '```\n\n';
    }

    report += '╔════════════════════════════════════════════════════════════════╗\n';
    report += '║  Share this report on GitHub to help improve the app!         ║\n';
    report += '╚════════════════════════════════════════════════════════════════╝\n';

    return report;
  }

  /**
   * Export data for debugging
   */
  exportData() {
    return {
      device: {
        manufacturerName: this.device.zclNode?.manufacturerName,
        modelId: this.device.zclNode?.modelId,
        powerSource: this.device.zclNode?.powerSource
      },
      discoveredDPs: Array.from(this.discoveredDPs.values()),
      history: this.dpHistory,
      duration: Math.round((Date.now() - this.startTime) / 1000)
    };
  }
}

module.exports = TuyaDPDiscovery;
