// globals.js - 公用變數、地圖初始化與共用輔助函數

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
const hkBoundsLocal = L.latLngBounds([ [21.58, 113.39], [23.02, 114.95] ]);
const hkoBounds1200 = L.latLng(hkoCenter).toBounds(2400000);

// 初始化地圖 (中心點設於大嶼山 Zoom 9，一打開即可看清香港與澳門)
let map = L.map('hk-map', { maxBounds: hkBoundsLocal, maxBoundsViscosity: 1.0, minZoom: 8, preferCanvas: true }).setView([22.25, 113.90], 9);
L.tileLayer(darkTileUrl, { attribution: '&copy; OSM', maxZoom: 18, crossOrigin: true }).addTo(map);
let dataLayerGroup = L.layerGroup().addTo(map);

// 初始化左邊颱風地圖 (HKO)
let tcMapHko = L.map('tc-map-hko', { minZoom: 3, maxZoom: 10, zoomControl: false, preferCanvas: true });
L.tileLayer(darkTileUrl, { attribution: '&copy; OSM', maxZoom: 18, crossOrigin: true }).addTo(tcMapHko);
let tcHkoLayerGroup = L.layerGroup().addTo(tcMapHko);
// 已將舊有的黑底白字「香港天文台」標籤刪除

// 初始化右邊颱風地圖 (各國氣象機構)
let tcMapAgency = L.map('tc-map-agency', { minZoom: 3, maxZoom: 10, zoomControl: false, preferCanvas: true });
L.tileLayer(darkTileUrl, { attribution: '&copy; OSM', maxZoom: 18, crossOrigin: true }).addTo(tcMapAgency);
let tcAgencyLayerGroup = L.layerGroup().addTo(tcMapAgency);
// 已將舊有的黑底白字「香港天文台」標籤刪除
