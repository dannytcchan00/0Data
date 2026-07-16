import urllib.request
import json

# JMA 嘅目標網址
url = 'https://www.jma.go.jp/bosai/typhoon/data/TC.json'

try:
    # 讀取 JMA 數據
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
    
    # 將數據寫入一個名為 data.json 嘅檔案
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        
    print("數據更新成功，已寫入 data.json！")
except Exception as e:
    print(f"更新數據失敗: {e}")
