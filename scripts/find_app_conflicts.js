const fs = require('fs');
const c = fs.readFileSync('app.json', 'utf8');
const lines = c.split('\n');
let count = 0;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/^<{7}/.test(l)) {
    count++;
    console.log(`CONFLICT#${count}|LINE:${i+1}`);
    console.log(`  HEAD: ${lines[i].substring(0,80)}`);
    // Show the 3 lines after HEAD (theirs content)
    const content = [];
    for (let j = i+1; j < Math.min(i+8, lines.length); j++) {
      if (/^={7}/.test(lines[j])) break;
      content.push(lines[j].substring(0,80));
    }
    content.forEach((cl,idx) => console.log(`  +${idx+1}: ${cl}`));
  }
}
console.log(`TOTAL: ${count} conflicts found`);
if (count === 0) {
  // Try with \r\n
  const lines2 = c.split('\r\n');
  let count2 = 0;
  for (let i = 0; i < lines2.length; i++) {
    if (/^<{7}/.test(lines2[i])) {
      count2++;
      console.log(`CRLF CONFLICT#${count2}|LINE:${i+1}|TEXT:${lines2[i].substring(0,80)}`);
    }
  }
  console.log(`CRLF TOTAL: ${count2}`);
}
