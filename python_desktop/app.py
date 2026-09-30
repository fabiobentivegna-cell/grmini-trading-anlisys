import os
import sys
import json
import webview

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config.json")

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

class DesktopApi:
    def get_config(self):
        return load_config()

def main():
    # URL di default: dev server Vite locale se in esecuzione o build statica
    dist_index = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist", "index.html")
    url = f"file://{dist_index}" if os.path.exists(dist_index) else "http://localhost:3000"

    api = DesktopApi()
    window = webview.create_window(
        title="Market Analytics Station - Pro Trader",
        url=url,
        js_api=api,
        width=1560,
        height=960,
        resizable=True,
        background_color="#131722"
    )
    webview.start(debug=False)

if __name__ == "__main__":
    main()
