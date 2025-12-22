#!/usr/bin/env node

/**
 * 🚀 GITHUB MULTI-SOURCE MONITOR v1.0.0
 *
 * Surveillance multi-sources GitHub avec intégration features complètes
 * Sources: Johan + Tuya officiel + dlnraja + communautés GitHub
 * Intègre: Flows, Capacités, DP, manufacturerNames selon règles strictes
 */

const fs = require('fs').promises;
const path = require('path');

class GitHubMultiSourceMonitor {
  constructor() {
    this.config = {
      // Sources GitHub à surveiller
      sources: {
        johan: {
          repo: 'JohanBendz/com.tuya.zigbee',
          priority: 'high',
          frequency: 'hourly',
          types: ['issues', 'prs', 'releases']
        },
        tuya_official: {
          repo: 'tuya/tuya-zigbee',
          priority: 'medium',
          frequency: 'six_hourly',
          types: ['releases', 'issues']
        },
        dlnraja_main: {
          repo: 'dlnraja/com.tuya.zigbee',
          priority: 'medium',
          frequency: 'six_hourly',
          types: ['issues', 'discussions']
        },
        homey_community: {
          repo: 'athombv/node-homey-zigbeedriver',
          priority: 'low',
          frequency: 'daily',
          types: ['issues']
        }
      },

      // Configuration selon mémoire - RÈGLES STRICTES
      fingerprintingRules: {
        // UNIVERSAL STRICT ZIGBEE FINGERPRINTING RULES - ABSOLUTE et NON-NÉGOCIABLE
        mandatory: {
          manufacturerName: true,
          productId: true,
          pairValidation: true  // manufacturerName + productId ensemble
        },
        forbidden: {
          singleTS0601: true,        // TS0601 MUST NEVER be added alone
          manufacturerNameOnly: true, // NEVER rely on manufacturerName alone
          mixedTypes: true           // Pas mélanger ["TS0601", "_TZE200_xxx"]
        },
        nonRegression: {
          preserveExisting: true,     // NEVER delete existing entries
          addComments: true,          // Add comments instead of removing
          maximalCompatibility: true // Fingerprinting MUST maximise compatibility
        }
      },

      // Catégories selon mémoire
      categoryMapping: {
        'motion_sensor': /motion|pir|presence|occupancy|radar/i,
        'motion_sensor_radar_mmwave': /mmwave|radar.*24ghz|breathing.*detection/i,
        'climate_sensor': /temperature|humidity|climate|temp|weather|th.*sensor/i,
        'gas_detector': /gas|combustible|methane|lpg|gas.*detector/i,
        'smoke_detector': /smoke|fire.*detector|smoke.*alarm/i,
        'bulb_rgb': /rgb.*bulb|color.*bulb|smart.*bulb.*color/i,
        'bulb_rgbw': /rgbw|tunable.*white|color.*temp/i,
        'plug_smart': /smart.*plug|socket|outlet.*smart|power.*plug/i,
        'switch_1gang': /1.*gang|single.*switch|wall.*switch.*1/i,
        'switch_2gang': /2.*gang|double.*switch|wall.*switch.*2/i,
        'switch_3gang': /3.*gang|triple.*switch|wall.*switch.*3/i,
        'switch_4gang': /4.*gang|quad.*switch|wall.*switch.*4/i,
        'switch_6gang': /6.*gang|six.*switch|wall.*switch.*6/i,
        'led_strip': /led.*strip|strip.*controller|rgb.*strip/i,
        'wireless_button': /wireless.*button|remote.*button|scene.*switch/i,
        'contact_sensor': /door.*sensor|window.*sensor|contact.*sensor|magnetic/i,
        'water_sensor': /water.*leak|flood.*sensor|water.*detector/i,
        'thermostat': /thermostat|trv|radiator.*valve|heating.*control/i,
        'curtain_motor': /curtain|blind|roller.*shutter|window.*covering/i,
        'siren': /siren|alarm.*horn|buzzer|warning.*sound/i
      }
    };

    this.executionType = process.argv.find(arg => arg.startsWith('--execution-type='))?.split('=')[1] || 'manual';
    this.priority = process.argv.find(arg => arg.startsWith('--priority='))?.split('=')[1] || 'high';
    this.maxDevices = parseInt(process.argv.find(arg => arg.startsWith('--max-devices='))?.split('=')[1] || '10');
    this.forceFeatures = process.argv.find(arg => arg.startsWith('--force-features='))?.split('=')[1] === 'true';

    this.results = {
      devicesFound: 0,
      featuresAdded: 0,
      changesMade: false,
      sources: {},
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
   * 🔍 Fetch issues/PRs from multiple GitHub sources
   */
  async fetchFromMultipleSources() {
    const allFindings = [];

    for (const [sourceName, sourceConfig] of Object.entries(this.config.sources)) {
      try {
        // Filtrer selon fréquence d'exécution
        if (this.executionType === 'hourly' && sourceConfig.frequency !== 'hourly') {
          continue;
        }
        if (this.executionType === 'six_hourly' && !['hourly', 'six_hourly'].includes(sourceConfig.frequency)) {
          continue;
        }

        await this.log('INFO', `🔍 Fetching from ${sourceName} (${sourceConfig.repo})...`);

        for (const type of sourceConfig.types) {
          const findings = await this.fetchSourceData(sourceConfig.repo, type, sourceName);
          allFindings.push(...findings);
        }

        this.results.sources[sourceName] = {
          repo: sourceConfig.repo,
          processed: true,
          status: 'success'
        };

      } catch (error) {
        await this.log('ERROR', `Failed to fetch from ${sourceName}:`, error);
        this.results.errors.push(`${sourceName}: ${error.message}`);
        this.results.sources[sourceName] = {
          repo: sourceConfig.repo,
          processed: false,
          status: 'error',
          error: error.message
        };
      }
    }

    return allFindings.slice(0, this.maxDevices);
  }

  /**
   * 📡 Fetch data from specific source
   */
  async fetchSourceData(repo, type, sourceName) {
    const baseUrl = `https://api.github.com/repos/${repo}`;
    let endpoint;

    switch (type) {
      case 'issues':
        endpoint = `${baseUrl}/issues?state=open&per_page=20&sort=updated&direction=desc`;
        break;
      case 'prs':
        endpoint = `${baseUrl}/pulls?state=open&per_page=10&sort=updated&direction=desc`;
        break;
      case 'releases':
        endpoint = `${baseUrl}/releases?per_page=5`;
        break;
      case 'discussions':
        // GitHub Discussions API nécessite GraphQL, on skip pour l'instant
        return [];
      default:
        return [];
    }

    const response = await fetch(endpoint, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'dlnraja-mega-automation/1.0',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` })
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const deviceFindings = [];

    for (const item of data) {
      const finding = await this.parseItemForDevices(item, type, sourceName, repo);
      if (finding) {
        deviceFindings.push(finding);
      }
    }

    return deviceFindings;
  }

  /**
   * 🔬 Parse GitHub item for device information
   */
  async parseItemForDevices(item, type, sourceName, repo) {
    const text = `${item.title || ''} ${item.body || ''} ${item.description || ''}`.toLowerCase();

    // Détecter si c'est lié à un device
    const isDeviceRelated =
      /device|support|add|fingerprint|manufacturername|_tz|ts0|zigbee|tuya/.test(text) ||
      /cluster|endpoint|model.*id|product.*id/.test(text);

    if (!isDeviceRelated) {
      return null;
    }

    // Extraire informations device selon règles strictes mémoire
    const fingerprint = {
      source: sourceName,
      repo: repo,
      type: type,
      id: item.number || item.id,
      url: item.html_url,
      title: item.title,

      // Données device - SUIVRE RÈGLES STRICTES
      manufacturerName: null,
      productId: null,
      modelId: null,
      deviceName: null,
      category: null,

      // Features complètes (pas seulement manufacturerNames)
      clusters: [],
      capabilities: [],
      flowTriggers: [],
      dataPoints: [],

      // Métadonnées
      confidence: 0,
      validationStatus: 'pending'
    };

    // Extraction manufacturerName - RÈGLE: JAMAIS SEUL
    const mfrMatches = text.match(/_tz[a-z0-9]{4}_[a-z0-9]{8,12}/gi);
    if (mfrMatches && mfrMatches.length > 0) {
      fingerprint.manufacturerName = mfrMatches[0];
      fingerprint.confidence += 30;
    }

    // Extraction productId - REQUIS avec manufacturerName
    const productMatches = text.match(/ts[0-9]{4}[a-z]?/gi);
    if (productMatches && productMatches.length > 0) {
      fingerprint.productId = productMatches[0];
      fingerprint.confidence += 25;
    }

    // RÈGLE CRITIQUE: manufacturerName + productId ensemble
    if (!fingerprint.manufacturerName || !fingerprint.productId) {
      await this.log('WARN', `Skipping device - missing manufacturerName or productId pair`);
      return null;
    }

    // RÈGLE: Jamais TS0601 seul
    if (fingerprint.productId === 'TS0601' && !fingerprint.manufacturerName) {
      await this.log('WARN', `Skipping TS0601 without manufacturerName - FORBIDDEN by rules`);
      return null;
    }

    // Extraction features complètes si force-features activé
    if (this.forceFeatures) {
      fingerprint.clusters = this.extractClusters(text);
      fingerprint.capabilities = this.extractCapabilities(text);
      fingerprint.flowTriggers = this.extractFlowTriggers(text);
      fingerprint.dataPoints = this.extractDataPoints(text);
      fingerprint.confidence += 20;
    }

    // Déterminer catégorie
    fingerprint.category = this.determineCategory(text, item.title);
    fingerprint.deviceName = this.extractDeviceName(item.title, text);

    // Validation finale
    if (fingerprint.confidence >= 50) {
      fingerprint.validationStatus = 'valid';
      return fingerprint;
    }

    return null;
  }

  /**
   * 🏷️ Déterminer catégorie selon mapping mémoire
   */
  determineCategory(text, title) {
    const fullText = `${text} ${title}`.toLowerCase();

    for (const [category, pattern] of Object.entries(this.config.categoryMapping)) {
      if (pattern.test(fullText)) {
        return category;
      }
    }

    return 'unknown';
  }

  /**
   * ⚙️ Extraire clusters Zigbee
   */
  extractClusters(text) {
    const clusters = [];

    // Pattern clusters numériques (requis SDK3)
    const clusterMatches = text.match(/cluster[s]?[:\s]*\[?([0-9,\s]+)\]?/gi);
    if (clusterMatches) {
      for (const match of clusterMatches) {
        const numbers = match.match(/\d+/g);
        if (numbers) {
          clusters.push(...numbers.map(n => parseInt(n)).filter(n => n >= 0 && n <= 65535));
        }
      }
    }

    return [...new Set(clusters)]; // Remove duplicates
  }

  /**
   * 🎯 Extraire capabilities Homey
   */
  extractCapabilities(text) {
    const capabilities = [];

    const capabilityPatterns = {
      'onoff': /on\/off|switch|power.*state/i,
      'dim': /dimming|brightness|level|dim/i,
      'measure_temperature': /temperature|temp/i,
      'measure_humidity': /humidity|humid/i,
      'measure_battery': /battery|batt.*level/i,
      'alarm_motion': /motion|pir|presence/i,
      'alarm_contact': /door|window|contact/i,
      'alarm_water': /water.*leak|flood/i,
      'alarm_smoke': /smoke|fire/i,
      'measure_power': /power.*consumption|watts/i,
      'measure_current': /current|amperage/i,
      'measure_voltage': /voltage|volts/i
    };

    for (const [capability, pattern] of Object.entries(capabilityPatterns)) {
      if (pattern.test(text)) {
        capabilities.push(capability);
      }
    }

    return capabilities;
  }

  /**
   * 🔗 Extraire flow triggers
   */
  extractFlowTriggers(text) {
    const triggers = [];

    if (/button.*press|click|press.*button/i.test(text)) {
      triggers.push('button_pressed');
    }
    if (/motion.*detect|pir.*trigger/i.test(text)) {
      triggers.push('motion_detected');
    }
    if (/door.*open|window.*open/i.test(text)) {
      triggers.push('contact_opened');
    }
    if (/alarm|emergency|sos/i.test(text)) {
      triggers.push('alarm_triggered');
    }

    return triggers;
  }

  /**
   * 📊 Extraire datapoints Tuya
   */
  extractDataPoints(text) {
    const dataPoints = [];

    const dpMatches = text.match(/dp[:\s]*(\d+)/gi);
    if (dpMatches) {
      for (const match of dpMatches) {
        const dpNumber = match.match(/\d+/);
        if (dpNumber) {
          dataPoints.push(parseInt(dpNumber[0]));
        }
      }
    }

    return [...new Set(dataPoints)];
  }

  /**
   * 📝 Extraire nom du device
   */
  extractDeviceName(title, text) {
    // Nettoyer le titre
    let name = title.replace(/\[.*?\]/g, '').trim();

    // Patterns communs
    const nameMatch = text.match(/device.*name[:\s]*([^\n]+)/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }

    return name || 'Unknown Device';
  }

  /**
   * 🚀 Exécution principale
   */
  async execute() {
    try {
      await this.log('INFO', `🚀 Starting GitHub Multi-Source Monitor (${this.executionType})`);

      // 1. Fetch from all sources
      const findings = await this.fetchFromMultipleSources();

      if (findings.length === 0) {
        await this.log('INFO', '📝 No device-related findings from GitHub sources');
        return this.generateOutput();
      }

      this.results.devicesFound = findings.length;

      // 2. Sauvegarder findings pour integration engine
      await this.saveFindingsForIntegration(findings);

      // 3. Generate detailed report
      await this.generateDetailedReport(findings);

      await this.log('SUCCESS', `✅ GitHub Multi-Source Monitor completed: ${findings.length} devices found`);

      return this.generateOutput();

    } catch (error) {
      await this.log('ERROR', '❌ GitHub Multi-Source Monitor failed:', error);
      this.results.errors.push(error.message);
      throw error;
    }
  }

  /**
   * 💾 Sauvegarder findings pour integration engine
   */
  async saveFindingsForIntegration(findings) {
    const outputPath = path.join(process.cwd(), 'data', 'sources', 'github-findings.json');

    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const output = {
      timestamp: new Date().toISOString(),
      executionType: this.executionType,
      priority: this.priority,
      totalFindings: findings.length,
      findings: findings,
      sources: this.results.sources
    };

    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    await this.log('INFO', `💾 Saved ${findings.length} findings to ${outputPath}`);
  }

  /**
   * 📊 Generate detailed report
   */
  async generateDetailedReport(findings) {
    const reportPath = path.join(process.cwd(), 'logs', 'mega-automation', `github-sources-${Date.now()}.log`);

    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    const report = `
GITHUB MULTI-SOURCE MONITOR REPORT
==================================

Execution: ${this.executionType}
Priority: ${this.priority}
Timestamp: ${new Date().toISOString()}
Max Devices: ${this.maxDevices}
Force Features: ${this.forceFeatures}

SOURCES PROCESSED:
${Object.entries(this.results.sources).map(([name, info]) =>
      `- ${name}: ${info.status} (${info.repo})`
    ).join('\n')}

DEVICES FOUND: ${findings.length}
${findings.map((f, i) =>
      `${i + 1}. ${f.manufacturerName}/${f.productId} - ${f.deviceName} (${f.category})`
    ).join('\n')}

FEATURES EXTRACTED:
- Clusters: ${findings.reduce((acc, f) => acc + f.clusters.length, 0)}
- Capabilities: ${findings.reduce((acc, f) => acc + f.capabilities.length, 0)}
- Flow Triggers: ${findings.reduce((acc, f) => acc + f.flowTriggers.length, 0)}
- Data Points: ${findings.reduce((acc, f) => acc + f.dataPoints.length, 0)}

ERRORS: ${this.results.errors.length}
${this.results.errors.join('\n')}
`;

    await fs.writeFile(reportPath, report);
  }

  /**
   * 📤 Generate output for GitHub Actions
   */
  generateOutput() {
    // Set GitHub Actions outputs
    if (process.env.GITHUB_ACTIONS === 'true') {
      console.log(`::set-output name=devices_found::${this.results.devicesFound}`);
      console.log(`::set-output name=features_added::${this.results.featuresAdded}`);
      console.log(`::set-output name=changes_made::${this.results.changesMade}`);
    }

    return this.results;
  }
}

// CLI execution
if (require.main === module) {
  const monitor = new GitHubMultiSourceMonitor();

  monitor.execute()
    .then(results => {
      console.log('✅ Multi-source monitoring completed:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Multi-source monitoring failed:', error);
      process.exit(1);
    });
}

module.exports = GitHubMultiSourceMonitor;
