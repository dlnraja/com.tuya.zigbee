// Read and display issue 511 with all comments
const fs = require('fs');
const path = require('path');

const comments = JSON.parse(fs.readFileSync(process.env.TEMP + '/i511-comments.json', 'utf8'));
console.log('Total comments:', comments.length);
console.log('');
comments.forEach((c, i) => {
  console.log('--- Comment', (i+1), 'by', c.user.login, 'at', c.created_at, '---');
  console.log(c.body);
  console.log('');
});
