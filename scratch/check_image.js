const fs = require('fs');
const path = require('path');
const { imageSize } = require('image-size');

const imgPath = path.join('drivers', 'radiator_valve_zigbee', 'assets', 'images', 'large.png');
try {
  const dimensions = imageSize(imgPath);
  console.log(`Dimensions for ${imgPath}: ${dimensions.width}x${dimensions.height}`);
} catch (err) {
  console.error(`Error reading ${imgPath}:`, err.message);
}
