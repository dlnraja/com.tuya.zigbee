#!/usr/bin/env node
'use strict';

/**
 * silent-enrichment-orchestrator.js (P2215)
 *
 * Thin wrapper around manifest-driven PhaseRunner.
 * Config: config/enrichment/manifest.json + phases.json
 */

const fs = require('fs');
const path = require('path');
const { runPipeline } = require('../../lib/enrichment/PhaseRunner');
const { loadManifest } = require('../../lib/enrichment/EnrichmentRegistry');

const args = process.argv.slice(2);
const phaseArg = args.find((a) => a.startsWith('--phase='));
const options = {
  phase: phaseArg ? phaseArg.split('=')[1] : 'all',
  skipScan: args.includes('--skip-scan'),
  applyRoutes: args.includes('--apply-routes'),
  withMedia: args.includes('--with-media'),
  withPm: args.includes('--with-pm'),
  maxPosts: (() => {
    const a = args.find((x) => x.startsWith('--max='));
    return a ? parseInt(a.split('=')[1], 10) : undefined;
  })(),
};

const summary = runPipeline(options);
const reg = loadManifest();
const stateDir = path.dirname(reg.statePath('orchestrator'));
fs.mkdirSync(stateDir, { recursive: true });
fs.writeFileSync(reg.statePath('orchestrator'), `${JSON.stringify(summary, null, 2)}\n`);

console.log('\n=== silent-enrichment-orchestrator (P2215) ===');
console.log(`Phase=${summary.phase} ok=${summary.ok} steps=${summary.phases.length}`);
console.log(`Manifest: config/enrichment/manifest.json`);
console.log(`Profiles: docs/knowledge/profiles/INDEX.md`);
console.log(`State: ${reg.statePath('orchestrator')}`);

process.exit(summary.ok ? 0 : 1);
