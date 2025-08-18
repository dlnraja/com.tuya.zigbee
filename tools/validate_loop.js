const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'pipe', shell: false, ...opts });
  return {
    code: res.status ?? 0,
    stdout: res.stdout?.toString() || '',
    stderr: res.stderr?.toString() || '',
  };
}

function logStep(title, details) {
  const logPath = path.join(process.cwd(), 'INTEGRATION_LOG.md');
  const now = new Date().toISOString();
  const block = `\n\n[${now}] ${title}\n\n${details}\n`;
  fs.appendFileSync(logPath, block, 'utf8');
}

function fixRootCompose() {
  const file = path.join('.homeycompose', 'app.json');
  if (!fs.existsSync(file)) return false;
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = false;
  if (!json.name) { json.name = 'Tuya Zigbee Drivers'; changed = true; }
  if (!json.author) { json.author = 'dlnraja'; changed = true; }
  if (!json.compatibility) { json.compatibility = '>=3.0.0'; changed = true; }
  if (changed) fs.writeFileSync(file, JSON.stringify(json, null, 2));
  return changed;
}

function normalizeDriverCompose(driverFile) {
  const raw = fs.readFileSync(driverFile, 'utf8');
  const json = JSON.parse(raw);
  let changed = false;
  const clusterNameToId = {
    genBasic: 0x0000,
    genPowerCfg: 0x0001,
    genDeviceTempCfg: 0x0002,
    genIdentify: 0x0003,
    genGroups: 0x0004,
    genScenes: 0x0005,
    genOnOff: 0x0006,
    genLevelCtrl: 0x0008,
    lightingColorCtrl: 0x0300,
  };
  if (json && json.zigbee) {
    // productId must be string
    if (Array.isArray(json.zigbee.productId)) {
      json.zigbee.productId = json.zigbee.productId[0] || 'GENERIC';
      changed = true;
    }
    // endpoints must exist
    if (!json.zigbee.endpoints) {
      json.zigbee.endpoints = {
        '1': {
          clusters: ['genBasic', 'genOnOff'],
          bindings: [6],
        },
      };
      changed = true;
    }
    // clusters format must be array, not object with input/output
    const ep1 = json.zigbee.endpoints['1'];
    if (ep1 && ep1.clusters && !Array.isArray(ep1.clusters)) {
      const input = ep1.clusters.input || [];
      const output = ep1.clusters.output || [];
      ep1.clusters = Array.from(new Set([...(input || []), ...(output || [])]));
      changed = true;
    }
    if (ep1 && Array.isArray(ep1.clusters)) {
      const before = JSON.stringify(ep1.clusters);
      ep1.clusters = ep1.clusters.map((c) => {
        if (typeof c === 'number') return c;
        if (typeof c === 'string') {
          const key = c.trim();
          if (key in clusterNameToId) return clusterNameToId[key];
          const numeric = Number(key);
          if (!Number.isNaN(numeric)) return numeric;
        }
        return c;
      });
      if (before !== JSON.stringify(ep1.clusters)) changed = true;
    }
    // bindings numbers
    if (ep1 && Array.isArray(ep1.bindings)) {
      const mapClusterNameToId = (name) => (name === 'genOnOff' ? 6 : name);
      if (typeof ep1.bindings[0] === 'string') {
        ep1.bindings = ep1.bindings.map(mapClusterNameToId);
        changed = true;
      }
    }
  }
  if (json && !json.class) { json.class = 'other'; changed = true; }
  if (changed) fs.writeFileSync(driverFile, JSON.stringify(json, null, 2));
  return changed;
}

function fixDrivers() {
  const driversDir = path.join(process.cwd(), 'drivers');
  if (!fs.existsSync(driversDir)) return false;
  let changedAny = false;
  const queue = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) walk(p);
      else if (entry === 'driver.compose.json') queue.push(p);
    }
  }
  walk(driversDir);
  for (const file of queue) {
    try {
      const changed = normalizeDriverCompose(file);
      if (changed) changedAny = true;
    } catch (e) {
      logStep('Driver compose parse error', `File: ${file}\nError: ${e.message}`);
    }
  }
  return changedAny;
}

function main() {
  logStep('Validate Loop Start', 'Ensure compose integrity, then validate');
  let iterations = 0;
  while (iterations < 10) {
    iterations += 1;
    let changed = false;
    if (fixRootCompose()) changed = true;
    if (fixDrivers()) changed = true;

    const res = run('npx', ['homey', 'app', 'validate', '-l', 'debug']);
    logStep('Validation Run', `code=${res.code}\nstdout=\n${res.stdout}\n\nstderr=\n${res.stderr}`);
    if (res.code === 0) {
      logStep('Validation Success', 'Homey validation passed at debug level.');
      process.exit(0);
    }

    // If no changes were made this round and still failing, try one more time, then exit 1
    if (!changed) {
      logStep('No more fixes', 'Validation still failing and no automatic fixes left.');
      process.exit(1);
    }
  }
  logStep('Max iterations reached', 'Stopping after 10 attempts.');
  process.exit(1);
}

main();


