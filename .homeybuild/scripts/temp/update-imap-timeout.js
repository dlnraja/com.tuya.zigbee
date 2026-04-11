const fs = require('fs');
let txt = fs.readFileSync('.github/scripts/gmail-imap-reader.js', 'utf8');

const regexToReplace = /const c = new ImapFlow\(\{ host: 'imap\.gmail\.com', port: 993, secure: true, auth: \{ user, pass \}, logger: false, socketTimeout: 120000 \}\);/;
const newStr = "const c = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user, pass }, logger: false, socketTimeout: 60000, connectionTimeout: 30000, greetingTimeout: 30000 });";

if(txt.match(regexToReplace)) {
  txt = txt.replace(regexToReplace, newStr);
  fs.writeFileSync('.github/scripts/gmail-imap-reader.js', txt);
  console.log('Added strict timeouts to ImapFlow connection');
} else {
  console.log('Regex did not match.');
}
