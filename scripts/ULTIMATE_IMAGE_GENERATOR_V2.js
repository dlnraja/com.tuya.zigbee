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

function detectGangCount(name) {
  const match = name.match(/(\d+)gang/i);
  return match ? parseInt(match[1]) : 1;
}

function drawIcon(ctx, w, h, name, colors) {
  const cx = w/2, cy = h/2;
  const lower = name.toLowerCase();
  
  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, colors.p);
  grad.addColorStop(0.5, colors.s);
  grad.addColorStop(1, colors.a);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  
  // Large white circle for icon area
  const r = Math.min(w,h) * 0.42;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = w*0.015;
  ctx.shadowOffsetY = w*0.008;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  
  // Draw device-specific icon with COLORS
  ctx.lineWidth = w*0.012;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const size = w * 0.16;
  
  if (lower.includes('switch') || lower.includes('gang')) {
    // Switch: draw multiple COLORED buttons for multi-gang
    const gangs = detectGangCount(name);
    const spacing = size * 1.1;
    const startX = cx - ((gangs - 1) * spacing) / 2;
    const buttonW = size * 0.45;
    const buttonH = size * 0.85;
    
    for (let i = 0; i < gangs; i++) {
      const x = startX + (i * spacing);
      
      // Button frame (dark)
      ctx.fillStyle = colors.a;
      ctx.fillRect(x - buttonW/2 - 2, cy - buttonH/2 - 2, buttonW + 4, buttonH + 4);
      
      // Button body (colored gradient)
      const btnGrad = ctx.createLinearGradient(x, cy - buttonH/2, x, cy + buttonH/2);
      btnGrad.addColorStop(0, colors.p);
      btnGrad.addColorStop(1, colors.s);
      ctx.fillStyle = btnGrad;
      ctx.fillRect(x - buttonW/2, cy - buttonH/2, buttonW, buttonH);
      
      // Toggle indicator (white)
      ctx.fillStyle = '#FFF';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(x, cy - buttonH/4, buttonW/5, 0, 2*Math.PI);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      
      // Indicator line
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, cy - buttonH/4);
      ctx.lineTo(x, cy + buttonH/6);
      ctx.stroke();
    }
  } else if (lower.includes('motion') || lower.includes('pir')) {
    // Motion sensor: person with COLORED waves
    ctx.fillStyle = colors.a;
    ctx.strokeStyle = colors.a;
    ctx.beginPath();
    ctx.arc(cx, cy - size*0.5, size*0.3, 0, 2*Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - size*0.2);
    ctx.lineTo(cx, cy + size*0.5);
    ctx.moveTo(cx - size*0.4, cy);
    ctx.lineTo(cx + size*0.4, cy);
    ctx.stroke();
    // COLORED Waves
    ctx.strokeStyle = colors.p;
    ctx.lineWidth = w*0.008;
    for(let i = 1; i <= 2; i++) {
      ctx.globalAlpha = 0.7 - i*0.2;
      ctx.beginPath();
      ctx.arc(cx, cy, size*(0.8 + i*0.3), -Math.PI/3, Math.PI/3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (lower.includes('temperature') || lower.includes('temp')) {
    // COLORED Thermometer
    ctx.fillStyle = colors.p;
    ctx.strokeStyle = colors.a;
    ctx.beginPath();
    ctx.arc(cx, cy + size*0.6, size*0.3, 0, 2*Math.PI);
    ctx.fill();
    ctx.fillRect(cx - size*0.15, cy - size*0.8, size*0.3, size*1.4);
    ctx.strokeRect(cx - size*0.15, cy - size*0.8, size*0.3, size*1.4);
    // Mercury column
    ctx.fillStyle = colors.p;
    ctx.fillRect(cx - size*0.08, cy - size*0.6, size*0.16, size*1.2);
  } else if (lower.includes('light') || lower.includes('bulb')) {
    // COLORED Light bulb
    ctx.fillStyle = colors.s;
    ctx.strokeStyle = colors.a;
    ctx.beginPath();
    ctx.arc(cx, cy - size*0.2, size*0.5, 0, 2*Math.PI);
    ctx.fill();
    ctx.fillStyle = colors.a;
    ctx.fillRect(cx - size*0.2, cy + size*0.3, size*0.4, size*0.5);
    // COLORED Rays
    ctx.strokeStyle = colors.p;
    ctx.lineWidth = w*0.008;
    for(let angle = 0; angle < Math.PI*2; angle += Math.PI/4) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle)*size*0.7, cy - size*0.2 + Math.sin(angle)*size*0.7);
      ctx.lineTo(cx + Math.cos(angle)*size, cy - size*0.2 + Math.sin(angle)*size);
      ctx.stroke();
    }
  } else if (lower.includes('dimmer')) {
    // Dimmer: slider
    ctx.strokeRect(cx - size*0.5, cy - size*0.8, size, size*1.6);
    ctx.fillRect(cx - size*0.1, cy - size*0.6, size*0.2, size*1.2);
    // Slider knob
    ctx.fillRect(cx - size*0.3, cy - size*0.2, size*0.6, size*0.4);
  } else if (lower.includes('door') || lower.includes('window') || lower.includes('contact')) {
    // Door/window sensor
    ctx.strokeRect(cx - size*0.7, cy - size*0.8, size*0.6, size*1.6);
    ctx.strokeRect(cx + size*0.1, cy - size*0.8, size*0.6, size*1.6);
    ctx.beginPath();
    ctx.arc(cx + size*0.5, cy, size*0.15, 0, 2*Math.PI);
    ctx.fill();
  } else if (lower.includes('plug') || lower.includes('socket')) {
    // Plug with prongs
    ctx.strokeRect(cx - size*0.7, cy - size*0.5, size*1.4, size);
    ctx.beginPath();
    ctx.moveTo(cx - size*0.3, cy - size*0.3);
    ctx.lineTo(cx - size*0.3, cy - size*0.6);
    ctx.moveTo(cx + size*0.3, cy - size*0.3);
    ctx.lineTo(cx + size*0.3, cy - size*0.6);
    ctx.stroke();
    ctx.strokeRect(cx - size*0.2, cy + size*0.1, size*0.4, size*0.3);
  } else if (lower.includes('curtain') || lower.includes('blind')) {
    // Curtain
    ctx.beginPath();
    ctx.moveTo(cx - size*0.8, cy - size*0.9);
    ctx.lineTo(cx + size*0.8, cy - size*0.9);
    ctx.stroke();
    for(let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i*size*0.3, cy - size*0.8);
      ctx.quadraticCurveTo(cx + i*size*0.3 + size*0.15, cy, cx + i*size*0.3, cy + size*0.8);
      ctx.stroke();
    }
  } else if (lower.includes('smoke') || lower.includes('gas')) {
    // Smoke detector circle
    ctx.beginPath();
    ctx.arc(cx, cy, size*0.8, 0, 2*Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, size*0.5, 0, 2*Math.PI);
    ctx.stroke();
    // Dots pattern
    for(let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle)*size*0.6, cy + Math.sin(angle)*size*0.6, size*0.1, 0, 2*Math.PI);
      ctx.fill();
    }
  } else if (lower.includes('leak')) {
    // Water drops
    for(let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(cx + (i-1)*size*0.4, cy + i*size*0.3, size*0.25, 0, 2*Math.PI);
      ctx.fill();
    }
  } else if (lower.includes('humidity')) {
    // Water drop shape
    ctx.beginPath();
    ctx.moveTo(cx, cy - size*0.8);
    ctx.quadraticCurveTo(cx + size*0.6, cy - size*0.2, cx + size*0.5, cy + size*0.3);
    ctx.quadraticCurveTo(cx, cy + size*0.8, cx - size*0.5, cy + size*0.3);
    ctx.quadraticCurveTo(cx - size*0.6, cy - size*0.2, cx, cy - size*0.8);
    ctx.fill();
    ctx.stroke();
  } else if (lower.includes('valve')) {
    // Valve/tap
    ctx.beginPath();
    ctx.arc(cx, cy, size*0.6, 0, 2*Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, size*0.4, 0, 2*Math.PI);
    ctx.stroke();
    ctx.fillRect(cx - size*0.12, cy - size*0.9, size*0.24, size*0.7);
  } else {
    // Default: generic device icon
    ctx.font = `${Math.floor(w*0.35)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(colors.i, cx, cy);
  }
  
  ctx.shadowColor = 'transparent';
}

function drawPowerBadge(ctx, w, h, power) {
  if (!power) return;
  
  // SMALLER badge that stays inside the white circle
  const size = w*0.14;
  const margin = w*0.12;
  const x = w-size-margin;
  const y = h-size-margin;
  const cx = x+size/2;
  const cy = y+size/2;
  const r = size/2;
  
  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = w*0.015;
  ctx.shadowOffsetY = w*0.005;
  
  // Background (darker with colored border)
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fill();
  
  // THICK colored border
  ctx.strokeStyle = power.color;
  ctx.lineWidth = w*0.012;
  ctx.stroke();
  
  ctx.shadowColor = 'transparent';
  
  // Label (white text)
  ctx.font = `bold ${size*0.45}px Arial`;
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
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
