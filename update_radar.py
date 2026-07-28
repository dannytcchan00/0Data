import os
import requests
import datetime
import time

def get_latest_radar():
    hk_tz = datetime.timezone(datetime.timedelta(hours=8))
    now = datetime.datetime.now(hk_tz)
    minute = now.minute - (now.minute % 6)
    current_time = now.replace(minute=minute, second=0, microsecond=0)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://www.hko.gov.hk/"
    }

    # 確保儲存資料夾存在
    os.makedirs("radar/imag", exist_ok=True)

    # 擴大搜尋範圍到 20 次 (往回找 2 小時內有效的圖)
    for _ in range(20): 
        timestamp_str = current_time.strftime("%Y%m%d%H%M")
        
        # 同時測試 jpg 和 png 兩種格式，涵蓋天文台可能的變動
        urls_to_test = [
            f"https://www.hko.gov.hk/wxinfo/radars/rad_256_png/rad256_{timestamp_str}.jpg",
            f"https://www.hko.gov.hk/wxinfo/radars/rad_256_png/rad256_{timestamp_str}.png"
        ]
        
        for url in urls_to_test:
            try:
                response = requests.get(url, headers=headers, timeout=10)
                print(f"嘗試抓取: {url} | 狀態碼: {response.status_code}")
                
                if response.status_code == 200:
                    with open("radar/imag/latest_radar.png", "wb") as f:
                        f.write(response.content)
                    print(f"✅ 成功下載雷達圖: {timestamp_str}")
                    return
            except Exception as e:
                print(f"連線發生錯誤: {e}")
            
            time.sleep(0.5) # 稍微停頓，避免被當成惡意攻擊
            
        current_time -= datetime.timedelta(minutes=6)
        
    print("❌ 無法獲取最新的雷達圖。")

if __name__ == "__main__":
    get_latest_radar()
