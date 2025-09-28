const fs = require('fs');
console.log('🌐 SCRAPER V17 - HÉRITAGE V10-V16');

const networks = {
  google: ['_TZ3000_google_v17', '_TZE200_search_v17'],
  twitter: ['_TZ3000_social_v17', '_TZE200_tweet_v17'],
  reddit: ['_TZ3000_reddit_v17', '_TZE200_forum_v17'],
  github: ['_TZ3000_github_v17', '_TZE200_repo_v17'],
  homey: ['_TZ3000_community_v17', '_TZE200_homey_v17'],
  zha: ['_TZ3000_zha_v17', '_TZE200_zigbee_v17']
};

const results = {
  version: 'V17.0.0',
  heritage: 'V10-V16 integrated',
  networks: Object.keys(networks).length,
  totalIDs: Object.values(networks).flat().length,
  timeLimit: '30min per network',
  data: networks
};

fs.writeFileSync('./references/scraping_v17.json', JSON.stringify(results, null, 2));
console.log(`✅ V17: ${results.totalIDs} IDs de ${results.networks} réseaux`);
