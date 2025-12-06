#!/usr/bin/env node
/**
 * EXTRACT ALL METADATA
 *
 * Extracts and compiles ALL device metadata:
 * - DPs (datapoints)
 * - Clusters
 * - Capabilities
 * - Flows (triggers, conditions, actions)
 * - Device classes
 * - Settings
 *
 * From ALL sources:
 * - Driver files
 * - Lib files
 * - GitHub PRs/Issues
 * - Z2M database
 * - Documentation
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'data', 'COMPLETE_METADATA_DATABASE.json');

// ═══════════════════════════════════════════════════════════════════════════
// PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

const PATTERNS = {
  // DP patterns
  dp: [
    /dp:\s*(\d+)/gi,
    /datapoint:\s*(\d+)/gi,
    /DP\s*(\d+)/g,
    /\[(\d+)\]\s*[:=]/g,
    /"dp":\s*(\d+)/g,
    /case\s+(\d+):/g,
  ],

  // Cluster patterns
  cluster: [
    /CLUSTER\.([A-Z_]+)/g,
    /cluster:\s*['"]?([a-zA-Z_]+)['"]?/gi,
    /0x([0-9A-Fa-f]{4})/g,
    /genPowerCfg|genOnOff|genLevelCtrl|msTemperatureMeasurement|msRelativeHumidity|ssIasZone|seMetering|haElectricalMeasurement/gi,
  ],

  // Capability patterns
  capability: [
    /registerCapability\s*\(\s*['"]([^'"]+)['"]/g,
    /setCapabilityValue\s*\(\s*['"]([^'"]+)['"]/g,
    /getCapabilityValue\s*\(\s*['"]([^'"]+)['"]/g,
    /capability:\s*['"]([^'"]+)['"]/g,
    /"capabilities":\s*\[([^\]]+)\]/g,
    /alarm_\w+|measure_\w+|meter_\w+|onoff|dim|windowcoverings_\w+|target_\w+|light_\w+/g,
  ],

  // Flow patterns
  flow: [
    /triggerFlow\s*\(\s*['"]([^'"]+)['"]/g,
    /FlowCardTrigger\s*\(\s*['"]([^'"]+)['"]/g,
    /FlowCardAction\s*\(\s*['"]([^'"]+)['"]/g,
    /FlowCardCondition\s*\(\s*['"]([^'"]+)['"]/g,
    /"id":\s*"([^"]+_(?:turned|changed|is_|set_|toggle)[^"]*)"/g,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// HTTP HELPER
// ═══════════════════════════════════════════════════════════════════════════

async function fetchText(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Metadata-Extractor/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. EXTRACT FROM DRIVER FILES
// ═══════════════════════════════════════════════════════════════════════════

function extractFromDrivers() {
  console.log('\n📂 Extracting from drivers...');

  const driversDir = path.join(PROJECT_ROOT, 'drivers');
  const result = {
    dps: {},
    clusters: {},
    capabilities: {},
    flows: { triggers: [], conditions: [], actions: [] },
    classes: {},
    byDriver: {},
  };

  const drivers = fs.readdirSync(driversDir, { withFileTypes: true }).filter(d => d.isDirectory());

  for (const driver of drivers) {
    const driverPath = path.join(driversDir, driver.name);
    const driverData = {
      dps: new Set(),
      clusters: new Set(),
      capabilities: new Set(),
      flows: [],
    };

    // Read driver.compose.json
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));

        // Capabilities
        (compose.capabilities || []).forEach(cap => {
          driverData.capabilities.add(cap);
          result.capabilities[cap] = (result.capabilities[cap] || 0) + 1;
        });

        // Class
        if (compose.class) {
          result.classes[compose.class] = (result.classes[compose.class] || 0) + 1;
        }

        // Flows from compose
        ['triggers', 'conditions', 'actions'].forEach(type => {
          if (compose.flow?.[type]) {
            compose.flow[type].forEach(flow => {
              result.flows[type].push({
                id: flow.id,
                driver: driver.name,
                title: flow.title?.en || flow.id,
              });
            });
          }
        });
      } catch { }
    }

    // Read device.js
    const devicePath = path.join(driverPath, 'device.js');
    if (fs.existsSync(devicePath)) {
      try {
        const content = fs.readFileSync(devicePath, 'utf8');

        // Extract DPs
        for (const pattern of PATTERNS.dp) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const dp = parseInt(match[1]);
            if (dp >= 1 && dp <= 255) {
              driverData.dps.add(dp);
              result.dps[dp] = result.dps[dp] || { count: 0, drivers: [] };
              if (!result.dps[dp].drivers.includes(driver.name)) {
                result.dps[dp].drivers.push(driver.name);
                result.dps[dp].count++;
              }
            }
          }
        }

        // Extract clusters
        for (const pattern of PATTERNS.cluster) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const cluster = match[1];
            if (cluster && cluster.length > 2) {
              driverData.clusters.add(cluster);
              result.clusters[cluster] = (result.clusters[cluster] || 0) + 1;
            }
          }
        }

        // Extract capabilities from code
        for (const pattern of PATTERNS.capability) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const cap = match[1];
            if (cap && !cap.includes(',') && !cap.includes('{')) {
              driverData.capabilities.add(cap);
              result.capabilities[cap] = (result.capabilities[cap] || 0) + 1;
            }
          }
        }
      } catch { }
    }

    result.byDriver[driver.name] = {
      dps: [...driverData.dps].sort((a, b) => a - b),
      clusters: [...driverData.clusters],
      capabilities: [...driverData.capabilities],
    };
  }

  console.log(`  Drivers: ${drivers.length}`);
  console.log(`  Unique DPs: ${Object.keys(result.dps).length}`);
  console.log(`  Unique Clusters: ${Object.keys(result.clusters).length}`);
  console.log(`  Unique Capabilities: ${Object.keys(result.capabilities).length}`);
  console.log(`  Flow triggers: ${result.flows.triggers.length}`);
  console.log(`  Flow conditions: ${result.flows.conditions.length}`);
  console.log(`  Flow actions: ${result.flows.actions.length}`);

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. EXTRACT FROM LIB FILES
// ═══════════════════════════════════════════════════════════════════════════

function extractFromLib() {
  console.log('\n📚 Extracting from lib...');

  const libDir = path.join(PROJECT_ROOT, 'lib');
  const result = {
    dps: {},
    clusters: {},
    dpMappings: [],
  };

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        scanDir(fullPath);
      } else if (item.name.endsWith('.js')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');

          // Extract DP mappings (dp: X, capability: Y)
          const dpMappingPattern = /(\d+)\s*:\s*\{\s*capability:\s*['"]([^'"]+)['"]/g;
          let match;
          while ((match = dpMappingPattern.exec(content)) !== null) {
            result.dpMappings.push({
              dp: parseInt(match[1]),
              capability: match[2],
              source: path.relative(PROJECT_ROOT, fullPath),
            });
          }

          // Extract DPs
          for (const pattern of PATTERNS.dp) {
            while ((match = pattern.exec(content)) !== null) {
              const dp = parseInt(match[1]);
              if (dp >= 1 && dp <= 255) {
                result.dps[dp] = (result.dps[dp] || 0) + 1;
              }
            }
          }

          // Extract clusters
          for (const pattern of PATTERNS.cluster) {
            while ((match = pattern.exec(content)) !== null) {
              const cluster = match[1];
              if (cluster && cluster.length > 2) {
                result.clusters[cluster] = (result.clusters[cluster] || 0) + 1;
              }
            }
          }
        } catch { }
      }
    }
  }

  scanDir(libDir);

  console.log(`  DPs in lib: ${Object.keys(result.dps).length}`);
  console.log(`  Clusters in lib: ${Object.keys(result.clusters).length}`);
  console.log(`  DP→Capability mappings: ${result.dpMappings.length}`);

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. EXTRACT FROM Z2M
// ═══════════════════════════════════════════════════════════════════════════

async function extractFromZ2M() {
  console.log('\n📡 Extracting from Zigbee2MQTT...');

  const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';
  const content = await fetchText(url);

  const result = {
    dps: {},
    dpMappings: [],
    exposes: new Set(),
  };

  if (!content) {
    console.log('  Failed to fetch Z2M');
    return result;
  }

  // Extract DP mappings: [dp, 'expose_name', converter]
  const z2mDpPattern = /\[(\d+),\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = z2mDpPattern.exec(content)) !== null) {
    const dp = parseInt(match[1]);
    const expose = match[2];
    if (dp >= 1 && dp <= 255) {
      result.dps[dp] = result.dps[dp] || { count: 0, exposes: [] };
      result.dps[dp].count++;
      if (!result.dps[dp].exposes.includes(expose)) {
        result.dps[dp].exposes.push(expose);
      }
      result.dpMappings.push({ dp, expose });
      result.exposes.add(expose);
    }
  }

  // Extract expose functions
  const exposePattern = /e\.(\w+)\(\)/g;
  while ((match = exposePattern.exec(content)) !== null) {
    result.exposes.add(match[1]);
  }

  console.log(`  DPs from Z2M: ${Object.keys(result.dps).length}`);
  console.log(`  DP mappings: ${result.dpMappings.length}`);
  console.log(`  Exposes: ${result.exposes.size}`);

  return {
    ...result,
    exposes: [...result.exposes],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. EXTRACT FROM MD DOCS
// ═══════════════════════════════════════════════════════════════════════════

function extractFromDocs() {
  console.log('\n📄 Extracting from documentation...');

  const result = {
    dps: {},
    clusters: {},
    capabilities: {},
  };

  function scanDir(dir) {
    if (!fs.existsSync(dir) || dir.includes('node_modules')) return;

    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory() && !item.name.startsWith('.')) {
          scanDir(fullPath);
        } else if (item.name.endsWith('.md')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');

            // Extract DPs from markdown tables and text
            const dpPattern = /[Dd][Pp]\s*[:=]?\s*(\d{1,3})|DP(\d{1,3})\b|\b(\d{1,3})\s*[:|-]\s*(?:onoff|temperature|humidity|battery)/g;
            let match;
            while ((match = dpPattern.exec(content)) !== null) {
              const dp = parseInt(match[1] || match[2] || match[3]);
              if (dp >= 1 && dp <= 255) {
                result.dps[dp] = (result.dps[dp] || 0) + 1;
              }
            }

            // Extract clusters
            const clusterPattern = /CLUSTER\.([A-Z_]+)|cluster\s*[:=]\s*['"]?([a-zA-Z_]+)/gi;
            while ((match = clusterPattern.exec(content)) !== null) {
              const cluster = match[1] || match[2];
              if (cluster) {
                result.clusters[cluster] = (result.clusters[cluster] || 0) + 1;
              }
            }

            // Extract capabilities
            const capPattern = /(alarm_\w+|measure_\w+|meter_\w+|target_\w+|light_\w+|windowcoverings_\w+)/g;
            while ((match = capPattern.exec(content)) !== null) {
              result.capabilities[match[1]] = (result.capabilities[match[1]] || 0) + 1;
            }
          } catch { }
        }
      }
    } catch { }
  }

  scanDir(PROJECT_ROOT);

  console.log(`  DPs from docs: ${Object.keys(result.dps).length}`);
  console.log(`  Clusters from docs: ${Object.keys(result.clusters).length}`);
  console.log(`  Capabilities from docs: ${Object.keys(result.capabilities).length}`);

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. COMPILE COMPLETE DATABASE
// ═══════════════════════════════════════════════════════════════════════════

function compileDatabase(sources) {
  console.log('\n🔀 Compiling complete database...');

  const db = {
    generated: new Date().toISOString(),

    // DPs
    dps: {
      total: 0,
      list: {},
    },

    // Clusters
    clusters: {
      total: 0,
      list: {},
    },

    // Capabilities
    capabilities: {
      total: 0,
      list: {},
    },

    // Flows
    flows: {
      triggers: [],
      conditions: [],
      actions: [],
    },

    // Device classes
    classes: {},

    // DP to capability mappings
    dpMappings: [],

    // Z2M exposes
    z2mExposes: [],

    // Per-driver data
    byDriver: {},
  };

  // Merge DPs
  const allDps = new Set();
  for (const source of sources) {
    if (source.dps) {
      Object.keys(source.dps).forEach(dp => allDps.add(parseInt(dp)));
    }
  }
  db.dps.total = allDps.size;
  db.dps.list = {};
  [...allDps].sort((a, b) => a - b).forEach(dp => {
    db.dps.list[dp] = {
      sources: [],
      drivers: sources[0]?.dps?.[dp]?.drivers || [],
      z2mExposes: sources[2]?.dps?.[dp]?.exposes || [],
    };
  });

  // Merge clusters
  const allClusters = new Set();
  for (const source of sources) {
    if (source.clusters) {
      Object.keys(source.clusters).forEach(c => allClusters.add(c));
    }
  }
  db.clusters.total = allClusters.size;
  db.clusters.list = [...allClusters].sort().reduce((acc, c) => {
    acc[c] = { count: 0 };
    for (const source of sources) {
      if (source.clusters?.[c]) acc[c].count += source.clusters[c];
    }
    return acc;
  }, {});

  // Merge capabilities
  const allCaps = new Set();
  for (const source of sources) {
    if (source.capabilities) {
      Object.keys(source.capabilities).forEach(c => allCaps.add(c));
    }
  }
  db.capabilities.total = allCaps.size;
  db.capabilities.list = [...allCaps].sort().reduce((acc, c) => {
    acc[c] = { count: 0 };
    for (const source of sources) {
      if (source.capabilities?.[c]) acc[c].count += source.capabilities[c];
    }
    return acc;
  }, {});

  // Merge flows
  if (sources[0]?.flows) {
    db.flows = sources[0].flows;
  }

  // Merge classes
  if (sources[0]?.classes) {
    db.classes = sources[0].classes;
  }

  // Merge DP mappings
  const dpMappings = new Map();
  for (const source of sources) {
    if (source.dpMappings) {
      for (const mapping of source.dpMappings) {
        const key = `${mapping.dp}:${mapping.capability || mapping.expose}`;
        if (!dpMappings.has(key)) {
          dpMappings.set(key, mapping);
        }
      }
    }
  }
  db.dpMappings = [...dpMappings.values()];

  // Z2M exposes
  if (sources[2]?.exposes) {
    db.z2mExposes = sources[2].exposes;
  }

  // By driver
  if (sources[0]?.byDriver) {
    db.byDriver = sources[0].byDriver;
  }

  return db;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔍 EXTRACT ALL METADATA');
  console.log('════════════════════════════════════════════════════════════════');

  const sources = [];

  // 1. Drivers
  sources.push(extractFromDrivers());

  // 2. Lib
  sources.push(extractFromLib());

  // 3. Z2M
  sources.push(await extractFromZ2M());

  // 4. Docs
  sources.push(extractFromDocs());

  // 5. Compile
  const db = compileDatabase(sources);

  // Save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(db, null, 2));

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL STATISTICS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Total DPs: ${db.dps.total}`);
  console.log(`  Total Clusters: ${db.clusters.total}`);
  console.log(`  Total Capabilities: ${db.capabilities.total}`);
  console.log(`  Flow Triggers: ${db.flows.triggers.length}`);
  console.log(`  Flow Conditions: ${db.flows.conditions.length}`);
  console.log(`  Flow Actions: ${db.flows.actions.length}`);
  console.log(`  Device Classes: ${Object.keys(db.classes).length}`);
  console.log(`  DP Mappings: ${db.dpMappings.length}`);
  console.log(`  Z2M Exposes: ${db.z2mExposes.length}`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`\n📄 Saved to: ${OUTPUT_FILE}`);
}

if (require.main === module) {
  main().catch(console.error);
}
