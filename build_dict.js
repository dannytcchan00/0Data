const fs = require('fs');

// 加入多重重試與 Proxy (代理) 繞過政府 API 封鎖
async function fetchWithRetry(url, retries = 4) {
    for (let i = 0; i < retries; i++) {
        // 第一招：正常連線，但假裝自己係普通電腦 (User-Agent)
        try {
            let res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
            if (res.ok) return await res.json();
        } catch(e) {}
        
        // 第二招：如果政府 API Block 咗 GitHub IP，自動轉用 Proxy 兜路！
        try {
            let proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            let res = await fetch(proxyUrl);
            if (res.ok) return await res.json();
        } catch(e) {}
        
        // 失敗就等 1 秒再試
        await new Promise(r => setTimeout(r, 1000));
    }
    return null;
}

async function main() {
    console.log("🚀 GitHub Actions 開始構建全港巴士車站總庫...");
    let busDict = {};
    
    // 如果舊有檔案存在，先讀取作為墊底防禦
    if (fs.existsSync('bus_dict.json')) {
        try { 
            let fileData = fs.readFileSync('bus_dict.json', 'utf8');
            if (fileData.trim() !== "") busDict = JSON.parse(fileData); 
        } catch(e) {}
    }

    // 1. 下載九巴
    console.log("🔴 開始下載九巴數據...");
    let kmbStops = await fetchWithRetry('https://data.etabus.gov.hk/v1/transport/kmb/stop');
    let kmbRouteStops = await fetchWithRetry('https://data.etabus.gov.hk/v1/transport/kmb/route-stop');
    let kmbRoutes = await fetchWithRetry('https://data.etabus.gov.hk/v1/transport/kmb/route/');

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
                busDict[stopName] = busDict[stopName].filter(x => !(x.co === 'kmb' && x.route === item.route && x.stopId === item.stop));
                busDict[stopName].push({ co: 'kmb', route: item.route, stopId: item.stop, dest: dest });
            }
        });
        console.log("🟢 九巴數據處理成功！");
    }

    // 2. 下載城巴
    console.log("🟡 開始下載城巴數據...");
    let ctbStops = await fetchWithRetry('https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop');
    let ctbRoutes = await fetchWithRetry('https://rt.data.gov.hk/v1/transport/citybus-nwfb/route/CTB');
    
    // 嚴格檢查，如果有任何資料唔齊，就唔好去覆寫城巴數據！
    if (!ctbStops || !ctbStops.data || !ctbRoutes || !ctbRoutes.data || ctbRoutes.data.length === 0) {
        console.log("❌ 城巴 API 暫時被封鎖，將保留舊有資料庫，以防網頁出錯。");
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
                if (done % 50 === 0) console.log(`🟡 城巴進度: ${done}/${total}...`);
                // 加入 100 毫秒延遲，保證連線暢通
                await new Promise(res => setTimeout(res, 100));
            }
        }
        console.log("🟢 城巴數據處理成功！");
    }

    // 寫入最終檔案
    fs.writeFileSync('bus_dict.json', JSON.stringify(busDict, null, 2));
    console.log("🎉 bus_dict.json 成功建立並儲存！");
}

main();
