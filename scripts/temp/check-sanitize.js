const fs = require('fs');
const file = '.github/scripts/gmail-imap-reader.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('function removePersonalInfo')) {
  // Let's ensure the previous sanitization wasn't just injected, but robust.
  // Actually, I already injected `aggressiveSanitize` in the previous step. Let's verify it.
  console.log('Sanitization function aggressiveSanitize is present:', content.includes('function aggressiveSanitize'));
  console.log('REDACTED_EMAIL is present:', content.includes('[REDACTED_EMAIL]'));
}
