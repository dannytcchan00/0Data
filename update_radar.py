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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    # 確保儲存圖片的目錄存在
    os.makedirs("radar/imag", exist_ok=True)

    for _ in range(10): 
        timestamp_str = current_time.strftime("%Y%m%d%H%M")
        url = f"https://www.hko.gov.hk/wxinfo/radars/rad_256_png/rad256_{timestamp_str}.jpg"
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            # 寫入指定的資料夾路徑
            with open("radar/imag/latest_radar.png", "wb") as f:
                f.write(response.content)
            print(f"成功下載雷達圖: {timestamp_str}")
            return
            
        current_time -= datetime.timedelta(minutes=6)
        time.sleep(1)
        
    print("無法獲取最新的雷達圖。")

if __name__ == "__main__":
    get_latest_radar()
