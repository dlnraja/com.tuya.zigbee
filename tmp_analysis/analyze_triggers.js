const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const content = fs.readFileSync(appJsonPath, 'utf8');
const data = JSON.parse(content);

const triggers = data.flow.triggers || [];
console.log(`Total triggers: ${triggers.length}`);

// Group by id
const grouped = {};
triggers.forEach(t => {
    if (!t.id) return;
    if (!grouped[t.id]) grouped[t.id] = [];
    grouped[t.id].push(t);
});

// Find duplicates
const duplicates = Object.entries(grouped).filter(([id, list]) => list.length > 1);
console.log('\n=== DUPLICATE TRIGGER IDs ===');
duplicates.forEach(([id, list]) => {
    console.log(`ID: "${id}" - Count: ${list.length}`);
    // Show first few lines of each duplicate
    list.forEach((t, idx) => {
        const filter = t.args && t.args.find(a => a.filter)?.filter || 'no filter'      ;
        console.log(`  ${idx+1}: filter="${filter}", title="${t.title?.en || 'no title'}"`)       ;
    });
});

// Check for bulb_tunable_white related triggers
console.log('\n=== BULB_TUNABLE_WHITE RELATED TRIGGERS ===');
const bulbTriggers = triggers.filter(t => t.id && t.id.includes('bulb_tunable_white'));
bulbTriggers.forEach(t => {
    console.log(`ID: "${t.id}"`);
    console.log(`  Filter: ${t.args?.[0]?.filter || 'none'}`)      ;
    console.log(`  Title: ${t.title?.en || 'no title'}`)       ;
});

// Also check for any trigger with "bulb_tunable" in any part
console.log('\n=== ALL TRIGGERS WITH "bulb_tunable" IN ID ===');
const allBulb = triggers.filter(t => t.id && t.id.toLowerCase().includes('bulb_tunable'));
allBulb.forEach(t => {
    console.log(`"${t.id}"`);
});
