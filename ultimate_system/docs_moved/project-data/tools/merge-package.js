#!/usr/bin/env node
'use strict';
const fs = require('fs');
const snPath = 'patches/package.scripts.merge.json';
if (!fs.existsSync(snPath)) { console.error('Snippet missing'); process.exit(1); }
const pkgPath = 'package.json';
const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath,'utf8')) : {};
const sn = JSON.parse(fs.readFileSync(snPath,'utf8'));
pkg.scripts = Object.assign({}, pkg.scripts || {}, sn.scripts || {});
pkg.devDependencies = Object.assign({}, pkg.devDependencies || {}, sn.devDependencies || {});
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('✅ package.json merged');
