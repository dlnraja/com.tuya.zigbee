#!/usr/bin/env node
/**
 * fix-json-control-chars.cjs — one-shot JSON repair
 * ---------------------------------------------------------------
 * Escapes raw control characters (newline, carriage return, tab) that
 * appear INSIDE string values of a JSON file. Per RFC 8259 these must
 * be escaped (\n, \r, \t). The file data/community-intel.json was
 * written with raw newlines inside the "body" field of GitHub issue
 * comments, which made it unparseable.
 *
 * Usage: node scripts/maintenance/fix-json-control-chars.cjs <file.json>
 * ---------------------------------------------------------------
 */
'use strict';

const fs = require('fs');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node fix-json-control-chars.cjs <file.json>');
  process.exit(1);
}

if (!fs.existsSync(target)) {
  console.error('File not found:', target);
  process.exit(1);
}

const raw = fs.readFileSync(target, 'utf8');
console.log('Original size:', raw.length, 'bytes');
let originallyOk = false;
try { JSON.parse(raw); originallyOk = true; } catch (e) {
  console.log('Original parse error:', e.message.slice(0, 80));
}
if (originallyOk) {
  console.log('File already parses OK — nothing to do.');
  process.exit(0);
}

// Walk the string, tracking whether we are inside a JSON string literal.
// Escape raw control characters that appear inside string values.
// ALSO: detect truncated string values (a raw \r\n appearing inside a string
// value, followed by optional whitespace and then a `"` that begins the NEXT
// property). In that case the string was written truncated — close it.
let out = '';
let inStr = false;
let escaped = false;
let fixed = 0;
let closedTruncated = 0;

for (let i = 0; i < raw.length; i++) {
  const ch = raw[i];

  if (inStr) {
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') { out += ch; escaped = true; continue; }
    if (ch === '"') { out += ch; inStr = false; continue; }
    // Truncated-string detection: raw \r or \n followed by whitespace then a
    // `"` that starts the next property key. Close the current string here.
    if ((ch === '\n' || ch === '\r')) {
      // Peek ahead: skip \r, \n, spaces/tabs; if next non-ws is `"` AND the
      // following token looks like a property name (e.g. "createdAt"),
      // treat this as a truncated string.
      let j = i;
      while (j < raw.length && /[\r\n \t]/.test(raw[j])) j++;
      if (raw[j] === '"') {
        // Look further to confirm this looks like "key": pattern.
        let k = j + 1;
        while (k < raw.length && /[a-zA-Z0-9_]/.test(raw[k])) k++;
        if (raw[k] === '"' && raw[k+1] === ':') {
          // Truncated string — close it.
          out += '"';
          inStr = false;
          closedTruncated++;
          // Rewind to i: emit the whitespace chars normally (outside string).
          continue;
        }
      }
      // Otherwise escape the raw newline.
      if (ch === '\n') { out += '\\n'; fixed++; continue; }
      if (ch === '\r') { /* drop lone \r */ fixed++; continue; }
    }
    if (ch === '\t') { out += '\\t'; fixed++; continue; }
    out += ch;
  } else {
    if (ch === '"') { inStr = true; }
    out += ch;
  }
}

console.log('Escaped', fixed, 'raw control character(s).');
console.log('Closed', closedTruncated, 'truncated string(s).');

console.log('Escaped', fixed, 'raw control character(s).');

try {
  JSON.parse(out);
  console.log('Fixed file parses OK.');
} catch (e) {
  console.error('Still unparseable after fix:', e.message.slice(0, 100));
  process.exit(2);
}

fs.writeFileSync(target, out);
console.log('Saved repaired file:', out.length, 'bytes.');
