#!/usr/bin/env node
/**
 * pre-push hook — Dual-Layer Anti-AggregateError Gate
 * Installé dans .git/hooks/pre-push via: npm run install:hooks
 *
 * BLOQUE le push si:
 *  - Un driver Zigbee a manufacturerName[] vide → AggregateError Athom
 *  - app.json JSON invalide
 *  - Version non synchronisée entre app.json et package.json
 *
 * EXEMPT:
 *  - Drivers WiFi/LAN (connectivity:lan) → pairing par IP, pas de MF requis
 *  - Drivers virtuels (ir_remote) → pas de hardware pairing
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const C = { R:'\x1b[0m', r:'\x1b[31m', g:'\x1b[32m', y:'\x1b[33m', b:'\x1b[34m', B:'\x1b[1m' };

console.log(C.B + C.b + '\n🔒 PRE-PUSH DUAL-LAYER GATE' + C.R);

// ── 1. Vérifier app.json lisible ────────────────────────────────────────────
let app;
try {
  app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json')));
} catch(e) {
  console.error(C.r + '❌ app.json invalide JSON: ' + e.message + C.R);
  process.exit(1);
}

// ── 2. Vérifier synchro version ─────────────────────────────────────────────
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json')));
  if (pkg.version !== app.version) {
    console.warn(C.y + '⚠️  Versions désynchronisées: app.json=' + app.version + ' package.json=' + pkg.version + C.R);
    console.warn(C.y + '   Correction auto...' + C.R);
    pkg.version = app.version;
    fs.writeFileSync(path.join(ROOT, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
    try { execSync('git add package.json', { cwd: ROOT }); } catch(e) {}
  }
} catch(e) { /* non-bloquant */ }

// ── 3. Dual-Layer Gate ───────────────────────────────────────────────────────
const WIFI = id => {
  const s = (id||'').toLowerCase();
  return s.startsWith('wifi_') || s.includes('ewelink') ||
         s.includes('sonoff')  || s.includes('radiator_wifi');
};

const drivers = app.drivers || [];
const errors  = [];
const stats   = { zigbee:0, wifi:0, hybrid:0, virtual:0, fp:0 };

drivers.forEach(d => {
  const conn  = d.connectivity || [];
  const hasZ  = !!d.zigbee;
  const isLan = conn.some(c => ['lan','cloud'].includes(c));
  const type  = hasZ&&isLan?'hybrid':hasZ?'zigbee':WIFI(d.id)?'wifi':'virtual';
  stats[type]++;
  if (d.zigbee?.manufacturerName) stats.fp += d.zigbee.manufacturerName.length;
  if ((type==='zigbee'||type==='hybrid') && !(d.zigbee?.manufacturerName?.length)) {
    errors.push('[' + type + '] ' + d.id);
  }
});

console.log('  v' + app.version + ' | Zigbee:' + stats.zigbee + ' WiFi:' + stats.wifi +
            ' Hybrid:' + stats.hybrid + ' Virtual:' + stats.virtual + ' FPs:' + stats.fp);

if (errors.length === 0) {
  console.log(C.g + '  ✅ Dual-Layer PASS — Zéro AggregateError' + C.R);
  process.exit(0);
} else {
  console.error(C.r + C.B + '\n  ❌ PUSH BLOQUÉ — AggregateError détecté sur ' + errors.length + ' drivers Zigbee:' + C.R);
  errors.forEach(e => console.error(C.r + '    ❌ ' + e + C.R));
  console.error(C.y + '\n  Fix: npm run master:fix' + C.R);
  console.error(C.y + '  Puis: git add app.json && git commit -m "fix: restore MFs" && git push' + C.R);
  process.exit(1);
}
