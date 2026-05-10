const SYMBOLS = [
  "ACB","VIB","NLG","OCB","VPB","ACV","TPB","VND","MSB","HPG",
  "TCB","MSN","MBB","VCB","SSI","VHM","VRE","STB","TCX","HDB",
  "LHG","VHC","HCM","VCI","HAX","VCS","DHG","FPT","DHC","HDG",
  "REE","MWG","PTB","QNS","PHR","BWE","DPR","PNJ","VSC","IMP",
  "POW","TDM","PVS","DGC","HND","SIP","VNM","VEA","QTP","IDC",
  "NT2","BMP","GAS","PLX","PVT","DCM","DPM","SGB","PHC",
  "E1VFVN30","FUEVFVND","FUEVN100","FUESSVFL","FUEDCMID"
];

async function fetchOne(sym) {
  const url = `https://api.simplize.vn/api/historical/quote/${sym}?isContinuous=false`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Referer": "https://simplize.vn/"
    }
  });
  if (!res.ok) return null;
  const d = await res.json();
  const data = d?.data || {};
  const lp = data.priceClose || data.priceLast;
  const rf = data.priceReference || lp;
  if (!lp) return null;
  const lpn = lp > 1000 ? lp : lp * 1000;
  const rfn = rf ? (rf > 1000 ? rf : rf * 1000) : lpn;
  return {
    lastPrice: lpn,
    changePct: rfn ? Math.round((lpn - rfn) / rfn * 10000) / 100 : 0
  };
}

module.exports = async (req, res) => {
  const settled = await Promise.allSettled(
    SYMBOLS.map(sym => fetchOne(sym).then(data => ({ sym, data })))
  );

  const prices = {};
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value?.data) {
      prices[r.value.sym] = r.value.data;
    }
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(prices);
};
