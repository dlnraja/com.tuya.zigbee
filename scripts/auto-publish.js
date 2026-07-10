#!/usr/bin/env node
'use strict';
/**
 * DEPRECATED — do not use.
 * ---------------------------------------------------------------
 * This script published via `npx homey app publish` with stdin
 * piping to answer inquirer prompts by substring matching. That
 * approach is the documented root cause of the "processing_failed /
 * no new build" loop: prompts were consumed out of order, so the
 * CLI kept promoting stale drafts instead of creating a new build.
 * (See direct-api-publish.js header for the full root-cause note.)
 *
 * It is intentionally kept as a hard-error stub instead of deleted,
 * so any CI workflow / shortcut / muscle memory that still points
 * here fails LOUDLY and points at the replacement, instead of
 * silently running the broken interactive flow.
 *
 * Replacement: scripts/direct-api-publish.js
 *   node scripts/direct-api-publish.js --channel test
 *
 * Removed on: 2026-06-22.
 * ---------------------------------------------------------------
 */
console.error('========================================================');
console.error(' auto-publish.js is DEPRECATED and intentionally disabled.');
console.error('--------------------------------------------------------');
console.error(' Root cause of the processing_failed loop was this very');
console.error(' script (interactive stdin piping). It has been replaced');
console.error(' by direct-api-publish.js which uses the Athom Apps API');
console.error(' directly — no prompts, no stale-draft promotion.');
console.error('');
console.error(' Use instead:');
console.error('   node scripts/direct-api-publish.js --list');
console.error('   node scripts/direct-api-publish.js --channel test');
console.error('========================================================');
process.exit(1);
