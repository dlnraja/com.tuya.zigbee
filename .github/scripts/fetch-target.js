#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ImapFlow } = require('imapflow');
const { parseMIME, htmlToText } = require('./gmail-imap-reader');

const TARGET_ID = '5f100d21-0df6-42f8-a57c-fe6a09285819';
const MBS = ['INBOX', '[Gmail]/All Mail', '[Gmail]/Tous les messages'];

async function tryConnect(user, pass) {
  const c = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
    socketTimeout: 60000,
    connectionTimeout: 30000,
    greetingTimeout: 30000
  });
  c.on('error', err => console.log('[IMAP] Socket event:', err.message));
  await c.connect();
  return c;
}

async function main() {
  const e = process.env.GMAIL_EMAIL || process.env.HOMEY_EMAIL;
  const p = process.env.GMAIL_APP_PASSWORD || process.env.HOMEY_PASSWORD;
  if (!e || !p) {
    console.error('Credentials missing in environment variables GMAIL_EMAIL and GMAIL_APP_PASSWORD');
    process.exit(1);
  }

  console.log(`Connecting to IMAP as ${e}...`);
  let c;
  try {
    c = await tryConnect(e, p);
    console.log('IMAP Connection successful!');
  } catch (err) {
    console.error('Failed to connect:', err.message);
    process.exit(1);
  }

  try {
    let lock = null;
    for (const mb of MBS) {
      try {
        lock = await c.getMailboxLock(mb);
        console.log('Selected Mailbox:', mb);
        break;
      } catch (e2) {
        console.log('Skip mailbox:', mb, e2.message);
        lock = null;
      }
    }

    if (!lock) {
      console.error('Could not lock any mailbox');
      await c.logout();
      process.exit(1);
    }

    const seqSet = new Set();
    console.log(`Searching for messages containing target ID: ${TARGET_ID}...`);
    try {
      const resBody = await c.search({ body: TARGET_ID });
      resBody.forEach(s => seqSet.add(s));
      console.log(`Found ${resBody.length} by body search`);
    } catch (err) {
      console.log('Search body error:', err.message);
    }

    try {
      const resSubj = await c.search({ subject: TARGET_ID });
      resSubj.forEach(s => seqSet.add(s));
      console.log(`Found ${resSubj.length} by subject search`);
    } catch (err) {
      console.log('Search subject error:', err.message);
    }

    const seqs = [...seqSet];
    console.log('Total sequence numbers to fetch:', seqs.length);

    if (seqs.length === 0) {
      console.log('No matching emails found.');
      await lock.release();
      await c.logout();
      process.exit(0);
    }

    const results = [];
    for await (const m of c.fetch(seqs.join(','), { envelope: true, source: true })) {
      const subj = m.envelope?.subject || '';
      const fromAddr = m.envelope?.from?.[0]?.address || '';
      const date = m.envelope?.date?.toISOString() || '';
      let body = '';

      if (m.source) {
        try {
          const mime = parseMIME(m.source);
          if (mime.textPlain) {
            body = mime.textPlain;
          } else if (mime.textHtml) {
            body = htmlToText(mime.textHtml);
          } else {
            body = m.source.toString('utf8');
          }
        } catch {
          body = m.source.toString('utf8');
        }
      }

      results.push({
        id: m.uid || m.seq,
        subject: subj,
        from: fromAddr,
        date: date,
        body: body
      });
    }

    console.log(`Successfully fetched ${results.length} matching email(s).`);

    // Write to a file in the repo
    const outDir = path.join(__dirname, '..', '..', 'diagnostics');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `target-report-${TARGET_ID}.json`);
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`Report written to: ${outFile}`);

    await lock.release();
  } catch (err) {
    console.error('Error during execution:', err.message);
  } finally {
    await c.logout();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
