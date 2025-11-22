#!/usr/bin/env node
/**
 * Script d'extraction et analyse de TOUS les PDFs
 * Extrait le texte, identifie les manufacturer IDs, diagnostic reports, et informations techniques
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📄 EXTRACTION ET ANALYSE DE TOUS LES PDFs\n');

// Vérifier si pdf-parse est installé
try {
  require.resolve('pdf-parse');
} catch (e) {
  console.log('📦 Installation de pdf-parse...');
  execSync('npm install pdf-parse', { stdio: 'inherit' });
}

// Import pdf-parse (default export)
let pdfParse;
try {
  pdfParse = require('pdf-parse');
  // Si c'est un objet avec default
  if (pdfParse.default) {
    pdfParse = pdfParse.default;
  }
} catch (e) {
  console.error('❌ Erreur import pdf-parse:', e.message);
  process.exit(1);
}

const pdfDir = path.join(__dirname, 'pdfhomey');
const outputDir = path.join(__dirname, 'pdf_analysis');

// Créer le répertoire de sortie
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Trouver tous les PDFs
const pdfFiles = fs.readdirSync(pdfDir)
  .filter(f => f.endsWith('.pdf'))
  .map(f => path.join(pdfDir, f));

console.log(`✅ ${pdfFiles.length} PDFs trouvés\n`);

// Patterns de recherche
const patterns = {
  manufacturerName: /_TZ[E0-9]{4}_[a-z0-9]{8,10}/gi,
  modelId: /TS\d{4}/gi,
  deviceId: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  cluster: /cluster[:\s]+(?:0x)?([0-9a-f]{4})/gi,
  datapoint: /(?:DP|dp|datapoint)[:\s]+(\d{1,3})/gi,
  endpoint: /endpoint[:\s]+(\d+)/gi,
  battery: /battery[:\s]+(\d{1,3})%?/gi,
  temperature: /temperature[:\s]+(-?\d+\.?\d*)\s*°?C?/gi,
  humidity: /humidity[:\s]+(\d+\.?\d*)%?/gi,
  zigbeeId: /zigbeeId[:\s]+([0-9a-f]+)/gi
};

// Résultats globaux
const globalResults = {
  totalPdfs: pdfFiles.length,
  processedPdfs: 0,
  errors: 0,
  manufacturerNames: new Set(),
  modelIds: new Set(),
  clusters: new Set(),
  datapoints: new Set(),
  diagnosticReports: [],
  technicalInfo: [],
  forumPosts: [],
  suggestions: []
};

// Fonction d'analyse de texte
function analyzeText(text, filename) {
  const result = {
    filename,
    type: 'unknown',
    manufacturerNames: [],
    modelIds: [],
    clusters: [],
    datapoints: [],
    endpoints: [],
    deviceId: null,
    battery: null,
    temperature: null,
    humidity: null,
    zigbeeId: null,
    rawText: text.substring(0, 500) // Premier 500 chars
  };

  // Déterminer le type de document
  if (filename.includes('Diagnostics Report')) {
    result.type = 'diagnostic_report';
  } else if (filename.includes('suggestion')) {
    result.type = 'suggestion';
  } else if (filename.includes('Forum')) {
    result.type = 'forum_post';
  } else if (filename.includes('Technical issue')) {
    result.type = 'technical_inquiry';
  }

  // Extraire les données
  result.manufacturerNames = [...new Set((text.match(patterns.manufacturerName) || []))];
  result.modelIds = [...new Set((text.match(patterns.modelId) || []))];

  // Clusters
  const clusterMatches = text.matchAll(patterns.cluster);
  for (const match of clusterMatches) {
    result.clusters.push(match[1]);
  }
  result.clusters = [...new Set(result.clusters)];

  // Datapoints
  const dpMatches = text.matchAll(patterns.datapoint);
  for (const match of dpMatches) {
    result.datapoints.push(match[1]);
  }
  result.datapoints = [...new Set(result.datapoints)];

  // Endpoints
  const epMatches = text.matchAll(patterns.endpoint);
  for (const match of epMatches) {
    result.endpoints.push(match[1]);
  }
  result.endpoints = [...new Set(result.endpoints)];

  // Device ID
  const deviceIdMatch = text.match(patterns.deviceId);
  if (deviceIdMatch) result.deviceId = deviceIdMatch[0];

  // Battery
  const batteryMatch = text.match(patterns.battery);
  if (batteryMatch) result.battery = parseInt(batteryMatch[1]);

  // Temperature
  const tempMatch = text.match(patterns.temperature);
  if (tempMatch) result.temperature = parseFloat(tempMatch[1]);

  // Humidity
  const humMatch = text.match(patterns.humidity);
  if (humMatch) result.humidity = parseFloat(humMatch[1]);

  // Zigbee ID
  const zigbeeMatch = text.match(patterns.zigbeeId);
  if (zigbeeMatch) result.zigbeeId = zigbeeMatch[1];

  // Ajouter aux résultats globaux
  result.manufacturerNames.forEach(m => globalResults.manufacturerNames.add(m));
  result.modelIds.forEach(m => globalResults.modelIds.add(m));
  result.clusters.forEach(c => globalResults.clusters.add(c));
  result.datapoints.forEach(d => globalResults.datapoints.add(d));

  // Catégoriser
  switch (result.type) {
    case 'diagnostic_report':
      globalResults.diagnosticReports.push(result);
      break;
    case 'suggestion':
      globalResults.suggestions.push(result);
      break;
    case 'forum_post':
      globalResults.forumPosts.push(result);
      break;
    case 'technical_inquiry':
      globalResults.technicalInfo.push(result);
      break;
  }

  return result;
}

// Traiter tous les PDFs
async function processAllPdfs() {
  const results = [];

  for (const pdfPath of pdfFiles) {
    const filename = path.basename(pdfPath);
    console.log(`📄 Processing: ${filename}`);

    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdfParse(dataBuffer);

      const analysis = analyzeText(data.text, filename);
      results.push(analysis);

      // Sauvegarder le texte brut
      const textFile = path.join(outputDir, filename.replace('.pdf', '.txt'));
      fs.writeFileSync(textFile, data.text, 'utf8');

      // Sauvegarder l'analyse
      const jsonFile = path.join(outputDir, filename.replace('.pdf', '.json'));
      fs.writeFileSync(jsonFile, JSON.stringify(analysis, null, 2), 'utf8');

      globalResults.processedPdfs++;
      console.log(`  ✅ Extracted ${data.text.length} chars`);
      if (analysis.manufacturerNames.length > 0) {
        console.log(`     📦 Found ${analysis.manufacturerNames.length} manufacturer IDs`);
      }

    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      globalResults.errors++;
    }
    console.log('');
  }

  return results;
}

// Générer le rapport final
function generateReport(results) {
  const report = {
    summary: {
      totalPdfs: globalResults.totalPdfs,
      processedPdfs: globalResults.processedPdfs,
      errors: globalResults.errors,
      manufacturerNamesFound: globalResults.manufacturerNames.size,
      modelIdsFound: globalResults.modelIds.size,
      clustersFound: globalResults.clusters.size,
      datapointsFound: globalResults.datapoints.size,
      diagnosticReports: globalResults.diagnosticReports.length,
      suggestions: globalResults.suggestions.length,
      forumPosts: globalResults.forumPosts.length,
      technicalInfo: globalResults.technicalInfo.length
    },
    manufacturerNames: Array.from(globalResults.manufacturerNames).sort(),
    modelIds: Array.from(globalResults.modelIds).sort(),
    clusters: Array.from(globalResults.clusters).sort(),
    datapoints: Array.from(globalResults.datapoints).sort(),
    diagnosticReports: globalResults.diagnosticReports,
    suggestions: globalResults.suggestions,
    forumPosts: globalResults.forumPosts,
    technicalInfo: globalResults.technicalInfo,
    detailedResults: results
  };

  // Sauvegarder le rapport
  const reportFile = path.join(outputDir, 'COMPLETE_PDF_ANALYSIS.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');

  // Rapport Markdown
  let markdown = '# 📄 RAPPORT COMPLET D\'ANALYSE DES PDFs\n\n';
  markdown += `**Date:** ${new Date().toISOString()}\n\n`;
  markdown += '## 📊 RÉSUMÉ\n\n';
  markdown += `- **PDFs traités:** ${report.summary.processedPdfs}/${report.summary.totalPdfs}\n`;
  markdown += `- **Erreurs:** ${report.summary.errors}\n`;
  markdown += `- **Manufacturer IDs:** ${report.summary.manufacturerNamesFound}\n`;
  markdown += `- **Model IDs:** ${report.summary.modelIdsFound}\n`;
  markdown += `- **Clusters:** ${report.summary.clustersFound}\n`;
  markdown += `- **Datapoints:** ${report.summary.datapointsFound}\n\n`;

  markdown += '## 📦 DOCUMENTS PAR TYPE\n\n';
  markdown += `- **Diagnostic Reports:** ${report.summary.diagnosticReports}\n`;
  markdown += `- **Suggestions:** ${report.summary.suggestions}\n`;
  markdown += `- **Forum Posts:** ${report.summary.forumPosts}\n`;
  markdown += `- **Technical Info:** ${report.summary.technicalInfo}\n\n`;

  markdown += '## 🏭 MANUFACTURER IDs TROUVÉS\n\n';
  if (report.manufacturerNames.length > 0) {
    markdown += '```\n';
    markdown += report.manufacturerNames.join('\n');
    markdown += '\n```\n\n';
  } else {
    markdown += '*Aucun manufacturer ID trouvé*\n\n';
  }

  markdown += '## 📱 MODEL IDs TROUVÉS\n\n';
  if (report.modelIds.length > 0) {
    markdown += '```\n';
    markdown += report.modelIds.join(', ');
    markdown += '\n```\n\n';
  } else {
    markdown += '*Aucun model ID trouvé*\n\n';
  }

  markdown += '## 🔧 CLUSTERS TROUVÉS\n\n';
  if (report.clusters.length > 0) {
    markdown += '```\n';
    markdown += report.clusters.map(c => `0x${c}`).join(', ');
    markdown += '\n```\n\n';
  } else {
    markdown += '*Aucun cluster trouvé*\n\n';
  }

  markdown += '## 📊 DATAPOINTS TROUVÉS\n\n';
  if (report.datapoints.length > 0) {
    markdown += '```\n';
    markdown += report.datapoints.join(', ');
    markdown += '\n```\n\n';
  } else {
    markdown += '*Aucun datapoint trouvé*\n\n';
  }

  markdown += '## 📝 DÉTAILS PAR DOCUMENT\n\n';
  results.forEach(r => {
    markdown += `### ${r.filename}\n\n`;
    markdown += `**Type:** ${r.type}\n\n`;
    if (r.deviceId) markdown += `**Device ID:** \`${r.deviceId}\`\n\n`;
    if (r.manufacturerNames.length > 0) {
      markdown += `**Manufacturer Names:** ${r.manufacturerNames.join(', ')}\n\n`;
    }
    if (r.modelIds.length > 0) {
      markdown += `**Model IDs:** ${r.modelIds.join(', ')}\n\n`;
    }
    if (r.clusters.length > 0) {
      markdown += `**Clusters:** ${r.clusters.map(c => `0x${c}`).join(', ')}\n\n`;
    }
    if (r.datapoints.length > 0) {
      markdown += `**Datapoints:** ${r.datapoints.join(', ')}\n\n`;
    }
    if (r.battery !== null) {
      markdown += `**Battery:** ${r.battery}%\n\n`;
    }
    markdown += '---\n\n';
  });

  const markdownFile = path.join(outputDir, 'COMPLETE_PDF_ANALYSIS.md');
  fs.writeFileSync(markdownFile, markdown, 'utf8');

  return report;
}

// Exécution principale
(async () => {
  try {
    const results = await processAllPdfs();
    const report = generateReport(results);

    console.log('\n📊 RAPPORT FINAL:\n');
    console.log(`✅ PDFs traités: ${report.summary.processedPdfs}/${report.summary.totalPdfs}`);
    console.log(`❌ Erreurs: ${report.summary.errors}`);
    console.log(`📦 Manufacturer IDs: ${report.summary.manufacturerNamesFound}`);
    console.log(`📱 Model IDs: ${report.summary.modelIdsFound}`);
    console.log(`🔧 Clusters: ${report.summary.clustersFound}`);
    console.log(`📊 Datapoints: ${report.summary.datapointsFound}`);
    console.log('');
    console.log(`📁 Résultats sauvegardés dans: ${outputDir}`);
    console.log(`📄 Rapport: ${path.join(outputDir, 'COMPLETE_PDF_ANALYSIS.md')}`);
    console.log('');
    console.log('✨ TRAITEMENT TERMINÉ!');

  } catch (err) {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  }
})();
