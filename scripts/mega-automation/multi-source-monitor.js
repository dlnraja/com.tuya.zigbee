#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * 🌍 MULTI-SOURCE MONITOR
 * Veille automatique depuis ZHA, projets communautaires, GitHub, Blakadder, etc.
 */
class MultiSourceMonitor {
  constructor() {
    this.sources = {
      zha: {
        name: 'Zigbee Home Assistant (ZHA)',
        urls: [
          'https://github.com/zigpy/zha-device-handlers',
          'https://github.com/zigpy/zha-device-handlers/tree/dev/zhaquirks',
          'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks',
          'https://github.com/home-assistant/core/tree/dev/homeassistant/components/zha'
        ],
        patterns: ['_TZ3000_', '_TZE200_', '_TYZB01_', 'manufacturer_id', 'model']
      },
      blakadder: {
        name: 'Blakadder Zigbee Database',
        urls: [
          'https://zigbee.blakadder.com/devices.json',
          'https://github.com/blakadder/zigbee',
          'https://zigbee.blakadder.com/',
          'https://raw.githubusercontent.com/blakadder/zigbee/master/_data/devices.yml'
        ],
        patterns: ['manufacturerName', 'modelID', 'vendor', 'model']
      },
      community: {
        name: 'Community Forums & Projects',
        urls: [
          'https://community.home-assistant.io/c/configuration/zigbee',
          'https://github.com/Koenkk/zigbee2mqtt/tree/master/lib/devices',
          'https://github.com/Koenkk/zigbee-herdsman-converters/tree/master/devices',
          'https://community.homey.app/c/apps/7',
          'https://reddit.com/r/homeautomation'
        ],
        patterns: ['tuya', 'zigbee', '_TZ', 'manufacturer']
      },
      github: {
        name: 'GitHub Repositories',
        urls: [
          'https://api.github.com/search/repositories?q=tuya+zigbee',
          'https://api.github.com/search/repositories?q=zigbee+devices',
          'https://api.github.com/search/code?q=_TZ3000_+extension:js',
          'https://api.github.com/search/code?q=manufacturerName+tuya'
        ],
        patterns: ['_TZ', 'tuya', 'zigbee', 'manufacturer']
      },
      research: {
        name: 'Research & Documentation',
        urls: [
          'https://github.com/dresden-elektronik/deconz-rest-plugin/tree/master/devices',
          'https://github.com/Koenkk/zigbee2mqtt.io/tree/master/docs/devices',
          'https://github.com/zigbeefordomoticz/wiki/wiki',
          'https://templates.blakadder.com/zigbee.html'
        ],
        patterns: ['manufacturerCode', 'modelIdentifier', 'deviceType']
      }
    };

    this.outputDir = path.join(process.cwd(), 'project-data', 'multi-source-data');
    this.maxRequestsPerSource = 50; // Limite pour éviter rate limiting
    this.requestDelay = 1000; // 1 seconde entre requests
    this.discoveries = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const icons = { info: '📝', success: '✅', error: '❌', warning: '⚠️', discovery: '🔍' };
    console.log(`${icons[type]} [${timestamp.substring(11, 19)}] ${message}`);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchWithRetry(url, options = {}) {
    const maxRetries = 3;
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TuyaZigbeeBot/1.0; +https://github.com/dlnraja/com.tuya.zigbee)',
            'Accept': 'application/json, text/html, */*',
            ...options.headers
          },
          ...options
        });

        if (response.status === 200) {
          return response.data;
        }
      } catch (error) {
        lastError = error;
        if (error.response?.status === 429) {
          // Rate limited - wait longer
          await this.delay(5000 * (i + 1));
        } else if (error.response?.status === 403) {
          // Forbidden - skip
          this.log(`🚫 Access forbidden: ${url}`, 'warning');
          break;
        } else {
          await this.delay(1000 * (i + 1));
        }
      }
    }

    this.log(`❌ Failed to fetch ${url}: ${lastError?.message}`, 'error');
    return null;
  }

  extractManufacturerIds(content) {
    if (!content) return [];

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const patterns = [
      /_TZ3000_[a-zA-Z0-9_]+/g,
      /_TZE200_[a-zA-Z0-9_]+/g,
      /_TZE204_[a-zA-Z0-9_]+/g,
      /_TYZB01_[a-zA-Z0-9_]+/g,
      /_TZ3210_[a-zA-Z0-9_]+/g,
      /_TZE284_[a-zA-Z0-9_]+/g
    ];

    const found = new Set();
    patterns.forEach(pattern => {
      const matches = contentStr.match(pattern);
      if (matches) {
        matches.forEach(match => found.add(match));
      }
    });

    return Array.from(found);
  }

  extractDeviceInfo(content) {
    if (!content) return [];

    const devices = [];
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    // Patterns pour extraire des informations de device
    const devicePatterns = [
      /manufacturerName.*?["']([^"']+)["']/gi,
      /modelID.*?["']([^"']+)["']/gi,
      /vendor.*?["']([^"']+)["']/gi,
      /model.*?["']([^"']+)["']/gi,
      /description.*?["']([^"']+)["']/gi
    ];

    devicePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(contentStr)) !== null) {
        if (match[1] && match[1].length > 2) {
          devices.push({
            type: pattern.source.split('.*?')[0],
            value: match[1].trim(),
            context: match[0]
          });
        }
      }
    });

    return devices;
  }

  async monitorZHA() {
    this.log('🏠 Monitoring Zigbee Home Assistant (ZHA)...', 'info');
    const zhaData = { manufacturerIds: [], devices: [], quirks: [] };

    for (const url of this.sources.zha.urls) {
      await this.delay(this.requestDelay);

      try {
        const content = await this.fetchWithRetry(url);
        if (content) {
          const manufacturerIds = this.extractManufacturerIds(content);
          const devices = this.extractDeviceInfo(content);

          zhaData.manufacturerIds.push(...manufacturerIds);
          zhaData.devices.push(...devices);

          if (manufacturerIds.length > 0) {
            this.log(`🔍 ZHA: ${manufacturerIds.length} manufacturer IDs trouvés depuis ${url}`, 'discovery');
          }
        }
      } catch (error) {
        this.log(`⚠️ ZHA: Erreur avec ${url}: ${error.message}`, 'warning');
      }
    }

    // Déduplication
    zhaData.manufacturerIds = [...new Set(zhaData.manufacturerIds)];
    return zhaData;
  }

  async monitorBlakadder() {
    this.log('📊 Monitoring Blakadder Zigbee Database...', 'info');
    const blakadderData = { devices: [], manufacturerIds: [] };

    for (const url of this.sources.blakadder.urls) {
      await this.delay(this.requestDelay);

      try {
        const content = await this.fetchWithRetry(url);
        if (content) {
          const manufacturerIds = this.extractManufacturerIds(content);
          const devices = this.extractDeviceInfo(content);

          blakadderData.manufacturerIds.push(...manufacturerIds);
          blakadderData.devices.push(...devices);

          if (manufacturerIds.length > 0) {
            this.log(`🔍 Blakadder: ${manufacturerIds.length} manufacturer IDs trouvés`, 'discovery');
          }
        }
      } catch (error) {
        this.log(`⚠️ Blakadder: Erreur avec ${url}: ${error.message}`, 'warning');
      }
    }

    blakadderData.manufacturerIds = [...new Set(blakadderData.manufacturerIds)];
    return blakadderData;
  }

  async monitorGitHub() {
    this.log('🐙 Monitoring GitHub Repositories...', 'info');
    const githubData = { repositories: [], code: [], manufacturerIds: [] };

    // Utiliser le token GitHub si disponible
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      this.log('🔑 GitHub token détecté - rate limit élevé disponible', 'success');
    }

    for (const url of this.sources.github.urls) {
      await this.delay(this.requestDelay * 2); // Plus lent pour GitHub API

      try {
        const content = await this.fetchWithRetry(url, { headers });
        if (content && content.items) {
          for (const item of content.items.slice(0, 20)) { // Limite à 20 résultats
            if (item.html_url) {
              githubData.repositories.push({
                name: item.name || item.repository?.name,
                url: item.html_url,
                description: item.description,
                stars: item.stargazers_count
              });
            }

            // Extraire manufacturer IDs du code
            if (item.text_matches || item.content) {
              const text = item.text_matches?.[0]?.fragment || item.content || '';
              const manufacturerIds = this.extractManufacturerIds(text);
              githubData.manufacturerIds.push(...manufacturerIds);
            }
          }

          this.log(`🔍 GitHub: ${content.items.length} résultats traités depuis ${url}`, 'discovery');
        }
      } catch (error) {
        if (error.response?.status === 403) {
          this.log('⚠️ GitHub API rate limit atteint - considérer l\'ajout d\'un GITHUB_TOKEN', 'warning');
        } else {
          this.log(`⚠️ GitHub: Erreur avec ${url}: ${error.message}`, 'warning');
        }
      }
    }

    githubData.manufacturerIds = [...new Set(githubData.manufacturerIds)];
    return githubData;
  }

  async monitorCommunity() {
    this.log('👥 Monitoring Community Forums & Projects...', 'info');
    const communityData = { posts: [], manufacturerIds: [], devices: [] };

    for (const url of this.sources.community.urls) {
      await this.delay(this.requestDelay * 3); // Plus lent pour éviter blocks

      try {
        // Pour les forums, on fait du web scraping léger
        const content = await this.fetchWithRetry(url);
        if (content) {
          const manufacturerIds = this.extractManufacturerIds(content);
          const devices = this.extractDeviceInfo(content);

          communityData.manufacturerIds.push(...manufacturerIds);
          communityData.devices.push(...devices);

          if (manufacturerIds.length > 0) {
            this.log(`🔍 Community: ${manufacturerIds.length} manufacturer IDs trouvés depuis ${url}`, 'discovery');
          }
        }
      } catch (error) {
        this.log(`⚠️ Community: Erreur avec ${url}: ${error.message}`, 'warning');
      }
    }

    communityData.manufacturerIds = [...new Set(communityData.manufacturerIds)];
    return communityData;
  }

  async monitorResearch() {
    this.log('📚 Monitoring Research & Documentation Sources...', 'info');
    const researchData = { documents: [], manufacturerIds: [], devices: [] };

    for (const url of this.sources.research.urls) {
      await this.delay(this.requestDelay);

      try {
        const content = await this.fetchWithRetry(url);
        if (content) {
          const manufacturerIds = this.extractManufacturerIds(content);
          const devices = this.extractDeviceInfo(content);

          researchData.manufacturerIds.push(...manufacturerIds);
          researchData.devices.push(...devices);

          if (manufacturerIds.length > 0) {
            this.log(`🔍 Research: ${manufacturerIds.length} manufacturer IDs trouvés depuis ${url}`, 'discovery');
          }
        }
      } catch (error) {
        this.log(`⚠️ Research: Erreur avec ${url}: ${error.message}`, 'warning');
      }
    }

    researchData.manufacturerIds = [...new Set(researchData.manufacturerIds)];
    return researchData;
  }

  async analyzeDiscoveries(allData) {
    this.log('🧠 Analyse des découvertes...', 'info');

    const analysis = {
      totalSources: Object.keys(this.sources).length,
      totalManufacturerIds: 0,
      totalDevices: 0,
      newDiscoveries: [],
      recommendations: []
    };

    // Charger les données existantes pour comparaison
    let existingIds = [];
    try {
      const existingFiles = [
        path.join(process.cwd(), 'project-data', 'enhanced-device-database.json'),
        path.join(process.cwd(), 'project-data', 'johan-benz-devices.json')
      ];

      for (const file of existingFiles) {
        if (fs.existsSync(file)) {
          const data = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (data.manufacturers) {
            existingIds.push(...Object.keys(data.manufacturers));
          } else if (Array.isArray(data)) {
            existingIds.push(...data.map(d => d.manufacturerName || d.manufacturerId).filter(Boolean));
          }
        }
      }
    } catch (error) {
      this.log('⚠️ Erreur lors du chargement des données existantes', 'warning');
    }

    existingIds = [...new Set(existingIds)];

    // Analyser chaque source
    Object.entries(allData).forEach(([source, data]) => {
      if (data.manufacturerIds) {
        analysis.totalManufacturerIds += data.manufacturerIds.length;

        // Identifier les nouveaux IDs
        const newIds = data.manufacturerIds.filter(id => !existingIds.includes(id));
        if (newIds.length > 0) {
          analysis.newDiscoveries.push({
            source,
            newIds,
            count: newIds.length
          });
        }
      }

      if (data.devices) {
        analysis.totalDevices += data.devices.length;
      }
    });

    // Générer des recommandations
    if (analysis.newDiscoveries.length > 0) {
      analysis.recommendations.push('🔧 Mettre à jour la base de données avec les nouveaux manufacturer IDs');
      analysis.recommendations.push('📝 Créer des drivers pour les nouveaux devices trouvés');
      analysis.recommendations.push('🧪 Tester la compatibilité des nouveaux manufacturer IDs');
    }

    if (allData.github?.repositories?.length > 0) {
      analysis.recommendations.push('🔍 Examiner les repos GitHub populaires pour inspiration');
    }

    return analysis;
  }

  async generateReport(allData, analysis) {
    const timestamp = new Date().toISOString();
    const report = {
      metadata: {
        generatedAt: timestamp,
        duration: 'Multi-source monitoring',
        sources: Object.keys(this.sources),
        totalRequests: Object.values(this.sources).reduce((sum, src) => sum + src.urls.length, 0)
      },
      summary: {
        totalSources: analysis.totalSources,
        totalManufacturerIds: analysis.totalManufacturerIds,
        totalDevices: analysis.totalDevices,
        newDiscoveries: analysis.newDiscoveries.length
      },
      discoveries: analysis.newDiscoveries,
      recommendations: analysis.recommendations,
      detailedData: allData
    };

    // Sauvegarder le rapport
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const reportPath = path.join(this.outputDir, `multi-source-report-${timestamp.split('T')[0]}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Générer rapport markdown
    const markdownPath = path.join(this.outputDir, `MULTI-SOURCE-MONITORING-REPORT.md`);
    const markdown = this.generateMarkdownReport(report);
    fs.writeFileSync(markdownPath, markdown);

    return { reportPath, markdownPath, report };
  }

  generateMarkdownReport(report) {
    return `# 🌍 MULTI-SOURCE MONITORING REPORT

**Generated**: ${report.metadata.generatedAt}
**Sources Monitored**: ${report.metadata.sources.join(', ')}
**Total Requests**: ${report.metadata.totalRequests}

## 📊 SUMMARY

- **Sources Monitored**: ${report.summary.totalSources}
- **Manufacturer IDs Found**: ${report.summary.totalManufacturerIds}
- **Devices Discovered**: ${report.summary.totalDevices}
- **New Discoveries**: ${report.summary.newDiscoveries}

## 🔍 NEW DISCOVERIES

${report.discoveries.map(discovery => `
### ${discovery.source.toUpperCase()} - ${discovery.count} New IDs
${discovery.newIds.map(id => `- \`${id}\``).join('\n')}
`).join('\n')}

## 🎯 RECOMMENDATIONS

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## 📝 DETAILED FINDINGS

### ZHA (Zigbee Home Assistant)
- Manufacturer IDs: ${report.detailedData.zha?.manufacturerIds?.length || 0}
- Devices: ${report.detailedData.zha?.devices?.length || 0}

### Blakadder Database
- Manufacturer IDs: ${report.detailedData.blakadder?.manufacturerIds?.length || 0}
- Devices: ${report.detailedData.blakadder?.devices?.length || 0}

### GitHub Repositories
- Repositories: ${report.detailedData.github?.repositories?.length || 0}
- Manufacturer IDs: ${report.detailedData.github?.manufacturerIds?.length || 0}

### Community Sources
- Manufacturer IDs: ${report.detailedData.community?.manufacturerIds?.length || 0}
- Devices: ${report.detailedData.community?.devices?.length || 0}

### Research Sources
- Manufacturer IDs: ${report.detailedData.research?.manufacturerIds?.length || 0}
- Devices: ${report.detailedData.research?.devices?.length || 0}

---
*Generated by Multi-Source Monitor v1.0.0*
*Automated monitoring of ZHA, Blakadder, GitHub, Community Forums, and Research Sources*
`;
  }

  async runFullMonitoring() {
    const startTime = Date.now();
    this.log('🌍 DÉMARRAGE VEILLE MULTI-SOURCES', 'info');
    this.log('=' + '='.repeat(50), 'info');

    const allData = {};

    try {
      // Monitor toutes les sources en parallèle avec délais
      allData.zha = await this.monitorZHA();
      allData.blakadder = await this.monitorBlakadder();
      allData.github = await this.monitorGitHub();
      allData.community = await this.monitorCommunity();
      allData.research = await this.monitorResearch();

      // Analyser les découvertes
      const analysis = await this.analyzeDiscoveries(allData);

      // Générer le rapport
      const reportData = await this.generateReport(allData, analysis);

      const duration = Date.now() - startTime;
      this.log(`🎉 VEILLE TERMINÉE en ${Math.round(duration / 1000)}s`, 'success');
      this.log(`📄 Rapport: ${reportData.markdownPath}`, 'success');
      this.log(`📊 Total manufacturer IDs: ${analysis.totalManufacturerIds}`, 'info');
      this.log(`🔍 Nouvelles découvertes: ${analysis.newDiscoveries.length}`, analysis.newDiscoveries.length > 0 ? 'discovery' : 'info');

      return {
        success: true,
        data: allData,
        analysis,
        report: reportData.reportPath,
        duration
      };

    } catch (error) {
      this.log(`❌ ERREUR CRITIQUE: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        data: allData
      };
    }
  }
}

// Exécution directe
if (require.main === module) {
  const monitor = new MultiSourceMonitor();

  monitor.runFullMonitoring().then(result => {
    if (result.success) {
      console.log('\n🎉 VEILLE MULTI-SOURCES TERMINÉE AVEC SUCCÈS');
      console.log('=============================================');
      console.log(`📊 Total découvertes: ${result.analysis.totalManufacturerIds}`);
      console.log(`🔍 Nouvelles: ${result.analysis.newDiscoveries.length}`);
      console.log(`⏱️ Durée: ${Math.round(result.duration / 1000)}s`);
      process.exit(0);
    } else {
      console.log('\n❌ VEILLE ÉCHOUÉE');
      console.log('=================');
      console.log(`Erreur: ${result.error}`);
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ ERREUR FATALE:', error.message);
    process.exit(1);
  });
}

module.exports = MultiSourceMonitor;
