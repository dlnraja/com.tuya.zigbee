#!/usr/bin/env node
'use strict';

/**
 * tools/ci/build-z2m-cache.js  v1.0.0
 *
 * P64.11 — Auto-build z2m_herdsman_cache.json from Koenkk/zigbee-herdsman-converters.
 *
 * This caches the full 1.3MB device definition file ONCE so device-investigator.js
 * and cross-ref-mfs.js don't re-fetch on every run.
 *
 * Usage:
 *   node tools/ci/build-z2m-cache.js                 # build cache (refresh if > 24h old)
 *   node tools/ci/build-z2m-cache.js --force        # always re-fetch
 *   node tools/ci/build-z2m-cache.js --check        # only check freshness, exit 0/1
 *   node tools/ci/build-z2m-cache.js --out <file>   # custom output path
 *
 * Output: data/z2m_herdsman_cache.json — JSON object with:
 *   - _meta: { fetched, source, version }
 *   - vendors: { vendorName: { file, mfrs: [...], count } }
 *   - devices: [ { vendor, model, zigbeeModel, mfrs: [], fingerprintMfrs: [],
 *                   exposes: [], dps: [], clusters: [], block, line } ]
 *   - byMfr: { _TZE200_xxx: [deviceIdx, ...] }   (index for fast lookup)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'z2m_herdsman_cache.json');
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

const args = process.argv.slice(2);
const opts = { force: false, check: false };
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--force') opts.force = true;
  else if (args[i] === '--check') opts.check = true;
  else if (args[i] === '--out') opts.out = args[++i];
}
const outputPath = opts.out || OUT;

function fetchText(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mavis-Investigator/2.0 (caching)' },
      timeout,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location, timeout).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let len = 0;
      const chunks = [];
      res.on('data', d => {
        len += d.length;
        if (len > 20 * 1024 * 1024) {
          req.destroy(new Error('too large'));
          return;
        }
        chunks.push(d);
      });
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function parseDevices(text) {
  const lines = text.split('\n');
  const devices = [];
  const byMfr = {};
  const vendors = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Find a device block start: { at indent 4 (inside export default [...])
    // Either preceded by }, or ], or at file start
    if (line.trim() === '{' && (i === 0 || /[},\]]\s*$/.test(lines[i - 1]))) {
      // Find the matching closing brace
      let depth = 1, end = i;
      for (let k = i + 1; k < lines.length; k++) {
        for (const ch of lines[k]) {
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) { end = k; break; }
          }
        }
        if (depth === 0) break;
      }
      const block = lines.slice(i, end + 1).join('\n');

      // Extract fields
      const modelMatch = block.match(/^\s*model\s*:\s*['"`]([^'"`]+)['"`]/m);
      const vendorMatch = block.match(/^\s*vendor\s*:\s*['"`]([^'"`]+)['"`]/m);
      const descMatch = block.match(/^\s*description\s*:\s*['"`]([^'"`]+)['"`]/m);
      if (!modelMatch || !vendorMatch) { i = end + 1; continue; }

      const vendor = vendorMatch[1];
      const model = modelMatch[1];
      const description = descMatch ? descMatch[1] : '';

      // zigbeeModel
      const zmMatch = block.match(/zigbeeModel\s*:\s*\[([^\]]+)\]/);
      const zigbeeModels = zmMatch
        ? zmMatch[1].match(/['"`]([^'"`]+)['"`]/g)?.map(x => x.replace(/['"`]/g, '')) || []
        : [];

      // fingerprint mfrs: tuya.fingerprint("TS0601", ["mfr1", "mfr2", ...])
      const fpMfrs = [];
      const fpModelIds = [];
      const fpRe = /tuya\.fingerprint\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\[([^\]]+)\]/g;
      let fm;
      while ((fm = fpRe.exec(block)) !== null) {
        const modelId = fm[1];
        if (!fpModelIds.includes(modelId)) fpModelIds.push(modelId);
        const mfrs = fm[2].match(/['"`]([^'"`]+)['"`]/g) || [];
        mfrs.forEach(m => fpMfrs.push(m.replace(/['"`]/g, '')));
      }
      // plain fingerprint: [{modelID, manufacturerName}]
      const plainFpRe = /fingerprint\s*:\s*\[?\s*\{[^}]*manufacturerName\s*:\s*['"`]([^'"`]+)['"`]/g;
      let pfm;
      while ((pfm = plainFpRe.exec(block)) !== null) {
        if (!fpMfrs.includes(pfm[1])) fpMfrs.push(pfm[1]);
      }
      // plain fingerprint modelID
      const plainModelIdRe = /fingerprint\s*:\s*\[?\s*\{[^}]*modelID\s*:\s*['"`]([^'"`]+)['"`]/g;
      let pmid;
      while ((pmid = plainModelIdRe.exec(block)) !== null) {
        if (!fpModelIds.includes(pmid[1])) fpModelIds.push(pmid[1]);
      }
      // plain manufacturerName
      const plainMfrRe = /manufacturerName\s*:\s*['"`]([^'"`]+)['"`]/g;
      let pm;
      while ((pm = plainMfrRe.exec(block)) !== null) {
        if (!fpMfrs.includes(pm[1])) fpMfrs.push(pm[1]);
      }

      // exposes (e.presence(), e.numeric('foo', ...), e.binary('bar', ...), etc.)
      const exposes = [];
      const exposesStart = block.indexOf('exposes:');
      if (exposesStart >= 0) {
        let d = 0, started = false, ee = exposesStart;
        for (let k = exposesStart; k < block.length; k++) {
          const ch = block[k];
          if (ch === '[') { d++; started = true; }
          else if (ch === ']') { d--; if (started && d === 0) { ee = k; break; } }
        }
        const eb = block.slice(exposesStart, ee + 1);
        // e.X(...) where X = presence, battery, etc.
        const re1 = /\be\.([a-z_]+)\s*\(/g;
        let m1;
        while ((m1 = re1.exec(eb)) !== null) {
          if (!exposes.includes(m1[1])) exposes.push(m1[1]);
        }
        // e.numeric("name",...), e.binary("name",...)
        const re2 = /\be\.(?:numeric|binary|enum|composite|text|list)\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
        let m2;
        while ((m2 = re2.exec(eb)) !== null) {
          if (!exposes.includes(m2[1])) exposes.push(m2[1]);
        }
      }

      // tuyaDatapoints: [[id, "name", converter], ...]
      const dps = [];
      const dpBlockRe = /tuyaDatapoints\s*:\s*\[([\s\S]*?)\n\s*\],?\s*\n\s*\}/;
      const dpBlock = block.match(dpBlockRe);
      if (dpBlock) {
        const re = /\[\s*(\d{1,3})\s*,\s*['"`]([^'"`]+)['"`]/g;
        let m;
        while ((m = re.exec(dpBlock[1])) !== null) {
          const id = +m[1], name = m[2];
          if (!dps.find(d => d.id === id)) dps.push({ id, name });
        }
      }
      // Also any [id, "name", ...] pattern in the block (covers fromZigbee converters)
      const reGeneric = /\[\s*(\d{1,3})\s*,\s*['"`]([^'"`]+)['"`]\s*,\s*[a-zA-Z]/g;
      let gm;
      while ((gm = reGeneric.exec(block)) !== null) {
        const id = +gm[1], name = gm[2];
        if (!dps.find(d => d.id === id)) dps.push({ id, name, source: 'fromZigbee' });
      }

      // Clusters
      const clusters = [];
      const clRe = /clusters?\[['"]?(\d{1,5})['"]?\]/g;
      let cm;
      while ((cm = clRe.exec(block)) !== null) clusters.push(+cm[1]);

      // whiteLabel
      const whiteLabels = [];
      const wlRe = /whiteLabel\s*:\s*\[([\s\S]*?)\n\s*\]/;
      const wlMatch = block.match(wlRe);
      if (wlMatch) {
        const itemRe = /model\s*:\s*['"`]([^'"`]+)['"`][\s\S]*?vendor\s*:\s*['"`]([^'"`]+)['"`]/g;
        let wm;
        while ((wm = itemRe.exec(wlMatch[1])) !== null) {
          whiteLabels.push({ model: wm[1], vendor: wm[2] });
        }
      }

      const deviceIdx = devices.length;
      devices.push({
        line: i + 1,
        vendor, model, description, zigbeeModels,
        mfrs: fpMfrs,
        modelIds: fpModelIds,
        exposes, dps, clusters, whiteLabels,
        blockLen: block.length,
      });

      // Build byMfr index
      for (const mfr of fpMfrs) {
        if (!byMfr[mfr]) byMfr[mfr] = [];
        byMfr[mfr].push(deviceIdx);
      }
      if (!vendors[vendor]) vendors[vendor] = { count: 0, mfrs: new Set() };
      vendors[vendor].count++;
      for (const m of fpMfrs) vendors[vendor].mfrs.add(m);

      i = end + 1;
    } else {
      i++;
    }
  }
  // Convert Sets to arrays
  for (const v of Object.values(vendors)) {
    v.mfrs = [...v.mfrs];
  }
  return { devices, byMfr, vendors };
}

async function main() {
  // Check freshness
  if (!opts.force && fs.existsSync(outputPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      const fetched = new Date(existing._meta?.fetched).getTime();
      if (Date.now() - fetched < CACHE_MAX_AGE_MS) {
        if (opts.check) {
          console.log(`fresh: ${existing._meta.fetched} (${existing.devices?.length || 0} devices)`);
          process.exit(0);
        }
        console.log(`✓ cache fresh (${existing._meta.fetched}, ${existing.devices?.length || 0} devices, ${Object.keys(existing.byMfr || {}).length} mfrs). Use --force to refresh.`);
        return existing;
      }
    } catch (_) {}
  }
  if (opts.check) {
    console.log('stale or missing');
    process.exit(1);
  }

  console.log('Fetching Z2M herdsman-converters (tuya.ts + xiaomi.ts + main index)...');
  const urls = [
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/xiaomi.ts',
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/ikea.ts',
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/philips.ts',
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/schemas.ts',
  ];
  let allText = '';
  for (const u of urls) {
    try {
      const t = await fetchText(u);
      allText += `\n// === ${u} ===\n${t}\n`;
      console.log(`  ${u.split('/').pop()}: ${(t.length / 1024).toFixed(0)}KB`);
    } catch (e) {
      console.log(`  ${u.split('/').pop()}: ERROR ${e.message}`);
    }
  }
  console.log(`Total: ${(allText.length / 1024 / 1024).toFixed(2)}MB`);

  console.log('Parsing devices...');
  const { devices, byMfr, vendors } = parseDevices(allText);
  console.log(`  devices: ${devices.length}`);
  console.log(`  mfrs: ${Object.keys(byMfr).length}`);
  console.log(`  vendors: ${Object.keys(vendors).length}`);

  const cache = {
    _meta: {
      source: 'https://github.com/Koenkk/zigbee-herdsman-converters (multiple vendor files)',
      fetched: new Date().toISOString(),
      version: '1.0.0',
      deviceCount: devices.length,
      mfrCount: Object.keys(byMfr).length,
      vendorCount: Object.keys(vendors).length,
    },
    vendors,
    devices,
    byMfr,
  };

  fs.writeFileSync(outputPath, JSON.stringify(cache, null, 0)); // no pretty (large file)
  console.log(`✓ saved to ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(0)}KB)`);
  return cache;
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}
