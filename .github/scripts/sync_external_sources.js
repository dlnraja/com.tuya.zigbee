const https = require('https');
const fs = require('fs');
const path = require('path');

const SUGGESTIONS_FILE = path.join(__dirname, '../../lib/utils/ExternalMappings.json');

// Helper to fetch data
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Homey-Tuya-Sync-Bot' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Failed to fetch ${url} (Status: ${res.statusCode})`));
        }
      });
    }).on('error', reject);
  });
}

async function runSync() {
  console.log('🔄 Starting External Sources Sync...');
  
  const results = {
    lastSync: new Date().toISOString(),
    sources: {
      z2m: { url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts', newModels: 0 },
      zha: { url: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py', newModels: 0 },
    },
    suggestedMappings: {}
  };

  try {
    // 1. Fetch Z2M tuya.ts
    console.log('📥 Fetching Zigbee2MQTT tuya.ts...');
    const z2mData = await fetchUrl(results.sources.z2m.url);
    
    // Extract manufacturer names (_TZE...) using regex
    const tzeRegex = /_TZE\d+_[a-zA-Z0-9]+/g;
    const z2mMatches = [...new Set(z2mData.match(tzeRegex) || [])];
    results.sources.z2m.newModels = z2mMatches.length;
    console.log(`✅ Found ${z2mMatches.length} Tuya fingerprints in Z2M.`);

    // 2. Fetch ZHA tuya quirks init
    console.log('📥 Fetching ZHA tuya init.py...');
    const zhaData = await fetchUrl(results.sources.zha.url);
    const zhaMatches = [...new Set(zhaData.match(tzeRegex) || [])];
    results.sources.zha.newModels = zhaMatches.length;
    console.log(`✅ Found ${zhaMatches.length} Tuya fingerprints in ZHA.`);

    // Compile suggestions
    const allModels = [...new Set([...z2mMatches, ...zhaMatches])];
    allModels.forEach(model => {
      results.suggestedMappings[model] = {
        seenInZ2M: z2mMatches.includes(model),
        seenInZHA: zhaMatches.includes(model),
        status: 'pending_review'
      };
    });

    // Save to suggestions file
    const dir = path.dirname(SUGGESTIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    // Merge with existing if exists
    let existingData = {};
    if (fs.existsSync(SUGGESTIONS_FILE)) {
      try {
        existingData = JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, 'utf8'));
      } catch (e) {
        console.error('⚠️ Could not parse existing ExternalMappings.json');
      }
    }

    const mergedData = {
      ...existingData,
      lastSync: results.lastSync,
      sources: results.sources,
      suggestedMappings: {
        ...(existingData.suggestedMappings || {}),
        ...results.suggestedMappings
      }
    };

    fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(mergedData, null, 2));
    console.log(`🎉 Sync complete! Saved to ${SUGGESTIONS_FILE}`);
    console.log(`Total known fingerprints: ${Object.keys(mergedData.suggestedMappings).length}`);

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

runSync();
