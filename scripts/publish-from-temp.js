#!/usr/bin/env node
'use strict';
/**
 * Cross-platform publish wrapper: always targets os.tmpdir()/homey-publish-temp.
 * WHY: publishing from repo root creates orphan Athom builds (waiting_for_files /
 * processing_failed) because prepare-publish compaction never ran on that path.
 */
const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const pub = path.join(os.tmpdir(), 'homey-publish-temp');
if (!fs.existsSync(path.join(pub, 'app.json'))) {
  console.error(`FATAL: ${pub}/app.json missing. Run: npm run build && npm run prepare-publish`);
  process.exit(2);
}

const args = [
  path.join(__dirname, 'direct-api-publish.js'),
  '--path',
  pub,
  ...process.argv.slice(2),
];
const r = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
process.exit(r.status == null ? 1 : r.status);
