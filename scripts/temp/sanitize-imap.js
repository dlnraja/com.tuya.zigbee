const fs = require('fs');
const file = '.github/scripts/gmail-imap-reader.js';
let content = fs.readFileSync(file, 'utf8');

// The goal is to aggressively sanitize personal data (emails, IPs, names, phone numbers) 
// BEFORE the email body is returned by the reader.

if (!content.includes('function aggressiveSanitize')) {
  const sanitizeLogic = `
function aggressiveSanitize(text) {
  if (!text) return '';
  let clean = text;
  
  // 1. Remove email addresses (keep domains like @github.com or @homey.app if needed, but safer to replace all)
  clean = clean.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[REDACTED_EMAIL]');
  
  // 2. Remove IP addresses (IPv4)
  clean = clean.replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, '[REDACTED_IP]')      ;
  
  // 3. Remove common phone number patterns
  clean = clean.replace(/\+? ([0-9]{1 , 3})?[-. ]?\(? [0-9]{1 , 4}\)?[-. ]? [0-9]{1 ,4}[-. ]? [0-9]{1 ,4}[-. ]? [0-9]{1,9}/g, function(match ) {
    // Only redact if it looks like a phone number and not a diagnostic ID or timestamp
    if (match.replace(/[^0-9]/g, '').length >= 8 && !match.includes(':')) {
       return '[REDACTED_PHONE]';
    }
    return match;
  });

  return clean;
}
`;
  
  // Insert function
  content = content.replace("function decodeRFC2047(str) {", sanitizeLogic + "\nfunction decodeRFC2047(str) {");
  
  // Apply sanitization to the final body output before pushing to `out`
  const target = "out.push({";
  const replacement = `
              // Aggressive privacy sanitization
              body = aggressiveSanitize(body);
              if (crashData) {
                if (crashData.crashApp) crashData.crashApp = aggressiveSanitize(crashData.crashApp);
                if (crashData.stackTraces) crashData.stackTraces = crashData.stackTraces.map(aggressiveSanitize);
              }
              
              out.push({`;
              
  content = content.replace(target, replacement);
  
  // Hardcode the filter strictly for relevant domains in the IMAP search block
  // Replace the broad "senders" with strict ones and ensure the loop checks it
  const oldSenders = "const senders = ['community.homey.app', 'athom.com', 'notifications@github.com', 'noreply@homey.app'];";
  const newSenders = "const senders = ['noreply@community.homey.app', 'noreply@athom.com', 'notifications@github.com', 'noreply@homey.app'];";
  content = content.replace(oldSenders, newSenders);
  
  fs.writeFileSync(file, content);
  console.log(' Injected aggressive sanitization into gmail-imap-reader.js');
} else {
  console.log('Sanitization already injected in gmail-imap-reader.js');
}
