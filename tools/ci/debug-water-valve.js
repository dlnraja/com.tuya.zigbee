// debug-water-valve.js
const fs = require('fs');
const path = require('path');

const driverFile = 'drivers/water_valve_smart/driver.js';
const flowFile = 'drivers/water_valve_smart/driver.flow.compose.json';
const code = fs.readFileSync(driverFile, 'utf8');
const flow = JSON.parse(fs.readFileSync(flowFile, 'utf8'));

console.log('=== Driver code matches ===');
const regex = /get(Action|Trigger|Condition)Card\(['"]([^'"]+)['"]/g;
let m;
while ((m = regex.exec(code)) !== null) {
  console.log('  ' + m[1] + ': ' + m[2]);
}

console.log('\n=== Flow defined IDs ===');
const defined = new Set();
for (const a of flow.actions || []) defined.add('action:' + a.id);
for (const t of flow.triggers || []) defined.add('trigger:' + t.id);
for (const c of flow.conditions || []) defined.add('condition:' + c.id);
console.log('  Total:', defined.size);
for (const d of defined) console.log('  ' + d);

console.log('\n=== Check specific IDs ===');
const ids = ['water_valve_smart_set_valve', 'water_valve_smart_opened', 'water_valve_smart_closed'];
for (const id of ids) {
  console.log('  ' + id + ' in flow.compose:', JSON.stringify(flow.actions || []).includes(id) || JSON.stringify(flow.triggers || []).includes(id));
}
