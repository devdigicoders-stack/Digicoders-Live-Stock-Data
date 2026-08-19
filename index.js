const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
app.use(express.static(__dirname + "/public"));

async function fetchTicker() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();

  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
  await page.goto("https://www.nseindia.com", { waitUntil: "networkidle2" });

  const cookies = await page.cookies();
  const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const indexData = await page.evaluate(async (cookieStr) => {
    const res = await fetch("https://www.nseindia.com/api/allIndices", {
      headers: { Cookie: cookieStr, Referer: "https://www.nseindia.com" },
    });
    return res.json();
  }, cookieStr);

  await browser.close();

  const wanted = [
  // Broad Market
  "NIFTY 50", "NIFTY NEXT 50", "NIFTY 100", "NIFTY 200", "NIFTY 500",
  "NIFTY MIDCAP 50", "NIFTY MIDCAP 100", "NIFTY SMALLCAP 100", "INDIA VIX",
  // Sectoral
  "NIFTY BANK", "NIFTY IT", "NIFTY AUTO", "NIFTY FMCG", "NIFTY PHARMA",
  "NIFTY METAL", "NIFTY REALTY", "NIFTY ENERGY", "NIFTY MEDIA",
  "NIFTY PSU BANK", "NIFTY PRIVATE BANK", "NIFTY FINANCIAL SERVICES",
  "NIFTY HEALTHCARE INDEX", "NIFTY OIL & GAS", "NIFTY COMMODITIES",
  "NIFTY INFRASTRUCTURE", "NIFTY CONSUMER DURABLES", "NIFTY CHEMICALS",
  "NIFTY CPSE", "NIFTY PSE", "NIFTY MNC", "NIFTY INDIA DEFENCE",
  "NIFTY EV & NEW AGE AUTOMOTIVE", "NIFTY CAPITAL MARKETS",
];
  const result = [];

  for (const idx of indexData.data) {
    if (wanted.includes(idx.index)) {
      const change = parseFloat(idx.variation || idx.change || 0).toFixed(2);
      const percent = parseFloat(idx.percentChange || 0).toFixed(2);
      result.push({
        symbol: idx.index,
        value: parseFloat(idx.last).toFixed(2),
        change: change >= 0 ? `+${change}` : `${change}`,
        percent: percent >= 0 ? `+${percent}%` : `${percent}%`,
        direction: change >= 0 ? "UP" : "DOWN",
      });
    }
  }

  return result;
}

let cache = { data: [], updatedAt: null };

async function refreshCache() {
  try {
    cache.data = await fetchTicker();
    cache.updatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    console.log("Cache refreshed at", cache.updatedAt);
  } catch (e) {
    console.error("Cache refresh failed:", e.message);
  }
}

// Refresh every 60 seconds
refreshCache();
setInterval(refreshCache, 60000);

app.get("/api/ticker", (req, res) => {
  res.json({ status: true, timestamp: cache.updatedAt, data: cache.data });
});

app.get("/api/ticker/text", (req, res) => {
  const text = cache.data.map((d) => `${d.symbol}: ${d.value}  ${d.change} (${d.percent})`).join("   |   ");
  res.json({ status: true, ticker_text: text });
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
