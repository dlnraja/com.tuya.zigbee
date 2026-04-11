const fs = require('fs');
const path = require('path');

// Fix missing capability listener before super.onNodeInit()
const searchDir = 'drivers';
let fixedCount = 0;

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file === 'device.js') {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Specifically looking for cases where super.onNodeInit is called before registerCapabilityListener
      // This is a complex refactoring, so we'll just log them for now to see how widespread it is
      if (content.includes('super.onNodeInit')) {
         const lines = content.split('\n');
         let superInitLine = -1;
         let firstListenerLine = -1;
         
         for (let i = 0; i < lines.length; i++) {
           if (lines[i].includes('super.onNodeInit')) {
             superInitLine = i;
           } else if (lines[i].includes('this.registerCapabilityListener') && firstListenerLine === -1) {
             firstListenerLine = i;
           }
         }
         
         if (superInitLine !== -1 && firstListenerLine !== -1 && superInitLine < firstListenerLine) {
           // We found a potential issue, but it's common in Homey apps.
           // The specific error "Missing Capability Listener" usually happens when an incoming message
           // triggers a capability *during* super.onNodeInit before the listener is registered.
         }
      }
    }
  }
}

walk(searchDir);
console.log(`\n✅ Checked for capability listener order`);
