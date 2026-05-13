const fs = require('fs');
const path = require('path');

const scriptsDir = '.github/scripts';
const files = fs.readdirSync(scriptsDir).filter(f => f.includes('forum') || f.includes('post'));

for (const f of files) {
  const p = path.join(scriptsDir, f);
  let c = fs.readFileSync(p, 'utf8');
  let changed = false;
  
  if (c.includes('method: "POST"') || c.includes("method: 'POST'")) {
    c = c.replace(/method:\s*['"]POST['"]/g, 'method: "GET" /* DISABLED POST FOR READONLY */');
    changed = true;
  }
  
  if (c.includes('axios.post(')) {
    c = c.replace(/axios\.post\(/g, 'console.log("READ ONLY MODE: Suppressed POST request"); // axios.post(');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(p, c, 'utf8');
    console.log(`Disabled POST requests in ${f}`);
  }
}
console.log('Forum scripts are now READ ONLY.');
