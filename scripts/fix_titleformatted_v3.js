const fs = require('fs');
const path = require('path');
const d = 'drivers';

let fixedCount = 0;
let argRemovedCount = 0;

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

    const processCardList = (list) => {
      if (!list) return;
      list.forEach(card => {
        let hasDeviceToken = false;
        
        // 1. Check titleFormatted
        if (card.titleFormatted) {
          const original = JSON.stringify(card.titleFormatted);
          card.titleFormatted = cleanTitleFormatted(card.titleFormatted);
          if (original !== JSON.stringify(card.titleFormatted)) {
            hasDeviceToken = true;
          }
        }

        // 2. If it has [[device]] in titleFormatted OR it has a device argument in args, strip it from args
        if (card.args && Array.isArray(card.args)) {
          const initialLen = card.args.length;
          card.args = card.args.filter(arg => {
            const isDev = arg && (arg.name === 'device' || arg.type === 'device');
            if (isDev) {
              changed = true;
              argRemovedCount++;
            }
            return !isDev;
          });
        }
      });
    };

    // Clean trigger, action, and condition lists
    processCardList(json.triggers);
    processCardList(json.actions);
    processCardList(json.conditions);

    if (changed) {
      fs.writeFileSync(f, JSON.stringify(json, null, 2));
      console.log(`✅ Normalized flow card titles & args in: ${dr}`);
    }
  } catch(e) {
    console.error(`❌ Failed to process ${dr}:`, e.message);
  }
});

console.log(`\n📋 Fix Summary:`);
console.log(`- Total titleFormatted fields cleaned: ${fixedCount}`);
console.log(`- Total device arguments stripped: ${argRemovedCount}`);
