'use strict';

/**
 * MATH UTILITIES (Safe arithmetic to prevent crashes)
 * v1.0.0 - Extracted from tuyaUtils.js to break circular dependencies
 */

module.exports = {
  /**
   * Safe Division
   */
  safeDivide(a, b) {
    if (b === 0) return 0;
    return a / b;
  },

  /**
   * Safe Multiplication
   */
  safeMultiply(a, b) {
    const res = a * b;
    return isNaN(res) ? 0 : res;
  },

  /**
   * Safe Parse Int/Float
   */
  safeParse(val, fallback = 0) {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
  },

  /**
   * Safe Addition
   */
  safeAdd(a, b) {
    const res = a + b;
    return isNaN(res) ? 0 : res;
  },

  /**
   * Safe Subtraction
   */
  safeSubtract(a, b) {
    const res = a - b;
    return isNaN(res) ? 0 : res;
  }
};
