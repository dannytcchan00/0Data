import os
import requests
import datetime
import time

def get_latest_radar():
    hk_tz = datetime.timezone(datetime.timedelta(hours=8))
    now = datetime.datetime.now(hk_tz)
    minute = now.minute - (now.minute % 6)
    current_time = now.replace(minute=minute, second=0, microsecond=0)
    
    # 增加 Referer 與更完整的偽裝標頭，降低被天文台防火牆阻擋的機率
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://www.hko.gov.hk/"
    }

    os.makedirs("radar/imag", exist_ok=True)

    for _ in range(10): 
        timestamp_str = current_time.strftime("%Y%m%d%H%M")
        url = f"https://www.hko.gov.hk/wxinfo/radars/rad_256_png/rad256_{timestamp_str}.jpg"
        
        try:
            # 增加 timeout 避免卡死
            response = requests.get(url, headers=headers, timeout=10)
            print(f"嘗試抓取: {timestamp_str} | 狀態碼: {response.status_code}")
            
            if response.status_code == 200:
                with open("radar/imag/latest_radar.png", "wb") as f:
                    f.write(response.content)
                print(f"✅ 成功下載雷達圖: {timestamp_str}")
                return
        except Exception as e:
            print(f"連線發生錯誤: {e}")
            
        current_time -= datetime.timedelta(minutes=6)
        time.sleep(1)
        
    print("❌ 無法獲取最新的雷達圖。")

if __name__ == "__main__":
    get_latest_radar()
