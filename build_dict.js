const fs = require('fs');

// 加入假裝瀏覽器標籤，突破政府 API 封鎖
const fetchOptions = {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

async function fetchWithRetry(url, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            let res = await fetch(url, fetchOptions);
            if (res.ok) return await res.json();
        } catch (e) {
            console.log(`[重試] 無法連接 ${url}... (第 ${i+1} 次)`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return null;
}

async function main() {
    console.log("🚀 GitHub Actions 開始構建全港巴士車站總庫...");
    let busDict = {};
    
    // 如果舊有檔案存在，先讀取作為墊底防禦，保證任何情況下都有數據
    if (fs.existsSync('bus_dict.json')) {
        try { 
            let fileData = fs.readFileSync('bus_dict.json', 'utf8');
            if (fileData.trim() !== "") {
                busDict = JSON.parse(fileData); 
            }
        } catch(e) {
            console.log("⚠️ 舊有 bus_dict.json 解析失敗，將重新建立。");
        }
    }

    // 1. 下載九巴
    console.log("🔴 開始下載九巴數據...");
    let kmbStops = await fetchWithRetry('https://data.etabus.gov.hk/v1/transport/kmb/stop');
    let kmbRouteStops = await fetchWithRetry('https://data.etabus.gov.hk/v1/transport/kmb/route-stop');
    let kmbRoutes = await fetchWithRetry('https://data.etabus.gov.hk/v1/transport/kmb/route/');

    // ✅ 嚴格檢查九巴所有數據是否齊全
    if (kmbStops && kmbStops.data && kmbRouteStops && kmbRouteStops.data && kmbRoutes && kmbRoutes.data) {
        let kmbStopsMap = {};
        kmbStops.data.forEach(s => { kmbStopsMap[s.stop] = s.name_tc; });
        let kmbRoutesMap = {};
        kmbRoutes.data.forEach(r => { kmbRoutesMap[`${r.route}_${r.bound}`] = r.dest_tc; });

        kmbRouteStops.data.forEach(item => {
            let stopName = kmbStopsMap[item.stop];
            let dest = kmbRoutesMap[`${item.route}_${item.bound}`] || "九巴目的地";
            if (stopName) {
                if (!busDict[stopName]) busDict[stopName] = [];
                // 過濾舊資料，換上最新
                busDict[stopName] = busDict[stopName].filter(x => !(x.co === 'kmb' && x.route === item.route && x.stopId === item.stop));
                busDict[stopName].push({ co: 'kmb', route: item.route, stopId: item.stop, dest: dest });
            }
        });
        console.log("🟢 九巴數據處理成功！");
    } else {
        console.log("❌ 九巴 API 暫時被封鎖或無回應，保留舊有資料。");
    }

    // 2. 下載城巴
    console.log("🟡 開始下載城巴數據...");
    let ctbStops = await fetchWithRetry('https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop');
    let ctbRoutes = await fetchWithRetry('https://rt.data.gov.hk/v1/transport/citybus-nwfb/route/CTB');
    
    // ✅ 終極安全檢查：確保 ctbStops 同 ctbRoutes 都有 .data 屬性，完全杜絕 Cannot read properties of null 錯誤！
    if (!ctbStops || !ctbStops.data || !ctbRoutes || !ctbRoutes.data || ctbRoutes.data.length === 0) {
        console.log("❌ 城巴 API 暫時被封鎖或無回應，保留舊有資料，略過城巴更新。");
    } else {
        let ctbStopsMap = {};
        ctbStops.data.forEach(s => { ctbStopsMap[s.stop] = s.name_tc; });

        let total = ctbRoutes.data.length * 2;
        let done = 0;
        for (let r of ctbRoutes.data) {
            for (let dir of ['outbound', 'inbound']) {
                let rs = await fetchWithRetry(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB/${r.route}/${dir}`, 1);
                if (rs && rs.data) {
                    rs.data.forEach(s => {
                        let stopName = ctbStopsMap[s.stop];
                        let dest = dir === 'outbound' ? r.dest_tc : r.orig_tc;
                        if (stopName) {
                            if (!busDict[stopName]) busDict[stopName] = [];
                            busDict[stopName] = busDict[stopName].filter(x => !(x.co === 'ctb' && x.route === r.route && x.stopId === s.stop));
                            busDict[stopName].push({ co: 'ctb', route: r.route, stopId: s.stop, dest: dest });
                        }
                    });
                }
                done++;
                if (done % 100 === 0) console.log(`🟡 城巴進度: ${done}/${total}...`);
                // 每次查詢後暫停 50 毫秒，防止再次被當成惡意攻擊
                await new Promise(res => setTimeout(res, 50));
            }
        }
        console.log("🟢 城巴數據處理成功！");
    }

    // 儲存為靜態字典檔
    fs.writeFileSync('bus_dict.json', JSON.stringify(busDict, null, 2));
    console.log("🎉 bus_dict.json 成功建立並儲存！");
}

main();
