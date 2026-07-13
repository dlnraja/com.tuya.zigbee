#!/usr/bin/env node
'use strict';

/**
 * Download and parse z2m device definitions for ALL vendor categories.
 * Extracts: vendor, model, zigbeeModel[], description
 * Output: z2m-pairs-full.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUT_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';
const OUT_FILE = path.join(OUT_DIR, 'z2m-pairs-full.json');
const PROGRESS_FILE = path.join(OUT_DIR, 'z2m-download-progress.json');

const CATEGORIES = [
  'acova', 'acuity_brands_lighting', 'adeo', 'adurosmart', 'aeotec', 'airam', 'airzone_aidoo',
  'ajax_online', 'akuvox', 'alchemy', 'aldi', 'alecto', 'amina', 'anchor', 'atlantic', 'atsmart',
  'aurora_lighting', 'automaton', 'avatto', 'awox', 'axis', 'bacchus', 'bankamp', 'bega',
  'belkin', 'bitron', 'bituo_technik', 'blaupunkt', 'blitzwolf', 'bosch', 'bouffalo_lab',
  'box', 'brimate', 'brun_holding', 'bseed', 'bticino', 'bubendorff', 'busch_jaeger', 'byun',
  'calex', 'candeo', 'casaia', 'cel', 'centralite', 'chacon', 'cigol', 'cleode', 'cleverio',
  'climax', 'comfnight', 'current_products_cps', 'danalock', 'danfoss', 'datek', 'develco',
  'digistump', 'diy', 'dresden_elektronik', 'easydom', 'echostar', 'eco_brite', 'ecodim',
  'ecosmart', 'electrolama', 'elv', 'enbrighten', 'enocean', 'enroute', 'essentialb',
  'eucontrols', 'eurotronic', 'evn', 'evology', 'feibit', 'fireangel', 'fjordking',
  'flexfire', 'frient', 'futronix', 'ge', 'ge_avant', 'gewiss', 'gidealed', 'gira',
  'gledopto', 'gmyee', 'goodlux', 'gs', 'hampton_bay', 'hank', 'hass', 'heiman', 'heimgard',
  'hive', 'homematiq', 'honyar', 'hornbach', 'hzc', 'icasa', 'ikea', 'iluminize',
  'immax', 'innr', 'inovelli', 'instromet', 'iris', 'jethome', 'jumitech', 'kami', 'keenetic',
  'kmp', 'kogan', 'konke', 'kudled', 'lds', 'led_trading', 'ledvance', 'legrand', 'lelight',
  'lidl', 'lifx', 'linkind', 'livingwise', 'ln_smart', 'lumi', 'lux', 'luxom', 'm_elec',
  'maason', 'malmbergs', 'meazon', 'miboxer', 'midea', 'mihome', 'müller_licht', 'namron',
  'nanoleaf', 'naux', 'neon', 'net2grid', 'nexentro', 'niko', 'niubay', 'nordtronic',
  'nous', 'nue_3a', 'onesti', 'openweave', 'opple', 'orion', 'osram', 'oujielet', 'paulmann',
  'peq', 'philio', 'philips', 'plaid', 'plum', 'profalux', 'progress', 'qmotion', 'qoto',
  'quotra', 'rademacher', 'rgb_genie', 'ring', 'robb', 'saswell', 'scanlight', 'schlage',
  'schneider_electric', 'schwaiger', 'securifi', 'sengled', 'shenqi', 'shinasystem', 'shome',
  'siarem', 'sigma_automation', 'sikom', 'simon', 'sinope', 'siterwell', 'sky_connect',
  'slv', 'smabit', 'smart_home_ideas', 'smart_innovations', 'smartthings', 'smartwater',
  'snoff', 'somfy', 'sonoff', 'sowilo', 'spotmau', 'sprut', 'stelpro', 'sunricher', 'swann',
  'sylvania', 'tci', 'tech', 'technicolor', 'telink', 'tenx_technologies', 'the_light_group',
  'third_reality', 'thomas_rex_royale', 'thrust_vector', 'ti', 'titan', 'tp_link', 'trust',
  'tuya', 'ubisys', 'uhome', 'unitec', 'vandex', 'viessmann', 'villeroy_boch', 'vimar',
  'vitrum', 'wattle', 'wemo', 'woolley', 'woox', 'wyze', 'xal', 'xfinity', 'yandex', 'yokis',
  'ysrsr', 'zbeacon', 'zen', 'zigbee_light_link', 'zled', 'zooz', 'zwt_eco'
];

function download(url) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'mavis-ci' };
    if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GH_TOKEN || process.env.GITHUB_TOKEN}`;
    }
    https.get(url, { headers }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return resolve(null);
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseBlocks(content) {
  const lines = content.split('\n');
  const blocks = [];
  let currentBlock = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const vendorMatch = line.match(/^\s*vendor:\s*['"]([^'"]+)['"]/);
    if (vendorMatch) {
      if (!currentBlock) currentBlock = {};
      currentBlock.vendor = vendorMatch[1];
    }

    const modelMatch = line.match(/^\s*model:\s*['"]([^'"]+)['"]/);
    if (modelMatch) {
      if (!currentBlock) currentBlock = {};
      currentBlock.model = modelMatch[1];
    }

    const zigbeeMatch = line.match(/^\s*zigbeeModel:\s*\[([^\]]+)\]/);
    if (zigbeeMatch) {
      if (!currentBlock) currentBlock = {};
      currentBlock.zigbeeModels = zigbeeMatch[1]
        .split(',')
        .map(s => s.trim().replace(/['"\s]/g, ''))
        .filter(Boolean);
    }

    const descMatch = line.match(/^\s*description:\s*['"]([^'"]+)['"]/);
    if (descMatch) {
      if (!currentBlock) currentBlock = {};
      currentBlock.description = descMatch[1];
    }

    const trimmed = line.trim();
    if (trimmed === '},' || trimmed === '}, ' || trimmed === '}') {
      if (currentBlock && currentBlock.vendor) {
        if (!currentBlock.zigbeeModels && currentBlock.model) {
          currentBlock.zigbeeModels = [currentBlock.model];
        }
        blocks.push(currentBlock);
      }
      currentBlock = null;
    }
  }
  return blocks;
}

async function main() {
  console.log('Downloading z2m for', CATEGORIES.length, 'categories...');
  const allBlocks = [];
  const seen = new Set();
  const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8').toString() || '{}');
  const startIdx = progress.lastIdx || 0;

  for (let i = startIdx; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    const url = `https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/${cat}.ts`;
    process.stdout.write(`[${i + 1}/${CATEGORIES.length}] ${cat}... `);
    const content = await download(url);
    if (content) {
      const blocks = parseBlocks(content);
      for (const b of blocks) {
        const key = `${b.vendor}|${b.model}`;
        if (!seen.has(key)) {
          seen.add(key);
          allBlocks.push(b);
        }
      }
      console.log(`${blocks.length} blocks`);
    } else {
      console.log('skip (404)');
    }

    // Save progress every 5 categories
    if ((i + 1) % 5 === 0 || i === CATEGORIES.length - 1) {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastIdx: i + 1, total: allBlocks.length }));
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(allBlocks, null, 2));
  console.log(`\nTotal: ${allBlocks.length} unique vendor+model blocks`);
  console.log(`Unique vendors: ${new Set(allBlocks.map(b => b.vendor)).size}`);
  console.log(`Output: ${OUT_FILE}`);

  // Cleanup progress file
  fs.unlinkSync(PROGRESS_FILE);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
