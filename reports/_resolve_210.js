'use strict';
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '..', 'app.json');
let raw = fs.readFileSync(appPath, 'utf8');
if (raw.includes('<<<<<<<')) {
  const head = raw.split('<<<<<<< HEAD\n')[1].split('\n=======')[0];
  raw = head;
}
raw = raw.replace(/"version"\s*:\s*"5\.12\.\d+"/, '"version":"5.12.210"');
const app = JSON.parse(raw);
app.version = '5.12.210';
fs.writeFileSync(appPath, `${JSON.stringify(app)}\n`);
console.log('resolved app.json', app.version, fs.statSync(appPath).size);
