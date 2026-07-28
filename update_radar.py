import os
import requests
import datetime
import time

def get_latest_radar():
    hk_tz = datetime.timezone(datetime.timedelta(hours=8))
    now = datetime.datetime.now(hk_tz)
    
    # 強化偽裝標頭，模擬真實 Windows Chrome 瀏覽器，減少 403 機率
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.9",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.hko.gov.hk/"
    }

    # 確保儲存資料夾存在
    os.makedirs("radar/imag", exist_ok=True)
    
    # 建立持久連線 Session
    session = requests.Session()
    session.headers.update(headers)

    # 擴大搜尋範圍：往回找 30 次 (約 3 小時內)
    for i in range(30): 
        check_time = now - datetime.timedelta(minutes=(i * 6))
        # 確保分鐘數是 6 的倍數 (0, 6, 12, 18...)
        minute = check_time.minute - (check_time.minute % 6)
        current_time = check_time.replace(minute=minute, second=0, microsecond=0)
        
        timestamp_str = current_time.strftime("%Y%m%d%H%M")
        
        # 測試近年天文台常用的 3 種 URL 格式
        urls_to_test = [
            f"https://www.hko.gov.hk/wxinfo/radars/rad_064_png/2d064iradar_{timestamp_str}.jpg", # 64km 格式
            f"https://www.hko.gov.hk/wxinfo/radars/rad_256_png/2d256iradar_{timestamp_str}.jpg", # 256km 新格式
            f"https://www.hko.gov.hk/wxinfo/radars/rad_256_png/rad256_{timestamp_str}.jpg"       # 256km 舊格式
        ]
        
        for url in urls_to_test:
            try:
                response = session.get(url, timeout=10)
                print(f"測試: {url} | 狀態碼: {response.status_code}")
                
                if response.status_code == 200:
                    # 確認抓下來的內容真的是圖片
                    if 'image' in response.headers.get('Content-Type', ''):
                        with open("radar/imag/latest_radar.png", "wb") as f:
                            f.write(response.content)
                        print(f"✅ 成功下載雷達圖: {timestamp_str}")
                        return
                    else:
                        print("⚠️ 抓到檔案，但不是圖片格式。")
                        
            except Exception as e:
                print(f"連線錯誤: {e}")
            
            # 停頓 1.5 秒，避免連續發送請求被天文台封鎖 IP
            time.sleep(1.5)
            
    print("❌ 無法獲取最新的雷達圖。")

if __name__ == "__main__":
    get_latest_radar()
