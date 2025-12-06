#!/usr/bin/env node
/**
 * EXHAUSTIVE ENRICHMENT
 *
 * Follows Rule 9.6: ProductId Expansion (EXHAUSTIVE)
 * When adding productId, list MUST include ALL known variants from Z2M
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

async function fetchZ2M() {
  return new Promise((resolve) => {
    https.get('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

function parseZ2MProductIds(z2mContent) {
  const mapping = new Map(); // manufacturerName -> Set(productIds)

  if (!z2mContent) return mapping;

  // Pattern 1: fingerprint with modelID and manufacturerName
  const fp1 = /modelID:\s*['"]([^'"]+)['"][^}]*manufacturerName:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = fp1.exec(z2mContent)) !== null) {
    const modelId = match[1];
    const mfr = match[2];
    if (!mapping.has(mfr)) mapping.set(mfr, new Set());
    mapping.get(mfr).add(modelId);
  }

  // Pattern 2: manufacturerName then modelID
  const fp2 = /manufacturerName:\s*['"]([^'"]+)['"][^}]*modelID:\s*['"]([^'"]+)['"]/g;
  while ((match = fp2.exec(z2mContent)) !== null) {
    const mfr = match[1];
    const modelId = match[2];
    if (!mapping.has(mfr)) mapping.set(mfr, new Set());
    mapping.get(mfr).add(modelId);
  }

  return mapping;
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔄 EXHAUSTIVE PRODUCTID ENRICHMENT');
  console.log('Following Rule 9.6: ProductId list MUST be EXHAUSTIVE');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Fetch Z2M
  console.log('📡 Fetching Z2M database...');
  const z2mContent = await fetchZ2M();

  if (!z2mContent) {
    console.log('❌ Failed to fetch Z2M');
    return;
  }

  const z2mMapping = parseZ2MProductIds(z2mContent);
  console.log(`✅ Z2M mappings: ${z2mMapping.size} manufacturers with productIds\n`);

  // Load all drivers
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  let totalEnriched = 0;
  let driversModified = 0;

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const mfrs = config.zigbee?.manufacturerName || [];
      const existingPids = new Set(config.zigbee?.productId || []);

      let added = 0;

      for (const mfr of mfrs) {
        if (z2mMapping.has(mfr)) {
          for (const pid of z2mMapping.get(mfr)) {
            if (!existingPids.has(pid)) {
              existingPids.add(pid);
              added++;
            }
          }
        }
      }

      if (added > 0) {
        config.zigbee.productId = [...existingPids].sort();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`  ${driver.name}: +${added} productIds`);
        totalEnriched += added;
        driversModified++;
      }
    } catch { }
  }

  // Final stats
  let finalMfrs = 0;
  let finalPids = 0;

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      finalMfrs += config.zigbee?.manufacturerName?.length || 0;
      finalPids += config.zigbee?.productId?.length || 0;
    } catch { }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Drivers modified: ${driversModified}`);
  console.log(`  ProductIds added: ${totalEnriched}`);
  console.log(`  Final manufacturers: ${finalMfrs}`);
  console.log(`  Final productIds: ${finalPids}`);
  console.log('════════════════════════════════════════════════════════════════');
}

if (require.main === module) {
  main().catch(console.error);
}
