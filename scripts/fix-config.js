const fs = require('fs');

// Fix config issue from diagnostic 9fe2f272
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Fix version
app.version = '4.0.1';

// Fix settings structure
app.settings = [{
    "type": "group",
    "label": {"en": "Settings"},
    "children": [{
        "id": "debug",
        "type": "checkbox", 
        "label": {"en": "Debug mode"},
        "value": false
    }]
}];

// Fix contributors
app.contributors = {
    "developers": [{"name": "Dylan Rajasekaram", "email": "dylan@dlnraja.com"}]
};

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
console.log('✅ Config fixed for diagnostic 9fe2f272');
