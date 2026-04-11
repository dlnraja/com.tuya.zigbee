const fs = require('fs');
const file = '.homeycompose/app.json';
let content = fs.readFileSync(file, 'utf8');
const data = JSON.parse(content);

console.log('App version:', data.version);
// Homey apps rarely have a "changelog" object inside app.json natively, but sometimes developers add custom fields.
// Usually, it's maintained in CHANGELOG.md for Athom's app store.

if (data.changelog) {
  console.log('Has changelog field in app.json');
} else {
  console.log('No changelog field in .homeycompose/app.json');
}
