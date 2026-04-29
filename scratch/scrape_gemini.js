const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  console.log('Navigating to Gemini share link...');
  await page.goto('https://gemini.google.com/share/e0d7d83dfdb5', {
    waitUntil: 'networkidle2'
  });

  console.log('Handling cookie consent...');
  try {
    // Look for "Tout accepter" (Accept all) button in French
    const acceptButton = await page.waitForSelector('button[aria-label="Tout accepter"], button:nth-child(2)', { timeout: 5000 });
    if (acceptButton) {
      await acceptButton.click();
      console.log('Clicked Accept All button.');
      await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    }
  } catch (e) {
    console.log('No cookie consent button found or already handled.');
  }

  console.log('Waiting for content to load...');
  await new Promise(resolve => setTimeout(resolve, 8000));

  const textContent = await page.evaluate(() => {
    // Try to find the conversation container or just grab everything relevant
    return document.body.innerText;
  });

  fs.writeFileSync('gemini_dump.txt', textContent);
  console.log('Content dumped to gemini_dump.txt');

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
