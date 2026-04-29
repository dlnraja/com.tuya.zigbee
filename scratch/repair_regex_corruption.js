const fs = require('fs');

const files = [
    'lib/utils/data/TypedDataReader.js',
    'lib/tuya/UniversalTuyaParser.js',
    'lib/quirks/QuirksDatabase.js',
    'lib/ota/TuyaXiaomiOTAProvider.js'
];

const target = ".replace(/\\safeDivide(0, g), '');";
const targetNoComma = ".replace(/\\safeDivide(0, g), '')"; // Just in case
const replacement = ".replace(/\\0/g, '');";
const replacementNoComma = ".replace(/\\0/g, '')";

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        let fixed = false;
        
        if (content.includes(target)) {
            content = content.split(target).join(replacement);
            fixed = true;
        }
        if (content.includes(targetNoComma)) {
            content = content.split(targetNoComma).join(replacementNoComma);
            fixed = true;
        }

        if (fixed) {
            fs.writeFileSync(file, content);
            console.log(`Fixed ${file}`);
        } else {
            console.log(`Target not found in ${file}`);
        }
    } catch (e) {
        console.log(`Error processing ${file}: ${e.message}`);
    }
});
