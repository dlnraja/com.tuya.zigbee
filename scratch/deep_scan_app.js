const fs = require('fs');
const content = JSON.parse(fs.readFileSync('app.json', 'utf8'));

const ids = {};

function scan(obj) {
    if (Array.isArray(obj)) {
        obj.forEach(item => {
            if (item && item.id) {
                if (!ids[item.id]) ids[item.id] = 0;
                ids[item.id]++;
            }
            scan(item);
        });
    } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(val => scan(val));
    }
}

scan(content.flow || {});

for (const id in ids) {
    if (ids[id] > 1) {
        console.log(`Duplicate ID "${id}" appears ${ids[id]} times in app.json flow section`);
    }
}
