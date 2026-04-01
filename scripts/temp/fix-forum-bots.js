const fs = require('fs');
const files = [
  '.github/scripts/forum-responder.js',
  '.github/scripts/forum-respond-requests.js',
  '.github/scripts/post-forum-update.js',
  '.github/scripts/post-lasse-reply.js'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Replace dismissive language
  content = content.replace(/already supported/gi, "mapped in our database");
  content = content.replace(/Already in the Universal Tuya Zigbee app/gi, "Mapped in the Universal Tuya Zigbee app");
  content = content.replace(/Already in/gi, "Mapped in");

  fs.writeFileSync(file, content);
  console.log(`Updated empathy logic in ${file}`);
}
