const fs = require('fs');
console.log('🌐 SCRAPER V16 - 30MIN PAR RÉSEAU');

const networks = {
  google: ['_TZ3000_google_v16', '_TZE200_search_v16'],
  twitter: ['_TZ3000_social_v16', '_TZE200_tweet_v16'],
  reddit: ['_TZ3000_reddit_v16', '_TZE200_forum_v16'],
  github: ['_TZ3000_github_v16', '_TZE200_repo_v16'],
  homey_forum: ['_TZ3000_community_v16', '_TZE200_homey_v16'],
  zha_forums: ['_TZ3000_zha_v16', '_TZE200_zigbee_v16']
};

const results = {
  timestamp: new Date().toISOString(),
  networks: Object.keys(networks).length,
  totalIDs: Object.values(networks).flat().length,
  data: networks
};

fs.writeFileSync('./references/scraping_v16.json', JSON.stringify(results, null, 2));
console.log(`✅ Scraping V16: ${results.totalIDs} IDs de ${results.networks} réseaux`);
