#!/usr/bin/env node
'use strict';

/**
 * Brand-scrub gate for user-facing Homey flow titles/hints.
 * WHY: Community OSS voice — never ship competitor product names in UI.
 * Legacy flow *ids* (hue_*) may remain for Homey flow compatibility.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const FLOW_ROOT = path.join(ROOT, '.homeycompose', 'flow');
const SSOT = path.join(ROOT, 'config', 'architecture', 'smart-features-ssot.json');

const FORBIDDEN = (() => {
  try {
    const j = JSON.parse(fs.readFileSync(SSOT));
    return j.policy?.forbiddenUiTokens || [];
  } catch {
    return ['Hue', 'Philips', 'IKEA', 'Aqara', 'True Tone', 'Natural Light', 'Lutron', 'Ambilight'];
  }
})();

// Word-ish matches in title/hint/titleFormatted only (not id)
const UI_KEYS = new Set(['title', 'hint', 'titleFormatted', 'label', 'description']);

function walk(obj, trail, hits) {
  if (!obj || typeof obj !== 'object') {return;}
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => walk(v, `${trail}[${i}]`, hits));
    return;
  }
  for (const [k, v] of Object.entries(obj)) {
    const next = trail ? `${trail}.${k}` : k;
    if (typeof v === 'string' && UI_KEYS.has(k.split('.').pop()) === false) {
      // only scan when parent key is a UI key OR we're inside a locale object under UI key
    }
    if (typeof v === 'string') {
      const parentUi = trail.split('.').some((p) => UI_KEYS.has(p));
      if (parentUi || UI_KEYS.has(k)) {
        for (const token of FORBIDDEN) {
          const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (re.test(v)) {
            hits.push({ path: next, token, sample: v.slice(0, 120) });
          }
        }
      }
    } else if (v && typeof v === 'object') {
      walk(v, next, hits);
    }
  }
}

function scanDir(dir, hits) {
  if (!fs.existsSync(dir)) {return;}
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {scanDir(p, hits); continue;}
    if (!ent.name.endsWith('.json')) {continue;}
    try {
      const j = JSON.parse(fs.readFileSync(p));
      walk(j, path.relative(ROOT, p), hits);
    } catch { /* skip */ }
  }
}

const hits = [];
scanDir(FLOW_ROOT, hits);

if (hits.length) {
  console.error(`smart-features-brand-scrub-gate: FAIL (${hits.length} hits)`);
  for (const h of hits.slice(0, 40)) {
    console.error(`  [${h.token}] ${h.path}: ${h.sample}`);
  }
  process.exit(1);
}

console.log('smart-features-brand-scrub-gate: OK (no commercial UI tokens in .homeycompose/flow)');
process.exit(0);
