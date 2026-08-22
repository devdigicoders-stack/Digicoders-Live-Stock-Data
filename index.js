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

// Target Instruments defined from all 6 images
const INSTRUMENTS = [
  // 1. Key Indices
  { id: "NIFTY", symbol: "NIFTY 50", kiteSymbol: "NSE:NIFTY 50", tvSymbol: "NSE:NIFTY", category: "Key indices", fallback: { value: "24214.05", change: "+135.75", percent: "+0.56%", direction: "UP" } },
  { id: "SENSEX", symbol: "SENSEX", kiteSymbol: "BSE:SENSEX", tvSymbol: "BSE:SENSEX", category: "Key indices", fallback: { value: "77443.73", change: "+534.05", percent: "+0.69%", direction: "UP" } },
  { id: "BANKNIFTY", symbol: "BANKNIFTY", kiteSymbol: "NSE:NIFTY BANK", tvSymbol: "NSE:BANKNIFTY", category: "Key indices", fallback: { value: "57612.45", change: "+372.70", percent: "+0.65%", direction: "UP" } },
  { id: "INDIAVIX", symbol: "INDIAVIX", kiteSymbol: "NSE:INDIA VIX", tvSymbol: "NSE:INDIAVIX", category: "Key indices", fallback: { value: "10.67", change: "-0.65", percent: "-5.74%", direction: "DOWN" } },
  { id: "FINNIFTY", symbol: "FINNIFTY", kiteSymbol: "NSE:NIFTY FIN SERVICE", tvSymbol: "NSE:CNXFINANCE", category: "Key indices", fallback: { value: "26241.40", change: "+228.40", percent: "+0.88%", direction: "UP" } },
  { id: "MIDCPNIFTY", symbol: "MIDCPNIFTY", kiteSymbol: "NSE:NIFTY MID SELECT", tvSymbol: "NSE:NIFTY_MID_SELECT", category: "Key indices", fallback: { value: "14954.35", change: "+86.45", percent: "+0.57%", direction: "UP" } },
  { id: "NIFTY500", symbol: "NIFTY 500", kiteSymbol: "NSE:NIFTY 500", tvSymbol: "NSE:CNX500", category: "Key indices", fallback: { value: "23531.60", change: "+145.40", percent: "+0.62%", direction: "UP" } },
  { id: "NIFTY_SMALLCAP", symbol: "NIFTY SMALL CAP", kiteSymbol: "NSE:NIFTY SMALLCAP 100", tvSymbol: "NSE:CNXSMALLCAP", category: "Key indices", fallback: { value: "18391.55", change: "+111.35", percent: "+1.12%", direction: "UP" } },
  { id: "NFTALPHA50", symbol: "NFTALPHA50", kiteSymbol: "NSE:NIFTY ALPHA 50", tvSymbol: "NSE:CNXALPHA50", category: "Key indices", fallback: { value: "56244.60", change: "+467.65", percent: "+0.84%", direction: "UP" } },
  { id: "NIFTY_MICROCAP250", symbol: "NIFTY MICROCAP250", kiteSymbol: "NSE:NIFTY MICROCAP250", tvSymbol: "NSE:NIFTYMICROCAP250", category: "Key indices", fallback: { value: "26322.50", change: "+190.65", percent: "+0.73%", direction: "UP" } },
  { id: "SMALLCAP50", symbol: "SMALLCAP50", kiteSymbol: "NSE:NIFTY SMLCAP 50", tvSymbol: "NSE:CNXSMALLCAP", category: "Key indices", fallback: { value: "9956.95", change: "+111.35", percent: "+1.12%", direction: "UP" } },
  { id: "BSE_BANKEX", symbol: "BSE BANKEX", kiteSymbol: "BSE:BANKEX", tvSymbol: "BSE:BANKEX", category: "Key indices", fallback: { value: "65272.32", change: "+478.86", percent: "+0.74%", direction: "UP" } },

  // 2. Sector-Based Indices
  { id: "NIFTY_PHARMA", symbol: "NIFTY PHARMA", kiteSymbol: "NSE:NIFTY PHARMA", tvSymbol: "NSE:CNXPHARMA", category: "Sector-based indices", fallback: { value: "26403.70", change: "+89.90", percent: "+0.34%", direction: "UP" } },
  { id: "NIFTY_FMCG", symbol: "NIFTY FMCG", kiteSymbol: "NSE:NIFTY FMCG", tvSymbol: "NSE:CNXFMCG", category: "Sector-based indices", fallback: { value: "47625.35", change: "+151.45", percent: "+0.32%", direction: "UP" } },
  { id: "NIFTY_METAL", symbol: "NIFTY METAL", kiteSymbol: "NSE:NIFTY METAL", tvSymbol: "NSE:CNXMETAL", category: "Sector-based indices", fallback: { value: "13084.65", change: "+61.40", percent: "+0.47%", direction: "UP" } },
  { id: "NIFTY_PSU_BANK", symbol: "NIFTY PSU BANK", kiteSymbol: "NSE:NIFTY PSU BANK", tvSymbol: "NSE:CNXPSUBANK", category: "Sector-based indices", fallback: { value: "8657.50", change: "+39.85", percent: "+0.46%", direction: "UP" } },
  { id: "NIFTY_PVT_BANK", symbol: "NIFTY PVT BANK", kiteSymbol: "NSE:NIFTY PVT BANK", tvSymbol: "NSE:NIFTYPVTBANK", category: "Sector-based indices", fallback: { value: "27470.90", change: "+263.20", percent: "+0.97%", direction: "UP" } },
  { id: "NIFTY_REALTY", symbol: "NIFTY REALTY", kiteSymbol: "NSE:NIFTY REALTY", tvSymbol: "NSE:CNXREALTY", category: "Sector-based indices", fallback: { value: "906.05", change: "+10.70", percent: "+1.20%", direction: "UP" } },
  { id: "NIFTY_OIL_GAS", symbol: "NIFTY OIL & GAS", kiteSymbol: "NSE:NIFTY OIL AND GAS", tvSymbol: "NSE:CNXOILGAS", category: "Sector-based indices", fallback: { value: "11194.25", change: "+17.35", percent: "+0.16%", direction: "UP" } },
  { id: "NIFTY_MEDIA", symbol: "NIFTY MEDIA", kiteSymbol: "NSE:NIFTY MEDIA", tvSymbol: "NSE:CNXMEDIA", category: "Sector-based indices", fallback: { value: "1614.05", change: "+26.10", percent: "+1.64%", direction: "UP" } },
  { id: "NIFTY_ENERGY", symbol: "NIFTY ENERGY", kiteSymbol: "NSE:NIFTY ENERGY", tvSymbol: "NSE:CNXENERGY", category: "Sector-based indices", fallback: { value: "38204.35", change: "+79.90", percent: "+0.21%", direction: "UP" } },
  { id: "NIFTY_MNC", symbol: "NIFTY MNC", kiteSymbol: "NSE:NIFTY MNC", tvSymbol: "NSE:CNXMNC", category: "Sector-based indices", fallback: { value: "33223.60", change: "+150.70", percent: "+0.46%", direction: "UP" } },
  { id: "NIFTY_FINSERV", symbol: "NIFTY FINSERV", kiteSymbol: "NSE:NIFTY FIN SERVICE", tvSymbol: "NSE:CNXFINANCE", category: "Sector-based indices", fallback: { value: "28537.40", change: "+216.90", percent: "+0.77%", direction: "UP" } },
  { id: "NIFTY_INFRA", symbol: "NIFTY INFRA", kiteSymbol: "NSE:NIFTY INFRA", tvSymbol: "NSE:CNXINFRA", category: "Sector-based indices", fallback: { value: "9347.20", change: "+41.65", percent: "+0.45%", direction: "UP" } },
  { id: "NIFTY_IT", symbol: "NIFTY IT", kiteSymbol: "NSE:NIFTY IT", tvSymbol: "NSE:CNXIT", category: "Sector-based indices", fallback: { value: "30657.10", change: "+224.05", percent: "+0.74%", direction: "UP" } },
  { id: "NIFTY_AUTO", symbol: "NIFTY AUTO", kiteSymbol: "NSE:NIFTY AUTO", tvSymbol: "NSE:CNXAUTO", category: "Sector-based indices", fallback: { value: "29336.00", change: "+150.60", percent: "+0.52%", direction: "UP" } },

  // 3. Bullion ETFs & Equities
  { id: "GOLDCASE", symbol: "GOLDCASE", kiteSymbol: "NSE:GOLDCASE", tvSymbol: "NSE:GOLDCASE", category: "Bullion ETF", fallback: { value: "24.55", change: "+0.62", percent: "+2.59%", direction: "UP" } },
  { id: "TATSILV", symbol: "TATSILV", kiteSymbol: "NSE:TATSILV", tvSymbol: "NSE:TATSILV", category: "Bullion ETF", fallback: { value: "22.99", change: "+1.03", percent: "+4.69%", direction: "UP" } },
  { id: "GOLDBEES", symbol: "GOLDBEES", kiteSymbol: "NSE:GOLDBEES", tvSymbol: "NSE:GOLDBEES", category: "Bullion ETF", fallback: { value: "128.87", change: "+3.14", percent: "+2.50%", direction: "UP" } },
  { id: "SILVERBEES", symbol: "SILVERBEES", kiteSymbol: "NSE:SILVERBEES", tvSymbol: "NSE:SILVERBEES", category: "Bullion ETF", fallback: { value: "226.09", change: "+9.66", percent: "+4.46%", direction: "UP" } },
  { id: "NIFTYBEES", symbol: "NIFTYBEES", kiteSymbol: "NSE:NIFTYBEES", tvSymbol: "NSE:NIFTYBEES", category: "Bullion ETF", fallback: { value: "276.42", change: "+1.80", percent: "+0.66%", direction: "UP" } }
];

// Initialize in-memory cache with fallback data
let cache = {
  data: INSTRUMENTS.map(item => ({
    id: item.id,
    symbol: item.symbol,
    category: item.category,
    value: item.fallback.value,
    change: item.fallback.change,
    percent: item.fallback.percent,
    direction: item.fallback.direction
  })),
  source: "Default Baseline",
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
      } else {
        const existing = cache.data.find(d => d.id === inst.id) || inst.fallback;
        result.push({
          id: inst.id,
          symbol: inst.symbol,
          category: inst.category,
          ...existing
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
      } else {
        const existing = cache.data.find(d => d.id === inst.id) || inst.fallback;
        result.push({
          id: inst.id,
          symbol: inst.symbol,
          category: inst.category,
          value: existing.value,
          change: existing.change,
          percent: existing.percent,
          direction: existing.direction
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

  if (!updated && cache.data.length === 0) {
    cache.source = "Default Baseline";
    cache.updatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
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
