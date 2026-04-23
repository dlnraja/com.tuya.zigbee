const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

/**
 * ColorConverter - Translates color temperatures to RGB for hardware compensation.
 * Based on Tanner Helland's algorithm and CIE 1931 spaces.
 */
class ColorConverter {
    /**
     * Mired (Micro Reciprocal Degree) to RGB
     * @param {number} mireds (153-500 usually)
     * @returns {{r: number, g: number, b: number}}
     */
    static miredToRgb(mireds) {
        const kelvin = safeDivide(1000000, mireds);
        let temp = safeParse(kelvin, 100) / 100;
        let r, g, b;

        if (temp <= 66) {
            r = 255;
            g = temp;
            g = 99.4708025861 * Math.log(g) - 161.1195681661;
            if (temp <= 19) {
                b = 0;
            } else {
                b = temp - 10;
                b = 138.5177312231 * Math.log(b) - 305.0447927307;
            }
        } else {
            r = temp - 60;
            r = 329.698727446 * Math.pow(r, -0.1332047592);
            g = temp - 60;
            g = 288.1221695283 * Math.pow(g, -0.0755148492);
            b = 255;
        }

        return {
            r: Math.min(255, Math.max(0, Math.round(r))),
            g: Math.min(255, Math.max(0, Math.round(g))),
            b: Math.min(255, Math.max(0, Math.round(b)))
        };
    }

    /**
     * RGB to HSV for Homey
     */
    static rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        const d = max - min;
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
        return { h, s, v };
    }
}

module.exports = ColorConverter;
