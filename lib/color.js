'use strict';

// Module de gestion des couleurs pour les appareils d'éclairage
class ColorConverter {
  // Conversion HSV ? RGB
  static hsvToRgb(h, s, v) {
    h = h / 65535 * 360;
    s = s / 65535 * 100;
    v = v / 65535 * 100;
    
    // Conversion standard HSV ? RGB
    let r, g, b;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s / 100);
    const q = v * (1 - f * s / 100);
    const t = v * (1 - (1 - f) * s / 100);
    
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    
    return {
      r: Math.round(r * 2.55),
      g: Math.round(g * 2.55),
      b: Math.round(b * 2.55)
    };
  }
  
  // Conversion RGB ? HSV
  static rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h, s, v = max;
    
    s = max === 0 ? 0 : d / max;
    
    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return {
      h: Math.round(h * 360 * 65535 / 360),
      s: Math.round(s * 100 * 65535 / 100),
      v: Math.round(v * 100 * 65535 / 100)
    };
  }
}

module.exports = ColorConverter;
