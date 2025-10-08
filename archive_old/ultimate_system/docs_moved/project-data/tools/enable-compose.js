#!/usr/bin/env node
'use strict';
const fs = require('fs');
if (!fs.existsSync('app.json')) { console.error('app.json not found'); process.exit(0); }
const app = JSON.parse(fs.readFileSync('app.json','utf8'));
app.compose = app.compose || {}; app.compose.enable = true;
fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n', 'utf8');
console.log('✅ compose.enable=true');
