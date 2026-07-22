const fs = require('fs');

// 負責連線去官方 API 攞數據
async function fetchAPI(url) {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await response.json();
    return json.data;
}

async function main() {
    console.log("正在獲取所有巴士站資料 (Fetching stops)...");
    const kmbStopsData = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/stop');
    const ctbStopsData = await fetchAPI('https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop');

    const kmbStops = {};
    kmbStopsData.forEach(s => kmbStops[s.stop] = s);

    const ctbStops = {};
    ctbStopsData.forEach(s => ctbStops[s.stop] = s);

    console.log("正在獲取所有路線資料 (Fetching routes)...");
    const kmbRoutes = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/route/');
    const ctbRoutes = await fetchAPI('https://rt.data.gov.hk/v1/transport/citybus-nwfb/route/CTB');

    const kmbRouteDict = {};
    kmbRoutes.forEach(r => kmbRouteDict[`${r.route}-${r.bound}-${r.service_type}`] = r);

    const ctbRouteDict = {};
    ctbRoutes.forEach(r => ctbRouteDict[r.route] = r);

    console.log("正在獲取路線與車站組合 (Fetching route-stops)...");
    const kmbRS = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/route-stop');
    const ctbRS = await fetchAPI('https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB');

    const tempDict = {};

    function addToDict(tcName, item) {
        if (!tempDict[tcName]) {
            tempDict[tcName] = [];
        }
        // 避免重複加入相同嘅路線及車站
        const exists = tempDict[tcName].some(x => x.co === item.co && x.route === item.route && x.stopId === item.stopId);
        if (!exists) {
            tempDict[tcName].push(item);
        }
    }

    console.log("正在處理九巴數據 (Processing KMB)...");
    kmbRS.forEach(rs => {
        const stopId = rs.stop;
        if (!kmbStops[stopId]) return;

        const st = kmbStops[stopId];
        const rInfo = kmbRouteDict[`${rs.route}-${rs.bound}-${rs.service_type}`];

        const item = {
            co: "kmb",
            route: rs.route,
            stopId: stopId,
            name_tc: st.name_tc || '',
            name_en: st.name_en || '',
            dest_tc: rInfo ? rInfo.dest_tc : '',
            dest_en: rInfo ? rInfo.dest_en : ''
        };
        
        addToDict(st.name_tc || '未知', item);
    });

    console.log("正在處理城巴數據 (Processing CTB)...");
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

        const item = {
            co: "ctb",
            route: route,
            stopId: stopId,
            name_tc: st.name_tc || '',
            name_en: st.name_en || '',
            dest_tc: destTc,
            dest_en: destEn
        };

        addToDict(st.name_tc || '未知', item);
    });

    console.log("正在整合中英雙語站名目錄...");
    const finalDict = {};
    for (let tcName in tempDict) {
        // 搵出呢個站嘅英文名
        let firstEn = tempDict[tcName].find(x => x.name_en)?.name_en || '';
        
        // 將 JSON 嘅主目錄設定為 "中文名 / English Name" 嘅格式
        let newKey = firstEn ? `${tcName} / ${firstEn}` : tcName;
        finalDict[newKey] = tempDict[tcName];
    }

    console.log("正在儲存至 bus_dict.json (Saving)...");
    // 儲存檔案
    fs.writeFileSync('bus_dict.json', JSON.stringify(finalDict), 'utf-8');
    console.log("更新完成 (Done)!");
}

main().catch(console.error);
