'use strict';

/**
 * P3312: write the payload JavaScript with every char above U+00FF as a \uXXXX escape.
 *
 * WHY: V8 keeps the source text of every loaded module for the life of the process
 * (lazy compilation and Function#toString need it). One emoji or arrow in a log string
 * turns the whole file into a two-byte string. Measured on bastien-home 1.0.238: 692 of
 * the 1403 app modules loaded at boot hold such a char, 16.2 MB of retained source text
 * instead of 8.1 MB, on a Homey whose app heap aborts near 62 MB (Bastien OOM).
 *
 * A \uXXXX escape gives the same value inside strings, templates, regular expressions
 * and identifiers, and is inert in comments. Files that read their own raw template text
 * (String.raw, `.raw`) and files that are not CommonJS are left as they are. Every rewritten file must still compile,
 * else the publish step fails. Applied to the publish payload only; sources stay UTF-8.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WIDE = /[\u0100-\uffff]/;
const SKIP_DIRS = new Set(['node_modules', '.git']);
const JS_EXT = /\.(c?js)$/;
const RAW_USE = /String\.raw|\.raw\s*\[/;

function hex4(code) {
  return `\\u${code.toString(16).padStart(4, '0')}`;
}

/** Escape every char > U+00FF. A backslash right before such a char is an identity escape
 * (`'\✅'` === `'✅'`), so it is dropped instead of escaping the new escape. */
function escapeWide(text) {
  let out = '';
  let last = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c <= 0xff) {continue;}
    let cut = i;
    let bs = 0;
    while (cut - bs - 1 >= last && text.charCodeAt(cut - bs - 1) === 0x5c) {bs++;}
    if (bs % 2 === 1) {cut -= 1;}
    out += text.slice(last, cut) + hex4(c);
    last = i + 1;
  }
  return last === 0 ? text : out + text.slice(last);
}

function compiles(text, file) {
  // CommonJS wrapper, as Node compiles a module.
  vm.compileFunction(text.replace(/^#!.*/, ''), ['exports', 'require', 'module', '__filename', '__dirname'], { filename: file });
}

/** Rewrite one file in place. Returns null when nothing changes. Throws when the result does not compile. */
function latin1JsFile(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (_) { return null; }
  const bom = text.charCodeAt(0) === 0xfeff;
  const body = bom ? text.slice(1) : text;
  if (!WIDE.test(body)) {return bom ? write(file, text, body, 0) : null;}
  if (RAW_USE.test(body)) {return { file, skipped: 'raw-template', charsBefore: text.length, textHeapBefore: text.length * 2, textHeapAfter: text.length * 2 };}
  let wide = 0;
  for (let i = 0; i < body.length; i++) { if (body.charCodeAt(i) > 0xff) {wide++;} }
  try { compiles(body, file); } catch (_) {
    // Not a CommonJS script (ES module, worker): nothing loads it as one on Homey; leave it.
    return { file, skipped: 'not-commonjs', charsBefore: text.length, textHeapBefore: text.length * 2, textHeapAfter: text.length * 2 };
  }
  const out = escapeWide(body);
  compiles(out, file);
  return write(file, text, out, wide);
}

function write(file, before, after, wide) {
  fs.writeFileSync(file, after);
  return {
    file,
    wide,
    charsBefore: before.length,
    charsAfter: after.length,
    bytesBefore: Buffer.byteLength(before),
    bytesAfter: Buffer.byteLength(after),
    textHeapBefore: before.length * (WIDE.test(before) ? 2 : 1),
    textHeapAfter: after.length,
  };
}

function latin1JsTree(root) {
  const changed = [];
  const skipped = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) {stack.push(full);}
      } else if (e.isFile() && JS_EXT.test(e.name)) {
        const r = latin1JsFile(full);
        if (r && r.skipped) {skipped.push(r);} else if (r) {changed.push(r);}
      }
    }
  }
  const sum = (k) => changed.reduce((n, c) => n + c[k], 0);
  return {
    files: changed.length,
    skipped,
    bytesBefore: sum('bytesBefore'),
    bytesAfter: sum('bytesAfter'),
    textHeapBefore: sum('textHeapBefore'),
    textHeapAfter: sum('textHeapAfter'),
    changed,
  };
}

module.exports = { escapeWide, latin1JsFile, latin1JsTree };

if (require.main === module) {
  const dir = path.resolve(process.argv[2] || '.');
  const r = latin1JsTree(dir);
  console.log(`[P3312] ${r.files} JS file(s) made Latin-1, ${r.skipped.length} skipped; source text heap ${(r.textHeapBefore / 1048576).toFixed(2)} -> ${(r.textHeapAfter / 1048576).toFixed(2)} MB, bytes ${(r.bytesBefore / 1048576).toFixed(2)} -> ${(r.bytesAfter / 1048576).toFixed(2)} MB`);
  for (const s of r.skipped) {console.log(`  skipped ${path.relative(dir, s.file)} (${s.skipped})`);}
}
