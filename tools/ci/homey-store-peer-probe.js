'use strict';
/**
 * P2657 — Homey Store peer probe (Zigbee / Tuya / SmartLife / WiFi / alts).
 * Uses apps-api.athom.com (public). Read-only. Never forum POST.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const OUT = path.join(
  __dirname,
  '..',
  '..',
  'reports',
  `homey-store-peers-${new Date().toISOString().slice(0, 10)}`,
);
const BASE = 'https://apps-api.athom.com/api/v1';

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 HomeyPeerProbe/P2657',
          Accept: 'application/json',
        },
      }, (res) => {
        let d = '';
        res.on('data', (c) => { d += c; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(d) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: d.slice(0, 500), error: String(e) });
          }
        });
      })
      .on('error', reject);
  });
}

async function probeApp(id) {
  const r = await get(`${BASE}/app/${id}`);
  if (r.status !== 200 || !r.json || !r.json.id) {
    return { appId: id, ok: false, status: r.status, error: r.json && r.json.error };
  }
  const j = r.json;
  const live = j.liveBuild || {};
  const test = j.testBuild || {};
  return {
    appId: j.id,
    ok: true,
    liveVersion: j.liveVersion || live.version || null,
    testVersion: j.testVersion || test.version || null,
    liveBuildId: live.id || null,
    testBuildId: test.id || null,
    name: (live.name && live.name.en) || (test.name && test.name.en) || j.id,
    author: (j.author && j.author.name) || null,
    private: !!j.private,
    category: live.category || test.category || null,
    homepage: live.homepage || test.homepage || null,
    support: live.support || test.support || null,
    source: live.source || test.source || null,
    bugs: live.bugs || test.bugs || null,
    rating: j.rating,
  };
}

async function search(q) {
  const r = await get(`${BASE}/app?search=${encodeURIComponent(q)}&limit=50`);
  const apps = Array.isArray(r.json) ? r.json : [];
  return apps.map((a) => ({
    id: a.id,
    name: (a.liveBuild && a.liveBuild.name && a.liveBuild.name.en)
      || (a.testBuild && a.testBuild.name && a.testBuild.name.en)
      || a.id,
    liveVersion: a.liveVersion || (a.liveBuild && a.liveBuild.version) || null,
    testVersion: a.testVersion || (a.testBuild && a.testBuild.version) || null,
  }));
}

/** Seed: Tuya/Zigbee/SmartLife/WiFi peers + brand forks + related Zigbee apps */
const SEED_IDS = [
  'com.tuya.zigbee',
  'com.tuyalocal',
  'com.tuya',
  'com.tuya2',
  'com.tuya.cloud',
  'com.dlnraja.tuya.zigbee',
  'com.dlnraja.tuya.zigbee.stable',
  'com.lidl',
  'com.philips.hue.zigbee',
  'nl.philips.hue',
  'com.ikea.tradfri',
  'com.xiaomi-mi',
  'com.sonoff',
  'com.ewelink',
  'nl.qluster-it.DeviceCapabilities',
  'com.athom.homeyduino',
  'com.arteco',
  'com.Meian.zigbee',
  'com.Idinio',
  'com.hejhome.iot',
  'com.frient',
  'com.DevelcoProducts',
  'com.oskarirauta.owon',
  'no.enertek.app',
  'com.hyundaiht.cloud',
  'com.ht.dlab',
  'com.szwest',
  'com.LSES861',
  'de.vevor.weatherstation',
  'nl.rebtor.tuya',
  'com.heszi.ledvance-wifi',
  'com.athombv.matter',
  'com.switchbot',
  'com.govee',
  'com.broadlink',
  'com.johanbendz.aqara',
  'com.innr',
  'com.osram',
  'com.ledvance',
  'com.eurotronic',
  'com.danfoss',
  'com.neo',
  'com.nedis',
  'com.smartthings',
  'com.samsung.smartthings',
  'cloud.shelly',
  'com.shelly',
  'com.fibaro',
  'com.homeyduino',
  'com.athombv.homeybridge',
];

const QUERIES = [
  'tuya',
  'zigbee',
  'smartlife',
  'lidl',
  'silvercrest',
  'zemismart',
  'moes',
  'nous',
  'aqara',
  'sonoff',
  'ewelink',
  'matter',
  'infrared',
  'tuyalocal',
  'local tuya',
  'cloud tuya',
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const searchHits = {};
  for (const q of QUERIES) {
    try {
      searchHits[q] = await search(q);
    } catch (e) {
      searchHits[q] = { error: String(e) };
    }
  }
  const ids = new Set(SEED_IDS);
  for (const arr of Object.values(searchHits)) {
    if (Array.isArray(arr)) for (const a of arr) if (a.id) ids.add(a.id);
  }
  // Prior probe search hits (2026-09-21 complementary-apps)
  for (const id of [
    'com.tuya2', 'com.hyundaiht.cloud', 'com.ht.dlab', 'com.szwest', 'com.LSES861',
    'com.Meian.zigbee', 'de.vevor.weatherstation', 'com.arteco', 'no.enertek.app',
    'com.oskarirauta.owon', 'com.Idinio', 'com.hejhome.iot', 'com.frient', 'com.DevelcoProducts',
  ]) ids.add(id);

  const probes = [];
  for (const id of [...ids].sort()) {
    try {
      probes.push(await probeApp(id));
    } catch (e) {
      probes.push({ appId: id, ok: false, error: String(e) });
    }
  }
  const ok = probes.filter((p) => p.ok);
  const tuyaRelated = ok.filter((p) => {
    const blob = `${p.appId} ${p.name} ${p.author || ''}`.toLowerCase();
    return /tuya|smart.?life|tuyalocal|lidl|silvercrest|zemismart|moes|nous|avatto|bseed|neo|nedis|zigbee|ewelink|sonoff|aqara|matter|infrared|ir\b|wifi|cloud|local/.test(blob);
  });
  const report = {
    generatedAt: new Date().toISOString(),
    patch: 'P2657',
    api: BASE,
    searchHits,
    probes,
    okCount: ok.length,
    failCount: probes.length - ok.length,
    tuyaRelatedCount: tuyaRelated.length,
  };
  fs.writeFileSync(path.join(OUT, 'athom-probe-wide.json'), JSON.stringify(report, null, 2));
  const md = [
    `# Homey Store peer probe ${report.generatedAt}`,
    '',
    `API: \`${BASE}\``,
    `OK: **${ok.length}** / ${probes.length} · Tuya/Zigbee-related filter: **${tuyaRelated.length}**`,
    '',
    '## Tuya / Zigbee / SmartLife / related (ok)',
    ...tuyaRelated.map(
      (p) => `- \`${p.appId}\` **${p.name}** live=\`${p.liveVersion || '-'}\` test=\`${p.testVersion || '-'}\` author=${p.author || '?'}${p.private ? ' PRIVATE' : ''}${p.source ? ` · src=${p.source}` : ''}`,
    ),
    '',
    '## All ok',
    ...ok.map(
      (p) => `- \`${p.appId}\` live=${p.liveVersion || '-'} test=${p.testVersion || '-'} — ${p.name}`,
    ),
    '',
    '## Search (raw Athom — may include popularity noise)',
    ...Object.entries(searchHits).map(([q, arr]) => {
      const body = Array.isArray(arr)
        ? arr.map((a) => `- ${a.id} — ${a.name}`).join('\n')
        : JSON.stringify(arr);
      return `### ${q}\n${body}`;
    }),
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'SUMMARY.md'), md);
  console.log('Wrote', OUT);
  console.log('OK', ok.length, 'related', tuyaRelated.length);
  console.log(tuyaRelated.map((p) => `${p.appId} L=${p.liveVersion || '-'} T=${p.testVersion || '-'}`).join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
