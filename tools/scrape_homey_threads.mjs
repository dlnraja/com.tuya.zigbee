import fs from 'fs';
import path from 'path';
import { NLP } from 'llmarena';

const SOURCES_PATH = 'docs/SOURCES.md';

const sources = `# Sources

## Homey Community Threads
- [App Pro Tuya Zigbee App](https://community.homey.app/t/app-pro-tuya-zigbee-app/26439)
- [App Pro Universal Tuya Zigbee Device App (Lite Version)](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352)

## GitHub Repositories
- [JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee)
- [blakadder/zigbee](https://github.com/blakadder/zigbee)
- [Zigbee2MQTT devices](https://www.zigbee2mqtt.io/devices/)

## Official Documentation
- [Tuya Developer](https://developer.tuya.com/)
- [Zigbee Alliance / CSA](https://csa-iot.org/)
`;

fs.writeFileSync(SOURCES_PATH, sources);

// Nouveau module IA
export async function analyzeForumPosts(posts) {
  const analyzer = new NLP.TextAnalyzer();
  return analyzer.extractDeviceInfo(posts);
}
