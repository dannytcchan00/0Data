const fs = require('fs');

// 負責連線去官方 API 攞數據，加入錯誤捕捉
async function fetchAPI(url) {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(`連線失敗 HTTP error! status: ${response.status} URL: ${url}`);
    const json = await response.json();
    return json.data;
}

async function main() {
    console.log("1. 正在獲取所有路線資料...");
    const kmbRoutes = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/route/');
    const ctbRoutes = await fetchAPI('https://rt.data.gov.hk/v1/transport/citybus-nwfb/route/CTB');

    const kmbRouteDict = {};
    kmbRoutes.forEach(r => kmbRouteDict[`${r.route}-${r.bound}-${r.service_type}`] = r);
    const ctbRouteDict = {};
    ctbRoutes.forEach(r => ctbRouteDict[r.route] = r);

    console.log("2. 正在獲取路線與車站組合...");
    const kmbRS = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/route-stop');
    const ctbRS = await fetchAPI('https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB');

    console.log("3. 正在獲取九巴所有車站資料...");
    const kmbStopsData = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/stop');
    const kmbStops = {};
    kmbStopsData.forEach(s => kmbStops[s.stop] = s);

    console.log("4. 正在獲取城巴車站資料 (防踢批次處理中)...");
    // 抽出所有獨立嘅城巴站 ID
    const uniqueCtbStops = [...new Set(ctbRS.map(rs => rs.stop))];
    const ctbStops = {};
    
    // 將城巴站斬件，每 50 個一組咁去問 Server 攞中英文名，避免被 Timeout 封鎖
    const batchSize = 50;
    for (let i = 0; i < uniqueCtbStops.length; i += batchSize) {
        const batch = uniqueCtbStops.slice(i, i + batchSize);
        const promises = batch.map(async stopId => {
            try {
                const res = await fetch(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop/${stopId}`);
                const json = await res.json();
                if (json && json.data) ctbStops[stopId] = json.data;
            } catch (e) {
                console.log(`無法獲取城巴車站: ${stopId}`);
            }
        });
        await Promise.all(promises);
        // 停頓 100 毫秒，防止請求過快
        await new Promise(r => setTimeout(r, 100));
    }
    console.log(`✅ 成功獲取 ${Object.keys(ctbStops).length} 個城巴車站。`);

    const tempDict = {};
    function addToDict(tcName, item) {
        if (!tcName) return;
        if (!tempDict[tcName]) tempDict[tcName] = [];
        const exists = tempDict[tcName].some(x => x.co === item.co && x.route === item.route && x.stopId === item.stopId);
        if (!exists) tempDict[tcName].push(item);
    }

    console.log("5. 正在整合九巴數據...");
    kmbRS.forEach(rs => {
        const stopId = rs.stop;
        if (!kmbStops[stopId]) return;

        const st = kmbStops[stopId];
        const rInfo = kmbRouteDict[`${rs.route}-${rs.bound}-${rs.service_type}`];

        addToDict(st.name_tc, {
            co: "kmb",
            route: rs.route,
            stopId: stopId,
            name_tc: st.name_tc || '',
            name_en: st.name_en || '',
            dest_tc: rInfo ? rInfo.dest_tc : '',
            dest_en: rInfo ? rInfo.dest_en : ''
        });
    });

    console.log("6. 正在整合城巴數據...");
    ctbRS.forEach(rs => {
        const stopId = rs.stop;
        if (!ctbStops[stopId]) return;

        const st = ctbStops[stopId];
        const route = rs.route;
        const bound = rs.dir || 'outbound';

        const rInfo = ctbRouteDict[route];
        let destTc = '', destEn = '';
        if (rInfo) {
            destTc = bound === 'inbound' ? rInfo.orig_tc : rInfo.dest_tc;
            destEn = bound === 'inbound' ? rInfo.orig_en : rInfo.dest_en;
        }

        addToDict(st.name_tc, {
            co: "ctb",
            route: route,
            stopId: stopId,
            name_tc: st.name_tc || '',
            name_en: st.name_en || '',
            dest_tc: destTc,
            dest_en: destEn
        });
    });

    console.log("7. 正在生成中英雙語大目錄...");
    const finalDict = {};
    for (let tcName in tempDict) {
        let firstEn = tempDict[tcName].find(x => x.name_en)?.name_en || '';
        let newKey = firstEn ? `${tcName} / ${firstEn}` : tcName;
        finalDict[newKey] = tempDict[tcName];
    }

    console.log("8. 正在儲存至 bus_dict.json...");
    fs.writeFileSync('bus_dict.json', JSON.stringify(finalDict), 'utf-8');
    console.log("✅ 整個更新程序順利完成！");
}

main().catch(err => {
    console.error("❌ 發生嚴重錯誤:", err);
    process.exit(1); 
});
