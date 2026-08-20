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
        
        // 加上 DOM 元素安全檢查，防止 HTML 缺少 ID 時引發報錯中斷
        const sunriseEl = document.getElementById('hk-sunrise');
        if (sunriseEl) sunriseEl.innerText = to24(astro.sunrise);
        
        const sunsetEl = document.getElementById('hk-sunset');
        if (sunsetEl) sunsetEl.innerText = to24(astro.sunset);
        
        const moonriseEl = document.getElementById('hk-moonrise');
        if (moonriseEl) moonriseEl.innerText = to24(astro.moonrise);
        
        const moonsetEl = document.getElementById('hk-moonset');
        if (moonsetEl) moonsetEl.innerText = to24(astro.moonset);

        // 正常情況下載入月相
        if (typeof getMoonPhase === "function") {
            const mp = getMoonPhase();
            const moonEl = document.getElementById('hk-moon');
            if (moonEl) {
                moonEl.innerHTML = `<span style="font-size: 2rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${mp.i}</span> <span>${mp.n}</span>`;
            }
        }
    } catch(e) {
        // 1. 將主要錯誤印出嚟，方便喺 Browser Console 尋找真兇 (例如 API 頻率限制或網絡問題)
        console.error("fetchAstroData 主程序發生錯誤:", e); 

        // 2. 備用方案容錯保護，防止 getMoonPhase 報錯導致徹底崩潰
        try {
            if (typeof getMoonPhase === "function") {
                const mp = getMoonPhase();
                const moonEl = document.getElementById('hk-moon');
                if (moonEl) {
                    moonEl.innerHTML = `<span style="font-size: 2rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${mp.i}</span> <span>${mp.n}</span>`;
                }
            } else {
                console.error("找不到 getMoonPhase 函數，請檢查相關的外部 JS 檔案是否已正確載入。");
            }
        } catch (fallbackError) {
            console.error("月相備用方案也加載失敗:", fallbackError);
        }
    }
}
