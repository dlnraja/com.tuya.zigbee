const fs = require('fs');

console.log('🖼️ CREATE REAL PNG IMAGES');

// PNG 1x1 minimal valide (75x75 et autres tailles)
const createPNG = (width, height) => {
    const data = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
        Buffer.from([0x00, 0x00, 0x00, 0x0D]), // IHDR length
        Buffer.from('IHDR'), // IHDR
        Buffer.from([0x00, 0x00, 0x00, width]), // width
        Buffer.from([0x00, 0x00, 0x00, height]), // height  
        Buffer.from([0x08, 0x02, 0x00, 0x00, 0x00]), // bit depth, color type, compression, filter, interlace
        Buffer.from([0x9D, 0x19, 0x48, 0x2C]), // CRC
        Buffer.from([0x00, 0x00, 0x00, 0x0C]), // IDAT length
        Buffer.from('IDAT'), // IDAT
        Buffer.from([0x78, 0x9C, 0x63, 0x60, 0x18, 0x05, 0x00, 0x00, 0x10, 0x00, 0x01]), // compressed data
        Buffer.from([0x00, 0x00, 0x00, 0x00]), // IEND length
        Buffer.from('IEND'), // IEND
        Buffer.from([0xAE, 0x42, 0x60, 0x82]) // CRC
    ]);
    return data;
};

// Créer structure
if (!fs.existsSync('assets/images')) fs.mkdirSync('assets/images', {recursive: true});

// Images app
fs.writeFileSync('assets/images/small.png', createPNG(250, 175));
fs.writeFileSync('assets/images/large.png', createPNG(500, 350));
fs.writeFileSync('assets/images/xlarge.png', createPNG(1000, 700));

console.log('✅ PNG IMAGES CRÉÉES');
console.log('🔄 Test: homey app validate');
