#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const EXEMPT_DRIVERS = new Set([
  'universal_fallback',
  'tuya_dummy_device',
  'generic_tuya',
  'generic_diy',
  'device_generic_diy_universal',
  'universal_zigbee',
]);

const EXEMPT_KEY_RE = /_hybrid_.*_needs_device_assignment|_master_.*_needs_device_assignment|_stable_v5_.*_needs_device_assignment|_disabled_.*_needs_exact_fingerprint|_tz3000_unknown|_tze200_placeholder_generic/i;

function defaultReportPath() {
  const stamp = new Date().toISOString().slice(0, 10);
  return path.join('docs', 'reports', `FINGERPRINT_CATALOG_REFERENCE_${stamp}.md`);
}

function parseArgs(argv) {
  const args = { json: false, writeReport: null };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--json') args.json = true;
    if (arg === '--write-report') {
      const reportPath = argv[index + 1];
      if (reportPath && !reportPath.startsWith('--')) {
        args.writeReport = reportPath;
        index++;
      } else {
        args.writeReport = defaultReportPath();
      }
    }
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(item => item !== null && item !== undefined);
  if (typeof value === 'string') return [value];
  return [];
}

function keyOf(manufacturerName, productId) {
  return `${String(manufacturerName).toLowerCase()}|${String(productId)}`;
}

function nameOf(driver) {
  return driver?.name?.en || driver?.name?.fr || driver?.id || '(unnamed)';
}

function sortedStrings(values) {
  return normalizeArray(values).map(String).sort((a, b) => a.localeCompare(b));
}

function sameStringSet(left, right) {
  const a = sortedStrings(left);
  const b = sortedStrings(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function addLimited(list, item, limit = 500) {
  if (list.length < limit) list.push(item);
}

function loadDriverCatalog(report) {
  const appPath = path.join(ROOT, 'app.json');
  const app = readJson(appPath);
  const appDrivers = new Map(normalizeArray(app.drivers).map(driver => [driver.id, driver]));
  const composeDrivers = new Map();

  const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const driverId of driverDirs) {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
      addLimited(report.errors, { scope: driverId, message: 'Missing driver.compose.json' });
      continue;
    }

    let compose;
    try {
      compose = readJson(composePath);
    } catch (err) {
      addLimited(report.errors, { scope: driverId, message: `Invalid driver.compose.json: ${err.message}` });
      continue;
    }

    composeDrivers.set(driverId, compose);
    const appDriver = appDrivers.get(driverId);
    if (!appDriver) {
      addLimited(report.errors, { scope: driverId, message: 'driver.compose.json has no matching app.json driver' });
      continue;
    }

    if (!nameOf(compose) || nameOf(compose) === '(unnamed)') {
      addLimited(report.errors, { scope: driverId, message: 'Driver has no device name' });
    }

    if (nameOf(compose) !== nameOf(appDriver)) {
      addLimited(report.errors, {
        scope: driverId,
        message: 'Device name mismatch between driver.compose.json and app.json',
        composeName: nameOf(compose),
        appName: nameOf(appDriver),
      });
    }

    if (compose.class && appDriver.class && compose.class !== appDriver.class) {
      addLimited(report.errors, {
        scope: driverId,
        message: 'Device class mismatch between driver.compose.json and app.json',
        composeClass: compose.class || null,
        appClass: appDriver.class || null,
      });
    } else if (!compose.class && appDriver.class) {
      addLimited(report.warnings, {
        scope: driverId,
        message: 'Device class is generated in app.json but missing in driver.compose.json',
        appClass: appDriver.class,
      });
    }

    if (!sameStringSet(compose.zigbee?.manufacturerName, appDriver.zigbee?.manufacturerName)) {
      addLimited(report.errors, { scope: driverId, message: 'manufacturerName mismatch between driver.compose.json and app.json' });
    }

    if (!sameStringSet(compose.zigbee?.productId, appDriver.zigbee?.productId)) {
      addLimited(report.errors, { scope: driverId, message: 'productId/deviceId mismatch between driver.compose.json and app.json' });
    }

    for (const field of ['manufacturerName', 'productId']) {
      const seen = new Set();
      for (const value of normalizeArray(compose.zigbee?.[field])) {
        const exact = String(value);
        if (!exact.trim()) {
          addLimited(report.errors, { scope: driverId, message: `${field} contains an empty value` });
        }
        if (seen.has(exact)) {
          addLimited(report.warnings, { scope: driverId, message: `${field} contains an exact duplicate`, value: exact });
        }
        seen.add(exact);
      }
    }
  }

  for (const driverId of appDrivers.keys()) {
    if (!composeDrivers.has(driverId)) {
      addLimited(report.errors, { scope: driverId, message: 'app.json driver has no matching driver.compose.json' });
    }
  }

  return { appDrivers, composeDrivers };
}

function collectManifestPairs(composeDrivers) {
  const pairs = new Map();
  for (const [driverId, driver] of composeDrivers) {
    const manufacturers = normalizeArray(driver.zigbee?.manufacturerName);
    const productIds = normalizeArray(driver.zigbee?.productId);
    for (const manufacturerName of manufacturers) {
      for (const productId of productIds) {
        const key = keyOf(manufacturerName, productId);
        if (!pairs.has(key)) pairs.set(key, []);
        pairs.get(key).push({
          driverId,
          name: nameOf(driver),
          class: driver.class || null,
          manufacturerName,
          productId,
        });
      }
    }
  }
  return pairs;
}

function analyzeCollisions(report, pairs) {
  for (const [key, claims] of pairs) {
    if (EXEMPT_KEY_RE.test(key)) continue;
    const uniqueDrivers = [...new Map(claims.map(claim => [claim.driverId, claim])).values()]
      .filter(claim => !EXEMPT_DRIVERS.has(claim.driverId))
      .sort((a, b) => a.driverId.localeCompare(b.driverId));
    if (uniqueDrivers.length <= 1) continue;
    report.collisions.push({ key, claims: uniqueDrivers });
  }
}

function analyzeCompoundDb(report, composeDrivers, pairs) {
  let DeviceFingerprintDB;
  try {
    DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
  } catch (err) {
    addLimited(report.errors, { scope: 'DeviceFingerprintDB', message: `Unable to load DeviceFingerprintDB: ${err.message}` });
    return;
  }

  const entries = DeviceFingerprintDB.getAll ? DeviceFingerprintDB.getAll() : {};
  report.stats.compoundEntries = Object.keys(entries).length;

  for (const [compoundKey, profile] of Object.entries(entries)) {
    const [manufacturerName, productId] = compoundKey.split('|');
    const targetDriver = profile.driver;
    const target = composeDrivers.get(targetDriver);
    const pairKey = keyOf(manufacturerName, productId);
    const claims = pairs.get(pairKey) || [];
    const targetClaimed = claims.some(claim => claim.driverId === targetDriver);
    const nonTargetClaims = [...new Map(
      claims
        .filter(claim => claim.driverId !== targetDriver)
        .map(claim => [claim.driverId, claim])
    ).values()];

    const route = {
      key: compoundKey,
      driverId: targetDriver || null,
      name: target ? nameOf(target) : null,
      claimedByTarget: targetClaimed,
      nonTargetClaims: nonTargetClaims.map(claim => ({ driverId: claim.driverId, name: claim.name })),
    };
    report.exactRoutes.push(route);

    if (!targetDriver || !target) {
      addLimited(report.errors, {
        scope: 'DeviceFingerprintDB',
        message: 'Exact compound route points to a missing driver',
        key: compoundKey,
        driverId: targetDriver || null,
      });
      continue;
    }

    if (!targetClaimed) {
      addLimited(report.warnings, {
        scope: 'DeviceFingerprintDB',
        message: 'Exact compound route is runtime-only; target manifest does not claim the same manufacturerName+productId pair',
        key: compoundKey,
        driverId: targetDriver,
        name: nameOf(target),
      });
    }

    if (nonTargetClaims.length) {
      addLimited(report.warnings, {
        scope: 'DeviceFingerprintDB',
        message: 'Exact compound route has non-target manifest claims',
        key: compoundKey,
        driverId: targetDriver,
        nonTargetClaims: nonTargetClaims.map(claim => claim.driverId),
      });
    }
  }
}

function analyzeFingerprintSources(report, composeDrivers) {
  const files = [
    path.join(ROOT, 'data', 'fingerprints.json'),
    path.join(ROOT, 'lib', 'tuya', 'fingerprints.json'),
  ];

  let DeviceFingerprintDB = null;
  try {
    DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
  } catch (err) {
    DeviceFingerprintDB = null;
  }

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (!fs.existsSync(file)) continue;
    let data;
    try {
      data = readJson(file);
    } catch (err) {
      addLimited(report.errors, { scope: rel, message: `Invalid JSON: ${err.message}` });
      continue;
    }

    const summary = { file: rel, entries: Object.keys(data).length, missingDrivers: 0, compoundDisagreements: 0 };
    for (const [manufacturerName, fingerprint] of Object.entries(data)) {
      const driverId = fingerprint?.driverId;
      if (driverId && !composeDrivers.has(driverId)) {
        summary.missingDrivers++;
        addLimited(report.warnings, {
          scope: rel,
          message: 'Fingerprint source references a missing driver',
          manufacturerName,
          driverId,
        }, 100);
      }

      if (!DeviceFingerprintDB?.lookup || !driverId) continue;
      for (const modelId of normalizeArray(fingerprint.modelIds)) {
        const exact = DeviceFingerprintDB.lookup(manufacturerName, modelId);
        if (exact?.driver && ['exact', 'exact_ci'].includes(exact.matchType) && exact.driver !== driverId) {
          summary.compoundDisagreements++;
          addLimited(report.warnings, {
            scope: rel,
            message: 'Mfr-only fingerprint source disagrees with exact manufacturerName+productId route',
            manufacturerName,
            productId: modelId,
            sourceDriver: driverId,
            exactDriver: exact.driver,
          }, 100);
        }
      }
    }
    report.fingerprintSources.push(summary);
  }
}

function renderReport(report) {
  const lines = [];
  lines.push('# Fingerprint Catalog Reference');
  lines.push('');
  lines.push(`Generated: ${report.timestamp}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Drivers: ${report.stats.drivers}`);
  lines.push(`- Manifest manufacturerName+productId pairs: ${report.stats.manifestPairs}`);
  lines.push(`- Compound exact routes: ${report.stats.compoundEntries}`);
  lines.push(`- Manifest collisions observed: ${report.collisions.length}`);
  lines.push(`- Errors: ${report.errors.length}`);
  lines.push(`- Warnings: ${report.warnings.length}`);
  lines.push('');

  lines.push('## Exact Routes');
  lines.push('');
  lines.push('| manufacturerName + deviceId | Driver | Device name | Manifest status |');
  lines.push('|---|---|---|---|');
  for (const route of report.exactRoutes) {
    const status = route.claimedByTarget
      ? (route.nonTargetClaims.length ? `target plus ${route.nonTargetClaims.length} other claim(s)` : 'target claimed')
      : 'runtime-only';
    lines.push(`| \`${route.key}\` | \`${route.driverId || '?'}\` | ${route.name || '?'} | ${status} |`);
  }
  lines.push('');

  lines.push('## Fingerprint Sources');
  lines.push('');
  lines.push('| File | Entries | Missing drivers | Compound disagreements |');
  lines.push('|---|---:|---:|---:|');
  for (const source of report.fingerprintSources) {
    lines.push(`| \`${source.file}\` | ${source.entries} | ${source.missingDrivers} | ${source.compoundDisagreements} |`);
  }
  lines.push('');

  lines.push('## Collision Sample');
  lines.push('');
  if (!report.collisions.length) {
    lines.push('No non-exempt manifest collisions found.');
  } else {
    for (const collision of report.collisions.slice(0, 75)) {
      lines.push(`- \`${collision.key}\`: ${collision.claims.map(claim => `\`${claim.driverId}\` (${claim.name})`).join(', ')}`);
    }
  }
  lines.push('');

  lines.push('## Warnings Sample');
  lines.push('');
  if (!report.warnings.length) {
    lines.push('No warnings.');
  } else {
    for (const warning of report.warnings.slice(0, 75)) {
      lines.push(`- ${warning.scope}: ${warning.message}${warning.key ? ` (${warning.key})` : ''}`);
    }
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function compactReport(report) {
  return {
    timestamp: report.timestamp,
    stats: report.stats,
    errors: report.errors,
    warnings: report.warnings.slice(0, 100),
    warningCount: report.warnings.length,
    collisions: report.collisions.slice(0, 100),
    collisionCount: report.collisions.length,
    exactRoutes: report.exactRoutes,
    fingerprintSources: report.fingerprintSources,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = {
    timestamp: new Date().toISOString(),
    stats: {
      drivers: 0,
      manifestPairs: 0,
      compoundEntries: 0,
    },
    errors: [],
    warnings: [],
    collisions: [],
    exactRoutes: [],
    fingerprintSources: [],
  };

  const catalog = loadDriverCatalog(report);
  report.stats.drivers = catalog.composeDrivers.size;
  const pairs = collectManifestPairs(catalog.composeDrivers);
  report.stats.manifestPairs = pairs.size;

  analyzeCollisions(report, pairs);
  analyzeCompoundDb(report, catalog.composeDrivers, pairs);
  analyzeFingerprintSources(report, catalog.composeDrivers);

  if (args.writeReport) {
    const reportPath = path.resolve(ROOT, args.writeReport);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, renderReport(report), 'utf8');
  }

  if (args.json) {
    console.log(JSON.stringify(compactReport(report), null, 2));
  } else {
    console.log(`Fingerprint catalog audit: ${report.stats.drivers} drivers, ${report.stats.manifestPairs} pairs, ${report.collisions.length} collisions, ${report.errors.length} errors, ${report.warnings.length} warnings`);
    for (const error of report.errors.slice(0, 25)) {
      console.error(`ERROR [${error.scope}] ${error.message}`);
    }
    for (const warning of report.warnings.slice(0, 25)) {
      console.warn(`WARN [${warning.scope}] ${warning.message}`);
    }
  }

  process.exit(report.errors.length > 0 ? 1 : 0);
}

main();
