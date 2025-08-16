#!/usr/bin/env node
'use strict';

'use strict';
const fs=require('fs'),path=require('path');const README=path.join(process.cwd(),'README.md');
function upd(t,r,repl){return r.test(t)?t.replace(r,repl):(t+'\n'+repl+'\n');}
(function(){
  let t=fs.existsSync(README)?fs.readFileSync(README,'utf8'):'// Tuya Zigbee for Homey\n';
  t=t.replace(/.*publish.*\n/gi,'').replace(/.*store.*homey.*\n/gi,'');
  t=upd(t,/#// \s*Installation[\s\S]*?(?=\n#// |\Z)/i,`#// Installation (Test mode only)\n\n- \\npm install\`\n- \\npx homey app validate\`\n- \\npx homey app run\` (Docker) or \`--remote\`\n\n`);
  if(!/#// \s*Changelog/i.test(t))t+=`\n#// Changelog\n\nSee \`CHANGELOG_AUTO.md\` for automated changes.\n`;
  if(!/#// \s*Drivers Coverage/i.test(t))t+=`\n#// Drivers Coverage\n\nStored in \`drivers/{tuya|zigbee}/<category>/<vendor>/<model>/\`. No variants.\n`;
  fs.writeFileSync(README,t);console.log('[readme] updated');
})();