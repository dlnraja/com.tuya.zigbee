#!/usr/bin/env node
'use strict';
// v5.13.0: Enhanced email reader — full MIME decode, pseudo extraction, RFC2047
let ImapFlow; try { ImapFlow = require('imapflow').ImapFlow } catch {}
const MBS = ['INBOX', '[Gmail]/All Mail', '[Gmail]/Tous les messages'];

// === RFC 2047 decode (encoded headers like =?UTF-8?B?...?= or =?UTF-8?Q?...?=) ===

function aggressiveSanitize(text) {
  if (!text) return '';
  let clean = text;
  
  // 1. Remove email addresses (keep domains like @github.com or @homey.app if needed, but safer to replace all)
  clean = clean.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+.[a-zA-Z0-9_-]+)/gi, '[REDACTED_EMAIL]');
  
  // 2. Remove IP addresses (IPv4)
  clean = clean.replace(/(?:[0-9]{1,3}.){3}[0-9]{1,3}/g, '[REDACTED_IP]');
  
  // 3. Remove common phone number patterns
  clean = clean.replace(/\+?([0-9]{1,3})?[-. ]?\(?([0-9]{1,4})\)?[-. ]?[0-9]{1,4}[-. ]?[0-9]{1,4}[-. ]?[0-9]{1,9}/g, function(match) {
    // Only redact if it looks like a phone number and not a diagnostic ID or timestamp
    if (match.replace(/[^0-9]/g, '').length >= 8 && !match.includes(':')) {
       return '[REDACTED_PHONE]';
    }
    return match;
  });

  return clean;
}

function decodeRFC2047(str) {
  if (!str) return '';
  return str.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, enc, data) => {
    try {
      if (enc.toUpperCase() === 'B') return Buffer.from(data, 'base64').toString('utf8');
      if (enc.toUpperCase() === 'Q') return data.replace(/=([0-9A-Fa-f]{2})/g, (__, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/_/g, ' ');
    } catch {}
    return data;
  });
}

// === MIME body decoder ===
function decodeQP(str) {
  return (str || '').replace(/=(\r?\n)/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
function decodeBody(raw, encoding) {
  if (!raw) return '';
  const enc = (encoding || '').toLowerCase();
  if (enc === 'base64') { try { return Buffer.from(raw.replace(/\s/g, ''), 'base64').toString('utf8'); } catch { return raw; } }
  if (enc === 'quoted-printable') return decodeQP(raw);
  return raw;
}

// === Parse MIME multipart to extract text/plain and text/html parts ===
function parseMIME(rawSource) {
  const raw = typeof rawSource === 'string' ? rawSource : rawSource.toString('utf8');
  const result = { textPlain: '', textHtml: '', headers: {}, parts: [] };

  // Split headers from body
  const headerEnd = raw.search(/\r?\n\r?\n/);
  if (headerEnd === -1) return result;
  const headerBlock = raw.substring(0, headerEnd);
  const bodyBlock = raw.substring(headerEnd).replace(/^\r?\n\r?\n/, '');

  // Parse headers
  const hLines = headerBlock.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/);
  for (const line of hLines) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.substring(0, idx).toLowerCase().trim();
      const val = line.substring(idx + 1).trim();
      result.headers[key] = val;
    }
  }

  const ct = result.headers['content-type'] || '';
  const cte = result.headers['content-transfer-encoding'] || '';

  // Simple (non-multipart)
  if (!ct.includes('multipart')) {
    const decoded = decodeBody(bodyBlock, cte);
    if (ct.includes('text/html') || (!ct && decoded.includes('<'))) {
      result.textHtml = decoded;
    } else {
      result.textPlain = decoded;
    }
    return result;
  }

  // Multipart: extract boundary
  const bMatch = ct.match(/boundary=["']?([^"';\s]+)["']?/i);
  if (!bMatch) { result.textPlain = bodyBlock; return result; }
  const boundary = bMatch[1];
  const parts = bodyBlock.split('--' + boundary);

  for (const part of parts) {
    if (part.trim() === '' || part.trim() === '--') continue;
    const pHeaderEnd = part.search(/\r?\n\r?\n/);
    if (pHeaderEnd === -1) continue;
    const pHeaders = part.substring(0, pHeaderEnd).toLowerCase();
    const pBody = part.substring(pHeaderEnd).replace(/^\r?\n\r?\n/, '');
    const pCTE = (pHeaders.match(/content-transfer-encoding:\s*(\S+)/i) || [])[1] || '';
    const pCT = (pHeaders.match(/content-type:\s*([^;\r\n]+)/i) || [])[1] || '';
    const decoded = decodeBody(pBody, pCTE);

    if (pCT.includes('text/plain') && !result.textPlain) {
      result.textPlain = decoded;
    } else if (pCT.includes('text/html') && !result.textHtml) {
      result.textHtml = decoded;
    } else if (pCT.includes('multipart')) {
      // Nested multipart — recurse with a fake source
      const nested = parseMIME(part.substring(0, pHeaderEnd) + '\n\n' + pBody);
      if (!result.textPlain && nested.textPlain) result.textPlain = nested.textPlain;
      if (!result.textHtml && nested.textHtml) result.textHtml = nested.textHtml;
    }
    result.parts.push({ type: pCT.trim(), size: decoded.length });
  }
  return result;
}

// === HTML to structured text ===
function htmlToText(html) {
  if (!html) return '';
  let t = html;
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/p>/gi, '\n\n');
  t = t.replace(/<\/div>/gi, '\n');
  t = t.replace(/<\/tr>/gi, '\n');
  t = t.replace(/<\/li>/gi, '\n');
  t = t.replace(/<\/h[1-6]>/gi, '\n');
  t = t.replace(/<hr[^>]*>/gi, '\n---\n');
  // Extract link text + URL
  t = t.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)');
  // Strip remaining tags
  t = t.replace(/<[^>]+>/g, ' ');
  // Decode HTML entities
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  t = t.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
  // Clean whitespace
  t = t.replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

// === Extract pseudo/username from email metadata ===
function extractPseudo(from, headers, body) {
  const pseudo = { displayName: null, username: null, source: null };

  // 1. From header display name: "John Doe <john@example.com>"
  const fromMatch = (from || '').match(/^["']?([^"'<]+?)["']?\s*</);
  if (fromMatch && fromMatch[1].trim().length > 1) {
    pseudo.displayName = fromMatch[1].trim();
  }

  // 2. GitHub: extract username from notification
  if ((from || '').includes('github.com')) {
    pseudo.source = 'github';
    // GitHub notifications: "username <notifications@github.com>"
    if (pseudo.displayName && !pseudo.displayName.includes('@')) {
      pseudo.username = pseudo.displayName;
    }
    // Also from body: "@username commented" or "username opened"
    const ghUser = (body || '').match(/(?:^|\n)\s*(?:@([a-zA-Z0-9_-]+)|([a-zA-Z0-9_-]+))\s+(?:commented|opened|closed|merged|pushed|requested)/i);
    if (ghUser) pseudo.username = pseudo.username || (ghUser[1] || ghUser[2]);
  }

  // 3. Forum: community.homey.app
  if ((from || '').includes('community.homey.app') || (from || '').includes('homey.app')) {
    pseudo.source = 'forum';
    // Forum notifications often have username in subject or body
    const forumUser = (body || '').match(/(?:@([a-zA-Z0-9_.-]+)|\[([a-zA-Z0-9_.-]+)\]\s*(?:posted|replied|said))/i);
    if (forumUser) pseudo.username = forumUser[1] || forumUser[2];
    if (!pseudo.username && pseudo.displayName) pseudo.username = pseudo.displayName;
  }

  // 4. Homey system
  if ((from || '').includes('athom.com') || (from || '').includes('noreply@homey.app')) {
    pseudo.source = 'homey_system';
  }

  // 5. User direct email
  if (!pseudo.source) {
    pseudo.source = 'user';
    if (pseudo.displayName) pseudo.username = pseudo.displayName;
  }

  return pseudo;
}

// === Extract crash/diagnostic specific data from body ===
function extractCrashData(body) {
  if (!body) return null;
  const data = {};

  // Stack traces
  const stacks = body.match(/(?:Error|TypeError|ReferenceError|RangeError)[:\s][^\n]+(?:\n\s+at\s+[^\n]+)*/g);
  if (stacks) data.stackTraces = stacks.slice(0, 5);

  // Homey crash info
  const crashApp = (body.match(/(?:app|application)[:\s]+([a-z0-9_.]+)/i) || [])[1];
  if (crashApp) data.crashApp = crashApp;

  // Device zone
  const zone = (body.match(/(?:zone|room|kamer)[:\s]+["']?([^"'\n,]{2,30})["']?/i) || [])[1];
  if (zone) data.zone = zone;

  // Capabilities mentioned
  const caps = body.match(/\b(onoff|dim|measure_power|measure_temperature|measure_humidity|measure_battery|meter_power|alarm_[a-z_]+|measure_[a-z_]+)\b/g);
  if (caps) data.capabilities = [...new Set(caps)];

  // Cluster IDs
  const clusters = body.match(/\b(?:cluster|0x)[0-9A-Fa-f]{4}\b/g);
  if (clusters) data.clusters = [...new Set(clusters)];

  // DP mentions
  const dps = body.match(/\bDP[:\s]?(\d{1,3})\b/gi);
  if (dps) data.datapoints = [...new Set(dps)];

  // Settings keys
  const settings = body.match(/\b(zb_model_id|zb_manufacturer_name|scene_mode|power_on_behavior|backlight_mode)\b/g);
  if (settings) data.settings = [...new Set(settings)];

  return Object.keys(data).length ? data : null;
}

async function tryConnect(user, pass) {
  const c = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user, pass }, logger: false, socketTimeout: 60000, connectionTimeout: 30000, greetingTimeout: 30000 });
  c.on('error', err => console.log('[IMAP] Socket event:', err.message));
  await c.connect();
  return c;
}

async function readViaIMAP(opts = {}) {
  if (!ImapFlow) return null;
  const pairs = [];
  const ge = opts.email || process.env.GMAIL_EMAIL, gp = process.env.GMAIL_APP_PASSWORD;
  const he = process.env.HOMEY_EMAIL, hp = process.env.HOMEY_PASSWORD;
  if (ge && gp) pairs.push([ge, gp]);
  if (he && hp && (he !== ge || hp !== gp)) pairs.push([he, hp]);
  if (ge && hp && !pairs.find(p => p[0] === ge && p[1] === hp)) pairs.push([ge, hp]);
  if (he && gp && !pairs.find(p => p[0] === he && p[1] === gp)) pairs.push([he, gp]);
  if (!pairs.length) { console.log('[IMAP] No credentials found'); return null }
  const since = (opts.afterDate || new Date(Date.now() - 30 * 864e5)).toISOString().split('T')[0];
  let c = null;
  for (const [u, p] of pairs) {
    console.log('[IMAP] Trying', u, 'since', since);
    try { c = await tryConnect(u, p); console.log('[IMAP] Auth OK as', u); break }
    catch (err) { console.log('[IMAP] Auth FAIL for', u, '-', err.message); c = null }
  }
  if (!c) { console.error('[IMAP] All credential pairs failed'); return null }
  try {
    let lock = null;
    for (const mb of MBS) { try { lock = await c.getMailboxLock(mb); console.log('[IMAP] Mailbox:', mb); break } catch (e2) { console.log('[IMAP] Skip', mb, e2.message); lock = null } }
    if (!lock) { await c.logout(); return null }
    const out = [];
    try {
      const kws = ['tuya', 'zigbee', 'homey', '_TZE', '_TZ3', 'TS0', 'diagnostic', 'fingerprint', 'device report', 'crash', 'error log', 'initialization failed', 'node initialization', 'ZCL error', 'interview failed', 'missing capability', 'timeout'];
      const senders = ['noreply@community.homey.app', 'noreply@athom.com', 'notifications@github.com', 'noreply@homey.app', 'support@athom.com'];
      const seqSet = new Set();
      for (const kw of kws) { try { (await c.search({ since: new Date(since), subject: kw })).forEach(s => seqSet.add(s)) } catch {} }
      for (const fr of senders) { try { (await c.search({ since: new Date(since), from: fr })).forEach(s => seqSet.add(s)) } catch {} }
      for (const bk of ['_TZE200', '_TZE204', '_TZE284', '_TZ3000', 'TS0601', 'diagnostic report', 'Homey', 'crash log', 'device error', 'report id', 'diagnostic log', 'report', 'issue', 'not recognized', 'unknown device', 'pairing failed', 'timed out', 'Missing Capability Listener', 'Invalid Flow Card ID', 'UNSUPPORTED_ATTRIBUTE', 'ZCL cluster error']) {
        try { (await c.search({ since: new Date(since), body: bk })).forEach(s => seqSet.add(s)) } catch {}
      }
      const seqs = [...seqSet].sort((a, b) => b - a).slice(0, opts.maxResults || 2000);
      console.log('[IMAP]', seqSet.size, 'relevant msgs, fetching', seqs.length);
      if (seqs.length > 0) {
        const range = seqs.join(',');
        for await (const m of c.fetch(range, { envelope: true, source: true })) {
          try {
            const rawSubj = m.envelope?.subject || '';
            const subj = decodeRFC2047(rawSubj);
            const fromRaw = m.envelope?.from?.[0] || {};
            const fromAddr = fromRaw.address || '';
            const fromName = decodeRFC2047(fromRaw.name || '');
            const date = m.envelope?.date?.toISOString() || '';
            const uid = m.uid || m.seq || out.length + 1;

            // Full MIME parsing
            let body = subj;
            let contentType = 'unknown';
            let crashData = null;
            let mimeInfo = null;
            if (m.source) {
              try {
                const mime = parseMIME(m.source);
                mimeInfo = { parts: mime.parts, headerKeys: Object.keys(mime.headers) };
                // Prefer text/plain, fall back to converted HTML
                if (mime.textPlain && mime.textPlain.trim().length > 10) {
                  body = mime.textPlain;
                  contentType = 'text/plain';
                } else if (mime.textHtml) {
                  body = htmlToText(mime.textHtml);
                  contentType = 'text/html->text';
                } else {
                  // Fallback: raw split
                  const raw = m.source.toString('utf8');
                  const parts = raw.split(/\r?\n\r?\n/);
                  if (parts.length > 1) body = parts.slice(1).join('\n').replace(/<[^>]+>/g, ' ');
                  contentType = 'raw-fallback';
                }
              } catch (pe) {
                console.log('[IMAP] MIME parse error:', pe.message);
                const raw = m.source.toString('utf8');
                const parts = raw.split(/\r?\n\r?\n/);
                if (parts.length > 1) body = parts.slice(1).join('\n').replace(/<[^>]+>/g, ' ');
                contentType = 'raw-fallback';
              }
            }

            // Limit body but keep much more than before (16KB)
            body = body.substring(0, 16000);

            // Extract pseudo/username
            const pseudo = extractPseudo(fromName + ' <' + fromAddr + '>', null, body);

            // Extract crash data
            crashData = extractCrashData(body);

            
              // Aggressive privacy sanitization
              body = aggressiveSanitize(body);
              if (crashData) {
                if (crashData.crashApp) crashData.crashApp = aggressiveSanitize(crashData.crashApp);
                if (crashData.stackTraces) crashData.stackTraces = crashData.stackTraces.map(aggressiveSanitize);
              }
              
              out.push({
              id: 'imap_' + uid,
              subj,
              from: fromAddr,
              fromName,
              date,
              body,
              bodyLength: body.length,
              contentType,
              pseudo,
              crashData,
              mimeInfo,
              labels: []
            });
          } catch (fe) { console.log('[IMAP] skip:', fe.message) }
        }
      }
      console.log('[IMAP] fetched', out.length, 'emails');
    } finally { lock.release() }
    await c.logout(); try { c.close() } catch {}
    console.log('[IMAP] OK:', out.length);
    return out;
  } catch (err) {
    console.error('[IMAP] ERROR:', err.message, err.code || '');
    try { await c.logout() } catch {}; try { c.close() } catch {};
    return null;
  }
}

module.exports = { readViaIMAP, parseMIME, htmlToText, extractPseudo, extractCrashData, decodeRFC2047 };

