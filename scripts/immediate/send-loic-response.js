#!/usr/bin/env node

/**
 * SEND LOÏC RESPONSE
 * Prepare email response for Loïc about BSEED issue
 */

const fs = require('fs');
const path = require('path');

console.log('\n📧 LOÏC RESPONSE PREPARATION\n');
console.log('═'.repeat(70));

const responseDoc = path.join(__dirname, '..', '..', 'docs', 'support', 'EMAIL_RESPONSE_LOIC.md');
const outputFile = path.join(__dirname, '..', '..', 'reports', 'LOIC_EMAIL_READY.txt');

// Read template
const template = fs.readFileSync(responseDoc, 'utf8');

// Extract email content
const emailMatch = template.match(/```\nDe: Dylan.*?\n```/s);

if (!emailMatch) {
    console.log('❌ Could not extract email template');
    process.exit(1);
}

const emailContent = emailMatch[0].replace(/```\n/g, '').replace(/```/g, '');

// Create ready-to-send email
const readyEmail = `
TO: loic.salmona@gmail.com
FROM: dylan.rajasekaram@gmail.com
SUBJECT: Re: [Zigbee 2-gang tactile device] - Solution disponible! ✅

${emailContent}

═══════════════════════════════════════════════════════════════════

📋 ACTION REQUIRED:

1. Copy email content above
2. Send to: loic.salmona@gmail.com
3. Or call: 0695501021

═══════════════════════════════════════════════════════════════════

📎 ATTACHMENTS TO MENTION:

- Documentation: docs/support/BSEED_2GANG_ISSUE_RESPONSE.md
- GitHub Link: https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/support/BSEED_2GANG_ISSUE_RESPONSE.md

═══════════════════════════════════════════════════════════════════

✅ EMAIL READY TO SEND!

Date: ${new Date().toLocaleString()}
`;

// Save to file
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFile, readyEmail);

console.log('\n✅ Email prepared and saved!\n');
console.log(`📄 File: ${outputFile}\n`);
console.log('📧 NEXT STEPS:\n');
console.log('   1. Open file: reports/LOIC_EMAIL_READY.txt');
console.log('   2. Copy email content');
console.log('   3. Send to: loic.salmona@gmail.com');
console.log('   4. Or call: 0695501021\n');
console.log('✅ READY TO CONTACT LOÏC!\n');

process.exit(0);
