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

let cache = { data: [], updatedAt: null };

async function refreshCache() {
  try {
    await refreshCookies();
    cache.data = await fetchTicker();
    cache.updatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    console.log("Cache refreshed at", cache.updatedAt, "| Count:", cache.data.length);
  } catch (e) {
    console.error("Cache refresh failed:", e.message);
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
