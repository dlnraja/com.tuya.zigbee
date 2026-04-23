#!/usr/bin/env node
/**
 * 🤖 BOT_ACCURACY_FIXER.js - v1.0.0
 * Challenges bot audit reports and refines discovery indexes.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const AUDIT_FILE = path.join(ROOT, '.github/state/bot-audit-report.md');
const FORCED_MAP_FILE = path.join(ROOT, 'lib/data/BOT_FORCED_DISCOVERY.json');

function log(msg) { console.log(`[BOT-FIXER] ${msg}`); }

async function main() {
  if (!fs.existsSync(AUDIT_FILE)) {
    log('No bot audit report found. Skipping.');
    return;
  }

  const content = fs.readFileSync(AUDIT_FILE, 'utf8');
  const missedFpRegex = /MISSED: Post contains `([^`]+)` \(supported in ([^)]+)\)/g;
  
  const forcedMap = fs.existsSync(FORCED_MAP_FILE) ? JSON.parse(fs.readFileSync(FORCED_MAP_FILE, 'utf8')) : {};
  let found = 0;

  let match;
  while ((match = missedFpRegex.exec(content)) !== null) {
    const fp = match[1];
    const drivers = match[2].split(',').map(s => s.trim());
    
    if (!forcedMap[fp]) {
      forcedMap[fp] = drivers;
      found++;
    }
  }

  if (found > 0) {
    fs.mkdirSync(path.dirname(FORCED_MAP_FILE), { recursive: true });
    fs.writeFileSync(FORCED_MAP_FILE, JSON.stringify(forcedMap, null, 2));
    log(`Successfully refined bot index with ${found} previously missed fingerprints.`);
  } else {
    log('No new missed fingerprints identified in the latest audit.');
  }
}

main().catch(console.error);
