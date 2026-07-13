// check-johan-count.js
const https = require('https');
const token = process.env.GH_TOKEN;
function call(path) {
  return new Promise((resolve) => {
    https.get('https://api.github.com' + path, { headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'Mavis' } }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, body: body.substring(0, 200) }); }
      });
    });
  });
}
(async () => {
  const open = await call('/repos/JohanBendz/com.tuya.zigbee/issues?state=open&per_page=1');
  const closed = await call('/repos/JohanBendz/com.tuya.zigbee/issues?state=closed&per_page=1');
  const parseLast = (link) => {
    if (!link) return 0;
    const m = link.match(/page=(\d+)>; rel="last"/);
    return m ? parseInt(m[1], 10) : 0;
  };
  console.log('Open link:', open.headers.link);
  console.log('Open last page:', parseLast(open.headers.link));
  console.log('Closed last page:', parseLast(closed.headers.link));
  console.log('=> Open total estimate:', parseLast(open.headers.link));
  console.log('=> Closed total estimate:', parseLast(closed.headers.link));
})();
