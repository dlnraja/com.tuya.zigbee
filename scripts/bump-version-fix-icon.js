// bump-version-fix-icon.js
'use strict';
const fs = require('fs');

const app     = JSON.parse(fs.readFileSync('app.json'));
const compose = JSON.parse(fs.readFileSync('.homeycompose/app.json'));

// Bump patch version
const parts   = (app.version || '8.5.35').split('.').map(Number);
parts[2]++;
const newVer  = parts.join('.');

// Fix tous les champs critiques dans les deux fichiers
[app, compose].forEach(obj => {
  obj.version               = newVer;
  obj.icon                  = 'icon.svg';
  obj.homeyCommunityTopicId = 140352;
  obj.sdk                   = 3;
  obj.brandColor            = '#00E6A0';
  if (!obj.platforms) obj.platforms = ['local'];
  if (!obj.images) obj.images = {};
  obj.images.small  = '/assets/images/small.png';
  obj.images.large  = '/assets/images/large.png';
  obj.images.xlarge = '/assets/images/xlarge.png';
});

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
fs.writeFileSync('.homeycompose/app.json', JSON.stringify(compose, null, 2));

// Sync package.json
const pkg = JSON.parse(fs.readFileSync('package.json'));
pkg.version = newVer;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

console.log('Version bumped:', app.version, '->', newVer);
console.log('icon:', app.icon, '| exists:', fs.existsSync('icon.svg'));
console.log('homeyCommunityTopicId:', app.homeyCommunityTopicId);
console.log('images:', JSON.stringify(app.images));
console.log('platforms:', JSON.stringify(app.platforms));
console.log('sdk:', app.sdk, '| brandColor:', app.brandColor);
