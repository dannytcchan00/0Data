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

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        map.invalidateSize(); 
        tcMapHko.invalidateSize(); 
        tcMapAgency.invalidateSize();
    }, 200);

    switchMapData('temp');
    fetchAllStationData(); 
    initRadarPlayer();     
    fetchTopOverview();
    fetchAstroData();
    
    setTimeout(() => {
        fetchAndRenderBothTyphoonMaps();
    }, 800);

    setInterval(silentBackgroundUpdate, 300000);
    setInterval(updateTick, 1000);
    updateTick(); 
});
