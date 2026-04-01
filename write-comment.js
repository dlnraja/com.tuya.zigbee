const fs = require('fs');
const body = `<!-- copilot-analysis -->
### 🤖 Assistant AI Analysis & Fix Plan

Hi @Ssssneak,

First of all, I want to deeply apologize for this critical regression. You are absolutely right—forcing the \`_TZ3000_v4l4b0lp\` into the BSEED ZCL-only mode completely broke your device. I have removed the auto-close behavior from our bots so this issue stays open until you confirm it is perfectly fixed.

**Deep Root Cause Analysis:**
I have reviewed the entire flow:
1. The original bug ("Flow cards run, give a green checkmark, but the switch does not react") was **not** a hardware or Zigbee endpoint mapping issue. 
2. It was a core logic bug in our Flow Action cards. In the code, the action card was using \`device.setCapabilityValue(cap, true)\`, which *only updates the Homey UI* without actually sending the Zigbee command to the device! 
3. Because I misidentified the cause, I put your device in \`ZCL_ONLY_MANUFACTURERS_3G\`. Since your device is a standard Tuya router and not a pure BSEED ZCL switch, this completely skipped the standard base initialization (\`super.onNodeInit\`), leaving critical variables undefined. That's why triggering any action caused a fatal unhandled exception (crash).

**The Correct Fix (being applied right now):**
1. I am removing \`_TZ3000_v4l4b0lp\` from the BSEED array so your device will initialize normally again.
2. I am fixing ALL the Flow Action cards across the app (\`switch_1gang\` to \`switch_8gang\`) to use \`device.triggerCapabilityListener(cap, value)\`. This will correctly forward the Flow card commands to the Zigbee network.

I'm pushing this fix to v6.0.1 immediately. Once the test version is built, I'll let you know so you can re-pair and test it safely.`;

fs.writeFileSync('temp-comment-170.txt', body);
