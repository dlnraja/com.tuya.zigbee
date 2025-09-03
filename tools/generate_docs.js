// tools/generate_docs.js
const { generateMultilingualDocs } = require('../lib/documentation_generator');

async function createCompleteDocumentation() {
  await generateMultilingualDocs({
    languages: ['en', 'fr', 'nl', 'ta', 'de', 'es', 'it'],
    sections: [
      'getting_started',
      'device_matrix', 
      'driver_development',
      'troubleshooting',
      'changelog',
      'contributing'
    ],
    output: './docs/',
    format: 'markdown'
  });
}

createCompleteDocumentation().catch(console.error);
