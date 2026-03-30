const fs = require('fs');
let txt = fs.readFileSync('.github/scripts/gmail-imap-reader.js', 'utf8');

const regexToReplace = /for \(const bk of \['_TZE200', '_TZE204', '_TZE284', '_TZ3000', 'TS0601', 'diagnostic report', 'Homey', 'crash log', 'device error'\]\)/;
const newStr = "for (const bk of ['_TZE200', '_TZE204', '_TZE284', '_TZ3000', 'TS0601', 'diagnostic report', 'Homey', 'crash log', 'device error', 'report id', 'diagnostic log', 'report', 'issue'])";

if(txt.match(regexToReplace)) {
  txt = txt.replace(regexToReplace, newStr);
  fs.writeFileSync('.github/scripts/gmail-imap-reader.js', txt);
  console.log('Improved IMAP body keyword search in gmail-imap-reader.js');
} else {
  console.log('Regex failed to match');
}
