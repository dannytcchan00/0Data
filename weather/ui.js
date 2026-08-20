// ui.js

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
    
    try {
        let formatter = new Intl.DateTimeFormat('zh-HK-u-ca-chinese', { timeZone: 'Asia/Hong_Kong', month: 'long', day: 'numeric' });
        document.getElementById('lunar-date').innerText = `農曆${formatter.format(new Date())}`;
    } catch (e) { document.getElementById('lunar-date').innerText = ``; }
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

function updateSmartThreatAlert() {
    const waglanData = stationMasterData['橫瀾島'] || {};
    const cheungChauData = stationMasterData['長洲'] || {};
    
    const extractSpeed = (wStr) => {
        if (!wStr) return 0;
        let num = parseFloat(wStr.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
    };

    const wSpd = extractSpeed(waglanData.wind);
    const cSpd = extractSpeed(cheungChauData.wind);
    const maxOffshoreWind = Math.max(wSpd, cSpd);
    
    const t = isNaN(globalWxState.temp) ? null : globalWxState.temp;
    const h = isNaN(globalWxState.hum) ? null : globalWxState.hum;
    const uv = globalWxState.uv || 0;
    const r = globalMaxRain || 0;
    const dist = globalLatestTcDist;

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

    let windLvl = 1;
    if (maxOffshoreWind >= 88) windLvl = 5; else if (maxOffshoreWind >= 63) windLvl = 4; else if (maxOffshoreWind >= 56) windLvl = 3; else if (maxOffshoreWind >= 41) windLvl = 2; 

    let rainLvl = 1;
    if (r >= 70) rainLvl = 5; else if (r >= 50) rainLvl = 4; else if (r >= 30) rainLvl = 3; else if (r >= 15) rainLvl = 2; 

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
