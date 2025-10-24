const fs = require('fs');
const content = fs.readFileSync('app.json', 'utf8');
const matches = content.match(/ikea_ikea_|_other_other|_aaa_aaa|_aa_aa|_internal_internal/g);
console.log(matches ? matches.length : 0);
