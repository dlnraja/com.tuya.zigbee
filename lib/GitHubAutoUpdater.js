'use strict';

const https = require('https');

/**
 * GitHubAutoUpdater - Automatic updates from GitHub repositories
 * 
 * Fetches latest device configurations, quirks, and Data Points from:
 * - zigpy/zigpy
 * - zigpy/zha-device-handlers
 * - Koenkk/zigbee2mqtt
 * - make-all/tuya-local
 * 
 * Updates are cached and applied intelligently
 */
class GitHubAutoUpdater {

  constructor() {
    this.sources = {
      zigpy: 'https://api.github.com/repos/zigpy/zigpy/commits/dev',
      zhaHandlers: 'https://api.github.com/repos/zigpy/zha-device-handlers/commits/dev',
      zigbee2mqtt: 'https://api.github.com/repos/Koenkk/zigbee2mqtt/commits/master',
      tuyaLocal: 'https://api.github.com/repos/make-all/tuya-local/commits/main'
    };
    
    this.cache = {
      lastCheck: null,
      lastUpdate: null,
      versions: {}
    };
  }

  /**
   * Check for updates from all sources
   */
  async checkForUpdates() {
    console.log('🔄 Checking GitHub sources for updates...');
    
    const updates = {};
    
    for (const [name, url] of Object.entries(this.sources)) {
      try {
        const latestCommit = await this.fetchLatestCommit(url);
        updates[name] = {
          sha: latestCommit.sha,
          date: latestCommit.commit.author.date,
          message: latestCommit.commit.message
        };
        
        // Check if this is a new version
        if (!this.cache.versions[name] || this.cache.versions[name].sha !== latestCommit.sha) {
          console.log(`✅ New update available from ${name}`);
          console.log(`   ${latestCommit.commit.message.split('\n')[0]}`);
        }
        
      } catch (err) {
        console.error(`Failed to check ${name}:`, err.message);
      }
    }
    
    this.cache.lastCheck = new Date();
    this.cache.versions = updates;
    
    return updates;
  }

  /**
   * Fetch latest commit from GitHub API
   */
  async fetchLatestCommit(url) {
    return new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          'User-Agent': 'Homey-Tuya-Zigbee-App',
          'Accept': 'application/vnd.github.v3+json'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error('Failed to parse GitHub response'));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Fetch Tuya Data Points from community sources
   */
  async fetchTuyaDataPoints() {
    console.log('📥 Fetching Tuya Data Points from GitHub...');
    
    const sources = [
      'https://raw.githubusercontent.com/DzurisHome/Tuya-Data-Points/main/README.md',
      'https://raw.githubusercontent.com/dulfer/localtuya-device-datapoints/main/README.md'
    ];
    
    const dataPoints = [];
    
    for (const url of sources) {
      try {
        const content = await this.fetchRawFile(url);
        // Parse markdown tables for DP information
        const dps = this.parseTuyaDataPoints(content);
        dataPoints.push(...dps);
        console.log(`✅ Fetched ${dps.length} DPs from ${url}`);
      } catch (err) {
        console.error(`Failed to fetch ${url}:`, err.message);
      }
    }
    
    return dataPoints;
  }

  /**
   * Fetch raw file from GitHub
   */
  async fetchRawFile(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  /**
   * Parse Tuya Data Points from markdown
   */
  parseTuyaDataPoints(markdown) {
    const dataPoints = [];
    const lines = markdown.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for markdown table rows with DP information
      if (line.trim().startsWith('|') && line.includes('DP')) {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 3) {
          const dpId = parts[0].match(/\d+/)?.[0];
          if (dpId) {
            dataPoints.push({
              id: parseInt(dpId),
              name: parts[1] || 'Unknown',
              type: parts[2] || 'Unknown',
              description: parts[3] || ''
            });
          }
        }
      }
    }
    
    return dataPoints;
  }

  /**
   * Fetch zigpy quirks
   */
  async fetchZigpyQuirks() {
    console.log('📥 Fetching zigpy quirks...');
    
    try {
      const quirksUrl = 'https://api.github.com/repos/zigpy/zha-device-handlers/contents/zhaquirks';
      const response = await this.fetchLatestCommit(quirksUrl);
      
      // Filter for Python files (quirks)
      const quirkFiles = response.filter(item => item.name.endsWith('.py'));
      console.log(`✅ Found ${quirkFiles.length} quirk files`);
      
      return quirkFiles;
      
    } catch (err) {
      console.error('Failed to fetch zigpy quirks:', err);
      return [];
    }
  }

  /**
   * Get cache status
   */
  getStatus() {
    return {
      lastCheck: this.cache.lastCheck,
      lastUpdate: this.cache.lastUpdate,
      sources: Object.keys(this.sources).length,
      versions: this.cache.versions
    };
  }
}

module.exports = GitHubAutoUpdater;
