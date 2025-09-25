const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../analysis/homey_threads');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function scrapeThread(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Extraire le titre et les messages
  const threadData = await page.evaluate(() => {
    const title = document.querySelector('.p-title-value').innerText;
    const posts = [];
    
    document.querySelectorAll('.message--post').forEach(post => {
      const author = post.querySelector('.message-name').innerText;
      const date = post.querySelector('.message-date').innerText;
      const content = post.querySelector('.message-content').innerText;
      
      posts.push({ author, date, content });
    });
    
    return { title, posts };
  });
  
  await browser.close();
  
  // Sauvegarder les données
  const filename = `${threadData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
  const filePath = path.join(outputDir, filename);
  
  fs.writeFileSync(filePath, JSON.stringify(threadData, null, 2));
  console.log(`Thread sauvegardé: ${filename}`);
}

// Liste des URLs de threads Homey sur Tuya
const threadUrls = [
  'https://community.homey.app/t/tuya-zigbee-devices/12345',
  // Ajouter d'autres URLs ici
];

(async () => {
  for (const url of threadUrls) {
    console.log(`Scraping ${url}...`);
    await scrapeThread(url);
    
    // Attendre entre 5 et 10 secondes
    await new Promise(resolve => 
      setTimeout(resolve, 5000 + Math.random() * 5000)
    );
  }
})();
