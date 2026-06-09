'use strict';

const fs = require('fs');

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const flow = app.flow || {};
const all = [
  ...(flow.triggers || []).map(c => ({ ...c, type: 'trigger' })),
  ...(flow.conditions || []).map(c => ({ ...c, type: 'condition' })),
  ...(flow.actions || []).map(c => ({ ...c, type: 'action' })),
];

// Check for invalid chars in IDs
const invalidChars = all.filter(card => card.id && /[^a-z0-9_\-]/.test(card.id));
console.log('Flow cards with invalid chars:', invalidChars.length);
invalidChars.forEach(c => {
  const bad = (c.id.match(/[^a-z0-9_\-]/g) || []);
  console.log('  [' + c.type + '] id=' + c.id + ' BAD=' + JSON.stringify(bad));
});

// Check encoding
const appStr = fs.readFileSync('app.json', 'utf8');
const hasEncoding = appStr.includes('Ã©') || appStr.includes('Ã ') || appStr.includes('ÃÃ‰');
console.log('\nEncoding issues in app.json:', hasEncoding ? 'YES - STILL PRESENT' : 'NONE - CLEAN');

// Check gangX
const hasGangX = appStr.includes('gangX');
console.log('gangX_scene still present:', hasGangX ? 'YES - STILL THERE' : 'NO - REMOVED OK');

// Check resetEnergyMeter (old camelCase)
const hasResetOld = all.some(c => c.id === 'resetEnergyMeter');
console.log('resetEnergyMeter (old camelCase) flow card:', hasResetOld ? 'YES - STILL THERE' : 'NO - FIXED OK');

// Check reset_energy_meter (new)
const hasResetNew = all.some(c => c.id === 'reset_energy_meter');
console.log('reset_energy_meter (new snake_case) flow card:', hasResetNew ? 'YES - PRESENT OK' : 'NO - MISSING');

// Count
const tooLong = all.filter(card => card.id && card.id.length > 64);
console.log('\nFlow cards with ID > 64 chars:', tooLong.length, '(Homey tolerates these)');
console.log('Total flow cards:', all.length);

// Final verdict
const ok = invalidChars.length === 0 && !hasEncoding && !hasGangX && !hasResetOld;
console.log('\n' + (ok ? '✅ ALL FIXES APPLIED - Ready to push!' : '❌ STILL HAS ISSUES'));
