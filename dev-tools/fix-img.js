const fs = require('fs');
console.log('🖼️ FIX IMAGES - CYCLE 2/10');

// Generate SVG for gang switches
function makeSVG(gang) {
  return `<svg width="75" height="75"><rect fill="#4CAF50" width="75" height="75" rx="8"/>
  ${Array(gang).fill().map((_, i) => 
    `<rect x="${10 + i*12}" y="30" width="10" height="15" fill="white" rx="2"/>`
  ).join('')}</svg>`;
}

const gangDrivers = ['touch_switch_3gang', 'wall_switch_3gang_ac'];
gangDrivers.forEach(d => {
  const svg = makeSVG(3);
  const dir = `./drivers/${d}/assets`;
  if (fs.existsSync(dir)) {
    fs.writeFileSync(`${dir}/icon.svg`, svg);
    console.log(`✅ Fixed: ${d}`);
  }
});
