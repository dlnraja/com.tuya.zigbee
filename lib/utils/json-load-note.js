'use strict';

/**
 * Bounded note of large JSON loads (Bastien 1.0.229).
 *
 * The OOM stack is JSON.parse of a two-byte string. It does not name the file.
 * This ring records a call-site label and a byte size only — never the payload,
 * never a path with a home directory, never a reviver. It does not replace
 * JSON.parse and it does not refuse a parse.
 */

const MAX_NOTES = 24;
const LOG_ONCE_BYTES = 64 * 1024;
const _notes = [];
const _logged = new Set();

function safeLabel(label) {
  const raw = String(label || 'json').slice(0, 80);
  if (/^[a-zA-Z0-9_.:/-]+$/.test(raw)) {return raw.slice(0, 64);}
  return 'redacted-label';
}

function noteJsonLoad(label, byteLength) {
  const entry = {
    label: safeLabel(label),
    bytes: Number(byteLength) || 0,
  };
  _notes.push(entry);
  while (_notes.length > MAX_NOTES) {_notes.shift();}
  if (entry.bytes >= LOG_ONCE_BYTES && !_logged.has(entry.label)) {
    _logged.add(entry.label);
    while (_logged.size > MAX_NOTES) {
      const oldest = _logged.values().next().value;
      _logged.delete(oldest);
    }
    entry.announce = true;
  }
  return entry;
}

function recentJsonLoads() {
  return _notes.map((e) => ({ label: e.label, bytes: e.bytes }));
}

function jsonLoadSummary() {
  if (!_notes.length) {return '';}
  const parts = [];
  const seen = new Set();
  for (let i = _notes.length - 1; i >= 0 && parts.length < 6; i--) {
    const e = _notes[i];
    if (seen.has(e.label)) {continue;}
    seen.add(e.label);
    parts.push(`${e.label}:${e.bytes}`);
  }
  return parts.join(',');
}

function _resetJsonLoadNotesForTests() {
  _notes.length = 0;
  _logged.clear();
}

module.exports = {
  MAX_NOTES,
  LOG_ONCE_BYTES,
  noteJsonLoad,
  recentJsonLoads,
  jsonLoadSummary,
  _resetJsonLoadNotesForTests,
};
