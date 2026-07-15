'use strict';

/**
 * fix-double-prefix-flow-ids.js — v9.0.263 (P64.1)
 *
 * Several driver.flow.compose.json files have flow card IDs with
 * double prefixes (e.g. `bulb_rgbw_bulb_rgbw_turn_on`). The driver.js
 * files reference these wrong IDs, causing "Invalid Flow Card ID" crashes
 * (23 cards, 2-7x each per Gmail diagnostics 2026-07-15).
 *
 * Root cause: some auto-scaffolder prepended the driver ID twice to a
 * previously-correct id. We strip the duplicate prefix to produce the
 * correct id (e.g. `bulb_rgbw_bulb_rgbw_turn_on` → `bulb_rgbw_turn_on`).
 *
 * Idempotent — running twice has no effect.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function walkDriverFlowFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDriverFlowFiles(p, out);
    else if (e.name === 'driver.flow.compose.json') out.push(p);
  }
  return out;
}

function fixDoublePrefixId(id, driverId) {
  // Pattern 1: foo_bar_foo_bar_* → foo_bar_*
  if (driverId && id.startsWith(driverId + '_' + driverId + '_')) {
    return id.slice(driverId.length + 1);
  }

  // Pattern 2: foo_foo_* → foo_*
  if (driverId && id.startsWith(driverId + '_') && id.length > driverId.length + 1) {
    const rest = id.slice(driverId.length + 1);
    if (rest.startsWith(driverId + '_')) {
      return rest;
    }
  }

  // Pattern 3: contains "_smart_<X>_" where <X> duplicates the class
  // immediately before "_smart_". This is the canonical "smart" bug.
  if (id.includes('_smart_')) {
    const idx = id.indexOf('_smart_');
    const before_smart = id.slice(0, idx);
    const after_smart = id.slice(idx + '_smart_'.length);
    const beforeParts = before_smart.split('_');
    for (let k = 1; k <= Math.min(3, beforeParts.length); k++) {
      const classBefore = beforeParts.slice(-k).join('_');
      if (after_smart.startsWith(classBefore + '_')) {
        const rest = after_smart.slice(classBefore.length + 1);
        return `${before_smart}_${rest}`;
      }
    }
    // Fallback: try largest class match (k from MAX to 1)
    const parts = after_smart.split('_');
    for (let k = Math.min(3, parts.length - 1); k >= 1; k--) {
      const rest = parts.slice(k).join('_');
      const candidate = `${before_smart}_${rest}`;
      if (candidate.length < id.length && driverId && candidate.startsWith(driverId)) {
        return candidate;
      }
    }
  }

  // Pattern 4: A_B + B duplicate — e.g. `bulb_rgb_rgb_turn_on` should be
  // `bulb_rgb_turn_on` (the residue of a previously-incorrect
  // `_smart_bulb_rgb_` removal that left `bulb_rgb` + extra `rgb_`)
  if (driverId) {
    const parts = id.split('_');
    for (let i = 0; i < parts.length - 2; i++) {
      if (parts[i + 2] === parts[i + 1]) {
        const fixed = [...parts.slice(0, i + 2), ...parts.slice(i + 3)].join('_');
        if (fixed.length < id.length && driverId && fixed.startsWith(driverId)) {
          return fixed;
        }
      }
    }
  }

  return id;
}

module.exports = { fixDoublePrefixId };

if (require.main === module) {
  function fixFlowFile(fp) {
    const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const driverId = path.basename(path.dirname(fp));
    let changed = 0;
    for (const list of ['actions', 'triggers', 'conditions']) {
      for (const card of (j[list] || [])) {
        if (!card.id) continue;
        const orig = card.id;
        const fixed = fixDoublePrefixId(orig, driverId);
        if (fixed !== orig) {
          card.id = fixed;
          changed++;
        }
      }
    }
    for (const list of ['actions', 'triggers', 'conditions']) {
      const seen = new Set();
      j[list] = (j[list] || []).filter(card => {
        if (!card.id) return true;
        if (seen.has(card.id)) {
          changed++;
          return false;
        }
        seen.add(card.id);
        return true;
      });
    }
    if (changed > 0) {
      fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n');
    }
    return changed;
  }

  function fixDriverJsRefs(driverDir) {
    const driverId = path.basename(driverDir);
    let totalChanged = 0;
    for (const e of fs.readdirSync(driverDir, { withFileTypes: true })) {
      if (!e.isFile() || !e.name.endsWith('.js')) continue;
      const p = path.join(driverDir, e.name);
      const orig = fs.readFileSync(p, 'utf8');
      const re1 = new RegExp(`(get(?:Action|Trigger|Condition)Card\\(['"])${driverId}_${driverId}_`, 'g');
      const matches1 = orig.match(re1);
      let s = orig;
      if (matches1) s = s.replace(re1, `$1${driverId}_`);
      const re2 = new RegExp('(get(?:Action|Trigger|Condition)Card\\([\\\'"\\\'\\\'"][^\\\'\\\'"]+?)_smart_[^_\\\'\\\'"]+_', 'g');
      const matches2 = s.match(re2);
      if (matches2) s = s.replace(re2, '$1_');
      // Pattern 3: A_B + B duplicate — e.g. 'foo_bar_bar_x' => 'foo_bar_x'
      const re3b = /(get(?:Action|Trigger|Condition)Card\(['"])([^'"]+)(['"])/g;
      s = s.replace(re3b, (match, pre, id, post) => {
        const parts = id.split('_');
        for (let i = 0; i < parts.length - 2; i++) {
          if (parts[i + 2] === parts[i + 1]) {
            const fixed = [...parts.slice(0, i + 2), ...parts.slice(i + 3)].join('_');
            if (fixed.length < id.length) {
              totalChanged++;
              return pre + fixed + post;
            }
          }
        }
        return match;
      });
      if (s !== orig) {
        fs.writeFileSync(p, s);
        totalChanged += (matches1?.length || 0) + (matches2?.length || 0);
      }
    }
    return totalChanged;
  }

  console.log('Fixing double-prefix flow card IDs (P64.1)...');
  const files = walkDriverFlowFiles(DRIVERS_DIR);
  let total = 0;
  for (const f of files) {
    const c = fixFlowFile(f);
    if (c > 0) {
      console.log(`  ${path.relative(ROOT, f)}: fixed ${c} ID(s)`);
      total += c;
    }
    const dir = path.dirname(f);
    const js = fixDriverJsRefs(dir);
    if (js > 0) {
      console.log(`  ${path.relative(ROOT, dir)}/*.js: fixed ${js} reference(s)`);
      total += js;
    }
  }
  console.log(`\nTotal fixed: ${total}`);
  process.exit(0);
}
