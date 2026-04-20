const fs = require('fs');
let txt = fs.readFileSync('.github/scripts/gmail-imap-reader.js', 'utf8');

const regexToReplace = /const since = \(opts\.afterDate \|\| new Date\(Date\.now\(\) - 7 \* 864e5\)\)\.toISOString\(\)\.split\('T'\)\[0\];/;
const newStr = "const since = (opts.afterDate || new Date(Date.now() - 30 * 864e5)).toISOString().split('T')[0];";

if(txt.match(regexToReplace)) {
  txt = txt.replace(regexToReplace, newStr);
  fs.writeFileSync('.github/scripts/gmail-imap-reader.js', txt);
  console.log('Increased search scope to 30 days');
}
