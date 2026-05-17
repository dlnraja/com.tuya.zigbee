const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGE_DIR = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\assets\\images';

async function resizeImages() {
    const images = [
        { name: 'small.png', width: 250, height: 175 },
        { name: 'large.png', width: 500, height: 350 },
        { name: 'xlarge.png', width: 1000, height: 700 }
    ];

    for (const img of images) {
        const filePath = path.join(IMAGE_DIR, img.name);
        const tmpPath = path.join(IMAGE_DIR, `tmp_${img.name}`);
        if (fs.existsSync(filePath)) {
            console.log(`Resizing ${img.name} to ${img.width}x${img.height}...`);
            await sharp(filePath)
                .resize(img.width, img.height, { fit: 'cover' })
                .png({ compressionLevel: 9, quality: 80 })
                .toFile(tmpPath);
            
            fs.unlinkSync(filePath);
            fs.renameSync(tmpPath, filePath);
            console.log(`Successfully resized ${img.name}.`);
        } else {
            console.warn(`File not found: ${filePath}`);
        }
    }
}

resizeImages().catch(err => {
    console.error('Error resizing images:', err);
    process.exit(1);
});
