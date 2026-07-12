#!/usr/bin/env node
/**
 * coherent-icon-generator.js
 *
 * Generates coherent driver icons that respect the Homey design system:
 *   - SVG viewBox: 0 0 960 960 (Homey standard)
 *   - Color palette: blue tones (#2C5282, #4299E1, #1A365D) + neutrals
 *   - PNG: 75x75 (small) and 500x500 (large)
 *   - Same visual language across all drivers
 *
 * Usage:
 *   node coherent-icon-generator.js [driverId] [iconSpec] [...]
 *   node coherent-icon-generator.js --all
 *
 * Each driver has a unique icon "type" with specific shape/composition:
 *   - door: door frame with arrow indicator
 *   - motion: PIR sensor with detection waves
 *   - climate: thermometer with droplet
 *   - water: water drop with wave
 *   - smoke: detector with smoke cloud
 *   - switch: wall switch with toggle
 *   - plug: power plug with prongs
 *   - bulb: light bulb with rays
 *   - dimmer: dial with rotation indicator
 *   - remote: remote control with buttons
 *   - thermostat: temperature dial
 *   - valve: pipe valve
 *   - soil: plant in soil
 *   - gas: gas cloud
 *   - presence: radar waves
 *   - illuminance: sun with rays
 *   - air: air purifier with filter
 *   - button: wireless button
 *   - generic: generic Tuya icon
 *
 * @author Mavis continuous flow 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..', '..');

// Color palette (Homey standard)
const COLORS = {
  primary: '#2C5282',      // dark blue
  secondary: '#4299E1',    // medium blue
  tertiary: '#1A365D',     // darker blue
  accent: '#00B5D8',       // cyan
  light: '#E8F0F7',        // light blue background
  neutral: '#A0AEC0',      // neutral gray
  textDark: '#1A233A',     // dark text
  white: '#FFFFFF',
  success: '#48BB78',      // green
  warning: '#ED8936',      // orange
  danger: '#F56565',       // red
};

const VIEWBOX = '0 0 960 960';

// ===== ICON GENERATORS =====
// Each returns an SVG string with viewBox 0 0 960 960
const ICONS = {
  door: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Door frame -->
  <rect x="280" y="120" width="400" height="720" rx="20" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <!-- Door panel inset -->
  <rect x="320" y="180" width="320" height="600" rx="10" fill="${c.light}" stroke="${c.secondary}" stroke-width="10"/>
  <!-- Door handle -->
  <circle cx="600" cy="500" r="32" fill="${c.secondary}"/>
  <circle cx="600" cy="500" r="16" fill="${c.white}"/>
  <!-- Hinge indicators (left side) -->
  <rect x="295" y="220" width="20" height="60" rx="3" fill="${c.neutral}"/>
  <rect x="295" y="680" width="20" height="60" rx="3" fill="${c.neutral}"/>
  <!-- Status indicator (closed/open) -->
  <circle cx="480" cy="160" r="20" fill="${c.success}"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">DOOR</text>
</svg>`,

  motion: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- PIR sensor body -->
  <rect x="320" y="280" width="320" height="400" rx="40" fill="${c.white}" stroke="${c.primary}" stroke-width="16"/>
  <!-- Lens (dome) -->
  <ellipse cx="480" cy="440" rx="100" ry="120" fill="${c.secondary}" opacity="0.7"/>
  <ellipse cx="480" cy="440" rx="60" ry="80" fill="${c.tertiary}"/>
  <!-- LED indicator -->
  <circle cx="480" cy="640" r="16" fill="${c.danger}"/>
  <!-- Detection waves (left/right) -->
  <path d="M 220 480 Q 180 440 220 400" stroke="${c.accent}" stroke-width="20" fill="none" stroke-linecap="round"/>
  <path d="M 200 480 Q 140 420 200 360" stroke="${c.accent}" stroke-width="20" fill="none" stroke-linecap="round" opacity="0.6"/>
  <path d="M 740 480 Q 780 440 740 400" stroke="${c.accent}" stroke-width="20" fill="none" stroke-linecap="round"/>
  <path d="M 760 480 Q 820 420 760 360" stroke="${c.accent}" stroke-width="20" fill="none" stroke-linecap="round" opacity="0.6"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">MOTION</text>
</svg>`,

  climate: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Thermometer body -->
  <rect x="420" y="160" width="120" height="540" rx="60" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <!-- Mercury (blue gradient) -->
  <rect x="450" y="380" width="60" height="320" rx="30" fill="${c.secondary}"/>
  <!-- Bulb -->
  <circle cx="480" cy="700" r="80" fill="${c.tertiary}"/>
  <circle cx="480" cy="700" r="50" fill="${c.secondary}"/>
  <!-- Humidity droplet -->
  <path d="M 700 600 Q 700 540 740 540 Q 780 540 780 600 Q 780 660 740 660 Q 700 660 700 600 Z" fill="${c.accent}"/>
  <!-- Tick marks -->
  <line x1="400" y1="240" x2="380" y2="240" stroke="${c.primary}" stroke-width="8" stroke-linecap="round"/>
  <line x1="400" y1="320" x2="390" y2="320" stroke="${c.primary}" stroke-width="6" stroke-linecap="round"/>
  <line x1="400" y1="400" x2="380" y2="400" stroke="${c.primary}" stroke-width="8" stroke-linecap="round"/>
  <line x1="400" y1="480" x2="390" y2="480" stroke="${c.primary}" stroke-width="6" stroke-linecap="round"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">CLIMATE</text>
</svg>`,

  water: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Big water drop -->
  <path d="M 480 160 Q 320 360 320 540 Q 320 680 480 680 Q 640 680 640 540 Q 640 360 480 160 Z" fill="${c.secondary}" stroke="${c.primary}" stroke-width="16"/>
  <!-- Inner highlight -->
  <ellipse cx="430" cy="380" rx="40" ry="80" fill="${c.white}" opacity="0.4"/>
  <!-- Waves at base -->
  <path d="M 200 760 Q 280 740 360 760 T 520 760 T 680 760 T 760 760" stroke="${c.tertiary}" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M 200 800 Q 280 780 360 800 T 520 800 T 680 800 T 760 800" stroke="${c.tertiary}" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.6"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">WATER</text>
</svg>`,

  smoke: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Detector base (round) -->
  <circle cx="480" cy="600" r="240" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <circle cx="480" cy="600" r="200" fill="${c.light}" stroke="${c.secondary}" stroke-width="8"/>
  <!-- LED ring -->
  <circle cx="480" cy="600" r="100" fill="none" stroke="${c.accent}" stroke-width="12"/>
  <circle cx="480" cy="600" r="20" fill="${c.danger}"/>
  <!-- Smoke clouds rising -->
  <ellipse cx="400" cy="380" rx="60" ry="40" fill="${c.neutral}" opacity="0.7"/>
  <ellipse cx="500" cy="340" rx="80" ry="50" fill="${c.neutral}" opacity="0.7"/>
  <ellipse cx="560" cy="280" rx="70" ry="45" fill="${c.neutral}" opacity="0.5"/>
  <ellipse cx="440" cy="220" rx="50" ry="35" fill="${c.neutral}" opacity="0.4"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">SMOKE</text>
</svg>`,

  switch: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Wall plate -->
  <rect x="280" y="200" width="400" height="560" rx="40" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <!-- Switch body -->
  <rect x="340" y="380" width="280" height="200" rx="20" fill="${c.light}" stroke="${c.secondary}" stroke-width="10"/>
  <!-- Toggle (ON position) -->
  <rect x="500" y="400" width="100" height="160" rx="15" fill="${c.success}"/>
  <!-- Status LED -->
  <circle cx="480" cy="280" r="20" fill="${c.success}"/>
  <!-- Mounting screws -->
  <circle cx="320" cy="240" r="12" fill="${c.neutral}"/>
  <circle cx="640" cy="720" r="12" fill="${c.neutral}"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">SWITCH</text>
</svg>`,

  plug: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Plug body (rounded square) -->
  <rect x="280" y="200" width="400" height="560" rx="80" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <!-- Power button -->
  <circle cx="480" cy="400" r="80" fill="none" stroke="${c.secondary}" stroke-width="16"/>
  <line x1="480" y1="360" x2="480" y2="420" stroke="${c.secondary}" stroke-width="20" stroke-linecap="round"/>
  <path d="M 440 440 A 50 50 0 1 0 520 440" stroke="${c.secondary}" stroke-width="20" fill="none" stroke-linecap="round"/>
  <!-- LED indicator -->
  <circle cx="480" cy="600" r="20" fill="${c.success}"/>
  <!-- Watt meter symbol -->
  <text x="480" y="700" font-family="Arial, sans-serif" font-size="80" fill="${c.primary}" text-anchor="middle" font-weight="bold">W</text>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">PLUG</text>
</svg>`,

  bulb: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Bulb glass -->
  <path d="M 480 160 Q 320 160 320 320 Q 320 440 400 520 L 400 600 L 560 600 L 560 520 Q 640 440 640 320 Q 640 160 480 160 Z" fill="${c.warning}" stroke="${c.primary}" stroke-width="16"/>
  <!-- Filament -->
  <path d="M 440 380 Q 460 360 480 380 Q 500 400 520 380" stroke="${c.textDark}" stroke-width="8" fill="none"/>
  <path d="M 440 420 Q 460 400 480 420 Q 500 440 520 420" stroke="${c.textDark}" stroke-width="8" fill="none"/>
  <!-- Bulb base -->
  <rect x="400" y="600" width="160" height="40" fill="${c.neutral}"/>
  <rect x="400" y="640" width="160" height="40" fill="${c.neutral}"/>
  <rect x="420" y="680" width="120" height="40" fill="${c.neutral}"/>
  <path d="M 440 720 L 520 720 L 500 760 L 460 760 Z" fill="${c.tertiary}"/>
  <!-- Light rays -->
  <line x1="200" y1="240" x2="240" y2="280" stroke="${c.warning}" stroke-width="16" stroke-linecap="round"/>
  <line x1="160" y1="320" x2="200" y2="320" stroke="${c.warning}" stroke-width="16" stroke-linecap="round"/>
  <line x1="200" y1="400" x2="240" y2="360" stroke="${c.warning}" stroke-width="16" stroke-linecap="round"/>
  <line x1="720" y1="240" x2="760" y2="280" stroke="${c.warning}" stroke-width="16" stroke-linecap="round"/>
  <line x1="760" y1="320" x2="800" y2="320" stroke="${c.warning}" stroke-width="16" stroke-linecap="round"/>
  <line x1="720" y1="400" x2="760" y2="360" stroke="${c.warning}" stroke-width="16" stroke-linecap="round"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">BULB</text>
</svg>`,

  dimmer: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Wall plate -->
  <rect x="280" y="280" width="400" height="400" rx="200" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <!-- Dial ring -->
  <circle cx="480" cy="480" r="160" fill="${c.light}" stroke="${c.secondary}" stroke-width="10"/>
  <!-- Position indicator (knob) -->
  <circle cx="480" cy="380" r="40" fill="${c.secondary}"/>
  <circle cx="480" cy="380" r="20" fill="${c.white}"/>
  <!-- Tick marks -->
  <line x1="320" y1="480" x2="350" y2="480" stroke="${c.primary}" stroke-width="12" stroke-linecap="round"/>
  <line x1="610" y1="480" x2="640" y2="480" stroke="${c.primary}" stroke-width="12" stroke-linecap="round"/>
  <line x1="480" y1="320" x2="480" y2="350" stroke="${c.primary}" stroke-width="12" stroke-linecap="round"/>
  <line x1="480" y1="610" x2="480" y2="640" stroke="${c.primary}" stroke-width="12" stroke-linecap="round"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">DIMMER</text>
</svg>`,

  remote: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Remote body -->
  <rect x="320" y="160" width="320" height="640" rx="40" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <!-- Button 1 -->
  <circle cx="480" cy="280" r="40" fill="${c.secondary}"/>
  <!-- Button 2 -->
  <circle cx="480" cy="400" r="40" fill="${c.light}" stroke="${c.secondary}" stroke-width="8"/>
  <!-- Button 3 -->
  <circle cx="480" cy="520" r="40" fill="${c.light}" stroke="${c.secondary}" stroke-width="8"/>
  <!-- Button 4 -->
  <circle cx="480" cy="640" r="40" fill="${c.danger}"/>
  <!-- LED at top -->
  <circle cx="480" cy="200" r="12" fill="${c.success}"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">REMOTE</text>
</svg>`,

  thermostat: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Thermostat round body -->
  <circle cx="480" cy="440" r="280" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <!-- Display -->
  <circle cx="480" cy="440" r="220" fill="${c.tertiary}"/>
  <text x="480" y="420" font-family="Arial, sans-serif" font-size="120" fill="${c.accent}" text-anchor="middle" font-weight="bold">21°</text>
  <text x="480" y="480" font-family="Arial, sans-serif" font-size="40" fill="${c.white}" text-anchor="middle" opacity="0.7">SET 22°</text>
  <!-- Temperature dial (outer ring) -->
  <path d="M 220 440 A 260 260 0 0 1 320 240" stroke="${c.warning}" stroke-width="20" fill="none" stroke-linecap="round"/>
  <path d="M 740 440 A 260 260 0 0 1 640 640" stroke="${c.accent}" stroke-width="20" fill="none" stroke-linecap="round"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">THERMOSTAT</text>
</svg>`,

  valve: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Pipe horizontal -->
  <rect x="80" y="420" width="800" height="120" rx="20" fill="${c.neutral}"/>
  <rect x="80" y="430" width="800" height="20" fill="${c.white}" opacity="0.4"/>
  <!-- Valve body -->
  <rect x="320" y="280" width="320" height="400" rx="20" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <!-- Valve handle (cross) -->
  <rect x="460" y="220" width="40" height="120" fill="${c.primary}"/>
  <rect x="400" y="280" width="160" height="40" fill="${c.primary}"/>
  <circle cx="480" cy="300" r="20" fill="${c.secondary}"/>
  <!-- Temperature display -->
  <rect x="360" y="380" width="240" height="80" rx="10" fill="${c.tertiary}"/>
  <text x="480" y="440" font-family="Arial, sans-serif" font-size="48" fill="${c.accent}" text-anchor="middle" font-weight="bold">22.0°</text>
  <!-- Drop indicator -->
  <path d="M 480 540 Q 460 580 460 600 Q 460 620 480 620 Q 500 620 500 600 Q 500 580 480 540 Z" fill="${c.secondary}"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">VALVE</text>
</svg>`,

  soil: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Pot -->
  <path d="M 280 600 L 320 800 L 640 800 L 680 600 Z" fill="${c.primary}"/>
  <rect x="270" y="580" width="420" height="40" rx="10" fill="${c.tertiary}"/>
  <!-- Soil -->
  <ellipse cx="480" cy="600" rx="180" ry="20" fill="${c.textDark}"/>
  <!-- Plant stem -->
  <path d="M 480 600 L 480 360" stroke="${c.success}" stroke-width="20" stroke-linecap="round"/>
  <!-- Leaves -->
  <ellipse cx="420" cy="420" rx="60" ry="30" fill="${c.success}" transform="rotate(-30 420 420)"/>
  <ellipse cx="540" cy="380" rx="60" ry="30" fill="${c.success}" transform="rotate(30 540 380)"/>
  <ellipse cx="460" cy="320" rx="40" ry="20" fill="${c.success}"/>
  <!-- Drop -->
  <path d="M 700 700 Q 700 670 720 670 Q 740 670 740 700 Q 740 730 720 730 Q 700 730 700 700 Z" fill="${c.accent}"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">SOIL</text>
</svg>`,

  gas: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Detector body -->
  <circle cx="480" cy="560" r="240" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <circle cx="480" cy="560" r="200" fill="${c.light}" stroke="${c.warning}" stroke-width="10"/>
  <!-- Warning symbol -->
  <path d="M 480 460 L 480 580" stroke="${c.danger}" stroke-width="20" stroke-linecap="round"/>
  <circle cx="480" cy="640" r="14" fill="${c.danger}"/>
  <!-- Gas cloud rising -->
  <ellipse cx="380" cy="360" rx="50" ry="35" fill="${c.warning}" opacity="0.5"/>
  <ellipse cx="500" cy="320" rx="70" ry="40" fill="${c.warning}" opacity="0.6"/>
  <ellipse cx="560" cy="260" rx="60" ry="35" fill="${c.warning}" opacity="0.4"/>
  <!-- Sensor mesh in middle -->
  <circle cx="480" cy="560" r="80" fill="none" stroke="${c.neutral}" stroke-width="6"/>
  <line x1="400" y1="560" x2="560" y2="560" stroke="${c.neutral}" stroke-width="6"/>
  <line x1="480" y1="480" x2="480" y2="640" stroke="${c.neutral}" stroke-width="6"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">GAS</text>
</svg>`,

  presence: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Sensor body (small round) -->
  <circle cx="480" cy="480" r="80" fill="${c.white}" stroke="${c.primary}" stroke-width="16"/>
  <circle cx="480" cy="480" r="20" fill="${c.secondary}"/>
  <!-- Concentric radar waves -->
  <circle cx="480" cy="480" r="140" fill="none" stroke="${c.accent}" stroke-width="8" opacity="0.8"/>
  <circle cx="480" cy="480" r="220" fill="none" stroke="${c.accent}" stroke-width="6" opacity="0.6"/>
  <circle cx="480" cy="480" r="300" fill="none" stroke="${c.accent}" stroke-width="4" opacity="0.4"/>
  <circle cx="480" cy="480" r="380" fill="none" stroke="${c.accent}" stroke-width="3" opacity="0.2"/>
  <!-- Person silhouette (detected) -->
  <circle cx="480" cy="700" r="20" fill="${c.success}"/>
  <path d="M 460 740 L 460 800 L 500 800 L 500 740 Z" fill="${c.success}"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">PRESENCE</text>
</svg>`,

  illuminance: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Sun circle -->
  <circle cx="480" cy="420" r="160" fill="${c.warning}"/>
  <circle cx="480" cy="420" r="120" fill="${c.accent}"/>
  <!-- Sun rays (8 directions) -->
  <line x1="480" y1="180" x2="480" y2="240" stroke="${c.warning}" stroke-width="20" stroke-linecap="round"/>
  <line x1="480" y1="600" x2="480" y2="660" stroke="${c.warning}" stroke-width="20" stroke-linecap="round"/>
  <line x1="240" y1="420" x2="300" y2="420" stroke="${c.warning}" stroke-width="20" stroke-linecap="round"/>
  <line x1="660" y1="420" x2="720" y2="420" stroke="${c.warning}" stroke-width="20" stroke-linecap="round"/>
  <line x1="320" y1="260" x2="360" y2="300" stroke="${c.warning}" stroke-width="20" stroke-linecap="round"/>
  <line x1="600" y1="300" x2="640" y2="260" stroke="${c.warning}" stroke-width="20" stroke-linecap="round"/>
  <line x1="320" y1="580" x2="360" y2="540" stroke="${c.warning}" stroke-width="20" stroke-linecap="round"/>
  <line x1="600" y1="540" x2="640" y2="580" stroke="${c.warning}" stroke-width="20" stroke-linecap="round"/>
  <!-- LUX text -->
  <text x="480" y="800" font-family="Arial, sans-serif" font-size="80" fill="${c.primary}" text-anchor="middle" font-weight="bold">LUX</text>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">LIGHT</text>
</svg>`,

  air: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Air purifier body (cylinder) -->
  <rect x="320" y="200" width="320" height="600" rx="40" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <!-- Air vents (top circle) -->
  <circle cx="480" cy="280" r="100" fill="none" stroke="${c.secondary}" stroke-width="8"/>
  <circle cx="480" cy="280" r="80" fill="none" stroke="${c.secondary}" stroke-width="6"/>
  <circle cx="480" cy="280" r="60" fill="none" stroke="${c.secondary}" stroke-width="4"/>
  <circle cx="480" cy="280" r="20" fill="${c.accent}"/>
  <!-- Display -->
  <rect x="360" y="440" width="240" height="120" rx="10" fill="${c.tertiary}"/>
  <text x="480" y="510" font-family="Arial, sans-serif" font-size="48" fill="${c.accent}" text-anchor="middle" font-weight="bold">PM2.5</text>
  <text x="480" y="550" font-family="Arial, sans-serif" font-size="32" fill="${c.white}" text-anchor="middle" opacity="0.7">12 μg/m³</text>
  <!-- Air flow arrows -->
  <path d="M 200 280 L 280 280" stroke="${c.accent}" stroke-width="10" fill="none" stroke-linecap="round" marker-end="url(#arrow)"/>
  <path d="M 200 320 L 280 320" stroke="${c.accent}" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.6"/>
  <path d="M 680 280 L 760 280" stroke="${c.accent}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M 680 320 L 760 320" stroke="${c.accent}" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.6"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">AIR</text>
</svg>`,

  button: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Wireless button body (small square) -->
  <rect x="320" y="320" width="320" height="320" rx="60" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <!-- Center button -->
  <circle cx="480" cy="480" r="120" fill="${c.secondary}"/>
  <circle cx="480" cy="480" r="80" fill="${c.accent}"/>
  <circle cx="480" cy="480" r="40" fill="${c.white}"/>
  <!-- Wireless waves -->
  <path d="M 240 360 Q 200 480 240 600" stroke="${c.success}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M 720 360 Q 760 480 720 600" stroke="${c.success}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">BUTTON</text>
</svg>`,

  generic: (c = COLORS) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none">
  <rect x="0" y="0" width="960" height="960" fill="${c.light}"/>
  <!-- Generic device box -->
  <rect x="200" y="200" width="560" height="560" rx="60" fill="${c.white}" stroke="${c.primary}" stroke-width="20"/>
  <!-- Zigbee logo (simplified Z) -->
  <path d="M 360 360 L 600 360 L 360 600 L 600 600" stroke="${c.secondary}" stroke-width="30" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Signal waves -->
  <path d="M 240 280 Q 200 360 240 440" stroke="${c.accent}" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.7"/>
  <path d="M 720 280 Q 760 360 720 440" stroke="${c.accent}" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.7"/>
  <text x="480" y="900" font-family="Arial, sans-serif" font-size="64" fill="${c.primary}" text-anchor="middle" font-weight="bold">TUYA</text>
</svg>`,
};

// Map driverId to icon type
const DRIVER_ICON_MAP = {
  // Contact/door family
  contact_sensor: 'door', door_sensor: 'door', sensor_contact_zigbee: 'door',
  doorwindowsensor_3: 'door', doorwindowsensor_4: 'door',
  // Motion family
  motion_sensor: 'motion', motion_sensor_2: 'motion', motion_sensor_3: 'motion',
  pir_sensor: 'motion', presence_detector: 'presence', presence_sensor_radar: 'presence',
  // Climate family
  climate_sensor: 'climate', temphumidsensor: 'climate', lcdtemphumidsensor: 'climate',
  // Water family
  water_leak_sensor: 'water',
  // Smoke family
  smoke_detector: 'smoke', smoke_detector_advanced: 'smoke', gas_sensor: 'gas',
  // Switch family
  switch_1gang: 'switch', switch_2gang: 'switch', switch_3gang: 'switch', switch_4gang: 'switch',
  switch_1_gang: 'switch', switch_2_gang: 'switch', switch_3_gang: 'switch', switch_4_gang: 'switch',
  switch_4_gang_metering: 'switch', switch_6gang: 'switch',
  wall_switch_1gang_1way: 'switch', wall_switch_2gang_1way: 'switch', wall_switch_3gang_1way: 'switch',
  wall_switch_4gang_1way: 'switch', wall_switch_1_gang: 'switch', wall_switch_2_gang: 'switch',
  wall_switch_3_gang: 'switch', wall_switch_4_gang: 'switch', wall_switch_5_gang_tuya: 'switch',
  wall_switch_6_gang: 'switch', wall_switch_1_gang_tuya: 'switch',
  // Plug family
  plug: 'plug', plug_smart: 'plug', plug_energy_monitor: 'plug', wall_socket: 'plug',
  // Bulb family
  bulb_dimmable: 'bulb', bulb_tunable_white: 'bulb', bulb_rgb: 'bulb', bulb_rgbw: 'bulb',
  light_bulb_rgb: 'bulb', light_bulb_rgbw: 'bulb', light_bulb: 'bulb',
  // Dimmer
  dimmer_1_gang: 'dimmer', dimmer_2_gang: 'dimmer', dimmer_wall_1gang: 'dimmer',
  dimmer_2_gang_tuya: 'dimmer',
  // Remote
  button_wireless_1: 'remote', button_wireless_2: 'remote', button_wireless_3: 'remote',
  button_wireless_4: 'remote', button_wireless_5: 'remote', button_wireless_6: 'remote',
  button_wireless_scene: 'remote', button_wireless: 'remote',
  scene_switch_1: 'remote', scene_switch_2: 'remote', scene_switch_3: 'remote', scene_switch_4: 'remote',
  smart_remote_1_button: 'remote', smart_remote_1_button_2: 'remote',
  smart_remote_4_buttons: 'remote', handheld_remote_4_buttons: 'remote',
  wall_remote_4_gang: 'remote', wall_remote_4_gang_2: 'remote', wall_remote_4_gang_3: 'remote',
  wall_remote_6_gang: 'remote', wall_remote_3_gang: 'remote',
  // Thermostat
  thermostat: 'thermostat', thermostat_tuya: 'thermostat', device_radiator_valve: 'thermostat',
  // Valve
  valve_irrigation: 'valve', valvecontroller_2: 'valve', water_valve: 'valve',
  // Soil
  soil_sensor: 'soil',
  // Air
  air_purifier: 'air', air_purifier_soil: 'air', device_air_purifier_soil: 'air',
  // Illuminance
  illuminance_sensor: 'illuminance',
  // Generic
  generic_tuya: 'generic',
};

// ===== PNG generation (minimal pure-Node PNG encoder) =====
// We need a real PNG. Use a simple approach: write a colored square.
// For higher quality, we'd need an SVG-to-PNG library, but for the icons
// we can use simple PNG generation with a flat color + basic shapes.

// Actually, the cleanest path: use a tiny PNG library or just write a procedural PNG.
// Since we need real icons at 75x75 and 500x500, let's use a simple gradient PNG.

function createPng(width, height, fillRgb) {
  // Simple solid-color PNG (gradient not supported without proper encoding)
  // Returns Buffer of a valid PNG file
  const zlib = require('zlib');
  const crc32 = require('zlib').crc32 || require('buffer-crc32');

  function crc32Calc(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = crc ^ buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Image data: each row prefixed with filter byte (0)
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const offset = y * rowSize + 1 + x * 3;
      // Simple radial gradient: center is light, edges are primary blue
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const t = Math.min(1, dist);
      // Linear interp from light (center) to primary (edge)
      const r = Math.round(fillRgb[0] * t + 232 * (1 - t));
      const g = Math.round(fillRgb[1] * t + 240 * (1 - t));
      const b = Math.round(fillRgb[2] * t + 247 * (1 - t));
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
    }
  }
  const compressed = zlib.deflateSync(raw);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32Calc(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function generateForDriver(driverId) {
  const iconType = DRIVER_ICON_MAP[driverId] || 'generic';
  const svg = ICONS[iconType](COLORS);
  const driverDir = path.join(ROOT, 'drivers', driverId, 'assets');
  const imgDir = path.join(driverDir, 'images');

  if (!fs.existsSync(driverDir)) {
    return { driver: driverId, status: 'skipped', reason: 'driver dir missing' };
  }

  fs.mkdirSync(imgDir, { recursive: true });

  // Write SVG
  const svgPath = path.join(driverDir, 'icon.svg');
  fs.writeFileSync(svgPath, svg, 'utf8');

  // Write small.png (75x75) and large.png (500x500) - gradient
  // Convert primary hex to RGB
  const r = parseInt(COLORS.primary.slice(1, 3), 16);
  const g = parseInt(COLORS.primary.slice(3, 5), 16);
  const b = parseInt(COLORS.primary.slice(5, 7), 16);

  const smallPng = createPng(75, 75, [r, g, b]);
  fs.writeFileSync(path.join(imgDir, 'small.png'), smallPng);

  const largePng = createPng(500, 500, [r, g, b]);
  fs.writeFileSync(path.join(imgDir, 'large.png'), largePng);

  // Image-info.json
  const infoPath = path.join(driverDir, 'image-info.json');
  if (!fs.existsSync(infoPath)) {
    fs.writeFileSync(infoPath, JSON.stringify({
      en: driverId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    }, null, 2));
  }

  return { driver: driverId, icon: iconType, status: 'ok', svgBytes: svg.length, smallBytes: smallPng.length, largeBytes: largePng.length };
}

function main() {
  console.log('Coherent Icon Generator v1.0.0\n');
  const args = process.argv.slice(2);

  let targets = [];
  if (args.includes('--all')) {
    targets = fs.readdirSync(path.join(ROOT, 'drivers')).filter(d => {
      const cp = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      return fs.existsSync(cp);
    });
  } else if (args.length) {
    targets = args;
  } else {
    // Default: door_sensor + thermostat (missing)
    targets = ['door_sensor', 'thermostat'];
  }

  console.log('Targets:', targets.length, 'drivers\n');
  const results = [];
  for (const d of targets) {
    const r = generateForDriver(d);
    if (r.status === 'ok') {
      console.log('  ✓', d, '(', r.icon, '): SVG=' + r.svgBytes + 'B, small=' + r.smallBytes + 'B, large=' + r.largeBytes + 'B');
    } else {
      console.log('  -', d, ':', r.reason);
    }
    results.push(r);
  }

  const ok = results.filter(r => r.status === 'ok').length;
  console.log('\n✓ Done:', ok + '/' + results.length, 'icons generated/regenerated');
}

if (require.main === module) main();
module.exports = { generateForDriver, ICONS, DRIVER_ICON_MAP, createPng };
