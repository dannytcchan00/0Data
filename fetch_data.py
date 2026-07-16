import urllib.request
import json
import sys

url = 'https://www.jma.go.jp/bosai/typhoon/data/TC.json'

# 加入 User-Agent 扮成真實 Google Chrome 瀏覽器，防止被 JMA 防火牆阻擋
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
    
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        
    print("✅ 數據更新成功，已寫入 data.json！")
except Exception as e:
    print(f"❌ 更新數據失敗: {e}")
    # 發生錯誤時強制令腳本以 Error (Exit 1) 結束，等 GitHub Action 亮紅燈報警
    sys.exit(1)
