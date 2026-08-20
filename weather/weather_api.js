// weather_api.js - 香港天文台 CSV 數據、澳門 XML 數據、雨量、風力、九天天氣預報與天文潮汐

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

function switchMapData(type) {
    document.querySelectorAll('.map-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.map-btn[data-type="${type}"]`).classList.add('active');
    fetchAndRenderCSV(type);
}

async function fetchAndRenderCSV(type) {
    dataLayerGroup.clearLayers();

    let unit = '';
    if (type === 'temp' || type === 'max' || type === 'min') unit = '°C'; 
    else if (type === 'pressure') unit = ' hPa'; 
    else if (type === 'wind') unit = ' km/h'; 
    else if (type === 'visibility') unit = ' km'; 
    else if (type === 'tide') unit = ' m';

    // 🇭🇰 香港 CSV 數據讀取
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

    // 🇲🇴 澳門 XML 數據讀取 (根據你提供嘅真實 XML 結構)
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

                let val = null;
                let windDir = "";

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

async function fetchMeteoDataWithCache(lat, lon) {
    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`; const now = Date.now();
    if (meteoCache[cacheKey] && (now - meteoCache[cacheKey].timestamp < 300000)) return meteoCache[cacheKey].data;
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=Asia%2FHong_Kong&past_days=1&forecast_days=1`);
    const data = await res.json();
    meteoCache[cacheKey] = { data: data, timestamp: now }; return data;
}

async function fetchAstroData() {
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

function openForecastModal(idx) {
    if(!nineDayForecastData || !nineDayForecastData[idx]) return;
    const fc = nineDayForecastData[idx];
    let d = parseInt(fc.forecastDate.substring(6,8), 10); let m = parseInt(fc.forecastDate.substring(4,6), 10);
    document.getElementById('f-modal-title').innerText = `📅 ${d}日${m}月 (${fc.week})`;
    let iconCode = fc.forecastIcon || fc.ForecastIcon || '50';
    document.getElementById('f-modal-icon').src = `https://www.hko.gov.hk/images/HKOWxIconOutline/pic${iconCode}.png`;
    document.getElementById('f-modal-temp').innerText = `${fc.forecastMintemp.value}° - ${fc.forecastMaxtemp.value}°C`;
    document.getElementById('f-modal-rh').innerText = `相對濕度: ${fc.forecastMinrh.value}% - ${fc.forecastMaxrh.value}%`;
    document.getElementById('f-modal-wx').innerText = fc.forecastWeather;
    document.getElementById('f-modal-wind').innerText = fc.forecastWind;
    let psrText = fc.PSR || fc.psr || '低';
    let psrClass = psrText.includes('高') ? 'psr-high' : (psrText.includes('中') ? 'psr-med' : 'psr-low');
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
