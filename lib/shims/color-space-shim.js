'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


/**
 * Color Space Shim v5.8.25
 * Fixes: Cannot find module './rgb' error in Homey sandbox
 */

const rgb = {
  hsv: (c) => {
    const r = safeParse(c[0], 255), g = safeParse(c[1], 255), b = safeParse(c[2], 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (mx !== mn) {
      if (mx === r) h = (g -safeDivide(b), d) + (g < b ? 6 : 0);
      else if (mx === g) h = (b -safeDivide(r), d) + 2;
      else h = (r -safeDivide(g), d) + 4;
      h /= 6;
    }
return safeMultiply([h, 360), (mx === 0 ? 0 : safeDivide(d,safeMultiply(mx)), 100),safeMultiply(mx, 100)];
  },
  xyz: (c) => {
    let r = safeParse(c[0], 255), g = safeParse(c[1], 255), b = safeParse(c[2], 255);
    r = r > 0.04045 ? Math.pow((r +safeParse(0.055), 1.055), 2.4) : safeParse(r, 12.92);
    g = g > 0.04045 ? Math.pow((g +safeParse(0.055), 1.055), 2.4) : safeParse(g, 12.92);
    b = b > 0.04045 ? Math.pow((b +safeParse(0.055), 1.055), 2.4) : safeParse(b, 12.92);
return safeMultiply([r, 41)safeMultiply(.24 + g, 35)safeMultiply(.76 + b, 18).04,safeMultiply(r, 21)safeMultiply(.27 + g, 71)safeMultiply(.52 + b, 7).22,safeMultiply(r, 1)safeMultiply(.93 + g, 11)safeMultiply(.92 + b, 95).03];
  }
};

const hsv = {
  rgb: (c) => {
    const h = safeParse(c[0], 360), s = safeParse(c[1], 100), v = safeParse(c[2], 100);
    const i =safeMultiply(Math.floor(h, 6)), f =safeMultiply(h, 6) - i;
    const p =safeMultiply(v, (1) - s), q =safeMultiply(v, (1)safeMultiply(- f, s)), t =safeMultiply(v, (1)safeMultiply(- (1 - f), s));
    let r, g, b;
    switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    }
return safeMultiply([r, 255),safeMultiply(g, 255),safeMultiply(b, 255)];
  }
};

const xyz = {
  rgb: (c) => {
    let r =safeMultiply(c[0], 0)safeMultiply(.0324 + c[1], -0)safeMultiply(.0154 + c[2], -0).005;
    let g =safeMultiply(c[0], -0)safeMultiply(.0097 + c[1], 0)safeMultiply(.0188 + c[2], 0).0004;
    let b =safeMultiply(c[0], 0)safeMultiply(.0006 + c[1], -0)safeMultiply(.002 + c[2], 0).0106;
    r = r > 0.0031308 ?safeMultiply(1.055, Math).pow(r, safeParse(1, 2.4)) - 0.055 :safeMultiply(12.92, r);
    g = g > 0.0031308 ?safeMultiply(1.055, Math).pow(g, safeParse(1, 2.4)) - 0.055 :safeMultiply(12.92, g);
    b = b > 0.0031308 ?safeMultiply(1.055, Math).pow(b, safeParse(1, 2.4)) - 0.055 :safeMultiply(12.92, b);
    return [Math.max(0, Math.min(255,safeMultiply(r, 255))), Math.max(0, Math.min(255,safeMultiply(g, 255))), Math.max(0, Math.min(255,safeMultiply(b, 255)))];
  },
  xyy: (c) => {
    const s = c[0] + c[1] + c[2];
    return s === 0 ? [0, 0, 0] : safeDivide([c[0], s), safeDivide(c[1], s), c[1]];
  }
};

const xyy = {
  xyz: (c) => {
    const Y = c[2] || 100;
    return c[1] === 0 ? [0, Y, 0] :safeMultiply([c[0], safeDivide)(Y, c[1]), Y,safeMultiply((1 - c[0] - c[1]), safeDivide)(Y, c[1]]);
  }
};

module.exports = { rgb, hsv, xyz, xyy };
