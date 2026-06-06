#!/usr/bin/env node
/**
 * diag-safety-gate.js
 * Safety net: prevents re-processing of already-handled crash/diagnostic logs.
 *
 * Rules (per user requirement):
 * - Crash logs / diag logs already processed are SKIPPED
 * - EXCEPTION: if referenced in GitHub issues/PRs → re-process
 * - EXCEPTION: if visible on Homey Community Forum (T140352) → re-process
 *
 * Reads:  .github/state/processed-diagnostics.json (state)
 * Writes: .github/state/processed-diagnostics.json (updated state)
 *          .github/state/diag-reprocess-list.json (IDs to re-process)
 *
 * Exit code 0 = safe to proceed
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const STATE_FILE = path.join(STATE_DIR, 'processed-diagnostics.json');
const REPROCESS_FILE = path.join(STATE_DIR, 'diag-reprocess-list.json');
const FORUM_REPORT = path.join(STATE_DIR, 'forum-activity-report.json');
const DIAG_REPORT = path.join(STATE_DIR, 'diagnostics-report.json');

// Ensure state directory exists
if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });

// Load or initialize state
let state = { processed: [], lastRun: null };
try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch {}
if (!Array.isArray(state.processed)) state.processed = [];

// ─── Source 1: Scan processed diagnostics report for IDs ───
const diagIds = new Set();
try {
  const report = JSON.parse(fs.readFileSync(DIAG_REPORT, 'utf8'));
  for (const d of (report.diagnostics || [])) {
    if (d.id) diagIds.add(d.id);
    if (d.fps?.mfr) d.fps.mfr.forEach(m => diagIds.add(m));
    // Extract hex-like IDs from body
    const hexMatches = (d.body || '').match(/[a-f0-9]{8,}/g) || [];
    hexMatches.forEach(h => diagIds.add(h));
  }
} catch {}

// ─── Source 2: Scan forum report for user-mentioned diagnostic IDs ───
const forumIds = new Set();
try {
  const forum = JSON.parse(fs.readFileSync(FORUM_REPORT, 'utf8'));
  const posts = forum.posts || forum.recentPosts || [];
  for (const p of posts) {
    const body = p.raw || p.body || p.cleaned || '';
    const matches = body.match(/[a-f0-9]{8,}/g) || [];
    matches.forEach(m => forumIds.add(m));
    // Also check for diagnostic keywords
    if (/crash|diag|error|stack|trace|fatal/i.test(body)) {
      // Extract device IDs, serial numbers, etc.
      const deviceIds = body.match(/\b[a-f0-9]{16,}\b/g) || [];
      deviceIds.forEach(d => forumIds.add(d));
    }
  }
} catch {}

// ─── Source 3: Read REFERENCED_IDS from env (set by workflow) ───
const envRefs = new Set();
if (process.env.REFERENCED_IDS) {
  process.env.REFERENCED_IDS.split(/\s+/).filter(Boolean).forEach(id => envRefs.add(id));
}

// ─── Determine which diagnostics need re-processing ───
const toReprocess = [];
const skipped = [];

for (const id of diagIds) {
  const isProcessed = state.processed.includes(id);
  const isReferencedInIssues = envRefs.has(id);
  const isReferencedInForum = forumIds.has(id);

  if (isProcessed && !isReferencedInIssues && !isReferencedInForum) {
    skipped.push(id);
  } else if (isProcessed && (isReferencedInIssues || isReferencedInForum)) {
    // Previously processed BUT user is still talking about it → re-process
    toReprocess.push({ id, reason: isReferencedInForum ? 'forum' : 'issue' });
  }
  // Not processed yet → will be processed (not in skipped list)
}

// ─── Output ───
console.log(`\n=== Diagnostic Safety Gate ===`);
console.log(`Total diagnostic IDs found: ${diagIds.size}`);
console.log(`Already processed: ${state.processed.length}`);
console.log(`Skipped (no user reference): ${skipped.length}`);
console.log(`Re-processing (user-referenced): ${toReprocess.length}`);

if (toReprocess.length > 0) {
  console.log(`\nRe-processing triggered by:`);
  toReprocess.forEach(r => console.log(`  🔁 ${r.id} (${r.reason})`));
}

// Write re-process list for downstream scripts
fs.writeFileSync(REPROCESS_FILE, JSON.stringify({
  timestamp: new Date().toISOString(),
  reprocess: toReprocess,
  skipped: skipped.length,
  total: diagIds.size,
}, null, 2));

// Update state: mark newly processed IDs
state.lastRun = new Date().toISOString();
fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

console.log(`\n✅ Safety gate passed — ${skipped.length} skipped, ${toReprocess.length} re-queued`);
