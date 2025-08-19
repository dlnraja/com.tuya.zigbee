#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Harvest system - Extract device information from various sources
 * DEV-ONLY - Never used at runtime
 */

class HarvestSystem {
  constructor() {
    this.rawDir = 'research/raw';
    this.extractDir = 'research/extract';
    this.cacheFile = 'research/.harvest-cache.json';
    this.cache = this.loadCache();
  }

  loadCache() {
    if (fs.existsSync(this.cacheFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  saveCache() {
    fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
  }

  /**
   * Main harvest orchestrator
   */
  async harvest() {
    console.log('🌾 Starting harvest...');
    
    // Create directories
    [this.rawDir, this.extractDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // Run adapters (simulated - no real network calls)
    const adapters = [
      this.harvestForum.bind(this),
      this.harvestGitHub.bind(this),
      this.harvestProducts.bind(this),
      this.harvestVideos.bind(this)
    ];

    const results = [];
    for (const adapter of adapters) {
      try {
        const data = await adapter();
        results.push(...data);
      } catch (e) {
        console.error(`  Adapter failed: ${e.message}`);
      }
    }

    // Save extracted data
    const timestamp = new Date().toISOString();
    const extractFile = path.join(this.extractDir, `harvest_${Date.now()}.jsonl`);
    
    results.forEach(item => {
      const line = JSON.stringify({ ...item, timestamp }) + '\n';
      fs.appendFileSync(extractFile, line);
    });

    console.log(`  ✅ Harvested ${results.length} items`);
    this.saveCache();
    return results;
  }

  /**
   * Forum adapter (simulated)
   */
  async harvestForum() {
    console.log('  📋 Harvesting forums...');
    
    // Simulated data - in real implementation would fetch from forums
    return [
      {
        source: 'community.homey.app',
        url: 'https://community.homey.app/t/tuya-zigbee-app/26439',
        type: 'forum_post',
        manufacturerName: '_TZ3000_xr3htd96',
        productId: 'TS011F',
        typeHints: ['plug', 'socket'],
        capabilityHints: ['onoff', 'measure_power'],
        dpEvidence: { '1': 'onoff', '16': 'power/10' },
        confidence_boost: 0.0,
        date: '2025-01-15'
      },
      {
        source: 'community.homey.app',
        url: 'https://community.homey.app/t/app-pro-universal-tuya-zigbee/140352',
        type: 'forum_post',
        manufacturerName: '_TZE200_dfxkcots',
        productId: 'TS0601',
        typeHints: ['trv', 'thermostat'],
        capabilityHints: ['target_temperature', 'measure_temperature'],
        dpEvidence: { '2': 'target/10', '4': 'current/10' },
        confidence_boost: 0.0,
        date: '2025-01-18'
      }
    ];
  }

  /**
   * GitHub adapter (simulated)
   */
  async harvestGitHub() {
    console.log('  🐙 Harvesting GitHub...');
    
    return [
      {
        source: 'github.com/JohanBendz',
        url: 'https://github.com/JohanBendz/com.tuya.zigbee/issues/123',
        type: 'github_issue',
        manufacturerName: '_TZ3000_18ejxno0',
        productId: 'TS011F',
        typeHints: ['plug'],
        capabilityHints: ['onoff', 'measure_power', 'meter_power'],
        dpEvidence: { '1': 'switch', '16': 'power_w/10', '17': 'energy_kwh/1000' },
        confidence_boost: 0.05,
        date: '2025-01-10'
      }
    ];
  }

  /**
   * Product pages adapter (simulated)
   */
  async harvestProducts() {
    console.log('  🛒 Harvesting product pages...');
    
    return [
      {
        source: 'amazon.com',
        url: 'https://amazon.com/dp/B08XXX',
        type: 'product_page',
        manufacturerName: 'Tuya',
        productId: 'TS0601',
        typeHints: ['curtain', 'motor'],
        capabilityHints: ['windowcoverings_set'],
        dpEvidence: {},
        confidence_boost: -0.1,
        date: '2024-12-01'
      }
    ];
  }

  /**
   * Video adapter (simulated)
   */
  async harvestVideos() {
    console.log('  📹 Harvesting videos...');
    
    return [
      {
        source: 'youtube.com',
        url: 'https://youtube.com/watch?v=xxx',
        type: 'video_demo',
        manufacturerName: '_TZE200_aoclfnxz',
        productId: 'TS004F',
        typeHints: ['remote', 'scene', 'switch'],
        capabilityHints: ['alarm_battery'],
        dpEvidence: {},
        confidence_boost: -0.05,
        date: '2025-01-05'
      }
    ];
  }

  /**
   * Extract normalized facts from raw data
   */
  extract() {
    console.log('📊 Extracting facts...');
    
    const extractFiles = fs.readdirSync(this.extractDir)
      .filter(f => f.endsWith('.jsonl'));
    
    let facts = [];
    extractFiles.forEach(file => {
      const lines = fs.readFileSync(path.join(this.extractDir, file), 'utf8')
        .split('\n')
        .filter(l => l.trim());
      
      lines.forEach(line => {
        try {
          facts.push(JSON.parse(line));
        } catch (e) {
          // Skip invalid lines
        }
      });
    });

    console.log(`  ✅ Extracted ${facts.length} facts`);
    return facts;
  }
}

// Export for CLI
module.exports = HarvestSystem;

// Run if called directly
if (require.main === module) {
  const harvester = new HarvestSystem();
  harvester.harvest()
    .then(() => harvester.extract())
    .catch(console.error);
}
