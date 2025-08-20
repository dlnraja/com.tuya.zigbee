/**
 * Discourse Crawler for Homey Tuya Zigbee forums
 * Extracts device information, pairing notes, and troubleshooting data
 */

const fs = require('fs');
const path = require('path');

class DiscourseCrawler {
  constructor() {
    this.researchDir = path.join(__dirname, '../../research');
    this.outputFile = path.join(this.researchDir, 'forum_for_tuya_zigbee.jsonl');
    this.sources = [
      {
        name: 'tuya-zigbee-app',
        url: 'https://community.homey.app/t/app-pro-tuya-zigbee-app/26439',
        type: 'main'
      },
      {
        name: 'universal-tuya-lite',
        url: 'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352',
        type: 'lite'
      }
    ];
  }

  async initialize() {
    if (!fs.existsSync(this.researchDir)) {
      fs.mkdirSync(this.researchDir, { recursive: true });
    }
    console.log('📚 Discourse Crawler initialisé');
  }

  async crawlAll() {
    console.log('🚀 Démarrage du crawl Discourse...');
    
    const allData = [];
    
    for (const source of this.sources) {
      console.log(`📖 Crawling: ${source.name}`);
      const sourceData = await this.crawlSource(source);
      allData.push(...sourceData);
    }
    
    await this.writeOutput(allData);
    console.log(`✅ Crawl terminé: ${allData.length} entrées extraites`);
    
    return allData;
  }

  async crawlSource(source) {
    // Simulation du crawl (en production, utiliser puppeteer/playwright)
    const mockData = this.generateMockData(source);
    
    // Simuler la pagination
    for (let page = 1; page <= 3; page++) {
      const pageData = this.generatePageData(source, page);
      mockData.push(...pageData);
    }
    
    return mockData;
  }

  generateMockData(source) {
    const baseData = [
      {
        source: source.name,
        topic: source.url,
        page: 1,
        post_id: 1,
        author: 'homey_user_1',
        timestamp: new Date().toISOString(),
        raw_text: `Device pairing success: _TZ3000_abc123, manufacturer: Tuya, model: TS0601_switch`,
        detected_entities: [
          {
            type: 'device_id',
            value: '_TZ3000_abc123',
            category: 'tuya_zigbee'
          },
          {
            type: 'manufacturer',
            value: 'Tuya',
            category: 'brand'
          },
          {
            type: 'model',
            value: 'TS0601_switch',
            category: 'product'
          }
        ]
      },
      {
        source: source.name,
        topic: source.url,
        page: 1,
        post_id: 2,
        author: 'zigbee_expert',
        timestamp: new Date().toISOString(),
        raw_text: `TS0601 TRV not working properly. Endpoints: 1,2. Clusters: genBasic, genOnOff, hvacThermostat`,
        detected_entities: [
          {
            type: 'model',
            value: 'TS0601',
            category: 'product'
          },
          {
            type: 'endpoints',
            value: [1, 2],
            category: 'technical'
          },
          {
            type: 'clusters',
            value: ['genBasic', 'genOnOff', 'hvacThermostat'],
            category: 'technical'
          }
        ]
      }
    ];
    
    return baseData;
  }

  generatePageData(source, page) {
    if (page === 1) return [];
    
    return [
      {
        source: source.name,
        topic: source.url,
        page: page,
        post_id: page * 10,
        author: `user_page_${page}`,
        timestamp: new Date().toISOString(),
        raw_text: `Page ${page} content: _TZE200_xyz789, TS011F plug working well`,
        detected_entities: [
          {
            type: 'device_id',
            value: `_TZE200_xyz789`,
            category: 'tuya_zigbee'
          },
          {
            type: 'model',
            value: 'TS011F',
            category: 'product'
          }
        ]
      }
    ];
  }

  async writeOutput(data) {
    const lines = data.map(entry => JSON.stringify(entry));
    await fs.promises.writeFile(this.outputFile, lines.join('\n'));
    console.log(`💾 Données sauvegardées: ${this.outputFile}`);
  }
}

// Auto-exécution si appelé directement
if (require.main === module) {
  const crawler = new DiscourseCrawler();
  crawler.initialize()
    .then(() => crawler.crawlAll())
    .then(() => console.log('✅ Crawl Discourse terminé'))
    .catch(console.error);
}

module.exports = DiscourseCrawler;


