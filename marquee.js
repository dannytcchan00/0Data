// marquee.js

const customDateMessages = {
    "01-01": { zh: "🎆 祝大家元旦快樂 Happy New Year！", en: "🎆 Happy New Year!" },
    "01-26": { zh: "🇬🇧 英國帶來的不只是制度，更是一座世界城市的起點。", en: "🇬🇧 Britain brought not just a system, but the genesis of a world city." },
    "02-14": { zh: "💖 祝大家情人節快樂 Happy Valentine's Day！", en: "💖 Happy Valentine's Day!" },
    "03-17": { zh: "🍀 May your day be touched by some Irish luck. Happy St. Paddy's!", en: "🍀 May your day be touched by some Irish luck. Happy St. Paddy's!" },
    "06-04": { zh: "🕯️ 當燭光不能照亮廣場，願它仍照亮人心。", en: "🕯️ When candles cannot light the square, may they still light our hearts." },
    "06-28": { zh: "🤍 願每一年的今天，我們都記得旺旺。記住她的名字，也記住每一個生命，都值得被溫柔以待。", en: "🤍 May we remember Wang Wang on this day, May we remember her name, and remember that every life deserves to be cherished and treated with kindness." },
    "07-01": { zh: "🇨🇦 Happy Canada Day! 願自由、多元與包容長存。🍁", en: "🇨🇦 Happy Canada Day! May freedom, diversity, and tolerance endure. 🍁" },
    "07-21": { zh: "👁 願真相，不被時間埋葬。", en: "👁 May the truth never be buried by time." },
    "08-31": { zh: "🩸 有些列車已經離站，有些真相仍未到站。", en: "🩸 Some trains have departed, while some truths have yet to arrive." },
    "10-01": { zh: "🔘 我們會記得一座城市，不是因為它掛起了什麼旗幟，而是因為它曾經教會我們，什麼叫尊重，什麼叫自由，什麼叫責任。 ", en: "🔘 We remember a city not for the flags it flies, but for what it taught us: respect, freedom, and responsibility." },
    "11-30": { zh: "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Sending warm wishes your way on this St. Andrew's Day.", en: "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Sending warm wishes your way on this St. Andrew's Day." },
    "12-24": { zh: "🔔 祝大家平安夜快樂 平平安安！", en: "🔔 Merry Christmas Eve! Wishing you peace and joy!" },
    "12-25": { zh: "🎄 祝大家聖誕快樂 Merry Christmas！", en: "🎄 Merry Christmas!" },
    "12-31": { zh: "🎉 祝大家除夕快樂 迎接新一年！", en: "🎉 Happy New Year's Eve! Welcoming the new year!" }
};

const dynamicDateMessages = [
    { month: 5, week: 2, dayOfWeek: 0, msg: { zh: "👩 祝各位母親節快樂 Happy Mother's Day！", en: "👩 Happy Mother's Day!" } },
    { month: 6, week: 3, dayOfWeek: 0, msg: { zh: "👨 祝各位父親節快樂 Happy Father's Day！", en: "👨 Happy Father's Day!" } },
    { month: 6, week: 2, dayOfWeek: 6, msg: { zh: "👑 To the Crown, to history, and to cherished memories. Happy King's Birthday. 👑🇬🇧", en: "👑 To the Crown, to history, and to cherished memories. Happy King's Birthday. 👑🇬🇧" } }
];

async function fetchMtrStatusMarquee() {
    const dict = i18n[currentLang];
    let marqueeEl = document.getElementById('mtr-marquee-text');
    let isOpHours = checkIsOperatingHours();
    
    let now = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Hong_Kong'}));
    let mm = String(now.getMonth() + 1).padStart(2, '0'); let dd = String(now.getDate()).padStart(2, '0');
    let todayKey = `${mm}-${dd}`;
    
    let holidayMsg = "";
    if (customDateMessages[todayKey]) {
        holidayMsg = ` ｜ ${currentLang==='en'?customDateMessages[todayKey].en:customDateMessages[todayKey].zh}`;
    } else {
        let currentMonth = now.getMonth() + 1; let currentDayOfWeek = now.getDay(); let currentWeekNum = Math.ceil(now.getDate() / 7);
        for (let rule of dynamicDateMessages) {
            if (rule.month === currentMonth && rule.week === currentWeekNum && rule.dayOfWeek === currentDayOfWeek) {
                holidayMsg = ` ｜ ${currentLang==='en'?rule.msg.en:rule.msg.zh}`;
                break;
            }
        }
    }

    if (!isOpHours) {
        marqueeEl.innerHTML = dict['txt-st-end'] + holidayMsg + " ｜ " + dict['txt-st-first'];
        marqueeEl.className = "marquee-text";
        return;
    }

    // 新增自帶重試機制的 fetch，防止單次 timeout 引致的誤判
    async function fetchWithRetry(url, retries = 2) {
        for (let i = 0; i < retries; i++) {
            try {
                let res = await fetch(url, { cache: 'no-store' });
                if (res.ok) return await res.json();
            } catch (err) {
                if (i === retries - 1) throw err;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // 加強抽查點：多選取幾個重要站點來互相補足，以免單一車站未能及時反映整條綫的延誤
    const checkStations = [
        {line: 'ISL', sta: 'ADM'}, {line: 'ISL', sta: 'QUB'},
        {line: 'TWL', sta: 'ADM'}, {line: 'TWL', sta: 'MEF'}, 
        {line: 'KTL', sta: 'YMT'}, {line: 'KTL', sta: 'KOT'},
        {line: 'TKL', sta: 'TKO'}, {line: 'TKL', sta: 'NOP'}, 
        {line: 'TML', sta: 'TAW'}, {line: 'TML', sta: 'MEF'}, 
        {line: 'EAL', sta: 'KOT'}, {line: 'EAL', sta: 'TAP'},
        {line: 'TCL', sta: 'NAC'}, {line: 'TCL', sta: 'TSY'}, 
        {line: 'AEL', sta: 'KOW'}, {line: 'AEL', sta: 'TSY'}, 
        {line: 'SIL', sta: 'OCP'},
        {line: 'DRL', sta: 'SUN'}
    ];

    try {
        let ts = Date.now(); let wLang = currentLang === 'en' ? 'en' : 'tc';
        let warnSumRes = await fetch(`https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=${wLang}&_=${ts}`, { cache: 'no-store' }).then(r=>r.json()).catch(()=>null);
        let typhoonMsg = '';
        if (warnSumRes && warnSumRes.WTCSGNL && warnSumRes.WTCSGNL.actionCode !== "CANCEL") {
            let tcCode = warnSumRes.WTCSGNL.code;
            if (tcCode === 'TC1' || tcCode === 'WTC1') { typhoonMsg = currentLang==='en'?"| 🌀 Standby Signal No.1 is in force. Train service is normal. | Bus services will continue to operate normally until the last scheduled departure.":"| 🌀 而家係1號風球，列車服務正常。 | 巴士服務現時維持正常，直至當日服務結束。"; } 
            else if (tcCode === 'TC3' || tcCode === 'WTC3') { typhoonMsg = currentLang==='en'?"| 🌀 Strong Wind Signal No.3 is in force. Train service is normal. | Bus services will continue to operate normally until the last scheduled departure.":"| 🌀 而家係3號風球，列車服務正常。 | 巴士服務現時維持正常，直至當日服務結束。"; } 
            else if (tcCode === 'TC8NE' || tcCode === 'TC8NW' || tcCode === 'TC8SE' || tcCode === 'TC8SW' || tcCode === 'WTC8') { typhoonMsg = currentLang==='en'?"| 🌀 Gale or Storm Signal No.8 is in force. MTR will maintain limited service. ｜ Some Bus routw are operating on a limited basis under Tropical Cyclone Warning Signal No. 8. ":"🌀 而家係8號風球，地鐵公司會盡量保持列車服務正常、列車班次會逐漸減少，列車會維持有限度服務。 ｜ 八號熱帶氣旋警告信號現正生效，部分巴士服務有限度維持。"; } 
            else if (tcCode === 'TC9' || tcCode === 'WTC9') { typhoonMsg = currentLang==='en'?"| 🌀 Signal No.9 is in force. Open-air sections suspended. Limited service in tunnels. | Bus services are suspended under Tropical Cyclone Warning Signal No.9 ":"| 🌀 而家係9號風球，露天段列車會即時暫停，隧道段會維持有限度服務。 | 9號熱帶氣旋警告信號生效，巴士服務暫停。 "; } 
            else if (tcCode === 'TC10' || tcCode === 'WTC10') { typhoonMsg = currentLang==='en'?"| 🌀 Hurricane Signal No.10 is in force. Open-air sections suspended. Limited service in tunnels.| Bus services are suspended under Tropical Cyclone Warning Signal No.10 ":"| 🌀 而家係10號風球，露天段列車會即時暫停，隧道段會維持有限度服務。 | 10號熱帶氣旋警告信號生效，巴士服務暫停。 "; }
        }

        // 使用重試機制並發獲取，取代原有的一 failure 就當錯誤
        let results = await Promise.allSettled(checkStations.map(s =>
            fetchWithRetry(`https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${s.line}&sta=${s.sta}&_=${ts}`, 2)
        ));

        let issues = [];
        let lineIssueMap = new Map(); // 使用 Map 來去重及覆蓋，確保每條綫最多顯示一個最嚴重的狀態
        let h = now.getHours(); let m = now.getMinutes(); let isLateNightEdge = (h === 23 && m >= 30) || (h >= 0 && h <= 5);

        results.forEach((res, i) => {
            let s = checkStations[i];
            let lineName = currentLang === 'en' ? MTR_NETWORK[s.line].name_en : MTR_NETWORK[s.line].name_zh;
            let key = `${s.line}-${s.sta}`;

            // 如果經過重試仍然失敗，我們選擇默默跳過，不當作故障報警，以避免手機網絡差導致跑馬燈常報錯
            if (res.status === 'rejected') return; 

            let d = res.value; 
            let hasData = false; 
            let dirHasLongWait = false; // 新邏輯：主動根據等待時間推算異常

            if (d && d.data && d.data[key]) {
                let upTrains = d.data[key].UP || []; 
                let downTrains = d.data[key].DOWN || [];
                if (upTrains.length > 0 || downTrains.length > 0) hasData = true;
                
                // 如果有數據，檢查任何一個方向的下一班車是否要等大於 15 分鐘
                if (upTrains.length > 0) {
                    let firstUp = parseInt(upTrains[0].ttnt);
                    if (!isNaN(firstUp) && firstUp > 15) dirHasLongWait = true;
                }
                if (downTrains.length > 0) {
                    let firstDown = parseInt(downTrains[0].ttnt);
                    if (!isNaN(firstDown) && firstDown > 15) dirHasLongWait = true;
                }
            }

            let isDelayed = String(d.isdelay || d.isDelay || d.Isdelay || 'N').toUpperCase() === 'Y';
            
            if (!lineIssueMap.has(s.line)) {
                if (isDelayed) { 
                    lineIssueMap.set(s.line, `🔴 ${lineName} ${dict['txt-st-delay']}`); 
                } else if (!hasData || Number(d.status) === 0) { 
                    if (!isLateNightEdge) lineIssueMap.set(s.line, `⚠️ ${lineName} ${dict['txt-st-nodata']}`); 
                } else if (hasData && dirHasLongWait && !isLateNightEdge) {
                    // 主動介入：官方無標記，但數據反映候車時間異常長
                    lineIssueMap.set(s.line, `🔴 ${lineName} ${dict['txt-st-delay']} ${dict['txt-st-longwait']}`);
                }
            } else {
                // 確保官方 delay 標記優先級最高
                let currentIssue = lineIssueMap.get(s.line);
                if (!currentIssue.includes('🔴') && isDelayed) {
                    lineIssueMap.set(s.line, `🔴 ${lineName} ${dict['txt-st-delay']}`); 
                }
            }
        });
        
        issues = Array.from(lineIssueMap.values());

        if (issues.length === 0) {
            marqueeEl.innerHTML = dict['txt-st-op'] + (typhoonMsg ? ` ｜ ${typhoonMsg}` : "") + holidayMsg;
            marqueeEl.className = "marquee-text";
        } else {
            marqueeEl.innerHTML = dict['txt-st-attn'] + " " + issues.join(" ｜ ") + " ｜ " + dict['txt-st-norm'] + (typhoonMsg ? ` ｜ ${typhoonMsg}` : "") + holidayMsg;
            marqueeEl.className = "marquee-text has-issue";
        }
    } catch(e) {
        // 這個 catch 只會在所有代碼連線全部死掉時觸發（如完全無上網）
        marqueeEl.innerHTML = "📡 " + (currentLang==='en'?'System connection unstable.':'系統連線不穩定，請稍後再試。') + holidayMsg;
        marqueeEl.className = "marquee-text has-issue";
    }
}
