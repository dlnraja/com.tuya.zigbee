#!/usr/bin/env node
'use strict';

/**
 * PII Masking Utility
 * Redacts Homey IDs, Localized Names, and potential secrets from text.
 */

const REPLACEMENTS = [
    { pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, label: '<ID>' }, // UUIDs
    { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, label: '<EMAIL>' }, // Emails
    { pattern: /\b(?:https?:\/\/)?(?:www\.)?homey\.app\/f\/[a-z0-9]+\b/gi, label: '<HOMEY-LINK>' }, // Homey links
    { pattern: /\b(?:ID:|User:|Name:)\s+[^\n,.]+/gi, label: '$1 <REDACTED>' }, // Labeled PII
];

/**
 * Masks PII in the given text.
 * @param {string} text 
 * @returns {string} masked text
 */
function maskPII(text) {
    if (!text) return text;
    if (process.env.PII_MASKING === 'false') return text;
    let masked = text;
    for (const r of REPLACEMENTS) {
        masked = masked.replace(r.pattern, r.label);
    }
    return masked;
}

module.exports = { maskPII };
