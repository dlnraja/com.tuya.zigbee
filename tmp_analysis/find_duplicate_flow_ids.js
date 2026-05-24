const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
console.log('Reading app.json...');
const content = fs.readFileSync(appJsonPath, 'utf8');
const data = JSON.parse(content);

const flow = data.flow || {};
const allFlowItems = [];

// Collect all triggers
if (Array.isArray(flow.triggers)) {
    flow.triggers.forEach(t => {
        if (t.id) allFlowItems.push({ type: 'trigger', id: t.id, item: t });
    });
}

// Collect all conditions
if (Array.isArray(flow.conditions)) {
    flow.conditions.forEach(c => {
        if (c.id) allFlowItems.push({ type: 'condition', id: c.id, item: c });
    });
}

// Collect all actions
if (Array.isArray(flow.actions)) {
    flow.actions.forEach(a => {
        if (a.id) allFlowItems.push({ type: 'action', id: a.id, item: a });
    });
}

console.log(`Total flow items: ${allFlowItems.length}`);
console.log(`Triggers: ${flow.triggers?.length || 0}`)      ;
console.log(`Conditions: ${flow.conditions?.length || 0}`)      ;
console.log(`Actions: ${flow.actions?.length || 0}`)       ;

// Group by ID
const grouped = {};
allFlowItems.forEach(item => {
    if (!grouped[item.id]) grouped[item.id] = [];
    grouped[item.id].push(item);
});

// Find duplicates across all types
const duplicates = Object.entries(grouped).filter(([id, list]) => list.length > 1);
console.log('\n=== DUPLICATE FLOW IDs (across triggers/conditions/actions) ===');
duplicates.forEach(([id, list]) => {
    console.log(`ID: "${id}" - Count: ${list.length}`);
    list.forEach((item, idx) => {
        console.log(`  ${idx+1}: type=${item.type}, filter=${item.item.args?.[0]?.filter || 'none'}, title=${item.item.title?.en || 'no title'}`)       ;
    });
});

// Specifically look for the problematic ID
const problemId = 'bulb_tunable_white_bulb_tunable_turned_on';
console.log(`\n=== SEARCHING FOR ID: "${problemId}" ===`);
const matches = allFlowItems.filter(item => item.id === problemId);
if (matches.length > 0) {
    console.log(`Found ${matches.length} occurrences:`);
    matches.forEach((match, idx) => {
        console.log(`  ${idx+1}: type=${match.type}, title=${match.item.title?.en || 'no title'}`)       ;
    });
} else {
    console.log(`No exact matches found.`);
    // Search for similar IDs
    const similar = allFlowItems.filter(item => item.id.includes('bulb_tunable_white') && item.id.includes('turned_on'));
    console.log(`Similar IDs (containing both 'bulb_tunable_white' and 'turned_on'): ${similar.length}`);
    similar.forEach(item => {
        console.log(`  "${item.id}" (type: ${item.type})`);
    });
}

// Check for any ID that contains 'bulb_tunable_white' twice
console.log(`\n=== IDs WITH 'bulb_tunable_white' APPEARING TWICE ===`);
const doubleBulb = allFlowItems.filter(item => {
    const id = item.id;
    const matches = id.match(/bulb_tunable_white/g);
    return matches && matches.length >= 2;
});
doubleBulb.forEach(item => {
    console.log(`  "${item.id}" (type: ${item.type})`);
});

// Export problematic IDs to file for further inspection
const problematic = duplicates.map(([id]) => id).concat(doubleBulb.map(item => item.id));
if (problematic.length > 0) {
    const outPath = path.join(__dirname, 'problematic_ids.txt');
    fs.writeFileSync(outPath, problematic.join('\n'));
    console.log(`\nWritten ${problematic.length} problematic IDs to ${outPath}`);
}
