'use strict';

/**
 * Layer pass audit: energy / buttons / flows (report-only by default).
 * Usage: node tools/ci/layer-pass-audit.js [--json]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const JSON_MODE = process.argv.includes('--json');

function walkDrivers() {
  const dir = path.join(ROOT, 'drivers');
  return fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'driver.compose.json')));
}

function auditEnergy() {
  const conflicts = [];
  const batteryPower = [];
  const linearBanned = [];
  for (const d of walkDrivers()) {
    const composePath = path.join(ROOT, 'drivers', d, 'driver.compose.json');
    const devicePath = path.join(ROOT, 'drivers', d, 'device.js');
    let j;
    try {
      j = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch {
      continue;
    }
    const caps = j.capabilities || [];
    const hasPower = caps.includes('measure_power') || caps.includes('meter_power');
    const hasApprox = !!(j.energy && j.energy.approximation);
    const hasBatt = !!(j.energy && j.energy.batteries);
    if (hasApprox && hasPower) conflicts.push(d);
    if (hasBatt && hasPower && !hasApprox) batteryPower.push(d);
    if (fs.existsSync(devicePath)) {
      const t = fs.readFileSync(devicePath, 'utf8');
      if (/\(voltage\s*-\s*2\.5\)\s*\/\s*0\.5/.test(t) || /\/\s*0\.5\s*\*\s*100/.test(t)) {
        linearBanned.push(d);
      }
    }
  }
  return { conflicts, batteryPowerNote: batteryPower, linearBannedFormulas: linearBanned };
}

function auditButtons() {
  const rawButton = [];
  const missingMark = [];
  for (const d of walkDrivers()) {
    const devicePath = path.join(ROOT, 'drivers', d, 'device.js');
    if (!fs.existsSync(devicePath)) continue;
    const t = fs.readFileSync(devicePath, 'utf8');
    if (/setCapabilityValue\(\s*['"]button/.test(t) && !/safeSetCapabilityValue|_safeSetCapability/.test(t)) {
      rawButton.push(d);
    }
    if (/VirtualButtonMixin/.test(t) && !/markAppCommand/.test(t) && /PhysicalButtonMixin/.test(t)) {
      // mixin stack present; mark may be in mixin only — OK
    }
  }
  // Mixins contract presence
  const vb = fs.readFileSync(path.join(ROOT, 'lib', 'mixins', 'VirtualButtonMixin.js'), 'utf8');
  const pb = fs.readFileSync(path.join(ROOT, 'lib', 'mixins', 'PhysicalButtonMixin.js'), 'utf8');
  return {
    rawButtonDrivers: rawButton,
    virtualHasSafe: /_safeSetCapability/.test(vb) && /markAppCommand/.test(vb),
    physicalHasMark: /markAppCommand\(/.test(pb),
  };
}

function auditFlows() {
  const badTitle = [];
  const missingIds = [];
  let cards = 0;
  for (const d of walkDrivers()) {
    const flowPath = path.join(ROOT, 'drivers', d, 'driver.flow.compose.json');
    if (!fs.existsSync(flowPath)) continue;
    let j;
    try {
      j = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
    } catch {
      continue;
    }
    for (const kind of ['triggers', 'conditions', 'actions']) {
      for (const card of j[kind] || []) {
        cards += 1;
        if (!card.id) missingIds.push({ d, kind });
        const tf = JSON.stringify(card.titleFormatted || '');
        if (tf.includes('[[device]]')) badTitle.push({ d, id: card.id, kind });
      }
    }
  }
  return { cards, badTitleFormatted: badTitle, missingIds };
}

function main() {
  const report = {
    timestamp: new Date().toISOString(),
    energy: auditEnergy(),
    buttons: auditButtons(),
    flows: auditFlows(),
  };
  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('ENERGY conflicts (approx+power):', report.energy.conflicts.length, report.energy.conflicts.slice(0, 10));
    console.log('ENERGY linear banned hits:', report.energy.linearBannedFormulas);
    console.log('ENERGY battery+power notes:', report.energy.batteryPowerNote.length);
    console.log('BUTTONS raw setters:', report.buttons.rawButtonDrivers);
    console.log('BUTTONS mixin contract:', {
      virtual: report.buttons.virtualHasSafe,
      physical: report.buttons.physicalHasMark,
    });
    console.log('FLOWS cards:', report.flows.cards, 'bad [[device]]:', report.flows.badTitleFormatted.length);
    if (report.flows.badTitleFormatted.length) {
      console.log(report.flows.badTitleFormatted.slice(0, 15));
    }
  }
  const fail =
    report.energy.conflicts.length +
    report.energy.linearBannedFormulas.length +
    report.buttons.rawButtonDrivers.length +
    report.flows.badTitleFormatted.length;
  process.exit(fail ? 1 : 0);
}

main();
