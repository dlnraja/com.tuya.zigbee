#!/usr/bin/env node
'use strict';

/**
 * Web Research - Intelligent Device Information Gathering
 * Searches Google, Zigbee2MQTT, and other sources for device info
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class WebResearcher {
  constructor(deviceData) {
    this.deviceData = deviceData;
    this.enrichedData = { ...deviceData };
    this.sources = [];
  }

  async research() {
    console.log('🔍 Starting web research...');
    
    try {
      // 1. Search Zigbee2MQTT database
      await this.searchZigbee2MQTT();
      
      // 2. Search Google for device info
      await this.searchGoogle();
      
      // 3. Search GitHub issues (Johan's repo)
      await this.searchGitHubIssues();
      
      // 4. Analyze Z2M link if provided
      if (this.deviceData.z2m_link) {
        await this.analyzeZ2MPage(this.deviceData.z2m_link);
      }
      
      // 5. Heuristic guessing for missing data
      this.fillMissingData();
      
      console.log('✅ Research complete');
      return this.enrichedData;
      
    } catch (err) {
      console.error('⚠️ Research error:', err.message);
      return this.enrichedData;
    }
  }

  async searchZigbee2MQTT() {
    try {
      console.log('  → Searching Zigbee2MQTT...');
      
      const query = `${this.deviceData.manufacturerName || ''} ${this.deviceData.modelId || ''}`.trim();
      if (!query) return;
      
      // Search Z2M devices page
      const url = 'https://www.zigbee2mqtt.io/supported-devices/';
      const response = await axios.get(url, { timeout: 10000 });
      const $ = cheerio.load(response.data);
      
      // Extract device data (simplified - Z2M structure varies)
      const deviceMatches = [];
      $('table tr').each((i, row) => {
        const text = $(row).text();
        if (text.includes(query)) {
          deviceMatches.push({
            source: 'zigbee2mqtt',
            data: $(row).text()
          });
        }
      });
      
      if (deviceMatches.length > 0) {
        this.enrichedData.z2m_matches = deviceMatches;
        this.sources.push('zigbee2mqtt');
        console.log(`  ✅ Found ${deviceMatches.length} Z2M matches`);
      }
      
    } catch (err) {
      console.log('  ⚠️ Z2M search failed:', err.message);
    }
  }

  async searchGoogle() {
    try {
      console.log('  → Searching Google...');
      
      const queries = [
        `${this.deviceData.brand} ${this.deviceData.model} zigbee datasheet`,
        `${this.deviceData.manufacturerName} tuya zigbee`,
        `${this.deviceData.modelId} zigbee clusters capabilities`
      ].filter(q => q.trim() !== ' zigbee datasheet');
      
      for (const query of queries) {
        // Note: Real Google search requires API key
        // This is a placeholder - in production use Google Custom Search API
        console.log(`    Querying: "${query}"`);
        
        // Simulate search results
        this.enrichedData.google_queries = this.enrichedData.google_queries || [];
        this.enrichedData.google_queries.push(query);
      }
      
      this.sources.push('google');
      
    } catch (err) {
      console.log('  ⚠️ Google search failed:', err.message);
    }
  }

  async searchGitHubIssues() {
    try {
      console.log('  → Searching GitHub issues...');
      
      const repos = [
        'JohanBendz/com.tuya.zigbee',
        'dlnraja/com.tuya.zigbee'
      ];
      
      for (const repo of repos) {
        const query = `${this.deviceData.manufacturerName || this.deviceData.model || ''}`;
        if (!query) continue;
        
        const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}+repo:${repo}`;
        
        try {
          const response = await axios.get(url, {
            timeout: 10000,
            headers: { 'Accept': 'application/vnd.github.v3+json' }
          });
          
          if (response.data.items && response.data.items.length > 0) {
            this.enrichedData.github_issues = this.enrichedData.github_issues || [];
            this.enrichedData.github_issues.push(...response.data.items.slice(0, 3));
            console.log(`  ✅ Found ${response.data.items.length} GitHub issues in ${repo}`);
          }
        } catch (err) {
          console.log(`  ⚠️ ${repo} search failed:`, err.message);
        }
      }
      
      this.sources.push('github');
      
    } catch (err) {
      console.log('  ⚠️ GitHub search failed:', err.message);
    }
  }

  async analyzeZ2MPage(url) {
    try {
      console.log('  → Analyzing Z2M page...');
      
      const response = await axios.get(url, { timeout: 10000 });
      const $ = cheerio.load(response.data);
      
      // Extract capabilities
      const capabilities = [];
      $('code, pre').each((i, elem) => {
        const text = $(elem).text();
        if (text.includes('exposes') || text.includes('capabilities')) {
          capabilities.push(text);
        }
      });
      
      if (capabilities.length > 0) {
        this.enrichedData.z2m_capabilities = capabilities;
        console.log(`  ✅ Extracted ${capabilities.length} capability definitions`);
      }
      
    } catch (err) {
      console.log('  ⚠️ Z2M page analysis failed:', err.message);
    }
  }

  fillMissingData() {
    console.log('  → Filling missing data heuristically...');
    
    // Guess category from model name
    if (!this.enrichedData.category) {
      const model = (this.deviceData.model || '').toLowerCase();
      
      if (model.includes('plug') || model.includes('socket')) {
        this.enrichedData.category = 'plugs';
        this.enrichedData.category_confidence = 'high';
      } else if (model.includes('bulb') || model.includes('light')) {
        this.enrichedData.category = 'lighting';
        this.enrichedData.category_confidence = 'high';
      } else if (model.includes('sensor') || model.includes('detect')) {
        this.enrichedData.category = 'sensors';
        this.enrichedData.category_confidence = 'medium';
      } else if (model.includes('switch')) {
        this.enrichedData.category = 'switches';
        this.enrichedData.category_confidence = 'medium';
      } else if (model.includes('thermostat') || model.includes('trv')) {
        this.enrichedData.category = 'climate';
        this.enrichedData.category_confidence = 'high';
      } else {
        this.enrichedData.category = 'uncategorized';
        this.enrichedData.category_confidence = 'low';
      }
    }
    
    // Guess DP profile from model ID
    if (this.deviceData.modelId === 'TS0601') {
      this.enrichedData.requires_dp_mapping = true;
      this.enrichedData.suggested_profile = 'generic-ts0601';
    }
    
    // Guess capabilities from category
    if (this.enrichedData.category === 'plugs') {
      this.enrichedData.suggested_capabilities = ['onoff', 'measure_power', 'meter_power'];
    } else if (this.enrichedData.category === 'lighting') {
      this.enrichedData.suggested_capabilities = ['onoff', 'dim'];
    } else if (this.enrichedData.category === 'sensors') {
      this.enrichedData.suggested_capabilities = ['measure_temperature', 'measure_humidity'];
    }
    
    // Add research summary
    this.enrichedData.research_summary = {
      sources_checked: this.sources,
      confidence_score: this.calculateConfidence(),
      data_completeness: this.calculateCompleteness()
    };
    
    console.log(`  ✅ Confidence: ${this.enrichedData.research_summary.confidence_score}%`);
  }

  calculateConfidence() {
    let score = 0;
    
    if (this.deviceData.manufacturerName) score += 20;
    if (this.deviceData.modelId) score += 20;
    if (this.deviceData.fingerprint) score += 20;
    if (this.deviceData.z2m_link) score += 15;
    if (this.enrichedData.z2m_matches) score += 15;
    if (this.enrichedData.github_issues) score += 10;
    
    return Math.min(score, 100);
  }

  calculateCompleteness() {
    const required = ['manufacturerName', 'modelId', 'category', 'brand'];
    const present = required.filter(k => this.enrichedData[k]).length;
    return Math.round((present / required.length) * 100);
  }
}

// Main execution
async function main() {
  const deviceDataStr = process.argv[2];
  if (!deviceDataStr) {
    console.error('❌ No device data provided');
    process.exit(1);
  }
  
  const deviceData = JSON.parse(deviceDataStr);
  const researcher = new WebResearcher(deviceData);
  const enrichedData = await researcher.research();
  
  // Output for GitHub Actions
  console.log('\n📊 Research Results:');
  console.log(JSON.stringify(enrichedData, null, 2));
  
  // Save to file
  fs.writeFileSync(
    path.join(process.cwd(), 'research-output.json'),
    JSON.stringify(enrichedData, null, 2)
  );
  
  // Set GitHub Actions output
  console.log(`::set-output name=enriched_data::${JSON.stringify(enrichedData)}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = WebResearcher;
