const fs = require('fs');
const path = require('path');

console.log('🔧 Correction TOUS les chemins d\'images drivers\n');

const appJsonPath = path.join(__dirname, 'app.json');
let content = fs.readFileSync(appJsonPath, 'utf8');

// Remplacer TOUS les chemins incorrects par les bons
const fixed = content.replace(
  /"small":\s*"\.\/assets\/small\.png"/g,
  '"small": "./assets/images/small.png"'
).replace(
  /"large":\s*"\.\/assets\/large\.png"/g,
  '"large": "./assets/images/large.png"'
).replace(
  /"xlarge":\s*"\.\/assets\/xlarge\.png"/g,
  '"xlarge": "./assets/images/xlarge.png"'
);

if (fixed !== content) {
  fs.writeFileSync(appJsonPath, fixed);
  const count = (content.match(/\.\/assets\/small\.png/g) || []).length;
  console.log(`✅ ${count} drivers corrigés`);
  console.log('   ./assets/small.png → ./assets/images/small.png');
  console.log('   ./assets/large.png → ./assets/images/large.png\n');
} else {
  console.log('✅ Tous les chemins déjà corrects\n');
}
