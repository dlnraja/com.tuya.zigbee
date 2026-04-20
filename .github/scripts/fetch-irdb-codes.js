#!/usr/bin/env node
'use strict';
// fetch-irdb-codes.js  Fetches IR remote codes from public IRDB sources
// Used by monthly-irdb-sync.yml workflow
// Sources: irdb (GitHub), LIRC remotes, Tuya IR blaster DP codes
const fs = require('fs');
const path = require('path');
const { fetchWithRetry } = require('./retry-helper');

const STATE_DIR = path.join(__dirname, '..', 'state');
const IRDB_REPO = 'probonopd/irdb';

async function fetchIRDB() {
  console.log('=== IR Database Sync ===');
  const GH = process.env.GH_PAT || process.env.GITHUB_TOKEN || '';
  const headers = { 'User-Agent': 'tuya-zigbee-bot' };
  if (GH) headers.Authorization = 'token ' + GH;

  let irdbCount = 0;
  try {
    const url = 'https://api.github.com/repos/' + IRDB_REPO + '/git/trees/master?recursive=1';
    const res = await fetchWithRetry(url, { headers }, { retries: 2, label: 'irdb' });
    if (res.ok) {
      const data = await res.json();
      const csvFiles = (data.tree || []).filter(t => t.path.endsWith('.csv') && t.path.includes('codes/'));
      irdbCount = csvFiles.length;
      console.log('IRDB: ' + irdbCount + ' code files found');

      const brands = new Set();
      for (const f of csvFiles) {
        const parts = f.path.split('/');
        if (parts.length >= 3) brands.add(parts[1]);
      }
      console.log('IRDB: ' + brands.size + ' brands');

      fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.writeFileSync(path.join(STATE_DIR, 'irdb-summary.json'), JSON.stringify({
        date: new Date().toISOString(),
        source: IRDB_REPO,
        totalFiles: irdbCount,
        brands: [...brands].sort(),
        brandCount: brands.size,
      }, null, 2));
    } else {
      console.warn('IRDB fetch failed:', res.status);
    }
  } catch (e) {
    console.warn('IRDB error:', e.message);
  }

  // Scan Z2M for IR blaster references
  try {
    const z2mUrl = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';
    const res = await fetchWithRetry(z2mUrl, { headers: { 'User-Agent': 'tuya-zigbee-bot' } }, { retries: 2, label: 'z2m' });
    if (res.ok) {
      const text = await res.text();
      const irMatches = text.match(/TS1201|TS0601.*ir|ir.*blaster|ir.*remote|ZS06/gi) || [];
      console.log('Z2M: ' + irMatches.length + ' IR-related references found');
    }
  } catch (e) {
    console.warn('Z2M IR scan error:', e.message);
  }

  console.log('IR sync complete: ' + irdbCount + ' code files indexed');
}

fetchIRDB().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
