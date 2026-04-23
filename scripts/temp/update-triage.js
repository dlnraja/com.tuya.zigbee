const fs = require('fs');
let txt = fs.readFileSync('.github/scripts/triage-upstream-enhanced.js', 'utf8');

const regex = /function hasUserSymptoms\(b\)\{.*?\}/       ;
const replacement = "function hasUserSymptoms(b, t='') { if (!b && !t) return false; const l = ((b || '') + ' ' + (t || '')).toLowerCase(); return /doesn.?t.*work|stuck|wrong.*value|shows?.*(0|zero|wrong)|bug|error|issue|problem|broken|not.*updating|after.*(update|install )|missing.*capability|interview|diagnostic|no.*connection|can.? t.*connect|unknown.*node|pairing/.test(l); }";

txt = txt.replace(regex, replacement);
txt = txt.replace(/hasUserSymptoms\(it\.body\)/g, "hasUserSymptoms(it.body, it.title)");

fs.writeFileSync('.github/scripts/triage-upstream-enhanced.js', txt);
console.log("Updated hasUserSymptoms in triage-upstream-enhanced.js");
