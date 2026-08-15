#!/usr/bin/env node
'use strict';

/**
 * free-scrape-crossref.js — autonomous free-tier multi-source cross-ref
 *
 * Re-runs the session investigation prompts using $0 scrapers:
 *   Homey forum · Z2M · GitHub · Blakadder · Reddit (public JSON)
 *
 * Usage:
 *   node tools/ci/free-scrape-crossref.js
 *   node tools/ci/free-scrape-crossref.js --topic=140352 --focus=2134
 *   node tools/ci/free-scrape-crossref.js --queries="SOS button,water leak Tuya,UNSUPPORTED_CLUSTER"
 *
 * Output:
 *   .github/state/free-scrape/crossref-report.json
 *   .github/state/free-scrape/dashboard-snippet.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(ROOT, '.github', 'state', 'free-scrape');

const {
  freeScrape,
  freeScrapeMany,
  structuredExtract,
  SOURCE_TEMPLATES,
} = require('../../lib/scraper/FreeScrapeStack');

const args = process.argv.slice(2);
const topicId = Number((args.find((a) => a.startsWith('--topic=')) || '--topic=140352').split('=')[1]);
const focusPost = Number((args.find((a) => a.startsWith('--focus=')) || '--focus=2134').split('=')[1]);
const queryArg = args.find((a) => a.startsWith('--queries='));
const queries = queryArg
  ? queryArg.slice('--queries='.length).split(',').map((s) => s.trim()).filter(Boolean)
  : [
    'Tuya SOS button Homey not triggering',
    'Tuya water leak sensor Homey IAS',
    'UNSUPPORTED_CLUSTER dimmer Tuya Homey',
    'TS0215A zigbee2mqtt',
    'ZG-222Z water leak',
  ];

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function mergeExtracts(rows) {
  const acc = {
    manufacturers: new Set(),
    productIds: new Set(),
    diagnosticCodes: new Set(),
    urls: new Set(),
    issues: new Set(),
  };
  for (const r of rows) {
    const e = r.extracted || {};
    for (const m of e.manufacturers || []) {acc.manufacturers.add(m);}
    for (const p of e.productIds || []) {acc.productIds.add(p);}
    for (const d of e.diagnosticCodes || []) {acc.diagnosticCodes.add(d);}
    for (const u of e.urls || []) {acc.urls.add(u);}
    for (const i of e.issues || []) {acc.issues.add(i);}
  }
  return {
    manufacturers: [...acc.manufacturers].slice(0, 80),
    productIds: [...acc.productIds].slice(0, 60),
    diagnosticCodes: [...acc.diagnosticCodes],
    urls: [...acc.urls].slice(0, 60),
    issues: [...acc.issues],
  };
}

function localDriverHits(tokens) {
  const driversDir = path.join(ROOT, 'drivers');
  const hits = [];
  if (!fs.existsSync(driversDir)) {return hits;}
  for (const d of fs.readdirSync(driversDir)) {
    const f = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    const raw = fs.readFileSync(f, 'utf8');
    const matched = tokens.filter((t) => raw.toLowerCase().includes(String(t).toLowerCase()));
    if (matched.length) {hits.push({ driver: d, matched });}
  }
  return hits.slice(0, 40);
}

async function main() {
  ensureDir(OUT_DIR);
  const started = Date.now();
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'free-tier-only',
    stack: ['direct', 'jina', 'microlink', 'allorigins', 'crawl4ai?', 'wayback', 'firecrawl-budget', 'browser?'],
    topicId,
    focusPost,
    queries,
    sources: [],
    merged: null,
    localDrivers: [],
    notes: [
      'No Homey Community auto-post (silent enrichment).',
      'Firecrawl only if FIRECRAWL_API_KEY + daily budget.',
      'Crawl4AI only if CRAWL4AI_URL points at a self-hosted instance.',
    ],
  };

  const urls = [
    SOURCE_TEMPLATES.forumTopic(topicId),
    `https://community.homey.app/t/${topicId}/${focusPost}.json`,
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    'https://api.github.com/search/issues?q=repo:Koenkk/zigbee2mqtt+TS0215A&per_page=5',
    'https://api.github.com/search/issues?q=repo:dlnraja/com.tuya.zigbee+UNSUPPORTED_CLUSTER&per_page=5',
    ...queries.slice(0, 3).map((q) => SOURCE_TEMPLATES.redditSearch(q)),
    'https://www.zigbee2mqtt.io/devices/TS0215A.html',
    'https://www.zigbee2mqtt.io/devices/TS0207_water_leak_sensor.html',
  ];

  console.log(`[free-scrape] scraping ${urls.length} URLs (free cascade)...`);
  const results = await freeScrapeMany(urls, {
    concurrency: 2,
    schemaHints: {
      issues: [
        'UNSUPPORTED_CLUSTER', 'not trigger', 'no battery', 'IAS', 'zoneId',
        'water leak', 'SOS', 'smartbutton', 'dimmer',
      ],
    },
  });

  for (const r of results) {
    report.sources.push({
      url: r.url,
      ok: r.ok,
      via: r.via || null,
      cached: !!r.cached,
      error: r.error || null,
      extractPreview: r.extracted
        ? {
          mfrs: (r.extracted.manufacturers || []).slice(0, 8),
          pids: (r.extracted.productIds || []).slice(0, 8),
          diags: r.extracted.diagnosticCodes || [],
          issues: r.extracted.issues || [],
        }
        : null,
      textBytes: r.text ? Buffer.byteLength(r.text) : 0,
    });
    const status = r.ok ? `OK via=${r.via}` : `FAIL ${r.error}`;
    console.log(`  [${status}] ${r.url.slice(0, 90)}`);
  }

  report.merged = mergeExtracts(results.filter((r) => r.ok));
  report.localDrivers = localDriverHits([
    ...report.merged.manufacturers,
    ...report.merged.productIds,
  ].slice(0, 30));

  // Focus post text if Discourse JSON succeeded
  const focus = results.find((r) => r.ok && r.url.includes(`/${focusPost}.json`));
  if (focus?.text) {
    try {
      const j = JSON.parse(focus.text);
      const cooked = j?.post_stream?.posts?.[0]?.cooked || j?.cooked || '';
      const plain = String(cooked).replace(/<[^>]+>/g, ' ');
      report.focusPostExtract = {
        username: j?.post_stream?.posts?.[0]?.username || j?.username,
        textPreview: plain.slice(0, 800),
        ...structuredExtract(plain),
      };
    } catch (_e) {
      report.focusPostExtract = structuredExtract(focus.text);
    }
  }

  report.elapsedMs = Date.now() - started;
  report.okCount = results.filter((r) => r.ok).length;
  report.failCount = results.filter((r) => !r.ok).length;

  const reportPath = path.join(OUT_DIR, 'crossref-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const dash = {
    title: 'Free scrape cross-ref',
    generatedAt: report.generatedAt,
    ok: report.okCount,
    fail: report.failCount,
    vias: [...new Set(report.sources.filter((s) => s.via).map((s) => s.via))],
    topMfrs: report.merged.manufacturers.slice(0, 15),
    topPids: report.merged.productIds.slice(0, 15),
    diags: report.merged.diagnosticCodes,
    localDriverHits: report.localDrivers.slice(0, 12),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'dashboard-snippet.json'), JSON.stringify(dash, null, 2));

  console.log(`[free-scrape] done ok=${report.okCount} fail=${report.failCount} → ${reportPath}`);
  if (report.focusPostExtract?.diagnosticCodes?.length) {
    console.log(`[free-scrape] focus #${focusPost} diags:`, report.focusPostExtract.diagnosticCodes.join(', '));
  }
}

main().catch((e) => {
  console.error('[free-scrape] FATAL', e.message);
  process.exit(1);
});
