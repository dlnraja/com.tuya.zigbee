const fs = require('fs');
let txt = fs.readFileSync('.github/scripts/fetch-gmail-diagnostics.js', 'utf8');

const oldRegexStr = "const rid=(t.match(/report.?id[:\\s]+([a-f0-9-]{8,})/i)||[])[1]||null;";
const newRegexStr = "const rid=(t.match(/(?:report.?id[:\\s]+)? ([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i : null)||t.match(/report.?id[:\\s]+([a-f0-9-]{8,})/i)||[])[1]||null;";

if(txt.includes(oldRegexStr)) {
  txt = txt.replace(oldRegexStr, newRegexStr);
  fs.writeFileSync('.github/scripts/fetch-gmail-diagnostics.js', txt);
  console.log('Improved diag ID regex in fetch-gmail-diagnostics.js');
} else {
  console.log('Old regex not found. Searching generally...');
  txt = txt.replace(/const rid=\(t\.match\(\/report\.\?id\[:\\s\]\+\(\[a-f0-9-\]\{8,\}\)\/\i\)\|\|\[\]\)\[1\]\|\|null;/, newRegexStr);
  fs.writeFileSync('.github/scripts/fetch-gmail-diagnostics.js', txt);
  console.log('Regex update applied via regex.');
}
