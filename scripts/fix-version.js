#!/usr/bin/env node
'use strict';
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('Before: app.json=' + app.version + ' package.json=' + pkg.version);
app.version = '7.4.18';
pkg.version = '7.4.18';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('After: app.json=' + app.version + ' package.json=' + pkg.version);
console.log('Match:', app.version === pkg.version);