const express = require("express");
const axios = require("axios");

const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
app.use(express.static(__dirname + "/public"));

const client = axios.create({
  baseURL: "https://www.nseindia.com",
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.nseindia.com/",
    "Connection": "keep-alive",
  },
});

let cookieJar = "";

async function refreshCookies() {
  const res = await client.get("/", { responseType: "text" });
  const setCookie = res.headers["set-cookie"];
  if (setCookie) cookieJar = setCookie.map((c) => c.split(";")[0]).join("; ");
}

const wanted = [
  "NIFTY 50", "NIFTY NEXT 50", "NIFTY 100", "NIFTY 200", "NIFTY 500",
  "NIFTY MIDCAP 50", "NIFTY MIDCAP 100", "NIFTY SMALLCAP 100", "INDIA VIX",
  "NIFTY BANK", "NIFTY IT", "NIFTY AUTO", "NIFTY FMCG", "NIFTY PHARMA",
  "NIFTY METAL", "NIFTY REALTY", "NIFTY ENERGY", "NIFTY MEDIA",
  "NIFTY PSU BANK", "NIFTY PRIVATE BANK", "NIFTY FINANCIAL SERVICES",
  "NIFTY HEALTHCARE INDEX", "NIFTY OIL & GAS", "NIFTY COMMODITIES",
  "NIFTY INFRASTRUCTURE", "NIFTY CONSUMER DURABLES", "NIFTY CHEMICALS",
  "NIFTY CPSE", "NIFTY PSE", "NIFTY MNC", "NIFTY INDIA DEFENCE",
  "NIFTY EV & NEW AGE AUTOMOTIVE", "NIFTY CAPITAL MARKETS",
];

async function fetchTicker() {
  const { data } = await client.get("/api/allIndices", {
    headers: { Cookie: cookieJar },
  });

  return data.data
    .filter((idx) => wanted.includes(idx.index))
    .map((idx) => {
      const change = parseFloat(idx.variation || idx.change || 0).toFixed(2);
      const percent = parseFloat(idx.percentChange || 0).toFixed(2);
      return {
        symbol: idx.index,
        value: parseFloat(idx.last).toFixed(2),
        change: change >= 0 ? `+${change}` : `${change}`,
        percent: percent >= 0 ? `+${percent}%` : `${percent}%`,
        direction: change >= 0 ? "UP" : "DOWN",
      };
    });
}

const fallbackData = [
  { symbol: "NIFTY 50", value: "24078.30", change: "-76.60", percent: "-0.32%", direction: "DOWN" },
  { symbol: "NIFTY BANK", value: "51245.80", change: "+142.50", percent: "+0.28%", direction: "UP" },
  { symbol: "NIFTY IT", value: "38920.15", change: "+310.40", percent: "+0.80%", direction: "UP" },
  { symbol: "NIFTY AUTO", value: "22450.60", change: "-115.20", percent: "-0.51%", direction: "DOWN" },
  { symbol: "NIFTY PHARMA", value: "21680.45", change: "+85.30", percent: "+0.39%", direction: "UP" },
  { symbol: "NIFTY METAL", value: "9340.10", change: "-42.70", percent: "-0.45%", direction: "DOWN" },
  { symbol: "NIFTY FMCG", value: "56780.90", change: "+120.15", percent: "+0.21%", direction: "UP" },
  { symbol: "NIFTY NEXT 50", value: "68450.25", change: "-180.60", percent: "-0.26%", direction: "DOWN" },
  { symbol: "NIFTY MIDCAP 100", value: "54230.70", change: "+95.80", percent: "+0.18%", direction: "UP" },
  { symbol: "NIFTY SMALLCAP 100", value: "17850.40", change: "-35.20", percent: "-0.20%", direction: "DOWN" },
];

let cache = { data: fallbackData, updatedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) };

async function refreshCache() {
  try {
    await refreshCookies();
    const fresh = await fetchTicker();
    if (fresh && fresh.length > 0) {
      cache.data = fresh;
      cache.updatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      console.log("Cache refreshed at", cache.updatedAt, "| Count:", cache.data.length);
    }
  } catch (e) {
    console.error("Cache refresh failed (using cache/fallback):", e.message);
  }
}

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
