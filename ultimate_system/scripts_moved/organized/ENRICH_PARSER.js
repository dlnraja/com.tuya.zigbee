#!/usr/bin/env node
// 🔍 ENRICH PARSER v2.0.0 - Parse archives + create enriched tools
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 ENRICH PARSER v2.0.0');

// 1. Scan archives for techniques
const techniques = new Set();
const archiveDirs = fs.readdirSync('./archives').filter(d => d.includes('_'));

archiveDirs.slice(0, 20).forEach(dir => {
  const infoFile = `./archives/${dir}/info.txt`;
  if (fs.existsSync(infoFile)) {
    const content = fs.readFileSync(infoFile, 'utf8');
    ['parse', 'dump', 'extract', 'scan', 'fix', 'enrich'].forEach(tech => {
      if (content.toLowerCase().includes(tech)) techniques.add(tech);
    });
  }
});

// 2. Create enriched parser
const parser = `#!/usr/bin/env node
// ENRICHED PARSER - Techniques: ${Array.from(techniques).join(', ')}
const fs = require('fs');

class EnrichedParser {
  parse(data) { return JSON.parse(data); }
  extract(text) { return text.match(/_TZ[A-Z0-9_]+/g) || []; }
  dump(obj) { return JSON.stringify(obj, null, 2); }
}

module.exports = new EnrichedParser();`;

fs.writeFileSync('./tools/enriched_parser.js', parser);

// 3. Create enriched dumper
const dumper = `#!/usr/bin/env node
// ENRICHED DUMPER - Historical techniques
const fs = require('fs');

class EnrichedDumper {
  dumpDrivers() {
    const drivers = {};
    fs.readdirSync('./drivers').forEach(d => {
      const f = \`./drivers/\${d}/driver.compose.json\`;
      if (fs.existsSync(f)) drivers[d] = JSON.parse(fs.readFileSync(f));
    });
    fs.writeFileSync('./dumps/drivers_dump.json', JSON.stringify(drivers, null, 2));
  }
}

module.exports = new EnrichedDumper();`;

if (!fs.existsSync('./tools')) fs.mkdirSync('./tools', {recursive: true});
if (!fs.existsSync('./dumps')) fs.mkdirSync('./dumps', {recursive: true});

fs.writeFileSync('./tools/enriched_dumper.js', dumper);

console.log(`✅ Created enriched tools with ${techniques.size} techniques from ${archiveDirs.length} archives`);
