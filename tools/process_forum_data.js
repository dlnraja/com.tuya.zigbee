const fs = require('fs');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

function processForumData(filePath) {
  const rawData = fs.readFileSync(filePath);
  const posts = JSON.parse(rawData);
  
  const processedPosts = posts.map(post => {
    const tokens = tokenizer.tokenize(post.content);
    const sentiment = natural.SentimentAnalyzer.getSentiment(tokens);
    
    return {
      ...post,
      tokens,
      sentiment
    };
  });
  
  return processedPosts;
}

const processedPosts = processForumData('analysis/forum_posts.json');
fs.writeFileSync('analysis/processed_forum_posts.json', JSON.stringify(processedPosts, null, 2));
console.log('✅ Forum posts processed and saved to analysis/processed_forum_posts.json');
