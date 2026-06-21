const fs = require('fs');
const path = require('path');
const d = '.homeycompose/flow/actions';

fs.readdirSync(d).forEach(f => {
  let p = path.join(d, f);
  if(p.endsWith('.json')) {
    let t = fs.readFileSync(p, 'utf8');
    t = t.replace(/"type":\s*"enum"/g, '"type": "dropdown"');
    t = t.replace(/"type":\s*"zone"/g, '"type": "autocomplete"');
    fs.writeFileSync(p, t);
  }
});
console.log('Fixed types in flow actions');
