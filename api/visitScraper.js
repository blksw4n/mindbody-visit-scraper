const download = require("@puppeteer/browsers");
const { launch } = require("puppeteer-core");

module.exports = async (req, res) => {
  try {
    const revision = "121.0.6167.85";
    const browserFetcherOptions = {
      cacheDir: ".chrome-cache",
      platform: process.platform === "darwin" ? "mac-arm64" : "linux",
      buildId: revision,
      product: "chrome",
    };

    const result = await download(browserFetcherOptions);
    const executablePath = result.executablePath;

    const browser = await launch({
      executablePath,
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://clients.mindbodyonline.com/ASP/login.asp", { waitUntil: "networkidle2" });

    await page.type('input[name="email"]', process.env.MB_EMAIL);
    await page.type('input[name="password"]', process.env.MB_PASSWORD);
    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    await page.goto("https://clients.mindbodyonline.com/ASP/my_vh.asp", { waitUntil: "networkidle2" });
    await page.waitForSelector("table");

    const visits = await page.$$eval("table tbody tr", rows => {
      return rows.map(row => {
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
    res.status(500).json({ success: false, error: err.toString() });
  }
};