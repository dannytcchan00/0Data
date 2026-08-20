// globals.js

Chart.defaults.color = '#9e9e9e';
Chart.defaults.font.family = "'Inter', sans-serif";

let nineDayForecastData = [];
let globalWxState = { temp: NaN, hum: NaN, uv: 0, psr: '低', psrRaw: '' };
let activeSwtList = [];
let meteoCache = {}; 
let currentThreatState = {}; 
let windChartInstance = null; 
let stationChartInstance = null;
let rainChartInstance = null;
let stationMasterData = {};
let globalLatestTcDist = null;
let globalMaxRain = 0;

const mapSources = {
    'temp': 'https://dannytcchan00.github.io/0Data/data/temp_data.csv',
    'maxmin': 'https://dannytcchan00.github.io/0Data/data/maxmin_data.csv',
    'wind': 'https://dannytcchan00.github.io/0Data/data/wind_data.csv',
    'pressure': 'https://dannytcchan00.github.io/0Data/data/pressure_data.csv',
    'tide': 'https://dannytcchan00.github.io/0Data/data/tide_data.csv',
    'visibility': 'https://dannytcchan00.github.io/0Data/data/visibility_data.csv'
};

const tcXmlSource = 'https://dannytcchan00.github.io/0Data/data/tc_list.xml';
const tcKmlSource = 'https://dannytcchan00.github.io/0Data/data/ncdr_typhoon.kml';

const hkCoordinates = {
    "京士柏": [22.311, 114.173], "香港天文台": [22.302, 114.174], "天文台": [22.302, 114.174], "黃竹坑": [22.248, 114.173],
    "打鼓嶺": [22.528, 114.156], "流浮山": [22.468, 113.983], "大埔": [22.446, 114.178],
    "沙田": [22.402, 114.207], "屯門": [22.390, 113.966], "將軍澳": [22.315, 114.259],
    "西貢": [22.383, 114.274], "長洲": [22.201, 114.026], "赤鱲角": [22.311, 113.922],
    "青衣": [22.348, 114.107], "石崗": [22.436, 114.084], "大老山": [22.358, 114.223],
    "坪洲": [22.284, 114.038], "大美督": [22.473, 114.238], "啟德": [22.305, 114.216], "啟德跑道公園": [22.305, 114.216],
    "九龍城": [22.331, 114.191], "跑馬地": [22.271, 114.182], "黃大仙": [22.341, 114.194],
    "赤柱": [22.218, 114.214], "觀塘": [22.315, 114.224], "深水埗": [22.329, 114.162],
    "荃灣": [22.381, 114.119], "荃灣可觀": [22.381, 114.119], "荃灣城門谷": [22.375, 114.128],
    "元朗": [22.441, 114.018], "元朗公園": [22.441, 114.018], "大帽山": [22.411, 114.107],
    "橫瀾島": [22.182, 114.301], "中環": [22.283, 114.158], "中西區": [22.283, 114.158], "香港公園": [22.277, 114.161],
    "筲箕灣": [22.278, 114.227], "九龍灣": [22.323, 114.211], "大澳": [22.254, 113.862],
    "昂坪": [22.255, 113.908], "大埔滘": [22.426, 114.183], "塔門": [22.471, 114.360],
    "滘西洲": [22.373, 114.314], "北角": [22.292, 114.202], "大嶼山": [22.253, 113.931],
    "大水坑": [22.408, 114.221], "石壁": [22.228, 113.896]
};

const stationEnglishNames = {
    "京士柏": "King's Park", "香港天文台": "HKO", "天文台": "HKO", "黃竹坑": "W.C.H.", "打鼓嶺": "Ta Kwu Ling", 
    "流浮山": "Lau Fau Shan", "大埔": "Tai Po", "沙田": "Sha Tin", "屯門": "Tuen Mun", 
    "將軍澳": "T.K.O.", "西貢": "Sai Kung", "長洲": "Cheung Chau", "赤鱲角": "Airport",
    "青衣": "Tsing Yi", "石崗": "Shek Kong", "大老山": "Tate's Cairn", "坪洲": "Peng Chau", 
    "大美督": "Tai Mei Tuk", "啟德": "Kai Tak", "九龍城": "Kowloon City", "跑馬地": "Happy Valley", 
    "黃大仙": "Wong Tai Sin", "赤柱": "Stanley", "觀塘": "Kwun Tong", "深水埗": "Sham Shui Po",
    "荃灣": "Tsuen Wan", "元朗": "Yuen Long", "大帽山": "Tai Mo Shan", "橫瀾島": "Waglan Island", 
    "中環": "Central", "香港公園": "HK Park", "筲箕灣": "Shau Kei Wan", "九龍灣": "Kowloon Bay", 
    "大澳": "Tai O", "昂坪": "Ngong Ping", "大埔滘": "Tai Po Kau", "塔門": "Tap Mun",
    "滘西洲": "Kau Sai Chau", "北角": "North Point", "大嶼山": "Lantau", "大水坑": "Tai Shui Hang", 
    "石壁": "Shek Pik"
};

const weatherTermTranslations = [
    {c: "無定向風", e: "VRB"}, {c: "冇定向風", e: "VRB"}, {c: "無定向", e: "VRB"}, {c: "冇定向", e: "VRB"},
    {c: "無方向", e: "VRB"}, {c: "變向", e: "VRB"}, {c: "北北東", e: "NNE"}, {c: "東北東", e: "ENE"}, 
    {c: "東南東", e: "ESE"}, {c: "南南東", e: "SSE"}, {c: "南南西", e: "SSW"}, {c: "西南西", e: "WSW"}, 
    {c: "西北西", e: "WNW"}, {c: "北北西", e: "NNW"}, {c: "無風", e: "Calm"}, {c: "靜止", e: "Calm"}, 
    {c: "陣風", e: "Gust"}, {c: "微風", e: "Light"}, {c: "清勁", e: "Fresh"}, {c: "強風", e: "Strong"}, 
    {c: "烈風", e: "Gale"}, {c: "暴風", e: "Storm"}, {c: "颶風", e: "Hurricane"}, {c: "東北", e: "NE"}, 
    {c: "東南", e: "SE"}, {c: "西南", e: "SW"}, {c: "西北", e: "NW"}, {c: "北", e: "N"}, 
    {c: "東", e: "E"}, {c: "南", e: "S"}, {c: "西", e: "W"}
];

const themeColors = { blue: '#3498db', green: '#2ecc71', orange: '#f39c12', red: '#e74c3c', gray: '#7f8c8d', purple: '#9b59b6' };
const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

// 初始化地圖 (中心點設於大嶼山 Zoom 9，確保能一眼看清香港與澳門)
const hkoCenter = [22.302, 114.174];
let hkoCenterPin = L.divIcon({ className: '', html: `<div style="background:#222; color:#fff; font-size:0.65rem; font-weight:700; padding:1px 4px; border-radius:4px; border:1px solid rgba(255,255,255,0.3); box-shadow: 0 4px 6px rgba(0,0,0,0.5);">香港天文台</div>`, iconAnchor: [12, 8] });
const hkBoundsLocal = L.latLngBounds([ [21.58, 113.39], [23.02, 114.95] ]);
const hkoBounds1200 = L.latLng(hkoCenter).toBounds(2400000);

let map = L.map('hk-map', { maxBounds: hkBoundsLocal, maxBoundsViscosity: 1.0, minZoom: 8, preferCanvas: true }).setView([22.25, 113.90], 9);
L.tileLayer(darkTileUrl, { attribution: '&copy; OSM', maxZoom: 18, crossOrigin: true }).addTo(map);
let dataLayerGroup = L.layerGroup().addTo(map);

let tcMapHko = L.map('tc-map-hko', { minZoom: 3, maxZoom: 10, zoomControl: false, preferCanvas: true });
L.tileLayer(darkTileUrl, { attribution: '&copy; OSM', maxZoom: 18, crossOrigin: true }).addTo(tcMapHko);
let tcHkoLayerGroup = L.layerGroup().addTo(tcMapHko);
L.marker(hkoCenter, {icon: hkoCenterPin}).addTo(tcMapHko);

let tcMapAgency = L.map('tc-map-agency', { minZoom: 3, maxZoom: 10, zoomControl: false, preferCanvas: true });
L.tileLayer(darkTileUrl, { attribution: '&copy; OSM', maxZoom: 18, crossOrigin: true }).addTo(tcMapAgency);
let tcAgencyLayerGroup = L.layerGroup().addTo(tcMapAgency);
L.marker(hkoCenter, {icon: hkoCenterPin}).addTo(tcMapAgency);

// 公用輔助函數
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
}

function parseCSVLine(text) {
    let ret = [], keep = false, item = '';
    for(let i=0; i<text.length; i++) {
        if(text[i] === '"') { keep = !keep; }
        else if(text[i] === ',' && !keep) { ret.push(item.trim()); item = ''; }
        else { item += text[i]; }
    }
    ret.push(item.trim()); return ret;
}

function getWindAngle(translatedTextArr) {
    let combined = translatedTextArr.join(' ').toUpperCase(); let angle = null;
    if (combined.includes('NNE') || combined.includes('北北東')) angle = 22.5; else if (combined.includes('ENE') || combined.includes('東北東')) angle = 67.5; else if (combined.includes('ESE') || combined.includes('東南東')) angle = 112.5; else if (combined.includes('SSE') || combined.includes('南南東')) angle = 157.5; else if (combined.includes('SSW') || combined.includes('南南西')) angle = 202.5; else if (combined.includes('WSW') || combined.includes('西南西')) angle = 247.5; else if (combined.includes('WNW') || combined.includes('西北西')) angle = 292.5; else if (combined.includes('NNW') || combined.includes('北北西')) angle = 337.5; else if (combined.includes('NE') || combined.includes('東北')) angle = 45; else if (combined.includes('SE') || combined.includes('東南')) angle = 135; else if (combined.includes('SW') || combined.includes('西南')) angle = 225; else if (combined.includes('NW') || combined.includes('西北')) angle = 315; else if (combined.includes('N') || combined.includes('北')) angle = 0; else if (combined.includes('E') || combined.includes('東')) angle = 90; else if (combined.includes('S') || combined.includes('南')) angle = 180; else if (combined.includes('W') || combined.includes('西')) angle = 270;
    return angle !== null ? (angle + 180) % 360 : null;
}

function getTempColor(val) {
    if(isNaN(val)) return themeColors.gray;
    if(val >= 33) return themeColors.red;
    if(val >= 28) return themeColors.orange;
    if(val >= 20) return themeColors.green;
    if(val >= 13) return themeColors.blue;
    return themeColors.purple;
}

function getTempLevelInfo(val) {
    if (isNaN(val)) return { level: 1, color: '#9e9e9e', badgeBg: 'rgba(255,255,255,0.05)', name: '未知' };
    if (val >= 33) return { level: 5, color: '#e74c3c', badgeBg: 'rgba(231,76,60,0.15)', name: '酷熱' };
    if (val >= 28) return { level: 4, color: '#e67e22', badgeBg: 'rgba(230,126,34,0.15)', name: '炎熱' };
    if (val >= 20) return { level: 3, color: '#2ecc71', badgeBg: 'rgba(46,204,113,0.15)', name: '溫暖' };
    if (val >= 13) return { level: 2, color: '#3498db', badgeBg: 'rgba(52,152,219,0.15)', name: '清涼' };
    return { level: 1, color: '#9b59b6', badgeBg: 'rgba(155,89,182,0.15)', name: '寒冷' };
}

function degreesToCompass(deg) {
    if (deg === null || isNaN(deg)) return { dir: '無定向', arrow: '•' };
    const sectors = ['北', '北北東', '東北', '東北東', '東', '東南東', '東南', '南南東', '南', '南南西', '西南', '西南西', '西', '西北西', '西北', '北北西'];
    const arrows = ['⬇', '↙', '↙', '⬅', '⬅', '↖', '↖', '⬆', '⬆', '↗', '↗', '➡', '➡', '↘', '↘', '⬇'];
    let idx = Math.round(deg / 22.5) % 16;
    return { dir: sectors[idx], arrow: arrows[idx] };
}
