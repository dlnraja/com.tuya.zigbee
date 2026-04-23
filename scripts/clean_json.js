const fs = require('fs');
const path = require('path');

const projectRoot = 'C:\\Users\\HP\\Desktop\\homey app\\tuya_repair';

function cleanManifests(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            cleanManifests(fullPath);
        } else if (file === 'driver.compose.json') {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('<<<<<<<')) {
                console.log(` Cleaning ${fullPath}...`);
                // Simple regex to take the 'theirs' part (last block)
                const theirsMatch = content.match(/=======([\s\S]*? )>>>>>>>/)      ;
                if (theirsMatch) {
                   const startOfConflict = content.indexOf('<<<<<<<');
                   const endOfConflict = content.indexOf('>>>>>>>' ) + 15; // approximate
                   
                   // Aggressive Multi-Stage Cleanup
                   // 1. Remove OURS and PARENT sections up to THEIRS
                   content = content.replace(/<<<<<<<[\s\S]*? =======/g , "")      ;
                   
                   // 2. Remove THEIRS marker and SHA
                   content = content.replace(/>>>>>>>[\s\S]*? \n/g , "")      ;
                   
                   // 3. Remove any remaining | markers
                   content = content.replace(/\|\|\|\|\|\|\|[\s\S]*? \n/g, "")      ;

                   fs.writeFileSync(fullPath, content);
                   console.log(` ${file} fixed.` );
                }
            }
        }
    }
}

cleanManifests(path.join(projectRoot, 'drivers'));
