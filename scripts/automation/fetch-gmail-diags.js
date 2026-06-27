const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const fs = require('fs');
const path = require('path');
const privacy = require('../../.github/scripts/privacy-redactor');

const config = {
    imap: {
        user: process.env.GMAIL_EMAIL,
        password: process.env.GMAIL_APP_PASSWORD,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 10000,
        // GitHub-hosted runners MITM TLS (corporate/self-signed CA in the
        // runner image), causing DEPTH_ZERO_SELF_SIGNED_CERT against
        // imap.gmail.com. Real Gmail certs are valid; the runner network
        // is the issue. Allow self-signed only under CI where we trust
        // the runner's network egress.
        tlsOptions: { rejectUnauthorized: process.env.CI ? false : true }
    }
};

const outputFilePath = path.join(__dirname, '../../.github/state/diagnostics-report.json');

async function main() {
    if (!config.imap.user || !config.imap.password) {
        console.error('Error: GMAIL_EMAIL or GMAIL_APP_PASSWORD environment variable is missing.');
        process.exit(1);
    }

    let connection;
    try {
        console.log(`Connecting to IMAP for ${privacy.alias('account', config.imap.user)}...`);
        connection = await imaps.connect(config);
        
        await connection.openBox('INBOX');

        // Search for emails containing Homey diagnostics, from the last 7 days
        const searchCriteria = [
            'UNSEEN',
            ['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()],
            ['SUBJECT', 'Homey Diagnostics'] // Or whatever subject Homey sends
        ];

        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],
            markSeen: false
        };

        console.log('Searching for recent diagnostic emails...');
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length === 0) {
            console.log('No new diagnostic emails found.');
            connection.end();
            return;
        }

        console.log(`Found ${messages.length} new diagnostic emails. Processing...`);
        
        let existingReports = [];
        if (fs.existsSync(outputFilePath)) {
            try {
                const existing = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
                existingReports = Array.isArray(existing) ? existing : (existing.diagnostics || []);
            } catch (e) {
                console.log('Could not parse existing reports, starting fresh.');
            }
        }
        if (!Array.isArray(existingReports)) existingReports = [];

        for (const msg of messages) {
            const allParts = msg.parts.find(part => part.which === '');
            if (allParts) {
                const id = msg.attributes.uid;
                const safeUid = privacy.digest(String(id), 12);
                const idHeader = "Imap-Id: " + id + "\r\n";
                const mail = await simpleParser(idHeader + allParts.body);

                // Attempt to extract JSON from the text
                const text = mail.text || '';
                
                // Typical extraction logic (customize based on actual Homey email format)
                // Looks for JSON blocks
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                
                if (jsonMatch) {
                    try {
                        const parsedData = JSON.parse(jsonMatch[0]);
                        existingReports.push(privacy.redactObject({
                            id: `legacy_imap_${safeUid}`,
                            date: mail.date,
                            subject: privacy.redact(mail.subject || ''),
                            payload: parsedData
                        }));
                        console.log(`Successfully parsed report from email ${safeUid}`);
                    } catch (e) {
                        console.log(`Failed to parse JSON in email ${safeUid}: ${privacy.redact(e.message)}`);
                    }
                } else {
                    console.log(`No JSON block found in email ${safeUid}`);
                }
            }
        }

        fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
        const report = privacy.redactObject({
            timestamp: new Date().toISOString(),
            source: 'legacy-imap',
            count: existingReports.length,
            diagnostics: existingReports.slice(-500)
        });
        privacy.assertNoLeaks(report, outputFilePath);
        fs.writeFileSync(outputFilePath, JSON.stringify(report, null, 2));
        console.log(`Saved ${messages.length} reports to ${outputFilePath}`);

        connection.end();
    } catch (err) {
        console.error('Error fetching emails:', err);
        if (connection) connection.end();
        process.exit(1);
    }
}

main();
