const fs = require('fs');

async function main() {
    console.log("🚀 GitHub Actions 開始構建全港巴士車站總庫...");
    let busDict = {}; // 結構: { "鰂魚涌街": [ {co, route, stopId, dest} ] }

    // 1. 抓取九巴全港路線及車站配對
    try {
        console.log("🔴 正在抓取九巴車站名單...");
        let stopsRes = await fetch('https://data.etabus.gov.hk/v1/transport/kmb/stop');
        let kmbStops = await stopsRes.json();
        let kmbStopsMap = {};
        kmbStops.data.forEach(s => { kmbStopsMap[s.stop] = s.name_tc; });

        console.log("🔴 正在抓取九巴路線與車站關聯表...");
        let routeStopsRes = await fetch('https://data.etabus.gov.hk/v1/transport/kmb/route-stop');
        let kmbRouteStops = await routeStopsRes.json();

        console.log("🔴 正在抓取九巴路線目錄...");
        let routesRes = await fetch('https://data.etabus.gov.hk/v1/transport/kmb/route/');
        let kmbRoutes = await routesRes.json();
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
        console.log("🟢 九巴數據整合完成！");
    } catch(e) { console.error("❌ 九巴抓取失敗:", e); }

    // 2. 抓取城巴全港路線及車站配對 (利用分批限速請求，防被城巴 Server 封鎖)
    try {
        console.log("🟡 正在抓取城巴車站名單...");
        let ctbStopsRes = await fetch('https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop');
        let ctbStops = await ctbStopsRes.json();
        let ctbStopsMap = {};
        ctbStops.data.forEach(s => { ctbStopsMap[s.stop] = s.name_tc; });

        console.log("🟡 正在抓取城巴路線清單...");
        let ctbRoutesRes = await fetch('https://rt.data.gov.hk/v1/transport/citybus-nwfb/route/CTB');
        let ctbRoutes = await ctbRoutesRes.json();

        console.log("🟡 正在啟動後台雷達探測城巴沿途車站 (預計需時 20 秒)...");
        for (let r of ctbRoutes.data) {
            for (let dir of ['outbound', 'inbound']) {
                try {
                    let res = await fetch(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB/${r.route}/${dir}`);
                    let json = await res.json();
                    if (json && json.data) {
                        json.data.forEach(s => {
                            let stopName = ctbStopsMap[s.stop];
                            let dest = dir === 'outbound' ? r.dest_tc : r.orig_tc;
                            if (stopName) {
                                if (!busDict[stopName]) busDict[stopName] = [];
                                if (!busDict[stopName].some(x => x.co === 'ctb' && x.route === r.route && x.stopId === s.stop)) {
                                    busDict[stopName].push({ co: 'ctb', route: r.route, stopId: s.stop, dest: dest });
                                }
                            }
                        });
                    }
                } catch(err) {}
            }
            // 每秒小停頓，防止被城巴當成惡意攻擊
            await new Promise(res => setTimeout(res, 30));
        }
        console.log("🟢 城巴數據整合完成！");
    } catch(e) { console.error("❌ 城巴抓取失敗:", e); }

    // 儲存為靜態字典檔
    fs.writeFileSync('bus_dict.json', JSON.stringify(busDict, null, 2));
    console.log("🎉 bus_dict.json 成功儲存！");
}

main();