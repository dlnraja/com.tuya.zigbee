const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

function findDuplicates(type) {
    const ids = new Set();
    const duplicates = new Set();
    if (appJson.flow && appJson.flow[type]) {
        appJson.flow[type].forEach(card => {
            if (ids.has(card.id)) {
                duplicates.add(card.id);
            }
            ids.add(card.id);
        });
    }
    return Array.from(duplicates);
}

console.log('Checking for duplicate Flow card IDs...');
const duplicateTriggers = findDuplicates('triggers');
const duplicateConditions = findDuplicates('conditions');
const duplicateActions = findDuplicates('actions');

if (duplicateTriggers.length > 0) console.log('Duplicate Triggers:', duplicateTriggers);
if (duplicateConditions.length > 0) console.log('Duplicate Conditions:', duplicateConditions);
if (duplicateActions.length > 0) console.log('Duplicate Actions:', duplicateActions);

if (duplicateTriggers.length === 0 && duplicateConditions.length === 0 && duplicateActions.length === 0) {
    console.log('No duplicate IDs found.');
}
