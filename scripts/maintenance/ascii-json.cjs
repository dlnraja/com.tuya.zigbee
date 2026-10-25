'use strict';

/**
 * P3047: write JSON payload files as pure ASCII (lossless).
 *
 * WHY: V8 keeps a string as one byte per char only while every char is <= U+00FF.
 * A JSON file read as UTF-8 that holds even one char above U+00FF (an arrow, an emoji,
 * a Cyrillic word) becomes a two-byte string, so the text the parser walks costs twice
 * its length in heap (Bastien OOM, JsonParser<unsigned short> at a ~62 MB cap).
 * Writing every non-ASCII char as a \uXXXX escape keeps the text one-byte; JSON.parse
 * gives back exactly the same value. Applied as the last step of prepare-publish only,
 * so sources, CI and enrichment writers keep readable UTF-8.
 */

const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');

const NON_ASCII = /[\u0080-\uffff]/g;
const WIDE = /[\u0100-\uffff]/g;

function esc(c) {
  return `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
}

/**
 * Serialise like JSON.stringify(value), with non-ASCII chars escaped.
 * mode 'ascii' escapes every char >= U+0080; mode 'wide' only chars >= U+0100
 * (still one-byte in V8, fewer bytes on disk). Outside strings JSON text is ASCII,
 * so the replace only ever touches string contents; surrogate pairs become two
 * escapes, which JSON.parse joins back.
 */
function stringifyAscii(value, mode = 'ascii') {
  const text = JSON.stringify(value);
  if (typeof text !== 'string') {return text;}
  return text.replace(mode === 'wide' ? WIDE : NON_ASCII, esc);
}

function countChars(text) {
  let nonAscii = 0;
  let wide = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c > 0x7f) {nonAscii++;}
    if (c > 0xff) {wide++;}
  }
  return { nonAscii, wide };
}

/**
 * Rewrite one JSON file in place. Returns null when the file is left as is
 * (already ASCII, unreadable or not JSON). Throws if the round trip is not exact.
 */
function asciiJsonFile(file, opts = {}) {
  const mode = opts.mode || 'ascii';
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (_) { return null; }
  const counts = countChars(text);
  if ((mode === 'wide' ? counts.wide : counts.nonAscii) === 0) {return null;}
  let value;
  try { value = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (_) { return null; }
  const out = stringifyAscii(value, mode);
  if (!isDeepStrictEqual(JSON.parse(out), value)) {
    throw new Error(`P3047 round trip mismatch: ${file}`);
  }
  fs.writeFileSync(file, out);
  return {
    file,
    bytesBefore: Buffer.byteLength(text),
    bytesAfter: Buffer.byteLength(out),
    charsBefore: text.length,
    charsAfter: out.length,
    nonAscii: counts.nonAscii,
    wide: counts.wide,
    // heap of the text the parser walks: two bytes per char once one char > U+00FF
    textHeapBefore: text.length * (counts.wide ? 2 : 1),
    textHeapAfter: out.length,
  };
}

/** Rewrite every *.json under root, node_modules excluded. */
function asciiJsonTree(root, opts = {}) {
  const changed = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '.git') {stack.push(full);}
      } else if (e.isFile() && e.name.endsWith('.json')) {
        const r = asciiJsonFile(full, opts);
        if (r) {changed.push(r);}
      }
    }
  }
  return changed;
}

/**
 * Publish step: every JSON file of the payload in ASCII, app.json checked against the
 * Athom 4 MB limit. If full ASCII would push app.json over it, app.json falls back to
 * escaping only chars above U+00FF (one-byte in V8 all the same).
 */
function asciiPublishPayload(destDir, opts = {}) {
  const limit = opts.maxAppJsonBytes || 4 * 1024 * 1024;
  const appJson = path.join(destDir, 'app.json');
  const original = fs.existsSync(appJson) ? fs.readFileSync(appJson) : null;
  const changed = asciiJsonTree(destDir, opts);
  let appJsonMode = 'ascii';
  if (original && fs.statSync(appJson).size > limit) {
    fs.writeFileSync(appJson, original);
    const r = asciiJsonFile(appJson, { mode: 'wide' });
    appJsonMode = 'wide';
    const i = changed.findIndex((c) => c.file === appJson);
    if (i >= 0) {changed.splice(i, 1);}
    if (r) {changed.push(r);}
  }
  const sum = (k) => changed.reduce((n, c) => n + c[k], 0);
  return {
    files: changed.length,
    appJsonMode,
    appJsonBytes: original ? fs.statSync(appJson).size : 0,
    bytesBefore: sum('bytesBefore'),
    bytesAfter: sum('bytesAfter'),
    textHeapBefore: sum('textHeapBefore'),
    textHeapAfter: sum('textHeapAfter'),
    changed,
  };
}

module.exports = { stringifyAscii, asciiJsonFile, asciiJsonTree, asciiPublishPayload, countChars };

if (require.main === module) {
  const dir = path.resolve(process.argv[2] || path.join(require('os').tmpdir(), 'homey-publish-temp'));
  const r = asciiPublishPayload(dir);
  console.log(`[P3047] ${r.files} JSON file(s) made ASCII, app.json mode=${r.appJsonMode} ${(r.appJsonBytes / 1048576).toFixed(2)} MB; parse text heap ${(r.textHeapBefore / 1048576).toFixed(2)} -> ${(r.textHeapAfter / 1048576).toFixed(2)} MB`);
}
