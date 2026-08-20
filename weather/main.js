// main.js - 系統啟動與定期背景更新引擎

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

// 系統啟動設定 (當網頁載入完成後自動執行)
window.addEventListener('DOMContentLoaded', () => {
    // 確保地圖正確載入比例，避免出現灰格
    setTimeout(() => {
        map.invalidateSize(); 
        tcMapHko.invalidateSize(); 
        tcMapAgency.invalidateSize();
    }, 200);

    // 啟動所有氣象資訊與圖表功能
    switchMapData('temp');
    fetchAllStationData(); 
    initRadarPlayer();     
    fetchTopOverview();
    fetchAstroData();
    
    // 延遲 0.8 秒載入颱風地圖，避免 API 請求塞車
    setTimeout(() => {
        fetchAndRenderBothTyphoonMaps();
    }, 800);

    // 設定自動更新計時器
    setInterval(silentBackgroundUpdate, 300000); // 每 5 分鐘 (300,000毫秒) 刷新所有氣象與地圖數據
    setInterval(updateTick, 1000);               // 每 1 秒刷新一次時鐘
    updateTick();                                // 即時顯示當前時間
});
