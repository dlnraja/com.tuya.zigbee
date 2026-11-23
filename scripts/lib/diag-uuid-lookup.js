'use strict';

/**
 * P3362 / t1006u - join a forum/GitHub diagnostic UUID to fetch-diags
 * ledger and mail-ingest records. Intake triage must look this up
 * when a request is UUID-only; it cannot read Gmail itself.
 *
 * Sources (read-only, missing files are skipped):
 *   data/diag-ids.json
 *   data/progress/ledger.json
 *   .github/state/homey-app-diag/<uuid>.json and .sanitized.json
 *   .github/state/homey-app-diag-index (if present)
 *   reports/gmail-diags, data/ssot harvest latest.json
 */

const fs = require('fs');
const path = require('path');

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

function normUuid(u) {
  const m = String(u || '').toLowerCase().match(UUID_RE);
  return m ? m[0] : '';
}

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function walkRecords(obj, acc, via) {
  if (obj == null) {return;}
  if (Array.isArray(obj)) {
    for (const x of obj) walkRecords(x, acc, via);
    return;
  }
  if (typeof obj !== 'object') {return;}
  acc.push({ via, rec: obj });
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {walkRecords(v, acc, via);}
  }
}

function recordMentions(rec, uuid) {
  const blob = JSON.stringify(rec).toLowerCase();
  if (blob.includes(uuid)) {return true;}
  const ids = [].concat(rec.logIds || rec.diagIds || rec.uuids || rec.uuid || rec.id || []);
  return ids.some((x) => normUuid(x) === uuid);
}

function summarize(rec, via, file) {
  const couples = rec.couples || rec.couple || [];
  const flat = Array.isArray(couples)
    ? couples.map((c) => (Array.isArray(c) ? c.join('|') : String(c)))
    : [];
  return {
    via,
    file: file || null,
    date: rec.date || rec.fetchedAt || rec.updated || null,
    version: rec.version || rec.appVersion || null,
    appId: rec.appId || rec.app || null,
    mfrs: rec.mfrs || rec.manufacturerName || [],
    pids: rec.pids || rec.productId || [],
    couples: flat,
    found: rec.found !== false,
  };
}

function defaultPaths(root) {
  return [
    path.join(root, 'data/diag-ids.json'),
    path.join(root, 'data/progress/ledger.json'),
    path.join(root, '.github/state/homey-app-diag-index.json'),
    path.join(root, 'data/ssot/inbox-diag-uuid-harvest/latest.json'),
    path.join(root, 'reports/gmail-diags/latest.json'),
    path.join(root, '.github/state/inbox-diag-harvest/latest.json'),
  ];
}

function lookupUuid(uuid, root, extraPaths) {
  const id = normUuid(uuid);
  if (!id) {return { found: false, uuid: '', records: [], reason: 'invalid_uuid' };}
  const records = [];
  const seen = new Set();
  const files = defaultPaths(root).concat(extraPaths || []);
  const diagDir = path.join(root, '.github', 'state', 'homey-app-diag');
  for (const name of [`${id}.sanitized.json`, `${id}.json`]) {
    files.push(path.join(diagDir, name));
  }
  for (const file of files) {
    const data = loadJson(file);
    if (data == null) {continue;}
    const acc = [];
    walkRecords(data, acc, path.relative(root, file));
    // also treat the file itself as a record (single uuid json)
    acc.push({ via: path.relative(root, file), rec: data });
    for (const { via, rec } of acc) {
      if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {continue;}
      if (!recordMentions(rec, id)) {continue;}
      const key = `${via}:${JSON.stringify(rec).slice(0, 200)}`;
      if (seen.has(key)) {continue;}
      seen.add(key);
      records.push(summarize(rec, via, file));
    }
  }
  return {
    found: records.length > 0,
    uuid: id,
    records,
    reason: records.length > 0 ? 'found_in_ledger' : 'uuid_not_in_ledger',
  };
}

function isUuidOnlyRequest(extracted) {
  const ex = extracted || {};
  const hasCouple = (ex.couples || []).length > 0 || (ex.mfrs || []).length > 0;
  const hasPid = (ex.pids || []).length > 0;
  const hasSymptom = (ex.symptoms || []).length > 0;
  const hasDiag = (ex.diagIds || []).length > 0;
  return hasDiag && !hasCouple && !hasPid && !hasSymptom;
}

module.exports = { UUID_RE, normUuid, lookupUuid, isUuidOnlyRequest };
