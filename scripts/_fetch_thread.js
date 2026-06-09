const https = require('https');
const threadId = process.argv[2] || '26439';

https.get('https://community.homey.app/t/' + threadId + '.json', { headers: { Accept: 'application/json' } }, (res) => {
  let d = '';
  res.on('data', (c) => { d += c; });
  res.on('end', () => {
    const j = JSON.parse(d);
    const s = j.post_stream?.stream || [];
    console.log('Thread:', j.title);
    console.log('Total posts:', s.length);
    console.log('Last 5 IDs:', s.slice(-5));

    const ids = s.slice(-5).join(',');
    https.get('https://community.homey.app/posts.json?ids=' + ids, { headers: { Accept: 'application/json' } }, (r2) => {
      let d2 = '';
      r2.on('data', (c) => { d2 += c; });
      r2.on('end', () => {
        const j2 = JSON.parse(d2);
        (j2.post_stream?.posts || []).forEach(p => {
          console.log('\n=== Post #' + p.post_number + ' ===');
          console.log('Author:', p.username);
          console.log('Date:', p.created_at?.slice(0, 16));
          const t = p.cooked?.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
          console.log('Text:', t?.slice(0, 1200));
        });
      });
    });
  });
});
