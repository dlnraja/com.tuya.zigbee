const fs = require('fs');
const path = require('path');

// Fix "Missing Capability Listener" in devices by ensuring registerCapabilityListener
// is called BEFORE super.onNodeInit(args) in onNodeInit

const searchDir = 'drivers';
let fixedCount = 0;
let reviewList = [];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file === 'device.js') {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes('super.onNodeInit') && content.includes('this.registerCapabilityListener')) {
         const lines = content.split('\n');
         let superInitIdx = -1;
         let firstListenerIdx = -1;
         
         for (let i = 0; i < lines.length; i++) {
           if (lines[i].includes('super.onNodeInit')) {
             superInitIdx = i;
           } else if (lines[i].includes('this.registerCapabilityListener') && firstListenerIdx === -1) {
             firstListenerIdx = i;
           }
         }
         
         // If super is called before listeners are registered, this can cause the "Missing Capability Listener" error
         // because super.onNodeInit might trigger initial capability updates before listeners are ready.
         if (superInitIdx !== -1 && firstListenerIdx !== -1 && superInitIdx < firstListenerIdx) {
            reviewList.push(fullPath);
         }
      }
    }
  }
}

walk(searchDir);
console.log(`\nFound ${reviewList.length} files with super.onNodeInit before registerCapabilityListener:`);
reviewList.forEach(f => console.log(`- ${f}`));

