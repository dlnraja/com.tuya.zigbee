/**
 * Fetch all manufacturerName IDs from Johan Bendz repository
 * and compare with our app
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DRIVERS_PATH = path.join(__dirname, '../../drivers');
const OUTPUT_PATH = path.join(__dirname, 'comparison_report.json');

// Get our IDs
function getOurIds() {
  const idToDriver = {};
  const drivers = fs.readdirSync(DRIVERS_PATH, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const driver of drivers) {
    const composePath = path.join(DRIVERS_PATH, driver, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const content = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        const names = content.zigbee?.manufacturerName || [];
        for (const name of names) {
          if (!idToDriver[name]) idToDriver[name] = [];
          idToDriver[name].push(driver);
        }
      } catch (e) { }
    }
  }
  return idToDriver;
}

// Fetch file from GitHub
function fetchGitHub(filePath) {
  return new Promise((resolve, reject) => {
    const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, '/');
    const options = {
      hostname: 'raw.githubusercontent.com',
      path: `/JohanBendz/com.tuya.zigbee/SDK3/${encodedPath}`,
      headers: { 'User-Agent': 'Homey-Audit' }
    };

    https.get(options, (res) => {
      if (res.statusCode === 404) {
        resolve(null);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

// Main
async function main() {
  console.log('🔍 Fetching Johan Bendz drivers...\n');

  const ourIds = getOurIds();
  const ourIdSet = new Set(Object.keys(ourIds));
  console.log(`📊 Our app: ${ourIdSet.size} unique IDs\n`);

  // Get Johan's driver list
  const johanDrivers = fs.readFileSync(path.join(__dirname, 'johan_drivers.txt'), 'utf8')
    .split('\n')
    .filter(d => d.trim());

  console.log(`📊 Johan Bendz: ${johanDrivers.length} drivers\n`);

  const johanIds = {};
  const missingIds = [];
  let processed = 0;

  for (const driver of johanDrivers) {
    const content = await fetchGitHub(`drivers/${driver}/driver.compose.json`);
    if (content) {
      try {
        const json = JSON.parse(content);
        const names = json.zigbee?.manufacturerName || [];
        for (const name of names) {
          if (!johanIds[name]) johanIds[name] = [];
          johanIds[name].push(driver);

          if (!ourIdSet.has(name)) {
            missingIds.push({ id: name, johanDriver: driver });
          }
        }
      } catch (e) { }
    }
    processed++;
    if (processed % 20 === 0) {
      console.log(`   Processed ${processed}/${johanDrivers.length} drivers...`);
    }
  }

  console.log(`\n📊 Johan Bendz total: ${Object.keys(johanIds).length} unique IDs`);
  console.log(`\n❌ Missing from our app: ${missingIds.length} IDs\n`);

  // Group missing by Johan driver
  const missingByDriver = {};
  for (const { id, johanDriver } of missingIds) {
    if (!missingByDriver[johanDriver]) missingByDriver[johanDriver] = [];
    missingByDriver[johanDriver].push(id);
  }

  // Show top missing
  const sortedMissing = Object.entries(missingByDriver)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20);

  console.log('📋 Top 20 Johan drivers with missing IDs:');
  for (const [driver, ids] of sortedMissing) {
    console.log(`   ${driver}: ${ids.length} missing IDs`);
  }

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    ourIdCount: ourIdSet.size,
    johanIdCount: Object.keys(johanIds).length,
    missingCount: missingIds.length,
    missingByDriver,
    allMissingIds: missingIds
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report saved to: ${OUTPUT_PATH}`);
}

main().catch(console.error);
