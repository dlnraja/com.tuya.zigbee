const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrapeForum(url) {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  
  const posts = [];
  
  $('.forum-post').each((index, element) => {
    const title = $(element).find('.post-title').text().trim();
    const content = $(element).find('.post-content').text().trim();
    const author = $(element).find('.post-author').text().trim();
    const date = $(element).find('.post-date').text().trim();
    
    posts.push({ title, content, author, date });
  });
  
  return posts;
}

const forumUrl = 'https://community.homey.app/t/app-pro-tuya-zigbee-app/26439';
scrapeForum(forumUrl).then(posts => {
  fs.writeFileSync('analysis/forum_posts.json', JSON.stringify(posts, null, 2));
  console.log(`✅ Forum posts scraped and saved to analysis/forum_posts.json (${posts.length} posts)`);
}).catch(error => {
  console.error('❌ Error scraping forum:', error.message);
});
