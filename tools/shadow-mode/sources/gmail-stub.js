/**
 * sources/gmail-stub.js
 *
 * Gmail IMAP adapter. Only loads if GMAIL_CREDS env var is set (JSON: {user, appPassword}).
 * Uses imapflow (if installed) or a simple imaps connection.
 *
 * NOTE: imapflow is NOT installed by default. This is a STUB that will throw if called
 * without the dependency. To enable, run: `npm install imapflow` in master/.
 *
 * App cible: BOTH master + stable.
 */

'use strict';

let _imapflow = null;

function getImapflow() {
  if (_imapflow !== null) return _imapflow;
  try {
    _imapflow = require('imapflow');
  } catch (e) {
    _imapflow = false;
  }
  return _imapflow;
}

async function pullFromGmail(credsJson) {
  const imapflow = getImapflow();
  if (!imapflow) {
    throw new Error('imapflow not installed. Run `npm install imapflow` to enable Gmail diagnostics.');
  }

  let creds;
  try { creds = JSON.parse(credsJson); } catch (e) { throw new Error('GMAIL_CREDS must be valid JSON'); }

  const client = new imapflow.Client({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: creds.user, pass: creds.appPassword },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const tickets = [];
    // Search for emails with subject starting with [Homey] or [DIAG]
    for await (const msg of client.fetch(
      { subject: ['[Homey]', '[DIAG]', '[DIAGNOSTIC]'] },
      { envelope: true, source: true, uid: true }
    )) {
      const subj = msg.envelope.subject || '';
      const from = msg.envelope.from?.[0]?.address || '';
      const date = msg.envelope.date;
      const source = msg.source.toString('utf8');
      tickets.push({
        id: `gmail-${msg.uid}`,
        source: 'gmail-imap',
        title: subj,
        body: source.substring(0, 5000),
        mfr: extractMfr(subj + ' ' + source),
        deviceIds: extractDeviceIds(subj + ' ' + source),
        status: 'pending',
        from,
        date,
      });
    }
    return tickets;
  } finally {
    lock.release();
    await client.logout();
  }
}

function extractMfr(text) {
  const m = text.match(/_(TZ\d|TZE\d|TYZB\d|TYST\d|Z[A-Z]{2})_[a-zA-Z0-9]+/);
  return m ? m[0] : null;
}

function extractDeviceIds(text) {
  const matches = text.match(/TS\d{4}[a-zA-Z]?/g);
  return matches ? [...new Set(matches)] : [];
}

module.exports = { pullFromGmail };
