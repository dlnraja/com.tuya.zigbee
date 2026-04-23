const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
const fs = require('fs');

// Comprehensive documentation for intelligent automation systems
const doc = `#  Intelligent Automation Systems - v6.0

## Overview

Comprehensive AI-powered automation for issue triage, bug detection, and adaptive device support.

---

##  1. Intelligent Bug Pattern Detection

**File:** \`.github/scripts/intelligent-bug-detector.js\`

### Bug Patterns Detected

1. **Soil Sensor Connection Issues**
   - Keywords: soil_sensor, _TZE284, _TZE200, fertilizer, DP109, DP112
   - Confidence threshold: 50%
   - Auto-response: Targeted fix steps for known variants

2. **Fingerbot Capability Listeners**
   - Keywords: fingerbot, Missing Capability Listener, button.push
   - Confidence: 60%+ required
   - Fixed in: v5.12.3

3. **TS0601 Binding Failures**
   - Keywords: TS0601, create_bindings_failed, zdoInvalidEndpoint
   - Confidence: 70%+ (high reliability)
   - Fixed in: v6.0 (PR #180)

4. **Multi-Gang Flow Cards**
   - Keywords: gang, flow card, TS0002, TS0003, unlinked
   - Confidence: 50%+
   - Enhanced in: v6.0 with error recovery

5. **Driver Not Initialized**
   - Keywords: Driver Not Initialized, init error
   - Confidence: 80%+ (critical bug)
   - Fixed in: v6.0 for all multi-gang switches

### Confidence Scoring

\`\`\`javascript
confidence = keyword_matches * weight
// 50%+ = auto-respond
// 70%+ = high confidence
// 80%+ = critical issue
\`\`\`

### Usage

\`\`\`javascript
const { analyzeAndRespond } = require('./intelligent-bug-detector.js');

const result = analyzeAndRespond(issue.title, issue.body);
if (result.shouldRespond) {
  // Post automated response
  console.log(\`Pattern: \${result.pattern}\`);
  console.log(\`Confidence: \${result.confidence}%\`);
}
\`\`\`

---

##  2. Adaptive DP Detection System

**File:** \`.github/scripts/adaptive-dp-detector.js\`

### DP Variant Patterns

Based on analysis of 40 most common DPs across 139 drivers:

#### DP3 - 4 Variants
- **min_brightness** (divisor: 1) - (dimmer / bulb) drivers
- **measure_temperature** (divisor: 10) - (climate / thermostat)
- **battery_low** (divisor: 1) - sensor drivers  
- **consumption** (divisor: 1000) - (plug / power) drivers

#### DP6 - 6 Variants
- **scene_data** (divisor: 1, dataType: 3) - (button / scene)
- **battery_voltage** (divisor: 1000) - sensors
- **border** (divisor: 1) - dimmers
- **countdown** (divisor: 1) - (switches / plugs)
- **display_brightness** (divisor: 1, dataType: 4) - thermostats
- **work_state** (divisor: 1, dataType: 4) - covers

#### DP9 - 6 Variants
- **power_on_state** (dataType: 4) - (switches / plugs)
- **countdown** (divisor: 1) - switches
- **eco_temp** (divisor: 10) - thermostats
- **temperature_unit** (dataType: 4) - (climate / sensors)
- **flow_rate** (divisor: 1) - valves
- **eco_mode** (dataType: 1) - radiators

#### DP101 - 5 Variants
- **child_lock** (dataType: 1) - (switches / thermostats)
- **backlight_mode** (dataType: 4) - switches
- **humidity** (divisor: 10) - climate sensors
- **air_humidity** (divisor: 1) - soil sensors
- **unknown_101** (fallback)

### Detection Logic

\`\`\`javascript
const { detectDPUsage } = require('./adaptive-dp-detector.js');

const usage = detectDPUsage(dp, value, dataType, manufacturerName, driverType);
console.log(\`DP\${dp}  \${usage.capability} (divisor: \${usage.divisor})\`);
\`\`\`

**Detection factors:**
1. Driver type pattern matching
2. Data type validation
3. Value range checking
4. Manufacturer-specific rules

---

##  3. DP Learning System

**File:** \`.github/scripts/dp-learning-system.js\`

### Purpose
Auto-learns DP patterns from diagnostic reports and user feedback.

### How It Works

1. **Observation Collection**
   - Records DP, value, dataType, manufacturer, driver, capability
   - Timestamps each observation

2. **Pattern Clustering**
   - Groups by: \`\${dp}_\${dataType}_\${driverType}\`
   - Tracks frequency of capability assignments

3. **Confidence Calculation**
   - confidence = ((most_common_count / total_observations))
   - Threshold: 80% for auto-prediction

4. **Auto-Prediction**
   \`\`\`javascript
   const learner = new DPLearningSystem();
   const prediction = learner.predictCapability(dp, dataType, driverType);
   if (prediction.confidence > 0.8) {
     // Use predicted capability
   }
   \`\`\`

### Data Storage
- **File:** \`data/dp-learned-patterns.json\`
- Updates automatically from GitHub Actions workflows
- Syncs across issues, PRs, diagnostic reports

---

##  4. Intelligent Comment Handler

**File:** \`.github/scripts/handle-issue-comments.js\`

### Auto-Actions

1. **Diagnostics Provided**
   - Detects: "diagnostic", "report", "screenshot"
   - Labels: \`diagnostics-provided\`
   - Response: Thank you message

2. **Issue Confirmed Fixed**
   - Detects: "fixed", "working", "solved"
   - Labels: \`verified-fixed\`
   - Action: Auto-close with completion state

3. **Issue Still Broken**
   - Detects: "still" + "not working" / "broken" / "fail"
   - Labels: \`needs-investigation\`, \`high-priority\`
   - Response: Escalation message with diagnostic request

### Usage in Workflow

\`\`\`yaml
on:
  issue_comment:
    types: [created]

jobs:
  handle-comment:
    runs-on: ubuntu-latest
    steps:
      - run: node .github/scripts/handle-issue-comments.js
\`\`\`

---

##  5. Auto-Respond Integration

**File:** \`.github/scripts/auto-respond-intelligent.js\`

### Functions

1. **processIssue(context)**
   - Analyzes (new / reopened) issues
   - Posts intelligent response if confidence  50%
   - Adds labels: \`auto-responded\`, \`awaiting-verification\`

2. **processPullRequest(context)**
   - Detects bug fix PRs (confidence  60%)
   - Comments with related bug pattern context
   - Thanks contributor

### Integration Points

- \`triage-run.js\` - imports \`analyzeAndRespond\`
- \`triage-upstream-enhanced.js\` - imports \`analyzeAndRespond\`
- \`intelligent-auto-respond.yml\` - standalone workflow

---

##  6. Workflow: Intelligent Auto-Respond

**File:** \`.github/workflows/intelligent-auto-respond.yml\`

### Triggers
- \`issues: [opened, reopened]\`
- \`issue_comment: [created]\`

### Process
1. Checkout repository
2. Setup Node.js 22
3. Run intelligent detection
4. Auto-respond if pattern matched

### Timeout
- 5 minutes (prevents infinite loops)

---

##  Usage Examples

### Example 1: User Reports Soil Sensor Issue

**Issue Title:** "Soil sensor _TZE284_oitavov2 won't pair"

**Auto-Detection:**
- Pattern: \`soil_sensor_connection\`
- Confidence: 75%
- Action: Post fix steps for _TZE284 variant

**Response includes:**
- Version requirement (v5.11.136+)
- Reset instructions
- Pairing distance requirements
- Diagnostic request template

### Example 2: User Confirms Fix

**Comment:** "Updated to latest version and it's working now, thanks!"

**Auto-Detection:**
- Keywords: "working", "thanks"
- Action: Auto-close issue with \`verified-fixed\` label

### Example 3: New DP Variant Observed

**Diagnostic Report:** DP3 = 235, dataType = 2, driver = climate_sensor

**DP Learning System:**
1. Observes: DP3, value 235, type 2, driver climate_sensor
2. Predicts: measure_temperature, divisor 10 (23.5Â°C)
3. Updates pattern database
4. Confidence: 95% (based on 20+ observations)

---

##  Deployment Checklist

- [x] Bug pattern database created
- [x] Intelligent detection integrated into triage scripts
- [x] Auto-respond workflow created
- [x] Adaptive DP detection system implemented
- [x] DP learning system with persistence
- [x] Comment handler for user feedback
- [x] Documentation complete

---

##  Metrics & Monitoring

### Success Metrics
- **Auto-response accuracy**: Target 90%+
- **False positive rate**: Target <5%
- **User satisfaction**: Measured by \`verified-fixed\` labels
- **Pattern learning**: New variants detected per month

### Monitoring
- Check \`data/dp-learned-patterns.json\` for new patterns
- Review \`auto-responded\` issues for accuracy
- Track \`needs-investigation\` escalations

---

##  Continuous Improvement

1. **Monthly Review**
   - Analyze false positives
   - Update confidence thresholds
   - Add new bug patterns

2. **DP Database Updates**
   - Sync learned patterns to main codebase
   - Update UniversalVariantManager with high-confidence predictions
   - Document manufacturer-specific quirks

3. **Workflow Optimization**
   - Monitor timeout occurrences
   - Reduce API calls where possible
   - Improve pattern matching algorithms

---

**Last Updated:** March 29, 2026 (v6.0)
**Maintainer:** @dlnraja
`;

fs.writeFileSync('docs/INTELLIGENT_AUTOMATION.md', doc);
console.log(' Created comprehensive automation documentation');
