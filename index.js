const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

app.use(express.static(__dirname + "/public", {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
}));

// Zerodha Kite Credentials
let kiteConfig = {
  apiKey: process.env.KITE_API_KEY || "2e5hgpF1Gw400ugt",
  apiSecret: process.env.KITE_API_SECRET || "",
  accessToken: process.env.KITE_ACCESS_TOKEN || "",
  source: "INITIALIZING"
};

// Target Instruments
const INSTRUMENTS = [
  // 1. Key Indices
  { id: "NIFTY", symbol: "NIFTY 50", nseSymbol: "NIFTY 50", kiteSymbol: "NSE:NIFTY 50", tvSymbol: "NSE:NIFTY", category: "Key indices" },
  { id: "SENSEX", symbol: "SENSEX", nseSymbol: null, kiteSymbol: "BSE:SENSEX", tvSymbol: "BSE:SENSEX", category: "Key indices" },
  { id: "BANKNIFTY", symbol: "BANKNIFTY", nseSymbol: "NIFTY BANK", kiteSymbol: "NSE:NIFTY BANK", tvSymbol: "NSE:BANKNIFTY", category: "Key indices" },
  { id: "INDIAVIX", symbol: "INDIAVIX", nseSymbol: "INDIA VIX", kiteSymbol: "NSE:INDIA VIX", tvSymbol: "NSE:INDIAVIX", category: "Key indices" },
  { id: "FINNIFTY", symbol: "FINNIFTY", nseSymbol: "NIFTY FIN SERVICE", kiteSymbol: "NSE:NIFTY FIN SERVICE", tvSymbol: "NSE:CNXFINANCE", category: "Key indices" },
  { id: "MIDCPNIFTY", symbol: "MIDCPNIFTY", nseSymbol: "NIFTY MID SELECT", kiteSymbol: "NSE:NIFTY MID SELECT", tvSymbol: "NSE:NIFTY_MID_SELECT", category: "Key indices" },
  { id: "NIFTY500", symbol: "NIFTY 500", nseSymbol: "NIFTY 500", kiteSymbol: "NSE:NIFTY 500", tvSymbol: "NSE:CNX500", category: "Key indices" },
  { id: "NIFTY_SMALLCAP", symbol: "NIFTY SMALL CAP", nseSymbol: "NIFTY SMLCAP 100", kiteSymbol: "NSE:NIFTY SMALLCAP 100", tvSymbol: "NSE:CNXSMALLCAP", category: "Key indices" },
  { id: "NFTALPHA50", symbol: "NFTALPHA50", nseSymbol: "NIFTY ALPHA 50", kiteSymbol: "NSE:NIFTY ALPHA 50", tvSymbol: "NSE:CNXALPHA50", category: "Key indices" },
  { id: "NIFTY_MICROCAP250", symbol: "NIFTY MICROCAP250", nseSymbol: "NIFTY MICROCAP250", kiteSymbol: "NSE:NIFTY MICROCAP250", tvSymbol: "NSE:NIFTYMICROCAP250", category: "Key indices" },
  { id: "SMALLCAP50", symbol: "SMALLCAP50", nseSymbol: "NIFTY SMLCAP 50", kiteSymbol: "NSE:NIFTY SMLCAP 50", tvSymbol: "NSE:CNXSMALLCAP", category: "Key indices" },
  { id: "BSE_BANKEX", symbol: "BSE BANKEX", nseSymbol: null, kiteSymbol: "BSE:BANKEX", tvSymbol: "BSE:BANKEX", category: "Key indices" },

  // 2. Sector-Based Indices
  { id: "NIFTY_PHARMA", symbol: "NIFTY PHARMA", nseSymbol: "NIFTY PHARMA", kiteSymbol: "NSE:NIFTY PHARMA", tvSymbol: "NSE:CNXPHARMA", category: "Sector-based indices" },
  { id: "NIFTY_FMCG", symbol: "NIFTY FMCG", nseSymbol: "NIFTY FMCG", kiteSymbol: "NSE:NIFTY FMCG", tvSymbol: "NSE:CNXFMCG", category: "Sector-based indices" },
  { id: "NIFTY_METAL", symbol: "NIFTY METAL", nseSymbol: "NIFTY METAL", kiteSymbol: "NSE:NIFTY METAL", tvSymbol: "NSE:CNXMETAL", category: "Sector-based indices" },
  { id: "NIFTY_PSU_BANK", symbol: "NIFTY PSU BANK", nseSymbol: "NIFTY PSU BANK", kiteSymbol: "NSE:NIFTY PSU BANK", tvSymbol: "NSE:CNXPSUBANK", category: "Sector-based indices" },
  { id: "NIFTY_PVT_BANK", symbol: "NIFTY PVT BANK", nseSymbol: "NIFTY PVT BANK", kiteSymbol: "NSE:NIFTY PVT BANK", tvSymbol: "NSE:NIFTYPVTBANK", category: "Sector-based indices" },
  { id: "NIFTY_REALTY", symbol: "NIFTY REALTY", nseSymbol: "NIFTY REALTY", kiteSymbol: "NSE:NIFTY REALTY", tvSymbol: "NSE:CNXREALTY", category: "Sector-based indices" },
  { id: "NIFTY_OIL_GAS", symbol: "NIFTY OIL & GAS", nseSymbol: "NIFTY OIL AND GAS", kiteSymbol: "NSE:NIFTY OIL AND GAS", tvSymbol: "NSE:CNXOILGAS", category: "Sector-based indices" },
  { id: "NIFTY_MEDIA", symbol: "NIFTY MEDIA", nseSymbol: "NIFTY MEDIA", kiteSymbol: "NSE:NIFTY MEDIA", tvSymbol: "NSE:CNXMEDIA", category: "Sector-based indices" },
  { id: "NIFTY_ENERGY", symbol: "NIFTY ENERGY", nseSymbol: "NIFTY ENERGY", kiteSymbol: "NSE:NIFTY ENERGY", tvSymbol: "NSE:CNXENERGY", category: "Sector-based indices" },
  { id: "NIFTY_MNC", symbol: "NIFTY MNC", nseSymbol: "NIFTY MNC", kiteSymbol: "NSE:NIFTY MNC", tvSymbol: "NSE:CNXMNC", category: "Sector-based indices" },
  { id: "NIFTY_FINSERV", symbol: "NIFTY FINSERV", nseSymbol: "NIFTY FINSRV25 50", kiteSymbol: "NSE:NIFTY FIN SERVICE", tvSymbol: "NSE:CNXFINANCE", category: "Sector-based indices" },
  { id: "NIFTY_INFRA", symbol: "NIFTY INFRA", nseSymbol: "NIFTY INFRA", kiteSymbol: "NSE:NIFTY INFRA", tvSymbol: "NSE:CNXINFRA", category: "Sector-based indices" },
  { id: "NIFTY_IT", symbol: "NIFTY IT", nseSymbol: "NIFTY IT", kiteSymbol: "NSE:NIFTY IT", tvSymbol: "NSE:CNXIT", category: "Sector-based indices" },
  { id: "NIFTY_AUTO", symbol: "NIFTY AUTO", nseSymbol: "NIFTY AUTO", kiteSymbol: "NSE:NIFTY AUTO", tvSymbol: "NSE:CNXAUTO", category: "Sector-based indices" },

  // 3. Bullion ETFs & Equities
  { id: "GOLDCASE", symbol: "GOLDCASE", nseSymbol: null, kiteSymbol: "NSE:GOLDCASE", tvSymbol: "NSE:GOLDCASE", category: "Bullion ETF" },
  { id: "TATSILV", symbol: "TATSILV", nseSymbol: null, kiteSymbol: "NSE:TATSILV", tvSymbol: "NSE:TATSILV", category: "Bullion ETF" },
  { id: "GOLDBEES", symbol: "GOLDBEES", nseSymbol: null, kiteSymbol: "NSE:GOLDBEES", tvSymbol: "NSE:GOLDBEES", category: "Bullion ETF" },
  { id: "SILVERBEES", symbol: "SILVERBEES", nseSymbol: null, kiteSymbol: "NSE:SILVERBEES", tvSymbol: "NSE:SILVERBEES", category: "Bullion ETF" },
  { id: "NIFTYBEES", symbol: "NIFTYBEES", nseSymbol: null, kiteSymbol: "NSE:NIFTYBEES", tvSymbol: "NSE:NIFTYBEES", category: "Bullion ETF" }
];

// Initialize empty cache — data will be populated from live sources only
let cache = {
  data: [],
  source: "Initializing",
  updatedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
};

// Fetch from Zerodha Kite Connect Quote API
async function fetchZerodhaQuotes() {
  if (!kiteConfig.apiKey || !kiteConfig.accessToken) {
    return null;
  }

  const queryParams = INSTRUMENTS.map(inst => `i=${encodeURIComponent(inst.kiteSymbol)}`).join("&");
  const url = `https://api.kite.trade/quote?${queryParams}`;

  const res = await axios.get(url, {
    headers: {
      "X-Kite-Version": "3",
      "Authorization": `token ${kiteConfig.apiKey}:${kiteConfig.accessToken}`
    },
    timeout: 8000
  });

  if (res.data && res.data.status === "success" && res.data.data) {
    const quotes = res.data.data;
    const result = [];

    for (const inst of INSTRUMENTS) {
      const q = quotes[inst.kiteSymbol];
      if (q) {
        const lastPrice = q.last_price;
        const ohlc = q.ohlc || {};
        const prevClose = ohlc.close || (lastPrice - (q.net_change || 0));
        const changeVal = (lastPrice - prevClose);
        const pctVal = prevClose > 0 ? (changeVal / prevClose * 100) : 0;

        const changeStr = changeVal >= 0 ? `+${changeVal.toFixed(2)}` : changeVal.toFixed(2);
        const pctStr = pctVal >= 0 ? `+${pctVal.toFixed(2)}%` : `${pctVal.toFixed(2)}%`;

        result.push({
          id: inst.id,
          symbol: inst.symbol,
          category: inst.category,
          value: parseFloat(lastPrice).toFixed(2),
          change: changeStr,
          percent: pctStr,
          direction: changeVal >= 0 ? "UP" : "DOWN"
        });
      }
    }
    return result;
  }
  return null;
}

// Fetch from NSE India API
async function fetchNSEQuotes() {
  const res = await axios.get("https://www.nseindia.com/api/allIndices", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Referer": "https://www.nseindia.com/"
    },
    timeout: 8000
  });

  if (res.data && Array.isArray(res.data.data)) {
    const map = {};
    res.data.data.forEach(item => {
      map[item.indexSymbol] = item;
    });

    const result = [];
    for (const inst of INSTRUMENTS) {
      const q = map[inst.nseSymbol];
      if (q && q.last !== undefined) {
        const val = parseFloat(q.last).toFixed(2);
        const changeAbs = parseFloat(q.variation || 0).toFixed(2);
        const changePct = parseFloat(q.percentChange || 0).toFixed(2);
        const isUp = parseFloat(changeAbs) >= 0;
        result.push({
          id: inst.id,
          symbol: inst.symbol,
          category: inst.category,
          value: val,
          change: isUp ? `+${changeAbs}` : `${changeAbs}`,
          percent: isUp ? `+${changePct}%` : `${changePct}%`,
          direction: isUp ? "UP" : "DOWN"
        });
      }
    }
    return result.length > 0 ? result : null;
  }
  return null;
}

// Fetch SENSEX & BSE BANKEX from BSE API
async function fetchBSEQuotes() {
  const bseInstruments = INSTRUMENTS.filter(i => i.nseSymbol === null && i.category !== "Bullion ETF");
  const result = [];

  const bseMap = {
    "SENSEX":     { code: "1" },
    "BSE_BANKEX": { code: "12" }
  };

  for (const inst of bseInstruments) {
    const bse = bseMap[inst.id];
    if (!bse) continue;
    try {
      const res = await axios.get(`https://api.bseindia.com/BseIndiaAPI/api/getScripHeaderData/w?Debtflag=&scripcode=${bse.code}&seriesid=`, {
        headers: {
          "Referer": "https://www.bseindia.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*"
        },
        timeout: 5000
      });
      const q = res.data && res.data.CurrRate;
      if (q && q.LTP && q.LTP !== "-") {
        const val = parseFloat(q.LTP.replace(/,/g, "")).toFixed(2);
        const changeAbs = parseFloat((q.Chg || "0").replace(/,/g, "")).toFixed(2);
        const changePct = parseFloat((q.PcChg || "0").replace(/,/g, "")).toFixed(2);
        const isUp = parseFloat(changeAbs) >= 0;
        result.push({
          id: inst.id, symbol: inst.symbol, category: inst.category,
          value: val,
          change: isUp ? `+${changeAbs}` : `${changeAbs}`,
          percent: isUp ? `+${changePct}%` : `${changePct}%`,
          direction: isUp ? "UP" : "DOWN"
        });
      }
    } catch(e) {
      console.warn(`BSE fetch failed for ${inst.id}:`, e.message);
    }
  }
  return result;
}

async function fetchETFsFromTradingView() {
  const etfs = INSTRUMENTS.filter(i => i.category === "Bullion ETF");
  const tvTickers = etfs.map(i => i.tvSymbol);
  const res = await axios.post("https://scanner.tradingview.com/india/scan", {
    symbols: { tickers: tvTickers },
    columns: ["close", "change", "change_abs"]
  }, {
    headers: { "Content-Type": "application/json" },
    timeout: 8000
  });

  if (res.data && Array.isArray(res.data.data)) {
    const map = {};
    res.data.data.forEach(item => {
      map[item.s] = { price: item.d[0], pct: item.d[1], abs: item.d[2] };
    });
    const result = [];
    for (const inst of etfs) {
      const live = map[inst.tvSymbol];
      if (live && live.price !== undefined && live.price !== null) {
        const val = parseFloat(live.price).toFixed(2);
        const changeAbs = parseFloat(live.abs || 0).toFixed(2);
        const changePct = parseFloat(live.pct || 0).toFixed(2);
        const isUp = parseFloat(changeAbs) >= 0;
        result.push({
          id: inst.id, symbol: inst.symbol, category: inst.category,
          value: val,
          change: isUp ? `+${changeAbs}` : `${changeAbs}`,
          percent: isUp ? `+${changePct}%` : `${changePct}%`,
          direction: isUp ? "UP" : "DOWN"
        });
      }
    }
    return result;
  }
  return [];
}

// Unified Cache Refresher
async function refreshCache() {
  let updated = false;

  // 1. Try Zerodha Kite Connect if access token is available
  if (kiteConfig.accessToken) {
    try {
      const kiteData = await fetchZerodhaQuotes();
      if (kiteData && kiteData.length > 0) {
        cache.data = kiteData;
        cache.source = "Zerodha Kite Connect (Live)";
        cache.updatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        console.log(`[${cache.updatedAt}] Refreshed from Zerodha Kite Connect (${kiteData.length} items)`);
        updated = true;
      }
    } catch (e) {
      console.warn("Zerodha Quote API fetch failed:", e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message);
    }
  }

  // 2. NSE India API (primary for all indices)
  if (!updated) {
    try {
      const nseData = await fetchNSEQuotes();
      if (nseData && nseData.length > 0) {
        // Also fetch ETFs from TradingView and BSE indices, then merge
        let etfData = [];
        let bseData = [];
        try { etfData = await fetchETFsFromTradingView(); } catch(e) {}
        try { bseData = await fetchBSEQuotes(); } catch(e) {}
        cache.data = [...nseData, ...bseData, ...etfData];
        cache.source = "NSE India Live";
        cache.updatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        console.log(`[${cache.updatedAt}] Refreshed from NSE India (${nseData.length} indices + ${bseData.length} BSE + ${etfData.length} ETFs)`);
        updated = true;
      }
    } catch (e) {
      console.warn("NSE India API fetch failed:", e.message);
    }
  }

  // 3. Fallback to TradingView
  if (!updated) {
    try {
      const tvData = await fetchNSEQuotes();
      if (tvData && tvData.length > 0) {
        cache.data = tvData;
        cache.source = "TradingView Live Scanner";
        cache.updatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        console.log(`[${cache.updatedAt}] Refreshed from TradingView (${tvData.length} items)`);
        updated = true;
      }
    } catch (e) {
      console.warn("TradingView Scanner fetch failed:", e.message);
    }
  }

  if (!updated) {
    console.warn("All data sources failed. Cache not updated.");
  }
}

// Initial refresh & periodic timer (every 10 seconds for real-time market data)
refreshCache();
setInterval(refreshCache, 10000);

// API Endpoints
app.get("/api/ticker", (req, res) => {
  res.json({
    status: true,
    source: cache.source,
    timestamp: cache.updatedAt,
    count: cache.data.length,
    data: cache.data
  });
});

app.get("/api/ticker/text", (req, res) => {
  const text = cache.data
    .map((d) => `${d.symbol}: ${d.value}  ${d.change} (${d.percent})`)
    .join("   |   ");
  res.json({ status: true, ticker_text: text, count: cache.data.length });
});

app.get("/api/status", (req, res) => {
  res.json({
    status: true,
    apiKey: kiteConfig.apiKey ? `${kiteConfig.apiKey.slice(0, 4)}...${kiteConfig.apiKey.slice(-4)}` : "Not set",
    hasSecret: !!kiteConfig.apiSecret,
    hasAccessToken: !!kiteConfig.accessToken,
    source: cache.source,
    totalSymbols: INSTRUMENTS.length,
    updatedAt: cache.updatedAt
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(` Stock LED Live Display Server`);
  console.log(` Running at: http://localhost:${PORT}`);
  console.log(` Zerodha API Key: ${kiteConfig.apiKey}`);
  console.log(` Total Monitored Instruments: ${INSTRUMENTS.length}`);
  console.log(`===========================================`);
});
