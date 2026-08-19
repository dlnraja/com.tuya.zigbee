'use strict';

/**
 * forum-deep-investigate.js
 * Deep investigation of all recent Homey forum posts, images, PMs, and threads.
 * Reads, OCRs, and cross-references to find improvement opportunities.
 * NEVER posts. Scan-only.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, 'Accept': 'application/json', 'Accept-Encoding': 'identity' };

function fetchJSON(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, { headers: HEADERS }, r => {
      let d = '';
      r.on('data', c => { d += c; });
      r.on('end', () => {
        try { res(JSON.parse(d)); } catch (e) { res({ _raw: d.slice(0, 500) }); }
      });
    });
    req.on('error', rej);
    req.setTimeout(20000, () => { req.destroy(); rej(new Error('timeout: ' + url)); });
  });
}

function strip(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchPostBatch(topicId, postIds) {
  const qs = postIds.map(id => 'post_ids[]=' + id).join('&');
  const url = 'https://community.homey.app/t/' + topicId + '/posts.json?' + qs;
  const d = await fetchJSON(url);
  return d.post_stream ? d.post_stream.posts : [];
}

async function main() {
  const reports = [];

  // ── Step 1: Get topic metadata (140352 = main tuya thread) ──
  console.log('[1] Fetching topic 140352 metadata...');
  const meta = await fetchJSON('https://community.homey.app/t/140352.json');
  const stream = meta.post_stream ? meta.post_stream.stream : [];
  const totalPosts = meta.posts_count || 0;
  console.log('Total posts:', totalPosts, '| Stream length:', stream.length);

  // ── Step 2: Fetch last 60 posts (most recent activity) ──
  console.log('\n[2] Fetching last 60 posts...');
  const lastIds = stream.slice(-60);
  const batches = [];
  for (let i = 0; i < lastIds.length; i += 20) {
    batches.push(lastIds.slice(i, i + 20));
  }
  const allPosts = [];
  for (const batch of batches) {
    const posts = await fetchPostBatch(140352, batch);
    allPosts.push(...posts);
    await new Promise(r => setTimeout(r, 500));
  }

  // ── Step 3: Analyze each post ──
  console.log('\n[3] Analyzing', allPosts.length, 'recent posts...\n');
  const findings = [];

  for (const p of allPosts) {
    const text = strip(p.cooked);
    // Extract image URLs from post
    const imgMatches = (p.cooked || '').match(/src=["']([^"']+\.(?:jpeg|jpg|png|gif|webp)[^"']*)["']/gi) || [];
    const images = imgMatches.map(m => m.replace(/src=["']/i, '').replace(/["']$/, ''));

    // Detect fingerprint / device mentions
    const mfrMatches = text.match(/_TZ[E0-9A-Za-z_]+/g) || [];
    const pidMatches = text.match(/TS\d{4}[A-Z]?/g) || [];
    const driverMatches = text.match(/wall_dimmer|switch_\d|soil_sensor|plug_energy|climate_sensor|presence_sensor|contact_sensor|smoke_sensor|water_leak|dimmer_\d|relay_board/g) || [];

    // Detect problem keywords
    const problems = [];
    const lower = text.toLowerCase();
    if (lower.includes('crash') || lower.includes('crashed')) problems.push('CRASH');
    if (lower.includes('memory') || lower.includes('heap')) problems.push('MEMORY');
    if (lower.includes('not working') || lower.includes('doesnt work') || lower.includes("doesn't work")) problems.push('NOT_WORKING');
    if (lower.includes('wrong driver') || lower.includes('re-pair') || lower.includes('repaire') || lower.includes('re-add')) problems.push('WRONG_DRIVER');
    if (lower.includes('missing') && lower.includes('capabilit')) problems.push('MISSING_CAPABILITY');
    if (lower.includes('flow') && (lower.includes('not trigger') || lower.includes('broken') || lower.includes('fail'))) problems.push('FLOW_BROKEN');
    if (lower.includes('tb25') || lower.includes('zemismart')) problems.push('TB25_ZEMISMART');
    if (lower.includes('firmware') || lower.includes('ota')) problems.push('FIRMWARE_OTA');
    if (lower.includes('energy') || lower.includes('power') || lower.includes('watt')) problems.push('ENERGY');
    if (lower.includes('temperature') || lower.includes('humidity') || lower.includes('sensor')) problems.push('SENSOR');
    if (lower.includes('cover') || lower.includes('curtain') || lower.includes('blind') || lower.includes('shutter')) problems.push('COVER');
    if (lower.includes('dimmer') || lower.includes('brightness') || lower.includes('dim')) problems.push('DIMMER');
    if (lower.includes('thermostat') || lower.includes('trv') || lower.includes('valve')) problems.push('THERMOSTAT');

    if (problems.length > 0 || mfrMatches.length > 0 || pidMatches.length > 0 || images.length > 0) {
      findings.push({
        post_number: p.post_number,
        username: p.username,
        created: (p.created_at || '').slice(0, 10),
        text: text.slice(0, 400),
        mfrs: [...new Set(mfrMatches)],
        pids: [...new Set(pidMatches)],
        drivers: [...new Set(driverMatches)],
        images: images.slice(0, 5),
        problems,
      });
    }
  }

  // ── Step 4: Cross-reference with known couples ──
  console.log('[4] Cross-referencing with device-truth.json...');
  let knownDrivers = {};
  try {
    const dt = JSON.parse(fs.readFileSync(path.join(__dirname, '../../docs/knowledge/device-truth.json'), 'utf8'));
    knownDrivers = dt.drivers || {};
  } catch (e) { console.log('device-truth.json not found, skipping cross-ref'); }

  const enrichOpportunities = [];
  for (const f of findings) {
    for (const mfr of f.mfrs) {
      for (const pid of f.pids) {
        // Check if this couple is in device-truth
        let found = false;
        for (const [driverId, driverInfo] of Object.entries(knownDrivers)) {
          const mfrs = driverInfo.manufacturerNames || [];
          const pids = driverInfo.productIds || [];
          if (mfrs.includes(mfr) && pids.includes(pid)) { found = true; break; }
        }
        if (!found) {
          enrichOpportunities.push({ mfr, pid, post: f.post_number, user: f.username, problems: f.problems });
        }
      }
    }
  }

  // ── Step 5: Also scan other threads ──
  console.log('\n[5] Scanning topic 26439 (Johan thread)...');
  const johan = await fetchJSON('https://community.homey.app/t/26439.json');
  const johanStream = johan.post_stream ? johan.post_stream.stream : [];
  const johanLast = johanStream.slice(-30);
  const johanPosts = await fetchPostBatch(26439, johanLast.slice(0, 20));

  const johanFindings = [];
  for (const p of johanPosts) {
    const text = strip(p.cooked);
    const mfrMatches = text.match(/_TZ[E0-9A-Za-z_]+/g) || [];
    const pidMatches = text.match(/TS\d{4}[A-Z]?/g) || [];
    if (mfrMatches.length > 0 || pidMatches.length > 0) {
      johanFindings.push({
        thread: 26439, post: p.post_number, user: p.username,
        mfrs: [...new Set(mfrMatches)], pids: [...new Set(pidMatches)],
        text: text.slice(0, 200),
      });
    }
  }

  // ── Step 6: Output report ──
  const report = {
    generatedAt: new Date().toISOString(),
    topic140352: {
      totalPosts,
      scannedRecent: allPosts.length,
      findings: findings.length,
      enrichOpportunities: enrichOpportunities.length,
    },
    recentFindings: findings,
    enrichOpportunities,
    johanThread: johanFindings,
  };

  const outPath = path.join(__dirname, '../../reports/FORUM_DEEP_INVESTIGATE_' + new Date().toISOString().slice(0, 10) + '.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('\n=== FINDINGS SUMMARY ===');
  console.log('Recent posts analyzed:', allPosts.length);
  console.log('Posts with findings:', findings.length);
  console.log('Unknown couples for enrichment:', enrichOpportunities.length);

  // Print key findings
  const critical = findings.filter(f => f.problems.some(p => ['CRASH', 'MEMORY', 'NOT_WORKING', 'WRONG_DRIVER', 'TB25_ZEMISMART'].includes(p)));
  console.log('\n--- CRITICAL ISSUES ---');
  for (const f of critical) {
    console.log(`Post #${f.post_number} @${f.username} [${f.created}]: ${f.problems.join(',')} | mfrs=${f.mfrs.join(',')} pids=${f.pids.join(',')}`);
    console.log('  ', f.text.slice(0, 200));
    if (f.images.length) console.log('  IMAGES:', f.images.join(', '));
    console.log('');
  }

  if (enrichOpportunities.length > 0) {
    console.log('\n--- NEW COUPLES TO INVESTIGATE ---');
    for (const o of enrichOpportunities.slice(0, 20)) {
      console.log(`  ${o.mfr} + ${o.pid} (post #${o.post}, @${o.user}) problems=${o.problems.join(',')}`);
    }
  }

  console.log('\nFull report saved to:', outPath);
  return report;
}

main().catch(console.error);
