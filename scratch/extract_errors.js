const fs = require('fs');
try {
    const content = fs.readFileSync('final_validation_report.txt', 'utf16le');
    const matches = content.match(/Ã— .*/g);
    if (matches) {
        matches.forEach(m => console.log(m));
    } else {
        console.log('No error messages starting with Ã— found (UTF-16LE).');
        // Try UTF-8 as fallback
        const contentUtf8 = fs.readFileSync('final_validation_report.txt', 'utf8');
        const matchesUtf8 = contentUtf8.match(/Ã— .*/g);
        if (matchesUtf8) {
             matchesUtf8.forEach(m => console.log(m));
        } else {
             console.log('No error messages found in either encoding.');
        }
    }
} catch (e) {
    console.log('Error reading file:', e.message);
}
