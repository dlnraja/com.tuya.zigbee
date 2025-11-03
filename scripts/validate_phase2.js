#!/usr/bin/env node
'use strict';

/**
 * PHASE 2 VALIDATION SCRIPT
 * 
 * Validates that all Phase 2 components are correctly implemented:
 * - Device Finder functionality
 * - BSEED Detector
 * - Intelligent Protocol Router
 * - HOBEIAN manufacturer entry
 * - Documentation completeness
 * - File organization
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

const validations = [];

function validate(name, check) {
  const result = check();
  validations.push({ name, passed: result });
  
  if (result) {
    log(`✅ ${name}`, 'green');
  } else {
    log(`❌ ${name}`, 'red');
  }
  
  return result;
}

console.clear();
log('╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
log('║                       PHASE 2 VALIDATION SCRIPT                            ║', 'cyan');
log('║                     Universal Tuya Zigbee v4.10.0                          ║', 'cyan');
log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');
console.log('');

// ============================================================================
// PHASE 2.1: DEVICE FINDER
// ============================================================================

log('\n📱 Phase 2.1: Device Finder', 'blue');

validate('device-finder.html exists', () => {
  return fs.existsSync(path.join(ROOT, 'docs', 'device-finder.html'));
});

validate('device-finder.html has extractBrand function', () => {
  const content = fs.readFileSync(path.join(ROOT, 'docs', 'device-finder.html'), 'utf8');
  return content.includes('function extractBrand');
});

validate('device-finder.html handles devices array', () => {
  const content = fs.readFileSync(path.join(ROOT, 'docs', 'device-finder.html'), 'utf8');
  return content.includes('data.devices || data.drivers');
});

validate('device-matrix.json exists', () => {
  return fs.existsSync(path.join(ROOT, 'docs', 'device-matrix.json'));
});

validate('device-matrix.json has devices array', () => {
  try {
    const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'device-matrix.json'), 'utf8'));
    return Array.isArray(matrix.devices) && matrix.devices.length > 0;
  } catch (err) {
    return false;
  }
});

// ============================================================================
// PHASE 2.2: BSEED DETECTION
// ============================================================================

log('\n🔧 Phase 2.2: BSEED Detection System', 'blue');

validate('BseedDetector.js exists', () => {
  return fs.existsSync(path.join(ROOT, 'lib', 'BseedDetector.js'));
});

validate('BseedDetector has isBseedDevice method', () => {
  const content = fs.readFileSync(path.join(ROOT, 'lib', 'BseedDetector.js'), 'utf8');
  return content.includes('static isBseedDevice');
});

validate('BseedDetector has needsTuyaDP method', () => {
  const content = fs.readFileSync(path.join(ROOT, 'lib', 'BseedDetector.js'), 'utf8');
  return content.includes('static needsTuyaDP');
});

validate('BseedDetector has DP mapping', () => {
  const content = fs.readFileSync(path.join(ROOT, 'lib', 'BseedDetector.js'), 'utf8');
  return content.includes('getBseedDPMapping');
});

validate('IntelligentProtocolRouter.js exists', () => {
  return fs.existsSync(path.join(ROOT, 'lib', 'IntelligentProtocolRouter.js'));
});

validate('IntelligentProtocolRouter has detectProtocol', () => {
  const content = fs.readFileSync(path.join(ROOT, 'lib', 'IntelligentProtocolRouter.js'), 'utf8');
  return content.includes('async detectProtocol');
});

validate('IntelligentProtocolRouter uses BseedDetector', () => {
  const content = fs.readFileSync(path.join(ROOT, 'lib', 'IntelligentProtocolRouter.js'), 'utf8');
  return content.includes('BseedDetector');
});

validate('Email response to Loïc exists', () => {
  return fs.existsSync(path.join(ROOT, 'docs', 'EMAIL_RESPONSE_LOIC_BSEED.txt'));
});

// ============================================================================
// PHASE 2.3: HOBEIAN INTEGRATION
// ============================================================================

log('\n🏭 Phase 2.3: HOBEIAN Integration', 'blue');

validate('HOBEIAN in manufacturer database', () => {
  try {
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'project-data', 'MANUFACTURER_DATABASE.json'), 'utf8'));
    return db.manufacturers && db.manufacturers.HOBEIAN !== undefined;
  } catch (err) {
    return false;
  }
});

validate('HOBEIAN has ZG-204ZV product', () => {
  try {
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'project-data', 'MANUFACTURER_DATABASE.json'), 'utf8'));
    return db.manufacturers.HOBEIAN && db.manufacturers.HOBEIAN.productId === 'ZG-204ZV';
  } catch (err) {
    return false;
  }
});

validate('HOBEIAN driver exists in app.json', () => {
  try {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const driver = app.drivers.find(d => 
      d.id === 'motion_temp_humidity_lux' || 
      (d.zigbee && d.zigbee.manufacturerName && d.zigbee.manufacturerName.includes('HOBEIAN'))
    );
    return !!driver;
  } catch (err) {
    return false;
  }
});

// ============================================================================
// DOCUMENTATION
// ============================================================================

log('\n📚 Documentation', 'blue');

validate('INTEGRATION_ACTION_PLAN.md exists', () => {
  return fs.existsSync(path.join(ROOT, 'INTEGRATION_ACTION_PLAN.md'));
});

validate('PHASE2_COMPLETION_SUMMARY.md exists', () => {
  return fs.existsSync(path.join(ROOT, 'PHASE2_COMPLETION_SUMMARY.md'));
});

validate('README.txt updated to v4.10.0', () => {
  const content = fs.readFileSync(path.join(ROOT, 'docs', 'README.txt'), 'utf8');
  return content.includes('4.10.0') && content.includes('Phase 2');
});

validate('README.txt mentions Intelligent Protocol Router', () => {
  const content = fs.readFileSync(path.join(ROOT, 'docs', 'README.txt'), 'utf8');
  return content.includes('INTELLIGENT PROTOCOL ROUTER');
});

validate('README.txt mentions BSEED', () => {
  const content = fs.readFileSync(path.join(ROOT, 'docs', 'README.txt'), 'utf8');
  return content.includes('BSEED');
});

validate('README.txt mentions HOBEIAN', () => {
  const content = fs.readFileSync(path.join(ROOT, 'docs', 'README.txt'), 'utf8');
  return content.includes('HOBEIAN');
});

// ============================================================================
// LIB FILES INTEGRATION
// ============================================================================

log('\n📦 Lib Files', 'blue');

const requiredLibFiles = [
  'BseedDetector.js',
  'IntelligentProtocolRouter.js',
  'TuyaEF00Manager.js',
  'TuyaDPParser.js',
  'TuyaMultiGangManager.js',
  'TuyaDataPointEngine.js',
  'BaseHybridDevice.js'
];

requiredLibFiles.forEach(file => {
  validate(`lib/${file} exists`, () => {
    return fs.existsSync(path.join(ROOT, 'lib', file));
  });
});

// ============================================================================
// GITHUB WORKFLOWS
// ============================================================================

log('\n⚙️  GitHub Workflows', 'blue');

validate('organize-docs.yml exists', () => {
  return fs.existsSync(path.join(ROOT, '.github', 'workflows', 'organize-docs.yml'));
});

// ============================================================================
// SUMMARY
// ============================================================================

log('\n' + '='.repeat(80), 'cyan');
log('VALIDATION SUMMARY', 'cyan');
log('='.repeat(80), 'cyan');

const total = validations.length;
const passed = validations.filter(v => v.passed).length;
const failed = total - passed;

log(`\nTotal Validations: ${total}`, 'blue');
log(`Passed: ${passed}`, passed === total ? 'green' : 'yellow');
if (failed > 0) {
  log(`Failed: ${failed}`, 'red');
}

const percentage = Math.round((passed / total) * 100);
log(`\nSuccess Rate: ${percentage}%`, percentage === 100 ? 'green' : 'yellow');

if (passed === total) {
  log('\n🎉 ALL VALIDATIONS PASSED!', 'green');
  log('✅ Phase 2 is ready for commit and deployment', 'green');
  process.exit(0);
} else {
  log('\n⚠️  SOME VALIDATIONS FAILED', 'yellow');
  log('Please review the failed items above before committing', 'yellow');
  
  console.log('\nFailed validations:');
  validations.filter(v => !v.passed).forEach(v => {
    log(`  - ${v.name}`, 'red');
  });
  
  process.exit(1);
}
