// ui_controller.js - 視窗開閂、生活指數、圖表繪製、雷達播放器

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
}
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('active');
    });
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
    const now = new Date();
    let utcMs = now.getTime();
    let hktMs = utcMs + (8 * 3600000); 
    let d = new Date(hktMs); 
    
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const m = d.getUTCMonth() + 1;
    
    document.getElementById('current-date').innerText = `${d.getUTCFullYear()}年${m}月${d.getUTCDate()}日 ${days[d.getUTCDay()]}`;
    
    let hh = String(d.getUTCHours()).padStart(2, '0');
    let mm = String(d.getUTCMinutes()).padStart(2, '0');
    document.getElementById('hk-time').innerText = `${hh}:${mm}`;
    
    let utc_hh = String(now.getUTCHours()).padStart(2, '0');
    let utc_mm = String(now.getUTCMinutes()).padStart(2, '0');
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

function animateIndex(prefix, targetLevel, colors) {
    for(let i=1; i<=5; i++) {
        let step = document.getElementById(`${prefix}-step-${i}`);
        if(step) {
            step.style.background = 'rgba(255,255,255,0.1)';
            step.style.boxShadow = 'none';
            step.classList.remove('step-blink');
        }
    }
    let current = 1;
    let animInterval = setInterval(() => {
        if (current > targetLevel) {
            clearInterval(animInterval);
            let lastStep = document.getElementById(`${prefix}-step-${targetLevel}`);
            if(lastStep) {
                lastStep.classList.add('step-blink');
                lastStep.style.boxShadow = `0 0 12px ${colors[targetLevel-1]}`;
            }
            return;
        }
        let step = document.getElementById(`${prefix}-step-${current}`);
        if (step) { step.style.background = colors[current-1]; }
        current++;
    }, 120); 
}

function updatePetWalkingIndex() {
    let heatIndex = currentThreatState.custom_heat_index !== undefined ? currentThreatState.custom_heat_index : globalWxState.temp;
    let rain = currentThreatState.r || 0;
    let wind = currentThreatState.maxOffshoreWind || 0;
    let rainStr = globalWxState.psrRaw || "低";
    let tcLvl = currentThreatState.tcLvl || 1;

    if (isNaN(heatIndex)) { document.getElementById('pet-level-val').innerText = `--`; return; }

    let heatScore = 1;
    if (heatIndex >= 33) heatScore = 5; else if (heatIndex >= 30) heatScore = 4; else if (heatIndex >= 27) heatScore = 3; else if (heatIndex <= 10) heatScore = 4; else if (heatIndex <= 15) heatScore = 3;   

    let rainScore = 1;
    if (rain >= 30) rainScore = 5; else if (rain >= 10) rainScore = 4; else if (rain > 0 || rainStr.includes('高')) rainScore = 3; 

    let windScore = 1;
    if (wind >= 41 || tcLvl >= 3) windScore = 5; else if (wind >= 30) windScore = 4; else if (wind >= 15) windScore = 2;          

    let petLevel = Math.max(heatScore, rainScore, windScore);

    const pDescs = ["極適宜", "適宜", "一般", "不適宜", "極不適宜"];
    const colors = [themeColors.blue, themeColors.green, themeColors.orange, "#e67e22", themeColors.red];

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
        laundryLevel = 4;
        dynamicHint = `濕度高達 ${h}% 或有驟雨風險，衣物難以自然風乾兼易生霉菌（有噏味），請喺室內抽濕。`;
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
    let heatScore = 1;
    if (tVal >= 33) heatScore = 5; else if (tVal >= 31) heatScore = 4; else if (tVal >= 28) heatScore = 3; else if (tVal < 10) heatScore = 4; else if (tVal < 15) heatScore = 2;

    let rainScore = 1;
    if (rainStr.includes('高')) rainScore = 5; else if (rainStr.includes('中高')) rainScore = 4; else if (rainStr.includes('中')) rainScore = 3;

    let uvScore = 1;
    if (uv >= 10) uvScore = 4; else if (uv >= 6) uvScore = 3;

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

// 雷達圖播放器
let radarFrames = [], radarIdx = 0, radarInterval = null, isRadarPlaying = true, currentRadarRange = '256'; 

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
