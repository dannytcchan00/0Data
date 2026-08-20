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

const warningDetailsDb = {
    "WT": { name: "雷暴警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/ts.png", meaning: "雷暴正在發生或預料在短期內影響香港境內，可能伴隨猛烈陣風、強烈冰雹或局部地區大雨。", precautions: ["留在室內安全地方，切勿在戶外開闊地帶、高地或孤立大樹下躲避。", "遠離導電物體，切勿進行水上活動或游泳。", "提防猛烈陣風帶來的吹落物件。"] },
    "WRA": { name: "黃色暴雨警告信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/rainamber.png", meaning: "香港廣泛地區已錄得或預料會有每小時雨量超過 30 毫米的大雨，且雨勢可能持續。", precautions: ["低窪地帶可能出現水浸，做好防浸措施。", "駕車人士減慢車速，提防路面積水。", "遠離河道、引水道及斜坡。"] },
    "WRR": { name: "紅色暴雨警告信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/rainred.png", meaning: "香港廣泛地區已錄得或預料會有每小時雨量超過 50 毫米的暴雨，道路嚴重水浸及交通受阻。", precautions: ["遵循教育局及僱主發出的惡劣天氣指引，留在安全地方。", "切勿涉水穿過水浸道路，提防山洪暴發及山泥傾瀉。"] },
    "WRB": { name: "黑色暴雨警告信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/rainblack.png", meaning: "香港廣泛地區已錄得或預料會有每小時雨量超過 70 毫米的特大暴雨，極端惡劣天氣將引發嚴重危險。", precautions: ["留在室內安全建築物內避難，切勿外出冒險。", "所有戶外工作應全面暫停。"] },
    "TC1": { name: "一號戒備信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc1.png", meaning: "有一熱帶氣旋集結於香港約 800 公里內，可能影響本港。", precautions: ["計劃戶外活動人士提高警覺，留意風暴路徑變化。"] },
    "TC3": { name: "三號強風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc3.png", meaning: "香港近海平面預料普遍吹強風，持續風速達每小時 41 至 62 公里，陣風可達每小時 110 公里以上。", precautions: ["綁緊容易被風吹倒的物件，停止水上活動。"] },
    "TC8NE": { name: "八號東北烈風或暴風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc08ne.png", meaning: "香港普遍吹東北烈風或暴風，持續風速每小時 63 至 117 公里，陣風更強。", precautions: ["立即返家或前往安全避風處，鎖緊門窗。"] },
    "TC8NW": { name: "八號西北烈風或暴風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc08nw.png", meaning: "香港普遍吹西北烈風或暴風，請立即做好防風措施。", precautions: ["立即返家避風，遠離迎風門窗。"] },
    "TC8SE": { name: "八號東南烈風或暴風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc08se.png", meaning: "香港普遍吹東南烈風或暴風，伴隨風暴潮。", precautions: ["遠離低窪沿海地區，嚴防湧浪侵襲。"] },
    "TC8SW": { name: "八號西南烈風或暴風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc08sw.png", meaning: "香港普遍吹西南烈風或暴風，請保持在室內安全地方。", precautions: ["留在室內避風，留意海水倒灌。"] },
    "TC9": { name: "九號烈風或暴風風力增強信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc09.png", meaning: "風力正在顯著增強，颶風可能在短期內吹襲本港。", precautions: ["切勿外出，做好應對颶風侵襲準備。"] },
    "TC10": { name: "十號颶風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tc10.png", meaning: "颶風（持續風速超過每小時 118 公里）正在橫過本港，破壞力極大。", precautions: ["留在堅固建築物深處，遠離玻璃門窗。"] },
    "WHOT": { name: "酷熱天氣警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/hot.png", meaning: "受酷熱氣團籠罩，氣溫高達 33°C 或以上，極易中暑。", precautions: ["多喝水補充電解質，避免長時間烈日暴曬。"] },
    "WCOLD": { name: "寒冷天氣警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/cold.png", meaning: "受強烈冬季季候風影響，氣溫降至 12°C 或以下。", precautions: ["增添足夠保暖衣物，關顧長者及患者。"] },
    "WLS": { name: "山泥傾瀉警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/ls.png", meaning: "土壤水分極度飽和，發生山泥傾瀉風險極高。", precautions: ["遠離陡峭斜坡及擋土牆。"] },
    "WNF": { name: "新界北部水浸特別報告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/northflood.png", meaning: "新界北部已錄得暴雨，低窪農地可能受嚴重水浸影響。", precautions: ["採取預防措施，切勿強行駛過水浸路段。"] },
    "SMS": { name: "強烈季候風信號", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/sms.png", meaning: "受季候風影響，香港普遍吹強風，平均風速超 40 km/h。", precautions: ["小型船隻返港避風，海面有大浪。"] },
    "WFIREY": { name: "黃色火災危險警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/fireyellow.png", meaning: "火災危險性偏高，相對濕度較低。", precautions: ["郊遊人士小心用火，切勿亂丟煙蒂。"] },
    "WFIRER": { name: "紅色火災危險警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/firered.png", meaning: "極度乾燥，火災危險性極高，山火蔓延速度極快。", precautions: ["嚴禁在郊野燃點香燭或生火。"] },
    "WFROST": { name: "霜凍警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/frost.png", meaning: "高地或新界北部可能出現結霜。", precautions: ["農民做好防霜凍保護措施。"] },
    "WTSUN": { name: "海嘯警告", img: "https://www.hko.gov.hk/tc/textonly/img/warn/images/tsunami.png", meaning: "海嘯預料將抵達本港沿岸。", precautions: ["立即離開沿岸低窪地區及海灘，前往高處避難。"] }
};
