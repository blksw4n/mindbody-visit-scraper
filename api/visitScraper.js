const { download } = require('@puppeteer/browsers');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromiumPath = '/tmp/chromium/chrome-linux/chrome';

module.exports = async (req, res) => {
  try {
    // Download Chromium if not already present
    if (!fs.existsSync(chromiumPath)) {
      console.log('Downloading Chromium...');
      await download({
        browser: 'chrome',
        platform: 'linux',
        buildId: '121.0.6167.85', // exact version Vercel logs expected
        cacheDir: '/tmp',
      });
    }

    const browser = await puppeteer.launch({
      executablePath: chromiumPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new',
    });

    const page = await browser.newPage();

    // MindBody login and scraping
    await page.goto('https://clients.mindbodyonline.com/ASP/login.asp', { waitUntil: 'networkidle2' });

    await page.type('input[name="email"]', process.env.MB_EMAIL);
    await page.type('input[name="password"]', process.env.MB_PASSWORD);
    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    await page.goto('https://clients.mindbodyonline.com/ASP/my_vh.asp', { waitUntil: 'networkidle2' });
    await page.waitForSelector('table');

    const visits = await page.$$eval('table tbody tr', (rows) =>
      rows.map((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        return {
          date: cells[0]?.innerText.trim(),
          time: cells[1]?.innerText.trim(),
          teacher: cells[2]?.innerText.trim(),
          location: cells[3]?.innerText.trim(),
          classType: cells[5]?.innerText.trim(),
          status: cells[6]?.innerText.trim(),
        };
      })
    );

    await browser.close();
    res.status(200).json({ success: true, visits });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.toString() });
  }
};
