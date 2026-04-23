'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

/**
 * Color Space Shim v5.8.25
 * Fixes: Cannot find module './rgb' error in Homey sandbox
 */

const rgb = {
  hsv: (c) => {
    const r = safeDivide(safeParse(c[0]), 255);
    const g = safeDivide(safeParse(c[1]), 255);
    const b = safeDivide(safeParse(c[2]), 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (mx !== mn) {
      if (mx === r) h = safeDivide(g - b, d) + (g < b ? 6 : 0);
      else if (mx === g) h = safeDivide(b - r, d) + 2;
      else h = safeDivide(r - g, d) + 4;
      h /= 6;
    }
    return [
      safeMultiply(h, 360),
      (mx === 0 ? 0 : safeDivide(d, mx)) * 100,
      safeMultiply(mx, 100)
    ];
  },
  xyz: (c) => {
    let r = safeDivide(safeParse(c[0]), 255);
    let g = safeDivide(safeParse(c[1]), 255);
    let b = safeDivide(safeParse(c[2]), 255);
    r = r > 0.04045 ? Math.pow(safeDivide(r + 0.055, 1.055), 2.4) : safeDivide(r, 12.92);
    g = g > 0.04045 ? Math.pow(safeDivide(g + 0.055, 1.055), 2.4) : safeDivide(g, 12.92);
    b = b > 0.04045 ? Math.pow(safeDivide(b + 0.055, 1.055), 2.4) : safeDivide(b, 12.92);
    return [
      (safeMultiply(r, 0.4124) + safeMultiply(g, 0.3576) + safeMultiply(b, 0.1805)) * 100,
      (safeMultiply(r, 0.2126) + safeMultiply(g, 0.7152) + safeMultiply(b, 0.0722)) * 100,
      (safeMultiply(r, 0.0193) + safeMultiply(g, 0.1192) + safeMultiply(b, 0.9505)) * 100
    ];
  }
};

const hsv = {
  rgb: (c) => {
    const h = safeDivide(safeParse(c[0]), 360);
    const s = safeDivide(safeParse(c[1]), 100);
    const v = safeDivide(safeParse(c[2]), 100);
    const i = Math.floor(safeMultiply(h, 6));
    const f = safeMultiply(h, 6) - i;
    const p = safeMultiply(v, (1 - s));
    const q = safeMultiply(v, (1 - safeMultiply(f, s)));
    const t = safeMultiply(v, (1 - safeMultiply(1 - f, s)));
    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return [safeMultiply(r, 255), safeMultiply(g, 255), safeMultiply(b, 255)];
  }
};

const xyz = {
  rgb: (c) => {
    const x = safeDivide(safeParse(c[0]), 100);
    const y = safeDivide(safeParse(c[1]), 100);
    const z = safeDivide(safeParse(c[2]), 100);
    let r = safeMultiply(x, 3.2406) + safeMultiply(y, -1.5372) + safeMultiply(z, -0.4986);
    let g = safeMultiply(x, -0.9689) + safeMultiply(y, 1.8758) + safeMultiply(z, 0.0415);
    let b = safeMultiply(x, 0.0557) + safeMultiply(y, -0.2040) + safeMultiply(z, 1.0570);
    r = r > 0.0031308 ? safeMultiply(1.055, Math.pow(r, safeDivide(1, 2.4))) - 0.055 : safeMultiply(12.92, r);
    g = g > 0.0031308 ? safeMultiply(1.055, Math.pow(g, safeDivide(1, 2.4))) - 0.055 : safeMultiply(12.92, g);
    b = b > 0.0031308 ? safeMultiply(1.055, Math.pow(b, safeDivide(1, 2.4))) - 0.055 : safeMultiply(12.92, b);
    return [
      Math.max(0, Math.min(255, safeMultiply(r, 255))),
      Math.max(0, Math.min(255, safeMultiply(g, 255))),
      Math.max(0, Math.min(255, safeMultiply(b, 255)))
    ];
  },
  xyy: (c) => {
    const s = c[0] + c[1] + c[2];
    if (s === 0) return [0, 0, c[1]];
    return [safeDivide(c[0], s), safeDivide(c[1], s), c[1]];
  }
};

const xyy = {
  xyz: (c) => {
    const x = c[0], y = c[1], Y = c[2];
    if (y === 0) return [0, 0, 0];
    return [safeDivide(safeMultiply(x, Y), y), Y, safeDivide(safeMultiply(1 - x - y, Y), y)];
  }
};

module.exports = { rgb, hsv, xyz, xyy };
