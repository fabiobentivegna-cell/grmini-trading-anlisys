# backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import datetime as dt

app = Flask(__name__)
CORS(app)

def fetch_yfinance(symbol, tf, period="1d", interval="1m"):
    # Mappa timeframe a periodo/interval corretti
    # Questo è un semplice wrapper; per timeframe specifici usiamo interval
    try:
        data = yf.download(symbol, period=period, interval=interval, progress=False, auto_adjust=True)
        if data is None or data.empty:
            return []
        # Convert to list of dicts
        data = data.tail(500).reset_index()
        result = []
        for _, row in data.iterrows():
            ts = int(row['Date'].timestamp() * 1000)
            result.append({"time": ts, "open": float(row['Open']), "high": float(row['High']),
                           "low": float(row['Low']), "close": float(row['Close']), "volume": float(row['Volume'])})
        return result
    except Exception as e:
        print("fetch error:", e)
        return []

@app.route("/api/quote", methods=["GET"])
def api_quote():
    market = request.args.get("market", "US")
    symbol = request.args.get("symbol", "AAPL")
    tf = request.args.get("tf", "1m")

    # Mappa tf a interval
    interval_map = {
        "1m": "1m",
        "5m": "5m",
        "1h": "60m",
        "1d": "1d",
    }
    interval = interval_map.get(tf, "1m")

    # Per paese/mercato, scegliere simbolo
    ysymbol = symbol
    if market.upper() == "IT":
        # yfinance suffix .MI
        if not symbol.endswith(".MI"):
            ysymbol = f"{symbol}.MI"
    elif market.upper() == "FX":
        # Esempio: EURUSD=X
        ysymbol = symbol
    elif market.upper() == "COM" or market.upper() == "COMMODITIES":
        ysymbol = symbol
    else:
        ysymbol = symbol

    data = fetch_yfinance(ysymbol, tf, period="1d", interval=interval)
    return jsonify({"symbol": ysymbol, "market": market, "tf": tf, "data": data})

# Crypto via Hyperliquid (mock/demo)
@app.route("/api/crypto/stream", methods=["GET"])
def api_crypto_stream():
    # In una real API, apriresti ws a Hyperliquid; qui return ok e un endpoint per client
    return jsonify({"status": "ok", "message": "Websocket/stream endpoint would be opened client-side."})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
