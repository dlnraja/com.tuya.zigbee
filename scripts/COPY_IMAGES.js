const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'drivers', 'wall_touch_4gang', 'assets', 'images');
const destDir = path.join(__dirname, '..', 'drivers', 'wall_touch_3gang', 'assets', 'images');

console.log('Copying images...');
console.log(`From: ${sourceDir}`);
console.log(`To: ${destDir}`);

const files = fs.readdirSync(sourceDir);
files.forEach(file => {
  const src = path.join(sourceDir, file);
  const dest = path.join(destDir, file);
  fs.copyFileSync(src, dest);
  console.log(`✅ Copied: ${file}`);
});

console.log(`\n✅ Done! Copied ${files.length} files.`);
