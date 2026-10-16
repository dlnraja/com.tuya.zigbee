#!/usr/bin/env node
'use strict';

/**
 * P2836 — Homey forum #zigbee tag silent harvest
 *
 * WHY (P215):
 *   Pourquoi — Tag page surfaces peer Zigbee apps + our T140352 + mesh/pairing lessons.
 *   Comment  — READ-ONLY GET tag/zigbee.json + classify; never Discourse POST.
 *   Pour qui — CI silent enrich / Dylan tip; users get FP/mesh fixes without forum paste.
 *   Quand    — cron / manual after tag noise spikes.
 *   Contre quoi — Ignoring #zigbee leaves Sonoff SWV / sleepy-mesh gaps; AI forum paste (T157628).
 *
 * Usage:
 *   node tools/ci/p2836-forum-zigbee-tag-harvest.js
 *   node tools/ci/p2836-forum-zigbee-tag-harvest.js --pages=2
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'reports', 'forum-zigbee-tag-2026-10-16');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Topics worth READ-ONLY silent scan (never reply). */
const ACTIONABLE_TOPIC_IDS = [
  140352, // Universal Tuya (own)
  157743, // Sonoff SWV / Woox valve mesh
  160737, // Slow first reaction (sleepy)
  101901, // Unknown Zigbee tip
  36418, // SONOFF Zigbee app peer
  159511, // Zemismart SPM02
];

const SKIP_BRAND = /aqara|xiaomi|philips hue|shelly|lixee|frient|homely|hive|devireg|danalock|nimly|cadabi|repenic|klikaan|plugwise|namron|styrbar|fireangel/i;

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': UA,
            Accept: 'application/json',
            'Accept-Encoding': 'identity',
            Referer: 'https://community.homey.app/',
          },
        },
        (res) => {
          let d = '';
          res.on('data', (c) => {
            d += c;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(d));
            } catch (e) {
              reject(e);
            }
          });
        }
      )
      .on('error', reject);
  });
}

function classifyTopic(t) {
  const title = String(t.title || '');
  const id = Number(t.id);
  if (id === 140352) return 'own_app';
  if (ACTIONABLE_TOPIC_IDS.includes(id)) return 'actionable_silent';
  if (/tuya|moes|zemismart|nous|sonoff|swv|unknown zigbee|slow first|pair/i.test(title)) {
    return 'pattern_watch';
  }
  if (SKIP_BRAND.test(title)) return 'peer_non_tuya';
  return 'other';
}

async function main() {
  const pagesArg = process.argv.find((a) => a.startsWith('--pages='));
  const pages = pagesArg ? Math.max(1, parseInt(pagesArg.split('=')[1], 10) || 1) : 2;

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const all = [];
  for (let page = 0; page < pages; page++) {
    const j = await getJson(`https://community.homey.app/tag/zigbee.json?page=${page}`);
    const topics = (j.topic_list && j.topic_list.topics) || [];
    for (const t of topics) {
      all.push({
        id: t.id,
        title: t.title,
        posts_count: t.posts_count,
        bumped_at: t.bumped_at,
        class: classifyTopic(t),
      });
    }
  }

  const byClass = {};
  for (const t of all) {
    byClass[t.class] = byClass[t.class] || [];
    byClass[t.class].push(t);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: 'https://community.homey.app/tag/zigbee',
    policy: 'SHADOW read-only — never forum POST (T157628)',
    pages,
    topicCount: all.length,
    actionableTopicIds: ACTIONABLE_TOPIC_IDS,
    lessons: [
      'Most #zigbee traffic is peer apps (Hue/Aqara/Shelly) — inspire patterns only, do not invent Tuya FPs.',
      'T157743 Sonoff SWV-ZFU: couple SONOFF/eWeLink + SWV-* → water_valve_garden (ZCL). Pair fail often = battery-only mesh.',
      'T160737 slow first reaction: sleepy end-devices need wake/rebind — not forced EF00 TX storm.',
      'T140352 remains the FP SSOT for Universal Tuya; tag is a discovery index.',
    ],
    byClass,
    topics: all,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'HARVEST.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, 'ACTIONABLE.md'),
    [
      '# P2836 Homey #zigbee tag — actionable (silent)',
      '',
      `- Generated: ${report.generatedAt}`,
      `- Source: ${report.source}`,
      `- Policy: ${report.policy}`,
      '',
      '## Lessons',
      ...report.lessons.map((l) => `- ${l}`),
      '',
      '## Actionable topic IDs (READ-ONLY scan)',
      ...ACTIONABLE_TOPIC_IDS.map((id) => `- ${id}`),
      '',
      '## Class counts',
      ...Object.entries(byClass).map(([k, v]) => `- ${k}: ${v.length}`),
      '',
    ].join('\n')
  );

  console.log(`[p2836] wrote ${OUT_DIR} topics=${all.length}`);
  console.log(`[p2836] classes`, Object.fromEntries(Object.entries(byClass).map(([k, v]) => [k, v.length])));
}

main().catch((e) => {
  console.error('[p2836] FAIL', e.message || e);
  process.exit(1);
});
