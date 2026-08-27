const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
app.use(express.static(__dirname + "/public"));

const SYMBOLS = [
  { symbol: "NIFTY 50",       tv: "NSE:NIFTY" },
  { symbol: "BANK NIFTY",     tv: "NSE:BANKNIFTY" },
  { symbol: "SENSEX",         tv: "BSE:SENSEX" },
  { symbol: "INDIA VIX",      tv: "NSE:INDIAVIX" },
  { symbol: "FINNIFTY",       tv: "NSE:CNXFINANCE" },
  { symbol: "MIDCAP NIFTY",   tv: "NSE:NIFTY_MID_SELECT" },
  { symbol: "NIFTY 500",      tv: "NSE:CNX500" },
  { symbol: "NIFTY SMALLCAP", tv: "NSE:CNXSMALLCAP" },
  { symbol: "NIFTY IT",       tv: "NSE:CNXIT" },
  { symbol: "NIFTY AUTO",     tv: "NSE:CNXAUTO" },
  { symbol: "NIFTY PHARMA",   tv: "NSE:CNXPHARMA" },
  { symbol: "NIFTY FMCG",     tv: "NSE:CNXFMCG" },
  { symbol: "NIFTY METAL",    tv: "NSE:CNXMETAL" },
  { symbol: "NIFTY REALTY",   tv: "NSE:CNXREALTY" },
  { symbol: "NIFTY ENERGY",   tv: "NSE:CNXENERGY" },
  { symbol: "NIFTY MEDIA",    tv: "NSE:CNXMEDIA" },
  { symbol: "NIFTY PSU BANK", tv: "NSE:CNXPSUBANK" },
  { symbol: "NIFTY PVT BANK", tv: "NSE:NIFTYPVTBANK" },
  { symbol: "NIFTY INFRA",    tv: "NSE:CNXINFRA" },
  { symbol: "NIFTY MNC",      tv: "NSE:CNXMNC" },
  { symbol: "NIFTY OIL & GAS",tv: "NSE:CNXOILGAS" },
  { symbol: "GOLDBEES",       tv: "NSE:GOLDBEES" },
  { symbol: "SILVERBEES",     tv: "NSE:SILVERBEES" },
];

let cache = { data: [], updatedAt: null };

async function refreshCache() {
  try {
    const tickers = SYMBOLS.map(s => s.tv);
    const res = await axios.post(
      "https://scanner.tradingview.com/india/scan",
      { symbols: { tickers }, columns: ["close", "change_abs", "change"] },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );

    const map = {};
    (res.data.data || []).forEach(item => { map[item.s] = item.d; });

    cache.data = SYMBOLS.map(s => {
      const d = map[s.tv];
      if (!d) return null;
      const price   = parseFloat(d[0] || 0).toFixed(2);
      const chgAbs  = parseFloat(d[1] || 0).toFixed(2);
      const chgPct  = parseFloat(d[2] || 0).toFixed(2);
      const isUp    = parseFloat(chgAbs) >= 0;
      return {
        symbol:    s.symbol,
        value:     price,
        change:    isUp ? `+${chgAbs}` : `${chgAbs}`,
        percent:   isUp ? `+${chgPct}%` : `${chgPct}%`,
        direction: isUp ? "UP" : "DOWN",
      };
    }).filter(Boolean);

    cache.updatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    console.log(`Refreshed at ${cache.updatedAt} | Count: ${cache.data.length}`);
  } catch (e) {
    console.error("Refresh failed:", e.message);
  }
}

refreshCache();
setInterval(refreshCache, 15000);

app.get("/api/ticker", (req, res) => {
  res.json({ status: true, timestamp: cache.updatedAt, data: cache.data });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
