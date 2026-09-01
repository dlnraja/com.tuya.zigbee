'use strict';
const fs = require('fs');
const path = require('path');
const t = fs.readFileSync(
  'C:/Users/Dell/.cursor/projects/c-Users-Dell-Documents-homey-master/agent-tools/eef8298b-ac1f-4fe2-a96b-1b194e5bd472.txt',
  'utf8',
);
const uuids = [...new Set(t.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [])];
console.log('uuids', uuids.length);
for (const u of uuids) console.log(u);
const msgs = [...t.matchAll(/plaintext_body[\s\S]{0,20}"([\s\S]*?)"\s*,\s*\n\s*"html_body"/g)];
console.log('plaintext chunks', msgs.length);
for (const m of msgs.slice(-8)) {
  const body = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  const uuid = (body.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [])[0];
  const um = (body.match(/User Message:[\s\S]{0,180}/i) || body.match(/Message:[\s\S]{0,180}/i) || [''])[0];
  console.log('---', uuid || 'no-uuid', um.replace(/\s+/g, ' ').slice(0, 160));
}
