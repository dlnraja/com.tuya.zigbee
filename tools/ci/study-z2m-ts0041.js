#!/usr/bin/env node
'use strict';

const https = require('https');
const url = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt/master/src/devices/tuya.ts';

https.get(url, { headers: { 'User-Agent': 'mavis-ci' }}, (res) => {
  console.log('Status:', res.statusCode);
  if (res.statusCode !== 200) return;
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    // Find lines mentioning TS0041
    const lines = data.split('\n');
    const found = new Set();
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/TS004[12346F]/);
      if (m && !found.has(m[0])) {
        found.add(m[0]);
        console.log(`\n=== ${m[0]} (line ${i}) ===`);
        // Print surrounding context
        const start = Math.max(0, i - 5);
        const end = Math.min(lines.length, i + 30);
        for (let j = start; j < end; j++) {
          console.log(`  ${j}: ${lines[j]}`);
        }
      }
    }
  });
}).on('error', e => console.error('Error:', e.message));
