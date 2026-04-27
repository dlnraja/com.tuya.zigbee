'use strict';
const { safeDivide, safeMultiply, safeParse } = require('./tuyaUtils.js');

/**
 * CaseInsensitiveMatcher v5.5.697
 * 
 * CRITICAL: Tuya devices report manufacturerName/productId with inconsistent casing.
 * Examples:
 * - _TZ3000_zgyzgdua vs _TZ3000_ZGYZGDUA vs _tz3000_zgyzgdua
 * - TS0044 vs ts0044
 * - _TZE200_vvmbj46n vs _TZE200_VVMBJ46N
 * 
 * This module provides case-insensitive matching functions for ALL comparisons
 * involving manufacturerName and productId throughout the app.
 * 
 * @version 5.5.697
 */

/**
 * Normalize a string for case-insensitive comparison
 * @param {string} str - String to normalize
 * @returns {string} - Lowercase trimmed string
 */
function normalize(str) {
  if (typeof str !== 'string') return '';
  // v7.5.0: Aggressive cleanup of invisible characters, null bytes, and non-breaking spaces
  // Pattern removes control chars (\x00-\x1F, \x7F-\x9F) and null bytes (\0)
  return str
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .replace(/\u00A0/g, ' ') // Non-breaking space to regular space
    .replace(/\s+/g, ' ')    // Consolidate multiple spaces
    .trim()
    .toLowerCase();
}

/**
 * Check if array includes value (case-insensitive)
 * @param {Array<string>} array - Array to search
 * @param {string} value - Value to find
 * @returns {boolean}
 */
function includesCI(array, value) {
  if (!Array.isArray(array) || !value) return false;
  const normalizedValue = normalize(value);
  return array.some(item => normalize(item) === normalizedValue);
}

/**
 * Check if string starts with prefix (case-insensitive)
 * @param {string} str - String to check
 * @param {string|Array<string>} prefixes - Prefix or list of prefixes to match
 * @returns {boolean}
 */
function startsWithCI(str, prefixes) {
  if (!str || !prefixes) return false;
  const normalizedStr = normalize(str);
  if (Array.isArray(prefixes)) {
    return prefixes.some(p => normalizedStr.startsWith(normalize(p)));
  }
  return normalizedStr.startsWith(normalize(prefixes));
}

/**
 * Check if string ends with suffix (case-insensitive)
 * @param {string} str - String to check
 * @param {string} suffix - Suffix to match
 * @returns {boolean}
 */
function endsWithCI(str, suffix) {
  if (!str || !suffix) return false;
  return normalize(str).endsWith(normalize(suffix));
}

/**
 * Check if string contains substring (case-insensitive)
 * @param {string} str - String to check
 * @param {string|Array<string>} substrings - Substring or list of substrings to find
 * @returns {boolean}
 */
function containsCI(str, substrings) {
  if (!str || !substrings) return false;
  const normalizedStr = normalize(str);
  if (Array.isArray(substrings)) {
    return substrings.some(sub => normalizedStr.includes(normalize(sub)));
  }
  return normalizedStr.includes(normalize(substrings));
}

/**
 * Check if two strings are equal (case-insensitive)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {boolean}
 */
function equalsCI(str1, str2) {
  return normalize(str1) === normalize(str2);
}

/**
 * Find matching item in array (case-insensitive)
 * @param {Array<string>} array - Array to search
 * @param {string} value - Value to find
 * @returns {string|undefined} - The matching item or undefined
 */
function findCI(array, value) {
  if (!Array.isArray(array) || !value) return undefined;
  const normalizedValue = normalize(value);
  return array.find(item => normalize(item) === normalizedValue);
}

/**
 * Check if manufacturerName matches any in list (case-insensitive)
 * @param {string} manufacturerName - Device manufacturerName
 * @param {Array<string>} list - List of manufacturerNames to match
 * @returns {boolean}
 */
function matchesManufacturer(manufacturerName, list) {
  return includesCI(list, manufacturerName);
}

/**
 * Check if manufacturerName starts with any prefix (case-insensitive)
 * @param {string} manufacturerName - Device manufacturerName
 * @param {Array<string>} prefixes - List of prefixes to match
 * @returns {boolean}
 */
function matchesManufacturerPrefix(manufacturerName, prefixes) {
  if (!manufacturerName || !Array.isArray(prefixes)) return false;
  const normalizedMfr = normalize(manufacturerName);
  return prefixes.some(prefix => normalizedMfr.startsWith(normalize(prefix)));
}

/**
 * Check if productId matches any in list (case-insensitive)
 * @param {string} productId - Device productId
 * @param {Array<string>} list - List of productIds to match
 * @returns {boolean}
 */
function matchesProductId(productId, list) {
  return includesCI(list, productId);
}

/**
 * Normalize manufacturerName array for comparison
 * @param {Array<string>} array - Array of manufacturerNames
 * @returns {Array<string>} - Lowercase array
 */
function normalizeArray(array) {
  if (!Array.isArray(array)) return [];
  return array.map(item => normalize(item));
}

module.exports = {
  normalize,
  includesCI,
  startsWithCI,
  endsWithCI,
  containsCI,
  equalsCI,
  findCI,
  matchesManufacturer,
  matchesManufacturerPrefix,
  matchesProductId,
  normalizeArray
};
