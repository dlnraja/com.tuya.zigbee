#!/usr/bin/env node
/**
 * 🎨 ULTIMATE IMAGE GENERATOR V2.0 - Images personnalisées + icônes d'alimentation
 * @version 2.1.46
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Power type detection
const POWER_TYPES = {
  AC: { names: ['_ac'], icon: '⚡', color: '#FF9800', label: 'AC' },
  DC: { names: ['_dc'], icon: '⚡', color: '#FFA726', label: 'DC' },
  BATTERY: { names: ['_battery'], icon: '🔋', color: '#4CAF50', label: 'BAT' },
  CR2032: { names: ['_cr2032'], icon: '🔘', color: '#66BB6A', label: 'CR' },
  CR2450: { names: ['_cr2450'], icon: '⭕', color: '#66BB6A', label: 'CR' },
  HYBRID: { names: ['_hybrid'], icon: '⚡🔋', color: '#9C27B0', label: 'HYB' }
};

function detectPowerType(name) {
  const lower = name.toLowerCase();
  for (const [type, cfg] of Object.entries(POWER_TYPES)) {
    if (cfg.names.some(n => lower.includes(n))) return { type, ...cfg };
  }
  return null;
}

function getColorScheme(name) {
  // Simplified color detection
  const schemes = {
    light: { p: '#FFC107', s: '#FFE082', a: '#FFA000', i: '💡' },
    dimmer: { p: '#FF9800', s: '#FFCC80', a: '#F57C00', i: '🔆' },
    switch: { p: '#4CAF50', s: '#A5D6A7', a: '#388E3C', i: '⚡' },
    motion: { p: '#2196F3', s: '#90CAF9', a: '#1976D2', i: '🏃' },
    sensor: { p: '#2196F3', s: '#90CAF9', a: '#1976D2', i: '📊' },
    plug: { p: '#9C27B0', s: '#E1BEE7', a: '#7B1FA2', i: '🔌' },
    temperature: { p: '#FF9800', s: '#FFCC80', a: '#F57C00', i: '🌡️' },
    smoke: { p: '#F44336', s: '#FFCDD2', a: '#D32F2F', i: '🚨' },
    default: { p: '#607D8B', s: '#B0BEC5', a: '#455A64', i: '📱' }
  };
  
  for (const [key, val] of Object.entries(schemes)) {
    if (name.toLowerCase().includes(key)) return val;
  }
  return schemes.default;
}

function drawIcon(ctx, w, h, name, colors) {
  const cx = w/2, cy = h/2;
  
  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, colors.p);
  grad.addColorStop(0.5, colors.s);
  grad.addColorStop(1, colors.a);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  
  // Circle
  const r = Math.min(w,h) * 0.45;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fill();
  
  // Icon
  ctx.font = `${Math.floor(w*0.35)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFF';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = w*0.02;
  ctx.fillText(colors.i, cx, cy);
  ctx.shadowColor = 'transparent';
}

function drawPowerBadge(ctx, w, h, power) {
  if (!power) return;
  
  const size = w*0.22, margin = w*0.08;
  const x = w-size-margin, y = h-size-margin;
  const cx = x+size/2, cy = y+size/2, r = size/2;
  
  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = w*0.03;
  
  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = power.color;
  ctx.lineWidth = w*0.008;
  ctx.stroke();
  
  ctx.shadowColor = 'transparent';
  
  // Label
  ctx.font = `bold ${size*0.4}px Arial`;
  ctx.fillStyle = '#FFF';
  ctx.fillText(power.label, cx, cy);
}

async function generateImages(driverName) {
  const assetsPath = path.join(DRIVERS_DIR, driverName, 'assets');
  if (!fs.existsSync(assetsPath)) fs.mkdirSync(assetsPath, { recursive: true });
  
  const colors = getColorScheme(driverName);
  const power = detectPowerType(driverName);
  
  // Generate 75x75
  const s = createCanvas(75, 75);
  const sCtx = s.getContext('2d');
  drawIcon(sCtx, 75, 75, driverName, colors);
  drawPowerBadge(sCtx, 75, 75, power);
  fs.writeFileSync(path.join(assetsPath, 'small.png'), s.toBuffer('image/png'));
  
  // Generate 500x500
  const l = createCanvas(500, 500);
  const lCtx = l.getContext('2d');
  drawIcon(lCtx, 500, 500, driverName, colors);
  drawPowerBadge(lCtx, 500, 500, power);
  fs.writeFileSync(path.join(assetsPath, 'large.png'), l.toBuffer('image/png'));
  
  // Generate 1000x1000
  const xl = createCanvas(1000, 1000);
  const xlCtx = xl.getContext('2d');
  drawIcon(xlCtx, 1000, 1000, driverName, colors);
  drawPowerBadge(xlCtx, 1000, 1000, power);
  fs.writeFileSync(path.join(assetsPath, 'xlarge.png'), xl.toBuffer('image/png'));
  
  return { colors, power, status: 'OK' };
}

async function main() {
  console.log('\n🎨 ULTIMATE IMAGE GENERATOR V2.0\n');
  console.log('✨ Génération images personnalisées + icônes alimentation\n');
  console.log('='.repeat(70) + '\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );
  
  console.log(`📁 ${drivers.length} drivers détectés\n`);
  
  let processed = 0;
  const stats = { ac: 0, dc: 0, battery: 0, cr2032: 0, cr2450: 0, hybrid: 0, none: 0 };
  
  for (const driver of drivers) {
    const result = await generateImages(driver);
    if (result.power) stats[result.power.type.toLowerCase()]++;
    else stats.none++;
    
    processed++;
    if (processed % 20 === 0) {
      console.log(`✅ ${processed}/${drivers.length} traités...`);
    }
  }
  
  console.log(`\n✅ ${processed} drivers complétés!\n`);
  console.log('📊 STATISTIQUES ALIMENTATION:\n');
  console.log(`⚡ AC: ${stats.ac}`);
  console.log(`⚡ DC: ${stats.dc}`);
  console.log(`🔋 Battery: ${stats.battery}`);
  console.log(`🔘 CR2032: ${stats.cr2032}`);
  console.log(`⭕ CR2450: ${stats.cr2450}`);
  console.log(`⚡🔋 Hybrid: ${stats.hybrid}`);
  console.log(`📱 Sans badge: ${stats.none}`);
  
  // Clean cache
  const buildPath = path.join(ROOT, '.homeybuild');
  if (fs.existsSync(buildPath)) {
    fs.rmSync(buildPath, { recursive: true, force: true });
    console.log('\n🧹 Cache .homeybuild nettoyé');
  }
  
  console.log('\n🎉 GÉNÉRATION TERMINÉE!\n');
}

main().catch(console.error);
