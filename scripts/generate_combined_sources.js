const fs = require('fs');
const path = require('path');

// Config
const blakadderPath = path.join(__dirname, '../data/blakadder');
const zigbee2mqttPath = path.join(__dirname, '../data/zigbee2mqtt_devices.json');
const homeyThreadsDir = path.join(__dirname, '../analysis/homey_threads');
const outputPath = path.join(__dirname, '../data/combined_sources.json');

// Charger les données
const zigbee2mqttDevices = JSON.parse(fs.readFileSync(zigbee2mqttPath, 'utf8'));

// Traiter les fichiers Blakadder
const blakadderDevices = [];
fs.readdirSync(blakadderPath).forEach(file => {
  if (file.endsWith('.json')) {
    const content = JSON.parse(fs.readFileSync(path.join(blakadderPath, file), 'utf8'));
    blakadderDevices.push(content);
  }
});

// Traiter les threads Homey
const homeyDevices = [];
fs.readdirSync(homeyThreadsDir).forEach(file => {
  if (file.endsWith('.json')) {
    const thread = JSON.parse(fs.readFileSync(path.join(homeyThreadsDir, file), 'utf8'));
    // Extraire les devices mentionnés (simplifié)
    thread.posts.forEach(post => {
      const matches = post.content.match(/Tuya\s+([A-Z0-9]+)/gi);
      if (matches) {
        matches.forEach(model => {
          homeyDevices.push({
            model: model.split(' ')[1],
            source: `Homey Thread: ${thread.title}`,
            source_url: thread.url,
            date: post.date
          });
        });
      }
    });
  }
});

// Combiner les sources
const combined = {
  zigbee2mqtt: zigbee2mqttDevices,
  blakadder: blakadderDevices,
  homey: homeyDevices
};

// Sauvegarder
fs.writeFileSync(outputPath, JSON.stringify(combined, null, 2));
console.log(`Combined sources saved to ${outputPath}`);
