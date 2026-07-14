// Read and display an issue + its comments
const fs = require('fs');

function readIssue(num) {
  let raw = fs.readFileSync(process.env.TEMP + '/i' + num + '.json', 'utf8');
  // Strip BOM if present
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  const issue = JSON.parse(raw);
  console.log('=== ISSUE ' + num + ' ===');
  console.log('Title:', issue.title);
  console.log('User:', issue.user.login);
  console.log('State:', issue.state);
  console.log('Date:', issue.created_at);
  console.log('Body:');
  console.log(issue.body);
  console.log('');
}

const num = process.argv[2] || '506';
readIssue(num);

