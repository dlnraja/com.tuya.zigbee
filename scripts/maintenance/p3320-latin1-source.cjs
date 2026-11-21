'use strict';

/**
 * P3320: keep shipped JavaScript Latin-1 (chars <= U+00FF) and drop unreferenced package images.
 *
 * WHY: V8 retains every loaded module's source text. Any char above U+00FF doubles that
 * file's retained size (P3312 / Bastien OOM). Decorative emoji, box-drawing and typographic
 * symbols are replaced with ASCII; genuine non-Latin text is kept as \\uXXXX escapes so
 * runtime values stay identical. Unreferenced logos/images are not packaged.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WIDE = /[\u0100-\uFFFF]/;
const JS_EXT = /\.(c?js)$/;
const IMG_EXT = /\.(png|jpe?g|gif|svg|webp|ico)$/i;
const SKIP_WALK = new Set(['node_modules', '.git']);

const BOX = {
  0x2500: '-', 0x2501: '-', 0x2502: '|', 0x2503: '|',
  0x250C: '+', 0x2510: '+', 0x2514: '+', 0x2518: '+',
  0x251C: '+', 0x2524: '+', 0x252C: '+', 0x2534: '+', 0x253C: '+',
  0x2550: '=', 0x2551: '|',
  0x2554: '+', 0x2557: '+', 0x255A: '+', 0x255D: '+',
  0x2560: '+', 0x2563: '+', 0x2566: '+', 0x2569: '+', 0x256C: '+',
  0x2552: '+', 0x2553: '+', 0x2555: '+', 0x2556: '+',
  0x2558: '+', 0x2559: '+', 0x255B: '+', 0x255C: '+',
  0x255E: '+', 0x255F: '+', 0x2561: '+', 0x2562: '+',
  0x2564: '+', 0x2565: '+', 0x2567: '+', 0x2568: '+',
  0x256A: '+', 0x256B: '+',
  0x2574: '-', 0x2575: '|', 0x2576: '-', 0x2577: '|',
  0x257C: '-', 0x257D: '|', 0x257E: '-', 0x257F: '|',
  0x2588: '#', 0x2591: '.', 0x2592: ':', 0x2593: '#',
};

// Decorative / typographic / emoji replacements (longest tokens first).
const DECORATIVE = [
  ['⚠️', '[WARN]'], ['⚠︎', '[WARN]'], ['❌', '[ERR]'], ['✅', '[OK]'],
  ['☑️', '[OK]'], ['✔️', '[OK]'], ['✖', 'x'], ['✗', 'x'], ['✘', 'x'],
  ['✓', '[OK]'], ['✔', '[OK]'], ['✕', 'x'],
  ['ℹ️', '[INFO]'], ['ℹ︎', '[INFO]'], ['ℹ️'.normalize('NFC'), '[INFO]'],
  ['⚡︎', '[PWR]'], ['⚡️', '[PWR]'],
  ['➡️', '->'], ['⬅️', '<-'], ['↔️', '<->'], ['⬆', '^'], ['⬇', 'v'],
  ['➡', '->'], ['➤', '->'], ['➜', '->'], ['→', '->'], ['←', '<-'],
  ['↔', '<->'], ['⇒', '=>'], ['↳', '->'], ['↕', '|'],
  ['—', '-'], ['–', '-'], ['−', '-'], ['‐', '-'], ['‑', '-'],
  ['…', '...'], ['•', '*'], ['●', '*'], ['○', 'o'],
  ['■', '#'], ['□', '#'], ['▪', '*'], ['▸', '>'], ['►', '>'], ['▶', '>'],
  ['◀', '<'], ['▲', '^'], ['▼', 'v'],
  // Typographic quotes/apostrophes are \\u-escaped, not replaced with ' or ":
  // replacing them can terminate a surrounding JS string (e.g. 'app\u2019s').
  ['≥', '>='], ['≤', '<='], ['≠', '!='], ['≈', '~='], ['≡', '=='],
  ['≫', '>>'], ['≪', '<<'], ['⨯', 'x'],   ['∞', 'inf'], ['∈', 'in'], ['∩', 'AND'], ['∫', 'integral'],
  ['⊘', '[SKIP]'],
  ['‰', ' per-mille'], ['†', '+'], ['‡', '++'], ['˜', '~'],
  ['📥', '[IN]'], ['📤', '[OUT]'], ['📦', '[PKG]'], ['📋', '[LIST]'],
  ['📊', '[STAT]'], ['🔍', '[SCAN]'], ['🔎', '[SCAN]'], ['📡', '[ZB]'],
  ['🔋', '[BAT]'], ['🪫', '[BAT-LOW]'], ['🔌', '[AC]'], ['🔄', '[SYNC]'],
  ['🔘', '[BTN]'], ['⏰', '[TIME]'], ['⏱', '[TIME]'], ['⏳', '[WAIT]'],
  ['⏭', '[SKIP]'], ['⏯', '[PLAY]'], ['⏸', '[PAUSE]'], ['⏹', '[STOP]'],
  ['⏩', '>>'], ['⏳', '[WAIT]'],
  ['🎯', '[GOAL]'], ['💡', '[HINT]'], ['🧠', '[SMART]'], ['🛡', '[GUARD]'],
  ['🛡️', '[GUARD]'], ['🚨', '[ALERT]'], ['🚀', '[GO]'], ['💧', '[WET]'],
  ['📖', '[DOC]'], ['🌡', '[TEMP]'], ['🌡️', '[TEMP]'], ['➕', '+'], ['➖', '-'],
  ['🔧', '[FIX]'], ['⚙', '[CFG]'], ['⚙️', '[CFG]'], ['🧹', '[CLEAN]'],
  ['🤖', '[BOT]'], ['🆕', '[NEW]'], ['🔔', '[BELL]'], ['🛑', '[STOP]'],
  ['🔗', '[LINK]'], ['🔒', '[LOCK]'], ['🔓', '[UNLOCK]'], ['🔐', '[LOCK]'],
  ['🔑', '[KEY]'], ['🗑', '[DEL]'], ['🗑️', '[DEL]'],
  ['🔶', '[A]'], ['🔷', '[B]'], ['🔴', '[RED]'], ['🟢', '[ON]'],
  ['🟡', '[YEL]'], ['🟠', '[ORG]'], ['🔵', '[BLU]'], ['⚪', '[OFF]'],
  ['📱', '[PHONE]'], ['⭐', '*'], ['✨', '*'], ['❓', '?'],
  ['💥', '[HIT]'], ['☀', '[SUN]'], ['☀️', '[SUN]'], ['🎉', '[OK]'],
  ['🏥', '[HOSP]'], ['🔥', '[HOT]'], ['📚', '[DOC]'], ['🔬', '[LAB]'],
  ['🏠', '[HOME]'], ['🏡', '[HOME]'], ['🚶', '[WALK]'], ['🏃', '[RUN]'],
  ['🔮', '[PRED]'], ['🚫', '[NO]'], ['⛔', '[NO]'],
  ['💾', '[SAVE]'], ['📌', '[PIN]'], ['📝', '[NOTE]'], ['🚪', '[DOOR]'],
  ['🌐', '[NET]'], ['🎓', '[REF]'], ['👀', '[SEE]'], ['👁', '[SEE]'],
  ['📨', '[MSG]'], ['📢', '[MSG]'], ['🚩', '[FLAG]'],
  ['🎨', '[UI]'], ['🎬', '[REC]'], ['💤', '[SLEEP]'], ['😴', '[SLEEP]'],
  ['🔦', '[LIGHT]'], ['👂', '[LISTEN]'], ['🧪', '[TEST]'], ['👤', '[USER]'],
  ['🌿', '[PLANT]'], ['🌱', '[PLANT]'], ['🏭', '[IND]'], ['🪄', '[AUTO]'],
  ['📈', '[UP]'], ['📉', '[DOWN]'], ['📶', '[RSSI]'], ['📍', '[LOC]'],
  ['📅', '[DATE]'], ['🔊', '[SND]'], ['🔇', '[MUTE]'], ['💉', '[MED]'],
  ['🏗', '[WIP]'], ['🏗️', '[WIP]'], ['✍', '[EDIT]'], ['✍️', '[EDIT]'],
  ['🛠', '[TOOL]'], ['🛠️', '[TOOL]'], ['🎛', '[KNOB]'], ['🎛️', '[KNOB]'],
  ['🥣', '[BOWL]'], ['🥶', '[COLD]'], ['🌬', '[AIR]'], ['🌬️', '[AIR]'],
  ['🌟', '*'], ['🙏', '[THX]'], ['☁', '[CLOUD]'], ['☁️', '[CLOUD]'],
  ['✋', '[HAND]'], ['⛓', '[LINK]'], ['⛓️', '[LINK]'],
  ['🌉', '[BRIDGE]'], ['🕒', '[TIME]'], ['🕐', '[TIME]'], ['🧮', '[CALC]'],
  ['🧩', '[PART]'], ['🔆', '[BRIGHT]'], ['🌍', '[WORLD]'], ['📏', '[LEN]'],
  ['🚿', '[WATER]'], ['🦶', '[FOOT]'], ['🌀', '[FAN]'], ['❄', '[COLD]'],
  ['❄️', '[COLD]'], ['💨', '[AIR]'], ['🪟', '[WIN]'], ['🚗', '[CAR]'],
  ['🏊', '[SWIM]'], ['🧺', '[BIN]'], ['☕', '[CUP]'], ['📹', '[CAM]'],
  ['📺', '[TV]'], ['⛲', '[WATER]'], ['🆘', '[SOS]'], ['🎚', '[SLIDER]'],
  ['🎛️', '[SLIDER]'], ['🏷', '[TAG]'], ['🏷️', '[TAG]'],
  ['🌑', '[DARK]'], ['⚖', '[BAL]'], ['⚖️', '[BAL]'],
  ['🔀', '[MIX]'],
  ['⚡', '[PWR]'], ['ℹ', '[INFO]'], ['🧬', '[DNA]'], ['🌌', '[SKY]'],
  ['🎧', '[AUDIO]'], ['📲', '[PHONE]'], ['📩', '[MSG]'], ['💓', '[BEAT]'],
];


function loadIgnorer(root) {
  let ignore;
  try { ignore = require(require.resolve('ignore', { paths: [root, __dirname] })); } catch (_) {
    ignore = require('ignore');
  }
  const ig = ignore();
  // Homey CLI injects `.*` (dotfiles/dirs). `!.homeychangelog.json` is re-included in .homeyignore.
  ig.add('.*');
  ig.add('node_modules');
  const hi = path.join(root, '.homeyignore');
  if (fs.existsSync(hi)) {
    const raw = fs.readFileSync(hi, 'utf8');
    const lines = raw.split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#'));
    ig.add(lines);
  }
  // P3360: gitignored artifacts (screenshots/, report PNGs) are not packaged; do not fail the
  // unreferenced-image gate on files that git already excludes.
  const gi = path.join(root, '.gitignore');
  if (fs.existsSync(gi)) {
    const raw = fs.readFileSync(gi, 'utf8');
    const lines = raw.split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#'));
    ig.add(lines);
  }
  return ig;
}

function isIgnored(ig, rel) {
  const posix = rel.split(path.sep).join('/');
  return ig.ignores(posix);
}

function walkShipped(root, { extRe, ig = loadIgnorer(root) } = {}) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { continue; }
    for (const e of entries) {
      if (SKIP_WALK.has(e.name)) continue;
      const full = path.join(dir, e.name);
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (!rel || rel === '.') continue;
      if (isIgnored(ig, e.isDirectory() ? `${rel}/` : rel) && isIgnored(ig, rel)) continue;
      if (e.isDirectory()) {
        // If the directory itself is ignored, do not descend.
        if (isIgnored(ig, rel) || isIgnored(ig, `${rel}/`)) continue;
        stack.push(full);
      } else if (e.isFile() && (!extRe || extRe.test(e.name))) {
        if (!isIgnored(ig, rel)) out.push({ full, rel });
      }
    }
  }
  return out;
}

function listShippedJs(root) {
  return walkShipped(root, { extRe: JS_EXT });
}

// cp1252 code points for bytes 0x80-0x9F (UTF-8 bytes misread as Windows-1252).
const CP1252 = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a,
  0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };

function byteOf(code) {
  if (code <= 0xff) return code;
  return CP1252[code] != null ? CP1252[code] : -1;
}

/** Repair UTF-8 that was saved as Windows-1252/Latin-1 text ("ðŸŒ¡ï¸" -> real emoji). Only exact,
 * fully valid UTF-8 sequences are decoded; anything else is left unchanged. */
function tryDecodeMojibake(text) {
  if (!/[\u00C2-\u00F4]/.test(text)) return text;
  const dec = new TextDecoder('utf-8', { fatal: true });
  let out = '';
  let i = 0;
  while (i < text.length) {
    const b0 = byteOf(text.charCodeAt(i));
    let need = 0;
    if (b0 >= 0xc2 && b0 <= 0xdf) need = 1;
    else if (b0 >= 0xe0 && b0 <= 0xef) need = 2;
    else if (b0 >= 0xf0 && b0 <= 0xf4) need = 3;
    if (need && i + need < text.length + 0) {
      const bytes = [b0];
      let ok = true;
      for (let k = 1; k <= need; k++) {
        const b = byteOf(text.charCodeAt(i + k));
        if (b < 0x80 || b > 0xbf) { ok = false; break; }
        bytes.push(b);
      }
      if (ok) {
        try {
          out += dec.decode(Uint8Array.from(bytes));
          i += need + 1;
          continue;
        } catch (_) { /* not valid UTF-8 */ }
      }
    }
    out += text[i];
    i++;
  }
  return out;
}


/** Escape chars > U+00FF inside JS regex literals so later ASCII replacements cannot
 *  expand a character class (e.g. [≈ƒ→] must not become [~=\u0192->]). */
function escapeWideInRegexLiterals(text) {
  let out = '';
  let i = 0;
  const n = text.length;

  function lastCode() {
    for (let k = out.length - 1; k >= 0; k--) {
      const ch = out[k];
      if (ch === ' ' || ch === '\t' || ch === '\v' || ch === '\f' || ch === '\u00a0' || ch === '\n' || ch === '\r') continue;
      return ch;
    }
    return '';
  }

  function canStartRegex() {
    const c = lastCode();
    if (!c) return true;
    if ('(,=:[!&|?{};,~%^<>+-' .includes(c) || c === '*' || c === '/') return true;
    const trimmed = out.replace(/[ \t\v\f\u00a0\n\r]+$/g, '');
    return /(?:^|[^\w$])(?:return|throw|case|new|typeof|void|delete|await|yield|in|of)$/.test(trimmed);
  }

  function copyUntil(quote) {
    out += text[i];
    i++;
    while (i < n) {
      const ch = text[i];
      out += ch;
      i++;
      if (ch === '\\' && i < n) { out += text[i]; i++; continue; }
      if (ch === quote) break;
    }
  }

  function copyTemplate() {
    out += text[i];
    i++;
    while (i < n) {
      const ch = text[i];
      if (ch === '\\' && i + 1 < n) { out += ch + text[i + 1]; i += 2; continue; }
      if (ch === '`') { out += ch; i++; return; }
      if (ch === '$' && text[i + 1] === '{') {
        out += '${';
        i += 2;
        let depth = 1;
        const start = i;
        while (i < n && depth) {
          // Nested strings/comments/regex inside ${}
          const save = i;
          const before = out.length;
          // reuse the main scanner for the interpolation by recursion on a slice is messy;
          // handle the common cases inline via a nested call-like loop:
          if (text[i] === "'" || text[i] === '"') { copyUntil(text[i]); continue; }
          if (text[i] === '`') { copyTemplate(); continue; }
          if (text[i] === '/' && text[i + 1] === '/') {
            while (i < n && text[i] !== '\n') { out += text[i]; i++; }
            continue;
          }
          if (text[i] === '/' && text[i + 1] === '*') {
            out += '/*'; i += 2;
            while (i + 1 < n && !(text[i] === '*' && text[i + 1] === '/')) { out += text[i]; i++; }
            if (i + 1 < n) { out += '*/'; i += 2; }
            continue;
          }
          if (text[i] === '{') { out += '{'; i++; depth++; continue; }
          if (text[i] === '}') { depth--; if (depth === 0) { out += '}'; i++; break; } out += '}'; i++; continue; }
          out += text[i];
          i++;
          void save; void before; void start;
        }
        continue;
      }
      out += ch;
      i++;
    }
  }

  function copyRegex() {
    const start = i;
    i++; // opening /
    let body = '';
    let cls = false;
    while (i < n) {
      const ch = text[i];
      if (ch === '\\' && i + 1 < n) { body += ch + text[i + 1]; i += 2; continue; }
      if (ch === '[' && !cls) { cls = true; body += ch; i++; continue; }
      if (ch === ']' && cls) { cls = false; body += ch; i++; continue; }
      if (ch === '/' && !cls) { i++; break; }
      if ((ch === '\n' || ch === '\r') && !cls) { // not a regex; emit as-is
        out += text.slice(start, start + 1) + body;
        // ch not consumed as end; fall through by resetting? We'll append and return to main
        out += body ? '' : '';
        // rollback: treat as division, not regex
        out += '/';
        i = start + 1;
        return;
      }
      body += ch;
      i++;
    }
    let flags = '';
    while (i < n && /[a-z]/i.test(text[i])) { flags += text[i]; i++; }
    out += '/' + escapeWide(body) + '/' + flags;
  }

  while (i < n) {
    const ch = text[i];
    const nx = text[i + 1];
    if (ch === '/' && nx === '/') {
      while (i < n && text[i] !== '\n') { out += text[i]; i++; }
      continue;
    }
    if (ch === '/' && nx === '*') {
      out += '/*'; i += 2;
      while (i + 1 < n && !(text[i] === '*' && text[i + 1] === '/')) { out += text[i]; i++; }
      if (i + 1 < n) { out += '*/'; i += 2; }
      continue;
    }
    if (ch === "'" || ch === '"') { copyUntil(ch); continue; }
    if (ch === '`') { copyTemplate(); continue; }
    if (ch === '/' && canStartRegex()) { copyRegex(); continue; }
    out += ch;
    i++;
  }
  return out;
}

function replaceDecorative(text) {
  let out = text;
  for (const [from, to] of DECORATIVE) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  // box-drawing + leftover VS16 / ZWJ
  let buf = '';
  for (let i = 0; i < out.length; i++) {
    const c = out.charCodeAt(i);
    if (c === 0xfe0f || c === 0x200d) continue; // variation selector / ZWJ
    if (BOX[c] != null) { buf += BOX[c]; continue; }
    buf += out[i];
  }
  return buf;
}

function escapeWide(text) {
  let out = '';
  let last = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    // Handle surrogate pairs as a single \\u{XXXXX} so the file stays Latin-1.
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const c2 = text.charCodeAt(i + 1);
      if (c2 >= 0xdc00 && c2 <= 0xdfff) {
        const cp = ((c - 0xd800) << 10) + (c2 - 0xdc00) + 0x10000;
        // drop a backslash that would escape the new escape
        let cut = i;
        let bs = 0;
        while (cut - bs - 1 >= last && text.charCodeAt(cut - bs - 1) === 0x5c) bs++;
        if (bs % 2 === 1) cut -= 1;
        out += text.slice(last, cut) + `\\u{${cp.toString(16)}}`;
        last = i + 2;
        i++;
        continue;
      }
    }
    if (c <= 0xff) continue;
    let cut = i;
    let bs = 0;
    while (cut - bs - 1 >= last && text.charCodeAt(cut - bs - 1) === 0x5c) bs++;
    if (bs % 2 === 1) cut -= 1;
    out += text.slice(last, cut) + `\\u${c.toString(16).padStart(4, '0')}`;
    last = i + 1;
  }
  return last === 0 ? text : out + text.slice(last);
}

function compiles(text, file) {
  vm.compileFunction(text.replace(/^#!.*/, ''), ['exports', 'require', 'module', '__filename', '__dirname'], { filename: file });
}

// Mojibake fragments whose lost byte (cp1252 0x81/0x8D/0x8F/0x90/0x9D or NBSP) blocks a clean decode.
const BROKEN_MOJIBAKE = [
  [/\u00e2\u0161\u00a0?(?:\u00ef\u00b8)?/g, '[WARN]'], // U+26A0 (+VS16)
  [/\u00e2\u2022(?=[\u2550-\u256c=+|-]|\u00e2)/g, '='],  // U+2550 run with a lost byte
  [/\u00e2\u2022/g, '='],
  [/\u00ef\u00b8/g, ''],                                // VS16 EF B8 8F with lost 0x8F
  [/\u00e2\u20ac(?=[\s\w])/g, '-'],                     // dash/quote with a lost last byte
];

function repairBrokenMojibake(text) {
  let out = text;
  for (const [re, to] of BROKEN_MOJIBAKE) out = out.replace(re, to);
  return out;
}

function stripJsText(text) {
  const bom = text.charCodeAt(0) === 0xfeff;
  let body = bom ? text.slice(1) : text;
  body = tryDecodeMojibake(body);
  body = repairBrokenMojibake(body);
  body = escapeWideInRegexLiterals(body);
  body = replaceDecorative(body);
  // U+FFFD and format chars are escaped, not deleted (they appear in regexes).
  if (WIDE.test(body)) body = escapeWide(body);
  return body;
}

function stripJsFile(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (_) { return null; }
  if (!WIDE.test(text) && !/[\u00C2-\u00F4][\u0080-\u00BF]/.test(text)) return null;
  const out = stripJsText(text);
  if (out === text) return null;
  // Must still compile if it compiled before (CommonJS).
  let could = false;
  try { compiles(text.replace(/^\uFEFF/, ''), file); could = true; } catch (_) { /* not CJS, still write if Latin-1 */ }
  if (could) compiles(out, file);
  if (WIDE.test(out)) {
    const leftover = [];
    for (let i = 0; i < out.length; i++) {
      if (out.charCodeAt(i) > 0xff) leftover.push(`U+${out.charCodeAt(i).toString(16).toUpperCase()}`);
      if (leftover.length >= 8) break;
    }
    throw new Error(`${file}: still has chars > U+00FF after strip (${leftover.join(', ')})`);
  }
  fs.writeFileSync(file, out);
  return {
    file,
    charsBefore: text.length,
    charsAfter: out.length,
    bytesBefore: Buffer.byteLength(text),
    bytesAfter: Buffer.byteLength(out),
    textHeapBefore: text.length * (WIDE.test(text) ? 2 : 1),
    textHeapAfter: out.length,
  };
}

function stripShippedJs(root) {
  const files = listShippedJs(root);
  const changed = [];
  for (const f of files) {
    const r = stripJsFile(f.full);
    if (r) changed.push({ ...r, rel: f.rel });
  }
  const sum = (k) => changed.reduce((n, c) => n + c[k], 0);
  return {
    scanned: files.length,
    changed: changed.length,
    files: changed,
    bytesBefore: sum('bytesBefore'),
    bytesAfter: sum('bytesAfter'),
    textHeapBefore: sum('textHeapBefore'),
    textHeapAfter: sum('textHeapAfter'),
  };
}

function scanWideInShippedJs(root, { allowlist = [] } = {}) {
  const allow = new Set(allowlist.map((e) => (typeof e === 'string' ? e : e.file)));
  const hits = [];
  for (const f of listShippedJs(root)) {
    if (allow.has(f.rel)) continue;
    let text;
    try { text = fs.readFileSync(f.full, 'utf8'); } catch (_) { continue; }
    if (!WIDE.test(text)) continue;
    const counts = Object.create(null);
    let n = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c <= 0xff) continue;
      n++;
      const key = `U+${c.toString(16).toUpperCase().padStart(4, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    hits.push({ file: f.rel, count: n, chars: counts });
  }
  return hits;
}

function loadAllowlist(root) {
  const p = path.join(root, 'tools/ci/p3320-latin1-allowlist.json');
  if (!fs.existsSync(p)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(j) ? j : (j.files || []);
  } catch (_) {
    return [];
  }
}

const PATH_IN_TEXT = /(?:\/?(?:assets|drivers|images|icons)\/[A-Za-z0-9_./+\-]+?\.(?:png|svg|jpe?g|gif|webp|ico)|\{\{driverAssetsPath\}\}\/[A-Za-z0-9_./+\-]+?\.(?:png|svg|jpe?g|gif|webp|ico))/gi;
const TEXT_SCAN_EXT = new Set(['.json', '.js', '.cjs', '.mjs', '.html', '.htm', '.css', '.md']);

function resolveImageRef(ref, srcRel) {
  let r = ref.replace(/\\/g, '/').replace(/^\.\//, '');
  if (r.startsWith('/')) r = r.slice(1);
  if (r.startsWith('{{driverAssetsPath}}/')) {
    const parts = srcRel.split('/');
    if (parts[0] === 'drivers' && parts[1]) {
      return `drivers/${parts[1]}/assets/${r.slice('{{driverAssetsPath}}/'.length)}`;
    }
  }
  return r;
}

function collectImageRefs(root) {
  const refs = new Set();
  const add = (r) => { if (r) refs.add(r.replace(/\\/g, '/').replace(/^\//, '')); };
  const scanRoots = ['app.json', 'api.js', 'app.js', '.homeycompose', 'drivers', 'lib', 'settings', 'widgets', 'assets', 'locales'];
  const files = [];
  for (const sr of scanRoots) {
    const p = path.join(root, sr);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) files.push(p);
    else if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      const stack = [p];
      while (stack.length) {
        const dir = stack.pop();
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { continue; }
        for (const e of entries) {
          if (SKIP_WALK.has(e.name)) continue;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) stack.push(full);
          else if (TEXT_SCAN_EXT.has(path.extname(e.name).toLowerCase()) || e.name.endsWith('.compose.json')) files.push(full);
        }
      }
    }
  }
  for (const full of files) {
    let text;
    try { text = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }
    const rel = path.relative(root, full).split(path.sep).join('/');
    let m;
    PATH_IN_TEXT.lastIndex = 0;
    const re = new RegExp(PATH_IN_TEXT.source, 'gi');
    while ((m = re.exec(text))) add(resolveImageRef(m[0], rel));
  }
  // Standard Athom-required / conventional locations (must never be deleted).
  add('assets/images/small.png');
  add('assets/images/large.png');
  add('assets/images/xlarge.png');
  add('assets/icon.svg');
  // Custom capability icons by filename convention, if the capability exists.
  let capIds = new Set();
  try {
    const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    if (app.capabilities && typeof app.capabilities === 'object') {
      for (const id of Object.keys(app.capabilities)) capIds.add(id);
    }
    if (Array.isArray(app.drivers)) {
      for (const d of app.drivers) {
        if (d && d.images) {
          for (const v of Object.values(d.images)) if (typeof v === 'string') add(v);
        }
        if (d && d.zigbee && d.zigbee.learnmode && typeof d.zigbee.learnmode.image === 'string') {
          add(resolveImageRef(d.zigbee.learnmode.image, `drivers/${d.id}/driver.compose.json`));
        }
      }
    }
    if (app.images) for (const v of Object.values(app.images)) if (typeof v === 'string') add(v);
  } catch (_) { /* manifest may be mid-edit */ }
  const capDir = path.join(root, '.homeycompose', 'capabilities');
  if (fs.existsSync(capDir)) {
    for (const f of fs.readdirSync(capDir)) {
      if (!f.endsWith('.json')) continue;
      capIds.add(path.basename(f, '.json'));
      try {
        const j = JSON.parse(fs.readFileSync(path.join(capDir, f), 'utf8'));
        if (typeof j.icon === 'string') add(j.icon);
      } catch (_) { /* ignore */ }
    }
  }
  for (const id of capIds) add(`assets/capabilities/${id}.svg`);
  return refs;
}

function isStandardDriverAsset(rel) {
  const parts = rel.split('/');
  if (parts[0] !== 'drivers' || parts[2] !== 'assets') return false;
  const base = path.basename(rel, path.extname(rel));
  if (!['small', 'large', 'xlarge', 'icon'].includes(base)) return false;
  // drivers/<id>/assets/{small,large,xlarge,icon}.*
  // or drivers/<id>/assets/images/{small,large,xlarge}.*
  return parts.length === 4 || (parts.length === 5 && parts[3] === 'images');
}

function listShippedImages(root) {
  return walkShipped(root, { extRe: IMG_EXT });
}

function findUnreferencedImages(root) {
  const refs = collectImageRefs(root);
  const images = listShippedImages(root);
  const unref = [];
  for (const img of images) {
    const rel = img.rel;
    if (isStandardDriverAsset(rel)) continue;
    if (refs.has(rel) || refs.has(`/${rel}`)) continue;
    const alt1 = rel.replace('/assets/images/', '/assets/');
    const alt2 = rel.replace('/assets/', '/assets/images/');
    if (refs.has(alt1) || refs.has(alt2)) continue;
    let sz = 0;
    try { sz = fs.statSync(img.full).size; } catch (_) { continue; }
    unref.push({ file: rel, full: img.full, bytes: sz });
  }
  unref.sort((a, b) => b.bytes - a.bytes);
  return unref;
}

function removeUnreferencedImages(root) {
  const unref = findUnreferencedImages(root);
  let bytes = 0;
  const removed = [];
  for (const u of unref) {
    try {
      fs.unlinkSync(u.full);
      bytes += u.bytes;
      removed.push(u);
    } catch (_) { /* leave it; gate will report */ }
  }
  return { removed: removed.length, bytes, files: removed };
}

module.exports = {
  WIDE,
  loadIgnorer,
  listShippedJs,
  listShippedImages,
  tryDecodeMojibake,
  replaceDecorative,
  escapeWide,
  stripJsText,
  stripJsFile,
  stripShippedJs,
  scanWideInShippedJs,
  loadAllowlist,
  collectImageRefs,
  findUnreferencedImages,
  removeUnreferencedImages,
  isStandardDriverAsset,
};

if (require.main === module) {
  const root = path.resolve(process.argv[2] || '.');
  const mode = process.argv[3] || 'scan';
  if (mode === 'strip') {
    const r = stripShippedJs(root);
    console.log(`[P3320] stripped ${r.changed}/${r.scanned} shipped JS files; source text heap ${(r.textHeapBefore / 1048576).toFixed(2)} -> ${(r.textHeapAfter / 1048576).toFixed(2)} MB, bytes ${(r.bytesBefore / 1048576).toFixed(2)} -> ${(r.bytesAfter / 1048576).toFixed(2)} MB`);
  } else if (mode === 'images') {
    const u = findUnreferencedImages(root);
    const bytes = u.reduce((n, x) => n + x.bytes, 0);
    console.log(`[P3320] ${u.length} unreferenced packaged images, ${(bytes / 1048576).toFixed(2)} MB`);
    for (const x of u.slice(0, 40)) console.log(`  ${x.bytes}\t${x.file}`);
  } else if (mode === 'images-remove') {
    const r = removeUnreferencedImages(root);
    console.log(`[P3320] removed ${r.removed} unreferenced images, ${(r.bytes / 1048576).toFixed(2)} MB`);
  } else {
    const hits = scanWideInShippedJs(root, { allowlist: loadAllowlist(root) });
    console.log(`[P3320] ${hits.length} shipped JS file(s) still have chars > U+00FF`);
    for (const h of hits.slice(0, 20)) console.log(`  ${h.count}\t${h.file}`);
  }
}
