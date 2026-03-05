#!/usr/bin/env node
'use strict';
// v5.11.28: Reply Quality Gate — validates bot replies before posting
// Prevents: HOBEIAN bug (not found for supported), wrong driver names, missed FPs, truncated FP misses
const fs=require('fs'),path=require('path');
const{buildFullIndex,extractAllFP,fuzzyMatchFPs}=require('./load-fingerprints');
const DDIR=path.join(__dirname,'..','..','drivers');

/**
 * Validate a draft reply against actual driver database.
 * Returns {valid:bool, warnings:string[], corrected:string|null}
 */
function validateReply(replyText, originalPostText) {
  const {mfrIdx, pidIdx, allMfrs, allPids} = buildFullIndex(DDIR);
  const warnings = [];
  let corrected = null;

  // 1. Check for "not found"/"not supported" claims
  const notFoundClaims = replyText.match(/not (?:yet )?(?:found|supported|recognized|implemented|available)/gi) || [];
  if (notFoundClaims.length) {
    // Extract FPs mentioned in the reply as "not found"
    const replyFPs = extractAllFP(replyText, allMfrs, allPids);
    const postFPs = extractAllFP(originalPostText, allMfrs, allPids);
    const allMentioned = [...new Set([...replyFPs.mfr, ...replyFPs.pid, ...postFPs.mfr, ...postFPs.pid])];

    for (const fp of allMentioned) {
      const inMfr = mfrIdx.has(fp);
      const inPid = pidIdx.has(fp);
      if (inMfr || inPid) {
        const drivers = inMfr ? mfrIdx.get(fp) : pidIdx.get(fp);
        warnings.push(`WRONG: Reply says "not found" but \`${fp}\` IS supported in: ${drivers.join(', ')}`);
      }
    }
  }

  // 2. Check for invented driver names
  const driverMentions = replyText.match(/(?:pair as|select|driver|type)[:\s]*["'`]*([a-z_]+(?:_\d+)?gang|[a-z_]+_sensor|[a-z_]+_dimmer|[a-z_]+thermostat)/gi) || [];
  const validDrivers = new Set(fs.readdirSync(DDIR).filter(d => fs.existsSync(path.join(DDIR, d, 'driver.compose.json'))));
  for (const match of driverMentions) {
    const name = match.replace(/.*["'`]/, '').replace(/["'`].*/, '').trim().toLowerCase();
    // Fuzzy check — allow partial matches
    const found = [...validDrivers].some(d => d.includes(name) || name.includes(d));
    if (!found && name.length > 3) {
      warnings.push(`SUSPICIOUS: Mentioned driver "${name}" not found in ${validDrivers.size} drivers`);
    }
  }

  // 3. Check for FPs in original post that reply completely ignores
  const postFPs = extractAllFP(originalPostText, allMfrs, allPids);
  const replyFPs = extractAllFP(replyText, allMfrs, allPids);
  for (const m of postFPs.mfr) {
    if (!replyText.includes(m) && mfrIdx.has(m)) {
      warnings.push(`MISSED: Post contains \`${m}\` (supported in ${mfrIdx.get(m).join(',')}) but reply doesn't mention it`);
    }
  }
  for (const p of postFPs.pid) {
    if (!replyText.includes(p) && pidIdx.has(p)) {
      warnings.push(`MISSED: Post contains \`${p}\` (supported in ${pidIdx.get(p).join(',')}) but reply doesn't mention it`);
    }
  }

  // 4. Fuzzy match check: if reply says "not found" but a close FP exists
  const notFoundFPs = [];
  for (const m of [...postFPs.mfr, ...replyFPs.mfr]) {
    if (!mfrIdx.has(m)) notFoundFPs.push(m);
  }
  if (notFoundFPs.length) {
    const fuzzy = fuzzyMatchFPs(notFoundFPs, allMfrs);
    for (const {original, match} of fuzzy) {
      const drivers = mfrIdx.get(match) || [];
      if (drivers.length) {
        warnings.push(`FUZZY: \`${original}\` looks like \`${match}\` (supported in ${drivers.join(',')})`);
      }
    }
  }

  // 5. Cross-reference with external DBs if available
  try {
    const extData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'state', 'external-sources-data.json'), 'utf8'));
    if (extData && extData.allDevices) {
      const extSet = new Set(extData.allDevices.map(d => d.fp));
      for (const m of notFoundFPs) {
        if (extSet.has(m)) {
          warnings.push(`EXTERNAL: \`${m}\` found in Z2M/ZHA/deCONZ — reply should mention it's on the radar`);
        }
      }
    }
  } catch {}

  // 6. Auto-correct if warnings found
  if (warnings.length) {
    const supported = [];
    const fuzzySupported = [];
    for (const m of [...postFPs.mfr, ...postFPs.pid]) {
      const d = mfrIdx.get(m) || pidIdx.get(m);
      if (d) supported.push({fp: m, drivers: d});
    }
    // Also add fuzzy matches
    const fuzzy = fuzzyMatchFPs(notFoundFPs, allMfrs);
    for (const {original, match} of fuzzy) {
      const d = mfrIdx.get(match);
      if (d) fuzzySupported.push({fp: match, from: original, drivers: d});
    }
    if (supported.length || fuzzySupported.length) {
      const parts = [];
      const hasMultiDriver = supported.some(s => s.drivers.length > 1);
      if (supported.length === 1) {
        const s = supported[0];
        parts.push(s.fp + ' is already in the app — pair it as **' + s.drivers[0] + '**' + (s.drivers.length > 1 ? ' (or ' + s.drivers.slice(1).join(', ') + ' depending on productId)' : '') + '.');
      } else if (supported.length > 1) {
        const items = supported.map(s => s.fp + ' (' + s.drivers.join('/') + ')');
        parts.push('Those are already in the app: ' + items.join(', ') + '.');
      }
      if (hasMultiDriver) parts.push('The correct driver depends on the productId (TS0001, TS0002, etc).');
      if (fuzzySupported.length) {
        const items = fuzzySupported.map(s => s.from + ' looks like ' + s.fp + ' which is under ' + s.drivers[0]);
        parts.push(items.join('; ') + ' — might be a typo in the fingerprint.');
      }
      parts.push('Just remove and re-pair, make sure you pick the right device type.');
      corrected = parts.join(' ');
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
    corrected,
    stats: {mfrs: mfrIdx.size, pids: pidIdx.size}
  };
}

// CLI mode: validate a reply file or stdin
if (require.main === module) {
  const args = process.argv.slice(2);
  const replyFile = args[0];
  const postFile = args[1];
  if (!replyFile) {
    console.log('Usage: reply-quality-gate.js <reply.txt> [original-post.txt]');
    process.exit(0);
  }
  const reply = fs.readFileSync(replyFile, 'utf8');
  const post = postFile ? fs.readFileSync(postFile, 'utf8') : '';
  const result = validateReply(reply, post);
  console.log('=== Reply Quality Gate ===');
  console.log('Valid:', result.valid);
  console.log('Index:', result.stats.mfrs, 'mfrs,', result.stats.pids, 'pids');
  if (result.warnings.length) {
    console.log('\nWarnings:');
    for (const w of result.warnings) console.log('  ⚠', w);
  }
  if (result.corrected) {
    console.log('\nSuggested correction:\n---');
    console.log(result.corrected);
    console.log('---');
  }
  process.exit(result.valid ? 0 : 1);
}

module.exports = {validateReply};
