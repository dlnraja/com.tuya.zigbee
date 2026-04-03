'use strict';

/**
 * Color Space Shim v5.8.25
 * Fixes: Cannot find module './rgb' error in Homey sandbox
 */

const rgb = {
  hsv: (c) => {
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (mx !== mn) {
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h * 360, (mx === 0 ? 0 : d / mx) * 100, mx * 100];
  },
  xyz: (c) => {
    let r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    return [r * 41.24 + g * 35.76 + b * 18.04, r * 21.27 + g * 71.52 + b * 7.22, r * 1.93 + g * 11.92 + b * 95.03];
  }
};

const hsv = {
  rgb: (c) => {
    const h = c[0] / 360, s = c[1] / 100, v = c[2] / 100;
    const i = Math.floor(h * 6), f = h * 6 - i;
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return [r * 255, g * 255, b * 255];
  }
};

const xyz = {
  rgb: (c) => {
    let r = c[0] * 0.0324 + c[1] * -0.0154 + c[2] * -0.005;
    let g = c[0] * -0.0097 + c[1] * 0.0188 + c[2] * 0.0004;
    let b = c[0] * 0.0006 + c[1] * -0.002 + c[2] * 0.0106;
    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;
    return [Math.max(0, Math.min(255, r * 255)), Math.max(0, Math.min(255, g * 255)), Math.max(0, Math.min(255, b * 255))];
  },
  xyy: (c) => {
    const s = c[0] + c[1] + c[2];
    return s === 0 ? [0, 0, 0] : [c[0] / s, c[1] / s, c[1]];
  }
};

const xyy = {
  xyz: (c) => {
    const Y = c[2] || 100;
    return c[1] === 0 ? [0, Y, 0] : [c[0] * Y / c[1], Y, (1 - c[0] - c[1]) * Y / c[1]];
  }
};

module.exports = { rgb, hsv, xyz, xyy };
