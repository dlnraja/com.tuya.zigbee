/**
 * AUDIT SCRIPT - Compare manufacturerName IDs between sources
 *
 * Sources:
 * 1. Our app (dlnraja/com.tuya.zigbee)
 * 2. Johan Bendz app (JohanBendz/com.tuya.zigbee)
 * 3. Zigbee2MQTT database
 *
 * Output: Report of missing IDs and drivers
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_PATH = path.join(__dirname, '../../drivers');
const REPORT_PATH = path.join(__dirname, 'audit_report.json');

// Extract all manufacturerName from our drivers
function getOurManufacturerNames() {
  const ids = new Set();
  const driverMap = {};

  const drivers = fs.readdirSync(DRIVERS_PATH, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const driver of drivers) {
    const composePath = path.join(DRIVERS_PATH, driver, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const content = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        const names = content.zigbee?.manufacturerName || [];
        const productIds = content.zigbee?.productId || [];

        for (const name of names) {
          ids.add(name);
          if (!driverMap[name]) driverMap[name] = [];
          driverMap[name].push(driver);
        }
      } catch (e) {
        console.error(`Error parsing ${driver}: ${e.message}`);
      }
    }
  }

  return { ids: Array.from(ids).sort(), driverMap, driverCount: drivers.length };
}

// Fetch Johan Bendz manufacturerName via GitHub API
async function fetchJohanBendzIds() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/JohanBendz/com.tuya.zigbee/git/trees/SDK3?recursive=1',
      headers: { 'User-Agent': 'Homey-Audit-Script' }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const driverFiles = json.tree
            .filter(f => f.path.match(/^drivers\/[^/]+\/driver\.compose\.json$/))
            .map(f => f.path);
          resolve(driverFiles);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Main audit function
async function runAudit() {
  console.log('🔍 Starting manufacturerName audit...\n');

  // Get our IDs
  const ourData = getOurManufacturerNames();
  console.log(`📊 Our app: ${ourData.driverCount} drivers, ${ourData.ids.length} unique manufacturerName IDs`);

  // Count by prefix
  const prefixCounts = {};
  for (const id of ourData.ids) {
    const prefix = id.match(/^_T[ZY][A-Z0-9]+_/)?.[0] || id.substring(0, 8);
    prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
  }

  console.log('\n📈 ID distribution by prefix:');
  const sortedPrefixes = Object.entries(prefixCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [prefix, count] of sortedPrefixes) {
    console.log(`   ${prefix}: ${count}`);
  }

  // Check for duplicates (IDs in multiple drivers)
  const duplicates = Object.entries(ourData.driverMap)
    .filter(([id, drivers]) => drivers.length > 1);

  if (duplicates.length > 0) {
    console.log(`\n⚠️  ${duplicates.length} IDs found in multiple drivers:`);
    for (const [id, drivers] of duplicates.slice(0, 10)) {
      console.log(`   ${id}: ${drivers.join(', ')}`);
    }
    if (duplicates.length > 10) {
      console.log(`   ... and ${duplicates.length - 10} more`);
    }
  }

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    ourApp: {
      driverCount: ourData.driverCount,
      uniqueIds: ourData.ids.length,
      prefixDistribution: prefixCounts,
      duplicateIds: duplicates.map(([id, drivers]) => ({ id, drivers }))
    },
    allIds: ourData.ids
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report saved to: ${REPORT_PATH}`);

  return report;
}

// Run
runAudit().catch(console.error);
