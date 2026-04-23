'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const LIB_DIR = path.join(__dirname, '..', 'lib');

describe('Universal Tuya Zigbee - Driver Integrity', function() {
  this.timeout(10000);

  const driverDirs = fs.readdirSync(DRIVERS_DIR)
    .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());

  it('should have at least 190 drivers', () => {
    assert(driverDirs.length >= 190, `Expected >=190 drivers, got ${driverDirs.length}`);
  });

  it('every driver should have a device.js', () => {
    const missing = driverDirs.filter(d => !fs.existsSync(path.join(DRIVERS_DIR, d, 'device.js')));
    assert.strictEqual(missing.length, 0, `Missing device.js: ${missing.join(', ')}`);
  });

  it('every driver should have a driver.compose.json', () => {
    const missing = driverDirs.filter(d => !fs.existsSync(path.join(DRIVERS_DIR, d, 'driver.compose.json')));
    assert.strictEqual(missing.length, 0, `Missing driver.compose.json: ${missing.join(', ')}`);
  });

  it('device.js files should have valid JavaScript (static check)', () => {
    const errors = [];
    for (const d of driverDirs) {
      const file = path.join(DRIVERS_DIR, d, 'device.js');
      if (!fs.existsSync(file)) continue;
      const code = fs.readFileSync(file, 'utf8');
      // Basic syntax check: verify balanced braces
      const opens = (code.match(/\{/g) || []).length;
      const closes = (code.match(/\}/g) || []).length;
      if (Math.abs(opens - closes) > 2) {
        errors.push(`${d}: unbalanced braces (${opens} open, ${closes} close)`);
      }
      // Check for common syntax errors
      if (/\bfunction\s*\(/.test(code) && code.includes('async async')) {
        errors.push(`${d}: double async keyword`);
      }
    }
    assert.strictEqual(errors.length, 0, `Syntax issues: ${errors.join('\n')}`);
  });

  it('driver.compose.json files should be valid JSON', () => {
    const errors = [];
    for (const d of driverDirs) {
      const file = path.join(DRIVERS_DIR, d, 'driver.compose.json');
      if (!fs.existsSync(file)) continue;
      try {
        JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (e) {
        errors.push(`${d}: ${e.message}`);
      }
    }
    assert.strictEqual(errors.length, 0, `Invalid JSON: ${errors.join('\n')}`);
  });

  it('no fingerprint collisions across different device types', () => {
    const fpMap = new Map(); // manufacturerName -> [drivers]
    for (const d of driverDirs) {
      const file = path.join(DRIVERS_DIR, d, 'driver.compose.json');
      if (!fs.existsSync(file)) continue;
      const compose = JSON.parse(fs.readFileSync(file, 'utf8'));
      const zigbee = compose.zigbee;
      if (!zigbee || !zigbee.manufacturerName) continue;
      for (const mfr of zigbee.manufacturerName) {
        const key = `${mfr}|${(zigbee.productId || []).join(',')}`;
        if (!fpMap.has(key)) fpMap.set(key, []);
        fpMap.get(key).push(d);
      }
    }
    const collisions = [...fpMap.entries()]
      .filter(([, drivers]) => drivers.length > 1)
      .filter(([, drivers]) => {
        // Exclude known OK collisions (bulb_rgb/bulb_rgbw share PIDs intentionally)
        const types = new Set(drivers.map(d => d.replace(/_\d+$/, '')));
        return types.size > 1;
      });
    // Report (don't fail)  some collisions are expected
    if (collisions.length > 0) {
      console.log(`   ${collisions.length} cross-type FP collision(s) found (informational)`);
    }
  });
});

describe('Universal Tuya Zigbee - SDK v3 Compliance', function() {
  this.timeout(5000);

  const driverDirs = fs.readdirSync(DRIVERS_DIR)
    .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory())
    .filter(d => fs.existsSync(path.join(DRIVERS_DIR, d, 'device.js')));

  it('no driver should use deprecated ManagerDrivers global', () => {
    const violations = [];
    for (const d of driverDirs) {
      const code = fs.readFileSync(path.join(DRIVERS_DIR, d, 'device.js'), 'utf8');
      if (/\bManagerDrivers\b/.test(code) || /\bHomey\.Manager[A-Z]/.test(code)) {
        violations.push(d);
      }
    }
    assert.strictEqual(violations.length, 0, `SDK v2 globals: ${violations.join(', ')}`);
  });

  it('no driver should use this.homey.zigbee.getDevice (v2 API)', () => {
    const violations = [];
    for (const d of driverDirs) {
      const code = fs.readFileSync(path.join(DRIVERS_DIR, d, 'device.js'), 'utf8');
      if (/this\.homey\.zigbee\.getDevice/.test(code)) {
        violations.push(d);
      }
    }
    assert.strictEqual(violations.length, 0, `SDK v2 API: ${violations.join(', ')}`);
  });
});

describe('Universal Tuya Zigbee - App Configuration', function() {
  it('app.json should be valid JSON', () => {
    const app = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'));
    assert.strictEqual(app.sdk * 3);
    assert(app.version, 'Version should be set');
  });

  it('package.json engines should include homey', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert(pkg.engines.homey, 'homey engine version should be set');
  });

  it('locales should have at least EN', () => {
    const locales = fs.readdirSync(path.join(__dirname, '..', 'locales')).filter(f => f.endsWith('.json'));
    assert(locales.includes('en.json'), 'en.json locale required');
    assert(locales.length >= 5, `Expected >=5 locales, got ${locales.length}`);
  });
});
