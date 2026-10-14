'use strict';

/**
 * P2820 — Z2M + ZHA quirks + protocol_quirk_table couple-aware audit (same depth as P2819 Blakadder)
 * WHY: mfr-only coverage hides wrong-class placements across herdsman / zha-device-handlers.
 * Contre quoi: RGB on wall dimmer, wall switch on wireless button, plug on switch-only, cover on contact.
 *
 * Usage: node tools/ci/p2820-z2m-zha-quirks-couple-audit.js [--fetch-zha]
 * Outputs: reports/z2m-zha-quirks-deep-YYYY-MM-DD/{COUPLE_AUDIT.json,ACTIONABLE.md}
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const DAY = new Date().toISOString().slice(0, 10);
const OUT = path.join(ROOT, 'reports', `z2m-zha-quirks-deep-${DAY}`);
const ZHA_DIR = path.join(ROOT, '.github', 'state', 'zha', 'quirks');
const FETCH_ZHA = process.argv.includes('--fetch-zha');

function load(p, fb) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function norm(s) {
  return String(s || '')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function isTuyaMfr(m) {
  return /^(_tz[a-z0-9]*_[a-z0-9]+|_tyst1[12]_[a-z0-9]+|tuyatec)/i.test(String(m || ''));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'mavis-ci-p2820' };
    const tok = process.env.GH_PAT || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (tok) headers.Authorization = `token ${tok}`;
    https
      .get(url, { headers }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpGet(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return resolve(null);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });
}

function guessCatFromText(text, exposes = []) {
  const s = `${text} ${(exposes || []).join(' ')}`.toLowerCase();
  // Order matters — avoid valve→hvac and controller→cover false positives
  if (/garage.?door/.test(s)) return 'cover';
  if (/curtain|blind|shutter|roller.?shade|window.?covering|tubular.?motor|cover.?motor/.test(s)) {
    return 'cover';
  }
  if (/rgb|color.?temp|led strip|smart.?led.?bulb|ts0505|ts0503/.test(s)) return 'bulb';
  if (/soil.?sensor|soil moisture/.test(s)) return 'sensor';
  if (/presence|radar|mmwave|occupancy/.test(s)) return 'sensor';
  if (/water.?leak|flood/.test(s)) return 'sensor';
  if (/thermostat|trv|radiator.?valve|heater/.test(s) && !/water.?valve|gas.?valve|irrigation/.test(s)) {
    return 'hvac';
  }
  if (/water.?valve|irrigation|gas.?valve/.test(s)) return 'valve';
  // Do not classify metering wall switches as plugs
  if (/switch with power|din.?rail.?switch|din smart relay/.test(s) && !/outlet|socket|plug/.test(s)) {
    return 'switch';
  }
  if (/plug|socket|outlet|power.?strip/.test(s)) return 'plug';
  if (/smoke/.test(s)) return 'smoke';
  if (/gas.?sensor|gas detector/.test(s)) return 'gas';
  if (/motion|pir/.test(s) && !/switch/.test(s)) return 'sensor';
  if (/contact|door.?sensor|window.?sensor/.test(s)) return 'sensor';
  if (/wall.?switch|switch module|gang.?switch|relay.?module/.test(s)) return 'switch';
  if (/button|remote|scene.?switch|knob|wireless.?switch/.test(s) && !/wall.?switch/.test(s)) {
    return 'remote';
  }
  if (/dimmer|brightness/.test(s) && /light|lamp/.test(s)) return 'light';
  if (/light|lamp|led/.test(s) && !/controller/.test(s)) return 'light';
  if (/meter|energy|din|breaker|rcbo/.test(s)) return 'plug';
  if ((exposes || []).some((e) => /color_xy|color_temp/.test(String(e)))) return 'bulb';
  if ((exposes || []).some((e) => /cover|curtain/.test(String(e)))) return 'cover';
  if ((exposes || []).some((e) => /climate|thermostat/.test(String(e)))) return 'hvac';
  return '';
}

function isSevereMismatch(cat, drivers) {
  const c = String(cat || '').toLowerCase();
  const ds = drivers.map((d) => d.toLowerCase());
  if (!ds.length) return null;
  if (/^(bulb|light)$/.test(c) && ds.every((d) => /dimmer_wall/.test(d))) return 'rgb_bulb_on_wall_dimmer';
  if (/^switch$/.test(c) && ds.every((d) => /button_wireless/.test(d))) return 'wall_switch_on_wireless_button';
  if (
    /^plug$/.test(c) &&
    ds.every((d) => /^switch_/.test(d)) &&
    !ds.some((d) => /plug|outlet|socket|energy|meter|din|rcbo/.test(d))
  ) {
    return 'plug_on_switch_only';
  }
  if (/smoke|gas/.test(c) && ds.some((d) => /radiator|trv|device_radiator/.test(d))) return 'smoke_on_radiator';
  if (/^cover$/.test(c) && !ds.some((d) => /curtain|cover|blind|shutter|roller|garage/.test(d))) {
    return 'cover_wrong_driver';
  }
  if (/^hvac$/.test(c) && ds.every((d) => /button_wireless|plug_smart/.test(d))) {
    return 'trv_wrong_driver';
  }
  if (
    /^sensor$/.test(c) &&
    ds.every((d) => /switch_wireless|plug_smart|dimmer_wall|button_wireless/.test(d)) &&
    !ds.some((d) => /sensor|soil|climate|presence|leak|contact/.test(d))
  ) {
    return 'sensor_on_actuator';
  }
  if (/^valve$/.test(c) && ds.every((d) => /button_wireless/.test(d))) return 'valve_on_wireless_button';
  return null;
}

function buildDriverIndex() {
  const coupleToDrivers = new Map();
  const mfrToDrivers = new Map();
  const driversDir = path.join(ROOT, 'drivers');
  for (const folder of fs.readdirSync(driversDir)) {
    const fp = path.join(driversDir, folder, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    const dc = load(fp, null);
    if (!dc?.zigbee) continue;
    const mfrs = [].concat(dc.zigbee.manufacturerName || []).map(String);
    const pids = [].concat(dc.zigbee.productId || []).map(String);
    for (const m of mfrs) {
      const mk = norm(m);
      if (!mk) continue;
      if (!mfrToDrivers.has(mk)) mfrToDrivers.set(mk, []);
      if (!mfrToDrivers.get(mk).includes(folder)) mfrToDrivers.get(mk).push(folder);
      for (const p of pids) {
        const key = `${mk}|${String(p).toUpperCase()}`;
        if (!coupleToDrivers.has(key)) coupleToDrivers.set(key, []);
        if (!coupleToDrivers.get(key).includes(folder)) coupleToDrivers.get(key).push(folder);
      }
    }
  }
  return { coupleToDrivers, mfrToDrivers };
}

/** Parse herdsman tuya.ts fingerprints into couples */
function parseTuyaTs(src) {
  const couples = [];
  if (!src) return couples;
  const fpRe = /fingerprint:\s*tuya\.fingerprint\(['"]([^'"]+)['"]\s*,\s*\[([\s\S]*?)\]\)/g;
  let m;
  while ((m = fpRe.exec(src))) {
    const pid = m[1];
    const mfrs = [...m[2].matchAll(/['"](_T[^'"]+)['"]/g)].map((x) => x[1]);
    // description nearby — soft
    const around = src.slice(Math.max(0, m.index - 400), m.index + 200);
    const desc = (around.match(/description:\s*['"]([^'"]+)['"]/) || [])[1] || '';
    const model = (around.match(/model:\s*['"]([^'"]+)['"]/) || [])[1] || '';
    for (const mfr of mfrs) {
      couples.push({
        mfr,
        pid,
        source: 'z2m_tuya_ts',
        description: desc,
        model,
        category: guessCatFromText(`${desc} ${model}`),
      });
    }
  }
  const objRe = /\{\s*modelID:\s*['"]([^'"]+)['"]\s*,\s*manufacturerName:\s*['"]([^'"]+)['"]\s*\}/g;
  while ((m = objRe.exec(src))) {
    couples.push({
      mfr: m[2],
      pid: m[1],
      source: 'z2m_tuya_ts_obj',
      description: '',
      category: '',
    });
  }
  return couples;
}

function parseZhaQuirk(content, file) {
  const pairs = [];
  if (!content) return pairs;
  const miRegex = /MODELS_INFO\s*[:=]\s*\[([\s\S]*?)\]/g;
  let m;
  while ((m = miRegex.exec(content))) {
    const block = m[1];
    const tupleRegex = /\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
    let t;
    while ((t = tupleRegex.exec(block))) {
      pairs.push({ mfr: t[1], pid: t[2], source: `zha:${file}` });
    }
  }
  const sigMfr = content.match(/["']manufacturer["']\s*:\s*["']([^"']+)["']/);
  const sigModel = content.match(/["']model["']\s*:\s*["']([^"']+)["']/);
  if (sigMfr && sigModel && isTuyaMfr(sigMfr[1])) {
    pairs.push({ mfr: sigMfr[1], pid: sigModel[1], source: `zha_sig:${file}` });
  }
  // class name / docstring category hints
  const head = content.slice(0, 800);
  const cat = guessCatFromText(`${file} ${head}`);
  for (const p of pairs) p.category = cat;
  return pairs;
}

async function fetchZhaTuyaQuirks() {
  fs.mkdirSync(ZHA_DIR, { recursive: true });
  const branches = ['dev', 'master'];
  let listing = null;
  let branch = 'dev';
  for (const b of branches) {
    const body = await httpGet(
      `https://api.github.com/repos/zigpy/zha-device-handlers/contents/zhaquirks/tuya?ref=${b}`
    );
    if (!body) continue;
    try {
      listing = JSON.parse(body);
      branch = b;
      break;
    } catch {
      /* continue */
    }
  }
  if (!Array.isArray(listing)) {
    console.warn('[P2820] ZHA listing failed — using local quirks only');
    return [];
  }
  fs.writeFileSync(
    path.join(ROOT, '.github', 'state', 'zha', 'tuya-dir-live.json'),
    JSON.stringify(listing, null, 2)
  );
  const pyFiles = listing.filter((f) => f.name?.endsWith('.py') && f.download_url);
  console.log(`[P2820] ZHA tuya quirks: ${pyFiles.length} files (branch ${branch})`);
  const couples = [];
  for (let i = 0; i < pyFiles.length; i += 8) {
    const batch = pyFiles.slice(i, i + 8);
    const texts = await Promise.all(
      batch.map(async (f) => {
        const local = path.join(ZHA_DIR, f.name);
        let txt = null;
        if (fs.existsSync(local) && !FETCH_ZHA) {
          txt = fs.readFileSync(local, 'utf8');
        } else {
          txt = await httpGet(f.download_url);
          if (txt) fs.writeFileSync(local, txt);
        }
        return { name: f.name, txt };
      })
    );
    for (const { name, txt } of texts) {
      for (const p of parseZhaQuirk(txt, name)) {
        if (isTuyaMfr(p.mfr)) couples.push(p);
      }
    }
    process.stdout.write(`\r[P2820] ZHA parse ${Math.min(i + 8, pyFiles.length)}/${pyFiles.length}`);
  }
  console.log('');
  return couples;
}

function fromZ2mCache() {
  const cache = load(path.join(ROOT, 'data', 'z2m_herdsman_cache.json'), { devices: [] });
  const out = [];
  for (const d of cache.devices || []) {
    const mfrs = d.mfrs || [];
    const pids = d.modelIds || [];
    const cat = guessCatFromText(`${d.description || ''} ${d.model || ''} ${d.vendor || ''}`, d.exposes || []);
    for (const mfr of mfrs) {
      if (!isTuyaMfr(mfr)) continue;
      for (const pid of pids.length ? pids : [null]) {
        if (!pid || !/^TS|^ZG|^ZB|^S/i.test(String(pid))) continue; // skip retail-only when no zigbee pid
        out.push({
          mfr,
          pid: String(pid),
          source: 'z2m_cache',
          description: d.description || '',
          model: d.model || '',
          vendor: d.vendor || '',
          exposes: d.exposes || [],
          category: cat,
        });
      }
    }
  }
  return out;
}

function fromProtocolQuirkTable() {
  const table = load(path.join(ROOT, 'data', 'protocol_quirk_table.json'), {});
  const out = [];
  for (const [mfr, info] of Object.entries(table.mfrQuirks || {})) {
    if (!isTuyaMfr(mfr)) continue;
    out.push({
      mfr,
      pid: info.model || 'TS0601',
      source: 'protocol_quirk_table',
      category: '',
      description: (info.flags || []).join(','),
    });
  }
  return out;
}

function fromLocalZhaCache() {
  if (!fs.existsSync(ZHA_DIR)) return [];
  const out = [];
  for (const f of fs.readdirSync(ZHA_DIR).filter((x) => x.endsWith('.py'))) {
    const txt = fs.readFileSync(path.join(ZHA_DIR, f), 'utf8');
    for (const p of parseZhaQuirk(txt, f)) {
      if (isTuyaMfr(p.mfr)) out.push(p);
    }
  }
  return out;
}

function dedupeCouples(list) {
  const map = new Map();
  for (const row of list) {
    const mfr = norm(row.mfr);
    const pid = String(row.pid || '').toUpperCase().trim();
    if (!mfr || !pid) continue;
    const key = `${mfr}|${pid}`;
    if (!map.has(key)) {
      map.set(key, {
        mfr: row.mfr,
        mfrNorm: mfr,
        pid,
        sources: new Set([row.source]),
        category: row.category || '',
        description: row.description || '',
        model: row.model || '',
        vendor: row.vendor || '',
        exposes: row.exposes || [],
      });
    } else {
      const cur = map.get(key);
      cur.sources.add(row.source);
      if (!cur.category && row.category) cur.category = row.category;
      if (!cur.description && row.description) cur.description = row.description;
      if (row.exposes?.length) cur.exposes = [...new Set([...(cur.exposes || []), ...row.exposes])];
      if (!cur.category) cur.category = guessCatFromText(`${cur.description} ${cur.model}`, cur.exposes);
    }
  }
  return [...map.values()].map((r) => ({
    ...r,
    sources: [...r.sources],
  }));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { coupleToDrivers, mfrToDrivers } = buildDriverIndex();

  const tuyaTsPath = path.join(ROOT, '.github', 'state', 'z2m', 'tuya.ts');
  const tuyaTs = fs.existsSync(tuyaTsPath) ? fs.readFileSync(tuyaTsPath, 'utf8') : '';

  let zhaCouples = fromLocalZhaCache();
  if (FETCH_ZHA || !zhaCouples.length) {
    zhaCouples = await fetchZhaTuyaQuirks();
  }

  const raw = [
    ...fromZ2mCache(),
    ...parseTuyaTs(tuyaTs),
    ...zhaCouples,
    ...fromProtocolQuirkTable(),
  ];
  const couples = dedupeCouples(raw);

  let exact = 0;
  let mfrOnly = 0;
  let missing = 0;
  const missingList = [];
  const mfrOnlyList = [];
  const classMismatch = [];
  const severe = [];

  for (const c of couples) {
    const key = `${c.mfrNorm}|${c.pid}`;
    const exactDrivers = coupleToDrivers.get(key) || [];
    if (exactDrivers.length) {
      exact++;
      const cat = c.category || guessCatFromText(`${c.description} ${c.model}`, c.exposes);
      const sev = isSevereMismatch(cat, exactDrivers);
      if (sev) {
        severe.push({
          mfr: c.mfr,
          mfrNorm: c.mfrNorm,
          pid: c.pid,
          category: cat,
          drivers: exactDrivers,
          reason: sev,
          sources: c.sources,
          description: c.description,
        });
      } else if (cat) {
        // soft heuristic mismatch for ACTIONABLE only
        const ok =
          (/bulb|light/.test(cat) && exactDrivers.some((d) => /light|bulb|led|dimmer/.test(d))) ||
          (/switch/.test(cat) && exactDrivers.some((d) => /switch|gang|relay/.test(d))) ||
          (/plug/.test(cat) && exactDrivers.some((d) => /plug|outlet|socket|meter|energy|din/.test(d))) ||
          (/cover/.test(cat) && exactDrivers.some((d) => /curtain|cover|blind|garage|shutter/.test(d))) ||
          (/hvac/.test(cat) && exactDrivers.some((d) => /thermostat|radiator|valve|trv|heater/.test(d))) ||
          (/sensor|remote|smoke|gas/.test(cat));
        if (!ok) {
          classMismatch.push({
            mfr: c.mfr,
            pid: c.pid,
            category: cat,
            drivers: exactDrivers,
            sources: c.sources,
          });
        }
      }
      continue;
    }
    const mfrDrivers = mfrToDrivers.get(c.mfrNorm) || [];
    if (mfrDrivers.length) {
      mfrOnly++;
      mfrOnlyList.push({
        mfr: c.mfr,
        pid: c.pid,
        drivers: mfrDrivers,
        sources: c.sources,
        category: c.category,
        description: c.description,
      });
    } else {
      missing++;
      missingList.push({
        mfr: c.mfr,
        pid: c.pid,
        sources: c.sources,
        category: c.category,
        description: c.description,
        model: c.model,
      });
    }
  }

  // Targets of interest
  const targets = {
    gnpflcoq: couples.filter((c) => c.mfrNorm.includes('gnpflcoq')),
    fl8cuafl: couples.filter((c) => c.mfrNorm.includes('fl8cuafl')),
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    sources: {
      z2mCacheDevices: (load(path.join(ROOT, 'data', 'z2m_herdsman_cache.json'), {}).devices || []).length,
      z2mTuyaTsBytes: tuyaTs.length,
      zhaQuirkFiles: fs.existsSync(ZHA_DIR) ? fs.readdirSync(ZHA_DIR).filter((f) => f.endsWith('.py')).length : 0,
      protocolQuirkMfrs: Object.keys(load(path.join(ROOT, 'data', 'protocol_quirk_table.json'), {}).mfrQuirks || {}).length,
      uniqueSacredCouples: couples.length,
    },
    coverage: {
      exactCouple: exact,
      mfrOnlyPartial: mfrOnly,
      missingEntirely: missing,
      classMismatchHeuristic: classMismatch.length,
      severeMismatches: severe.length,
    },
    targets,
  };

  const report = {
    summary,
    severe,
    classMismatch: classMismatch.slice(0, 200),
    missingList: missingList.slice(0, 300),
    mfrOnlyWithPid: mfrOnlyList.slice(0, 200),
  };

  fs.writeFileSync(path.join(OUT, 'COUPLE_AUDIT.json'), JSON.stringify(report, null, 2));

  const md = [
    `# P2820 Z2M / ZHA / Quirks couple audit — ${DAY}`,
    '',
    `## Coverage`,
    `- Unique sacred couples audited: **${couples.length}**`,
    `- Exact couple in app: **${exact}**`,
    `- Mfr-only (pid gap): **${mfrOnly}**`,
    `- Missing entirely: **${missing}**`,
    `- Severe wrong-class: **${severe.length}**`,
    `- Soft class mismatch: **${classMismatch.length}**`,
    '',
    `## Sources`,
    `- Z2M herdsman cache devices: ${summary.sources.z2mCacheDevices}`,
    `- Z2M tuya.ts bytes: ${summary.sources.z2mTuyaTsBytes}`,
    `- ZHA quirk .py files: ${summary.sources.zhaQuirkFiles}`,
    `- protocol_quirk_table mfrs: ${summary.sources.protocolQuirkMfrs}`,
    '',
    `## Severe (actionable)`,
    ...severe.slice(0, 80).map(
      (s) =>
        `- \`${s.mfr}\`+\`${s.pid}\` → ${s.reason} (drivers: ${s.drivers.join(', ')}; src: ${s.sources.join('|')})`
    ),
    '',
    `## Missing sample (first 40)`,
    ...missingList
      .slice(0, 40)
      .map((m) => `- \`${m.mfr}\`+\`${m.pid}\` [${(m.sources || []).join('|')}] ${m.description || m.category || ''}`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'ACTIONABLE.md'), md);

  console.log(JSON.stringify(summary.coverage, null, 2));
  console.log(`[P2820] wrote ${OUT}`);
  if (severe.length) {
    console.log(`[P2820] SEVERE ${severe.length} — run p2820-apply-severe.js --apply`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
