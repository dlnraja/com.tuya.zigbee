const fs = require('fs');
const intel = JSON.parse(fs.readFileSync('data/community-intel.json', 'utf8'));

const fingerprints = [];

// Parse issue bodies and comments
intel.issues.forEach(issue => {
  // Regex for the bot table: | `_TZ3000_vd43bbfq+TS0601` | **curtain_motor** |
  const botRegex = /\|\s*`([_A-Za-z0-9]+)\+([_A-Za-z0-9]+)`\s*\|\s*\*\*([a-z0-9_]+)\*\*\s*\|/g;
  
  // Regex for the main table: | `_TZE200_s8gkrkxk` | TS0601 | christmas_lights |
  const mainRegex = /\|\s*`([_A-Za-z0-9]+)`\s*\|\s*([_A-Za-z0-9]+)\s*\|\s*([a-z0-9_]+)\s*\|/g;
  
  const texts = [issue.body];
  if (issue.comments) {
    issue.comments.forEach(c => texts.push(c.body));
  }
  
  texts.forEach(text => {
    if (!text) return;
    
    let match;
    while ((match = botRegex.exec(text)) !== null) {
      fingerprints.push({ mfr: match[1], model: match[2], driver: match[3] });
    }
    
    while ((match = mainRegex.exec(text)) !== null) {
      fingerprints.push({ mfr: match[1], model: match[2], driver: match[3] });
    }
  });
});

console.log('Total extracted:', fingerprints.length);
console.log('Sample:', fingerprints.slice(0, 5));
