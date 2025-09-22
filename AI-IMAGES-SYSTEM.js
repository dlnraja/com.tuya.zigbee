const fs = require('fs');

console.log('🎨 IA IMAGES HOMEY SDK3 - Cohérent');

// Prompts par type
const prompts = {
  motion: 'white PIR sensor dome, blue LED, studio lighting, white bg',
  switch1: 'white 1gang wall switch, modern design, clean lighting',
  switch2: 'white 2gang wall switch, symmetrical, professional',
  switch3: 'white 3gang wall switch, linear row, studio lighting',
  plug: 'white smart plug EU, LED indicator, product photo',
  sensor: 'white temp sensor, LCD, modern design'
};

// Générer pour drivers
const drivers = fs.readdirSync('drivers');
const output = [];

drivers.forEach(d => {
  let prompt = prompts.motion;
  if (d.includes('1gang')) prompt = prompts.switch1;
  else if (d.includes('2gang')) prompt = prompts.switch2;
  else if (d.includes('3gang')) prompt = prompts.switch3;
  else if (d.includes('plug')) prompt = prompts.plug;
  else if (d.includes('temp')) prompt = prompts.sensor;
  
  output.push(`${d}: ${prompt}`);
});

fs.writeFileSync('AI-IMAGES-OUTPUT.txt', output.join('\n'));
console.log(`✅ ${output.length} prompts générés`);
