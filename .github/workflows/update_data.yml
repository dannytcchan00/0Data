import urllib.request
import urllib.parse
import json
import sys

# 1. JMA 官方網址
url_direct = 'https://www.jma.go.jp/bosai/typhoon/data/TC.json'
# 2. AllOrigins Proxy 網址 (備用方案)
url_proxy = 'https://api.allorigins.win/raw?url=' + urllib.parse.quote(url_direct)

def fetch_data(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    # 設定 15 秒 timeout，避免卡死
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.loads(response.read().decode())

try:
    data = None
    try:
        print("嘗試直接連接日本氣象廳...")
        data = fetch_data(url_direct)
        print("直連成功！")
    except Exception as e1:
        print(f"直連失敗 ({e1})，正在切換至 Proxy 中轉站...")
        # 直連失敗，自動切換去 Proxy
        data = fetch_data(url_proxy)
        print("Proxy 連接成功！")
    
    # 寫入檔案
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        
    print("✅ 數據更新成功，已寫入 data.json！")

except Exception as e:
    print(f"❌ 雙重嘗試後依然失敗: {e}")
    sys.exit(1) # 真係搞唔掂先觸發 Exit Code 1
