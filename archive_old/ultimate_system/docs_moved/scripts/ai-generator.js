const fs = require('fs');

console.log('🎨 IA IMAGE GENERATOR - Homey Drivers');

// Prompts par type
const prompts = {
  motion: 'white PIR sensor, blue LED, clean background, 75x75px',
  switch1: 'single white wall switch, 1 button, modern design',
  switch2: 'double white wall switch, 2 buttons side by side',
  switch3: 'triple white wall switch, 3 buttons in row',
  plug: 'white smart plug, LED indicators, modern style',
  sensor: 'white temperature sensor, LCD display, rounded',
  bulb: 'white LED smart bulb, soft glow, E27 base'
};

// Générer instructions pour drivers
const drivers = fs.readdirSync('drivers');
const instructions = [];

drivers.forEach(d => {
  let prompt = prompts.motion;
  if (d.includes('1gang')) prompt = prompts.switch1;
  else if (d.includes('2gang')) prompt = prompts.switch2;
  else if (d.includes('3gang')) prompt = prompts.switch3;
  else if (d.includes('plug')) prompt = prompts.plug;
  else if (d.includes('temp')) prompt = prompts.sensor;
  else if (d.includes('bulb')) prompt = prompts.bulb;
  
  instructions.push(`${d}: ${prompt}`);
});

// Sauvegarder
fs.writeFileSync('AI-PROMPTS.txt', instructions.join('\n'));
console.log(`✅ ${instructions.length} prompts générés`);
console.log('📄 Voir: AI-PROMPTS.txt');
console.log('🔧 Utilisez Fooocus/Stable Diffusion avec ces prompts');
