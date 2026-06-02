#!/usr/bin/env node
'use strict';
// homey-domain-email-dumper.js
// Dumps ALL emails FROM Homey/Athom domains via IMAP — no keyword filtering.
// Strategy: search by sender domain, not by content.
// Output: .github/state/homey-email-dump.json + homey-build-failures.json

const fs = require('fs');
const path = require('path');

// Try to load imapflow
let ImapFlow;
try { ImapFlow = require('imapflow').ImapFlow; }
catch { console.error('imapflow not installed. Run: npm install imapflow --no-save'); process.exit(1); }

const ROOT = path.join(__dirname, '..', '..');
const SD   = path.join(ROOT, '.github', 'state');

// ─── Homey/Athom sender domains ───────────────────────────────────────────────
// All emails FROM these domains are dumped — no keyword filter needed
const HOMEY_DOMAINS = [
  '@homey.app',
  '@athom.com',
  '@noreply.homey.app',
  'community.homey.app',
  'noreply@homey.app',
  'noreply@athom.com',
  'support@athom.com',
  'support@homey.app',
  'dev@athom.com',
  'developer@athom.com',
  'info@athom.com',
  'no-reply@athom.com',
];

// Additional: GitHub Actions build notifications for our repo
const BUILD_SENDERS = [
  'notifications@github.com',
  'github-actions[bot]@users.noreply.github.com',
  'noreply@github.com',
];

// ─── MIME parsing helpers (inline — no extra deps) ───────────────────────────
function decodeRFC2047(str) {
  if (!str) return '';
  return str.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, enc, data) => {
    try {
      if (enc.toUpperCase() === 'B') return Buffer.from(data, 'base64').toString('utf8');
      if (enc.toUpperCase() === 'Q') return data.replace(/=([0-9A-Fa-f]{2})/g, (__, hex) =>
        String.fromCharCode(parseInt(hex, 16))).replace(/_/g, ' ');
    } catch {}
    return data;
  });
}

function decodeBody(raw, encoding) {
  if (!raw) return '';
  const enc = (encoding || '').toLowerCase();
  if (enc === 'base64') { try { return Buffer.from(raw.replace(/\s/g,''),'base64').toString('utf8'); } catch { return raw; } }
  if (enc === 'quoted-printable') return raw.replace(/=(\r?\n)/g,'').replace(/=([0-9A-Fa-f]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
  return raw;
}

function extractText(source) {
  if (!source) return '';
  const raw = source.toString('utf8');
  // Split headers / body
  const sep = raw.search(/\r?\n\r?\n/);
  if (sep === -1) return raw.substring(0, 2000);
  const headers = raw.substring(0, sep).toLowerCase();
  const body    = raw.substring(sep + 2);
  const ct  = (headers.match(/content-type:\s*([^\r\n]+)/i) || [])[1] || '';
  const cte = (headers.match(/content-transfer-encoding:\s*(\S+)/i) || [])[1] || '';
  if (!ct.includes('multipart')) return decodeBody(body, cte).substring(0, 8000);
  // Multipart: get first text/plain
  const bm = ct.match(/boundary=["']?([^"';\s]+)["']?/i);
  if (!bm) return body.substring(0, 4000);
  const parts = body.split('--' + bm[1]);
  for (const p of parts) {
    const ph = p.substring(0, p.search(/\r?\n\r?\n/)).toLowerCase();
    const pb = p.substring(p.search(/\r?\n\r?\n/) + 2);
    const pct = (ph.match(/content-type:\s*([^\r\n]+)/i) || [])[1] || '';
    const pcte = (ph.match(/content-transfer-encoding:\s*(\S+)/i) || [])[1] || '';
    if (pct.includes('text/plain')) return decodeBody(pb, pcte).substring(0, 8000);
  }
  // Fallback: strip HTML tags
  return body.replace(/<[^>]+>/g,' ').substring(0, 4000);
}

// ─── AggregateError / build failure patterns ──────────────────────────────────
const BUILD_FAILURE_PATTERNS = [
  /AggregateError/i,
  /Processing failed/i,
  /publish.*failed/i,
  /build.*failed/i,
  /validation.*failed/i,
  /workflow.*failed/i,
  /homey app validate/i,
  /5mb.*limit/i,
  /manufacturerName.*empty/i,
  /manufacturerName.*invalid/i,
  /missing.*capability/i,
  /UNSUPPORTED_ATTRIBUTE/i,
  /heap.*limit/i,
  /out of memory/i,
  /FATAL.*error/i,
];

function detectBuildFailure(subj, body) {
  const text = (subj + ' ' + body).toLowerCase();
  const matches = BUILD_FAILURE_PATTERNS.filter(p => p.test(subj + ' ' + body));
  return {
    isBuildFailure: matches.length > 0,
    patterns: matches.map(p => p.toString()),
    isAggregateError: /AggregateError/i.test(subj + ' ' + body),
    isPublishFail: /publish.*failed|processing failed/i.test(subj + ' ' + body),
  };
}

// ─── Fingerprint extractor ─────────────────────────────────────────────────────
function extractFPs(text) {
  const mfr = [...new Set((text.match(/(_TZ[A-Za-z0-9]{2,4}_[A-Za-z0-9]{6,}|_TYZB\d{2}_[A-Za-z0-9]+|_TYST\d{2}_[A-Za-z0-9]+)/g) || []))];
  const pid = [...new Set((text.match(/\b(TS[0-9A-Fa-f]{4}[A-Z]?)\b/g) || []))];
  return { mfr, pid };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const email    = process.env.GMAIL_EMAIL || process.env.HOMEY_EMAIL;
  const password = process.env.GMAIL_APP_PASSWORD || process.env.HOMEY_PASSWORD;
  
  if (!email || !password) {
    console.error('❌ IMAP credentials missing.');
    console.error('   Set GMAIL_EMAIL + GMAIL_APP_PASSWORD (or HOMEY_EMAIL + HOMEY_PASSWORD)');
    console.error('   These are your GitHub Secrets — run locally with them as env vars.');
    process.exit(1);
  }

  // Date range: go back 6 months for comprehensive history
  const since = new Date(Date.now() - 180 * 24 * 3600 * 1000);
  const sinceStr = since.toISOString().split('T')[0];

  console.log(`📧 Connecting to Gmail IMAP as ${email}...`);
  console.log(`📅 Fetching since: ${sinceStr}`);

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: password },
    logger: false,
    socketTimeout: 120000,
    connectionTimeout: 30000,
    tls: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ IMAP connected');

  // Try mailboxes
  const MAILBOXES = ['[Gmail]/All Mail', '[Gmail]/Tous les messages', 'INBOX'];
  let lock = null;
  for (const mb of MAILBOXES) {
    try { lock = await client.getMailboxLock(mb); console.log(`📂 Using mailbox: ${mb}`); break; }
    catch (e) { console.log(`   Skip ${mb}: ${e.message}`); }
  }
  if (!lock) { await client.logout(); console.error('No usable mailbox'); process.exit(1); }

  const allEmails = [];
  const seqSet = new Set();

  try {
    // Strategy: search by FROM domain — dump ALL Homey/Athom emails
    console.log('\n🔍 Searching by sender domains (no keyword filter)...');
    
    const searchSenders = [
      ...HOMEY_DOMAINS,
      ...BUILD_SENDERS,
    ];

    for (const sender of searchSenders) {
      try {
        const results = await client.search({ since: since, from: sender });
        results.forEach(s => seqSet.add(s));
        if (results.length > 0) console.log(`  📬 ${sender}: ${results.length} emails`);
      } catch (e) { /* some IMAP servers don't support all FROM patterns */ }
    }

    // Also search our repo name in subject (GitHub workflow notifications)
    const repoSearches = ['com.tuya.zigbee', 'com.dlnraja', 'tuya zigbee', 'AggregateError', 'build failed', 'publish failed', 'athom'];
    for (const kw of repoSearches) {
      try {
        const results = await client.search({ since: since, subject: kw });
        results.forEach(s => seqSet.add(s));
        if (results.length > 0) console.log(`  📧 Subject:"${kw}": ${results.length} emails`);
      } catch {}
    }

    console.log(`\n📊 Total unique messages to fetch: ${seqSet.size}`);
    if (seqSet.size === 0) { console.log('⚠️  No Homey/Athom emails found in the last 6 months.'); }

    const seqs = [...seqSet].sort((a, b) => b - a); // Newest first
    const BATCH = 50;
    
    for (let i = 0; i < seqs.length; i += BATCH) {
      const batch = seqs.slice(i, i + BATCH);
      const range = batch.join(',');
      for await (const msg of client.fetch(range, { envelope: true, source: true })) {
        try {
          const subj = decodeRFC2047(msg.envelope?.subject || '');
          const fromRaw = msg.envelope?.from?.[0] || {};
          const from = fromRaw.address || '';
          const fromName = decodeRFC2047(fromRaw.name || '');
          const date = msg.envelope?.date?.toISOString() || '';
          const body = extractText(msg.source);
          const fps = extractFPs(subj + ' ' + body);
          const buildFail = detectBuildFailure(subj, body);
          
          allEmails.push({
            uid: msg.uid,
            date,
            from,
            fromName,
            subj,
            bodyPreview: body.substring(0, 1000),
            fps,
            buildFail,
            hasHomeyDomain: HOMEY_DOMAINS.some(d => from.includes(d)),
          });
        } catch (e) { /* skip parse errors */ }
      }
      console.log(`  Fetched ${Math.min(i + BATCH, seqs.length)}/${seqs.length}...`);
    }
  } finally {
    lock.release();
  }

  await client.logout();
  console.log(`\n✅ IMAP done: ${allEmails.length} emails fetched`);

  // ─── Save full dump ───────────────────────────────────────────────────────────
  fs.mkdirSync(SD, { recursive: true });
  const dumpFile = path.join(SD, 'homey-email-dump.json');
  fs.writeFileSync(dumpFile, JSON.stringify({ 
    timestamp: new Date().toISOString(), 
    count: allEmails.length,
    emails: allEmails 
  }, null, 2));
  console.log(`💾 Full dump: ${dumpFile}`);

  // ─── Extract build failures ───────────────────────────────────────────────────
  const buildFails = allEmails.filter(e => e.buildFail.isBuildFailure);
  const aggregateErrors = allEmails.filter(e => e.buildFail.isAggregateError);
  const allFPs = [...new Set(allEmails.flatMap(e => e.fps.mfr))];
  const allPIDs = [...new Set(allEmails.flatMap(e => e.fps.pid))];

  const failReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalEmails: allEmails.length,
      buildFailures: buildFails.length,
      aggregateErrors: aggregateErrors.length,
      uniqueFPs: allFPs.length,
      uniquePIDs: allPIDs.length,
    },
    aggregateErrors: aggregateErrors.map(e => ({ date: e.date, subj: e.subj, from: e.from, bodyPreview: e.bodyPreview.substring(0, 500) })),
    buildFailures: buildFails.map(e => ({ date: e.date, subj: e.subj, from: e.from, patterns: e.buildFail.patterns, fps: e.fps })),
    fingerprintsFromEmails: { mfr: allFPs, pid: allPIDs },
  };

  const failFile = path.join(SD, 'homey-build-failures.json');
  fs.writeFileSync(failFile, JSON.stringify(failReport, null, 2));
  console.log(`💾 Build failures: ${failFile}`);

  // ─── Console summary ──────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  HOMEY DOMAIN EMAIL DUMP — RESULTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total emails from Homey/Athom domains: ${allEmails.length}`);
  console.log(`  Build failures detected: ${buildFails.length}`);
  console.log(`  AggregateError mentions: ${aggregateErrors.length}`);
  console.log(`  FPs found in emails: ${allFPs.length} mfr + ${allPIDs.length} pid`);
  if (aggregateErrors.length > 0) {
    console.log('\n  ❌ AGGREGATE ERRORS:');
    aggregateErrors.slice(0, 5).forEach(e => console.log(`    ${e.date} | ${e.subj.substring(0, 60)}`));
  }
  if (allFPs.length > 0) {
    console.log(`\n  📡 Fingerprints from emails (first 10): ${allFPs.slice(0, 10).join(', ')}`);
  }
  console.log('═══════════════════════════════════════════════════════\n');

  return failReport;
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
