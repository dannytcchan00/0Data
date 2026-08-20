async function fetchAstroData() {
    // 1. 無需等待外部 API，即時運算並顯示月相！
    try {
        if (typeof getMoonPhase === 'function') {
            const mp = getMoonPhase();
            document.getElementById('hk-moon').innerHTML = `<span style="font-size: 2rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${mp.i}</span> <span>${mp.n}</span>`;
        }
    } catch(e) {
        console.error("Moon phase error:", e);
    }

    // 2. 獨立拉取日出日落時間 (即使失敗亦不影響月相)
    try {
        const res = await fetch('https://wttr.in/HongKong?format=j1');
        if (!res.ok) return;
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
    } catch(e) {
        console.warn("Astro API Error:", e);
    }
}
