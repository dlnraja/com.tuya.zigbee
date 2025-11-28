'use strict';

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'zigbee_apps.json');
const outputPath = path.join(__dirname, '..', 'docs', 'ZIGBEE_HOMEY_APPS_CATALOG_GENERATED.md');

function toMarkdownTable(apps) {
  const headers = ['Name', 'App ID', 'Protocols', 'Manufacturers', 'GitHub', 'Notes'];
  const rows = apps.map(app => [
    `[${app.name}](${app.storeUrl})`,
    app.appId || '—',
    app.protocols.join(', ') || '—',
    app.keyManufacturers.join(', ') || '—',
    app.github ? `[repo](${app.github})` : 'none',
    app.notes || '—'
  ]);

  const headerLine = `| ${headers.join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  const rowsMarkdown = rows.map(row => `| ${row.join(' | ')} |`).join('\n');

  return `${headerLine}\n${divider}\n${rowsMarkdown}`;
}

function buildCatalog() {
  if (!fs.existsSync(dataPath)) {
    console.error('➡️  data/zigbee_apps.json not found. Run after data is populated.');
    process.exit(1);
  }

  const apps = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const markdown = `# Zigbee App Catalog (generated)\n\n${toMarkdownTable(apps)}\n\n_Updated at ${new Date().toISOString()}_\n`;
  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log(`✅ Generated catalog at ${outputPath}`);
}

buildCatalog();
