const fs = require('fs');
const path = require('path');

// Enhance handle-issue-comments.js with diagnostic cross-referencing logic
const commentHandlerFile = '.github/scripts/handle-issue-comments.js';
let content = fs.readFileSync(commentHandlerFile, 'utf8');

const crossRefLogic = `
function analyzeCommentForDiagnostics(comment, issueContext) {
  const hasDiagId = /[0-9a-f]{8}/i.test(comment.body);
  const mentionsRadiator = /radiator|besterm|trv|thermostat/i.test(comment.body);
  const mentionsBattery = /battery|mains|usb|power/i.test(comment.body);

  if (hasDiagId) {
    let response = \`<!-- diag-resolver-v6 -->\n### 🔍 Diagnostic Report Received\n\nThank you for providing the diagnostic ID. \n\n\`;
    let label = 'diagnostic-pending';

    if (mentionsRadiator) {
      response += \`**Note on Radiators/TRVs:** In v6.0, we introduced comprehensive Zigbee TRV and local WiFi Tuya Radiator drivers (including Besterm support). Please ensure you are on the latest test version and re-pair your device to access full features like scheduling, boost, and local control.\n\n👉 [Install Test Version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)\`;
      label = 'radiator-update-needed';
    } else if (mentionsBattery) {
      response += \`**Note on Battery/Power Issues:** Version 6.0 includes **PowerSourceIntelligence**, which dynamically detects if a device is on battery or mains. If you are seeing incorrect battery capabilities, updating to the test version and re-pairing or restarting the app should resolve this.\n\n👉 [Install Test Version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)\`;
      label = 'power-intel-update-needed';
    } else {
      response += \`The report has been logged and will be cross-referenced with your issue during the next automated triage run.\`;
    }

    return { response, label };
  }
  return null;
}
`;

// Insert the new function if it doesn't exist
if (!content.includes('analyzeCommentForDiagnostics')) {
  content = content + '\n\n' + crossRefLogic;
  fs.writeFileSync(commentHandlerFile, content);
  console.log('✅ Enhanced handle-issue-comments.js with diagnostic cross-referencing');
} else {
  console.log('Logic already exists in handle-issue-comments.js');
}
