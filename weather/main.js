// main.js

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
requestAnimationFrame(() => {
    // 確保地圖正確載入比例
    map.invalidateSize(); 
    tcMapHko.invalidateSize(); 
    tcMapAgency.invalidateSize();

    // 啟動所有功能
    switchMapData('temp');
    fetchAllStationData(); 
    initRadarPlayer();     
    fetchTopOverview();
    fetchAstroData();
});

// 延遲 0.8 秒載入颱風地圖，避免塞車
setTimeout(() => {
    fetchAndRenderBothTyphoonMaps();
}, 800); 

// 自動更新機制
setInterval(silentBackgroundUpdate, 300000); // 每 5 分鐘刷新所有氣象與地圖數據
setInterval(updateTick, 1000);               // 每 1 秒刷新時間
