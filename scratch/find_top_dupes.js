const fs = require('fs');
const content = JSON.parse(fs.readFileSync('app.json', 'utf8'));

const sections = ['flow.triggers', 'flow.conditions', 'flow.actions'];
const idToCount = {};

sections.forEach(path => {
    const parts = path.split('.');
    let target = content;
    parts.forEach(p => { if (target) target = target[p]; });

    if (Array.isArray(target)) {
        target.forEach(card => {
            if (card && card.id) {
                if (!idToCount[card.id]) idToCount[card.id] = 0;
                idToCount[card.id]++;
            }
        });
    }
});

for (const id in idToCount) {
    if (idToCount[id] > 1) {
        console.log(`Duplicate Flow Card ID "${id}" appears ${idToCount[id]} times in app.json`);
    }
}
