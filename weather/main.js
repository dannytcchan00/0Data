// main.js - 啟動器與定期背景更新

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

// 系統啟動設定
window.addEventListener('DOMContentLoaded', () => {
    // 確保地圖正確載入比例
    setTimeout(() => {
        map.invalidateSize(); 
        tcMapHko.invalidateSize(); 
        tcMapAgency.invalidateSize();
    }, 200);

    // 啟動所有功能
    switchMapData('temp');
    fetchAllStationData(); 
    initRadarPlayer();     
    fetchTopOverview();
    fetchAstroData();
    fetchAndRenderBothTyphoonMaps();

    // 計時器設定
    setInterval(silentBackgroundUpdate, 300000); // 每 5 分鐘刷新所有氣象與地圖數據
    setInterval(updateTick, 1000);               // 每 1 秒刷新時鐘
    updateTick();
});
