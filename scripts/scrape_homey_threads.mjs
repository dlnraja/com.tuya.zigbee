import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { NLP, Vision } from 'llmarena';

const SOURCES_PATH = 'docs/SOURCES.md';
const ANALYSIS_REPORT_PATH = 'analysis/forum_analysis.json';

// URLs des threads Homey
const THREAD_URLS = [
  'https://community.homey.app/t/app-pro-tuya-zigbee-app/26439',
  'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352'
];

async function fetchForumPosts(threadUrl) {
  // Exemple: Récupération des posts via API (à adapter avec la vraie API)
  const response = await axios.get(`${threadUrl}.json`);
  return response.data.posts;
}

export async function analyzeForumPosts(posts) {
  const analyzer = new NLP.TextAnalyzer();
  const results = [];
  for (const post of posts) {
    const analysis = await analyzer.analyze({
      text: post.content,
      features: ['entities', 'sentiment', 'device_info']
    });
    results.push({
      ...post,
      analysis
    });
  }
  return results;
}

export async function analyzeImages(imageUrls) {
  const vision = new Vision.ImageAnalyzer();
  const results = [];
  for (const url of imageUrls) {
    const analysis = await vision.analyze({
      imageUrl: url,
      features: ['objects', 'text']
    });
    results.push(analysis);
  }
  return results;
}

async function main() {
  // Créer le répertoire d'analyse si nécessaire
  if (!fs.existsSync(path.dirname(ANALYSIS_REPORT_PATH))) {
    fs.mkdirSync(path.dirname(ANALYSIS_REPORT_PATH), { recursive: true });
  }

  let allPosts = [];
  for (const url of THREAD_URLS) {
    const posts = await fetchForumPosts(url);
    allPosts = [...allPosts, ...posts];
  }

  // Analyse NLP
  const analyzedPosts = await analyzeForumPosts(allPosts);
  
  // Récupérer les URLs d'images des posts
  const imageUrls = [];
  analyzedPosts.forEach(post => {
    const matches = post.content.match(/\!\[.*?\]\((.*?)\)/g) || [];
    matches.forEach(match => {
      const url = match.match(/\!\[.*?\]\((.*?)\)/)[1];
      if (url) imageUrls.push(url);
    });
  });
  
  // Analyse d'images
  const analyzedImages = await analyzeImages(imageUrls);
  
  // Générer le rapport
  const report = {
    posts: analyzedPosts,
    images: analyzedImages
  };
  
  fs.writeFileSync(ANALYSIS_REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`Rapport d'analyse généré: ${ANALYSIS_REPORT_PATH}`);
}

main().catch(console.error);
