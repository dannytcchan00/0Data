import requests
import datetime
import time

def get_latest_radar():
    # 設定為香港時間 (UTC+8)
    hk_tz = datetime.timezone(datetime.timedelta(hours=8))
    now = datetime.datetime.now(hk_tz)
    
    # 天文台雷達圖通常每 6 分鐘更新一次 (00, 06, 12, 18...)
    minute = now.minute - (now.minute % 6)
    current_time = now.replace(minute=minute, second=0, microsecond=0)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    # 往回測試過去 1 小時內有效的最新圖片
    for _ in range(10): 
        timestamp_str = current_time.strftime("%Y%m%d%H%M")
        
        # 這是 256 公里雷達圖的常見 URL 格式，可依據天文台最新網頁結構調整
        url = f"https://www.hko.gov.hk/wxinfo/radars/rad_256_png/rad256_{timestamp_str}.jpg"
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            # 強制下載並覆蓋本機檔案
            with open("latest_radar.png", "wb") as f:
                f.write(response.content)
            print(f"成功下載雷達圖: {timestamp_str}")
            return
            
        # 如果找不到，往前推 6 分鐘再試
        current_time -= datetime.timedelta(minutes=6)
        time.sleep(1)
        
    print("無法獲取最新的雷達圖。")

if __name__ == "__main__":
    get_latest_radar()
