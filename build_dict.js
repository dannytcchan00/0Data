const fs = require('fs');

const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

// 自帶重試與防封鎖延遲嘅請求功能
async function fetchAPI(url, delayMs = 0) {
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    for (let i = 0; i < 3; i++) {
        try {
            let res = await fetch(url, { headers });
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
    
    // --- 🔴 下載九巴 (一次過下載模式) ---
    console.log("🔴 開始下載九巴數據...");
    let kmbStops = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/stop');
    let kmbRouteStops = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/route-stop');
    let kmbRoutes = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/route/');

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
                if (!busDict[stopName].some(x => x.co === 'kmb' && x.route === item.route && x.stopId === item.stop)) {
                    busDict[stopName].push({ co: 'kmb', route: item.route, stopId: item.stop, dest: dest });
                }
            }
        });
        console.log("🟢 九巴數據處理成功！");
    }

    // --- 🟡 下載城巴 (逐站查問模式) ---
    console.log("🟡 開始下載城巴數據...");
    let ctbRoutes = await fetchAPI('https://rt.data.gov.hk/v1/transport/citybus-nwfb/route/CTB');
    
    if (ctbRoutes && ctbRoutes.data) {
        let total = ctbRoutes.data.length * 2;
        let count = 0;
        let ctbStopNameCache = {}; // 記憶體：記低問過嘅城巴站名，極大提升速度

        for (let r of ctbRoutes.data) {
            for (let dir of ['outbound', 'inbound']) {
                let rs = await fetchAPI(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB/${r.route}/${dir}`, 20);
                
                if (rs && rs.data) {
                    for (let s of rs.data) {
                        let stopId = s.stop;
                        let stopName = ctbStopNameCache[stopId];
                        
                        // 🔑 破解關鍵：如果呢個車站未查過名，就逐個去向 API 查問！
                        if (!stopName) {
                            let stopInfo = await fetchAPI(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop/${stopId}`, 20);
                            if (stopInfo && stopInfo.data && stopInfo.data.name_tc) {
                                stopName = stopInfo.data.name_tc;
                                ctbStopNameCache[stopId] = stopName; // 查完記低佢
                            } else {
                                stopName = `城巴車站 ${stopId}`;
                            }
                        }

                        let dest = dir === 'outbound' ? r.dest_tc : r.orig_tc;
                        if (stopName) {
                            if (!busDict[stopName]) busDict[stopName] = [];
                            if (!busDict[stopName].some(x => x.co === 'ctb' && x.route === r.route && x.stopId === stopId)) {
                                busDict[stopName].push({ co: 'ctb', route: r.route, stopId: stopId, dest: dest });
                            }
                        }
                    }
                }
                count++;
                if (count % 20 === 0) console.log(`🟡 城巴進度: ${count}/${total}...`);
            }
        }
        console.log("🟢 城巴數據處理成功！");
    }

    // 寫入最終檔案
    fs.writeFileSync('bus_dict.json', JSON.stringify(busDict, null, 2));
    console.log("🎉 bus_dict.json 成功建立並儲存！");
}

main();
