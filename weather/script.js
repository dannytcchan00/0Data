// 終極防彈版 script.js
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
let radarFrames = [];
let radarIdx = 0;
let radarInterval = null;
let isRadarPlaying = true;
let currentRadarRange = '256'; 

// 颱風專用變數
let globalParsedAgencyTracks = {}; 
let currentSelectedAgency = 'ALL'; 

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
const agencyColorPalette = { 'JTWC': '#9b59b6', 'JMA': '#f1c40f', 'NMC': '#2ecc71', 'CWA': '#e67e22', 'PAGASA': '#e84393', 'OTHER': '#9e9e9e' };
const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

// 天氣警告代碼字典 (之前漏咗，今次已補回)
const warningDetailsDb = {
    "WT": { name: "雷暴警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/ts.png", meaning: "雷暴正在發生或預料在短期內影響香港境內。", precautions: ["留在室內安全地方", "提防猛烈陣風"] },
    "WRA": { name: "黃色暴雨警告信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/rainamber.png", meaning: "每小時雨量超過30毫米的大雨。", precautions: ["低窪地帶可能水浸", "遠離河道"] },
    "WRR": { name: "紅色暴雨警告信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/rainred.png", meaning: "每小時雨量超過50毫米的暴雨。", precautions: ["留在安全地方", "切勿涉水穿過水浸道路"] },
    "WRB": { name: "黑色暴雨警告信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/rainblack.png", meaning: "每小時雨量超過70毫米的特大暴雨。", precautions: ["留在室內避難", "暫停戶外工作"] },
    "TC1": { name: "一號戒備信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc1.png", meaning: "熱帶氣旋集結於香港約800公里內。", precautions: ["留意風暴路徑"] },
    "TC3": { name: "三號強風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc3.png", meaning: "普遍吹強風，持續風速達41-62 km/h。", precautions: ["綁緊易被風吹倒的物件", "停止水上活動"] },
    "TC8NE": { name: "八號東北烈風或暴風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc08ne.png", meaning: "普遍吹東北烈風或暴風。", precautions: ["立即返家", "鎖緊門窗"] },
    "TC8NW": { name: "八號西北烈風或暴風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc08nw.png", meaning: "普遍吹西北烈風或暴風。", precautions: ["立即返家", "鎖緊門窗"] },
    "TC8SE": { name: "八號東南烈風或暴風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc08se.png", meaning: "普遍吹東南烈風或暴風。", precautions: ["遠離沿岸", "嚴防湧浪"] },
    "TC8SW": { name: "八號西南烈風或暴風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc08sw.png", meaning: "普遍吹西南烈風或暴風。", precautions: ["遠離沿岸", "嚴防湧浪"] },
    "TC9": { name: "九號烈風或暴風風力增強信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc09.png", meaning: "風力顯著增強，颶風可能吹襲。", precautions: ["切勿外出"] },
    "TC10": { name: "十號颶風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc10.png", meaning: "颶風正橫過本港，破壞力極大。", precautions: ["留在堅固建築物深處"] },
    "WHOT": { name: "酷熱天氣警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/hot.png", meaning: "氣溫高達33°C或以上，極易中暑。", precautions: ["多喝水", "避免暴曬"] },
    "WCOLD": { name: "寒冷天氣警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/cold.png", meaning: "氣溫降至12°C或以下。", precautions: ["增添保暖衣物"] },
    "WLS": { name: "山泥傾瀉警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/ls.png", meaning: "發生山泥傾瀉風險極高。", precautions: ["遠離陡峭斜坡"] },
    "WNF": { name: "新界北部水浸特別報告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/northflood.png", meaning: "低窪農地可能嚴重水浸。", precautions: ["切勿強行駛過水浸路段"] },
    "SMS": { name: "強烈季候風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/sms.png", meaning: "普遍吹強風。", precautions: ["海面有大浪，遠離岸邊"] },
    "WFIREY": { name: "黃色火災危險警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/fireyellow.png", meaning: "火災危險性偏高。", precautions: ["小心用火"] },
    "WFIRER": { name: "紅色火災危險警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/firered.png", meaning: "火災危險性極高。", precautions: ["嚴禁生火"] },
    "WFROST": { name: "霜凍警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/frost.png", meaning: "高地或新界可能出現結霜。", precautions: ["做好防寒"] },
    "WTSUN": { name: "海嘯警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tsunami.png", meaning: "海嘯預料抵達本港。", precautions: ["前往高處避難"] }
};

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

// 工具函數區
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function parseCSVLine(text) {
    let ret = [], keep = false, item = '';
    for(let i=0; i<text.length; i++) { if(text[i] === '"') { keep = !keep; } else if(text[i] === ',' && !keep) { ret.push(item.trim()); item = ''; } else { item += text[i]; } }
    ret.push(item.trim()); return ret;
}

function getWindAngle(translatedTextArr) {
    let combined = translatedTextArr.join(' ').toUpperCase(); let angle = null;
    if (combined.includes('NNE') || combined.includes('北北東')) angle = 22.5; else if (combined.includes('ENE') || combined.includes('東北東')) angle = 67.5; else if (combined.includes('ESE') || combined.includes('東南東')) angle = 112.5; else if (combined.includes('SSE') || combined.includes('南南東')) angle = 157.5; else if (combined.includes('SSW') || combined.includes('南南西')) angle = 202.5; else if (combined.includes('WSW') || combined.includes('西南西')) angle = 247.5; else if (combined.includes('WNW') || combined.includes('西北西')) angle = 292.5; else if (combined.includes('NNW') || combined.includes('北北西')) angle = 337.5; else if (combined.includes('NE') || combined.includes('東北')) angle = 45; else if (combined.includes('SE') || combined.includes('東南')) angle = 135; else if (combined.includes('SW') || combined.includes('西南')) angle = 225; else if (combined.includes('NW') || combined.includes('西北')) angle = 315; else if (combined.includes('N') || combined.includes('北')) angle = 0; else if (combined.includes('E') || combined.includes('東')) angle = 90; else if (combined.includes('S') || combined.includes('南')) angle = 180; else if (combined.includes('W') || combined.includes('西')) angle = 270;
    return angle !== null ? (angle + 180) % 360 : null;
}

function getTempColor(val) {
    if(isNaN(val)) return themeColors.gray;
    if(val >= 33) return themeColors.red; if(val >= 28) return themeColors.orange; if(val >= 20) return themeColors.green; if(val >= 13) return themeColors.blue; return themeColors.purple;
}

function getTempLevelInfo(val) {
    if (isNaN(val)) return { level: 1, color: '#9e9e9e', badgeBg: 'rgba(255,255,255,0.05)', name: '未知' };
    if (val >= 33) return { level: 5, color: '#e74c3c', badgeBg: 'rgba(231,76,60,0.15)', name: '酷熱' };
    if (val >= 28) return { level: 4, color: '#e67e22', badgeBg: 'rgba(230,126,34,0.15)', name: '炎熱' };
    if (val >= 20) return { level: 3, color: '#2ecc71', badgeBg: 'rgba(46,204,113,0.15)', name: '溫暖' };
    if (val >= 13) return { level: 2, color: '#3498db', badgeBg: 'rgba(52,152,219,0.15)', name: '清涼' };
    return { level: 1, color: '#9b59b6', badgeBg: 'rgba(155,89,182,0.15)', name: '寒冷' };
}

function getWindLevelInfo(speed) {
    if (speed >= 88) return { level: 5, color: '#e74c3c', badgeBg: 'rgba(231,76,60,0.15)', name: '暴風/颶風' };
    if (speed >= 63) return { level: 4, color: '#e67e22', badgeBg: 'rgba(230,126,34,0.15)', name: '烈風' };
    if (speed >= 41) return { level: 3, color: '#f39c12', badgeBg: 'rgba(243,156,18,0.15)', name: '強風' };
    if (speed >= 15) return { level: 2, color: '#2ecc71', badgeBg: 'rgba(46,204,113,0.15)', name: '清勁' };
    if (speed > 0) return { level: 1, color: '#3498db', badgeBg: 'rgba(52,152,219,0.15)', name: '微風' };
    return { level: 1, color: '#9e9e9e', badgeBg: 'rgba(255,255,255,0.05)', name: '靜止' };
}

function degreesToCompass(deg) {
    if (deg === null || isNaN(deg)) return { dir: '無定向', arrow: '•' };
    const sectors = ['北', '北北東', '東北', '東北東', '東', '東南東', '東南', '南南東', '南', '南南西', '西南', '西南西', '西', '西北西', '西北', '北北西'];
    const arrows = ['⬇', '↙', '↙', '⬅', '⬅', '↖', '↖', '⬆', '⬆', '↗', '↗', '➡', '➡', '↘', '↘', '⬇'];
    let idx = Math.round(deg / 22.5) % 16; return { dir: sectors[idx], arrow: arrows[idx] };
}

function getRainLevel(rainVal) {
    if (rainVal >= 70) return { level: 5, color: '#e74c3c', badgeBg: 'rgba(231,76,60,0.15)', name: '黑雨級別特大暴雨', desc: '極度危險水浸' };
    if (rainVal >= 50) return { level: 4, color: '#e67e22', badgeBg: 'rgba(230,126,34,0.15)', name: '紅雨級別大暴雨', desc: '嚴重水浸風險' };
    if (rainVal >= 30) return { level: 3, color: '#f39c12', badgeBg: 'rgba(243,156,18,0.15)', name: '黃雨級別大雨', desc: '低窪地區水浸' };
    if (rainVal >= 15) return { level: 2, color: '#2ecc71', badgeBg: 'rgba(46,204,113,0.15)', name: '中雨至大雨', desc: '局部地區驟雨' };
    if (rainVal > 0) return { level: 1, color: '#3498db', badgeBg: 'rgba(52,152,219,0.15)', name: '微雨', desc: '輕微降雨' };
    return { level: 1, color: '#9e9e9e', badgeBg: 'rgba(255,255,255,0.05)', name: '無雨', desc: '未有降雨' };
}

function getOffsetLatLng(lat, lon, distanceMeters, bearingDegrees) {
    const rad = bearingDegrees * Math.PI / 180;
    const deltaLat = (distanceMeters * Math.cos(rad)) / 111320;
    const deltaLon = (distanceMeters * Math.sin(rad)) / (111320 * Math.cos(lat * Math.PI / 180));
    return [lat + deltaLat, lon + deltaLon];
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const phi1 = lat1 * Math.PI / 180, phi2 = lat2 * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function hexToRgba(hex, opacity) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function getDirectChildName(node) {
    if(!node) return '';
    for (let i = 0; i < node.childNodes.length; i++) {
        if (node.childNodes[i].nodeType === 1 && node.childNodes[i].tagName.toLowerCase() === 'name') {
            return node.childNodes[i].textContent.trim();
        }
    }
    return '';
}

// 介面控制與模態框
function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
}
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('active'); });
});

function openThreatInfoModal() { document.getElementById('threat-info-modal')?.classList.add('active'); }
function openLifestyleInfoModal() { document.getElementById('lifestyle-info-modal')?.classList.add('active'); }
function openTempInfoModal() { document.getElementById('temp-info-modal')?.classList.add('active'); }
function openRainInfoModal() { document.getElementById('rain-info-modal')?.classList.add('active'); }
function openWindInfoModal() { document.getElementById('wind-info-modal')?.classList.add('active'); }

function getLunarDate() {
    try {
        let formatter = new Intl.DateTimeFormat('zh-HK-u-ca-chinese', { timeZone: 'Asia/Hong_Kong', month: 'long', day: 'numeric' });
        return formatter.format(new Date());
    } catch (e) { return ''; }
}

function updateTick() {
    const now = new Date(); let utcMs = now.getTime(); let hktMs = utcMs + (8 * 3600000); let d = new Date(hktMs); 
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const m = d.getUTCMonth() + 1;
    document.getElementById('current-date').innerText = `${d.getUTCFullYear()}年${m}月${d.getUTCDate()}日 ${days[d.getUTCDay()]}`;
    let hh = String(d.getUTCHours()).padStart(2, '0'); let mm = String(d.getUTCMinutes()).padStart(2, '0');
    document.getElementById('hk-time').innerText = `${hh}:${mm}`;
    let utc_hh = String(now.getUTCHours()).padStart(2, '0'); let utc_mm = String(now.getUTCMinutes()).padStart(2, '0');
    document.getElementById('utc-time').innerText = `世界協調時間 (UTC) ${utc_hh}:${utc_mm}`;
    document.getElementById('lunar-date').innerText = `農曆${getLunarDate()}`;
}

function getMoonPhase() {
    const date = new Date(); let year = date.getFullYear(), month = date.getMonth() + 1, day = date.getDate();
    if (month < 3) { year--; month += 12; } ++month;
    let jd = (365.25 * year) + (30.6 * month) + day - 694039.09; jd /= 29.5305882;
    let b = Math.round((jd - parseInt(jd)) * 8); if (b >= 8) b = 0;
    const phases = [{ i: '🌑', n: '新月' }, { i: '🌒', n: '峨眉月' }, { i: '🌓', n: '上弦月' }, { i: '🌔', n: '盈凸月' }, { i: '🌕', n: '滿月' }, { i: '🌖', n: '虧凸月' }, { i: '🌗', n: '下弦月' }, { i: '🌘', n: '殘月' }];
    return phases[b];
}

async function fetchAstroData() { // 之前遺漏的核心函數，已補回
    try {
        const res = await fetch('https://wttr.in/HongKong?format=j1');
        const wttr = await res.json();
        const astro = wttr.weather[0].astronomy[0];
        const to24 = (timeStr) => {
            if(!timeStr) return '--:--';
            const [time, mod] = timeStr.split(' ');
            let [h, m] = time.split(':'); if (h === '12') h = '00';
            if (mod === 'PM') h = (parseInt(h, 10) + 12).toString();
            return `${h.padStart(2, '0')}:${m}`;
        };
        document.getElementById('hk-sunrise').innerText = to24(astro.sunrise);
        document.getElementById('hk-sunset').innerText = to24(astro.sunset);
        document.getElementById('hk-moonrise').innerText = to24(astro.moonrise);
        document.getElementById('hk-moonset').innerText = to24(astro.moonset);
        const mp = getMoonPhase();
        document.getElementById('hk-moon').innerHTML = `<span style="font-size: 2rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${mp.i}</span> <span>${mp.n}</span>`;
    } catch(e) {
        const mp = getMoonPhase();
        document.getElementById('hk-moon').innerHTML = `<span style="font-size: 2rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${mp.i}</span> <span>${mp.n}</span>`;
    }
}

function animateIndex(prefix, targetLevel, colors) {
    for(let i=1; i<=5; i++) {
        let step = document.getElementById(`${prefix}-step-${i}`);
        if(step) { step.style.background = 'rgba(255,255,255,0.1)'; step.style.boxShadow = 'none'; step.classList.remove('step-blink'); }
    }
    let current = 1;
    let animInterval = setInterval(() => {
        if (current > targetLevel) {
            clearInterval(animInterval);
            let lastStep = document.getElementById(`${prefix}-step-${targetLevel}`);
            if(lastStep) { lastStep.classList.add('step-blink'); lastStep.style.boxShadow = `0 0 12px ${colors[targetLevel-1]}`; }
            return;
        }
        let step = document.getElementById(`${prefix}-step-${current}`);
        if (step) { step.style.background = colors[current-1]; }
        current++;
    }, 120); 
}

function updatePetWalkingIndex() {
    let heatIndex = currentThreatState.custom_heat_index !== undefined ? currentThreatState.custom_heat_index : globalWxState.temp;
    let rain = currentThreatState.r || 0; let wind = currentThreatState.maxOffshoreWind || 0; let rainStr = globalWxState.psrRaw || "低"; let tcLvl = currentThreatState.tcLvl || 1;

    if (isNaN(heatIndex)) { document.getElementById('pet-level-val').innerText = `--`; return; }

    let heatScore = 1;
    if (heatIndex >= 33) heatScore = 5; else if (heatIndex >= 30) heatScore = 4; else if (heatIndex >= 27) heatScore = 3; else if (heatIndex <= 10) heatScore = 4; else if (heatIndex <= 15) heatScore = 3;   
    let rainScore = 1;
    if (rain >= 30) rainScore = 5; else if (rain >= 10) rainScore = 4; else if (rain > 0 || rainStr.includes('高')) rainScore = 3; 
    let windScore = 1;
    if (wind >= 41 || tcLvl >= 3) windScore = 5; else if (wind >= 30) windScore = 4; else if (wind >= 15) windScore = 2;          

    let petLevel = Math.max(heatScore, rainScore, windScore);
    const pDescs = ["極適宜", "適宜", "一般", "不適宜", "極不適宜"]; const colors = [themeColors.blue, themeColors.green, themeColors.orange, "#e67e22", themeColors.red];

    let dynamicHint = "";
    if (windScore >= 5) { dynamicHint = `強風吹襲 (風速 ${wind}km/h)，戶外有危險，請與狗狗留在室內安全地方。`; } 
    else if (rainScore >= 4) { dynamicHint = `即時雨勢頗大 (${rain}mm/h)，路面濕滑易令毛孩著涼或受傷，建議暫停散步。`; } 
    else if (heatScore >= 4 && heatIndex >= 30) { dynamicHint = `暑熱指數達 ${heatIndex}，柏油路面極熱！扁鼻狗極易中暑，只宜短暫室內如廁。`; } 
    else if (heatScore >= 3 && heatIndex <= 15) { dynamicHint = `天氣寒冷 (體感約 ${heatIndex}°C)，出門記得幫狗狗著衫保暖，避免長時間吹風。`; } 
    else if (rainScore === 3) { dynamicHint = "天雨路滑或有微雨，外出散步後請徹底抹乾毛孩腳掌防真菌感染。"; } 
    else if (petLevel <= 2) { dynamicHint = "溫度、風力同濕度完美！非常適合帶狗狗長時間散步放電。"; } 
    else { dynamicHint = "天氣狀況一般，記得隨身帶備充足食水，建議行有樹蔭嘅路線。"; }

    document.getElementById('pet-level-val').innerText = `第 ${petLevel} 級 - ${pDescs[petLevel-1]}`;
    document.getElementById('pet-level-val').style.color = colors[petLevel-1];
    document.getElementById('pet-hint-text').innerText = dynamicHint;
    animateIndex('pet', petLevel, colors);
}

function updateLaundryIndex() {
    let t = globalWxState.temp; let h = globalWxState.hum; let uv = globalWxState.uv !== null ? parseFloat(globalWxState.uv) : 0; let psr = globalWxState.psrRaw || '低';
    let rain = currentThreatState.r || 0; let wind = currentThreatState.maxOffshoreWind || 0; let tcLvl = currentThreatState.tcLvl || 1;

    if (isNaN(h)) { document.getElementById('laundry-level-val').innerText = `--`; return; }

    let laundryLevel = 3; let dynamicHint = "";
    if (rain > 0 || wind >= 41 || tcLvl >= 3 || psr.includes('高')) {
        laundryLevel = 5;
        if (wind >= 41 || tcLvl >= 3) { dynamicHint = `強風吹襲 (風速 ${wind}km/h)，為免衣物或晾衣架被吹走發生危險，強烈建議改喺室內晾乾。`; } 
        else if (rain > 0) { dynamicHint = `目前錄得即時雨勢 (${rain}mm/h)，戶外晾衫必定淋濕，請收回室內。`; } 
        else { dynamicHint = `下雨機率極高，戶外晾衫極易淋濕，建議收返入屋並使用抽濕機。`; }
    } else if (h >= 85 || psr.includes('中高')) {
        laundryLevel = 4; dynamicHint = `濕度高達 ${h}% 或有驟雨風險，衣物難以自然風乾兼易生霉菌（有噏味），請喺室內抽濕。`;
    } else {
        let uvScore = Math.min(100, uv * 12.5); let humScore = Math.max(0, 100 - (h - 50) * 2); let windScore = (wind >= 10 && wind <= 30) ? 100 : (wind > 30 ? 50 : 30);
        let totalScore = (uvScore * 0.4) + (humScore * 0.4) + (windScore * 0.2);
        if (totalScore >= 80) { laundryLevel = 1; dynamicHint = `陽光猛烈且有微風 (${wind}km/h)，強烈紫外線可天然殺菌除臭，衣物極速乾透！`; } 
        else if (totalScore >= 60) { laundryLevel = 2; dynamicHint = `天氣乾爽，狀況良好，適合一般戶外自然晾曬。`; } 
        else { laundryLevel = 3; dynamicHint = `天氣條件一般，可能需要較長時間先可以完全乾透，建議預留衣物間嘅通風位。`; }
    }

    const lDescs = ["極適宜", "適宜", "一般", "不適宜", "極不適宜"]; const colors = [themeColors.blue, themeColors.green, themeColors.orange, "#e67e22", themeColors.red];
    document.getElementById('laundry-level-val').innerText = `第 ${laundryLevel} 級 - ${lDescs[laundryLevel-1]}`;
    document.getElementById('laundry-level-val').style.color = colors[laundryLevel-1];
    document.getElementById('laundry-hint-text').innerText = dynamicHint;
    animateIndex('laundry', laundryLevel, colors);
}

function updateHikingIndex() {
    let tVal = globalWxState.temp; let hVal = globalWxState.hum; let uvVal = globalWxState.uv; let psrRaw = globalWxState.psrRaw;
    if (isNaN(tVal)) { document.getElementById('hiking-level-val').innerText = `--`; return; }

    let rainStr = psrRaw || "低"; let uv = isNaN(uvVal) || uvVal === null ? 0 : parseFloat(uvVal); let threatLevel = currentThreatState.finalLevel || 1;
    let heatScore = 1; if (tVal >= 33) heatScore = 5; else if (tVal >= 31) heatScore = 4; else if (tVal >= 28) heatScore = 3; else if (tVal < 10) heatScore = 4; else if (tVal < 15) heatScore = 2;
    let rainScore = 1; if (rainStr.includes('高')) rainScore = 5; else if (rainStr.includes('中高')) rainScore = 4; else if (rainStr.includes('中')) rainScore = 3;
    let uvScore = 1; if (uv >= 10) uvScore = 4; else if (uv >= 6) uvScore = 3;

    let hikingLevel = Math.max(heatScore, rainScore, uvScore);
    if (threatLevel >= 4) { hikingLevel = 5; } else if (threatLevel === 3) { hikingLevel = Math.max(hikingLevel, 4); }

    const hDescs = ["極適宜", "適宜", "一般", "不適宜", "極不適宜"]; const colors = [themeColors.blue, themeColors.green, themeColors.orange, "#e67e22", themeColors.red];
    let dynamicHint = ""; let currentRain = currentThreatState.r || 0; 
    
    if (threatLevel >= 4 || currentThreatState.tcLvl >= 3 || currentThreatState.windLvl >= 3) { dynamicHint = "惡劣天氣警告生效中，山區極度危險！強烈呼籲暫停所有戶外行程。"; } 
    else if (currentThreatState.rainLvl >= 3 || currentRain > 0) { dynamicHint = `即時雨勢達 ${currentRain} mm/h，山徑泥濘濕滑，能見度低兼有山洪風險，建議取消行程。`; } 
    else if (tVal >= 30) { dynamicHint = `氣溫達 ${tVal}°C 炎熱，極易中暑。如需行山請避開正午並帶備大量食水。`; } 
    else if (rainStr.includes('高')) { dynamicHint = "今日降雨機率高，雖然未落雨但隨時變天，請三思並帶備雨具。"; } 
    else if (tVal <= 13) { dynamicHint = `市區氣溫 ${tVal}°C，高地風寒效應顯著，請著夠防風保暖衣物防低溫症。`; } 
    else if (uv >= 10) { dynamicHint = "極端紫外線！請做足防曬措施（長袖衫、帽、太陽眼鏡），避免嚴重曬傷。"; } 
    else if (hikingLevel <= 2) { dynamicHint = "天氣條件完美，非常適合遠足及各類戶外運動，記住帶走自己嘅垃圾。"; } 
    else { dynamicHint = "天氣狀況尚可，但行程中需隨時留意體力消耗及天氣突變。"; }

    document.getElementById('hiking-level-val').innerText = `第 ${hikingLevel} 級 - ${hDescs[hikingLevel-1]}`;
    document.getElementById('hiking-level-val').style.color = colors[hikingLevel-1];
    document.getElementById('hiking-hint-text').innerText = dynamicHint;
    animateIndex('hiking', hikingLevel, colors);
}

function updateSmartThreatAlert() {
    const waglanData = stationMasterData['橫瀾島'] || {};
    const cheungChauData = stationMasterData['長洲'] || {};
    
    const extractSpeed = (wStr) => { if (!wStr) return 0; let num = parseFloat(wStr.replace(/[^0-9.]/g, '')); return isNaN(num) ? 0 : num; };
    const wSpd = extractSpeed(waglanData.wind); const cSpd = extractSpeed(cheungChauData.wind); const maxOffshoreWind = Math.max(wSpd, cSpd);
    
    const t = isNaN(globalWxState.temp) ? null : globalWxState.temp; const h = isNaN(globalWxState.hum) ? null : globalWxState.hum;
    const uv = globalWxState.uv || 0; const r = globalMaxRain || 0; const dist = globalLatestTcDist;

    let at = t; let custom_heat_index = t;
    if (t !== null && h !== null) {
        const e = (h / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
        const wMs = 3; const Q = uv * 25; 
        at = t + 0.348 * e - 0.70 * wMs + 0.70 * (Q / (wMs + 10)) - 4.25;
        at = Math.round(at * 10) / 10;
        let estimated_Tg = t + (uv * 1.5); 
        custom_heat_index = (at * 0.70) + (t * 0.20) + (estimated_Tg * 0.10);
        custom_heat_index = Math.round(custom_heat_index * 10) / 10;
    }

    let windLvl = 1; if (maxOffshoreWind >= 88) windLvl = 5; else if (maxOffshoreWind >= 63) windLvl = 4; else if (maxOffshoreWind >= 56) windLvl = 3; else if (maxOffshoreWind >= 41) windLvl = 2; 
    let rainLvl = 1; if (r >= 70) rainLvl = 5; else if (r >= 50) rainLvl = 4; else if (r >= 30) rainLvl = 3; else if (r >= 15) rainLvl = 2; 
    let tempLvl = 1; let tempStatus = "舒適氣溫";
    if (t !== null) {
        if (custom_heat_index >= 37.0) { tempLvl = 5; tempStatus = "🔥 極端危險酷熱 (中暑極高危)"; } else if (custom_heat_index >= 35.0) { tempLvl = 4; tempStatus = "☀️ 嚴重酷熱 (強烈熱輻射)"; } else if (custom_heat_index >= 33.0) { tempLvl = 3; tempStatus = "🌡️ 炎熱及熱氣逼人"; } else if (custom_heat_index >= 30.0) { tempLvl = 2; tempStatus = "🌤️ 溫暖至微熱"; } else { tempLvl = 1; tempStatus = "舒適氣溫"; }
        if (at <= 0) { tempLvl = 4; tempStatus = "❄️ 極端嚴寒"; } else if (at <= 5) { tempLvl = 3; tempStatus = "🧣 嚴寒天氣"; } else if (at <= 10) { tempLvl = 2; tempStatus = "🧤 寒冷天氣"; }
    }

    let tcLvl = 1;
    if (dist !== null) { if (dist <= 150) tcLvl = 5; else if (dist <= 300) tcLvl = 4; else if (dist <= 500) tcLvl = 3; else if (dist <= 800) tcLvl = 2; }

    const finalLevel = Math.max(windLvl, rainLvl, tempLvl, tcLvl);
    let dynamicTitle = ""; let dynamicDesc = ""; let prefix = ""; let curColor = "";

    if (finalLevel === 1) { prefix = "🟢 第一級：平靜穩定"; curColor = themeColors.green; } else if (finalLevel === 2) { prefix = "🔵 第二級：輕微戒備"; curColor = "#3498db"; } else if (finalLevel === 3) { prefix = "🟡 第三級：顯著威脅"; curColor = themeColors.orange; } else if (finalLevel === 4) { prefix = "🟠 第四級：嚴重威脅"; curColor = "#e67e22"; } else if (finalLevel === 5) { prefix = "🔴 第五級：極端危險"; curColor = themeColors.red; }

    let adviceList = [];
    if (finalLevel === 1) {
        dynamicTitle = `${prefix}`;
        dynamicDesc = "本港各項氣象指標平穩。\n\n離岸風力平緩，未受熱帶氣旋威脅，氣溫適中且無顯著降雨，適宜進行各類戶外活動。";
        adviceList = ["戶外天氣適中宜人，適宜進行各類戶外活動、晨運或寵物散步。", "日常生活中仍請留意日夜溫差變化，適時添減衣物。", "隨時留意香港天文台發出的最新常規天氣報告。"];
    } else {
        let factors = []; let shortThreats = [];
        if (tcLvl === finalLevel && dist !== null) {
            if (dist <= 150) { factors.push(`🌀 風暴中心極度逼近本港 (距離約 ${dist} 公里)，構成極大直接威脅`); shortThreats.push("風暴極度逼近"); } else if (dist <= 300) { factors.push(`🌀 熱帶氣旋正進入本港 300 公里範圍，天氣將急劇轉壞`); shortThreats.push("風暴逼近"); } else if (dist <= 500) { factors.push(`🌀 熱帶氣旋進入本港 500 公里戒備範圍，需密切留意風暴動向`); shortThreats.push("風暴戒備"); } else { factors.push(`🌀 遠洋熱帶氣旋可能開始影響本港外圍天氣`); shortThreats.push("遠洋風暴外圍"); }
            adviceList.push("熱帶氣旋正在逼近，請將花盆、曬衣架等易被風吹倒的物件移入室內或固定。"); adviceList.push("檢查門窗是否牢固，低窪及沿岸地區應提防湧浪與風暴潮。");
        }
        if (windLvl === finalLevel) {
            if (maxOffshoreWind >= 88) { factors.push(`💨 離岸及高地正受暴風或颶風吹襲 (${maxOffshoreWind} km/h)，具極高破壞力`); shortThreats.push("暴風/颶風吹襲"); } else if (maxOffshoreWind >= 63) { factors.push(`💨 離岸持續吹烈風 (${maxOffshoreWind} km/h)，隨時有樹木倒塌危險`); shortThreats.push("離岸吹烈風"); } else if (maxOffshoreWind >= 41) { factors.push(`💨 本港普遍吹強風 (${maxOffshoreWind} km/h)，海面有大浪及湧浪`); shortThreats.push("離岸吹強風"); }
            adviceList.push("離岸及高地風力顯著，切勿前往海邊觀浪，停止所有水上活動及高空作業。"); adviceList.push("在戶外行走時遠離大型廣告招牌、老舊樹木及建築地盤。");
        }
        if (rainLvl === finalLevel) {
            if (r >= 70) { factors.push(`🌧️ 特大暴雨正在發生 (${r} mm/h)，低窪地區可能出現極嚴重水浸及山泥傾瀉`); shortThreats.push("特大暴雨"); } else if (r >= 50) { factors.push(`🌧️ 大暴雨侵襲 (${r} mm/h)，多處道路水浸風險甚高`); shortThreats.push("大暴雨"); } else if (r >= 30) { factors.push(`🌧️ 雨勢頗大 (${r} mm/h)，可能導致局部地區水浸`); shortThreats.push("大雨"); } else if (r >= 15) { factors.push(`🌧️ 受顯著驟雨影響 (${r} mm/h)，戶外出行請帶備雨具`); shortThreats.push("局部大雨"); }
            adviceList.push("暴雨可能引發嚴重水浸，駕駛人士請減慢車速，切勿強行駛過水浸路段。"); adviceList.push("遠離河道、引水道及斜坡，居住於低窪地區人士應準備沙包防浸。");
        }
        if (tempLvl === finalLevel && t !== null) {
            if (custom_heat_index >= 37.0) { factors.push(`🔥 錄得極端危險高溫 (綜合指數 ${custom_heat_index})，極易引發熱衰竭或中暑`); shortThreats.push("極端危險酷熱"); adviceList.push("極端酷熱！避免長時間在烈日下暴曬，戶外活動應強制暫停。"); } else if (custom_heat_index >= 35.0) { factors.push(`☀️ 天氣嚴重酷熱 (綜合指數 ${custom_heat_index})，有強烈熱輻射威脅`); shortThreats.push("嚴重酷熱"); } else if (custom_heat_index >= 33.0) { factors.push(`🌡️ 天氣炎熱及熱氣逼人，需注意補充水分`); shortThreats.push("炎熱逼人"); } else if (custom_heat_index >= 30.0 && finalLevel === 2) { factors.push(`🌤️ 天氣溫暖至微熱`); shortThreats.push("溫暖微熱"); } else if (at <= 0) { factors.push(`❄️ 天氣極端嚴寒 (體感 ${at}°C)，可能出現結霜或結冰現象`); shortThreats.push("極端嚴寒"); adviceList.push("極端嚴寒天氣，請穿著足夠防風保暖衣物，關顧長者及慢性病患者。"); } else if (at <= 5) { factors.push(`🧣 天氣嚴寒 (體感 ${at}°C)，需特別關注保暖`); shortThreats.push("嚴寒天氣"); } else if (at <= 10) { factors.push(`🧤 天氣寒冷 (體感 ${at}°C)，請添衣保暖`); shortThreats.push("寒冷天氣"); }
        }
        dynamicTitle = shortThreats.length > 0 ? `${prefix} (${shortThreats.join('、')})` : prefix;
        dynamicDesc = `⚠️ 目前觸發【 第 ${finalLevel} 級 】威脅的主要原因：\n` + factors.map(f => "• " + f).join("\n");
        if (finalLevel >= 4) { dynamicDesc += "\n\n🚨 警告：目前天氣狀況具高度危險性，強烈建議留在安全室內地方，暫停所有戶外活動！"; } else if (finalLevel === 3) { dynamicDesc += "\n\n⚠️ 指引：請提高警覺，提防惡劣天氣突變帶來之影響，並留意最新天氣警告。"; } else if (finalLevel === 2) { dynamicDesc += "\n\n💡 指引：天氣狀況出現變化，戶外活動人士應隨時留意周遭環境。"; }
    }

    currentThreatState = { finalLevel, dynamicTitle, dynamicDesc, curColor, tcLvl, windLvl, rainLvl, tempLvl, dist, maxOffshoreWind, r, custom_heat_index, at, t, adviceList };
    document.getElementById('threat-wind-val').innerText = `${wSpd || '--'} / ${cSpd || '--'} km/h`;
    document.getElementById('threat-rain-val').innerText = `${r} mm/h`;
    document.getElementById('threat-temp-val').innerHTML = t !== null ? `${custom_heat_index} <span style="font-size:0.75rem; color:var(--text-muted);">(${tempStatus.split(' ')[0]})</span><br><span style="font-size:0.75rem; font-weight:600; color:var(--accent-warning);">純氣溫 ${t}°C | 體感 ${at}°C</span>` : '--°C';
    document.getElementById('threat-tc-dist').innerText = dist !== null ? `約 ${dist} 公里` : '無活躍熱帶氣旋';

    const alertCard = document.getElementById('threat-alert-box');
    const titleEl = document.getElementById('threat-title-text');
    const badgeEl = document.getElementById('threat-badge-val');
    const descEl = document.getElementById('threat-desc-text');

    titleEl.innerText = dynamicTitle; titleEl.style.color = curColor;
    badgeEl.innerText = `第 ${finalLevel} 級`; badgeEl.style.background = `${curColor}22`; badgeEl.style.color = curColor; badgeEl.style.border = `1px solid ${curColor}66`;
    descEl.innerText = dynamicDesc; 

    const colors = ['#2ecc71', '#3498db', '#f39c12', '#e67e22', '#e74c3c'];
    for (let s = 1; s <= 5; s++) {
        const stepEl = document.getElementById(`t-step-${s}`);
        if (stepEl) {
            if (s <= finalLevel) { stepEl.style.background = colors[s - 1]; if (s === finalLevel && finalLevel >= 3) { stepEl.classList.add('step-blink'); stepEl.style.boxShadow = `0 0 10px ${colors[s - 1]}`; } else { stepEl.classList.remove('step-blink'); stepEl.style.boxShadow = 'none'; } } else { stepEl.style.background = 'rgba(255, 255, 255, 0.1)'; stepEl.style.boxShadow = 'none'; stepEl.classList.remove('step-blink'); }
        }
    }
    if (finalLevel >= 3) { alertCard.style.borderColor = curColor; alertCard.style.boxShadow = `0 0 16px ${curColor}44`; } else { alertCard.style.borderColor = 'rgba(255, 255, 255, 0.15)'; alertCard.style.boxShadow = 'none'; }
}

function openThreatModal() {
    const modal = document.getElementById('threat-modal'); const data = currentThreatState; if (!data.finalLevel) return;
    document.getElementById('tm-badge-title').innerText = data.dynamicTitle; document.getElementById('tm-badge-title').style.color = data.curColor;
    const badgePill = document.getElementById('tm-badge-pill'); badgePill.innerText = `第 ${data.finalLevel} 級威脅`; badgePill.style.background = `${data.curColor}25`; badgePill.style.color = data.curColor; badgePill.style.border = `1px solid ${data.curColor}70`;
    document.getElementById('tm-stat-tc').innerText = data.dist !== null ? `${data.dist} km` : '無風暴'; document.getElementById('tm-lvl-tc').innerText = `子評級：第 ${data.tcLvl} 級`;
    document.getElementById('tm-stat-wind').innerText = `${data.maxOffshoreWind || 0} km/h`; document.getElementById('tm-lvl-wind').innerText = `子評級：第 ${data.windLvl} 級`;
    document.getElementById('tm-stat-rain').innerText = `${data.r || 0} mm/h`; document.getElementById('tm-lvl-rain').innerText = `子評級：第 ${data.rainLvl} 級`;
    document.getElementById('tm-stat-temp').innerText = data.custom_heat_index !== null ? `${data.custom_heat_index}` : '--'; document.getElementById('tm-lvl-temp').innerText = `子評級：第 ${data.tempLvl} 級 (體感 ${data.at || '--'}°C)`;
    document.getElementById('tm-desc-text').innerText = data.dynamicDesc;
    let adviceHtml = ''; if (data.adviceList && data.adviceList.length > 0) { data.adviceList.forEach(adv => { adviceHtml += `<li>${adv}</li>`; }); } else { adviceHtml = `<li>各項氣象指標平穩，請隨時留意最新天氣預報。</li>`; }
    document.getElementById('tm-advice-list').innerHTML = adviceHtml; modal.classList.add('active');
}

function openLifestyleModal(type) {
    const modal = document.getElementById('lifestyle-modal');
    const titleEl = document.getElementById('lifestyle-modal-title');
    const gridEl = document.getElementById('ls-metric-grid');
    const evalEl = document.getElementById('ls-evaluation-text');
    const tipsEl = document.getElementById('ls-tips-list');

    const t = globalWxState.temp; const h = globalWxState.hum; const uv = globalWxState.uv !== null ? parseFloat(globalWxState.uv) : 0; const psr = globalWxState.psrRaw || '低';
    const tcLvl = currentThreatState.tcLvl || 1; const windLvl = currentThreatState.windLvl || 1; const rainLvl = currentThreatState.rainLvl || 1; const threatLevel = currentThreatState.finalLevel || 1;

    const tStr = isNaN(t) ? '--' : `${t}°C`; const hStr = isNaN(h) ? '--' : `${h}%`; const uvStr = globalWxState.uv !== null ? `${globalWxState.uv}` : '--';

    gridEl.innerHTML = `<div class="s-stat-box"><div class="s-stat-label">現時氣溫</div><div class="s-stat-val">${tStr}</div></div><div class="s-stat-box"><div class="s-stat-label">相對濕度</div><div class="s-stat-val">${hStr}</div></div><div class="s-stat-box"><div class="s-stat-label">紫外線</div><div class="s-stat-val">${uvStr}</div></div><div class="s-stat-box"><div class="s-stat-label">降雨概率</div><div class="s-stat-val">${psr}</div></div>`;

    let evalText = ""; let tipsHtml = "";
    if (type === 'pet') {
        titleEl.innerText = "🐾 寵物散步適宜度詳情";
        let heatIndex = currentThreatState.custom_heat_index !== undefined ? currentThreatState.custom_heat_index : t;
        let rain = currentThreatState.r || 0; let wind = currentThreatState.maxOffshoreWind || 0;
        gridEl.innerHTML = `
            <div class="s-stat-box"><div class="s-stat-label">日式暑熱指數</div><div class="s-stat-val" style="color: ${heatIndex >= 30 ? 'var(--accent-danger)' : '#fff'}">${heatIndex}</div></div>
            <div class="s-stat-box"><div class="s-stat-label">即時最高雨量</div><div class="s-stat-val" style="color: ${rain >= 10 ? 'var(--accent-warning)' : '#fff'}">${rain} mm/h</div></div>
            <div class="s-stat-box"><div class="s-stat-label">離岸最高風速</div><div class="s-stat-val" style="color: ${wind >= 41 ? 'var(--accent-danger)' : '#fff'}">${wind} km/h</div></div>
            <div class="s-stat-box"><div class="s-stat-label">降雨概率</div><div class="s-stat-val">${psr}</div></div>`;
        evalText = `目前暑熱指數（${heatIndex}）、即時雨量（${rain} mm/h）及風速（${wind} km/h）綜合判定為當前風險級別。`;
        tipsHtml = `<li>出門前注意路面溫度與補水。</li><li>大風大雨時請留在室內。</li>`;
    } else if (type === 'laundry') {
        titleEl.innerText = "👕 戶外晾衣指數詳情";
        evalText = `目前相對濕度 ${hStr}。`;
        tipsHtml = `<li>高濕度或降雨時建議室內抽濕。</li><li>陽光充沛時可進行戶外晾曬殺菌。</li>`;
    } else if (type === 'hiking') {
        titleEl.innerText = "⛰️ 戶外運動行山指數詳情";
        evalText = `目前市區氣溫 ${tStr}。`;
        tipsHtml = `<li>留意天氣突變與降雨機率。</li><li>帶備充足糧水與保暖防風衣物。</li>`;
    }
    evalEl.innerText = evalText; tipsEl.innerHTML = tipsHtml; modal.classList.add('active');
}

function switchMapData(type) {
    document.querySelectorAll('.map-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.map-btn[data-type="${type}"]`).classList.add('active');
    fetchAndRenderCSV(type);
}

function switchRadarRange(range) {
    currentRadarRange = range;
    document.querySelectorAll('.rad-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-rad-${range}`).classList.add('active');
    initRadarPlayer(); 
}

function getFrameData(hktMs) {
    let d = new Date(hktMs); let yyyy = d.getUTCFullYear(); let MM = String(d.getUTCMonth() + 1).padStart(2, '0'); let dd = String(d.getUTCDate()).padStart(2, '0'); let hh = String(d.getUTCHours()).padStart(2, '0'); let mm = String(d.getUTCMinutes()).padStart(2, '0');
    return { 
        url: `https://www.hko.gov.hk/wxinfo/radars/rad_${currentRadarRange}_png/2d${currentRadarRange}nradar_${yyyy}${MM}${dd}${hh}${mm}.jpg`,
        fallbackUrl: `https://www.hko.gov.hk/wxinfo/radars/rad_${currentRadarRange}_png/2d${currentRadarRange}iradar_${yyyy}${MM}${dd}${hh}${mm}.jpg`,
        timeStr: `${hh}:${mm}`
    };
}

function initRadarPlayer() {
    let now = new Date(); let utcMs = now.getTime(); let hktMs = utcMs + (8 * 3600000); let safeHktMs = hktMs - (24 * 60000); let d = new Date(safeHktMs);
    let validMin = Math.floor(d.getUTCMinutes() / 6) * 6; d.setUTCMinutes(validMin); d.setUTCSeconds(0); d.setUTCMilliseconds(0);
    let baseHktMs = d.getTime(); radarFrames = [];
    for (let i = 0; i < 20; i++) {
        let frameMs = baseHktMs - (19 - i) * 6 * 60000; let frame = getFrameData(frameMs);
        radarFrames.push({ url: frame.url, fallbackUrl: frame.fallbackUrl, time: `定格 ${i + 1} / 20 (${frame.timeStr})`, loaded: false, imgElement: null });
    }
    radarIdx = 0;
    radarFrames.forEach(frame => {
        let img = new Image(); img.onload = () => { frame.loaded = true; frame.imgElement = img; }; img.onerror = () => { if (img.src === frame.url) img.src = frame.fallbackUrl; else frame.loaded = false; }; img.src = frame.url;
    });
    loadRadarFrame(0);
    if(radarInterval) clearInterval(radarInterval);
    if(isRadarPlaying) radarInterval = setInterval(nextRadar, 800);
}

function loadRadarFrame(idx) {
    if(!radarFrames.length) return;
    let frame = radarFrames[idx]; document.getElementById('radar-time').innerText = frame.time;
    if (frame.loaded && frame.imgElement) { document.getElementById('radar-img').src = frame.imgElement.src; } else { if (!frame.imgElement) document.getElementById('radar-time').innerText += " (等待數據...)"; }
}

function toggleRadar() {
    const btn = document.getElementById('play-pause-btn');
    const iconPause = `<svg id="icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    const iconPlay = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    if(isRadarPlaying) { clearInterval(radarInterval); btn.innerHTML = iconPlay; } else { radarInterval = setInterval(nextRadar, 800); btn.innerHTML = iconPause; }
    isRadarPlaying = !isRadarPlaying;
}
function nextRadar() { radarIdx = (radarIdx + 1) % radarFrames.length; loadRadarFrame(radarIdx); }
function prevRadar() { radarIdx = (radarIdx - 1 + radarFrames.length) % radarFrames.length; loadRadarFrame(radarIdx); }

function renderStationChart(labels, temps, humidities) {
    const ctx = document.getElementById('station-chart').getContext('2d');
    if (stationChartInstance) stationChartInstance.destroy();
    stationChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [ { label: '氣溫 (°C)', data: temps, borderColor: themeColors.red, backgroundColor: themeColors.red, borderWidth: 3, yAxisID: 'yTemp', tension: 0.3, pointRadius: 2 }, { label: '相對濕度 (%)', data: humidities, borderColor: themeColors.blue, backgroundColor: themeColors.blue, borderWidth: 2, borderDash: [5, 5], yAxisID: 'yHum', tension: 0.3, pointRadius: 2 } ] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' } }, yTemp: { type: 'linear', position: 'left', title: { display: true, text: '氣溫 (°C)' }, grid: { color: 'rgba(255,255,255,0.05)' } }, yHum: { type: 'linear', position: 'right', title: { display: true, text: '相對濕度 (%)' }, grid: { drawOnChartArea: false }, min: 20, max: 100 } }, plugins: { legend: { position: 'top' } } }
    });
}
function renderWindChart(labels, speeds, gusts, dirs) {
    const ctx = document.getElementById('wind-chart').getContext('2d');
    if (windChartInstance) windChartInstance.destroy();
    const gradient = ctx.createLinearGradient(0, 0, 0, 200); gradient.addColorStop(0, 'rgba(0, 206, 201, 0.4)'); gradient.addColorStop(1, 'rgba(0, 206, 201, 0.02)');
    windChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [ { label: '平均風速 (km/h)', data: speeds, borderColor: '#00cec9', backgroundColor: gradient, borderWidth: 2.5, fill: true, tension: 0.3, pointRadius: 3, pointHoverRadius: 5 }, { label: '最高陣風 (km/h)', data: gusts, borderColor: '#e67e22', borderWidth: 1.8, borderDash: [4, 4], fill: false, tension: 0.3, pointRadius: 2 } ] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true, title: { display: true, text: '風速 (km/h)' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } } }, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (context) => { const idx = context.dataIndex; const compass = degreesToCompass(dirs[idx]); if (context.datasetIndex === 0) { return ` 風速: ${context.parsed.y} km/h (風向: ${compass.dir} ${compass.arrow} ${dirs[idx]}°)`; } else { return ` 陣風: ${context.parsed.y} km/h`; } } } } } }
    });
}
function renderRainChart(labels, precipValues) {
    const ctx = document.getElementById('rain-chart').getContext('2d');
    if (rainChartInstance) rainChartInstance.destroy();
    const gradient = ctx.createLinearGradient(0, 0, 0, 200); gradient.addColorStop(0, 'rgba(52, 152, 219, 0.9)'); gradient.addColorStop(1, 'rgba(52, 152, 219, 0.15)');
    rainChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: '每小時雨量 (mm)', data: precipValues, backgroundColor: gradient, borderColor: '#3498db', borderWidth: 1.5, borderRadius: 4, barPercentage: 0.7 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true, title: { display: true, text: '雨量 (mm)' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${context.parsed.y} mm` } } } }
    });
}
function renderTempList(tempList) {
    if (!tempList || tempList.length === 0) return;
    let tHtml = ''; const colors = ['#9b59b6', '#3498db', '#2ecc71', '#e67e22', '#e74c3c'];
    tempList.forEach(item => {
        const tInfo = getTempLevelInfo(item.val);
        let barHtml = '';
        for (let s = 1; s <= 5; s++) {
            if (s <= tInfo.level) { let blinkClass = (tInfo.level === 5 && s === 5) ? 'step-blink' : ''; barHtml += `<div class="temp-step ${blinkClass}" style="background: ${colors[s-1]};"></div>`; } 
            else { barHtml += `<div class="temp-step"></div>`; }
        }
        tHtml += `
        <div class="temp-item-card" data-station="${item.name}" onclick="openStationModal(this.dataset.station)">
            <div class="temp-card-header"><div class="temp-card-name"><span class="val-dot" style="background: ${tInfo.color}"></span>${item.name}</div><div style="display: flex; align-items: center; gap: 8px;"><span class="temp-badge" style="background: ${tInfo.badgeBg}; color: ${tInfo.color}; border: 1px solid ${tInfo.color}40;">${tInfo.name} (第 ${tInfo.level} 級)</span><span class="temp-card-val" style="color: ${tInfo.color}">${item.val} <span style="font-size:0.7rem; color:var(--text-muted);">°C</span></span></div></div><div class="temp-mini-bar">${barHtml}</div>
        </div>`;
    });
    document.getElementById('temp-list-container').innerHTML = tHtml;
}

function renderWindList() {
    let windList = [];
    for (let station in stationMasterData) {
        if (stationMasterData[station].wind && stationMasterData[station].wind !== '靜止') {
            let windStr = stationMasterData[station].wind; let speedMatch = windStr.match(/(\d+)/); let speed = speedMatch ? parseFloat(speedMatch[1]) : 0;
            let dir = windStr.replace(/[\d\skm/h.]/g, '').trim(); if (dir === '') dir = '無定向';
            windList.push({ name: station, speed: speed, dir: dir, raw: windStr });
        }
    }
    windList.sort((a, b) => b.speed - a.speed);
    let listHtml = '';
    if (windList.length === 0) { listHtml = `<div style="text-align:center; padding:20px; color:var(--text-muted);">暫時沒有風速數據</div>`; } 
    else {
        windList.forEach(item => {
            const wInfo = getWindLevelInfo(item.speed); const colors = ['#3498db', '#2ecc71', '#f39c12', '#e67e22', '#e74c3c'];
            let barHtml = '';
            for (let s = 1; s <= 5; s++) {
                if (s <= wInfo.level) { let blinkClass = (wInfo.level === 5 && s === 5) ? 'step-blink' : ''; barHtml += `<div class="wind-step ${blinkClass}" style="background: ${colors[s-1]};"></div>`; } 
                else { barHtml += `<div class="wind-step"></div>`; }
            }
            listHtml += `
            <div class="wind-item-card" data-station="${item.name}" onclick="openWindModal(this.dataset.station)">
                <div class="wind-card-header"><div class="wind-card-name"><span class="val-dot" style="background: ${wInfo.color}"></span>${item.name}</div><div style="display: flex; align-items: center; gap: 8px;"><span class="wind-badge" style="background: ${wInfo.badgeBg}; color: ${wInfo.color}; border: 1px solid ${wInfo.color}40;">${wInfo.name}</span><span class="wind-card-val" style="color: ${wInfo.color}"><span style="font-size: 0.75rem; color: #ccc;">${item.dir}</span> ${item.speed} <span style="font-size:0.7rem; color:var(--text-muted);">km/h</span></span></div></div><div class="wind-mini-bar">${barHtml}</div>
            </div>`;
        });
    }
    document.getElementById('wind-list-container').innerHTML = listHtml;
}

function openWarningModal(code) {
    const db = warningDetailsDb[code] || { name: "天氣警告信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/ts.png", meaning: "香港天文台正發出相關天氣警告信號。", precautions: ["留意最新公布", "做好相應防護措施"] };
    document.getElementById('wm-title').innerText = `⚠️ 警告詳情`;
    document.getElementById('wm-name').innerText = db.name;
    document.getElementById('wm-icon').src = db.img;
    document.getElementById('wm-meaning').innerText = db.meaning;
    let pHtml = ''; db.precautions.forEach(p => { pHtml += `<li>${p}</li>`; });
    document.getElementById('wm-precautions').innerHTML = pHtml;
    document.getElementById('warning-modal').classList.add('active');
}

function openSwtModal(index) {
    if (!activeSwtList || !activeSwtList[index]) return;
    document.getElementById('swt-modal-desc').innerText = activeSwtList[index].desc || activeSwtList[index];
    document.getElementById('swt-modal').classList.add('active');
}

function openForecastModal(idx) {
    if(!nineDayForecastData || !nineDayForecastData[idx]) return;
    const fc = nineDayForecastData[idx];
    let d = parseInt(fc.forecastDate.substring(6,8), 10); let m = parseInt(fc.forecastDate.substring(4,6), 10);
    document.getElementById('f-modal-title').innerText = `📅 ${d}日${m}月 (${fc.week})`;
    document.getElementById('f-modal-icon').src = `https://www.hko.gov.hk/images/HKOWxIconOutline/pic${fc.ForecastIcon || fc.forecastIcon || '50'}.png`;
    document.getElementById('f-modal-temp').innerText = `${fc.forecastMintemp.value}° - ${fc.forecastMaxtemp.value}°C`;
    document.getElementById('f-modal-rh').innerText = `相對濕度: ${fc.forecastMinrh.value}% - ${fc.forecastMaxrh.value}%`;
    document.getElementById('f-modal-wx').innerText = fc.forecastWeather;
    document.getElementById('f-modal-wind').innerText = fc.forecastWind;
    let psrText = fc.PSR || fc.psr || '低'; let psrClass = "";
    if (psrText.includes('高')) psrClass = 'psr-high'; else if (psrText.includes('中')) psrClass = 'psr-med'; else psrClass = 'psr-low';
    const psrEl = document.getElementById('f-modal-psr');
    psrEl.className = `fc-psr ${psrClass}`; psrEl.innerText = `💧 降雨概率: ${psrText}`; psrEl.style.padding = "12px";
    document.getElementById('forecast-modal').classList.add('active');
}

async function openStationModal(stationName) {
    if (!stationName) return;
    document.getElementById('modal-station-name').innerText = `📍 ${stationName} 氣象站`;
    const now = new Date();
    const lastUpdatedStr = `${now.getFullYear()}年${String(now.getMonth()+1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('m-last-updated').innerText = `最後更新: ${lastUpdatedStr}`;
    
    const data = stationMasterData[stationName] || {};
    document.getElementById('m-curr-temp').innerText = data.temp ? `${data.temp}°C` : '--°C';
    document.getElementById('m-maxmin-temp').innerText = (data.max && data.min) ? `${data.max}° / ${data.min}°` : '--° / --°';
    document.getElementById('m-wind').innerText = data.wind || '--';
    document.getElementById('m-humidity').innerText = document.getElementById('hk-hum').innerText || '--%';

    let coords = null;
    for (let ch in hkCoordinates) { if (ch === stationName || stationName.includes(ch) || ch.includes(stationName)) { coords = hkCoordinates[ch]; break; } }
    if (!coords) coords = [22.302, 114.174];
    document.getElementById('station-modal').classList.add('active');
    
    try {
        const weatherData = await fetchMeteoDataWithCache(coords[0], coords[1]);
        const allTimes = weatherData.hourly.time; const allTemps = weatherData.hourly.temperature_2m; const allHums = weatherData.hourly.relative_humidity_2m;
        const currentHour = now.getHours(); const currentHourIndex = currentHour + 24;
        const labels = allTimes.slice(24, currentHourIndex + 1).map(t => t.substring(11, 16));
        let temps = allTemps.slice(24, currentHourIndex + 1); let humidities = allHums.slice(24, currentHourIndex + 1);
        if (data.temp && temps.length > 0) temps[temps.length - 1] = data.temp;
        if (!isNaN(globalWxState.hum) && humidities.length > 0) humidities[humidities.length - 1] = globalWxState.hum;
        renderStationChart(labels, temps, humidities);
    } catch (err) { console.error("Hourly Chart Error:", err); }
}

async function openRainModal(stationName, currentRain) {
    if (!stationName) return;
    if (isNaN(currentRain)) currentRain = 0;
    const rInfo = getRainLevel(currentRain);
    document.getElementById('rain-modal-title').innerText = `🌧️ ${stationName} 氣象站雨量詳情`;
    document.getElementById('rm-current-val').innerText = `${currentRain} mm`;
    document.getElementById('rm-current-val').style.color = rInfo.color;
    document.getElementById('rm-level-val').innerText = `第 ${rInfo.level} 級 (${rInfo.name.split(' ')[0]})`;
    document.getElementById('rm-level-val').style.color = rInfo.color;
    
    const hintBadge = document.getElementById('rm-hint-badge');
    if (hintBadge) { hintBadge.innerText = rInfo.desc; hintBadge.style.color = rInfo.color; }

    let coords = null;
    for (let ch in hkCoordinates) { if (ch === stationName || stationName.includes(ch) || (stationEnglishNames[ch] && stationName.includes(stationEnglishNames[ch]))) { coords = hkCoordinates[ch]; break; } }
    if (!coords) coords = [22.302, 114.174];
    document.getElementById('rain-modal').classList.add('active');

    try {
        const weatherData = await fetchMeteoDataWithCache(coords[0], coords[1]);
        const allTimes = weatherData.hourly.time; const allPrecip = weatherData.hourly.precipitation;
        const currentHourIndex = new Date().getHours() + 24;
        const startIdx = Math.max(0, currentHourIndex - 23); const endIdx = currentHourIndex + 1;
        const labels = allTimes.slice(startIdx, endIdx).map(t => t.substring(11, 16));
        let precipValues = allPrecip.slice(startIdx, endIdx);
        if(precipValues.length > 0) precipValues[precipValues.length - 1] = Math.max(precipValues[precipValues.length - 1], currentRain);
        document.getElementById('rm-24h-total').innerText = `${precipValues.reduce((a, b) => a + b, 0).toFixed(1)} mm`;
        document.getElementById('rm-peak-val').innerText = `${Math.max(...precipValues).toFixed(1)} mm`;
        renderRainChart(labels, precipValues);
    } catch (err) { console.error("Hourly Rain Chart Fetch Error:", err); }
}

async function openWindModal(stationName) {
    if (!stationName) return;
    const data = stationMasterData[stationName] || {};
    const windStr = data.wind || '靜止 0 km/h';
    let speedMatch = windStr.match(/(\d+)/);
    let currentSpeed = speedMatch ? parseFloat(speedMatch[1]) : 0;
    const wInfo = getWindLevelInfo(currentSpeed);

    document.getElementById('wind-modal-title').innerText = `💨 ${stationName} 氣象站風力詳情`;
    document.getElementById('wm-curr-wind').innerText = windStr;
    document.getElementById('wm-curr-wind').style.color = wInfo.color;
    document.getElementById('wm-wind-level').innerText = `${wInfo.name} (第 ${wInfo.level} 級)`;
    document.getElementById('wm-wind-level').style.color = wInfo.color;

    let coords = null;
    for (let ch in hkCoordinates) {
        if (ch === stationName || stationName.includes(ch) || (stationEnglishNames[ch] && stationName.includes(stationEnglishNames[ch]))) {
            coords = hkCoordinates[ch]; break;
        }
    }
    if (!coords) coords = [22.302, 114.174];
    document.getElementById('wind-modal').classList.add('active');

    try {
        const weatherData = await fetchMeteoDataWithCache(coords[0], coords[1]);
        const allTimes = weatherData.hourly.time;
        const allWindSpeeds = weatherData.hourly.wind_speed_10m || [];
        const allWindDirs = weatherData.hourly.wind_direction_10m || [];
        const allWindGusts = weatherData.hourly.wind_gusts_10m || [];

        const currentHourIndex = new Date().getHours() + 24;
        const startIdx = Math.max(0, currentHourIndex - 23);
        const endIdx = currentHourIndex + 1;

        const labels = allTimes.slice(startIdx, endIdx).map(t => t.substring(11, 16));
        let speeds = allWindSpeeds.slice(startIdx, endIdx);
        let dirs = allWindDirs.slice(startIdx, endIdx);
        let gusts = allWindGusts.slice(startIdx, endIdx);

        if (speeds.length > 0 && currentSpeed > 0) { speeds[speeds.length - 1] = currentSpeed; }

        const peakWind = Math.max(...speeds).toFixed(0);
        const peakGust = gusts.length > 0 ? Math.max(...gusts).toFixed(0) : peakWind;

        document.getElementById('wm-peak-wind').innerText = `${peakWind} km/h`;
        document.getElementById('wm-peak-gust').innerText = `${peakGust} km/h`;
        document.getElementById('wm-wind-hint').innerText = `最高陣風 ${peakGust} km/h`;

        renderWindChart(labels, speeds, gusts, dirs);
    } catch (err) { console.error("Hourly Wind Chart Fetch Error:", err); }
}

async function fetchAndRenderCSV(type) {
    dataLayerGroup.clearLayers();

    let unit = '';
    if (type === 'temp' || type === 'max' || type === 'min') unit = '°C'; 
    else if (type === 'pressure') unit = ' hPa'; 
    else if (type === 'wind') unit = ' km/h'; 
    else if (type === 'visibility') unit = ' km'; 
    else if (type === 'tide') unit = ' m';

    const loadHK = async () => {
        try {
            let url = (type === 'max' || type === 'min') ? mapSources['maxmin'] : mapSources[type];
            const res = await fetch(`${url}?_=${Date.now()}`);
            if (!res.ok) return;
            const text = await res.text();
            let lines = text.trim().split('\n');
            if (lines.length < 2) return;

            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;
                let rowArr = parseCSVLine(lines[i]);
                let matchedCoords = null, displayStation = "未知", numericalValues = [], textValues = []; 

                for (let cell of rowArr) {
                    let cellStr = cell.replace(/['"]/g, '').trim(); if (cellStr === "") continue;
                    let searchKey = cellStr.toLowerCase(); let isStation = false;
                    for (let chName in hkCoordinates) {
                        if (cellStr.includes(chName) || searchKey === chName.toLowerCase() || (stationEnglishNames[chName] && searchKey === stationEnglishNames[chName].toLowerCase())) {
                            matchedCoords = hkCoordinates[chName]; displayStation = chName; if (displayStation === '香港天文台') displayStation = '天文台'; isStation = true; break;
                        }
                    }
                    if (isStation) continue;

                    let isTime = /^[0-9]{4}[-/][0-9]{1,2}/.test(cellStr) || /^[0-9]{1,2}:[0-9]{2}/.test(cellStr) || /^20[0-9]{6,12}/.test(cellStr) || cellStr.includes('年') || cellStr.includes('月');
                    let tempNum = parseFloat(cellStr);
                    let isCoord = !isNaN(tempNum) && ((tempNum > 21.5 && tempNum < 23.0) || (tempNum > 113.5 && tempNum < 115.0));
                    if (isTime || isCoord) continue; 

                    if (!isNaN(tempNum)) { numericalValues.push(tempNum); } 
                    else { let engText = cellStr; engText = engText.replace(/[\u4e00-\u9fa5]/g, '').trim(); if (engText === "") engText = cellStr; if (engText !== "") textValues.push(engText); }
                }

                if (matchedCoords && (numericalValues.length > 0 || textValues.length > 0)) {
                    let finalDisplayNumber = "";
                    if (type === 'max' && numericalValues.length > 0) finalDisplayNumber = Math.max(...numericalValues);
                    else if (type === 'min' && numericalValues.length > 0) finalDisplayNumber = Math.min(...numericalValues);
                    else if (numericalValues.length > 0) finalDisplayNumber = numericalValues[0];

                    let windAngle = null;
                    if (type === 'wind') { windAngle = getWindAngle(textValues); if (windAngle !== null) textValues = []; }

                    let finalString = textValues.join(' ') + " " + finalDisplayNumber;
                    let colorStyle = "";
                    if(type === 'temp' || type === 'max' || type === 'min') { colorStyle = `color: ${getTempColor(finalDisplayNumber)};`; } 
                    else if (type === 'wind') { colorStyle = `color: ${finalDisplayNumber >= 41 ? themeColors.red : (finalDisplayNumber >= 15 ? themeColors.orange : '#fff')};`; }

                    let iconHtml = `<div class="minimal-text-icon" style="${colorStyle}">${finalDisplayNumber}</div>`;
                    if (type === 'wind' && windAngle !== null) { iconHtml = `<div class="minimal-text-icon" style="${colorStyle} display:flex; align-items:center; gap:4px;"><span class="wind-arrow-icon" style="transform: rotate(${windAngle}deg); display:inline-block;">⬆</span> ${finalDisplayNumber}</div>`; } 
                    else if (type === 'wind' && finalDisplayNumber === "") { iconHtml = `<div class="minimal-text-icon" style="color:var(--text-muted);">${textValues.join(' ')}</div>`; }

                    let customPin = L.divIcon({ className: '', html: iconHtml, iconSize: null, iconAnchor: [15, 10] });
                    let marker = L.marker(matchedCoords, {icon: customPin, zIndexOffset: !isNaN(finalDisplayNumber) ? Math.round(finalDisplayNumber) : 0}).addTo(dataLayerGroup);
                    marker.bindPopup(`<div class="popup-title">📍 ${displayStation}</div><div class="popup-value">${finalString.trim()} <span style="font-size:1rem; color:var(--text-muted);">${unit}</span></div>`, {className: 'brutal-popup', closeButton: false});
                }
            }
        } catch(e) { console.error('HK CSV Map Error:', e); }
    };

    const loadMacao = async () => {
        if (!['temp', 'wind'].includes(type)) return;
        try {
            const macauCoordsMap = {
                "紀念孫中山市政公園": [22.214, 113.541], "黑沙環": [22.211, 113.555], "大炮台": [22.197, 113.542],
                "外港": [22.197, 113.558], "媽閣": [22.185, 113.531], "大潭山": [22.158, 113.560],
                "東亞運大馬路": [22.153, 113.542], "九澳": [22.133, 113.583], "澳門大學": [22.128, 113.550], 
                "路環市區": [22.116, 113.552], "澳門大橋北": [22.195, 113.568], "澳門大橋南": [22.162, 113.578],
                "友誼大橋北": [22.194, 113.562], "友誼大橋南": [22.164, 113.565], "嘉樂庇總督大橋": [22.179, 113.544], 
                "西灣大橋": [22.173, 113.535], "蓮花大橋": [22.139, 113.543]
            };

            const res = await fetch(`https://dannytcchan00.github.io/0Data/data/macao_weather.xml?_=${Date.now()}`);
            if (!res.ok) return;
            const xmlText = await res.text();
            
            const xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");
            const stations = xmlDoc.querySelectorAll("WeatherReport > station");

            stations.forEach(st => {
                const nameNode = st.querySelector("stationname");
                if (!nameNode) return;
                
                const stationName = nameNode.textContent.trim();
                const coords = macauCoordsMap[stationName];
                if (!coords) return;

                let val = null; let windDir = "";
                if (type === 'temp') {
                    const tempNode = st.querySelector("Temperature > Value") || st.querySelector("Temperature > dValue");
                    if (tempNode) val = parseFloat(tempNode.textContent.trim());
                } else if (type === 'wind') {
                    const speedNode = st.querySelector("WindSpeed > Value") || st.querySelector("WindSpeed > dValue");
                    if (speedNode) val = parseFloat(speedNode.textContent.trim());
                    const dirNode = st.querySelector("WindDirection > Value") || st.querySelector("WindDirection > WindDescription");
                    if (dirNode) windDir = dirNode.textContent.trim();
                }

                if (val !== null && !isNaN(val)) {
                    let mUnit = (type === 'wind') ? ' km/h' : '°C';
                    let mColor = (type === 'wind') ? `color: ${val >= 41 ? themeColors.red : (val >= 15 ? themeColors.orange : '#fff')};` : `color: ${getTempColor(val)};`;
                    let mIconHtml = `<div class="minimal-text-icon" style="${mColor}">${val}</div>`;
                    if (type === 'wind' && windDir) {
                        let windAngle = getWindAngle([windDir]); 
                        if (windAngle !== null) { mIconHtml = `<div class="minimal-text-icon" style="${mColor} display:flex; align-items:center; gap:4px;"><span class="wind-arrow-icon" style="transform: rotate(${windAngle}deg); display:inline-block;">⬆</span> ${val}</div>`; }
                    }
                    let mPin = L.divIcon({ className: '', html: mIconHtml, iconSize: null, iconAnchor: [15, 10] });
                    let mMarker = L.marker(coords, {icon: mPin, zIndexOffset: Math.round(val)}).addTo(dataLayerGroup);
                    mMarker.bindPopup(`<div class="popup-title">📍 澳門 - ${stationName}</div><div class="popup-value">${val} <span style="font-size:1rem; color:var(--text-muted);">${mUnit}</span></div>`, {className: 'brutal-popup', closeButton: false});
                }
            });
        } catch (e) { console.warn('Macau XML Error:', e); }
    };

    await Promise.allSettled([loadHK(), loadMacao()]);
}

async function fetchAllStationData() {
    try {
        const [tempRes, maxminRes, windRes] = await Promise.allSettled([
            fetch(`${mapSources['temp']}?_=${Date.now()}`), fetch(`${mapSources['maxmin']}?_=${Date.now()}`), fetch(`${mapSources['wind']}?_=${Date.now()}`)
        ]);

        if (tempRes.status === 'fulfilled' && tempRes.value.ok) {
            const tempText = await tempRes.value.text(); let tempLines = tempText.trim().split('\n'); let tempList = [];
            for (let i = 1; i < tempLines.length; i++) {
                if (tempLines[i].trim() === '') continue;
                let rowArr = parseCSVLine(tempLines[i]); let station = "未知", val = NaN;
                for (let cell of rowArr) {
                    let c = cell.replace(/['"]/g, '').trim();
                    for (let ch in hkCoordinates) { if (c.includes(ch) || (stationEnglishNames[ch] && c.toLowerCase() === stationEnglishNames[ch].toLowerCase())) { station = ch; if (station === '香港天文台') station = '天文台'; break; } }
                    let num = parseFloat(c); if (!isNaN(num) && num > -20 && num < 60 && !c.includes(':') && !c.includes('2026')) val = num;
                }
                if (station !== "未知" && !isNaN(val)) { tempList.push({ name: station, val: val }); if (!stationMasterData[station]) stationMasterData[station] = {}; stationMasterData[station].temp = val; }
            }
            if (tempList.length > 0) { tempList.sort((a, b) => b.val - a.val); renderTempList(tempList); }
        }

        if (windRes.status === 'fulfilled' && windRes.value.ok) {
            const windText = await windRes.value.text(); let wLines = windText.trim().split('\n');
            for (let i = 1; i < wLines.length; i++) {
                let row = parseCSVLine(wLines[i]); let st = "未知", dir = "", spd = "";
                for (let cell of row) {
                    let c = cell.replace(/['"]/g, '').trim();
                    for (let ch in hkCoordinates) { if (c.includes(ch) || (stationEnglishNames[ch] && c.toLowerCase() === stationEnglishNames[ch].toLowerCase())) { st = ch; if (st === '香港天文台') st = '天文台'; } }
                    let n = parseFloat(c); if (!isNaN(n) && n >= 0 && n < 250 && !c.includes(':')) spd = n + ' km/h'; else { weatherTermTranslations.forEach(t => { if (c.includes(t.c) || c.includes(t.e)) dir = t.c; }); }
                }
                if (st !== "未知") { if (!stationMasterData[st]) stationMasterData[st] = {}; stationMasterData[st].wind = `${dir} ${spd}`.trim() || '靜止'; }
            }
        }
    } catch (e) { console.error("Master Station Fetch Error:", e); }
    renderWindList();
    updateSmartThreatAlert();
}

async function fetchRainList(fallbackData) {
    try {
        let rainList = [], rawList = [];
        try {
            const response = await fetch(`https://data.weather.gov.hk/weatherAPI/opendata/hourlyRainfall.php?lang=tc&_=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                if (data.hourlyRainfall && Array.isArray(data.hourlyRainfall)) rawList = data.hourlyRainfall;
                else if (Array.isArray(data)) rawList = data;
                else if (data.rainfall && Array.isArray(data.rainfall.data)) rawList = data.rainfall.data;
            }
        } catch(e) { console.warn("hourlyRainfall fallback:", e); }

        if (rawList.length === 0 && fallbackData && Array.isArray(fallbackData)) rawList = fallbackData;
        globalMaxRain = 0;
        rawList.forEach(item => {
            let name = item.automaticWeatherStation || item.stationName || item.place || item.name;
            let val = item.value !== undefined ? item.value : (item.max !== undefined ? item.max : (item.min !== undefined ? item.min : null));
            if (name && val !== null && !isNaN(parseFloat(val))) {
                let parsedVal = parseFloat(val); rainList.push({ name: name, val: parsedVal });
                if (parsedVal > globalMaxRain) globalMaxRain = parsedVal;
            }
        });
        
        rainList.sort((a, b) => b.val - a.val); let listHtml = '';
        if(rainList.length === 0) listHtml = `<div style="text-align:center; padding:20px; color:var(--text-muted);">暫時沒有雨量數據</div>`;
        else {
            rainList.forEach(item => {
                const rInfo = getRainLevel(item.val); const colors = ['#3498db', '#2ecc71', '#f39c12', '#e67e22', '#e74c3c']; let barHtml = '';
                for (let s = 1; s <= 5; s++) { if (s <= rInfo.level) barHtml += `<div class="rain-step ${(rInfo.level === 5 && s === 5) ? 'step-blink' : ''}" style="background: ${colors[s-1]};"></div>`; else barHtml += `<div class="rain-step"></div>`; }
                listHtml += `<div class="rain-item-card" data-station="${item.name}" data-val="${item.val}" onclick="openRainModal(this.dataset.station, parseFloat(this.dataset.val))"><div class="rain-card-header"><div class="rain-card-name"><span class="val-dot" style="background: ${rInfo.color}"></span>${item.name}</div><div style="display: flex; align-items: center; gap: 8px;"><span class="rain-badge" style="background: ${rInfo.badgeBg}; color: ${rInfo.color}; border: 1px solid ${rInfo.color}40;">第 ${rInfo.level} 級</span><span class="rain-card-val" style="color: ${rInfo.color}">${item.val} <span style="font-size:0.7rem; color:var(--text-muted);">mm</span></span></div></div><div class="rain-mini-bar">${barHtml}</div></div>`;
            });
        }
        document.getElementById('rain-list-container').innerHTML = listHtml;
    } catch(e) { document.getElementById('rain-list-container').innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">未能讀取雨量數據</div>`; }
    updateSmartThreatAlert();
}

async function fetchTopOverview() {
    try {
        const ts = Date.now();
        const [rtRes, fndRes, warnRes, swtRes] = await Promise.allSettled([
            fetch(`https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc&_=${ts}`),
            fetch(`https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=tc&_=${ts}`),
            fetch(`https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=tc&_=${ts}`),
            fetch(`https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=swt&lang=tc&_=${ts}`)
        ]);

        if (rtRes.status === 'fulfilled' && rtRes.value.ok) {
            const rtData = await rtRes.value.json();
            let currentIcon = rtData.icon ? rtData.icon[0] : null;
            if (currentIcon) document.getElementById('weather-icon').src = `https://www.hko.gov.hk/images/HKOWxIconOutline/pic${currentIcon}.png`;
            
            let t = rtData.temperature?.data?.find(x => x.place === '香港天文台') || rtData.temperature?.data?.[0]; 
            let h = rtData.humidity?.data?.find(x => x.place === '香港天文台') || rtData.humidity?.data?.[0]; 
            
            if(t) document.getElementById('hk-temp').innerText = `${t.value}°C`;
            if(h) document.getElementById('hk-hum').innerText = `${h.value}%`;
            
            let uvVal = (rtData.uvindex && rtData.uvindex.data && rtData.uvindex.data.length > 0) ? parseFloat(rtData.uvindex.data[0].value) : 0;
            document.getElementById('hk-uv').innerHTML = uvVal ? `${uvVal}` : '--';

            let tVal = t ? parseFloat(t.value) : NaN; let hVal = h ? parseFloat(h.value) : NaN;
            globalWxState.temp = tVal; globalWxState.hum = hVal; globalWxState.uv = uvVal;

            if (rtData.temperature && Array.isArray(rtData.temperature.data)) {
                let tempList = [];
                rtData.temperature.data.forEach(item => {
                    let name = item.place; let val = parseFloat(item.value);
                    if (name && !isNaN(val)) { tempList.push({ name: name, val: val }); if (!stationMasterData[name]) stationMasterData[name] = {}; stationMasterData[name].temp = val; }
                });
                tempList.sort((a, b) => b.val - a.val); renderTempList(tempList);
            }
            let rainfallData = (rtData.rainfall && rtData.rainfall.data) ? rtData.rainfall.data : null; fetchRainList(rainfallData);
        }

        if (fndRes.status === 'fulfilled' && fndRes.value.ok) {
            const fnd = await fndRes.value.json();
            if (fnd.generalSituation) document.getElementById('general-situation').innerText = fnd.generalSituation;

            if (fnd.weatherForecast && fnd.weatherForecast.length > 0) {
                nineDayForecastData = fnd.weatherForecast; 
                document.getElementById('hk-max').innerText = `${fnd.weatherForecast[0].forecastMaxtemp.value}°C`;
                document.getElementById('hk-min').innerText = `${fnd.weatherForecast[0].forecastMintemp.value}°C`;
                
                let psrRaw = fnd.weatherForecast[0].PSR || fnd.weatherForecast[0].psr || '';
                globalWxState.psrRaw = psrRaw; globalWxState.psr = psrRaw || '低';
                document.getElementById('hk-psr').innerText = psrRaw || '--';
                
                let html = '';
                fnd.weatherForecast.forEach((fc, idx) => {
                    let d = parseInt(fc.forecastDate.substring(6,8), 10); let m = parseInt(fc.forecastDate.substring(4,6), 10);
                    let psrText = fc.PSR || fc.psr || '低';
                    let psrClass = psrText.includes('高') ? 'psr-high' : (psrText.includes('中') ? 'psr-med' : 'psr-low');
                    let iconCode = fc.forecastIcon || fc.ForecastIcon || '50';
                    html += `<div class="forecast-item" onclick="openForecastModal(${idx})"><div class="fc-date">${d}/${m}<br><span class="fc-week">${fc.week.substring(0,3)}</span></div><img class="fc-icon" src="https://www.hko.gov.hk/images/HKOWxIconOutline/pic${iconCode}.png"><div class="fc-temp">${fc.forecastMintemp.value}° - ${fc.forecastMaxtemp.value}°</div><div class="fc-psr ${psrClass}">💧 概率: ${psrText}</div></div>`;
                });
                document.getElementById('forecast-container').innerHTML = html;
            }
        }

        if (warnRes.status === 'fulfilled' && warnRes.value.ok) {
            const warnData = await warnRes.value.json();
            const warningsBox = document.getElementById('weather-warnings-box');
            const warningCard = document.getElementById('warning-card');
            let activeWarningsHtml = '';
            
            if (warnData && typeof warnData === 'object') {
                for (let key in warnData) {
                    let warning = warnData[key];
                    if (!warning || typeof warning !== 'object') continue;
                    if (warning.actionCode === 'CANCEL') continue;
                    let text = (warning.name || "").toLowerCase();
                    let finalCode = "";

                    if (text.includes("雷暴")) finalCode = "WT";
                    else if (text.includes("黃色暴雨")) finalCode = "WRA";
                    else if (text.includes("紅色暴雨")) finalCode = "WRR";
                    else if (text.includes("黑色暴雨")) finalCode = "WRB";
                    else if (text.includes("一號")) finalCode = "TC1";
                    else if (text.includes("三號")) finalCode = "TC3";
                    else if (text.includes("八號")) {
                        if (text.includes("東北")) finalCode = "TC8NE"; else if (text.includes("西北")) finalCode = "TC8NW"; else if (text.includes("東南")) finalCode = "TC8SE"; else if (text.includes("西南")) finalCode = "TC8SW"; else finalCode = "TC8NE"; 
                    }
                    else if (text.includes("九號")) finalCode = "TC9";
                    else if (text.includes("十號")) finalCode = "TC10";
                    else if (text.includes("水浸")) finalCode = "WNF";
                    else if (text.includes("山泥傾瀉")) finalCode = "WLS";
                    else if (text.includes("季候風")) finalCode = "SMS";
                    else if (text.includes("霜凍")) finalCode = "WFROST";
                    else if (text.includes("火災")) { if (text.includes("黃")) finalCode = "WFIREY"; else finalCode = "WFIRER"; }
                    else if (text.includes("寒冷")) finalCode = "WCOLD";
                    else if (text.includes("酷熱")) finalCode = "WHOT";
                    else if (text.includes("海嘯")) finalCode = "WTSUN";
                    else { let c = warning.code || key; if (c === "WTS") c = "WT"; if (c === "WRAIN") c = "WRA"; if (c === "WMSL") c = "SMS"; finalCode = c; }

                    if (warningDetailsDb[finalCode]) {
                        activeWarningsHtml += `<div class="warning-badge active-blink" onclick="openWarningModal('${finalCode}')"><img class="warning-icon" src="${warningDetailsDb[finalCode].img}"><div class="warning-text">${warningDetailsDb[finalCode].name}</div><span class="warning-arrow">➔</span></div>`;
                    }
                }
            }
            if (activeWarningsHtml !== '') {
                warningsBox.innerHTML = activeWarningsHtml;
                warningCard.style.display = 'flex'; warningCard.classList.add('warning-card-active');
            } else {
                warningsBox.innerHTML = '';
                warningCard.style.display = 'none'; warningCard.classList.remove('warning-card-active');
            }
        }

        if (swtRes.status === 'fulfilled' && swtRes.value.ok) {
            const swtData = await swtRes.value.json();
            const swtBox = document.getElementById('swt-box');
            const swtCard = document.getElementById('swt-card');
            if (swtData && swtData.swt && swtData.swt.length > 0) {
                activeSwtList = swtData.swt;
                let swtHtml = '';
                swtData.swt.forEach((tip, idx) => {
                    swtHtml += `<div class="swt-item" onclick="openSwtModal(${idx})"><span>💡 ${tip.desc}</span><span style="color: var(--text-muted); font-size: 0.75rem;">➔</span></div>`;
                });
                swtBox.innerHTML = swtHtml; swtCard.style.display = 'flex';
            } else { activeSwtList = []; swtBox.innerHTML = ''; swtCard.style.display = 'none'; }
        }
    } catch (error) { console.error("fetchTopOverview error:", error); }
    
    updateSmartThreatAlert();
    updatePetWalkingIndex();
    updateLaundryIndex();
    updateHikingIndex();
}

window.setAgencyView = function(agency) {
    currentSelectedAgency = agency;
    
    document.querySelectorAll('#agency-legend-bar .legend-btn').forEach(btn => {
        let btnAgency = btn.getAttribute('data-agency');
        let color = btnAgency === 'ALL' ? '#ffffff' : (agencyColorPalette[btnAgency] || '#9e9e9e');
        if (btnAgency === agency) {
            btn.style.background = hexToRgba(color, 0.25);
            btn.classList.add('active');
        } else {
            btn.style.background = 'transparent';
            btn.classList.remove('active');
        }
    });
    
    renderAgencyMap();
}

function renderAgencyMap() {
    tcAgencyLayerGroup.clearLayers();
    let hasData = false;
    let typhoonCenterCoords = null;
    const agencyAlert = document.getElementById('no-tc-agency-alert');

    if (currentSelectedAgency === 'ALL') {
        let baselineAgency = 'JMA';
        if (!globalParsedAgencyTracks['JMA'] || globalParsedAgencyTracks['JMA'].length === 0) {
            baselineAgency = Object.keys(globalParsedAgencyTracks)[0]; 
        }

        Object.keys(globalParsedAgencyTracks).forEach(agency => {
            let pts = globalParsedAgencyTracks[agency];
            if (pts.length > 0) {
                hasData = true;
                let color = agencyColorPalette[agency] || agencyColorPalette['OTHER'];
                let isBaseline = (agency === baselineAgency);
                drawTyphoonTrack(pts, tcAgencyLayerGroup, color, agency, isBaseline, isBaseline);
                if (isBaseline) typhoonCenterCoords = [pts[0].lat, pts[0].lon];
            }
        });
    } else {
        let agency = currentSelectedAgency;
        let pts = globalParsedAgencyTracks[agency];
        if (pts && pts.length > 0) {
            hasData = true;
            let color = agencyColorPalette[agency] || agencyColorPalette['OTHER'];
            drawTyphoonTrack(pts, tcAgencyLayerGroup, color, agency, true, true);
            typhoonCenterCoords = [pts[0].lat, pts[0].lon];
        }
    }

    if (!hasData) { 
        agencyAlert.style.display = 'flex'; 
        tcMapAgency.setView(hkoCenter, 4); 
    } else {
        agencyAlert.style.display = 'none';
        if (typhoonCenterCoords) {
            tcMapAgency.setView(typhoonCenterCoords, 5);
        } else {
            tcMapAgency.setView(hkoCenter, 5);
        }
    }
}

function silentBackgroundUpdate() {
    fetchTopOverview();
    fetchAstroData();
    fetchAllStationData().then(() => {
        let activeBtn = document.querySelector('.map-btn.active');
        if (activeBtn) fetchAndRenderCSV(activeBtn.dataset.type);
    });
    fetchAndRenderBothTyphoonMaps();
    initRadarPlayer();
}

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        map.invalidateSize(); 
        tcMapHko.invalidateSize(); 
        tcMapAgency.invalidateSize();
    }, 200);

    switchMapData('temp');
    fetchAllStationData(); 
    initRadarPlayer();     
    fetchTopOverview();
    fetchAstroData();
    
    setTimeout(() => {
        fetchAndRenderBothTyphoonMaps();
    }, 800);

    setInterval(silentBackgroundUpdate, 300000);
    setInterval(updateTick, 1000);
    updateTick(); 
});
