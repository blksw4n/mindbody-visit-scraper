const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

module.exports = async (req, res) => {
  console.log("NODE VERSION:", process.version);
  console.log("USING puppeteer-core with sparticuz/chromium");

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  } catch (launchErr) {
    console.error("Failed to launch browser:", launchErr);
    return res.status(500).json({ success: false, error: launchErr.toString() });
  }

  try {
    const page = await browser.newPage();
    await page.goto("https://clients.mindbodyonline.com/ASP/su1.asp?studioid=247885", {
      waitUntil: "networkidle2",
    });

    await page.type('#txtUserName', process.env.MB_EMAIL);
    await page.type('#txtPassword', process.env.MB_PASSWORD);
    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);

    await page.goto("https://clients.mindbodyonline.com/ASP/my_vh.asp", {
      waitUntil: "networkidle2",
    });
    await page.waitForSelector("table");

    const visits = await page.$$eval("table tbody tr", (rows) => {
      return rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        return {
          date: cells[0]?.innerText.trim(),
          time: cells[1]?.innerText.trim(),
          teacher: cells[2]?.innerText.trim(),
          location: cells[3]?.innerText.trim(),
          classType: cells[5]?.innerText.trim(),
          status: cells[6]?.innerText.trim(),
        };
      });
    });

    await browser.close();
    res.status(200).json({ success: true, visits });
  } catch (err) {
    console.error("Scraper error:", err);
    if (browser) await browser.close();
    res.status(500).json({ success: false, error: err.toString() });
  }
};
