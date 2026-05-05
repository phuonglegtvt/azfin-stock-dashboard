import json, urllib.request, concurrent.futures
from http.server import HTTPServer, SimpleHTTPRequestHandler

SYMBOLS = [
    "ACB","VIB","NLG","OCB","VPB","ACV","TPB","VND","MSB","HPG",
    "TCB","MSN","MBB","VCB","SSI","VHM","VRE","STB","TCX","HDB",
    "LHG","VHC","HCM","VCI","HAX","VCS","DHG","FPT","DHC","HDG",
    "REE","MWG","PTB","QNS","PHR","BWE","DPR","PNJ","VSC","IMP",
    "POW","TDM","PVS","DGC","HND","SIP","VNM","VEA","QTP","IDC",
    "NT2","BMP","GAS","PLX","PVT","DCM","DPM",
    "E1VFVN30","FUEVFVND","FUEVN100","FUESSVFL","FUEDCMID"
]

_ath_cache = {"data": None, "ts": 0}

def fetch_one_ath(sym):
    url = f"https://api2.simplize.vn/api/historical/prices/chart?ticker={sym}&period=all"
    req = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://simplize.vn/"
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        d = json.loads(r.read())
    candles = d.get("data", [])
    if not candles:
        return None
    ath_raw = max(c[2] for c in candles if len(c) > 2)
    if not ath_raw or ath_raw <= 0:
        return None
    return round(ath_raw) if ath_raw > 1000 else round(ath_raw * 1000)

def fetch_ath():
    import time
    if _ath_cache["data"] and time.time() - _ath_cache["ts"] < 86400:
        return _ath_cache["data"]
    result = {}
    print(f"Fetching ATH for {len(SYMBOLS)} symbols...", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futures = {ex.submit(fetch_one_ath, sym): sym for sym in SYMBOLS}
        for future in concurrent.futures.as_completed(futures):
            sym = futures[future]
            try:
                ath = future.result()
                if ath:
                    result[sym] = ath
            except Exception as e:
                print(f"  ATH ERR {sym}: {e}", flush=True)
    print(f"OK ATH: {len(result)}/{len(SYMBOLS)} symbols", flush=True)
    _ath_cache["data"] = result
    _ath_cache["ts"] = time.time()
    return result

def fetch_one_simplize(sym):
    url = f"https://api.simplize.vn/api/historical/quote/{sym}?isContinuous=false"
    req = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://simplize.vn/"
    })
    with urllib.request.urlopen(req, timeout=8) as r:
        d = json.loads(r.read())
    data = d.get("data", {})
    lp = data.get("priceClose") or data.get("priceLast")
    rf = data.get("priceReference") or lp
    if not lp:
        return None
    lpn = lp if lp > 1000 else lp * 1000
    rfn = (rf if rf > 1000 else rf * 1000) if rf else lpn
    return {"lastPrice": lpn, "changePct": round((lpn - rfn) / rfn * 100, 2) if rfn else 0}

def fetch_prices():
    result = {}
    print(f"Fetching {len(SYMBOLS)} symbols from Simplize...", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futures = {ex.submit(fetch_one_simplize, sym): sym for sym in SYMBOLS}
        for future in concurrent.futures.as_completed(futures):
            sym = futures[future]
            try:
                data = future.result()
                if data:
                    result[sym] = data
            except Exception as e:
                print(f"  ERR {sym}: {e}", flush=True)
    print(f"OK Simplize: {len(result)}/{len(SYMBOLS)} symbols", flush=True)
    return result

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/prices":
            data = fetch_prices()
            self._json(data)
        elif self.path == "/api/ath":
            data = fetch_ath()
            self._json(data)
        else:
            super().do_GET()

    def _json(self, data):
        body = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, fmt, *args): pass

print("AzFin Proxy ready: http://localhost:8080", flush=True)
HTTPServer(("", 8080), Handler).serve_forever()