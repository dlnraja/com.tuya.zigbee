const fs = require('fs');
const content = JSON.parse(fs.readFileSync('app.json', 'utf8'));

const sections = ['flow.triggers', 'flow.conditions', 'flow.actions'];

sections.forEach(path => {
    const parts = path.split('.');
    let target = content;
    parts.forEach(p => { if (target) target = target[p]; });

    if (Array.isArray(target)) {
        const ids = new Set();
        const duplicates = [];
        target.forEach(card => {
            if (ids.has(card.id)) {
                duplicates.push(card.id);
            }
            ids.add(card.id);
        });
        if (duplicates.length > 0) {
            console.log(`Duplicates in ${path}:`, duplicates);
        }
    }
});
