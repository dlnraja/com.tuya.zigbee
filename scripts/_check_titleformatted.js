const fs = require('fs');
const path = require('path');
const d = 'drivers';
let triggerViolations = 0, actionViolations = 0, conditionViolations = 0;
const examples = [];

fs.readdirSync(d).forEach(dr => {
  const f = path.join(d, dr, 'driver.flow.compose.json');
  if (!fs.existsSync(f)) return;
  try {
    const json = JSON.parse(fs.readFileSync(f, 'utf8'));
    // Check triggers - THIS is the problematic case per PR #120
    (json.triggers || []).forEach(t => {
      if (t.titleFormatted) {
        const hasDev = JSON.stringify(t.titleFormatted).includes('[[device]]');
        if (hasDev) {
          triggerViolations++;
          if (examples.length < 3) examples.push({ driver: dr, id: t.id, titleFormatted: t.titleFormatted?.en || JSON.stringify(t.titleFormatted ).substring(0,80) })       ;
        }
      }
    });
    // Check actions
    (json.actions || []).forEach(a => {
      if (a.titleFormatted) {
        const hasDev = JSON.stringify(a.titleFormatted).includes('[[device]]');
        if (hasDev) actionViolations++;
      }
    });
    // Check conditions
    (json.conditions || []).forEach(c => {
      if (c.titleFormatted) {
        const hasDev = JSON.stringify(c.titleFormatted).includes('[[device]]');
        if (hasDev) conditionViolations++;
      }
    });
  } catch(e) {}
});
console.log('Trigger violations (CRITICAL): ' + triggerViolations);
console.log('Action violations: ' + actionViolations);
console.log('Condition violations: ' + conditionViolations);
console.log('Examples:');
examples.forEach(e => console.log('  ' + e.driver + '/' + e.id + ': ' + e.titleFormatted));
