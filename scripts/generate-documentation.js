const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

// Configuration
const DRIVERS_DIR = path.join(__dirname, '../drivers');
const DOCS_DIR = path.join(__dirname, '../docs');
const SUPPORTED_LANGUAGES = ['en', 'fr', 'nl', 'ta'];
const DEFAULT_LANGUAGE = 'en';
const TEMPLATES_DIR = path.join(__dirname, 'templates');

// Register Handlebars helpers
Handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context, null, 2);
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str?.toLowerCase() || '';
});

Handlebars.registerHelper('capitalize', (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

// Templates
const TEMPLATES = {
  main: fs.readFileSync(path.join(TEMPLATES_DIR, 'main.hbs'), 'utf8'),
  driver: fs.readFileSync(path.join(TEMPLATES_DIR, 'driver.hbs'), 'utf8')
};

const mainTemplate = Handlebars.compile(TEMPLATES.main);
const driverTemplate = Handlebars.compile(TEMPLATES.driver);

async function loadDriverData(driver) {
  const driverPath = path.join(DRIVERS_DIR, driver);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!await fs.pathExists(composePath)) {
    return null;
  }

  try {
    const compose = JSON.parse(await fs.readFile(composePath, 'utf8'));
    const stats = await fs.stat(composePath);
    
    return {
      id: driver,
      name: compose.name || {},
      description: compose.description || {},
      manufacturer: compose.manufacturer || 'Tuya',
      model: compose.model || driver,
      type: compose.class || 'Unknown',
      status: compose.status || 'unknown',
      capabilities: compose.capabilities || [],
      features: compose.features || [],
      lastUpdated: stats.mtime.toISOString().split('T')[0],
      path: `drivers/${driver}`
    };
  } catch (error) {
    console.error(`Error loading driver ${driver}:`, error);
    return null;
  }
}

async function generateReadme(lang = DEFAULT_LANGUAGE) {
  const driversDir = await fs.readdir(DRIVERS_DIR, { withFileTypes: true });
  const drivers = [];

  // Load all drivers
  for (const dirent of driversDir) {
    if (dirent.isDirectory() && !dirent.name.startsWith('_')) {
      const driverData = await loadDriverData(dirent.name);
      if (driverData) {
        drivers.push(driverData);
      }
    }
  }

  // Sort drivers by name
  drivers.sort((a, b) => {
    const nameA = (a.name[lang] || a.name[DEFAULT_LANGUAGE] || a.id).toLowerCase();
    const nameB = (b.name[lang] || b.name[DEFAULT_LANGUAGE] || b.id).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Generate README content
  const readmeContent = mainTemplate({
    title: 'Tuya Zigbee Integration',
    description: 'Homey integration for Tuya Zigbee devices',
    drivers: drivers.map(driver => ({
      ...driver,
      name: driver.name[lang] || driver.name[DEFAULT_LANGUAGE] || driver.id,
      description: driver.description[lang] || driver.description[DEFAULT_LANGUAGE] || ''
    })),
    lang
  });

  return readmeContent;
}

async function generateDriverDocs(driverData, lang = DEFAULT_LANGUAGE) {
  return driverTemplate({
    ...driverData,
    name: driverData.name[lang] || driverData.name[DEFAULT_LANGUAGE] || driverData.id,
    description: driverData.description[lang] || driverData.description[DEFAULT_LANGUAGE] || '',
    lang
  });
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function generateAllDocumentation() {
  console.log('Generating documentation...');
  
  // Ensure docs directory exists
  await ensureDir(DOCS_DIR);
  
  // Load all drivers
  const driversDir = await fs.readdir(DRIVERS_DIR, { withFileTypes: true });
  const drivers = [];
  
  for (const dirent of driversDir) {
    if (dirent.isDirectory() && !dirent.name.startsWith('_')) {
      const driverData = await loadDriverData(dirent.name);
      if (driverData) {
        drivers.push(driverData);
      }
    }
  }

  // Generate main README for each language
  for (const lang of SUPPORTED_LANGUAGES) {
    const readmeContent = await generateReadme(lang);
    const readmePath = lang === DEFAULT_LANGUAGE 
      ? 'README.md' 
      : `README.${lang}.md`;
    
    await fs.writeFile(readmePath, readmeContent);
    console.log(`Generated ${readmePath}`);
  }

  // Generate individual driver documentation
  const driverDocsDir = path.join(DOCS_DIR, 'drivers');
  await ensureDir(driverDocsDir);

  for (const driver of drivers) {
    const driverDocDir = path.join(driverDocsDir, driver.id);
    await ensureDir(driverDocDir);
    
    for (const lang of SUPPORTED_LANGUAGES) {
      const driverDoc = await generateDriverDocs(driver, lang);
      const docPath = path.join(driverDocDir, `README${lang === DEFAULT_LANGUAGE ? '' : `.${lang}`}.md`);
      await fs.writeFile(docPath, driverDoc);
    }
    
    console.log(`Generated docs for driver: ${driver.id}`);
  }

  console.log('\nDocumentation generation complete!');
}

// Run if called directly
if (require.main === module) {
  generateAllDocumentation().catch(error => {
    console.error('Error generating documentation:', error);
    process.exit(1);
  });
}

module.exports = {
  generateReadme,
  generateDriverDocs,
  generateAllDocumentation
};
