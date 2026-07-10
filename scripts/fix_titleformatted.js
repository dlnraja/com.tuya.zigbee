const fs = require('fs');
const path = require('path');
const d = 'drivers';

let fixedCount = 0;

fs.readdirSync(d).forEach(dr => {
  const f = path.join(d, dr, 'driver.flow.compose.json');
  if (!fs.existsSync(f)) return;
  try {
    let raw = fs.readFileSync(f, 'utf8');
    const json = JSON.parse(raw);
    let changed = false;

    const cleanString = (str) => {
      if (typeof str !== 'string') return str;
      if (!str.includes('[[device]]')) return str;
      
      // Remove [[device]] and any surrounding spaces, then clean up double spaces
      let cleaned = str.replace(/\s*\[\[device\]\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Capitalize first letter
      if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
      return cleaned;
    };

    const cleanTitleFormatted = (obj) => {
      if (!obj) return obj;
      if (typeof obj === 'string') {
        const cleaned = cleanString(obj);
        if (cleaned !== obj) {
          changed = true;
          fixedCount++;
          return cleaned;
        }
      } else if (typeof obj === 'object') {
        const newObj = {};
        for (const [lang, val] of Object.entries(obj)) {
          if (typeof val === 'string') {
            const cleaned = cleanString(val);
            if (cleaned !== val) {
              changed = true;
              fixedCount++;
              newObj[lang] = cleaned;
            } else {
              newObj[lang] = val;
            }
          } else {
            newObj[lang] = val;
          }
        }
        return newObj;
      }
      return obj;
    };

    // Clean triggers
    if (json.triggers) {
      json.triggers = json.triggers.map(t => {
        if (t.titleFormatted) {
          t.titleFormatted = cleanTitleFormatted(t.titleFormatted);
        }
        return t;
      });
    }

    // Clean actions
    if (json.actions) {
      json.actions = json.actions.map(a => {
        if (a.titleFormatted) {
          a.titleFormatted = cleanTitleFormatted(a.titleFormatted);
        }
        return a;
      });
    }

    // Clean conditions
    if (json.conditions) {
      json.conditions = json.conditions.map(c => {
        if (c.titleFormatted) {
          c.titleFormatted = cleanTitleFormatted(c.titleFormatted);
        }
        return c;
      });
    }

    if (changed) {
      fs.writeFileSync(f, JSON.stringify(json, null, 2));
      console.log(`Fixed flow titles in: ${dr}`);
    }
  } catch(e) {
    console.error(`Failed to process ${dr}:`, e.message);
  }
});

console.log(`Total titleFormatted fields fixed: ${fixedCount}`);
