#!/usr/bin/env node
'use strict';

'use strict';

const fs = require('fs');
const path = require('path');

function safeReadJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } }

function listJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(n => n.toLowerCase().endsWith('.json'))
    .map(n => path.join(dir, n))
    .sort((a,b)=> (fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs));
}

function loadReferenceVendors(root) {
  const refs = new Set();
  const dirs = [
    path.join(root, 'scripts', 'sources', 'external', 'reports'),
    path.join(root, 'scripts', 'sources', 'reports'),
    path.join(root, 'scripts', 'sources', 'parsers', 'reports'),
  ];
  for (const d of dirs) {
    for (const f of listJson(d).slice(0, 5)) {
      const data = safeReadJSON(f);
      if (!data) continue;
      const text = JSON.stringify(data).toLowerCase();
      // Extraire quelques vendors fréquents
      ['tuya','aqara','lumi','ikea','tradfri','philips','signify','hue','sonoff','itead','ledvance','osram','lellki','moes','zemismart','sls','athom','neo','frient','bosch','linkind','leven'].forEach(v=>{
        if (text.includes(v)) refs.add(v);
      });
    }
  }
  return Array.from(refs);
}

function slug(value) {
  return String(value||'').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/-{2,}/g,'-').replace(/^-+|-+$/g,'');
}

function pick(arrayLike) {
  if (!arrayLike) return null; const a = Array.isArray(arrayLike) ? arrayLike : [arrayLike];
  return a.find(Boolean) || null;
}

function deriveCategoryFromCapabilities(obj) {
  const caps = Array.isArray(obj?.capabilities) ? obj.capabilities : [];
  const has = (c)=> caps.includes(c);
  if (has('windowcoverings_set')) return 'cover';
  if (has('locked')) return 'lock';
  if (has('alarm_siren')) return 'siren';
  if (has('target_temperature') || has('measure_temperature')) return 'climate-thermostat';
  if (has('onoff') && has('dim')) return 'light';
  if (has('onoff') && !has('dim')) return 'plug';
  if (has('alarm_motion')) return 'sensor-motion';
  if (has('alarm_contact')) return 'sensor-contact';
  if (has('measure_luminance')) return 'sensor-lux';
  if (has('measure_humidity')) return 'sensor-humidity';
  if (has('alarm_smoke')) return 'sensor-smoke';
  if (has('alarm_water')) return 'sensor-leak';
  if (has('measure_power') || has('meter_power')) return 'meter-power';
  return 'switch';
}

function deriveVendorFromManufacturer(manu, knownVendors) {
  const m = String(manu||'').toLowerCase();
  if (/tuya|^_tz|^_ty/.test(m)) return 'tuya';
  if (/aqara|lumi/.test(m)) return 'aqara';
  if (/ikea|tradfri/.test(m)) return 'ikea';
  if (/philips|signify|hue/.test(m)) return 'philips';
  if (/sonoff|itead/.test(m)) return 'sonoff';
  if (/ledvance|osram/.test(m)) return 'ledvance';
  for (const v of knownVendors || []) { if (m.includes(v)) return v; }
  return m || 'generic';
}

function deriveDomain(manu) {
  const m = String(manu||'').toLowerCase();
  return (/tuya|^_tz|^_ty/.test(m) ? 'tuya' : 'zigbee');
}

function classify(composeObj, driverDir, repoRoot = process.cwd()) {
  const z = composeObj?.zigbee || {};
  const manufacturerName = pick(z.manufacturerName || composeObj?.manufacturerName);
  const modelId = pick(z.modelId || composeObj?.modelId || composeObj?.productId) || path.basename(driverDir);

  const knownVendors = loadReferenceVendors(repoRoot);

  const domain = deriveDomain(manufacturerName);
  const vendor = slug(deriveVendorFromManufacturer(manufacturerName, knownVendors));
  const category = slug(deriveCategoryFromCapabilities(composeObj));
  const model = slug(String(modelId).replace(/^0x/i, ''));

  return { domain, category, vendor, model };
}

module.exports = { classify };


