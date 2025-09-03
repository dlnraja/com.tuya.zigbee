// build_matrix.js
const { generateDeviceMatrix } = require('../lib/matrix_generator');

async function buildCompleteMatrix() {
  const matrix = await generateDeviceMatrix({
    sources: [
      './drivers/**/*.json',
      './data/sources_analysis.json',
      './data/external_sources/**/*.json'
    ],
    output: './data/device_matrix.csv',
    format: 'csv',
    include: ['metadata', 'capabilities', 'sources', 'scores']
  });

  console.log(`📊 Matrice générée avec ${matrix.devices.length} devices`);
}

buildCompleteMatrix().catch(console.error);
