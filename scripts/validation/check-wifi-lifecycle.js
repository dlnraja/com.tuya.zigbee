#!/usr/bin/env node
'use strict';
// v9.0.40: WiFi Lifecycle Validator
// Checks all WiFi drivers for proper lifecycle patterns:
// - super.onDeleted() called in onDeleted()
// - super.onUninit() called in onUninit()
// - _destroyed guard in async callbacks
// - safeSetCapabilityValue usage
// - No console.log in drivers

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');
const ROOT_DIR = path.join(__dirname, '..', '..');
const WIFI_PREFIX = 'wifi_';

let errors = 0;
let warnings = 0;

function log(level, file, msg) {
  const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : '✅';
  console.log(`${prefix} [${level}] ${file}: ${msg}`);
  if (level === 'ERROR') errors++;
  if (level === 'WARN') warnings++;
}

function checkFile(filePath, driverName) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(process.cwd(), filePath);

  // Check 1: onDeleted must call super.onDeleted()
  if ((content.includes('async onDeleted()') || content.includes('onDeleted() {')) &&
      !content.includes('super.onDeleted()')) {
    log('ERROR', relPath, 'onDeleted() does not call super.onDeleted() - TCP connection will leak');
  }

  // Check 2: onUninit must call super.onUninit()
  if (content.includes('async onUninit()') || content.includes('onUninit() {')) {
    if (!content.includes('super.onUninit()')) {
      log('WARN', relPath, 'onUninit() does not call super.onUninit()');
    }
  }

  // Check 3: No console.log in drivers
  const consoleMatches = content.match(/(?<!\/\/.*)console\.(log|error|warn|debug)\(/g);
  if (consoleMatches) {
    log('ERROR', relPath, `Found ${consoleMatches.length} console.log/error calls - use this.log()/this.error()`);
  }

  // Check 4: Mixin order
  if (content.includes('VirtualButtonMixin(PhysicalButtonMixin(')) {
    log('ERROR', relPath, 'Mixin order reversed - should be PhysicalButtonMixin(VirtualButtonMixin(Base))');
  }

  // Check 5: Missing VirtualButtonMixin import when used
  if (content.includes('VirtualButtonMixin(') && !content.includes("require('") && !content.includes('require("')) {
    // Check if import exists
    if (!content.includes('VirtualButtonMixin') || !content.match(/require.*VirtualButtonMixin/)) {
      log('ERROR', relPath, 'VirtualButtonMixin used but not imported');
    }
  }

  // Check 6: Raw setCapabilityValue without _destroyed guard
  const rawSetMatches = content.match(/this\.setCapabilityValue\(/g);
  const safeSetMatches = content.match(/this\.safeSetCapabilityValue\(/g);
  const guardMatches = content.match(/if\s*\(\s*this\._destroyed\s*\)/g);

  if (rawSetMatches && rawSetMatches.length > 0 && (!safeSetMatches || safeSetMatches.length === 0)) {
    if (!guardMatches || guardMatches.length === 0) {
      log('WARN', relPath, `${rawSetMatches.length} raw setCapabilityValue calls without _destroyed guard`);
    }
  }

  // Check 7: markAppCommand in capability listeners
  if (content.includes('registerCapabilityListener') && !content.includes('markAppCommand') && !content.includes('_setGangOnOff')) {
    log('WARN', relPath, 'Capability listeners without markAppCommand - may cause ghost button presses');
  }
}

function scanDrivers() {
  if (!fs.existsSync(DRIVERS_DIR)) {
    console.log('Drivers directory not found');
    return;
  }

  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => d.startsWith(WIFI_PREFIX));

  console.log(`\n🔍 Scanning ${drivers.length} WiFi drivers...\n`);

  for (const driver of drivers) {
    const devicePath = path.join(DRIVERS_DIR, driver, 'device.js');
    const driverPath = path.join(DRIVERS_DIR, driver, 'driver.js');

    checkFile(devicePath, driver);
    checkFile(driverPath, driver);
  }

  checkSharedWiFiLocalFirstLayer();

  console.log(`\n📊 Results: ${errors} errors, ${warnings} warnings`);
  if (errors > 0) {
    console.log('❌ FAILED - Fix errors before committing');
    process.exit(1);
  } else {
    console.log('✅ PASSED');
  }
}

function checkSharedWiFiLocalFirstLayer() {
  const required = [
    {
      file: path.join(ROOT_DIR, 'lib', 'tuya-local', 'TuyaLocalDriver.js'),
      tokens: ['createWiFiConnectionStore', 'pairingMode', 'cloudFallback: false'],
      message: 'Tuya pairing must stamp devices with local-first/ad-hoc policy and cloud fallback disabled',
    },
    {
      file: path.join(ROOT_DIR, 'lib', 'tuya-local', 'TuyaLocalDevice.js'),
      tokens: ['_allowsCloudKeyRecovery', 'Cloud key recovery skipped by local-first policy'],
      message: 'Tuya runtime must keep cloud key recovery opt-in',
    },
    {
      file: path.join(ROOT_DIR, 'lib', 'ewelink-local', 'EweLinkLocalDriver.js'),
      tokens: ['createWiFiConnectionStore', "pairingMode:'ad_hoc'"],
      message: 'eWeLink pairing must stamp devices with local-first/ad-hoc policy',
    },
  ];

  for (const item of required) {
    const relPath = path.relative(process.cwd(), item.file);
    if (!fs.existsSync(item.file)) {
      log('ERROR', relPath, item.message);
      continue;
    }
    const content = fs.readFileSync(item.file, 'utf8');
    for (const token of item.tokens) {
      if (!content.includes(token)) {
        log('ERROR', relPath, `${item.message} (missing ${token})`);
      }
    }
  }

  for (const rel of [
    path.join('lib', 'tuya-local', 'TuyaDeviceDiscovery.js'),
    path.join('lib', 'tuya-local', 'TuyaUDPDiscovery.js'),
  ]) {
    const file = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (/this\.homey\.(setTimeout|setInterval)/.test(content)) {
      log('ERROR', path.relative(process.cwd(), file), 'LAN discovery helper uses Homey timers without a Homey context');
    }
  }
}

scanDrivers();
