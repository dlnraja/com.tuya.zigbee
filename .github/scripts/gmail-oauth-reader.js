#!/usr/bin/env node
'use strict';

const privacy = require('./privacy-redactor');
const {
  parseMIME,
  htmlToText,
  extractPseudo,
  extractCrashData,
  decodeRFC2047
} = require('./gmail-imap-reader');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';

function boolValue(value) {
  return /^(1|true|yes|on)$/i.test(String(value || '').trim());
}

function boundedInt(value, fallback, min, max) {
  const n = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function toYmdSlash(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '/');
}

function resolveSinceDate(opts) {
  const allHistory = opts.allHistory || boolValue(process.env.GMAIL_DIAG_ALL_HISTORY);
  const raw = opts.afterDate || opts.since || process.env.GMAIL_DIAG_SINCE || (allHistory ? '2019-01-01' : null);
  if (raw instanceof Date && Number.isFinite(raw.getTime())) return raw;
  if (raw) {
    const parsed = new Date(String(raw));
    if (Number.isFinite(parsed.getTime())) return parsed;
    console.log('[Gmail OAuth] Invalid since date, falling back to recent window:', privacy.redact(String(raw)));
  }
  return new Date(Date.now() - 30 * 864e5);
}

function resolveUntilDate(opts) {
  const raw = opts.untilDate || opts.beforeDate || opts.until || opts.before || process.env.GMAIL_DIAG_UNTIL || null;
  if (!raw) return null;
  if (raw instanceof Date && Number.isFinite(raw.getTime())) return raw;
  const parsed = new Date(String(raw));
  if (Number.isFinite(parsed.getTime())) return parsed;
  console.log('[Gmail OAuth] Invalid until date, ignoring:', privacy.redact(String(raw)));
  return null;
}

function resolveMaxResults(opts) {
  const allHistory = opts.allHistory || boolValue(process.env.GMAIL_DIAG_ALL_HISTORY);
  const fallback = allHistory ? 1000 : 100;
  return boundedInt(opts.maxResults || opts.max || process.env.GMAIL_DIAG_MAX_RESULTS, fallback, 1, 20000);
}

function hasOAuthCredentials() {
  return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
}

function accountAlias(value) {
  return privacy.alias('account', value || 'oauth-user');
}

function safeSender(addr) {
  const from = String(addr || '').toLowerCase();
  if (from.includes('notifications@github.com')) return 'notifications@github.com';
  if (from.includes('community.homey.app')) return 'noreply@community.homey.app';
  if (from.includes('athom.com')) return 'noreply@athom.com';
  if (from.includes('homey.app')) return 'noreply@homey.app';
  return privacy.alias('sender', from || 'unknown');
}

function parseFromHeader(value) {
  const raw = decodeRFC2047(String(value || ''));
  const match = raw.match(/^"?([^"<]*)"?\s*<([^>]+)>/);
  if (match) return { name: match[1].trim(), address: match[2].trim() };
  if (raw.includes('@')) return { name: '', address: raw.trim() };
  return { name: raw.trim(), address: '' };
}

function base64UrlDecode(value) {
  return Buffer.from(String(value || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function buildDateQuery(opts) {
  const sinceDate = resolveSinceDate(opts);
  const untilDate = resolveUntilDate(opts);
  const parts = [`after:${toYmdSlash(sinceDate)}`];
  if (untilDate) parts.push(`before:${toYmdSlash(untilDate)}`);
  return parts.join(' ');
}

function buildQueries(opts) {
  const date = buildDateQuery(opts);
  return [
    `${date} (homey OR tuya OR zigbee OR diagnostic OR diagnostics OR crash OR "error log" OR "processing failed" OR AggregateError OR "Missing Capability Listener" OR battery OR button OR "flow card")`,
    `${date} (_TZE OR _TZE200 OR _TZE204 OR _TZE284 OR _TZ3000 OR TS0601 OR TS0014 OR TS0041 OR TS0042 OR TS0043 OR TS0044 OR TS011F OR TS0201 OR TS0203)`,
    `${date} (from:noreply@community.homey.app OR from:noreply@athom.com OR from:noreply@homey.app OR from:support@athom.com OR from:support@homey.app OR from:notifications@github.com)`
  ];
}

async function refreshAccessToken() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const errText = privacy.redact(await res.text());
    throw new Error(`OAuth token refresh failed: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function gmailGet(accessToken, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const errText = privacy.redact(await res.text());
    throw new Error(`Gmail API request failed: ${res.status} ${errText}`);
  }
  return res.json();
}

async function searchMessages(accessToken, query, remaining) {
  const out = [];
  let pageToken = null;
  do {
    const url = new URL(GMAIL_API);
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', String(Math.min(500, remaining - out.length)));
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const data = await gmailGet(accessToken, url.toString());
    out.push(...(data.messages || []));
    pageToken = data.nextPageToken || null;
  } while (pageToken && out.length < remaining);
  return out.slice(0, remaining);
}

async function getRawMessage(accessToken, id) {
  const url = `${GMAIL_API}/${encodeURIComponent(id)}?format=raw`;
  return gmailGet(accessToken, url);
}

function toEmailRecord(message) {
  const raw = base64UrlDecode(message.raw || '');
  const mime = parseMIME(raw);
  const headers = mime.headers || {};
  const subject = decodeRFC2047(headers.subject || message.snippet || '');
  const fromParsed = parseFromHeader(headers.from || '');
  const date = headers.date ? new Date(headers.date).toISOString() : '';
  let body = subject;
  let contentType = 'unknown';
  if (mime.textPlain && mime.textPlain.trim().length > 10) {
    body = mime.textPlain;
    contentType = 'text/plain';
  } else if (mime.textHtml) {
    body = htmlToText(mime.textHtml);
    contentType = 'text/html->text';
  } else if (message.snippet) {
    body = message.snippet;
    contentType = 'snippet';
  }
  body = privacy.redact(String(body || '').slice(0, 256000));

  let crashData = extractCrashData(body);
  if (crashData) {
    if (crashData.crashApp) crashData.crashApp = privacy.redact(crashData.crashApp);
    if (crashData.stackTraces) crashData.stackTraces = crashData.stackTraces.map(privacy.redact);
  }

  const pseudo = extractPseudo(`${fromParsed.name || ''} <${fromParsed.address || ''}>`, null, body);
  return {
    id: 'oauth_' + privacy.digest(String(message.id || ''), 12),
    subj: privacy.redact(subject),
    from: safeSender(fromParsed.address),
    fromName: privacy.redact(fromParsed.name),
    date,
    body,
    bodyLength: body.length,
    contentType,
    pseudo: privacy.redactObject(pseudo),
    crashData,
    mimeInfo: { parts: mime.parts || [], headerKeys: Object.keys(headers) },
    labels: message.labelIds || []
  };
}

async function readViaOAuth(opts = {}) {
  if (!hasOAuthCredentials()) {
    console.log('[Gmail OAuth] Missing OAuth credentials');
    return null;
  }
  const account = process.env.GMAIL_EMAIL || process.env.HOMEY_EMAIL || 'gmail-oauth';
  const maxResults = resolveMaxResults(opts);
  console.log('[Gmail OAuth] Trying', accountAlias(account), 'max', maxResults);
  const accessToken = await refreshAccessToken();
  if (!accessToken) return null;

  const seen = new Set();
  const ids = [];
  for (const query of buildQueries(opts)) {
    if (ids.length >= maxResults) break;
    console.log('[Gmail OAuth] Search query:', privacy.redact(query));
    const batch = await searchMessages(accessToken, query, maxResults - ids.length);
    for (const msg of batch) {
      if (!msg.id || seen.has(msg.id)) continue;
      seen.add(msg.id);
      ids.push(msg.id);
      if (ids.length >= maxResults) break;
    }
  }

  const out = [];
  for (const id of ids) {
    try {
      out.push(toEmailRecord(await getRawMessage(accessToken, id)));
    } catch (err) {
      console.log('[Gmail OAuth] skip:', privacy.redact(err.message));
    }
  }
  console.log('[Gmail OAuth] OK:', out.length);
  return out;
}

module.exports = { hasOAuthCredentials, readViaOAuth };
