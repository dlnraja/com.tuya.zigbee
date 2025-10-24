#!/usr/bin/env node

/**
 * MEGA ENRICHMENT - Sources Analysis
 * 
 * Analyse toutes les sources disponibles pour enrichir les drivers:
 * - Blakadder database
 * - Zigbee2MQTT converters
 * - ZHA quirks
 * - Home Assistant integrations
 * - Forums Homey Community
 * 
 * Output: JSON avec tous les manufacturer IDs trouvés
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const SOURCES = {
  blakadder: {
    url: 'https://zigbee.blakadder.com/Tuya.html',
    enabled: true,
    priority: 'HIGH'
  },
  zigbee2mqtt: {
    url: 'https://github.com/Koenkk/zigbee2mqtt/tree/master/src/devices',
    enabled: true,
    priority: 'HIGH'
  },
  zha: {
    url: 'https://github.com/zigpy/zha-device-handlers/tree/dev/zhaquirks/tuya',
    enabled: true,
    priority: 'MEDIUM'
  },
  homeassistant: {
    url: 'https://github.com/home-assistant/core/tree/dev/homeassistant/components/tuya',
    enabled: true,
    priority: 'MEDIUM'
  },
  forums: {
    url: 'https://community.homey.app',
    enabled: true,
    priority: 'HIGH'
  }
};

// =============================================================================
// EXISTING DRIVERS ANALYSIS
// =============================================================================

function analyzeExistingDrivers() {
  console.log('📊 Analyzing existing drivers...');
  
  const driversPath = path.join(__dirname, '../../drivers');
  const drivers = [];
  
  try {
    const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const driverDir of driverDirs) {
      const driverJsonPath = path.join(driversPath, driverDir, 'driver.json');
      
      if (fs.existsSync(driverJsonPath)) {
        const driverJson = JSON.parse(fs.readFileSync(driverJsonPath, 'utf8'));
        
        // Extract manufacturer IDs
        const manufacturerIds = [];
        if (driverJson.zigbee && driverJson.zigbee.manufacturerName) {
          if (Array.isArray(driverJson.zigbee.manufacturerName)) {
            manufacturerIds.push(...driverJson.zigbee.manufacturerName);
          } else {
            manufacturerIds.push(driverJson.zigbee.manufacturerName);
          }
        }
        
        // Extract product IDs
        const productIds = [];
        if (driverJson.zigbee && driverJson.zigbee.productId) {
          if (Array.isArray(driverJson.zigbee.productId)) {
            productIds.push(...driverJson.zigbee.productId);
          } else {
            productIds.push(driverJson.zigbee.productId);
          }
        }
        
        drivers.push({
          id: driverDir,
          name: driverJson.name?.en || driverDir,
          class: driverJson.class,
          capabilities: driverJson.capabilities || [],
          manufacturerIds,
          productIds,
          idCount: manufacturerIds.length + productIds.length
        });
      }
    }
    
    console.log(`✅ Found ${drivers.length} drivers`);
    console.log(`✅ Total manufacturer IDs: ${drivers.reduce((sum, d) => sum + d.idCount, 0)}`);
    
    return drivers;
    
  } catch (error) {
    console.error('❌ Error analyzing drivers:', error.message);
    return [];
  }
}

// =============================================================================
// SOURCE ANALYSIS FRAMEWORK
// =============================================================================

const sourceAnalyzers = {
  
  /**
   * Analyze Blakadder database
   * Note: Requires web scraping or API
   */
  blakadder: async () => {
    console.log('\n🔍 Analyzing Blakadder database...');
    console.log('⚠️  Manual scraping recommended: https://zigbee.blakadder.com/Tuya.html');
    
    // TODO: Implement web scraping or use API
    // For now, return placeholder
    return {
      source: 'blakadder',
      status: 'MANUAL_REVIEW_REQUIRED',
      devices: [],
      note: 'Visit https://zigbee.blakadder.com/Tuya.html for Tuya devices'
    };
  },
  
  /**
   * Analyze Zigbee2MQTT converters
   * Note: Requires GitHub API or repo clone
   */
  zigbee2mqtt: async () => {
    console.log('\n🔍 Analyzing Zigbee2MQTT converters...');
    console.log('⚠️  Manual review recommended: https://github.com/Koenkk/zigbee2mqtt');
    
    // Known Tuya manufacturer IDs from Z2M
    const knownIds = [
      '_TZ3000_', '_TZE200_', '_TZ3210_', '_TYZB01_', '_TZ3400_',
      'TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0011', 'TS0012',
      'TS0013', 'TS0014', 'TS011F', 'TS0121', 'TS0201', 'TS0202',
      'TS0203', 'TS0204', 'TS0205', 'TS0207', 'TS0211', 'TS0216',
      'TS0218', 'TS0222', 'TS0224', 'TS0225', 'TS0226', 'TS0601',
      'TS130F'
    ];
    
    return {
      source: 'zigbee2mqtt',
      status: 'PARTIAL',
      knownPatterns: knownIds,
      note: 'Check Z2M repo for complete list'
    };
  },
  
  /**
   * Analyze ZHA quirks
   * Note: Requires GitHub API or repo clone
   */
  zha: async () => {
    console.log('\n🔍 Analyzing ZHA quirks...');
    console.log('⚠️  Manual review recommended: https://github.com/zigpy/zha-device-handlers');
    
    return {
      source: 'zha',
      status: 'MANUAL_REVIEW_REQUIRED',
      note: 'Check zhaquirks/tuya folder for quirks'
    };
  },
  
  /**
   * Analyze Home Assistant integration
   */
  homeassistant: async () => {
    console.log('\n🔍 Analyzing Home Assistant Tuya integration...');
    console.log('⚠️  Manual review recommended: https://github.com/home-assistant/core');
    
    return {
      source: 'homeassistant',
      status: 'MANUAL_REVIEW_REQUIRED',
      note: 'Check homeassistant/components/tuya for integrations'
    };
  },
  
  /**
   * Analyze Homey Community Forums
   * Note: Requires web scraping
   */
  forums: async () => {
    console.log('\n🔍 Analyzing Homey Community Forums...');
    console.log('⚠️  Manual review recommended: https://community.homey.app');
    
    // Common manufacturer IDs from forums
    const forumMentioned = [
      '_TZ3000_odygigth', '_TZ3000_zmy1waw6', '_TZ3000_keabpigv',
      '_TZ3000_ebar6ljy', '_TZ3000_twqctvna', '_TZ3000_8fhkjk5g',
      '_TZE200_ip2akl4w', '_TZE200_whpb9yts', '_TZE200_7tdtqgwv'
    ];
    
    return {
      source: 'forums',
      status: 'PARTIAL',
      commonIds: forumMentioned,
      note: 'Search forum for "Tuya" AND "Zigbee" for more IDs'
    };
  }
};

// =============================================================================
// TOP DRIVERS IDENTIFICATION
// =============================================================================

function identifyTopDrivers(drivers) {
  console.log('\n📈 Identifying top drivers to enrich...');
  
  // Categories priority
  const categoryPriority = {
    'socket': 10,      // Plugs (très populaires)
    'light': 9,        // Lights
    'sensor': 8,       // Sensors
    'thermostat': 7,   // Climate
    'button': 6,       // Switches/buttons
    'curtain': 5,      // Curtains
    'lock': 4,         // Locks
    'other': 3         // Others
  };
  
  // Score drivers
  const scored = drivers.map(driver => {
    const categoryScore = categoryPriority[driver.class] || 3;
    const idScore = driver.idCount * 2; // More IDs = more devices supported
    const capabilityScore = driver.capabilities.length;
    
    return {
      ...driver,
      priority: categoryScore + idScore + capabilityScore
    };
  });
  
  // Sort by priority
  scored.sort((a, b) => b.priority - a.priority);
  
  // Top 20
  const top20 = scored.slice(0, 20);
  
  console.log('\n🏆 TOP 20 DRIVERS TO ENRICH:');
  top20.forEach((driver, index) => {
    console.log(`${index + 1}. ${driver.name} (${driver.class}) - ${driver.idCount} IDs - Priority: ${driver.priority}`);
  });
  
  return top20;
}

// =============================================================================
// ENRICHMENT RECOMMENDATIONS
// =============================================================================

function generateRecommendations(drivers, sources) {
  console.log('\n💡 Generating enrichment recommendations...');
  
  const recommendations = {
    timestamp: new Date().toISOString(),
    summary: {
      totalDrivers: drivers.length,
      totalIds: drivers.reduce((sum, d) => sum + d.idCount, 0),
      sourcesAnalyzed: Object.keys(sources).length
    },
    topDrivers: drivers.slice(0, 20).map(d => ({
      id: d.id,
      name: d.name,
      class: d.class,
      currentIds: d.idCount,
      priority: d.priority
    })),
    sources: sources,
    actions: [
      {
        priority: 'HIGH',
        action: 'Manual review of Blakadder database',
        url: 'https://zigbee.blakadder.com/Tuya.html',
        expected: '50-100 new manufacturer IDs'
      },
      {
        priority: 'HIGH',
        action: 'Clone Zigbee2MQTT repo and analyze converters',
        url: 'https://github.com/Koenkk/zigbee2mqtt',
        expected: '100-200 new manufacturer IDs'
      },
      {
        priority: 'MEDIUM',
        action: 'Review ZHA quirks',
        url: 'https://github.com/zigpy/zha-device-handlers',
        expected: '30-50 new manufacturer IDs'
      },
      {
        priority: 'HIGH',
        action: 'Search Homey Community Forums',
        url: 'https://community.homey.app',
        expected: '20-40 new manufacturer IDs from user reports'
      }
    ]
  };
  
  return recommendations;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log('🚀 MEGA ENRICHMENT - Sources Analysis');
  console.log('=====================================\n');
  
  // 1. Analyze existing drivers
  const drivers = analyzeExistingDrivers();
  
  // 2. Identify top drivers
  const topDrivers = identifyTopDrivers(drivers);
  
  // 3. Analyze sources
  const sourceResults = {};
  for (const [sourceName, analyzer] of Object.entries(sourceAnalyzers)) {
    if (SOURCES[sourceName]?.enabled) {
      try {
        sourceResults[sourceName] = await analyzer();
      } catch (error) {
        console.error(`❌ Error analyzing ${sourceName}:`, error.message);
        sourceResults[sourceName] = {
          source: sourceName,
          status: 'ERROR',
          error: error.message
        };
      }
    }
  }
  
  // 4. Generate recommendations
  const recommendations = generateRecommendations(topDrivers, sourceResults);
  
  // 5. Save results
  const outputPath = path.join(__dirname, '../../reports/enrichment-analysis.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(recommendations, null, 2));
  
  console.log(`\n✅ Analysis complete!`);
  console.log(`📄 Report saved to: ${outputPath}`);
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Review report: reports/enrichment-analysis.json');
  console.log('2. Manually collect manufacturer IDs from sources');
  console.log('3. Run enrichment script with collected IDs');
  console.log('4. Validate changes with: homey app validate');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { analyzeExistingDrivers, identifyTopDrivers };
