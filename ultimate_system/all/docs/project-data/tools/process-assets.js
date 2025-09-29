#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const glob = promisify(require('glob'));
const sharp = require('sharp');
// Image processing using sharp only

// Configuration
const CONFIG = {
  driversDir: path.join(__dirname, '..', 'drivers'),
  tempDir: path.join(__dirname, '..', 'temp'),
  logFile: path.join(__dirname, '..', 'asset-processing.log')
};

// Ensure directories exist
[CONFIG.driversDir, CONFIG.tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Logger
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(CONFIG.logFile, logMessage);
    console.log(message);
  },
  error: (message) => {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}\n`;
    fs.appendFileSync(CONFIG.logFile, errorMessage);
    console.error(`❌ ${message}`);
  }
};

// Main function
async function main() {
  try {
    logger.log('Starting asset processing...');
    
    // Check if sharp is installed
    try {
      require('sharp');
    } catch (error) {
      logger.error('Sharp is required for image processing. Please install it first.');
      logger.error('Run: npm install sharp');
      process.exit(1);
    }
    
    // Process all drivers
    const driverDirs = await glob(path.join(CONFIG.driversDir, '*/'));
    
    for (const driverDir of driverDirs) {
      await processDriverAssets(driverDir);
    }
    
    logger.log('✅ Asset processing completed successfully!');
  } catch (error) {
    logger.error(`Process failed: ${error.message}`);
    process.exit(1);
  }
}

async function processDriverAssets(driverDir) {
  const driverName = path.basename(driverDir);
  const assetsDir = path.join(driverDir, 'assets');
  const imagesDir = path.join(assetsDir, 'images');
  
  // Create directories if they don't exist
  [assetsDir, imagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  logger.log(`Processing assets for driver: ${driverName}`);
  
  // Process existing images
  await processImages(imagesDir);
  
  // Generate missing images
  await generateMissingImages(driverName, imagesDir);
  
  // Update driver.compose.json with correct image paths
  await updateDriverCompose(driverDir, driverName);
}

async function processImages(imagesDir) {
  const imageFiles = await glob(path.join(imagesDir, '*'));
  
  for (const file of imageFiles) {
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, ext);
    
    try {
      if (ext === '.svg') {
        // Convert SVG to PNG using sharp
        const pngPath = path.join(imagesDir, `${baseName}.png`);
        await sharp(file, { density: 300 })
          .png()
          .toFile(pngPath);
        
        // Remove original SVG
        fs.unlinkSync(file);
        logger.log(`  ✓ Converted ${path.basename(file)} to PNG`);
        
        // Resize to standard sizes
        await resizeImage(pngPath, 'large', 500);
        await resizeImage(pngPath, 'small', 100);
      } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
        // Process other image formats
        const pngPath = path.join(imagesDir, `${baseName}.png`);
        
        // Convert to PNG if not already
        if (ext !== '.png') {
          await sharp(file).toFile(pngPath);
          fs.unlinkSync(file);
          logger.log(`  ✓ Converted ${path.basename(file)} to PNG`);
        }
        
        // Resize to standard sizes
        await resizeImage(pngPath, 'large', 500);
        await resizeImage(pngPath, 'small', 100);
      }
    } catch (error) {
      logger.error(`  ✗ Error processing ${file}: ${error.message}`);
    }
  }
}

async function resizeImage(sourcePath, size, dimension) {
  const ext = path.extname(sourcePath);
  const baseName = path.basename(sourcePath, ext);
  const targetPath = path.join(path.dirname(sourcePath), `${baseName}-${size}${ext}`);
  
  try {
    await sharp(sourcePath)
      .resize(dimension, dimension, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(targetPath);
    
    logger.log(`  ✓ Created ${size} (${dimension}x${dimension}) version: ${path.basename(targetPath)}`);
    return targetPath;
  } catch (error) {
    logger.error(`  ✗ Error creating ${size} version of ${path.basename(sourcePath)}: ${error.message}`);
    return null;
  }
}

async function generateMissingImages(driverName, imagesDir) {
  const requiredSizes = {
    'large': 500,
    'small': 100
  };
  
  for (const [size, dimension] of Object.entries(requiredSizes)) {
    const pattern = path.join(imagesDir, `*-${size}.png`);
    const existingFiles = await glob(pattern);
    
    if (existingFiles.length === 0) {
      // No image of this size exists, generate a placeholder
      await generatePlaceholderImage(driverName, imagesDir, size, dimension);
    }
  }
}

async function generatePlaceholderImage(driverName, imagesDir, size, dimension) {
  const outputPath = path.join(imagesDir, `${driverName}-${size}.png`);
  const text = driverName.replace(/-/g, ' ').toUpperCase();
  
  try {
    // Create a simple placeholder with text using sharp
    const svg = Buffer.from(`
      <svg width="${dimension}" height="${dimension}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" 
              font-family="Arial, sans-serif" 
              font-size="${Math.max(8, dimension / 10)}" 
              text-anchor="middle" 
              dominant-baseline="middle" 
              fill="#666666">
          ${text}\n${size.toUpperCase()}\n${dimension}x${dimension}
        </text>
      </svg>
    `);
    
    // Convert SVG to PNG using sharp
    await sharp(svg, { density: 300 })
      .resize(dimension, dimension)
      .png()
      .toFile(outputPath);
    
    logger.log(`  ✓ Generated ${size} placeholder: ${path.basename(outputPath)}`);
    return outputPath;
  } catch (error) {
    logger.error(`  ✗ Error generating ${size} placeholder: ${error.message}`);
    return null;
  }
}

async function updateDriverCompose(driverDir, driverName) {
  const composePath = path.join(driverDir, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    logger.error(`  ✗ driver.compose.json not found in ${driverDir}`);
    return;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Update image paths
    if (!compose.images) {
      compose.images = {};
    }
    
    compose.images.large = `/drivers/${driverName}/assets/images/${driverName}-large.png`;
    compose.images.small = `/drivers/${driverName}/assets/images/${driverName}-small.png`;
    
    // Save updated compose file
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    logger.log(`  ✓ Updated image paths in driver.compose.json`);
  } catch (error) {
    logger.error(`  ✗ Error updating driver.compose.json: ${error.message}`);
  }
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  processDriverAssets,
  resizeImage,
  generatePlaceholderImage
};
