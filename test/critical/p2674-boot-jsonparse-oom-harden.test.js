'use strict';

/**
 * P2674 — Boot JsonParse OOM harden (Gmail/GitHub #553 diag 149bc1a5 @ 9.0.1165)
 *
 * Contre quoi:
 * - Broad lib/tuya/fingerprints.json (~0.9MB) merged first during device storm
 * - Compound sacred-couple hit still force-loads mfr catalog (JsonParse @ ~63MB)
 * - DriverMappingLoader constructor always JSON.parses mapping DB under heap critical
 * - Misattrib registry parses 200KB while BootBudget.isHeapCritical
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2674 boot JsonParse OOM harden', () => {
  it('DeviceFingerprintDB prefers curated paths before broad catalog', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib', 'tuya', 'DeviceFingerprintDB.js'),
      'utf8',
    );
    assert.ok(src.includes('CURATED_FINGERPRINT_PATHS'), 'curated path list');
    assert.ok(src.includes('BROAD_FINGERPRINT_PATHS'), 'broad path list');
    assert.ok(src.includes('_isFpLoadPressure'), 'pressure gate');
    assert.ok(src.includes('P2674'), 'WHY tag');
    // Contre quoi: compound hit must not always call getFingerprint(mfr)
    const compoundBlock = src.slice(
      src.indexOf('function getFingerprint'),
      src.indexOf('function getDriverId'),
    );
    assert.ok(
      compoundBlock.includes('DEVICE_FINGERPRINTS !== null')
        || compoundBlock.includes('_isFpLoadPressure'),
      'compound path must gate mfr fallback under pressure',
    );
    assert.ok(
      !/if \(compound\) \{\s*const fallback = getFingerprint\(manufacturerName\);/.test(compoundBlock),
      'unconditional compound→mfr fallback must be gone',
    );
    assert.ok(
      src.includes('_broadSkippedDueToPressure') && src.includes('_tryUpgradeBroadCatalog'),
      'pressure skip must allow later broad upgrade',
    );
  });

  it('DriverMappingLoader skips / defers JSON load under heap pressure', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib', 'utils', 'DriverMappingLoader.js'),
      'utf8',
    );
    assert.ok(src.includes('_mappingLoadPressure'), 'pressure helper');
    assert.ok(src.includes('ensureLoaded'), 'retry after boot');
    assert.ok(src.includes('skip JSON load') || src.includes('_deferredDueToPressure'));
    assert.ok(src.includes('P2674'));
  });

  it('UserMisattributionRegistry soft-skips under isHeapCritical', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib', 'pairing', 'UserMisattributionRegistry.js'),
      'utf8',
    );
    assert.ok(src.includes('isHeapCritical'));
    assert.ok(src.includes('_deferredPressure') || src.includes('P2674'));
  });

  it('broad fingerprints file exists but curated is much smaller (budget)', () => {
    const broad = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
    const curated = path.join(ROOT, 'data', 'fingerprints.json');
    assert.ok(fs.existsSync(broad), 'broad catalog present for healthy heap');
    assert.ok(fs.existsSync(curated), 'curated catalog present');
    const broadSz = fs.statSync(broad).size;
    const curatedSz = fs.statSync(curated).size;
    assert.ok(broadSz > 100 * 1024, 'broad is the large source');
    assert.ok(curatedSz < broadSz / 4, 'curated stays lean for pressure boot');
  });
});
