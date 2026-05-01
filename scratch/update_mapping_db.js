const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'lib/tuya/tuya-universal-mapping.js');
let content = fs.readFileSync(filePath, 'utf8');

const zosungConfig = `
  // Zosung IR Learning (0xE004)
  0xE004: {
    capability: 'ir_learning',
    type: 'custom',
    writable: true,
    sources: ['z2m', 'dlnraja'],
    notes: 'Fragmented IR code learning'
  },
  
  // Zosung IR Transmit (0xED00)
  0xED00: {
    capability: 'ir_transmit',
    type: 'custom',
    writable: true,
    sources: ['z2m', 'dlnraja'],
    notes: 'Fragmented IR code transmission'
  }`;

if (!content.includes('0xE004')) {
  // Find the end of CLUSTER_CAPABILITY_MAP
  // It ends before SOURCES
  const searchStr = 'const SOURCES = {';
  const insertIdx = content.indexOf(searchStr);
  
  if (insertIdx !== -1) {
    // Find the last }; before SOURCES
    const beforeSources = content.slice(0, insertIdx);
    const lastClosingBrace = beforeSources.lastIndexOf('};');
    
    if (lastClosingBrace !== -1) {
      content = beforeSources.slice(0, lastClosingBrace - 1).trimEnd() + ',\n' + zosungConfig + '\n};' + content.slice(insertIdx - 1);
      fs.writeFileSync(filePath, content);
      console.log('Successfully updated lib/tuya/tuya-universal-mapping.js with Zosung IR clusters');
    }
  }
}
