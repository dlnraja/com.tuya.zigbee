/**
 * Issue & PR Auto-Responder (Enhanced)
 * 
 * Analyzes fingerprints and provides casul triage for Tuya devices.
 */
module.exports = async ({ github, context }) => {
    const fs = require('fs');
    const path = require('path');
    const APP = 'https://homey.app/a/com.dlnraja.tuya.zigbee/test/';
    const FORUM = 'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352';
    const DEV = 'https://tools.developer.homey.app';
    const TAG = '<!-- tuya-triage-bot -->';

    // Load all fingerprints + productIds
    const fps = new Set();
    const driverMap = new Map();
    const driversDir = path.join(process.env.GITHUB_WORKSPACE, 'drivers');
    
    if (!fs.existsSync(driversDir)) {
        console.log('drivers directory not found');
        return;
    }

    const driverFiles = fs.readdirSync(driversDir);
    for (const d of driverFiles) {
        const cf = path.join(driversDir, d, 'driver.compose.json');
        if (!fs.existsSync(cf)) continue;
        try {
            const j = JSON.parse(fs.readFileSync(cf, 'utf8'));
            for (const m of (j.zigbee?.manufacturerName || [])) {
                fps.add(m);
                if (!driverMap.has(m)) driverMap.set(m, []);
                driverMap.get(m).push(d);
            }
            for (const p of (j.zigbee?.productId || [])) fps.add(p);
        } catch {}
    }

    // Extract fingerprints from issue/PR
    const item = context.payload.issue || context.payload.pull_request;
    const body = item?.body || '';
    const title = item?.title || '';
    const text = title + ' ' + body;
    const num = item?.number;
    const action = context.payload.action;

    // Match Tuya-style FPs + TS productIds
    const mfrs = [...new Set(text.match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g) || [])];
    const pids = [...new Set(text.match(/\bTS\d{4}[A-Z]?\b/g) || [])];
    const nonTuya = [...new Set((text.match(/\b[A-Z][A-Z0-9]{5,15}\b/g) || []).filter(m => fps.has(m)))];
    const allMfrs = [...new Set([...mfrs, ...nonTuya])];

    // Detect specialized requests
    const isWiFi = /wifi|wi-fi|smart\s*life|tuya\s*cloud|local\s*key|lidl\s*home|meross|avatto|silvercrest|nedis|local\s*control/i.test(text);
    const isSensorGap = /fertilizer|conductivity|\bEC\b|measure_ec|soil.*fertil|missing.*reading|missing.*capability|new.*capability|add.*sensor/i.test(text);
    const isDelayIssue = /after\s+\d+\s*min|few\s+minutes?\s+later|takes?\s+\d+\s*min|delay|not\s+report|no\s+data|works?\s+after|doesn.t\s+report\s+immediately/i.test(text);
    const isClimate = /climate|temperature|humidity|temp|hum|pressure|calibration|offset|wrong\s+reading|not\s+accurate/i.test(text);
    
    if (!allMfrs.length && !pids.length) {
        console.log('No fingerprints found — skipping');
        return;
    }

    // ANTI-SPAM: Check existing bot comment
    const comments = await github.rest.issues.listComments({
        owner: context.repo.owner, repo: context.repo.repo,
        issue_number: num, per_page: 50
    });
    const existingBot = comments.data.find(c => c.body?.includes(TAG));
    
    if (existingBot && action !== 'opened') {
        const prevFPs = (existingBot.body.match(/`(_T[^`]+)`/g) || []).map(m => m.replace(/`/g, ''));
        const currentFPs = [...allMfrs];
        if (currentFPs.every(f => prevFPs.includes(f)) && !text.includes('!!FORCE_RESCAN!!')) {
            console.log('No new FPs since last bot comment — skipping');
            return;
        }
    }

    const found = allMfrs.filter(m => fps.has(m));
    const missing = allMfrs.filter(m => !fps.has(m));
    const appJsonPath = path.join(process.env.GITHUB_WORKSPACE, 'app.json');
    const version = fs.existsSync(appJsonPath) ? JSON.parse(fs.readFileSync(appJsonPath, 'utf8')).version : '?';
    const allSupported = allMfrs.length > 0 && missing.length === 0;

    // Build response
    let msg = TAG + '\n';
    msg += `Hey! I've peeked into the fingerprints shared here. Here's what I found:\n\n`;

    if (found.length) {
        const lines = found.map(m => {
            const drivers = driverMap.get(m) || ['unknown'];
            return `- \`${m}\` → **${drivers.join('**, **')}**`;
        }).join('\n');
        msg += `### ✅ Driver Status\nAlready supported in v${version}:\n\n${lines}\n\n`;
    }

    if (missing.length) {
        msg += `### 🚧 Driver Enrichment\nNot supported yet: \`${missing.join('\`, \`')}\`\n`;
        msg += `I've added these to the internal research queue for the next release. If you can share a [Developer Tools interview](${DEV}), especially the **External State** and **Endpoints** tabs, that helps me map the data points correctly.\n\n`;
    }

    if (isClimate && allSupported) {
        msg += `**Tip:** For climate sensors, remember you can adjust the **Temperature/Humidity Offset** in Device Settings if the readings are slightly off.\n\n`;
    }

    if (allSupported) {
        msg += `🚀 **Testing:** Install the [test version](${APP}), **remove and re-pair** the device. If it still shows as unknown, send me a diagnostic report ID.\n\n`;
    }

    if (isWiFi) {
        msg += `*Side note:* This app also supports Tuya WiFi models with local LAN control - check the [forum](${FORUM}) for details.\n\n`;
    }

    msg += `---\n[Test version](${APP}) · [Forum thread](${FORUM}) · [Developer Tools](${DEV})`;

    // Post/Update
    if (existingBot && action !== 'opened') {
        await github.rest.issues.updateComment({
            owner: context.repo.owner, repo: context.repo.repo,
            comment_id: existingBot.id, body: msg
        });
    } else if (!existingBot) {
        await github.rest.issues.createComment({
            owner: context.repo.owner, repo: context.repo.repo,
            issue_number: num, body: msg
        });
    }

    // Labels
    const labels = [];
    if (missing.length) labels.push('new-device');
    if (isClimate) labels.push('climate');
    if (labels.length) {
        await github.rest.issues.addLabels({
            owner: context.repo.owner, repo: context.repo.repo,
            issue_number: num, labels
        });
    }
};
