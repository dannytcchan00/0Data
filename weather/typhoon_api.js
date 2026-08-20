// typhoon_api.js - 颱風預測路徑、淡黃色漏斗範圍、距離圈與實時機構標籤模組

// 注入專屬 CSS 動畫 (逆時針旋轉 🌀)
const style = document.createElement('style');
style.innerHTML = `
    @keyframes spin-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
    .spin-ccw-icon { display: flex; align-items: center; justify-content: center; font-size: 38px; animation: spin-ccw 2s linear infinite; filter: drop-shadow(3px 3px 0px rgba(18,18,18,1)); }
`;
document.head.appendChild(style);

// 參考你提供嘅各國氣象機構專屬顏色
const agencyColorPalette = { 
    'JTWC': '#00e5ff', // 美軍 (青色)
    'JMA': '#ff00ff',  // 日本 (紫紅色)
    'NMC': '#9d00ff',  // 中國 (紫色)
    'CWA': '#ff8c00',  // 台灣 (橙色)
    'KMA': '#ccff00',  // 韓國 (螢光綠)
    'PAGASA': '#e84393', // 菲律賓 (粉紅色)
    'OTHER': '#ffffff' // 其他 (白色)
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

// 繪製香港距離圈與標籤
function drawDistanceRings(mapLayerGroup) {
    L.circle(hkoCenter, { radius: 1200000, color: '#38b6ff', weight: 2, fillColor: '#38b6ff', fillOpacity: 0.05, dashArray: '8, 8' }).addTo(mapLayerGroup);
    L.circle(hkoCenter, { radius: 800000, color: '#ffde59', weight: 2, fillColor: '#ffde59', fillOpacity: 0.08, dashArray: '8, 8' }).addTo(mapLayerGroup);
    L.circle(hkoCenter, { radius: 400000, color: '#ff914d', weight: 3, fillColor: '#ff914d', fillOpacity: 0.08, dashArray: '6, 6' }).addTo(mapLayerGroup);
    
    // 標示香港位置
    let hkIcon = L.divIcon({
        html: `<div style="background:#ff3131; color:#fff; font-size:0.75rem; font-weight:800; padding:2px 6px; border:2px solid #121212; box-shadow: 2px 2px 0px #121212; white-space:nowrap; transform: translate(-50%, -15px);">📍香港 (HK)</div>`,
        className: '', iconSize: [0, 0]
    });
    L.marker(hkoCenter, { icon: hkIcon, interactive: false, zIndexOffset: 2000 }).addTo(mapLayerGroup);
}

// 繪製各機構的颱風路徑、實時標籤與漏斗
function drawAgencyTrack(lines, points, mapLayerGroup, colorCode, agencyName, isJMA, isHKO) {
    // 1. 畫出實時路徑線 (LineString)
    lines.forEach(lineLatLngs => {
        L.polyline(lineLatLngs, { color: colorCode, weight: isJMA || isHKO ? 4 : 2.5, opacity: 0.9, dashArray: isJMA || isHKO ? '' : '6, 6' }).addTo(mapLayerGroup);
    });
    
    // 如果冇 LineString 但有點，自動連線
    if (lines.length === 0 && points.length > 1) {
        let lineLatLngs = points.map(p => [p.lat, p.lon]);
        L.polyline(lineLatLngs, { color: colorCode, weight: isJMA || isHKO ? 4 : 2.5, opacity: 0.9, dashArray: isJMA || isHKO ? '' : '6, 6' }).addTo(mapLayerGroup);
    }

    // 2. 針對日本氣象局 (JMA) 畫出淡黃色漏斗與颱風覆蓋圓圈
    if (isJMA && points.length > 0) {
        const coneColor = '#ffde59'; // 淡黃色
        let currentPt = points[0];
        
        // 颱風當前覆蓋圓圈 (150公里)
        L.circle([currentPt.lat, currentPt.lon], { radius: 150000, color: coneColor, weight: 2, fillColor: coneColor, fillOpacity: 0.15, dashArray: '6, 6' }).addTo(mapLayerGroup);
        
        // 漏斗預測影響範圍
        if (points.length > 1) {
            let leftPoints = [], rightPoints = [];
            points.forEach((pt, idx) => {
                let radius = 60000 + (idx * 45000); 
                if (idx > 0) L.circle([pt.lat, pt.lon], { radius: radius, color: 'rgba(255, 222, 89, 0.4)', weight: 1, dashArray: '4, 4', fill: false }).addTo(mapLayerGroup);
                
                let bearing = (idx < points.length - 1) ? calculateBearing(pt.lat, pt.lon, points[idx+1].lat, points[idx+1].lon) : calculateBearing(points[idx-1].lat, points[idx-1].lon, pt.lat, pt.lon);
                leftPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing - 90 + 360) % 360));
                rightPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing + 90) % 360));
            });
            let funnelPolygonCoords = [...leftPoints, ...rightPoints.reverse()];
            L.polygon(funnelPolygonCoords, { color: coneColor, weight: 1.5, dashArray: '5, 5', fillColor: 'rgba(255, 222, 89, 0.2)', fillOpacity: 0.25 }).addTo(mapLayerGroup);
        }
    }

    // 3. 畫出預測點及國家標籤
    points.forEach((pt, idx) => {
        let timeStr = pt.time.replace(/Forecast|預測|Center|Line|JMA|JTWC|CWA|NMC|KMA|PAGASA/gi, '').trim();
        if (!timeStr) timeStr = `Pt${idx}`;
        
        // 每個點旁邊顯示機構與時間的標籤
        let labelHtml = `<div style="position:absolute; left:16px; top:-12px; background:rgba(18,18,18,0.9); color:${colorCode}; font-size:10px; padding:2px 5px; border-radius:2px; white-space:nowrap; border:1px solid ${colorCode}; font-family:'Space Mono', monospace; font-weight:900; z-index:1000; box-shadow: 2px 2px 0px #121212;">[${agencyName}] ${timeStr}</div>`;
        
        if (idx === 0) {
            if (isJMA || isHKO) {
                // JMA 專屬逆時針旋轉 🌀
                let spinIcon = L.divIcon({ className: '', html: `<div class="spin-ccw-icon" style="color:${colorCode};">🌀</div>${labelHtml}`, iconSize: [40, 40], iconAnchor: [20, 20] });
                L.marker([pt.lat, pt.lon], { icon: spinIcon, zIndexOffset: 1000 }).addTo(mapLayerGroup);
            } else {
                let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:12px; height:12px; border:2px solid #121212; border-radius:50%; box-shadow:2px 2px 0px #121212; position:relative;">${labelHtml}</div>`, iconSize: [12, 12], iconAnchor: [6, 6] });
                L.marker([pt.lat, pt.lon], { icon: dotPin, zIndexOffset: 900 }).addTo(mapLayerGroup);
            }
        } else {
            let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:8px; height:8px; border:2px solid #121212; border-radius:50%; position:relative;">${labelHtml}</div>`, iconSize: [8, 8], iconAnchor: [4, 4] });
            L.marker([pt.lat, pt.lon], { icon: dotPin }).addTo(mapLayerGroup);
        }
    });
}

async function fetchAndRenderBothTyphoonMaps() {
    const hkoAlert = document.getElementById('no-tc-hko-alert');
    const agencyAlert = document.getElementById('no-tc-agency-alert');

    // 確保一開始先隱藏警告文字
    hkoAlert.style.display = 'none';
    agencyAlert.style.display = 'none';

    // ==========================================
    // 1. 香港天文台 XML (左邊地圖)
    // ==========================================
    try {
        tcHkoLayerGroup.clearLayers();
        drawDistanceRings(tcHkoLayerGroup); // 畫出距離圈

        const resHko = await fetch(`${tcXmlSource}?_=${Date.now()}`);
        if (!resHko.ok) throw new Error("No XML response");
        let xmlText = await resHko.text();
        xmlText = xmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, ''); 
        const docHko = new DOMParser().parseFromString(xmlText, "text/xml");

        let hkoPoints = [];
        let elements = docHko.getElementsByTagName("*");
        
        for (let i = 0; i < elements.length; i++) {
            let el = elements[i];
            let latNode = el.getElementsByTagName('lat')[0] || el.getElementsByTagName('latitude')[0] || el.getElementsByTagName('cLat')[0];
            let lonNode = el.getElementsByTagName('lon')[0] || el.getElementsByTagName('longitude')[0] || el.getElementsByTagName('cLon')[0];
            
            if (latNode && lonNode && latNode.parentNode === el) {
                if (!el.getAttribute('data-parsed')) {
                    let lat = parseFloat(latNode.textContent.trim()); 
                    let lon = parseFloat(lonNode.textContent.trim());
                    let timeNode = el.getElementsByTagName('time')[0] || el.getElementsByTagName('date')[0];
                    let time = timeNode ? timeNode.textContent.trim() : '';
                    if (!isNaN(lat) && !isNaN(lon)) { 
                        hkoPoints.push({ lat, lon, time }); 
                        el.setAttribute('data-parsed', 'true'); 
                    }
                }
            }
        }
        
        if (hkoPoints.length === 0) { 
            hkoAlert.style.display = 'flex'; 
            tcMapHko.setView(hkoCenter, 4);
        } else {
            drawAgencyTrack([], hkoPoints, tcHkoLayerGroup, '#ff3131', 'HKO', false, true);
            globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], hkoPoints[0].lat, hkoPoints[0].lon);
            let bounds = L.latLngBounds(hkoPoints.map(p => [p.lat, p.lon]));
            bounds.extend(hkoCenter); // 將香港納入範圍
            tcMapHko.fitBounds(bounds, { padding: [40, 40] });
        }
    } catch (err) { 
        console.error("HKO Typhoon Error:", err);
        hkoAlert.style.display = 'flex'; 
        tcMapHko.setView(hkoCenter, 4);
    }

    await new Promise(r => setTimeout(r, 10));

    // ==========================================
    // 2. 各國氣象機構 KML (右邊地圖) - 完美參考版
    // ==========================================
    try {
        tcAgencyLayerGroup.clearLayers();
        drawDistanceRings(tcAgencyLayerGroup); // 畫出距離圈

        const resAgy = await fetch(`${tcKmlSource}?_=${Date.now()}`);
        if (!resAgy.ok) throw new Error("No KML response");
        let kmlText = await resAgy.text();
        kmlText = kmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, ''); 
        const docAgy = new DOMParser().parseFromString(kmlText, "text/xml");
        
        let hasAgencyData = false; 
        let parsedAgencyTracks = {};
        let allAgencyLatLngs = []; 

        // 完美解析：以 Folder 為單位區分國家
        let folders = docAgy.querySelectorAll("Folder");
        for (let f = 0; f < folders.length; f++) {
            let folder = folders[f];
            let agencyNode = folder.querySelector("name");
            let agencyNameRaw = agencyNode ? agencyNode.textContent.trim().toUpperCase() : "UNKNOWN";
            
            let agency = 'OTHER';
            if (agencyNameRaw.includes('JTWC')) agency = 'JTWC';
            else if (agencyNameRaw.includes('JMA')) agency = 'JMA';
            else if (agencyNameRaw.includes('NMC') || agencyNameRaw.includes('CMA')) agency = 'NMC';
            else if (agencyNameRaw.includes('CWA') || agencyNameRaw.includes('TAIWAN')) agency = 'CWA';
            else if (agencyNameRaw.includes('PAGASA')) agency = 'PAGASA';
            else if (agencyNameRaw.includes('KMA')) agency = 'KMA';

            if (agencyNameRaw.includes('HKO') || agency === 'OTHER') continue;

            if (!parsedAgencyTracks[agency]) parsedAgencyTracks[agency] = { lines: [], points: [] };

            let placemarks = folder.querySelectorAll("Placemark");
            placemarks.forEach(pm => {
                let pmNameNode = pm.querySelector("name");
                let pmName = pmNameNode ? pmNameNode.textContent.trim() : "";

                // 解析線段 (LineString)
                let lsNode = pm.querySelector("LineString coordinates");
                if (lsNode) {
                    let coords = lsNode.textContent.trim().split(/\s+/);
                    let latlngs = [];
                    coords.forEach(c => {
                        let p = c.split(',');
                        if (p.length >= 2) latlngs.push([parseFloat(p[1]), parseFloat(p[0])]);
                    });
                    if (latlngs.length > 0) parsedAgencyTracks[agency].lines.push(latlngs);
                }

                // 解析節點 (Point)
                let ptNode = pm.querySelector("Point coordinates");
                if (ptNode) {
                    let c = ptNode.textContent.trim().split(',');
                    if (c.length >= 2) {
                        let lat = parseFloat(c[1]);
                        let lon = parseFloat(c[0]);
                        parsedAgencyTracks[agency].points.push({ lat: lat, lon: lon, time: pmName });
                        allAgencyLatLngs.push([lat, lon]);
                    }
                }
            });
        }

        // 開始將不同國家的路徑分別畫上地圖
        let typhoonCenterCoords = null;
        Object.keys(parsedAgencyTracks).forEach(agency => {
            let data = parsedAgencyTracks[agency];
            if (data.points.length > 0 || data.lines.length > 0) {
                hasAgencyData = true; 
                let color = agencyColorPalette[agency];
                let isJMA = (agency === 'JMA');
                
                // 畫出路線、節點、實時標籤，以及 JMA 專屬漏斗
                drawAgencyTrack(data.lines, data.points, tcAgencyLayerGroup, color, agency, isJMA, false);
                
                if (isJMA && data.points.length > 0) {
                    typhoonCenterCoords = [data.points[0].lat, data.points[0].lon];
                }
            }
        });

        // 處理地圖視角與警告字句
        if (!hasAgencyData) { 
            agencyAlert.style.display = 'flex'; 
            tcMapAgency.setView(hkoCenter, 4); 
        } else {
            agencyAlert.style.display = 'none';
            try {
                let bounds = L.latLngBounds(allAgencyLatLngs);
                bounds.extend(hkoCenter); // 確保香港始終在畫面內
                tcMapAgency.fitBounds(bounds, { padding: [40, 40] });
            } catch (boundsErr) {
                if (typhoonCenterCoords) tcMapAgency.setView(typhoonCenterCoords, 5);
                else tcMapAgency.setView(hkoCenter, 4);
            }
        }
    } catch (err) { 
        console.error("Agency Typhoon KML Error:", err);
        agencyAlert.style.display = 'flex'; 
        tcMapAgency.setView(hkoCenter, 4); 
    }

    // 更新左側的威脅警報數據
    if (typeof updateSmartThreatAlert === "function") {
        updateSmartThreatAlert();
    }
}
