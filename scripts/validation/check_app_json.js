const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

console.log('BrandColor:', app.brandColor);
console.log('Discovery:', JSON.stringify(app.discovery, null, 2));
console.log('Notifications:', JSON.stringify(app.notifications, null, 2));
