#!/usr/bin/env node
'use strict';

/**
 * Build-only SVG optimizer for Homey publish archives.
 *
 * Source driver assets stay untouched. This script only rewrites SVG files
 * inside .homeybuild to keep Athom's server-side processing below its practical
 * archive-size ceiling.
 *
 * Pure-JS minifier — no external tool dependencies.
 * Replaces the SVG with a minified version if savings are > 64 bytes.
 *
 * Run as part of: npm run prepare-publish (via fix-large-images.js pipeline)
 *   node scripts/maintenance/optimize-build-svgs.cjs
 *
 * Safe to run repeatedly — no-ops if .homeybuild/ does not exist.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const BUILD_DIR = process.env.HOMEY_BUILD_DIR
  ? path.resolve(process.env.HOMEY_BUILD_DIR)
  : path.join(ROOT, '.homeybuild');

const MIN_SAVINGS_BYTES = 64;

/**
 * Minify an SVG string by stripping comments, extra whitespace, and metadata.
 * Conservative — only removes content that's purely cosmetic.
 */
function minifySvg(svg) {
  let out = svg;
  // XML comments
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  // XML processing instructions
  out = out.replace(/<\?xml[^>]*\?>/g, '');
  // DOCTYPE declarations
  out = out.replace(/<!DOCTYPE[^>]*>/gi, '');
  // SVG metadata elements
  out = out.replace(/<metadata>[\s\S]*?<\/metadata>/gi, '');
  out = out.replace(/<title>[\s\S]*?<\/title>/gi, '');
  out = out.replace(/<desc>[\s\S]*?<\/desc>/gi, '');
  // Editor namespaces (Inkscape, sodipodi, etc.) — usually safe to drop
  out = out.replace(/\s*xmlns:(?:sodipodi|inkscape|dc|cc|rdf|svg(?=[\s>]))=("[^"]*"|'[^']*')/g, '');
  out = out.replace(/\s*sodipodi:[a-zA-Z-]+=("[^"]*"|'[^']*')/g, '');
  out = out.replace(/\s*inkscape:[a-zA-Z-]+=("[^"]*"|'[^']*')/g, '');
  // Collapse runs of whitespace
  out = out.replace(/\s+/g, ' ');
  // Strip whitespace between tags
  out = out.replace(/>\s+</g, '><');
  // Trim leading/trailing whitespace
  out = out.trim();
  return out;
}

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile() && /\.svg$/i.test(entry.name)) {
      files.push(full);
    }
  }
}

function main() {
  if (!fs.existsSync(BUILD_DIR)) {
    console.log('⏭️  .homeybuild not found, skipping SVG optimization');
    process.exit(0);
  }

  const files = [];
  walk(BUILD_DIR, files);

  let totalBefore = 0;
  let totalAfter = 0;
  let optimized = 0;
  let skipped = 0;

  for (const file of files) {
    let raw;
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch (e) {
      skipped++;
      continue;
    }
    const before = Buffer.byteLength(raw, 'utf8');
    totalBefore += before;
    const minified = minifySvg(raw);
    const after = Buffer.byteLength(minified, 'utf8');
    if (before - after < MIN_SAVINGS_BYTES) {
      totalAfter += before;
      continue;
    }
    fs.writeFileSync(file, minified, 'utf8');
    totalAfter += after;
    optimized++;
  }

  const savedMB = (totalBefore - totalAfter) / 1024 / 1024;
  console.log(`✅ SVG optimization: ${optimized} optimized, ${skipped} skipped, ${files.length} total`);
  console.log(`   ${(totalBefore / 1024 / 1024).toFixed(2)} MB → ${(totalAfter / 1024 / 1024).toFixed(2)} MB (saved ${savedMB.toFixed(2)} MB)`);
}

if (require.main === module) {
  main();
}

module.exports = { minifySvg };
