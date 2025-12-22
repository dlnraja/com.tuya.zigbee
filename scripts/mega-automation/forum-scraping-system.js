#!/usr/bin/env node

/**
 * 🏭 FORUM SCRAPING SYSTEM v1.0.0
 *
 * Scraping automatique des forums et communautés:
 * - Forum Homey Community (community.homey.app)
 * - Reddit r/Homey, r/Zigbee
 * - GitHub Discussions
 * - Discord communautés (via webhooks publics)
 *
 * Extrait: devices Tuya, fingerprints, solutions, flows
 */

const fs = require('fs').promises;
const path = require('path');

class ForumScrapingSystem {
  constructor() {
    this.config = {
      // Forums à scraper avec fréquences
      forums: {
        homey_community: {
          baseUrl: 'https://community.homey.app',
          endpoints: [
            '/c/apps/tuya-zigbee-hub',
            '/search?q=tuya%20device',
            '/search?q=_TZ3000_',
            '/search?q=TS0601'
          ],
          priority: 'high',
          enabled: true
        },
        reddit_homey: {
          baseUrl: 'https://www.reddit.com/r/homey',
          endpoints: [
            '/search.json?q=tuya&sort=new&limit=50',
            '/search.json?q=zigbee%20device&sort=new&limit=25'
          ],
          priority: 'medium',
          enabled: true
        },
        reddit_zigbee: {
          baseUrl: 'https://www.reddit.com/r/zigbee',
          endpoints: [
            '/search.json?q=tuya&sort=new&limit=50',
            '/search.json?q=homey&sort=new&limit=25'
          ],
          priority: 'medium',
          enabled: true
        },
        github_discussions: {
          baseUrl: 'https://api.github.com',
          endpoints: [
            '/repos/JohanBendz/com.tuya.zigbee/discussions',
            '/repos/dlnraja/com.tuya.zigbee/discussions'
          ],
          priority: 'low',
          enabled: false // GraphQL complexe, skip pour l'instant
        }
      },

      // Patterns de détection selon mémoire
      devicePatterns: {
        manufacturerName: /_TZ[A-Z0-9]{4}_[a-z0-9]{8,12}/gi,
        productId: /TS[0-9]{4}[A-Z]?/gi,
        modelId: /Model.*ID[:\s]*([A-Z0-9._-]+)/gi,
        deviceName: /Device.*Name[:\s]*([^\n\r]+)/gi,
        fingerprint: /fingerprint|manufacturername|productid|cluster/gi
      },

      // Features à extraire (pas seulement manufacturerNames)
      featurePatterns: {
        flows: {
          triggers: /trigger[:\s]*([^\n]+)/gi,
          conditions: /condition[:\s]*([^\n]+)/gi,
          actions: /action[:\s]*([^\n]+)/gi
        },
        capabilities: {
          onoff: /on\/off|switch|power.*state/gi,
          dim: /dimming|brightness|dim.*level/gi,
          temperature: /temperature|temp.*measure/gi,
          humidity: /humidity|humid.*measure/gi,
          battery: /battery|batt.*level|power.*source/gi,
          motion: /motion|pir|presence|occupancy/gi,
          contact: /door|window|contact.*sensor/gi
        },
        datapoints: /dp[:\s]*(\d+)|datapoint[:\s]*(\d+)/gi,
        clusters: /cluster[s]?[:\s]*\[?([0-9,\s]+)\]?/gi
      }
    };

    // Arguments ligne de commande
    this.maxDevices = parseInt(process.argv.find(arg => arg.startsWith('--max-devices='))?.split('=')[1] || '10');
    this.forceFeatures = process.argv.find(arg => arg.startsWith('--force-features='))?.split('=')[1] === 'true';
    this.executionType = process.argv.find(arg => arg.startsWith('--execution-type='))?.split('=')[1] || 'forum_scheduled';

    this.results = {
      devicesFound: 0,
      topicsProcessed: 0,
      featuresExtracted: 0,
      forums: {},
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
   * 🏭 Scraper principal multi-forums
   */
  async scrapeAllForums() {
    const allFindings = [];

    for (const [forumName, forumConfig] of Object.entries(this.config.forums)) {
      if (!forumConfig.enabled) {
        await this.log('INFO', `⏭️ Skipping disabled forum: ${forumName}`);
        continue;
      }

      try {
        await this.log('INFO', `🏭 Scraping forum: ${forumName} (${forumConfig.baseUrl})`);

        const forumFindings = await this.scrapeSpecificForum(forumName, forumConfig);
        allFindings.push(...forumFindings);

        this.results.forums[forumName] = {
          url: forumConfig.baseUrl,
          findings: forumFindings.length,
          status: 'success',
          priority: forumConfig.priority
        };

        // Délai entre forums pour éviter rate limiting
        await this.delay(2000);

      } catch (error) {
        await this.log('ERROR', `Failed to scrape ${forumName}:`, error);
        this.results.errors.push(`${forumName}: ${error.message}`);

        this.results.forums[forumName] = {
          url: forumConfig.baseUrl,
          findings: 0,
          status: 'error',
          error: error.message
        };
      }
    }

    return allFindings.slice(0, this.maxDevices);
  }

  /**
   * 🕷️ Scraper spécifique par forum
   */
  async scrapeSpecificForum(forumName, forumConfig) {
    const findings = [];

    switch (forumName) {
      case 'homey_community':
        return await this.scrapeHomeyForum(forumConfig);

      case 'reddit_homey':
      case 'reddit_zigbee':
        return await this.scrapeReddit(forumConfig);

      case 'github_discussions':
        return await this.scrapeGitHubDiscussions(forumConfig);

      default:
        await this.log('WARN', `Unknown forum type: ${forumName}`);
        return [];
    }
  }

  /**
   * 🏠 Scraper Forum Homey Community
   */
  async scrapeHomeyForum(forumConfig) {
    const findings = [];

    for (const endpoint of forumConfig.endpoints) {
      try {
        const url = `${forumConfig.baseUrl}${endpoint}.json`;

        await this.log('INFO', `📡 Fetching: ${url}`);

        // Note: Forum Homey peut nécessiter authentification pour certains endpoints
        // Pour l'instant on utilise les endpoints publics
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'dlnraja-forum-scraper/1.0',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          await this.log('WARN', `Homey forum endpoint failed: ${response.status} - ${endpoint}`);
          continue;
        }

        const data = await response.json();

        // Parser topics/posts pour devices
        if (data.topic_list?.topics) {
          for (const topic of data.topic_list.topics) {
            const deviceInfo = await this.parseForumPostForDevices(topic, 'homey_community');
            if (deviceInfo) {
              findings.push(deviceInfo);
            }
          }
        }

        this.results.topicsProcessed += data.topic_list?.topics?.length || 0;

      } catch (error) {
        await this.log('WARN', `Error scraping Homey forum endpoint ${endpoint}:`, error);
      }
    }

    return findings;
  }

  /**
   * 🤖 Scraper Reddit
   */
  async scrapeReddit(forumConfig) {
    const findings = [];

    for (const endpoint of forumConfig.endpoints) {
      try {
        const url = `${forumConfig.baseUrl}${endpoint}`;

        await this.log('INFO', `📡 Fetching Reddit: ${url}`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'dlnraja-forum-scraper/1.0 (contact: via GitHub)'
          }
        });

        if (!response.ok) {
          await this.log('WARN', `Reddit API failed: ${response.status} - ${endpoint}`);
          continue;
        }

        const data = await response.json();

        // Parser Reddit posts
        if (data.data?.children) {
          for (const post of data.data.children) {
            if (post.kind === 't3') { // Reddit post
              const deviceInfo = await this.parseForumPostForDevices(post.data, 'reddit');
              if (deviceInfo) {
                findings.push(deviceInfo);
              }
            }
          }
        }

        this.results.topicsProcessed += data.data?.children?.length || 0;

      } catch (error) {
        await this.log('WARN', `Error scraping Reddit endpoint ${endpoint}:`, error);
      }
    }

    return findings;
  }

  /**
   * 💬 Scraper GitHub Discussions (futur)
   */
  async scrapeGitHubDiscussions(forumConfig) {
    // GitHub Discussions nécessite GraphQL - implémentation future
    await this.log('INFO', '💬 GitHub Discussions scraping - TODO (GraphQL required)');
    return [];
  }

  /**
   * 🔬 Parser post/topic pour devices
   */
  async parseForumPostForDevices(post, source) {
    const text = `${post.title || ''} ${post.selftext || ''} ${post.excerpt || ''} ${post.body || ''}`.toLowerCase();

    // Vérifier si contient des infos device
    const hasDeviceInfo = this.config.devicePatterns.fingerprint.test(text);
    if (!hasDeviceInfo) {
      return null;
    }

    const deviceInfo = {
      source: `forum_${source}`,
      id: post.id,
      url: post.url || post.permalink,
      title: post.title,
      author: post.author || post.username,
      created: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : new Date().toISOString(),

      // Device data selon règles strictes mémoire
      manufacturerName: null,
      productId: null,
      modelId: null,
      deviceName: null,

      // Features complètes
      flows: { triggers: [], conditions: [], actions: [] },
      capabilities: [],
      dataPoints: [],
      clusters: [],

      confidence: 0,
      raw_text: text.substring(0, 1000) // Pour debug
    };

    // Extraction manufacturerName - JAMAIS SEUL selon règles
    const mfrMatches = text.match(this.config.devicePatterns.manufacturerName);
    if (mfrMatches) {
      deviceInfo.manufacturerName = mfrMatches[0];
      deviceInfo.confidence += 25;
    }

    // Extraction productId - REQUIS avec manufacturerName
    const productMatches = text.match(this.config.devicePatterns.productId);
    if (productMatches) {
      deviceInfo.productId = productMatches[0];
      deviceInfo.confidence += 25;
    }

    // RÈGLE CRITIQUE: manufacturerName + productId ensemble
    if (!deviceInfo.manufacturerName || !deviceInfo.productId) {
      return null;
    }

    // RÈGLE: Jamais TS0601 seul
    if (deviceInfo.productId === 'TS0601' && !deviceInfo.manufacturerName) {
      return null;
    }

    // Extraction device name
    const nameMatches = text.match(this.config.devicePatterns.deviceName);
    if (nameMatches) {
      deviceInfo.deviceName = nameMatches[1]?.trim() || post.title;
    } else {
      deviceInfo.deviceName = post.title;
    }

    // Features complètes si force-features
    if (this.forceFeatures) {
      deviceInfo.flows = this.extractFlows(text);
      deviceInfo.capabilities = this.extractCapabilities(text);
      deviceInfo.dataPoints = this.extractDataPoints(text);
      deviceInfo.clusters = this.extractClusters(text);

      if (deviceInfo.flows.triggers.length > 0 || deviceInfo.capabilities.length > 0) {
        deviceInfo.confidence += 20;
        this.results.featuresExtracted++;
      }
    }

    // Validation minimale
    if (deviceInfo.confidence >= 40) {
      return deviceInfo;
    }

    return null;
  }

  /**
   * 🔗 Extraire flows depuis texte forum
   */
  extractFlows(text) {
    const flows = { triggers: [], conditions: [], actions: [] };

    // Triggers
    const triggerMatches = text.match(this.config.featurePatterns.flows.triggers);
    if (triggerMatches) {
      flows.triggers = triggerMatches.map(m => m.replace(/trigger[:\s]*/i, '').trim());
    }

    // Conditions
    const conditionMatches = text.match(this.config.featurePatterns.flows.conditions);
    if (conditionMatches) {
      flows.conditions = conditionMatches.map(m => m.replace(/condition[:\s]*/i, '').trim());
    }

    // Actions
    const actionMatches = text.match(this.config.featurePatterns.flows.actions);
    if (actionMatches) {
      flows.actions = actionMatches.map(m => m.replace(/action[:\s]*/i, '').trim());
    }

    return flows;
  }

  /**
   * 🎯 Extraire capabilities
   */
  extractCapabilities(text) {
    const capabilities = [];

    for (const [capability, pattern] of Object.entries(this.config.featurePatterns.capabilities)) {
      if (pattern.test(text)) {
        capabilities.push(`measure_${capability}`);
      }
    }

    return [...new Set(capabilities)];
  }

  /**
   * 📊 Extraire datapoints Tuya
   */
  extractDataPoints(text) {
    const dataPoints = [];

    let match;
    const dpPattern = new RegExp(this.config.featurePatterns.datapoints.source, 'gi');
    while ((match = dpPattern.exec(text)) !== null) {
      const dpNum = parseInt(match[1] || match[2]);
      if (!isNaN(dpNum) && dpNum >= 0 && dpNum <= 255) {
        dataPoints.push(dpNum);
      }
    }

    return [...new Set(dataPoints)];
  }

  /**
   * ⚙️ Extraire clusters
   */
  extractClusters(text) {
    const clusters = [];

    const clusterMatches = text.match(this.config.featurePatterns.clusters);
    if (clusterMatches) {
      for (const match of clusterMatches) {
        const numbers = match.match(/\d+/g);
        if (numbers) {
          clusters.push(...numbers.map(n => parseInt(n)).filter(n => n >= 0 && n <= 65535));
        }
      }
    }

    return [...new Set(clusters)];
  }

  /**
   * ⏱️ Délai pour rate limiting
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 💾 Sauvegarder findings
   */
  async saveFindingsForIntegration(findings) {
    const outputPath = path.join(process.cwd(), 'data', 'forums', 'forum-findings.json');

    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const output = {
      timestamp: new Date().toISOString(),
      executionType: this.executionType,
      totalFindings: findings.length,
      findings: findings,
      forums: this.results.forums,
      statistics: {
        devicesFound: this.results.devicesFound,
        topicsProcessed: this.results.topicsProcessed,
        featuresExtracted: this.results.featuresExtracted
      }
    };

    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    await this.log('INFO', `💾 Saved ${findings.length} forum findings to ${outputPath}`);
  }

  /**
   * 🚀 Exécution principale
   */
  async execute() {
    try {
      await this.log('INFO', `🚀 Starting Forum Scraping System (${this.executionType})`);

      // 1. Scraper tous les forums
      const findings = await this.scrapeAllForums();

      if (findings.length === 0) {
        await this.log('INFO', '📝 No device-related findings from forums');
        return this.generateOutput();
      }

      this.results.devicesFound = findings.length;

      // 2. Sauvegarder pour integration
      await this.saveFindingsForIntegration(findings);

      // 3. Rapport détaillé
      await this.generateForumReport(findings);

      await this.log('SUCCESS', `✅ Forum Scraping completed: ${findings.length} devices found from ${Object.keys(this.results.forums).length} forums`);

      return this.generateOutput();

    } catch (error) {
      await this.log('ERROR', '❌ Forum Scraping System failed:', error);
      this.results.errors.push(error.message);
      throw error;
    }
  }

  /**
   * 📊 Générer rapport forum
   */
  async generateForumReport(findings) {
    const reportPath = path.join(process.cwd(), 'logs', 'forum-scraping', `forum-scraping-${Date.now()}.log`);

    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    const report = `
FORUM SCRAPING SYSTEM REPORT
============================

Execution: ${this.executionType}
Timestamp: ${new Date().toISOString()}
Max Devices: ${this.maxDevices}
Force Features: ${this.forceFeatures}

FORUMS PROCESSED:
${Object.entries(this.results.forums).map(([name, info]) =>
      `- ${name}: ${info.status} - ${info.findings} devices (${info.url})`
    ).join('\n')}

DEVICES FOUND: ${findings.length}
${findings.map((f, i) =>
      `${i + 1}. ${f.manufacturerName}/${f.productId} - ${f.deviceName} (${f.source})`
    ).join('\n')}

FEATURES EXTRACTED:
- Total: ${this.results.featuresExtracted}
- Flows: ${findings.reduce((acc, f) => acc + (f.flows?.triggers?.length || 0), 0)} triggers
- Capabilities: ${findings.reduce((acc, f) => acc + (f.capabilities?.length || 0), 0)}
- DataPoints: ${findings.reduce((acc, f) => acc + (f.dataPoints?.length || 0), 0)}
- Clusters: ${findings.reduce((acc, f) => acc + (f.clusters?.length || 0), 0)}

TOPICS PROCESSED: ${this.results.topicsProcessed}

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
      console.log(`::set-output name=devices_found::${this.results.devicesFound}`);
      console.log(`::set-output name=topics_processed::${this.results.topicsProcessed}`);
    }

    return this.results;
  }
}

// CLI execution
if (require.main === module) {
  const scraper = new ForumScrapingSystem();

  scraper.execute()
    .then(results => {
      console.log('✅ Forum scraping completed:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Forum scraping failed:', error);
      process.exit(1);
    });
}

module.exports = ForumScrapingSystem;
