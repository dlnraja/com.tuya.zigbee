#!/usr/bin/env node
'use strict';

/**
 * Build-only image optimizer for Homey publish archives.
 *
 * Source driver assets stay untouched. This script only rewrites PNG files
 * inside .homeybuild to keep Athom's server-side processing below its practical
 * archive-size ceiling.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const BUILD_DIR = process.env.HOMEY_BUILD_DIR
  ? path.resolve(process.env.HOMEY_BUILD_DIR)
  : path.join(ROOT, '.homeybuild');
const DRIVERS_DIR = path.join(BUILD_DIR, 'drivers');

const TARGETS = new Map([
  ['small.png', { max: 96, colors: 96 }],
  ['large.png', { max: 320, colors: 128 }],
  ['xlarge.png', { max: 500, colors: 160 }],
]);

const MIN_SAVINGS_BYTES = 128;
const CONCURRENCY = Math.max(1, Number(process.env.HOMEY_IMAGE_OPTIMIZE_CONCURRENCY || 6));

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fileSize(file) {
  return fs.statSync(file).size;
}

function listDriverPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      const spec = TARGETS.get(entry.name);
      if (spec) out.push({ file: full, spec });
    }
  }
  return out;
}

function loadSharp() {
  try {
    return require('sharp');
  } catch (e) {
    return null;
  }
}

function hasMagick() {
  const check = spawnSync('magick', ['-version'], { encoding: 'utf8' });
  return !check.error && check.status === 0;
}

async function optimizeWithSharp(sharp, item) {
  const before = fileSize(item.file);
  const buffer = await sharp(item.file, { limitInputPixels: false })
    .rotate()
    .resize({
      width: item.spec.max,
      height: item.spec.max,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png({
      compressionLevel: 9,
      effort: 10,
      palette: true,
      colors: item.spec.colors,
      dither: 0.75,
    })
    .toBuffer();

  if (buffer.length + MIN_SAVINGS_BYTES < before) {
    fs.writeFileSync(item.file, buffer);
    return { before, after: buffer.length, optimized: true };
  }
  return { before, after: before, optimized: false };
}

function optimizeWithMagick(item) {
  const before = fileSize(item.file);
  const tmp = `${item.file}.${process.pid}.opt.png`;
  const args = [
    item.file,
    '-auto-orient',
    '-resize',
    `${item.spec.max}x${item.spec.max}>`,
    '-strip',
    '-colors',
    String(item.spec.colors),
    '-define',
    'png:compression-level=9',
    '-define',
    'png:compression-strategy=2',
    tmp,
  ];

  const res = spawnSync('magick', args, { encoding: 'utf8' });
  if (res.error || res.status !== 0 || !fs.existsSync(tmp)) {
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
    const reason = res.error ? res.error.message : (res.stderr || `exit ${res.status}`);
    throw new Error(`ImageMagick failed for ${item.file}: ${reason}`);
  }

  const after = fileSize(tmp);
  if (after + MIN_SAVINGS_BYTES < before) {
    fs.renameSync(tmp, item.file);
    return { before, after, optimized: true };
  }

  fs.rmSync(tmp, { force: true });
  return { before, after: before, optimized: false };
}

async function runQueue(items, worker) {
  let index = 0;
  const results = [];
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      results.push(await worker(item));
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  if (!fs.existsSync(DRIVERS_DIR)) {
    console.log('[optimize-build-images] .homeybuild drivers not found, skipping');
    return;
  }

  const images = listDriverPngs(DRIVERS_DIR);
  if (images.length === 0) {
    console.log('[optimize-build-images] no driver PNGs found, skipping');
    return;
  }

  const sharp = loadSharp();
  const useMagick = !sharp && hasMagick();
  if (!sharp && !useMagick) {
    console.warn('[optimize-build-images] WARN: neither sharp nor ImageMagick is available; image optimization skipped');
    return;
  }

  const tool = sharp ? 'sharp' : 'ImageMagick';
  const results = await runQueue(images, async item => {
    try {
      return sharp ? await optimizeWithSharp(sharp, item) : optimizeWithMagick(item);
    } catch (e) {
      return { before: fileSize(item.file), after: fileSize(item.file), optimized: false, error: e.message };
    }
  });

  const before = results.reduce((sum, r) => sum + r.before, 0);
  const after = results.reduce((sum, r) => sum + r.after, 0);
  const optimized = results.filter(r => r.optimized).length;
  const errors = results.filter(r => r.error);

  console.log(`[optimize-build-images] tool=${tool}, files=${images.length}, optimized=${optimized}, saved=${formatBytes(before - after)} (${formatBytes(before)} -> ${formatBytes(after)})`);

  if (errors.length > 0) {
    console.warn(`[optimize-build-images] WARN: ${errors.length} image(s) failed to optimize`);
    for (const err of errors.slice(0, 10)) console.warn(`  - ${err.error}`);
    if (process.env.HOMEY_IMAGE_OPTIMIZER_STRICT === '1') process.exit(1);
  }
}

main().catch(e => {
  console.error('[optimize-build-images] FATAL:', e.message);
  process.exit(1);
});
