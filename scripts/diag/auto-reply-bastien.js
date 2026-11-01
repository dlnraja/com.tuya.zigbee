#!/usr/bin/env node
'use strict';
/**
 * P3110 (01/11/2026 Paris): autonomous, deterministic replies to Bastien diagnostics reports.
 * Runs FREE in GitHub Actions (diag-autoreply-bastien.yml), independent of any assistant.
 * Read: Gmail IMAP (GMAIL_EMAIL + GMAIL_APP_PASSWORD). Send: Gmail SMTP with the same app password.
 * Safety:
 *  - only '[com.dlnraja.tuya.zigbee.bastien] Your app has received a Diagnostics Report' from noreply@homey.app
 *  - recipient = the Reply-To <hex>@apps-api.athom.com relay ONLY (never noreply@ / other Athom addresses)
 *  - sends only on a known FIXED signature (config/diag-autoreply-signatures.json), reported version < fixed,
 *    and the fixed build released; otherwise skip + log
 *  - dedup by Log ID (config/diag-autoreply-state.json) AND by an existing reply of ours in the Gmail thread
 *  - cap AUTOREPLY_MAX_PER_DAY (default 5); kill switches config/autonomy-paused[.autoreply]
 *  - dry-run unless AUTOREPLY_SEND=true; no links, no secrets in the body; no AI
 */
const fs = require('fs');
const path = require('path');
const tls = require('tls');

const ROOT = path.resolve(__dirname, '..', '..');
const SIGS = path.join(ROOT, 'config', 'diag-autoreply-signatures.json');
const STATE = path.join(ROOT, 'config', 'diag-autoreply-state.json');
const APP_ID = 'com.dlnraja.tuya.zigbee.bastien';
const SUBJECT = `[${APP_ID}] Your app has received a Diagnostics Report`;
const DAY = 24 * 3600 * 1000;
const MAX_STATE = 500;

function isPaused(root = ROOT) {
  return ['autonomy-paused', 'autonomy-paused.autoreply'].some(f => fs.existsSync(path.join(root, 'config', f)));
}

function isBastienDiag({ from, subject }) {
  const f = String(from || '').toLowerCase();
  const addr = (f.match(/<([^>]+)>/) || [, f])[1].trim();
  return addr === 'noreply@homey.app' && String(subject || '').trim() === SUBJECT;
}

function safeReplyTo(addr) {
  const a = String(addr || '').trim().toLowerCase().replace(/^.*<([^>]+)>.*$/, '$1');
  return /^[0-9a-f]{16,40}@apps-api\.athom\.com$/.test(a) ? a : null;
}

function parseDiag(text) {
  const t = String(text || '').replace(/\r/g, '');
  const field = (name) => { const m = t.match(new RegExp(name + '\\s*\\n+\\s*([^\\n]+)')); return m ? m[1].trim() : null; };
  const logId = (t.match(/Log ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i) || [])[1] || null;
  const um = t.match(/User Message:\s*\n?\s*([\s\S]*?)(?:\n\s*\n|\n\s*stdout:|\n\s*stderr:|$)/i);
  return {
    appId: field('App ID'),
    appVersion: (field('App Version') || '').replace(/^v/i, '') || null,
    logId: logId ? logId.toLowerCase() : null,
    userMessage: um ? um[1].trim().slice(0, 500) : '',
    text: t,
  };
}

function cmpVersion(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

function detectLang(msg) {
  const s = ` ${String(msg || '').toLowerCase()} `;
  if (/[éèêàçù]/.test(s)) return 'fr';
  const fr = [' le ', ' la ', ' les ', ' pour ', ' sans ', ' aucun', ' erreur', ' ne ', ' pas ', ' souvent', ' bonjour', ' marche', ' fonctionne', ' appareil'];
  return fr.filter(w => s.includes(w)).length >= 1 ? 'fr' : 'en';
}

function matchSignature(diag, cfg) {
  if (!diag || diag.appId !== APP_ID) return { ok: false, why: 'not-bastien-app' };
  if (!diag.logId) return { ok: false, why: 'no-log-id' };
  if (!/^\d+\.\d+\.\d+$/.test(diag.appVersion || '')) return { ok: false, why: 'no-app-version' };
  const hits = (cfg.signatures || []).filter(s => (s.match || []).length && s.match.every(r => new RegExp(r, 'i').test(diag.text)));
  if (hits.length !== 1) return { ok: false, why: hits.length ? 'ambiguous-signature' : 'no-known-signature' };
  const sig = hits[0];
  if (cmpVersion(diag.appVersion, sig.fixedVersion) >= 0) return { ok: false, why: `version-already-fixed(${sig.id})` };
  // P3110b: bastien ships only through the Test channel, so "released" = a build >= fixedVersion is in Test
  // (or Live) per the athom-build-history snapshot; the manual `released: true` flag stays as a fallback.
  if (sig.released !== true && !releasedInAthom(sig.fixedVersion, cfg.athomBuilds)) return { ok: false, why: `fix-not-released(${sig.id})` };
  return { ok: true, sig };
}

function releasedInAthom(fixedVersion, builds) {
  return (Array.isArray(builds) ? builds : []).some(b => b && /^(test|live|published|approved)$/i.test(String(b.channel || b.state || ''))
    && /^\d+\.\d+\.\d+$/.test(String(b.version || '')) && cmpVersion(b.version, fixedVersion) >= 0);
}

function loadAthomBuilds(root = ROOT) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'data', 'status', `homey-build-status-${APP_ID}.json`), 'utf8')).builds || []; } catch { return []; }
}

function compose(lang, sig, diag) {
  const short = diag.logId.slice(0, 8);
  if (lang === 'fr') {
    return [
      'Bonjour,', '',
      `J'ai analysé votre rapport de diagnostic (${short}). Cause : ${sig.cause.fr}.`,
      `La version ${diag.appVersion} installée est antérieure au correctif, livré dans la version ${sig.fixedVersion}.`, '',
      `Pour résoudre le problème, merci d'installer la dernière version de l'application (${sig.fixedVersion} ou plus récente). Il n'est pas nécessaire de réappairer vos appareils.`, '',
      "Si le problème persiste après la mise à jour, n'hésitez pas à m'envoyer un nouveau rapport de diagnostic pour que je puisse approfondir l'analyse.", '',
      'Cordialement,', '', 'Dylan Rajasekaram', '',
    ].join('\r\n');
  }
  return [
    'Hello,', '',
    `I analysed your diagnostics report (${short}). Cause: ${sig.cause.en}.`,
    `The installed version ${diag.appVersion} predates the fix, which ships in version ${sig.fixedVersion}.`, '',
    `To solve it, please install the latest version of the app (${sig.fixedVersion} or newer). There is no need to re-pair your devices.`, '',
    'If the problem persists after the update, feel free to send me a new diagnostics report so I can dig deeper.', '',
    'Best regards,', '', 'Dylan Rajasekaram', '',
  ].join('\r\n');
}

function loadState(file = STATE) { try { const s = JSON.parse(fs.readFileSync(file, 'utf8')); return { replied: s.replied || {}, sent: s.sent || [] }; } catch { return { replied: {}, sent: [] }; } }
function saveState(s, file = STATE) {
  const keys = Object.keys(s.replied).sort((a, b) => String(s.replied[a].at).localeCompare(String(s.replied[b].at)));
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_STATE))) delete s.replied[k];
  s.sent = s.sent.filter(t => Date.now() - Date.parse(t) < 7 * DAY);
  fs.writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
}
function sentLastDay(s, now = Date.now()) { return s.sent.filter(t => now - Date.parse(t) < DAY).length; }

/** Pure decision for one message. */
function decide(msg, { cfg, state, ourAddr, threadHasOurReply, maxPerDay = 5, now = Date.now() }) {
  if (!isBastienDiag(msg)) return { action: 'skip', why: 'not-bastien-diag' };
  const to = safeReplyTo(msg.replyTo);
  if (!to) return { action: 'skip', why: 'no-safe-reply-to' };
  const diag = parseDiag(msg.text);
  if (diag.logId && state.replied[diag.logId]) return { action: 'skip', why: 'already-replied(state)', logId: diag.logId };
  if (threadHasOurReply) return { action: 'skip', why: 'already-replied(thread)', logId: diag.logId, record: true };
  const m = matchSignature(diag, cfg);
  if (!m.ok) return { action: 'skip', why: m.why, logId: diag.logId };
  if (sentLastDay(state, now) >= maxPerDay) return { action: 'skip', why: 'daily-cap', logId: diag.logId };
  const lang = detectLang(diag.userMessage);
  const subject = /^re:/i.test(msg.subject) ? msg.subject : `Re: ${msg.subject}`;
  const refs = [msg.references, msg.messageId].filter(Boolean).join(' ').trim();
  return { action: 'send', to, from: ourAddr, subject, inReplyTo: msg.messageId, references: refs, body: compose(lang, m.sig, diag), logId: diag.logId, sig: m.sig.id, lang };
}

function buildMime(d) {
  const enc = (s) => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`;
  const head = [
    `From: ${enc('Dylan Rajasekaram')} <${d.from}>`, `To: <${d.to}>`, `Subject: ${enc(d.subject)}`,
    d.inReplyTo ? `In-Reply-To: ${d.inReplyTo}` : null, d.references ? `References: ${d.references}` : null,
    `Date: ${new Date().toUTCString()}`, `Message-ID: <p3110.${d.logId}.${Date.now()}@${d.from.split('@')[1]}>`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', 'Auto-Submitted: auto-replied',
  ].filter(Boolean).join('\r\n');
  return `${head}\r\n\r\n${Buffer.from(d.body).toString('base64').replace(/.{76}/g, '$&\r\n')}\r\n`; // ok-own-text (body composed locally, no third-party text)
}

function smtpSend({ user, pass, from, to, raw, host = 'smtp.gmail.com', port = 465 }) {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host, port, servername: host });
    const steps = [
      null, `EHLO github-actions`, `AUTH PLAIN ${Buffer.from(`\0${user}\0${pass}`).toString('base64')}`,
      `MAIL FROM:<${from}>`, `RCPT TO:<${to}>`, 'DATA', `${raw.replace(/^\./gm, '..')}\r\n.`, 'QUIT',
    ];
    const want = [220, 250, 235, 250, 250, 354, 250, 221];
    let i = 0, buf = '';
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('smtp timeout')); }, 60000);
    sock.on('data', (c) => {
      buf += c.toString();
      const lines = buf.split('\r\n'); if (!/^\d{3} /m.test(buf) || buf.slice(-2) !== '\r\n') return;
      const last = lines.filter(Boolean).pop(); buf = '';
      const code = Number(last.slice(0, 3));
      if (code !== want[i]) { clearTimeout(timer); sock.destroy(); return reject(new Error(`smtp step ${i} got ${code}`)); }
      i++;
      if (i >= steps.length) { clearTimeout(timer); sock.end(); return resolve(true); }
      sock.write(steps[i] + '\r\n');
    });
    sock.on('error', (e) => { clearTimeout(timer); reject(new Error(`smtp ${e.code || 'error'}`)); });
  });
}

async function main() {
  const send = process.env.AUTOREPLY_SEND === 'true';
  const maxPerDay = Math.max(0, Math.min(20, Number(process.env.AUTOREPLY_MAX_PER_DAY || 5)));
  const days = Math.max(1, Math.min(14, Number(process.env.AUTOREPLY_SINCE_DAYS || 3)));
  if (isPaused()) { console.log('[P3110] kill switch present — nothing done'); return 0; }
  const user = process.env.GMAIL_EMAIL, pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) { console.log('[P3110] GMAIL_EMAIL/GMAIL_APP_PASSWORD missing — skipped'); return 0; }
  const cfg = JSON.parse(fs.readFileSync(SIGS, 'utf8'));
  cfg.athomBuilds = loadAthomBuilds();
  console.log(`[P3110] athom build snapshot: ${cfg.athomBuilds.length} build(s)`);
  const state = loadState();
  const { ImapFlow } = require('imapflow');
  const { simpleParser } = require('mailparser');
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user, pass }, logger: false });
  await client.connect();
  const log = [];
  try {
    const box = (await client.list()).find(b => b.specialUse === '\\All') || { path: 'INBOX' };
    const lock = await client.getMailboxLock(box.path);
    try {
      const uids = await client.search({ from: 'noreply@homey.app', subject: APP_ID, since: new Date(Date.now() - days * DAY) }, { uid: true });
      for (const uid of (uids || []).slice(-50)) {
        const m = await client.fetchOne(String(uid), { source: true, threadId: true }, { uid: true });
        const p = await simpleParser(m.source);
        const msg = {
          from: p.from && p.from.text, subject: p.subject, replyTo: p.replyTo && p.replyTo.value[0] && p.replyTo.value[0].address,
          messageId: p.messageId, references: Array.isArray(p.references) ? p.references.join(' ') : (p.references || ''), text: p.text || '',
        };
        let threadHasOurReply = false;
        if (m.threadId) {
          const inThread = await client.search({ threadId: m.threadId }, { uid: true });
          for (const u of inThread || []) {
            const e = await client.fetchOne(String(u), { envelope: true }, { uid: true });
            if ((e.envelope.from || []).some(a => String(a.address).toLowerCase() === user.toLowerCase())) { threadHasOurReply = true; break; }
          }
        }
        const d = decide(msg, { cfg, state, ourAddr: user, threadHasOurReply, maxPerDay });
        if (d.record && d.logId) state.replied[d.logId] = { at: new Date().toISOString(), by: 'manual' };
        if (d.action === 'send') {
          if (send) {
            await smtpSend({ user, pass, from: user, to: d.to, raw: buildMime(d) });
            state.replied[d.logId] = { at: new Date().toISOString(), sig: d.sig, lang: d.lang };
            state.sent.push(new Date().toISOString());
          }
          log.push(`${send ? 'SENT' : 'DRY-RUN'} ${d.logId.slice(0, 8)} sig=${d.sig} lang=${d.lang}`);
        } else log.push(`skip ${(d.logId || '-').slice(0, 8)} ${d.why}`);
      }
    } finally { lock.release(); }
  } finally { await client.logout().catch(() => {}); }
  saveState(state);
  console.log(log.join('\n') || '[P3110] no Bastien diag in window');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Bastien diag auto-reply (${send ? 'send' : 'dry-run'})\n\n${log.map(l => `- ${l}`).join('\n') || '- none'}\n`);
  return 0;
}

if (require.main === module) main().then(c => process.exit(c), e => { console.error(`[P3110] ${e.message}`); process.exit(1); });
module.exports = { releasedInAthom, loadAthomBuilds, isPaused, isBastienDiag, safeReplyTo, parseDiag, cmpVersion, detectLang, matchSignature, compose, decide, buildMime, loadState, saveState, sentLastDay, SUBJECT };
