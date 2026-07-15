const fs = require('fs');

const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

// 🛡️ 三重代理輪替系統
async function fetchSmart(url) {
    // 第一重：嘗試直接連線
    try {
        let res = await fetch(url, { headers });
        if (res.ok) {
            let json = await res.json();
            if (json && json.data) return json;
        }
    } catch(e) {}

    // 第二重：CodeTabs 代理
    try {
        let res = await fetch('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url));
        if (res.ok) {
            let json = await res.json();
            if (json && json.data) return json;
        }
    } catch(e) {}

    // 第三重：AllOrigins 代理
    try {
        let res = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url));
        if (res.ok) {
            let json = await res.json();
            if (json && json.data) return json;
        }
    } catch(e) {}

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

    // --- 🔴 下載九巴 ---
    console.log("🔴 開始下載九巴數據...");
    let kmbStops = await fetchSmart('https://data.etabus.gov.hk/v1/transport/kmb/stop');
    let kmbRouteStops = await fetchSmart('https://data.etabus.gov.hk/v1/transport/kmb/route-stop');
    let kmbRoutes = await fetchSmart('https://data.etabus.gov.hk/v1/transport/kmb/route/');

    if (kmbStops && kmbRouteStops && kmbRoutes) {
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

    // --- 🟡 下載城巴 ---
    console.log("🟡 開始下載城巴數據 (慢速模式，防止被封鎖)...");
    let ctbStops = await fetchSmart('https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop');
    let ctbRoutes = await fetchSmart('https://rt.data.gov.hk/v1/transport/citybus-nwfb/route/CTB');
    
    if (!ctbStops || !ctbRoutes) {
        console.log("❌ 城巴 API 嚴重阻擋，略過城巴更新。");
    } else {
        let ctbStopsMap = {};
        ctbStops.data.forEach(s => { ctbStopsMap[s.stop] = s.name_tc; });

        let total = ctbRoutes.data.length * 2;
        let done = 0;
        for (let r of ctbRoutes.data) {
            for (let dir of ['outbound', 'inbound']) {
                let rs = await fetchSmart(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB/${r.route}/${dir}`);
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
                
                // ⚠️ 極其重要：每次請求後強制停頓 300 毫秒，保證 100% 唔會被封鎖！
                await new Promise(res => setTimeout(res, 300));
            }
        }
        console.log("🟢 城巴數據處理成功！");
    }

    // 寫入檔案
    fs.writeFileSync('bus_dict.json', JSON.stringify(busDict, null, 2));
    console.log("🎉 bus_dict.json 成功建立並儲存！");
}

main();
