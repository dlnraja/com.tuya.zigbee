#!/usr/bin/env node

/**
 * 🗄️ DATABASE SYNC SYSTEM v1.0.0
 *
 * Synchronisation automatique avec les bases de données externes:
 * - Zigbee2MQTT (Z2M) database
 * - Blakadder Zigbee database
 * - ZHA quirks database
 * - Tuya IoT database
 * - Autres BDD identifiées dans les commits du projet
 *
 * Intègre features complètes selon règles strictes mémoire
 */

const fs = require('fs').promises;
const path = require('path');

class DatabaseSyncSystem {
  constructor() {
    this.config = {
      // Bases de données externes - identifiées dans commits projet
      databases: {
        zigbee2mqtt: {
          url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
          backup_url: 'https://api.github.com/repos/Koenkk/zigbee-herdsman-converters/contents/src/devices',
          type: 'z2m_converters',
          priority: 'high',
          enabled: true,
          format: 'typescript'
        },
        blakadder_zigbee: {
          url: 'https://zigbee.blakadder.com/assets/device_index.json',
          backup_url: 'https://github.com/blakadder/zigbee/raw/master/_zigbee/',
          type: 'device_database',
          priority: 'high',
          enabled: true,
          format: 'json'
        },
        zha_quirks: {
          url: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/',
          backup_url: 'https://api.github.com/repos/zigpy/zha-device-handlers/contents/zhaquirks/tuya',
          type: 'zha_quirks',
          priority: 'medium',
          enabled: true,
          format: 'python'
        },
        tuya_iot_specs: {
          url: 'https://developer.tuya.com/en/docs/iot/device-categories',
          backup_url: null,
          type: 'device_specs',
          priority: 'low',
          enabled: false, // Nécessite API key
          format: 'api'
        },
        homey_zigbee: {
          url: 'https://raw.githubusercontent.com/athombv/node-homey-zigbeedriver/master/lib/',
          backup_url: null,
          type: 'homey_reference',
          priority: 'low',
          enabled: true,
          format: 'javascript'
        }
      },

      // Règles fingerprinting selon mémoire - STRICTES et NON-NÉGOCIABLES
      fingerprintingRules: {
        // 9.1 Homey Matching Logic: NEVER rely on manufacturerName alone
        pairValidation: true,
        // 9.2 TS0601/TS0001 TRAP: TS0601 MUST NEVER be added alone
        ts0601Protection: true,
        // 9.4 3-Pillar Validation: Data Source + Cluster & DP Compatibility + Anti-Collision
        threePillarValidation: true,
        // 9.5 ManufacturerName Expansion: MAXIMAL but device family identical
        maximalExpansion: true,
        // 9.6 ProductId Expansion: EXHAUSTIVE when adding
        exhaustiveProductId: true,
        // 9.8 NON-REGRESSION: NEVER delete unless proven invalid
        nonRegression: true
      },

      // Patterns extraction selon expérience accumulée
      extractionPatterns: {
        manufacturerName: {
          tuya: /_TZ[A-Z0-9]{4}_[a-z0-9]{8,12}/gi,
          generic: /manufacturerName[:\s]*['"`]?([^'"`\s,\]]+)['"`]?/gi
        },
        productId: {
          tuya: /TS[0-9]{4}[A-Z]?/gi,
          generic: /productId[:\s]*\[?['"`]?([^'"`\s,\]]+)['"`]?\]?/gi
        },
        modelId: {
          generic: /modelId[:\s]*['"`]?([^'"`\s,\]]+)['"`]?/gi
        },
        clusters: {
          numeric: /cluster[s]?[:\s]*\[([0-9,\s]+)\]/gi,
          hex: /0x[0-9a-fA-F]{4}/gi
        },
        endpoints: {
          pattern: /endpoint[s]?[:\s]*\[?([0-9,\s]+)\]?/gi
        },
        datapoints: {
          tuya: /dp[:\s]*(\d+)|dataPoint[:\s]*(\d+)/gi
        },
        capabilities: {
          homey: /capabilit(y|ies)[:\s]*\[([^\]]+)\]/gi
        }
      }
    };

    // Arguments ligne de commande
    this.maxDevices = parseInt(process.argv.find(arg => arg.startsWith('--max-devices='))?.split('=')[1] || '50');
    this.forceFeatures = process.argv.find(arg => arg.startsWith('--force-features='))?.split('=')[1] === 'true';
    this.executionType = process.argv.find(arg => arg.startsWith('--execution-type='))?.split('=')[1] || 'database_daily';

    this.results = {
      z2mDevices: 0,
      blakadderDevices: 0,
      totalDatabases: 0,
      devicesProcessed: 0,
      featuresExtracted: 0,
      databases: {},
      errors: []
    };
  }

  /**
   * 📝 Logger compatible GitHub Actions
   */
  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();

    if (process.env.GITHUB_ACTIONS === 'true') {
      switch (level.toUpperCase()) {
        case 'ERROR':
          console.log(`::error::${message}`);
          break;
        case 'WARN':
          console.log(`::warning::${message}`);
          break;
        case 'SUCCESS':
          console.log(`::notice::✅ ${message}`);
          break;
        default:
          console.log(`[${timestamp}] ${message}`);
      }
    } else {
      console.log(`[${timestamp}] [${level}] ${message}`);
    }

    if (data) console.log(JSON.stringify(data, null, 2));
  }

  /**
   * 🗄️ Synchroniser toutes les bases de données
   */
  async syncAllDatabases() {
    const allFindings = [];

    for (const [dbName, dbConfig] of Object.entries(this.config.databases)) {
      if (!dbConfig.enabled) {
        await this.log('INFO', `⏭️ Skipping disabled database: ${dbName}`);
        continue;
      }

      try {
        await this.log('INFO', `🗄️ Syncing database: ${dbName} (${dbConfig.type})`);

        const dbFindings = await this.syncSpecificDatabase(dbName, dbConfig);
        allFindings.push(...dbFindings);

        this.results.databases[dbName] = {
          url: dbConfig.url,
          type: dbConfig.type,
          findings: dbFindings.length,
          status: 'success',
          priority: dbConfig.priority
        };

        // Compteurs spécifiques
        if (dbName === 'zigbee2mqtt') {
          this.results.z2mDevices = dbFindings.length;
        } else if (dbName === 'blakadder_zigbee') {
          this.results.blakadderDevices = dbFindings.length;
        }

        this.results.totalDatabases++;

        // Délai entre BDD pour éviter rate limiting
        await this.delay(3000);

      } catch (error) {
        await this.log('ERROR', `Failed to sync ${dbName}:`, error);
        this.results.errors.push(`${dbName}: ${error.message}`);

        this.results.databases[dbName] = {
          url: dbConfig.url,
          type: dbConfig.type,
          findings: 0,
          status: 'error',
          error: error.message
        };
      }
    }

    return allFindings.slice(0, this.maxDevices);
  }

  /**
   * 🎯 Synchroniser base de données spécifique
   */
  async syncSpecificDatabase(dbName, dbConfig) {
    switch (dbConfig.type) {
      case 'z2m_converters':
        return await this.syncZigbee2MQTT(dbConfig);

      case 'device_database':
        return await this.syncBlakadder(dbConfig);

      case 'zha_quirks':
        return await this.syncZHAQuirks(dbConfig);

      case 'homey_reference':
        return await this.syncHomeyReference(dbConfig);

      default:
        await this.log('WARN', `Unknown database type: ${dbConfig.type}`);
        return [];
    }
  }

  /**
   * 🔄 Sync Zigbee2MQTT Database
   */
  async syncZigbee2MQTT(dbConfig) {
    const findings = [];

    try {
      // Tenter URL principale d'abord
      let response = await this.fetchWithFallback(dbConfig.url, dbConfig.backup_url);

      if (!response.ok) {
        throw new Error(`Z2M API error: ${response.status}`);
      }

      let content = await response.text();

      // Parser fichier TypeScript Z2M pour devices Tuya
      const devices = this.parseZ2MTypeScriptDevices(content);

      for (const device of devices) {
        const deviceInfo = await this.processZ2MDevice(device, 'z2m');
        if (deviceInfo) {
          findings.push(deviceInfo);
        }
      }

      await this.log('SUCCESS', `📊 Z2M sync: ${findings.length} devices processed`);

    } catch (error) {
      await this.log('ERROR', 'Z2M sync failed:', error);
      throw error;
    }

    return findings;
  }

  /**
   * 📊 Sync Blakadder Database
   */
  async syncBlakadder(dbConfig) {
    const findings = [];

    try {
      let response = await this.fetchWithFallback(dbConfig.url, dbConfig.backup_url);

      if (!response.ok) {
        throw new Error(`Blakadder API error: ${response.status}`);
      }

      const data = await response.json();

      // Parser JSON Blakadder pour devices Tuya/Zigbee
      const tuyaDevices = data.filter(device =>
        device.manufacturerName?.includes('_TZ') ||
        device.brand?.toLowerCase().includes('tuya') ||
        device.model?.startsWith('TS0')
      );

      for (const device of tuyaDevices) {
        const deviceInfo = await this.processBlakadderDevice(device, 'blakadder');
        if (deviceInfo) {
          findings.push(deviceInfo);
        }
      }

      await this.log('SUCCESS', `📊 Blakadder sync: ${findings.length} devices processed`);

    } catch (error) {
      await this.log('ERROR', 'Blakadder sync failed:', error);
      throw error;
    }

    return findings;
  }

  /**
   * 🔧 Sync ZHA Quirks
   */
  async syncZHAQuirks(dbConfig) {
    const findings = [];

    try {
      // ZHA quirks sont dans des fichiers Python séparés
      // On fetch la liste des fichiers d'abord
      const response = await fetch(dbConfig.backup_url, {
        headers: {
          'User-Agent': 'dlnraja-database-sync/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`ZHA API error: ${response.status}`);
      }

      const files = await response.json();

      // Parser chaque fichier quirk pour devices Tuya
      for (const file of files.slice(0, 10)) { // Limiter à 10 fichiers
        if (file.name.endsWith('.py')) {
          try {
            const fileResponse = await fetch(file.download_url);
            const content = await fileResponse.text();

            const deviceInfo = await this.parseZHAQuirk(content, file.name);
            if (deviceInfo) {
              findings.push(deviceInfo);
            }
          } catch (error) {
            await this.log('WARN', `Failed to process ZHA quirk ${file.name}:`, error);
          }
        }
      }

      await this.log('SUCCESS', `📊 ZHA sync: ${findings.length} devices processed`);

    } catch (error) {
      await this.log('ERROR', 'ZHA sync failed:', error);
      throw error;
    }

    return findings;
  }

  /**
   * 🏠 Sync Homey Reference
   */
  async syncHomeyReference(dbConfig) {
    // Pour l'instant, on skip - nécessite analyse approfondie du code Homey
    await this.log('INFO', '🏠 Homey reference sync - TODO (complex analysis required)');
    return [];
  }

  /**
   * 🔍 Parser devices Z2M TypeScript
   */
  parseZ2MTypeScriptDevices(content) {
    const devices = [];

    // Pattern pour devices Z2M: { zigbeeModel: [...], model: '...', vendor: '...', description: '...', ... }
    const devicePattern = /\{\s*zigbeeModel:\s*\[(.*?)\][\s\S]*?model:\s*['"`]([^'"`]+)['"`][\s\S]*?vendor:\s*['"`]([^'"`]+)['"`][\s\S]*?description:\s*['"`]([^'"`]+)['"`][\s\S]*?\}/gi;

    let match;
    while ((match = devicePattern.exec(content)) !== null && devices.length < this.maxDevices) {
      try {
        const zigbeeModels = match[1].split(',').map(m => m.trim().replace(/['"]/g, ''));
        const model = match[2];
        const vendor = match[3];
        const description = match[4];

        devices.push({
          zigbeeModels,
          model,
          vendor,
          description,
          source: 'z2m',
          raw: match[0].substring(0, 500)
        });
      } catch (error) {
        await this.log('WARN', 'Failed to parse Z2M device:', error);
      }
    }

    return devices;
  }

  /**
   * ⚙️ Process Z2M device selon règles strictes
   */
  async processZ2MDevice(device, source) {
    // Filtrer seulement devices Tuya
    const isTuya = device.vendor?.toLowerCase().includes('tuya') ||
      device.zigbeeModels?.some(m => m.startsWith('TS0')) ||
      device.model?.includes('_TZ');

    if (!isTuya) {
      return null;
    }

    const deviceInfo = {
      source: source,
      database: 'zigbee2mqtt',

      // Device identifiers selon règles mémoire
      manufacturerName: null,
      productId: null,
      zigbeeModels: device.zigbeeModels || [],
      vendor: device.vendor,
      model: device.model,
      description: device.description,

      // Features complètes
      clusters: [],
      capabilities: [],
      dataPoints: [],
      exposes: [],

      confidence: 0,
      validationStatus: 'pending'
    };

    // Extraction manufacturerName depuis model ou zigbeeModels
    for (const zigbeeModel of device.zigbeeModels) {
      const mfrMatch = zigbeeModel.match(this.config.extractionPatterns.manufacturerName.tuya);
      if (mfrMatch) {
        deviceInfo.manufacturerName = mfrMatch[0];
        deviceInfo.confidence += 30;
        break;
      }
    }

    // Extraction productId
    for (const zigbeeModel of device.zigbeeModels) {
      const productMatch = zigbeeModel.match(this.config.extractionPatterns.productId.tuya);
      if (productMatch) {
        deviceInfo.productId = productMatch[0];
        deviceInfo.confidence += 25;
        break;
      }
    }

    // RÈGLE CRITIQUE: manufacturerName + productId ensemble
    if (!deviceInfo.manufacturerName || !deviceInfo.productId) {
      return null;
    }

    // RÈGLE: Jamais TS0601 seul
    if (deviceInfo.productId === 'TS0601' && !deviceInfo.manufacturerName) {
      return null;
    }

    // Features complètes si activées
    if (this.forceFeatures) {
      // Parser le raw content pour plus de détails
      deviceInfo.clusters = this.extractClustersFromRaw(device.raw);
      deviceInfo.dataPoints = this.extractDataPointsFromRaw(device.raw);
      deviceInfo.exposes = this.extractExposesFromRaw(device.raw);

      if (deviceInfo.clusters.length > 0 || deviceInfo.dataPoints.length > 0) {
        deviceInfo.confidence += 20;
        this.results.featuresExtracted++;
      }
    }

    // Validation finale
    if (deviceInfo.confidence >= 50) {
      deviceInfo.validationStatus = 'valid';
      this.results.devicesProcessed++;
      return deviceInfo;
    }

    return null;
  }

  /**
   * 📊 Process Blakadder device
   */
  async processBlakadderDevice(device, source) {
    const deviceInfo = {
      source: source,
      database: 'blakadder',

      manufacturerName: device.manufacturerName,
      productId: device.model,
      brand: device.brand,
      model: device.model,
      description: device.description || device.title,

      confidence: 0,
      validationStatus: 'pending'
    };

    // Validation manufacturerName pattern
    if (deviceInfo.manufacturerName?.match(this.config.extractionPatterns.manufacturerName.tuya)) {
      deviceInfo.confidence += 30;
    }

    // Validation productId pattern
    if (deviceInfo.productId?.match(this.config.extractionPatterns.productId.tuya)) {
      deviceInfo.confidence += 25;
    }

    // RÈGLE CRITIQUE: paire manufacturerName + productId
    if (!deviceInfo.manufacturerName || !deviceInfo.productId) {
      return null;
    }

    if (deviceInfo.confidence >= 40) {
      deviceInfo.validationStatus = 'valid';
      this.results.devicesProcessed++;
      return deviceInfo;
    }

    return null;
  }

  /**
   * 🐍 Parse ZHA Quirk Python file
   */
  async parseZHAQuirk(content, filename) {
    // Patterns Python ZHA pour manufacturerName et model
    const mfrMatch = content.match(/MANUFACTURER\s*=\s*['"`]([^'"`]+)['"`]/i);
    const modelMatch = content.match(/MODEL\s*=\s*['"`]([^'"`]+)['"`]/i);

    if (!mfrMatch || !modelMatch) {
      return null;
    }

    const deviceInfo = {
      source: 'zha',
      database: 'zha_quirks',
      filename: filename,

      manufacturerName: mfrMatch[1],
      productId: modelMatch[1],

      confidence: 45,
      validationStatus: 'valid'
    };

    // Validation patterns Tuya
    if (deviceInfo.manufacturerName?.includes('_TZ') && deviceInfo.productId?.startsWith('TS0')) {
      this.results.devicesProcessed++;
      return deviceInfo;
    }

    return null;
  }

  /**
   * ⚙️ Extraction helpers
   */
  extractClustersFromRaw(raw) {
    const clusters = [];
    const matches = raw?.match(this.config.extractionPatterns.clusters.numeric);

    if (matches) {
      for (const match of matches) {
        const numbers = match.match(/\d+/g);
        if (numbers) {
          clusters.push(...numbers.map(n => parseInt(n)).filter(n => n >= 0 && n <= 65535));
        }
      }
    }

    return [...new Set(clusters)];
  }

  extractDataPointsFromRaw(raw) {
    const dataPoints = [];
    let match;
    const dpPattern = new RegExp(this.config.extractionPatterns.datapoints.tuya.source, 'gi');

    while ((match = dpPattern.exec(raw || '')) !== null) {
      const dpNum = parseInt(match[1] || match[2]);
      if (!isNaN(dpNum) && dpNum >= 0 && dpNum <= 255) {
        dataPoints.push(dpNum);
      }
    }

    return [...new Set(dataPoints)];
  }

  extractExposesFromRaw(raw) {
    // Z2M exposes définissent les capabilities
    const exposes = [];

    if (raw?.includes('exposes:')) {
      // Parser la section exposes (complexe, simplification pour l'instant)
      if (raw.includes('binary')) exposes.push('binary');
      if (raw.includes('numeric')) exposes.push('numeric');
      if (raw.includes('enum')) exposes.push('enum');
      if (raw.includes('light')) exposes.push('light');
      if (raw.includes('climate')) exposes.push('climate');
    }

    return exposes;
  }

  /**
   * 🌐 Fetch with fallback URL
   */
  async fetchWithFallback(primaryUrl, fallbackUrl) {
    try {
      const response = await fetch(primaryUrl, {
        headers: {
          'User-Agent': 'dlnraja-database-sync/1.0',
          'Accept': 'application/json, text/plain, */*'
        }
      });

      if (response.ok) {
        return response;
      }
    } catch (error) {
      await this.log('WARN', `Primary URL failed: ${primaryUrl}`, error);
    }

    if (fallbackUrl) {
      await this.log('INFO', `Trying fallback URL: ${fallbackUrl}`);
      return await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'dlnraja-database-sync/1.0',
          'Accept': 'application/json, text/plain, */*'
        }
      });
    }

    throw new Error(`Both primary and fallback URLs failed for ${primaryUrl}`);
  }

  /**
   * ⏱️ Délai anti rate-limiting
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 💾 Sauvegarder findings pour integration
   */
  async saveFindingsForIntegration(findings) {
    const outputPath = path.join(process.cwd(), 'data', 'databases', 'database-findings.json');

    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const output = {
      timestamp: new Date().toISOString(),
      executionType: this.executionType,
      totalFindings: findings.length,
      findings: findings,
      databases: this.results.databases,
      statistics: {
        z2mDevices: this.results.z2mDevices,
        blakadderDevices: this.results.blakadderDevices,
        totalDatabases: this.results.totalDatabases,
        devicesProcessed: this.results.devicesProcessed,
        featuresExtracted: this.results.featuresExtracted
      }
    };

    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    await this.log('INFO', `💾 Saved ${findings.length} database findings to ${outputPath}`);
  }

  /**
   * 🚀 Exécution principale
   */
  async execute() {
    try {
      await this.log('INFO', `🚀 Starting Database Sync System (${this.executionType})`);

      // 1. Sync toutes les BDD
      const findings = await this.syncAllDatabases();

      if (findings.length === 0) {
        await this.log('INFO', '📝 No device findings from databases');
        return this.generateOutput();
      }

      // 2. Sauvegarder pour integration
      await this.saveFindingsForIntegration(findings);

      // 3. Rapport détaillé
      await this.generateDatabaseReport(findings);

      await this.log('SUCCESS', `✅ Database Sync completed: ${findings.length} devices from ${this.results.totalDatabases} databases`);

      return this.generateOutput();

    } catch (error) {
      await this.log('ERROR', '❌ Database Sync System failed:', error);
      this.results.errors.push(error.message);
      throw error;
    }
  }

  /**
   * 📊 Générer rapport database
   */
  async generateDatabaseReport(findings) {
    const reportPath = path.join(process.cwd(), 'logs', 'database-sync', `database-sync-${Date.now()}.log`);

    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    const report = `
DATABASE SYNC SYSTEM REPORT
===========================

Execution: ${this.executionType}
Timestamp: ${new Date().toISOString()}
Max Devices: ${this.maxDevices}
Force Features: ${this.forceFeatures}

DATABASES PROCESSED: ${this.results.totalDatabases}
${Object.entries(this.results.databases).map(([name, info]) =>
      `- ${name}: ${info.status} - ${info.findings} devices (${info.type})`
    ).join('\n')}

DEVICES FOUND: ${findings.length}
- Z2M Devices: ${this.results.z2mDevices}
- Blakadder Devices: ${this.results.blakadderDevices}
- Total Processed: ${this.results.devicesProcessed}

FEATURES EXTRACTED: ${this.results.featuresExtracted}
${findings.map((f, i) =>
      `${i + 1}. ${f.manufacturerName}/${f.productId} - ${f.description || f.model} (${f.database})`
    ).join('\n')}

ERRORS: ${this.results.errors.length}
${this.results.errors.join('\n')}
`;

    await fs.writeFile(reportPath, report);
  }

  /**
   * 📤 Generate output pour GitHub Actions
   */
  generateOutput() {
    if (process.env.GITHUB_ACTIONS === 'true') {
      console.log(`::set-output name=z2m_devices::${this.results.z2mDevices}`);
      console.log(`::set-output name=blakadder_devices::${this.results.blakadderDevices}`);
      console.log(`::set-output name=total_databases::${this.results.totalDatabases}`);
    }

    return this.results;
  }
}

// CLI execution
if (require.main === module) {
  const syncSystem = new DatabaseSyncSystem();

  syncSystem.execute()
    .then(results => {
      console.log('✅ Database sync completed:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Database sync failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseSyncSystem;
