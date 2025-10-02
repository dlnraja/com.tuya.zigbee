#!/usr/bin/env node
/**
 * IMAGE_GENERATOR.js - Génération images SDK3
 * Phase 4 du Script Ultime V25
 */

const { createCanvas } = require('canvas');
const fs = require('fs');

console.log('🖼️ IMAGE_GENERATOR - Génération images SDK3');

const drivers = fs.readdirSync('drivers').filter(f => 
  fs.statSync(`drivers/${f}`).isDirectory()
);

let created = 0;

drivers.forEach(driver => {
  const assetsDir = `drivers/${driver}/assets`;
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  
  // Small 75x75 (Memory 2e03bb52)
  const smallPath = `${assetsDir}/small.png`;
  if (!fs.existsSync(smallPath)) {
    const canvas = createCanvas(75, 75);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#E6E6E6';
    ctx.fillRect(0, 0, 75, 75);
    fs.writeFileSync(smallPath, canvas.toBuffer('image/png'));
    created++;
  }
  
  // Large 500x500
  const largePath = `${assetsDir}/large.png`;
  if (!fs.existsSync(largePath)) {
    const canvas = createCanvas(500, 500);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#E6E6E6';
    ctx.fillRect(0, 0, 500, 500);
    fs.writeFileSync(largePath, canvas.toBuffer('image/png'));
    created++;
  }
});

console.log(`✅ ${created} images créées (SDK3 compliant)`);
console.log('✅ Dimensions: 75x75 (small), 500x500 (large)');
