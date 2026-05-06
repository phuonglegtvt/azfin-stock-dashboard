const SYMBOLS = [
  "ACB","VIB","NLG","OCB","VPB","ACV","TPB","VND","MSB","HPG",
  "TCB","MSN","MBB","VCB","SSI","VHM","VRE","STB","TCX","HDB",
  "LHG","VHC","HCM","VCI","HAX","VCS","DHG","FPT","DHC","HDG",
  "REE","MWG","PTB","QNS","PHR","BWE","DPR","PNJ","VSC","IMP",
  "POW","TDM","PVS","DGC","HND","SIP","VNM","VEA","QTP","IDC",
  "NT2","BMP","GAS","PLX","PVT","DCM","DPM",
  "E1VFVN30","FUEVFVND","FUEVN100","FUESSVFL","FUEDCMID"
];

async function fetchATH(sym) {
  const url = `https://api2.simplize.vn/api/historical/prices/chart?ticker=${sym}&period=all`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Referer": "https://simplize.vn/"
    }
  });
  if (!res.ok) return null;
  const d = await res.json();
  const candles = d?.data;
  if (!Array.isArray(candles) || candles.length === 0) return null;
  const athRaw = Math.max(...candles.map(c => c[2]));
  if (!athRaw || athRaw <= 0) return null;
  return athRaw > 1000 ? Math.round(athRaw) : Math.round(athRaw * 1000);
}

module.exports = async (req, res) => {
  const CHUNK = 10;
  const ath = {};

  for (let i = 0; i < SYMBOLS.length; i += CHUNK) {
    const chunk = SYMBOLS.slice(i, i + CHUNK);
    const results = await Promise.allSettled(
      chunk.map(sym => fetchATH(sym).then(price => ({ sym, price })))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value?.price) {
        ath[r.value.sym] = r.value.price;
      }
    }
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).json(ath);
};
