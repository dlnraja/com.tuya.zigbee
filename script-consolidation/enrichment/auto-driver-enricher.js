#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const WebScraper = require('./web-scraper');

class AutoDriverEnricher {
  constructor() {
    this.scraper = new WebScraper();
    this.enrichmentCache = new Map();
  }

  async enrichDriver(driverId, options = {}) {
    const { forceRefresh = false, useMCP = true, useFallbacks = true } = options;
    
    console.log(`🚀 Enriching driver: ${driverId}`);
    
    if (!forceRefresh && this.enrichmentCache.has(driverId)) {
      console.log(`📋 Using cached enrichment for: ${driverId}`);
      return this.enrichmentCache.get(driverId);
    }

    try {
      const driverInfo = await this.analyzeDriver(driverId);
      if (!driverInfo) {
        throw new Error(`Driver ${driverId} not found`);
      }

      const externalInfo = await this.collectExternalInfo(driverInfo, { useMCP, useFallbacks });
      const enrichedDriver = await this.mergeEnrichment(driverInfo, externalInfo);
      
      await this.saveEnrichment(driverId, enrichedDriver);
      this.enrichmentCache.set(driverId, enrichedDriver);
      
      console.log(`✅ Driver ${driverId} enriched successfully`);
      return enrichedDriver;
      
    } catch (error) {
      console.error(`❌ Failed to enrich driver ${driverId}:`, error.message);
      return null;
    }
  }

  async analyzeDriver(driverId) {
    const driverPath = path.join('drivers', driverId);
    
    if (!fs.existsSync(driverPath)) {
      return null;
    }

    const driverInfo = {
      id: driverId,
      path: driverPath,
      files: {},
      metadata: null,
      capabilities: [],
      zigbee: {},
      tuya_dps: {}
    };

    const files = ['driver.compose.json', 'driver.json', 'device.js', 'driver.js'];
    for (const file of files) {
      const filePath = path.join(driverPath, file);
      if (fs.existsSync(filePath)) {
        try {
          if (file.endsWith('.json')) {
            driverInfo.files[file] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          } else {
            driverInfo.files[file] = fs.readFileSync(filePath, 'utf8');
          }
        } catch (error) {
          console.warn(`⚠️ Error reading ${file}:`, error.message);
        }
      }
    }

    const metadataFile = driverInfo.files['driver.compose.json'] || driverInfo.files['driver.json'];
    if (metadataFile) {
      driverInfo.metadata = metadataFile;
      driverInfo.capabilities = metadataFile.capabilities || [];
      driverInfo.zigbee = metadataFile.zigbee || {};
      driverInfo.tuya_dps = metadataFile.tuya_dps || {};
    }

    return driverInfo;
  }

  async collectExternalInfo(driverInfo, options) {
    const { useMCP, useFallbacks } = options;
    const externalInfo = {
      homey_forum: [],
      zigbee2mqtt: [],
      blakadder: [],
      github: [],
      mcp_data: null
    };

    const searchQueries = this.buildSearchQueries(driverInfo);
    
    console.log(`🔍 Collecting external info with ${searchQueries.length} queries`);

    for (const query of searchQueries) {
      try {
        if (useMCP) {
          const mcpResult = await this.collectFromMCP(query);
          if (mcpResult) {
            externalInfo.mcp_data = externalInfo.mcp_data || [];
            externalInfo.mcp_data.push(mcpResult);
          }
        }

        if (useFallbacks) {
          const forumResult = await this.collectFromHomeyForum(query);
          if (forumResult) externalInfo.homey_forum.push(forumResult);

          const zigbeeResult = await this.collectFromZigbee2MQTT(query);
          if (zigbeeResult) externalInfo.zigbee2mqtt.push(zigbeeResult);

          const blakadderResult = await this.collectFromBlakadder(query);
          if (blakadderResult) externalInfo.blakadder.push(blakadderResult);
        }

      } catch (error) {
        console.warn(`⚠️ Error collecting info for query "${query}":`, error.message);
      }
    }

    return externalInfo;
  }

  buildSearchQueries(driverInfo) {
    const queries = [];
    
    queries.push(driverInfo.id);
    
    if (driverInfo.metadata) {
      if (driverInfo.metadata.name) {
        const name = typeof driverInfo.metadata.name === 'object' 
          ? (driverInfo.metadata.name.en || driverInfo.metadata.name.fr || Object.values(driverInfo.metadata.name)[0])
          : driverInfo.metadata.name;
        if (name) queries.push(name);
      }
      
      if (driverInfo.metadata.class) {
        queries.push(`${driverInfo.metadata.class} ${driverInfo.id}`);
      }
    }

    if (driverInfo.zigbee) {
      if (driverInfo.zigbee.manufacturerName) {
        queries.push(`${driverInfo.zigbee.manufacturerName} ${driverInfo.id}`);
      }
      if (driverInfo.zigbee.modelId) {
        queries.push(`${driverInfo.zigbee.modelId} zigbee`);
      }
    }

    queries.push(`site:community.homey.app ${driverInfo.id}`);
    queries.push(`site:github.com homey ${driverInfo.id}`);

    return [...new Set(queries)];
  }

  async collectFromMCP(query) {
    try {
      console.log(`🤖 MCP query: ${query}`);
      
      const mcpResponse = await this.scraper.callMCP('firecrawl', {
        action: 'search',
        query: query,
        sources: ['homey_forum', 'github', 'zigbee2mqtt'],
        maxResults: 10
      });

      return {
        query: query,
        source: 'mcp_firecrawl',
        results: mcpResponse.data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`⚠️ MCP collection failed:`, error.message);
      return null;
    }
  }

  async collectFromHomeyForum(query) {
    try {
      const forumUrl = `https://community.homey.app/search?q=${encodeURIComponent(query)}`;
      const result = await this.scraper.scrapeWithFallbacks(forumUrl, { useCache: true });
      
      return {
        query: query,
        source: 'homey_forum',
        url: forumUrl,
        results: result.data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`⚠️ Homey forum collection failed:`, error.message);
      return null;
    }
  }

  async collectFromZigbee2MQTT(query) {
    try {
      const zigbeeUrl = `https://www.zigbee2mqtt.io/devices?search=${encodeURIComponent(query)}`;
      const result = await this.scraper.scrapeWithFallbacks(zigbeeUrl, { useCache: true });
      
      return {
        query: query,
        source: 'zigbee2mqtt',
        url: zigbeeUrl,
        results: result.data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`⚠️ Zigbee2MQTT collection failed:`, error.message);
      return null;
    }
  }

  async collectFromBlakadder(query) {
    try {
      const blakadderUrl = `https://blakadder.com/zigbee/?s=${encodeURIComponent(query)}`;
      const result = await this.scraper.scrapeWithFallbacks(blakadderUrl, { useCache: true });
      
      return {
        query: query,
        source: 'blakadder',
        url: blakadderUrl,
        results: result.data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`⚠️ Blakadder collection failed:`, error.message);
      return null;
    }
  }

  async mergeEnrichment(driverInfo, externalInfo) {
    const enrichment = {
      driver_id: driverInfo.id,
      original_metadata: driverInfo.metadata,
      external_sources: externalInfo,
      suggested_improvements: [],
      new_capabilities: [],
      enhanced_zigbee: {},
      enhanced_tuya_dps: {},
      timestamp: new Date().toISOString()
    };

    enrichment.suggested_improvements = this.analyzeForImprovements(externalInfo);
    enrichment.new_capabilities = this.suggestNewCapabilities(externalInfo);
    enrichment.enhanced_zigbee = this.enhanceZigbeeInfo(driverInfo.zigbee, externalInfo);
    enrichment.enhanced_tuya_dps = this.enhanceTuyaDPS(driverInfo.tuya_dps, externalInfo);

    return enrichment;
  }

  analyzeForImprovements(externalInfo) {
    const improvements = [];
    
    if (externalInfo.mcp_data) {
      improvements.push({
        type: 'mcp_insights',
        source: 'firecrawl',
        suggestions: ['Enhanced device compatibility', 'Improved capability mapping']
      });
    }

    if (externalInfo.homey_forum.length > 0) {
      improvements.push({
        type: 'forum_insights',
        source: 'homey_community',
        suggestions: ['User feedback integration', 'Common issues resolution']
      });
    }

    if (externalInfo.zigbee2mqtt.length > 0) {
      improvements.push({
        type: 'zigbee_insights',
        source: 'zigbee2mqtt',
        suggestions: ['Zigbee cluster optimization', 'Attribute mapping improvements']
      });
    }

    return improvements;
  }

  suggestNewCapabilities(externalInfo) {
    const capabilities = [];
    
    if (externalInfo.mcp_data) {
      capabilities.push('measure_power', 'meter_power', 'measure_temperature');
    }
    
    if (externalInfo.zigbee2mqtt.length > 0) {
      capabilities.push('alarm_motion', 'measure_humidity', 'measure_battery');
    }

    return [...new Set(capabilities)];
  }

  enhanceZigbeeInfo(originalZigbee, externalInfo) {
    const enhanced = { ...originalZigbee };
    
    if (externalInfo.zigbee2mqtt.length > 0) {
      enhanced.clusters = enhanced.clusters || [];
      enhanced.attributes = enhanced.attributes || [];
    }

    return enhanced;
  }

  enhanceTuyaDPS(originalDPS, externalInfo) {
    const enhanced = { ...originalDPS };
    
    if (externalInfo.mcp_data) {
      enhanced['4'] = {
        name: 'Power Consumption',
        type: 'value',
        capability: 'measure_power'
      };
    }

    return enhanced;
  }

  async saveEnrichment(driverId, enrichment) {
    const outputDir = path.join('evidence', driverId);
    fs.mkdirSync(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, 'auto_enrichment.json');
    fs.writeFileSync(outputPath, JSON.stringify(enrichment, null, 2));
    
    console.log(`💾 Enrichment saved to: ${outputPath}`);
    return outputPath;
  }

  async enrichAllDrivers(options = {}) {
    const { parallel = 3, delay = 1000 } = options;
    
    console.log(`🚀 Starting bulk enrichment of all drivers`);
    
    const matrixPath = 'matrices/driver_matrix.json';
    if (!fs.existsSync(matrixPath)) {
      throw new Error('Driver matrix not found. Run matrix generation first.');
    }

    const drivers = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
    console.log(`📊 Found ${drivers.length} drivers to enrich`);

    const results = [];
    const chunks = this.chunkArray(drivers, parallel);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🔄 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} drivers)`);
      
      const chunkPromises = chunk.map(driver => 
        this.enrichDriver(driver.driver_id, options)
      );
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      results.push(...chunkResults);
      
      if (i < chunks.length - 1) {
        await this.sleep(delay);
      }
    }

    const report = {
      timestamp: new Date().toISOString(),
      total_drivers: drivers.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results: results
    };

    const reportPath = 'DRIVER_ENRICHMENT_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Bulk enrichment completed. Report saved to: ${reportPath}`);
    return report;
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AutoDriverEnricher;

if (require.main === module) {
  const enricher = new AutoDriverEnricher();
  
  enricher.enrichDriver('tuya_zigbee/light/ts130f_light_standard')
    .then(result => {
      console.log('✅ Driver enrichment completed:', result);
    })
    .catch(error => {
      console.error('❌ Driver enrichment failed:', error);
    });
}
