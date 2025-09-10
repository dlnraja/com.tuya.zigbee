# Import Issues Report
Generated: 2025-09-09T19:16:48.414Z
Total Issues: 18
Files Affected: 18

## Issues by Type
- incorrect_cluster_import: 16 issues
- legacy_import: 2 issues

## Detailed Issues
### drivers\climate\thermostat\TS0601\device.js:2
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { CLUSTER } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\common\BaseDevice.js:4
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { CLUSTER } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\common\BaseZigbeeDevice.js:2
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { CLUSTER } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\lights\bulb\TS0501A\device.js:2
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { CLUSTER } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\security\lock\TY0203\device.js:2
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { CLUSTER } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\sensors\air_quality\TS0205\device.js:2
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { CLUSTER } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\sensors\temperature\TS0201\device.js:4
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { CLUSTER } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\sensors\tuya_water_leak\driver.js:2
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { Cluster } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\sensors\water_leak\TS0207\device.js:4
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { CLUSTER } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\sensors-TS0601_motion\device.js:2
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { CLUSTER } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\switches\simple_switch\TS0011\device.js:2
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { CLUSTER } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\templates\BaseZigbeeDevice.js:4
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { Cluster, CLUSTER } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\tuya_thermostat\device.js:2
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { debug } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\tuya_water_sensor\device.js:2
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { debug } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\zigbee-tuya-universal\device.js:1
**Type:** legacy_import
**Message:** Using legacy homey-meshdriver, should be updated to homey-zigbeedriver
**Code:** `const { ZigBeeDevice } = require('homey-meshdriver');`
**Suggested Fix:** `const { ZigbeeDevice } = require("homey-zigbeedriver");`

### drivers\_base\TuyaBaseDevice.js:2
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { CLUSTER } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`

### drivers\_template\device.js:1
**Type:** legacy_import
**Message:** Using legacy homey-meshdriver, should be updated to homey-zigbeedriver
**Code:** `const { ZigBeeDevice } = require('homey-meshdriver');`
**Suggested Fix:** `const { ZigbeeDevice } = require("homey-zigbeedriver");`

### drivers\_template\standard_driver.js:2
**Type:** incorrect_cluster_import
**Message:** Incorrect zigbee-clusters import, should use destructured imports
**Code:** `const { Cluster } = require('zigbee-clusters');`
**Suggested Fix:** `const { Cluster, CLUSTER } = require("zigbee-clusters");`
