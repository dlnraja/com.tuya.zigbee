#!/usr/bin/env node
'use strict';
/**
 * fix-mojibake.js (v9.0.368)
 * Repairs UTF-8 double-encoding (mojibake) in JSON files using a STRICT
 * map of known-corrupt sequences only (Ã©→é, Â°→°, …). Legitimate uses of
 * "Ã" (Portuguese etc.) are never touched.
 *
 * Usage: node tools/ci/fix-mojibake.js [dir...]   (default: drivers .homeycompose locales)
 */
const fs = require('fs');
const path = require('path');

const MAP = {
  'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë', 'Ã§': 'ç', 'Ã®': 'î', 'Ã¯': 'ï',
  'Ã´': 'ô', 'Ã¶': 'ö', 'Ã¹': 'ù', 'Ã»': 'û', 'Ã¼': 'ü', 'Ã€': 'à', 'Ã‚': 'â',
  'Ã‰': 'É', 'Ãˆ': 'È', 'ÃŠ': 'Ê', 'Ã‡': 'Ç', 'ÃŽ': 'Î', 'Ã”': 'Ô', 'Ã›': 'Û',
  'Ã¡': 'á', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ', 'Ã¤': 'ä',
  'Â°': '°', 'Â²': '²', 'Â³': '³', 'Â±': '±', 'Âµ': 'µ', 'Â«': '«', 'Â»': '»',
  'Â©': '©', 'Â®': '®', 'Ã—': '×', 'Ã·': '÷', 'ÃŸ': 'ß', 'ÃJ': 'àJ', // "MÃJ" = "MàJ"
};
const RX = new RegExp(
  Object.keys(MAP).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
// Bare "Ã" before punctuation/quote/space = French "à" ("supérieur Ã", "luminosité Ã...")
const RX_BARE = /Ã(?=[.\s"'\]])/g;
const MAP2 = { 'Ã–': 'Ö', 'Ãœ': 'Ü', 'Ã¥': 'å', 'Ã¸': 'ø', 'ÃŒ': 'Ü' };
const RX2 = new RegExp(
  Object.keys(MAP2).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');

function main() {
  const dirs = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const targets = dirs.length ? dirs : ['drivers', '.homeycompose', 'locales'];
  let files = 0, repl = 0;
  const walk = (dir) => {
    if (!fs.existsSync(dir)) {return;}
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {walk(p);}
      else if (e.name.endsWith('.json')) {
        const raw = fs.readFileSync(p, 'utf8');
        const out = raw
          .replace(RX, (m) => { repl++; return MAP[m]; })
          .replace(RX2, (m) => { repl++; return MAP2[m]; })
          .replace(RX_BARE, () => { repl++; return 'à'; });
        if (out !== raw) {fs.writeFileSync(p, out); files++;}
      }
    }
  };
  for (const t of targets) {walk(t);}
  console.log(`[fix-mojibake] fichiers réparés: ${files} | remplacements: ${repl}`);
}

main();
