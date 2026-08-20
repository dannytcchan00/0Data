// typhoon_api.js - 颱風預測路徑、淡黃色漏斗範圍、各國專屬顏色與實時機構標籤

// 加入自定義 CSS 動畫 (逆時針旋轉)
if (!document.getElementById('typhoon-styles')) {
    const style = document.createElement('style');
    style.id = 'typhoon-styles';
    style.innerHTML = `
        @keyframes spin-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        .spin-ccw-icon { animation: spin-ccw 1.5s linear infinite; display: inline-block; line-height: 1; }
        .hk-marker-label { background: #121212; border: 2px solid #fff; color: #fff; font-size: 10px; font-weight: 900; padding: 2px 6px; box-shadow: 2px 2px 0px #121212; white-space: nowrap; font-family: 'Space Mono', monospace; }
    `;
    document.head.appendChild(style);
}

// 各國氣象機構專屬顏色
const agencyColorPalette = { 
    'JTWC': '#9b59b6',   // 美軍 (紫色)
    'JMA': '#f1c40f',    // 日本 (淡黃色 - 基準漏斗)
    'NMC': '#2ecc71',    // 中國 (綠色)
    'CWA': '#e67e22',    // 台灣 (橙色)
    'PAGASA': '#e84393', // 菲律賓 (粉紅色)
    'OTHER': '#9e9e9e'   // 其他 (灰色)
};

function getOffsetLatLng(lat, lon, distanceMeters, bearingDegrees) {
    const rad = bearingDegrees * Math.PI / 180;
    const deltaLat = (distanceMeters * Math.cos(rad)) / 111320;
    const deltaLon = (distanceMeters * Math.sin(rad)) / (111320 * Math.cos(lat * Math.PI / 180));
    return [lat + deltaLat, lon + deltaLon];
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const phi1 = lat1 * Math.PI / 180, phi2 = lat2 * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function hexToRgba(hex, opacity) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// 繪製颱風路徑、淡黃色漏斗與實時標籤
function drawTyphoonTrack(points, mapLayerGroup, colorCode, agencyName, isJMA, isHKO) {
    if (points.length === 0) return;
    
    // 淡黃色漏斗與覆蓋圈設定 (以 JMA 或 HKO 為基準)
    const coneColor = isHKO ? '#e74c3c' : '#f1c40f'; 
    const coneFill = isHKO ? 'rgba(231, 76, 60, 0.15)' : 'rgba(241, 196, 15, 0.15)'; 

    if (isJMA || isHKO) {
        let currentPt = points[0]; 
        
        // 畫出當前颱風影響覆蓋範圍的圓圈 (半徑 150km)
        L.circle([currentPt.lat, currentPt.lon], { 
            radius: 150000, color: coneColor, weight: 2, fillColor: coneColor, fillOpacity: 0.2, dashArray: '6, 6'
        }).addTo(mapLayerGroup);
        
        // 畫出淡黃色漏斗預測影響範圍
        if (points.length > 1) {
            let leftPoints = [], rightPoints = [];
            points.forEach((pt, idx) => {
                let radius = 60000 + (idx * 50000); 
                if (idx > 0) {
                    L.circle([pt.lat, pt.lon], { radius: radius, color: hexToRgba(coneColor, 0.4), weight: 1, dashArray: '4, 4', fill: false }).addTo(mapLayerGroup);
                }
                let bearing = (idx < points.length - 1) ? calculateBearing(pt.lat, pt.lon, points[idx+1].lat, points[idx+1].lon) : calculateBearing(points[idx-1].lat, points[idx-1].lon, pt.lat, pt.lon);
                leftPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing - 90 + 360) % 360));
                rightPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing + 90) % 360));
            });
            let funnelPolygonCoords = [...leftPoints, ...rightPoints.reverse()];
            L.polygon(funnelPolygonCoords, { 
                color: coneColor, weight: 2, dashArray: '8, 8', fillColor: coneFill, fillOpacity: 0.2 
            }).addTo(mapLayerGroup);
        }
    }

    // 畫出各國預測路徑實線 (JMA/HKO 用實線，其他國家用虛線區分)
    let latlngs = points.map(p => [p.lat, p.lon]);
    L.polyline(latlngs, { 
        color: colorCode, 
        weight: (isJMA || isHKO) ? 3.5 : 2.5, 
        opacity: 1, 
        dashArray: (isJMA || isHKO) ? '' : '6, 6' 
    }).addTo(mapLayerGroup);
    
    // 畫出每個點的「氣象局縮寫 + 時間」直觀標籤
    points.forEach((pt, idx) => {
        let timeStr = pt.time ? pt.time.replace(/Forecast|預測|Center|Line|JMA|JTWC|CWA|NMC|PAGASA/gi, '').trim() : '';
        if (timeStr === '') timeStr = `Pt${idx}`;
        
        let labelHtml = `
            <div style="position:absolute; left:14px; top:-10px; background:rgba(18,18,18,0.9); color:${colorCode}; font-size:0.7rem; padding:2px 6px; border-radius:4px; white-space:nowrap; border:1px solid ${colorCode}; font-weight:900; z-index:1000; box-shadow: 2px 2px 0px rgba(0,0,0,0.8);">
                ${agencyName} ${timeStr}
            </div>
        `;
        
        if (idx === 0) {
            // 當前位置點
            if (isJMA || isHKO) {
                // JMA & HKO 專屬：逆時針旋轉的 🌀
                let spinningPin = L.divIcon({ className: '', html: `<div class="spin-ccw-icon" style="font-size:45px; filter:drop-shadow(3px 3px 0px #121212);">🌀</div>${labelHtml}`, iconSize: [45, 45], iconAnchor: [22, 22] });
                L.marker([pt.lat, pt.lon], { icon: spinningPin, zIndexOffset: 1000 }).addTo(mapLayerGroup);
            } else {
                // 其他國家：實心大圓點
                let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:14px; height:14px; border-radius:50%; border:2px solid #121212; box-shadow:2px 2px 0px #121212; position:relative;">${labelHtml}</div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
                L.marker([pt.lat, pt.lon], { icon: dotPin, zIndexOffset: 900 }).addTo(mapLayerGroup);
            }
        } else {
            // 預測位置點 (所有國家通用)
            let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:8px; height:8px; border-radius:50%; border:2px solid #121212; box-shadow:1px 1px 0px #121212; position:relative;">${labelHtml}</div>`, iconSize: [8, 8], iconAnchor: [4, 4] });
            L.marker([pt.lat, pt.lon], { icon: dotPin }).addTo(mapLayerGroup);
        }
    });
}

// 清除地圖上原有的香港天文台文字標籤
function clearOldHKOMarkers(mapObj) {
    mapObj.eachLayer(layer => {
        if (layer.options && layer.options.icon && layer.options.icon.options.html) {
            if (layer.options.icon.options.html.includes('香港天文台')) {
                mapObj.removeLayer(layer);
            }
        }
    });
}

// 繪製香港地標與距離圈 (1200km, 800km, 400km)
function drawHongKongRings(layerGroup) {
    // 距離圈
    L.circle(hkoCenter, { radius: 1200000, color: '#38b6ff', weight: 2, fillColor: '#38b6ff', fillOpacity: 0.05, dashArray: '8, 8' }).addTo(layerGroup);
    L.circle(hkoCenter, { radius: 800000, color: '#ffde59', weight: 2, fillColor: '#ffde59', fillOpacity: 0.08, dashArray: '8, 8' }).addTo(layerGroup);
    L.circle(hkoCenter, { radius: 400000, color: '#ff914d', weight: 3, fillColor: '#ff914d', fillOpacity: 0.08, dashArray: '6, 6' }).addTo(layerGroup);
    
    // 標明香港位置
    let hkIcon = L.divIcon({ html: '<div class="hk-marker-label">HONG KONG</div>', className: '', iconSize: null, iconAnchor: [30, 10] });
    L.marker(hkoCenter, { icon: hkIcon, zIndexOffset: 2000 }).addTo(layerGroup);
}

async function fetchAndRenderBothTyphoonMaps() {
    const hkoAlert = document.getElementById('no-tc-hko-alert');
    const agencyAlert = document.getElementById('no-tc-agency-alert');

    // 移除舊的 HKO 文字標籤
    clearOldHKOMarkers(tcMapHko);
    clearOldHKOMarkers(tcMapAgency);

    // ==========================================
    // 1. 香港天文台 XML/KML (左邊地圖) - 完美兩階段讀取修正版 (current_typhoon.xml)
    // ==========================================
    try {
        // 第一階段：讀取 current_typhoon.xml 以獲取真實數據網址
        const listUrl = "https://dannytcchan00.github.io/0Data/data/current_typhoon.xml";
        const resList = await fetch(`${listUrl}?_=${Date.now()}`);
        if (!resList.ok) throw new Error("無法讀取 current_typhoon.xml");
        
        const listText = await resList.text();
        const listDoc = new DOMParser().parseFromString(listText, "text/xml");
        
        let targetUrl = "";
        
        // 嘗試從可能嘅標籤提取網址
        const urlTags = ["url", "link", "loc", "path", "file", "href"];
        for (let tag of urlTags) {
            let nodes = listDoc.getElementsByTagName(tag);
            for (let i = 0; i < nodes.length; i++) {
                let val = nodes[i].textContent.trim();
                // 過濾掉 XML 預設嘅 xmlns 命名空間網址 (如 w3.org)
                if (val && !val.includes("w3.org")) {
                    targetUrl = val;
                    break;
                }
            }
            if (targetUrl) break;
        }
        
        // 如果標籤解析唔到，用 Regex 喺檔案內直接抽取第一條 .xml / .kml 檔名或 http 網址
        if (!targetUrl) {
            let match = listText.match(/https?:\/\/[^<>\s"']+\.(xml|kml)/i) || 
                        listText.match(/[^<>\s"']+\.(xml|kml)/i) || 
                        listText.match(/https?:\/\/[^<>\s"']+/i);
            if (match) targetUrl = match[0];
        }
        
        if (!targetUrl) throw new Error("喺 current_typhoon.xml 入面搵唔到真正嘅颱風資料連結");
        
        // 處理相對路徑，轉換為絕對路徑
        if (!targetUrl.startsWith('http')) {
            targetUrl = new URL(targetUrl, "https://dannytcchan00.github.io/0Data/data/").href;
        }

        // 第二階段：讀取真正嘅颱風數據檔案
        const cacheBuster = targetUrl.includes('?') ? `&_=${Date.now()}` : `?_=${Date.now()}`;
        const resHko = await fetch(`${targetUrl}${cacheBuster}`);
        if (!resHko.ok) throw new Error("無法讀取目標颱風數據");
        
        let xmlText = await resHko.text();
        
        // 移除 XML 命名空間聲明，避免 DOM 解析失敗
        xmlText = xmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, '');
        // 移除標籤前綴 (例如把 <edxml:cLat> 強制轉換成 <cLat>)
        xmlText = xmlText.replace(/(<\/?)[a-zA-Z0-9_-]+:/g, '$1');
        
        const docHko = new DOMParser().parseFromString(xmlText, "text/xml");

        tcHkoLayerGroup.clearLayers();
        drawHongKongRings(tcHkoLayerGroup); // 畫圈同香港標記

        let hkoPoints = [];
        let elements = docHko.getElementsByTagName("*");
        
        for (let i = 0; i < elements.length; i++) {
            let el = elements[i];
            if (el.getAttribute('data-parsed')) continue;

            // 方案 A：支援標準 XML/RSS 格式 (含 HKO 特有的 cLat/cLon)
            let latNode = el.getElementsByTagName('lat')[0] || el.getElementsByTagName('latitude')[0] || el.getElementsByTagName('cLat')[0];
            let lonNode = el.getElementsByTagName('lon')[0] || el.getElementsByTagName('longitude')[0] || el.getElementsByTagName('cLon')[0];
            
            if (latNode && lonNode && latNode.parentNode === el) {
                let lat = parseFloat(latNode.textContent.trim()); 
                let lon = parseFloat(lonNode.textContent.trim());
                let timeNode = el.getElementsByTagName('time')[0] || el.getElementsByTagName('date')[0] || el.getElementsByTagName('pubDate')[0];
                let time = timeNode ? timeNode.textContent.trim() : '';
                if (!isNaN(lat) && !isNaN(lon)) { 
                    hkoPoints.push({ lat, lon, time }); 
                    el.setAttribute('data-parsed', 'true'); 
                }
                continue;
            }

            // 方案 B：支援 KML 格式 (<Point><coordinates>...</coordinates></Point>)
            if (el.tagName.toLowerCase() === 'point') {
                let coordsNode = el.getElementsByTagName('coordinates')[0];
                if (coordsNode && coordsNode.parentNode === el) {
                    let parts = coordsNode.textContent.trim().split(',');
                    if (parts.length >= 2) {
                        let lon = parseFloat(parts[0]);
                        let lat = parseFloat(parts[1]);
                        
                        let time = '';
                        let parent = el.parentNode;
                        while(parent && parent.tagName && parent.tagName.toLowerCase() !== 'placemark') {
                            parent = parent.parentNode;
                        }
                        if (parent) {
                            let nameNode = parent.getElementsByTagName('name')[0];
                            if (nameNode) time = nameNode.textContent.trim();
                        }
                        
                        if (!isNaN(lat) && !isNaN(lon)) { 
                            hkoPoints.push({ lat, lon, time }); 
                            el.setAttribute('data-parsed', 'true'); 
                        }
                    }
                }
            }
        }
        
        if (hkoPoints.length === 0) { 
            hkoAlert.style.display = 'flex'; 
        } else {
            hkoAlert.style.display = 'none';
            drawTyphoonTrack(hkoPoints, tcHkoLayerGroup, themeColors.red, 'HKO', false, true);
            globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], hkoPoints[0].lat, hkoPoints[0].lon);
        }
        tcMapHko.setView(hkoCenter, 4);
    } catch (err) { 
        console.error("HKO Typhoon Error:", err);
        hkoAlert.style.display = 'flex'; 
        tcMapHko.setView(hkoCenter, 4); 
    }

    await new Promise(r => setTimeout(r, 10));

    // ==========================================
    // 2. 各國氣象機構 KML (右邊地圖) - 完美 Folder 解析法
    // ==========================================
    try {
        const resAgy = await fetch(`${tcKmlSource}?_=${Date.now()}`);
        if (!resAgy.ok) throw new Error("No KML response");
        let kmlText = await resAgy.text();
        
        kmlText = kmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, '');
        const docAgy = new DOMParser().parseFromString(kmlText, "text/xml");
        
        tcAgencyLayerGroup.clearLayers();
        drawHongKongRings(tcAgencyLayerGroup); // 畫圈同香港標記
        
        let hasAgencyData = false; 
        let parsedAgencyTracks = {};
        let agencyPointSet = {}; 

        // 從 Folder 層級開始解析，徹底解決混亂問題
        let folders = docAgy.getElementsByTagName("Folder");
        for (let i = 0; i < folders.length; i++) {
            let folder = folders[i];
            let nameNode = folder.getElementsByTagName("name")[0];
            let folderName = nameNode ? nameNode.textContent.trim().toUpperCase() : "";
            
            let agency = null;
            if (folderName.includes('JTWC')) agency = 'JTWC';
            else if (folderName.includes('JMA')) agency = 'JMA';
            else if (folderName.includes('NMC') || folderName.includes('CMA')) agency = 'NMC';
            else if (folderName.includes('CWA') || folderName.includes('CWB') || folderName.includes('TAIWAN')) agency = 'CWA';
            else if (folderName.includes('PAGASA')) agency = 'PAGASA';
            
            if (!agency || folderName.includes('HKO')) continue;

            if (!parsedAgencyTracks[agency]) parsedAgencyTracks[agency] = [];
            if (!agencyPointSet[agency]) agencyPointSet[agency] = new Set();

            // 搵屬於呢個 Folder 下面嘅 Placemarks
            let placemarks = folder.getElementsByTagName("Placemark");
            for (let p = 0; p < placemarks.length; p++) {
                let pm = placemarks[p];
                let pmNameNode = pm.getElementsByTagName("name")[0];
                let pmName = pmNameNode ? pmNameNode.textContent.trim() : "";
                
                // 嚴格只抽取 <Point> 的座標
                let pointNodes = pm.getElementsByTagName('Point');
                for(let j = 0; j < pointNodes.length; j++) {
                    let coordsNode = pointNodes[j].getElementsByTagName('coordinates')[0];
                    if (coordsNode) {
                        let parts = coordsNode.textContent.trim().split(',');
                        if (parts.length >= 2) {
                            let lon = parseFloat(parts[0]), lat = parseFloat(parts[1]);
                            if (!isNaN(lat) && !isNaN(lon)) {
                                let coordKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
                                if (!agencyPointSet[agency].has(coordKey)) {
                                    agencyPointSet[agency].add(coordKey);
                                    parsedAgencyTracks[agency].push({ lat, lon, time: pmName });
                                }
                            }
                        }
                    }
                }
            }
        }

        let allAgencyLatLngs = [];

        // 畫上各國路線，以 JMA 作為漏斗基準
        Object.keys(parsedAgencyTracks).forEach(agency => {
            let pts = parsedAgencyTracks[agency];
            if (pts.length > 0) {
                hasAgencyData = true; 
                let color = agencyColorPalette[agency] || agencyColorPalette['OTHER'];
                let isJMA = (agency === 'JMA');
                
                // 畫線路 (只有 JMA 傳入 true 以啟動淡黃色漏斗及🌀)
                drawTyphoonTrack(pts, tcAgencyLayerGroup, color, agency, isJMA, false);
                
                pts.forEach(p => allAgencyLatLngs.push([p.lat, p.lon]));
            }
        });

        if (!hasAgencyData) { 
            agencyAlert.style.display = 'flex'; 
        } else {
            agencyAlert.style.display = 'none';
        }
        
        tcMapAgency.setView(hkoCenter, 4); 

    } catch (err) { 
        console.error("Agency Typhoon KML Error:", err);
        agencyAlert.style.display = 'flex'; 
        tcMapAgency.setView(hkoCenter, 4); 
    }

    if (typeof updateSmartThreatAlert === "function") {
        updateSmartThreatAlert();
    }
}
