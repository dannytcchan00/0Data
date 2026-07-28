import os
import requests
import datetime
import time

def get_latest_radars():
    hk_tz = datetime.timezone(datetime.timedelta(hours=8))
    now = datetime.datetime.now(hk_tz)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.9",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.hko.gov.hk/"
    }

    os.makedirs("radar/imag", exist_ok=True)
    session = requests.Session()
    session.headers.update(headers)

    valid_images = []
    
    # 擴大搜尋範圍，目標係收集 20 張有效圖片
    for i in range(100): 
        if len(valid_images) >= 20:
            break # 搵齊 20 張就停止
            
        check_time = now - datetime.timedelta(minutes=(i * 6))
        minute = check_time.minute - (check_time.minute % 6)
        current_time = check_time.replace(minute=minute, second=0, microsecond=0)
        
        timestamp_str = current_time.strftime("%Y%m%d%H%M")
        
        urls_to_test = [
            f"https://www.hko.gov.hk/wxinfo/radars/rad_064_png/2d064iradar_{timestamp_str}.jpg", 
            f"https://www.hko.gov.hk/wxinfo/radars/rad_256_png/2d256iradar_{timestamp_str}.jpg", 
            f"https://www.hko.gov.hk/wxinfo/radars/rad_256_png/rad256_{timestamp_str}.jpg"       
        ]
        
        found = False
        for url in urls_to_test:
            if found: break
            try:
                response = session.get(url, timeout=10)
                print(f"測試: {url} | 狀態碼: {response.status_code}")
                
                if response.status_code == 200 and 'image' in response.headers.get('Content-Type', ''):
                    valid_images.append((timestamp_str, response.content))
                    print(f"✅ 成功獲取: {timestamp_str}")
                    found = True
                    
            except Exception as e:
                print(f"連線錯誤: {e}")
            
            time.sleep(0.5) # 短暫停頓避免被天文台封鎖
            
    if not valid_images:
        print("❌ 無法獲取任何雷達圖。")
        return

    # 將收集到嘅圖片反轉（變成由最舊到最新），符合動畫播放順序
    valid_images.reverse()

    # 儲存為 frame_00.png 到 frame_19.png
    for index, (timestamp, content) in enumerate(valid_images):
        filename = f"radar/imag/frame_{index:02d}.png" # :02d 確保個位數前面有 0 (例如 00, 01)
        with open(filename, "wb") as f:
            f.write(content)
        print(f"💾 已儲存 {filename} (時間戳: {timestamp})")

if __name__ == "__main__":
    get_latest_radars()
