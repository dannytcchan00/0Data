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
requestAnimationFrame(() => {
    map.invalidateSize(); 
    tcMapHko.invalidateSize(); 
    tcMapAgency.invalidateSize();

    switchMapData('temp');
    fetchAllStationData(); 
    initRadarPlayer();     
    fetchTopOverview();
    fetchAstroData();
});

setTimeout(() => {
    fetchAndRenderBothTyphoonMaps();
}, 800); 

setInterval(silentBackgroundUpdate, 300000);
setInterval(updateTick, 1000);
