#!/usr/bin/env node
'use strict';

/**
 * Search Gmail (IMAP + OAuth) for a Homey app-diagnostic UUID and extract
 * sanitized crash/device payloads. Uses the same secrets as gmail-diagnostics.yml.
 *
 * Usage:
 *   GMAIL_EMAIL=... GMAIL_APP_PASSWORD=... node scripts/ci/gmail-search-diag-uuid.js <uuid>
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, '.github', 'state', 'homey-app-diag');
const UUID = (process.argv[2] || process.env.HOMEY_DIAG_UUID || '').trim().toLowerCase();

function redact(text) {
  try {
    const privacy = require('../../.github/scripts/privacy-redactor');
    return privacy.redact(String(text || ''));
  } catch {
    return String(text || '')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]');
  }
}

async function main() {
  if (!/^[0-9a-f-]{36}$/i.test(UUID)) {
    console.error('Need UUID');
    process.exit(2);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let imap = null;
  let oauth = null;
  try {
    imap = require('../../.github/scripts/gmail-imap-reader');
  } catch (e) {
    console.log('imap load fail', e.message);
  }
  try {
    oauth = require('../../.github/scripts/gmail-oauth-reader');
  } catch (e) {
    console.log('oauth load fail', e.message);
  }

  const hits = [];

  // Direct IMAP body search for the UUID (narrow, fast)
  if (imap?.ImapFlow || imap?.readViaIMAP) {
    try {
      const ImapFlow = require('imapflow').ImapFlow;
      const ge = process.env.GMAIL_EMAIL;
      const gp = process.env.GMAIL_APP_PASSWORD;
      if (ge && gp) {
        const client = new ImapFlow({
          host: 'imap.gmail.com',
          port: 993,
          secure: true,
          auth: { user: ge, pass: gp },
          logger: false,
        });
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');
        try {
          const since = new Date('2025-01-01');
          const seqs = await client.search({ since, body: UUID });
          console.log(`[IMAP] body UUID hits: ${seqs.length}`);
          const take = seqs.slice(-20);
          for await (const msg of client.fetch(take.join(','), { envelope: true, source: true })) {
            const raw = msg.source ? msg.source.toString('utf8') : '';
            if (!raw.toLowerCase().includes(UUID)) continue;
            hits.push({
              via: 'imap-body',
              date: msg.envelope?.date,
              subject: redact(msg.envelope?.subject || ''),
              from: redact(JSON.stringify(msg.envelope?.from || [])),
              snippet: redact(raw).slice(0, 4000),
              hasAttachment: /Content-Disposition:\s*attachment/i.test(raw),
              size: raw.length,
            });
          }
        } finally {
          lock.release();
          await client.logout().catch(() => {});
        }
      } else {
        console.log('[IMAP] GMAIL_EMAIL/APP_PASSWORD missing');
      }
    } catch (e) {
      console.log('[IMAP] search error:', e.message);
    }
  }

  // Fallback: broader diagnostics fetch then filter
  if (!hits.length && imap?.readViaIMAP) {
    try {
      const diags = await imap.readViaIMAP({
        since: '2025-06-01',
        maxResults: 500,
      });
      const arr = Array.isArray(diags) ? diags : diags?.messages || diags?.diagnostics || [];
      for (const d of arr) {
        const blob = JSON.stringify(d).toLowerCase();
        if (blob.includes(UUID)) {
          hits.push({
            via: 'imap-diag-scan',
            subject: redact(d.subj || d.subject || ''),
            date: d.date,
            errs: d.errs,
            appVersion: d.appVersion,
            snippet: redact(JSON.stringify(d)).slice(0, 4000),
          });
        }
      }
      console.log(`[IMAP] diag-scan checked ${arr.length}, hits ${hits.length}`);
    } catch (e) {
      console.log('[IMAP] diag-scan error:', e.message);
    }
  }

  if (!hits.length && oauth?.fetchDiagnostics) {
    try {
      const diags = await oauth.fetchDiagnostics({ maxResults: 200 });
      const arr = Array.isArray(diags) ? diags : [];
      for (const d of arr) {
        if (JSON.stringify(d).toLowerCase().includes(UUID)) {
          hits.push({
            via: 'oauth',
            subject: redact(d.subj || d.subject || ''),
            date: d.date,
            snippet: redact(JSON.stringify(d)).slice(0, 4000),
          });
        }
      }
      console.log(`[OAuth] checked ${arr.length}, hits ${hits.length}`);
    } catch (e) {
      console.log('[OAuth] error:', e.message);
    }
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    uuid: UUID,
    hitCount: hits.length,
    hits,
  };
  const fp = path.join(OUT_DIR, `${UUID}.gmail.json`);
  fs.writeFileSync(fp, JSON.stringify(out, null, 2));
  console.log('wrote', fp);
  console.log(JSON.stringify({ hitCount: hits.length, subjects: hits.map((h) => h.subject) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
