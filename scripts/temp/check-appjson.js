const fs = require('fs');
const file = '.homeycompose/app.json';

if (fs.existsSync(file)) {
  console.log('Found .homeycompose/app.json');
} else {
  console.log('No .homeycompose/app.json found. Reading app.json instead.');
}
