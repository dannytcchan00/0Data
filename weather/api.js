// api.js

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
