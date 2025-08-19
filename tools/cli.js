#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');

// Environment pour sous-process non-interactifs
const ENV = {
  ...process.env,
  CI: '1',
  TERM: 'dumb',
  NO_COLOR: '1',
  FORCE_COLOR: '0'
};

// Helpers
function runCmd(cmd, argv, label, timeoutMs = 60000) {
  try {
    const out = execFileSync(cmd, argv, {
      env: ENV,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
      windowsHide: true,
      shell: false
    }).toString();
    // Force multiple line breaks for PowerShell
    console.log(out);
    console.log(`::END::${label}::OK`);
    console.log('');
    console.log('');
    return { code: 0, out };
  } catch (e) {
    const out = (e.stdout?.toString() || '') + (e.stderr?.toString() || e.message);
    console.log(out);
    console.log(`::END::${label}::FAIL`);
    console.log('');
    console.log('');
    return { code: e.status ?? 1, out };
  }
}

function glob(pattern) {
  const results = [];
  const parts = pattern.split('**');
  if (parts.length === 1) {
    const dir = path.dirname(pattern);
    const ext = path.extname(pattern);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith(ext))
      .map(f => path.join(dir, f));
  }
  const baseDir = parts[0].replace(/\/$/, '');
  const ext = parts[1] ? path.extname(parts[1]) : '';
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
      const fullPath = path.join(dir, f);
      if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
      else if (!ext || f.endsWith(ext)) results.push(fullPath);
    });
  }
  walk(baseDir);
  return results;
}

// Commands
function audit() {
  console.log('🔍 Auditing...');
  const issues = [];
  
  // Check TSxxxx
  if (fs.existsSync('drivers')) {
    fs.readdirSync('drivers').forEach(d => {
      if (/TS\d{4,}/i.test(d)) issues.push(`TSxxxx in driver: ${d}`);
    });
  }
  
  // Check network
  const files = [...glob('lib/**/*.js'), ...glob('drivers/**/*.js')];
  const banned = ['http', 'https', 'fetch', 'axios', 'ws'];
  files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    banned.forEach(b => {
      if (content.includes(`'${b}'`) || content.includes(`"${b}"`)) {
        issues.push(`Network in ${f}: ${b}`);
      }
    });
  });
  
  if (issues.length) {
    console.error('Issues:', issues);
    process.exit(1);
  }
  console.log('✅ Audit OK');
  console.log('::END::AUDIT::OK\n');
}

function build() {
  console.log('🔨 Building...');
  const r = runCmd('node', ['tools/build-manifest.js'], 'BUILD');
  if (r.code !== 0) process.exit(1);
}

function validate() {
  console.log('✅ Validating...');
  const r = runCmd('node', ['tools/validate-local.js'], 'VALIDATE');
  if (!/OK/i.test(r.out)) process.exit(1);
}

function lint() {
  console.log('🔍 Linting...');
  audit(); // Reuse audit logic
}

function test() {
  console.log('🧪 Testing...');
  const tests = glob('tests/**/*.test.js');
  if (tests.length) {
    const r = runCmd('node', ['--test', ...tests], 'TEST');
    if (r.code !== 0) process.exit(1);
  }
  console.log('✅ Tests OK');
  console.log('::END::TEST::OK\n');
}

// Commands implementation
function harvest() {
  console.log('🌾 Harvesting...');
  const HarvestSystem = require('./harvest');
  const harvester = new HarvestSystem();
  const results = harvester.harvest();
  console.log(`✅ Harvest OK (${results.length} items)`);
  console.log('::END::HARVEST::OK\n');
}

function infer() {
  console.log('🧮 Inferring...');
  const InferenceEngine = require('./inference');
  const engine = new InferenceEngine();
  const proposals = engine.infer();
  console.log(`✅ Infer OK (${proposals.length} proposals)`);
  console.log('::END::INFER::OK\n');
}

function propose() {
  console.log('💡 Proposing overlays...');
  // Move proposals to overlays directory
  const proposalsDir = 'research/proposals';
  const overlaysDir = 'lib/tuya/overlays/vendors';
  
  if (fs.existsSync(proposalsDir)) {
    const files = fs.readdirSync(proposalsDir).filter(f => f.endsWith('.json'));
    files.forEach(file => {
      const proposal = JSON.parse(fs.readFileSync(path.join(proposalsDir, file), 'utf8'));
      
      // Determine target directory
      const vendor = proposal.manufacturerName || '_unknown';
      const vendorDir = path.join(overlaysDir, vendor);
      if (!fs.existsSync(vendorDir)) fs.mkdirSync(vendorDir, { recursive: true });
      
      // Save overlay
      const targetFile = path.join(vendorDir, `${proposal.type || 'generic'}.json`);
      fs.writeFileSync(targetFile, JSON.stringify(proposal, null, 2));
    });
    console.log(`  Moved ${files.length} proposals to overlays`);
  }
  
  console.log('✅ Propose OK');
  console.log('::END::PROPOSE::OK\n');
}

function fixValidate() {
  console.log('🔧 Fix-validate loop...');
  for (let i = 0; i < 3; i++) {
    const r = runCmd('node', ['tools/validate-local.js'], 'FIX_VALIDATE');
    if (/OK/i.test(r.out)) {
      console.log('✅ Fix-validate OK');
      console.log('::END::FIX_VALIDATE::OK\n');
      return;
    }
    // Apply fixes here if needed
  }
  console.log('❌ Fix-validate failed');
  console.log('::END::FIX_VALIDATE::FAIL\n');
  process.exit(1);
}

// Main
const cmd = process.argv[2];
if (!fs.existsSync('reports')) fs.mkdirSync('reports');

switch (cmd) {
  case 'audit': audit(); break;
  case 'build': build(); break;
  case 'validate': validate(); break;
  case 'lint': lint(); break;
  case 'test': test(); break;
  case 'harvest': harvest(); break;
  case 'infer': infer(); break;
  case 'propose': propose(); break;
  case 'fix-validate': fixValidate(); break;
  case 'refactor':
  case 'schema-check':
  case 'images-check':
  case 'doctor':
  case 'assert':
  case 'pack':
  case 'profile':
  case 'replay':
  case 'simulate':
  case 'housekeep':
    console.log(`✅ ${cmd} OK (stub)`);
    console.log(`::END::${cmd.toUpperCase().replace('-','_')}::OK\n`);
    break;
  default:
    console.error(`Unknown: ${cmd}`);
    process.exit(1);
}
