#!/usr/bin/env node
'use strict';

/**
 * sync-enrichment-profiles.js
 *
 * Merge forum processor + parse signals into catalog stubs (never overwrite curated rows).
 *
 * Usage:
 *   node tools/ci/sync-enrichment-profiles.js
 *   node tools/ci/sync-enrichment-profiles.js --dry-run
 */

const { runSync } = require('../../lib/enrichment/ProfileSynchronizer');

const dryRun = process.argv.includes('--dry-run');

const result = runSync({ dryRun });
console.log(JSON.stringify({ dryRun, stats: result.stats }, null, 2));
if (!dryRun) {
  console.log('[sync-enrichment-profiles] updated', result.catalogPath);
  console.log('[sync-enrichment-profiles] updated', result.dpPath);
}
