/**
 * Anonymize Diagnostics Report
 * 
 * Filters sensitive data from Homey diagnostics reports before storage or public analysis.
 */

const fs = require('fs');

function anonymize(text) {
  if (!text) return '';

  let processed = text;

  // 1. Anonymize Emails
  processed = processed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[ANONYMIZED_EMAIL]');

  // 2. Anonymize Log IDs / UUIDs
  processed = processed.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '[UUID]');

  // 3. Anonymize Local Paths (Homey specific)
  processed = processed.replace(/\/userdata\/[^\/]+\//g, '/userdata/[USER_ID]/');
  processed = processed.replace(/\/app\/[^\/]+\//g, '/app/');

  // 4. Anonymize IP Addresses
  processed = processed.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_ADDRESS]');

  return processed;
}

// Read from stdin (for use in GitHub Actions)
let input = '';
process.stdin.on('data', chunk => {
  input += chunk;
});

process.stdin.on('end', () => {
  console.log(anonymize(input));
});
