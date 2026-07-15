// Quick tool to fetch a forum post by number
const https = require('https');
const postNum = process.argv[2] || '2050';
const topicId = process.argv[3] || '140352';

const url = `https://community.homey.app/raw/${topicId}.json`;
const headers = { 'User-Agent': 'Mozilla/5.0 (Homey App) Tuya-Zigbee/9.0' };

https.get(url, { headers }, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const lines = data.split('\n');
    let inPost = false;
    let buf = [];
    for (const line of lines) {
      const m = line.match(/^[\w.-]+ \| [\d\- :UTC]+ \| #(\d+)/);
      if (m) {
        if (m[1] === postNum && buf.length === 0) {
          inPost = true;
          buf.push(line);
        } else if (inPost) {
          break;
        }
      } else if (inPost) {
        buf.push(line);
      }
    }
    if (buf.length) {
      console.log(buf.join('\n').slice(0, 5000));
    } else {
      console.log('Post ' + postNum + ' not found');
    }
  });
});
