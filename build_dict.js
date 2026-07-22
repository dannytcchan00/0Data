const fs = require('fs');

async function fetchAPI(url) {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await response.json();
    return json.data;
}

async function main() {
    console.log("Fetching stops...");
    const kmbStopsData = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/stop');
    const ctbStopsData = await fetchAPI('https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop');

    const kmbStops = {};
    kmbStopsData.forEach(s => kmbStops[s.stop] = s);

    const ctbStops = {};
    ctbStopsData.forEach(s => ctbStops[s.stop] = s);

    console.log("Fetching routes...");
    const kmbRoutes = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/route/');
    const ctbRoutes = await fetchAPI('https://rt.data.gov.hk/v1/transport/citybus-nwfb/route/CTB');

    const kmbRouteDict = {};
    kmbRoutes.forEach(r => kmbRouteDict[`${r.route}-${r.bound}-${r.service_type}`] = r);

    const ctbRouteDict = {};
    ctbRoutes.forEach(r => ctbRouteDict[r.route] = r);

    console.log("Fetching route-stops...");
    const kmbRS = await fetchAPI('https://data.etabus.gov.hk/v1/transport/kmb/route-stop');
    const ctbRS = await fetchAPI('https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB');

    const busDict = {};

    function addToDict(keyName, item) {
        if (!busDict[keyName]) {
            busDict[keyName] = [];
        }
        const exists = busDict[keyName].some(x => x.co === item.co && x.route === item.route && x.stopId === item.stopId);
        if (!exists) {
            busDict[keyName].push(item);
        }
    }

    console.log("Processing KMB...");
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
        
        const keyName = st.name_tc || '未知';
        addToDict(keyName, item);
    });

    console.log("Processing CTB...");
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

        const keyName = st.name_tc || '未知';
        addToDict(keyName, item);
    });

    console.log("Saving to bus_dict.json...");
    fs.writeFileSync('bus_dict.json', JSON.stringify(busDict), 'utf-8');
    console.log("Done!");
}

main().catch(console.error);
