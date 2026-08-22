const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

app.use(express.static(__dirname + "/public"));

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
  { id: "NIFTY", symbol: "NIFTY 50", kiteSymbol: "NSE:NIFTY 50", tvSymbol: "NSE:NIFTY", category: "Key indices" },
  { id: "SENSEX", symbol: "SENSEX", kiteSymbol: "BSE:SENSEX", tvSymbol: "BSE:SENSEX", category: "Key indices" },
  { id: "BANKNIFTY", symbol: "BANKNIFTY", kiteSymbol: "NSE:NIFTY BANK", tvSymbol: "NSE:BANKNIFTY", category: "Key indices" },
  { id: "INDIAVIX", symbol: "INDIAVIX", kiteSymbol: "NSE:INDIA VIX", tvSymbol: "NSE:INDIAVIX", category: "Key indices" },
  { id: "FINNIFTY", symbol: "FINNIFTY", kiteSymbol: "NSE:NIFTY FIN SERVICE", tvSymbol: "NSE:CNXFINANCE", category: "Key indices" },
  { id: "MIDCPNIFTY", symbol: "MIDCPNIFTY", kiteSymbol: "NSE:NIFTY MID SELECT", tvSymbol: "NSE:NIFTY_MID_SELECT", category: "Key indices" },
  { id: "NIFTY500", symbol: "NIFTY 500", kiteSymbol: "NSE:NIFTY 500", tvSymbol: "NSE:CNX500", category: "Key indices" },
  { id: "NIFTY_SMALLCAP", symbol: "NIFTY SMALL CAP", kiteSymbol: "NSE:NIFTY SMALLCAP 100", tvSymbol: "NSE:CNXSMALLCAP", category: "Key indices" },
  { id: "NFTALPHA50", symbol: "NFTALPHA50", kiteSymbol: "NSE:NIFTY ALPHA 50", tvSymbol: "NSE:CNXALPHA50", category: "Key indices" },
  { id: "NIFTY_MICROCAP250", symbol: "NIFTY MICROCAP250", kiteSymbol: "NSE:NIFTY MICROCAP250", tvSymbol: "NSE:NIFTYMICROCAP250", category: "Key indices" },
  { id: "SMALLCAP50", symbol: "SMALLCAP50", kiteSymbol: "NSE:NIFTY SMLCAP 50", tvSymbol: "NSE:CNXSMALLCAP", category: "Key indices" },
  { id: "BSE_BANKEX", symbol: "BSE BANKEX", kiteSymbol: "BSE:BANKEX", tvSymbol: "BSE:BANKEX", category: "Key indices" },

  // 2. Sector-Based Indices
  { id: "NIFTY_PHARMA", symbol: "NIFTY PHARMA", kiteSymbol: "NSE:NIFTY PHARMA", tvSymbol: "NSE:CNXPHARMA", category: "Sector-based indices" },
  { id: "NIFTY_FMCG", symbol: "NIFTY FMCG", kiteSymbol: "NSE:NIFTY FMCG", tvSymbol: "NSE:CNXFMCG", category: "Sector-based indices" },
  { id: "NIFTY_METAL", symbol: "NIFTY METAL", kiteSymbol: "NSE:NIFTY METAL", tvSymbol: "NSE:CNXMETAL", category: "Sector-based indices" },
  { id: "NIFTY_PSU_BANK", symbol: "NIFTY PSU BANK", kiteSymbol: "NSE:NIFTY PSU BANK", tvSymbol: "NSE:CNXPSUBANK", category: "Sector-based indices" },
  { id: "NIFTY_PVT_BANK", symbol: "NIFTY PVT BANK", kiteSymbol: "NSE:NIFTY PVT BANK", tvSymbol: "NSE:NIFTYPVTBANK", category: "Sector-based indices" },
  { id: "NIFTY_REALTY", symbol: "NIFTY REALTY", kiteSymbol: "NSE:NIFTY REALTY", tvSymbol: "NSE:CNXREALTY", category: "Sector-based indices" },
  { id: "NIFTY_OIL_GAS", symbol: "NIFTY OIL & GAS", kiteSymbol: "NSE:NIFTY OIL AND GAS", tvSymbol: "NSE:CNXOILGAS", category: "Sector-based indices" },
  { id: "NIFTY_MEDIA", symbol: "NIFTY MEDIA", kiteSymbol: "NSE:NIFTY MEDIA", tvSymbol: "NSE:CNXMEDIA", category: "Sector-based indices" },
  { id: "NIFTY_ENERGY", symbol: "NIFTY ENERGY", kiteSymbol: "NSE:NIFTY ENERGY", tvSymbol: "NSE:CNXENERGY", category: "Sector-based indices" },
  { id: "NIFTY_MNC", symbol: "NIFTY MNC", kiteSymbol: "NSE:NIFTY MNC", tvSymbol: "NSE:CNXMNC", category: "Sector-based indices" },
  { id: "NIFTY_FINSERV", symbol: "NIFTY FINSERV", kiteSymbol: "NSE:NIFTY FIN SERVICE", tvSymbol: "NSE:CNXFINANCE", category: "Sector-based indices" },
  { id: "NIFTY_INFRA", symbol: "NIFTY INFRA", kiteSymbol: "NSE:NIFTY INFRA", tvSymbol: "NSE:CNXINFRA", category: "Sector-based indices" },
  { id: "NIFTY_IT", symbol: "NIFTY IT", kiteSymbol: "NSE:NIFTY IT", tvSymbol: "NSE:CNXIT", category: "Sector-based indices" },
  { id: "NIFTY_AUTO", symbol: "NIFTY AUTO", kiteSymbol: "NSE:NIFTY AUTO", tvSymbol: "NSE:CNXAUTO", category: "Sector-based indices" },

  // 3. Bullion ETFs & Equities
  { id: "GOLDCASE", symbol: "GOLDCASE", kiteSymbol: "NSE:GOLDCASE", tvSymbol: "NSE:GOLDCASE", category: "Bullion ETF" },
  { id: "TATSILV", symbol: "TATSILV", kiteSymbol: "NSE:TATSILV", tvSymbol: "NSE:TATSILV", category: "Bullion ETF" },
  { id: "GOLDBEES", symbol: "GOLDBEES", kiteSymbol: "NSE:GOLDBEES", tvSymbol: "NSE:GOLDBEES", category: "Bullion ETF" },
  { id: "SILVERBEES", symbol: "SILVERBEES", kiteSymbol: "NSE:SILVERBEES", tvSymbol: "NSE:SILVERBEES", category: "Bullion ETF" },
  { id: "NIFTYBEES", symbol: "NIFTYBEES", kiteSymbol: "NSE:NIFTYBEES", tvSymbol: "NSE:NIFTYBEES", category: "Bullion ETF" }
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

// Fetch from TradingView Public Scanner
async function fetchTradingViewQuotes() {
  const tvTickers = INSTRUMENTS.map(inst => inst.tvSymbol);
  const res = await axios.post("https://scanner.tradingview.com/india/scan", {
    symbols: { tickers: tvTickers },
    columns: ["name", "close", "change", "change_abs", "description"]
  }, {
    headers: { "Content-Type": "application/json" },
    timeout: 8000
  });

  if (res.data && Array.isArray(res.data.data)) {
    const map = {};
    res.data.data.forEach(item => {
      map[item.s] = {
        price: item.d[1],
        pct: item.d[2],
        abs: item.d[3]
      };
    });

    const result = [];
    for (const inst of INSTRUMENTS) {
      const live = map[inst.tvSymbol];
      if (live && live.price !== undefined && live.price !== null) {
        const val = parseFloat(live.price).toFixed(2);
        const changeAbs = parseFloat(live.abs || 0).toFixed(2);
        const changePct = parseFloat(live.pct || 0).toFixed(2);
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
    return result;
  }
  return null;
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

  // 2. Fallback to TradingView real-time / closing scanner
  if (!updated) {
    try {
      const tvData = await fetchTradingViewQuotes();
      if (tvData && tvData.length > 0) {
        cache.data = tvData;
        cache.source = kiteConfig.accessToken ? "TradingView (Kite Fallback)" : "TradingView Live Scanner";
        cache.updatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        console.log(`[${cache.updatedAt}] Refreshed from ${cache.source} (${tvData.length} items)`);
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
