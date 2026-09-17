'use strict';
const fs = require('fs');
const { execSync } = require('child_process');
function sh(cmd) {
  console.log('>', cmd);
  execSync(cmd, { stdio: 'inherit', shell: true });
}
sh('git checkout --theirs -- app.json');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = pkg.version;
app.id = 'com.dlnraja.tuya.zigbee.stable';
fs.writeFileSync('app.json', `${JSON.stringify(app, null, 2)}\n`);
console.log('resolved', app.version);
sh('git add -A');
sh('git -c core.editor=true rebase --continue');
sh('git push origin stable-v5');
sh('git log -2 --oneline');
sh('git status -sb');
