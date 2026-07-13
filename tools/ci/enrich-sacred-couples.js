#!/usr/bin/env node
'use strict';

/**
 * P24.9 — Sacred Couple Auto-Enrichment
 *
 * Runs as a cron job (every 6h via shadow-mode-runner).
 * Enriches mfs_db.sacredCouples with fresh data from:
 * - Recent crash logs (crash-details.json)
 * - New z2m/ZHA pairs (z2m-pairs.json, zha-pairs.json)
 * - GitHub issues mentioning devices (johan-dump, our issues)
 * - Forum mentions (forum-search-results.json)
 * - Commit history references
 * - Recent mfr+pid pairs from emails (P18/P13)
 *
 * Output: updated data/mfs_db.json with enriched sacredCouples section
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';
const MFS_DB = 'C:/Users/Dell/Documents/homey/master/data/mfs_db.json';
const OUTPUT_REPORT = path.join(STATE_DIR, 'sacred-couple-enrichment-report.json');

function loadJson(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}

function main() {
  console.log('=== P24.9 Sacred Couple Auto-Enrichment ===\n');

  // Load existing mfs_db
  const mfsDb = loadJson(MFS_DB, { sacredCouples: {}, driverMappings: {} });
  const sacredCouples = mfsDb.sacredCouples || {};

  // Load sources
  const z2m = loadJson(path.join(STATE_DIR, 'z2m-pairs.json'), []);
  const zha = loadJson(path.join(STATE_DIR, 'zha-pairs.json'), []);
  const crashes = loadJson(path.join(STATE_DIR, 'crash-details.json'), null);
  const johanDump = loadJson(path.join(STATE_DIR, 'johan-issues.json'), null);
  const forumResults = loadJson(path.join(STATE_DIR, 'forum-search-results.json'), null);

  let enriched = 0;
  let added = 0;
  const report = {
    meta: {
      runAt: new Date().toISOString(),
      previousSacredCouples: Object.keys(sacredCouples).length,
    },
    added: [],
    enriched: [],
    sources: {},
  };

  // 1. Add new pairs from z2m
  console.log('Source 1: z2m pairs (' + z2m.length + ')');
  for (const p of z2m) {
    if (p.zigbeeModels) {
      for (const zm of p.zigbeeModels) {
        // Try to match to an existing sacred couple or driver mapping
        for (const [key, value] of Object.entries(mfsDb.driverMappings || {})) {
          if (value && value.manufacturerName && value.productId === zm) {
            const coupleKey = `${value.manufacturerName}|${zm}`;
            if (!sacredCouples[coupleKey]) {
              sacredCouples[coupleKey] = { driverId: value.driverId, source: 'z2m-tuya' };
              added++;
              report.added.push({ key: coupleKey, driverId: value.driverId, source: 'z2m' });
            }
          }
        }
      }
    }
  }
  report.sources.z2m = z2m.length;

  // 2. Add new pairs from ZHA
  console.log('Source 2: ZHA pairs (' + zha.length + ')');
  for (const p of zha) {
    const key = `${p.manufacturer}|${p.model}`;
    if (!sacredCouples[key]) {
      // Try to find driver
      let driverId = null;
      for (const [dId, mapping] of Object.entries(mfsDb.driverMappings || {})) {
        if (mapping && mapping.manufacturerName === p.manufacturer && mapping.productId === p.model) {
          driverId = dId;
          break;
        }
      }
      if (driverId) {
        sacredCouples[key] = { driverId, source: 'zha-quirk' };
        added++;
        report.added.push({ key, driverId, source: 'zha' });
      }
    }
  }
  report.sources.zha = zha.length;

  // 3. Enrich existing couples with crash data
  console.log('Source 3: Crash patterns');
  if (crashes && crashes.topPatterns) {
    for (const pattern of crashes.topPatterns) {
      const driverMatch = pattern.stack && pattern.stack.match(/Initializing Driver (\w+):/);
      if (driverMatch) {
        const driverId = driverMatch[1];
        // Find all sacred couples for this driver
        for (const [key, value] of Object.entries(sacredCouples)) {
          if (value && value.driverId === driverId) {
            if (!value.crashCount) value.crashCount = 0;
            value.crashCount += pattern.count || 1;
            value.lastCrash = new Date().toISOString();
            enriched++;
            report.enriched.push({ key, type: 'crash', driverId, count: pattern.count });
          }
        }
      }
    }
    report.sources.crashes = crashes.topPatterns.length;
  }

  // 4. Add forum mentions
  console.log('Source 4: Forum mentions');
  if (forumResults && forumResults.topics) {
    for (const topic of forumResults.topics) {
      if (topic.title) {
        // Try to find drivers mentioned in title
        for (const [dId, mapping] of Object.entries(mfsDb.driverMappings || {})) {
          if (mapping && mapping.manufacturerName && topic.title.toLowerCase().includes(mapping.manufacturerName.toLowerCase())) {
            // Add forum mention to all couples for this driver
            for (const [key, value] of Object.entries(sacredCouples)) {
              if (value && value.driverId === dId) {
                if (!value.forumMentions) value.forumMentions = [];
                value.forumMentions.push({ topicId: topic.id, title: topic.title });
              }
            }
          }
        }
      }
    }
    report.sources.forum = forumResults.topics.length;
  }

  // 5. Save back to mfs_db
  mfsDb.sacredCouples = sacredCouples;
  fs.writeFileSync(MFS_DB, JSON.stringify(mfsDb, null, 2));
  report.meta.finalSacredCouples = Object.keys(sacredCouples).length;
  report.meta.added = added;
  report.meta.enriched = enriched;

  // Save report
  fs.writeFileSync(OUTPUT_REPORT, JSON.stringify(report, null, 2));

  console.log(`\n=== Summary ===`);
  console.log(`Previous: ${report.meta.previousSacredCouples} couples`);
  console.log(`Added: ${added} new couples`);
  console.log(`Enriched: ${enriched} existing couples`);
  console.log(`Final: ${report.meta.finalSacredCouples} couples`);
  console.log(`\nReport: ${OUTPUT_REPORT}`);
}

main();
