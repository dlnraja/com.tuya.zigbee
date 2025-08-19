#!/usr/bin/env node
/**
 * Lint naming conventions and structure
 * Vérifie les conventions de nommage et la structure
 */

const fs = require('fs');
const path = require('path');

function isKebab(s) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

function badTS(s) {
  return /TS\d{4,}/i.test(s);
}

function lintDrivers() {
  const driversDir = 'drivers';
  let ok = true;

  if (!fs.existsSync(driversDir)) {
    console.error('❌ Drivers directory not found');
    return false;
  }

  for (const d of fs.readdirSync(driversDir)) {
    const p = path.join(driversDir, d);
    if (!fs.statSync(p).isDirectory()) continue;

    // Vérifier le nom du dossier
    if (!isKebab(d)) {
      console.error(`❌ Bad driver folder name: ${d} (use kebab-case)`);
      ok = false;
    }

    if (badTS(d)) {
      console.error(`❌ Bad driver folder name: ${d} (no TSxxxx in folder names)`);
      ok = false;
    }

    // Vérifier les fichiers requis
    for (const f of ['driver.compose.json', 'device.js']) {
      if (!fs.existsSync(path.join(p, f))) {
        console.error(`❌ Missing ${f} in ${d}`);
        ok = false;
      }
    }

    // Vérifier les assets
    const assets = path.join(p, 'assets');
    if (!fs.existsSync(assets)) {
      console.error(`❌ Missing assets directory in ${d}`);
      ok = false;
    } else {
      for (const img of ['small.png', 'large.png']) {
        if (!fs.existsSync(path.join(assets, img))) {
          console.error(`❌ Missing ${img} in ${d}/assets`);
          ok = false;
        }
      }
    }
  }

  return ok;
}

function lintOverlays() {
  const overlaysDir = 'lib/tuya/overlays/vendors';
  let ok = true;

  if (!fs.existsSync(overlaysDir)) {
    console.error('❌ Overlays directory not found');
    return false;
  }

  for (const vendor of fs.readdirSync(overlaysDir)) {
    const vendorPath = path.join(overlaysDir, vendor);
    if (!fs.statSync(vendorPath).isDirectory()) continue;

    // Vérifier que le nom du vendor est valide
    if (!vendor.startsWith('_')) {
      console.error(`❌ Vendor folder should start with _: ${vendor}`);
      ok = false;
    }

    // Vérifier les fichiers overlay (noms lisibles par type)
    for (const overlay of fs.readdirSync(vendorPath)) {
      if (overlay.endsWith('.json')) {
        if (badTS(overlay)) {
          console.error(`❌ Overlay filename should not contain TSxxxx: ${overlay}`);
          ok = false;
        }
      }
    }
  }

  return ok;
}

function main() {
  console.log('🔍 Linting naming conventions and structure...');
  
  const driversOk = lintDrivers();
  const overlaysOk = lintOverlays();
  
  if (driversOk && overlaysOk) {
    console.log('✅ LINT_NAMING_OK');
    process.exit(0);
  } else {
    console.log('❌ LINT_NAMING_FAIL');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { lintDrivers, lintOverlays };
