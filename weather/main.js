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

window.addEventListener('DOMContentLoaded', () => {
    // 延遲初始化確保 DOM 大小正確，不會出現地圖灰格
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
    
    setTimeout(() => {
        fetchAndRenderBothTyphoonMaps();
    }, 800);

    setInterval(silentBackgroundUpdate, 300000); // 5 分鐘背景自動刷新
    setInterval(updateTick, 1000);               // 1 秒時鐘刷新
    updateTick(); 
});
