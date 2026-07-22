const fs = require('fs');

// 負責連線去官方 API 攞數據，加入容錯防護
async function fetchAPI(url) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) {
            // 如果遇到 404/400/422，代表冇數據或被限制，忽略而唔好報錯死機
            if (response.status === 404 || response.status === 400 || response.status === 422) {
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        return json.data;
    } catch (e) {
        return null; // 網絡中斷都唔好死機
    }
}

async function main() {
    console.log("1. 正在獲取九巴所有車站及路線資料...");
    const kmbStopsData = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/stop') || [];
    const kmbRoutes = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/route/') || [];
    const kmbRS = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/route-stop') || [];

    const kmbStops = {};
    kmbStopsData.forEach(s => kmbStops[s.stop] = s);

    const kmbRouteDict = {};
    kmbRoutes.forEach(r => kmbRouteDict[`${r.route}-${r.bound}-${r.service_type}`] = r);

    console.log("2. 正在獲取城巴所有路線資料...");
    const ctbRoutes = await fetchAPI('https://rt.data.gov.hk/v1/transport/citybus-nwfb/route/CTB') || [];
    const ctbRouteDict = {};
    ctbRoutes.forEach(r => ctbRouteDict[r.route] = r);

    console.log("3. 正在按路線獲取城巴車站組合 (防踢批次處理中，需時約 20-30 秒)...");
    const ctbRS = [];
    const batchSize = 30; // 每次查 30 條線，避免封鎖
    for (let i = 0; i < ctbRoutes.length; i += batchSize) {
        const batch = ctbRoutes.slice(i, i + batchSize);
        const promises = batch.map(async r => {
            const outData = await fetchAPI(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB/${r.route}/outbound`);
            if (Array.isArray(outData)) ctbRS.push(...outData);
            
            const inData = await fetchAPI(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB/${r.route}/inbound`);
            if (Array.isArray(inData)) ctbRS.push(...inData);
        });
        await Promise.all(promises);
        await new Promise(resolve => setTimeout(resolve, 100)); // 停頓 0.1 秒
    }

    console.log("4. 正在獲取城巴站名 (防踢批次處理中)...");
    const uniqueCtbStops = [...new Set(ctbRS.map(rs => rs.stop))];
    const ctbStops = {};
    
    for (let i = 0; i < uniqueCtbStops.length; i += batchSize) {
        const batch = uniqueCtbStops.slice(i, i + batchSize);
        const promises = batch.map(async stopId => {
            const stopData = await fetchAPI(`https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop/${stopId}`);
            if (stopData && !Array.isArray(stopData)) ctbStops[stopId] = stopData;
        });
        await Promise.all(promises);
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const tempDict = {};

    function addToDict(tcName, item) {
        if (!tcName) return;
        if (!tempDict[tcName]) tempDict[tcName] = [];
        const exists = tempDict[tcName].some(x => x.co === item.co && x.route === item.route && x.stopId === item.stopId);
        if (!exists) tempDict[tcName].push(item);
    }

    console.log("5. 正在處理九巴數據...");
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

    console.log("6. 正在處理城巴數據...");
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

    console.log("7. 正在整合中英雙語站名目錄...");
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
