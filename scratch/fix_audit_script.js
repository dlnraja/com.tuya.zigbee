const fs = require('fs');
const filePath = 'scripts/maintenance/zero-defect-architect-audit.js';
let content = fs.readFileSync(filePath, 'utf8');

// Line 152: fix regex
const old152 = ".replace(/(['\"`])((?:\\\\.|(? !\\1). : null)*?   : null)\\1/g , '$1$1')";
const new152 = ".replace(/(['\"`])((?:\\\\.|(?!\\1).)*?)\\1/g, '$1$1')";
content = content.replace(old152, new152);

// Line 153: fix regex and call
const old153 = ".replace(/\\/[^*].*?\\/[gimy]*(? =[.);]|$)/g, ' ') ;";
const new153 = ".replace(/\\/[^*].*?\\/[gimy]*(?=[.) ;]|$)/g, ' ');";
content = content.replace(old153, new153);

// Line 198: fix match call
const old198 = "if (codeOnly.match(/[a-zA-Z0-9_$\\].)]\\s*[\\/*](? !\\s*\\*)\\s*[a-zA-Z0-9_$0-9.]+/)) {";
const new198 = "if (codeOnly.match(/[a-zA-Z0-9_$\\].)]\\s*[\\/*](?!\\s*\\*)\\s*[a-zA-Z0-9_$0-9.]+/)) {";
content = content.replace(old198, new198);

// Line 199: fix semicolon
const old199 = "const rel = path.relative(ROOT, full) ;";
const new199 = "const rel = path.relative(ROOT, full);";
content = content.replace(old199, new199);

fs.writeFileSync(filePath, content);
console.log('Explicitly fixed scripts/maintenance/zero-defect-architect-audit.js');
