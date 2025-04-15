const puppeteer = require("puppeteer");

module.exports = async (req, res) => {
  console.log("NODE VERSION:", process.version);
  console.log("PUPPETEER VERSION:", require("puppeteer/package.json").version);
  console.log("LAUNCHING PUPPETEER with explicit Chromium path...");

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (launchErr) {
    console.error("Failed to launch browser:", launchErr);
    return res.status(500).json({ success: false, error: launchErr.toString() });
  }

  try {
    const page = await browser.newPage();
    await page.goto("https://clients.mindbodyonline.com/ASP/login.asp", {
      waitUntil: "networkidle2",
    });

    await page.type('input[name="email"]', process.env.MB_EMAIL);
    await page.type('input[name="password"]', process.env.MB_PASSWORD);
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
