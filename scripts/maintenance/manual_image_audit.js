const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function auditImages() {
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );

  let report = "# Detailed Image Audit Report\n\n";
  report += "| Driver | Role | Size | Status |\n";
  report += "|---|---|---|---|\n";

  for (const driver of drivers) {
    const assetsDir = path.join(DRIVERS_DIR, driver, 'assets', 'images');
    if (!fs.existsSync(assetsDir)) continue;

    const images = ['small.png', 'large.png', 'xlarge.png'];
    for (const imgName of images) {
        const imgPath = path.join(assetsDir, imgName);
        if (fs.existsSync(imgPath)) {
            try {
                const metadata = await sharp(imgPath).metadata();
                const size = `${metadata.width}x${metadata.height}`;
                
                let status = "✅ OK";
                if (imgName === 'small.png' && (metadata.width !== 75 || metadata.height !== 75)) status = "❌ WRONG SIZE (75x75 required)";
                if (imgName === 'large.png' && (metadata.width !== 500 || metadata.height !== 500)) status = "❌ WRONG SIZE (500x500 required)";
                // xlarge is usually 1000x1000 but less strict

                report += `| ${driver} | ${imgName} | ${size} | ${status} |\n`;
            } catch (e) {
                report += `| ${driver} | ${imgName} | ERROR | ❌ CORRUPT OR MISSING |\n`;
            }
        }
    }
  }

  fs.writeFileSync('IMAGE_AUDIT_REPORT.md', report);
  console.log('✅ Audit complete. Saved to IMAGE_AUDIT_REPORT.md');
}

auditImages();
