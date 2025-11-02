#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '../../app.json');

console.log('Removing led_mode from app.json...');

let content = fs.readFileSync(appJsonPath, 'utf8');

// Remove led_mode from capabilities arrays
content = content.replace(/"led_mode",?\s*/g, '');
content = content.replace(/,\s*"led_mode"/g, '');

// Remove led_mode from capabilitiesOptions
content = content.replace(/"led_mode":\s*{[^}]+},?\s*/g, '');

// Clean up JSON formatting
content = content.replace(/,\s*]/g, ']');
content = content.replace(/\[\s*,/g, '[');
content = content.replace(/,\s*}/g, '}');
content = content.replace(/{\s*,/g, '{');

fs.writeFileSync(appJsonPath, content, 'utf8');

console.log('✅ Done!');
