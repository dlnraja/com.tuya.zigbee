/**
 * Image management for Tuya devices
 */

const fs = require('fs');
const path = require('path');

class ImageManager {
  constructor() {
    this.imageSizes = {
      drivers: {
        small: { width: 75, height: 75 },
        large: { width: 500, height: 500 },
        xlarge: { width: 1000, height: 1000 }
      },
      app: {
        small: { width: 250, height: 175 },
        large: { width: 500, height: 350 },
        xlarge: { width: 1000, height: 700 }
      }
    };
  }
  
  /**
   * Validate image dimensions
   */
  validateImageDimensions(imagePath, type, size) {
    try {
      if (!fs.existsSync(imagePath)) {
        return { valid: false, error: 'Image file not found' };
      }
      
      const stats = fs.statSync(imagePath);
      if (stats.size === 0) {
        return { valid: false, error: 'Image file is empty' };
      }
      
      // For now, just check file exists and has content
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
  
  /**
   * Get required image sizes for driver
   */
  getDriverImageSizes() {
    return this.imageSizes.drivers;
  }
  
  /**
   * Get required image sizes for app
   */
  getAppImageSizes() {
    return this.imageSizes.app;
  }
  
  /**
   * Check if driver has all required images
   */
  checkDriverImages(driverPath) {
    const sizes = this.getDriverImageSizes();
    const results = {};
    
    for (const [size, dimensions] of Object.entries(sizes)) {
      const imagePath = path.join(driverPath, 'assets', `${size}.png`);
      const validation = this.validateImageDimensions(imagePath, 'driver', size);
      
      results[size] = {
        path: imagePath,
        required: dimensions,
        valid: validation.valid,
        error: validation.error
      };
    }
    
    return results;
  }
  
  /**
   * Generate placeholder image paths
   */
  generateImagePaths(driverPath, driverName) {
    const sizes = this.getDriverImageSizes();
    const paths = {};
    
    for (const [size] of Object.entries(sizes)) {
      paths[size] = `drivers/${driverName}/assets/${size}.png`;
    }
    
    return paths;
  }
  
  /**
   * Get image validation summary
   */
  getValidationSummary(driversPath) {
    const summary = {
      drivers: {},
      total: { valid: 0, invalid: 0, missing: 0 }
    };
    
    // Check driver images
    try {
      const drivers = fs.readdirSync(driversPath);
      
      for (const driver of drivers) {
        const driverPath = path.join(driversPath, driver);
        if (fs.statSync(driverPath).isDirectory()) {
          const driverImages = this.checkDriverImages(driverPath);
          summary.drivers[driver] = driverImages;
        }
      }
    } catch (error) {
      summary.error = error.message;
    }
    
    // Calculate totals
    for (const driverImages of Object.values(summary.drivers)) {
      for (const image of Object.values(driverImages)) {
        if (image.valid) {
          summary.total.valid++;
        } else if (image.error === 'Image file not found') {
          summary.total.missing++;
        } else {
          summary.total.invalid++;
        }
      }
    }
    
    return summary;
  }
  
  /**
   * Create image directory structure
   */
  createImageDirectories(driverPath) {
    const assetsPath = path.join(driverPath, 'assets');
    
    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
    }
    
    return assetsPath;
  }
}

module.exports = ImageManager;
