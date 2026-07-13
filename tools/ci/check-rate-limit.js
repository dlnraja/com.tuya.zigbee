// check-rate-limit.js
const https = require('https');
const token = process.env.GH_TOKEN;
https.get('https://api.github.com/rate_limit', {
  headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'Mavis', 'Accept': 'application/vnd.github+json' }
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    try {
      const j = JSON.parse(body);
      console.log('core:    ' + j.resources.core.remaining + '/' + j.resources.core.limit);
      console.log('search:  ' + j.resources.search.remaining + '/' + j.resources.search.limit);
      console.log('graphql: ' + (j.resources.graphql ? j.resources.graphql.remaining + '/' + j.resources.graphql.limit : 'N/A'));
    } catch (e) { console.log('Parse error'); }
  });
});
