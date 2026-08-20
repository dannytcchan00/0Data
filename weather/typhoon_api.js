// typhoon_api.js - 颱風預測路徑、淡黃色漏斗範圍、實時標籤與香港距離警戒圈

// 各國氣象機構專屬顏色
const agencyColorPalette = { 
    'JTWC': '#9b59b6',   // 美軍 (紫色)
    'JMA': '#f1c40f',    // 日本 (淡黃色 - 配合漏斗)
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

// 🛡️ 防彈 XML Node 搜尋器 (無視命名空間與大小寫)
function findNodes(parent, tagName) {
    let res = [];
    if (!parent || !parent.getElementsByTagName) return res;
    let tags = parent.getElementsByTagName("*");
    let lowerTag = tagName.toLowerCase();
    for(let i=0; i<tags.length; i++) {
        let parts = tags[i].tagName.split(':');
        let local = parts[parts.length-1].toLowerCase();
        if(local === lowerTag) res.push(tags[i]);
    }
    return res;
}

// 🎯 新增：繪製香港專屬位置標記與 1200km, 800km, 400km 警戒距離圈
function drawHKRingsAndMarker(layerGroup) {
    // 1200km 監測圈 (藍色)
    L.circle(hkoCenter, { radius: 1200000, color: '#3498db', weight: 2, fillColor: '#3498db', fillOpacity: 0.04, dashArray: '6, 6' }).addTo(layerGroup);
    // 800km 警戒圈 (黃色)
    L.circle(hkoCenter, { radius: 800000, color: '#f1c40f', weight: 2, fillColor: '#f1c40f', fillOpacity: 0.05, dashArray: '6, 6' }).addTo(layerGroup);
    // 400km 高危圈 (橙色)
    L.circle(hkoCenter, { radius: 400000, color: '#e67e22', weight: 2.5, fillColor: '#e67e22', fillOpacity: 0.07, dashArray: '6, 6' }).addTo(layerGroup);
    
    // 香港專屬顯眼標記
    let hkPin = L.divIcon({ 
        className: '', 
        html: `<div style="background:#e74c3c; color:#fff; font-size:0.75rem; font-weight:800; padding:3px 8px; border-radius:6px; border:2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.8); white-space:nowrap;">📍 香港 HKO</div>`, 
        iconSize: null, 
        iconAnchor: [35, 12] 
    });
    L.marker(hkoCenter, { icon: hkPin, zIndexOffset: 2000, interactive: false }).addTo(layerGroup);
}

// 繪製 HKO 左邊地圖的路徑與漏斗
function drawHKOTyphoonTrack(points, mapLayerGroup) {
    if (points.length === 0) return;
    let colorCode = themeColors.red;
    let currentPt = points[0]; 
    
    // 颱風當前風力覆蓋圈 (150公里)
    L.circle([currentPt.lat, currentPt.lon], { radius: 150000, color: colorCode, weight: 2, fillColor: colorCode, fillOpacity: 0.15 }).addTo(mapLayerGroup);
    
    // 漏斗預測影響範圍
    if (points.length > 1) {
        let leftPoints = [], rightPoints = [];
        points.forEach((pt, idx) => {
            let radius = 60000 + (idx * 50000); 
            if (idx > 0) L.circle([pt.lat, pt.lon], { radius: radius, color: hexToRgba(colorCode, 0.3), weight: 1, dashArray: '4, 4', fill: false }).addTo(mapLayerGroup);
            let bearing = (idx < points.length - 1) ? calculateBearing(pt.lat, pt.lon, points[idx+1].lat, points[idx+1].lon) : calculateBearing(points[idx-1].lat, points[idx-1].lon, pt.lat, pt.lon);
            leftPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing - 90 + 360) % 360));
            rightPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing + 90) % 360));
        });
        let funnelPolygonCoords = [...leftPoints, ...rightPoints.reverse()];
        L.polygon(funnelPolygonCoords, { color: colorCode, weight: 1.5, dashArray: '5, 5', fillColor: 'rgba(231, 76, 60, 0.15)', fillOpacity: 0.25 }).addTo(mapLayerGroup);
    }

    let latlngs = points.map(p => [p.lat, p.lon]);
    L.polyline(latlngs, { color: colorCode, weight: 3.5, opacity: 0.9 }).addTo(mapLayerGroup);
    
    points.forEach((pt, idx) => {
        let labelHtml = `<div style="position:absolute; left:14px; top:-10px; background:rgba(20,20,20,0.85); color:${colorCode}; font-size:0.7rem; padding:2px 6px; border-radius:4px; white-space:nowrap; border:1px solid ${colorCode}; font-weight:800; z-index:1000;">HKO ${pt.time || ''}</div>`;
        if (idx === 0) {
            let spinningPin = L.divIcon({ className: '', html: `<div class="spinning-typhoon-icon">🌀</div>${labelHtml}`, iconSize: [40, 40], iconAnchor: [20, 20] });
            L.marker([pt.lat, pt.lon], { icon: spinningPin, zIndexOffset: 1000 }).addTo(mapLayerGroup);
        } else {
            let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:8px; height:8px; border-radius:50%; border:1px solid rgba(255,255,255,0.9); position:relative;">${labelHtml}</div>`, iconSize: [8, 8], iconAnchor: [4, 4] });
            L.marker([pt.lat, pt.lon], { icon: dotPin }).addTo(mapLayerGroup);
        }
    });
}

async function fetchAndRenderBothTyphoonMaps() {
    const hkoAlert = document.getElementById('no-tc-hko-alert');
    const agencyAlert = document.getElementById('no-tc-agency-alert');

    // ==========================================
    // 1. 香港天文台 XML (左邊地圖)
    // ==========================================
    try {
        const resHko = await fetch(`${tcXmlSource}?_=${Date.now()}`);
        if (!resHko.ok) throw new Error("No XML response");
        const xmlText = await resHko.text();
        const docHko = new DOMParser().parseFromString(xmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, ''), "text/xml");

        tcHkoLayerGroup.clearLayers();
        
        // 畫出香港距離警戒圈
        drawHKRingsAndMarker(tcHkoLayerGroup);
        
        let hkoPoints = [];
        let lats = findNodes(docHko, 'lat');
        if (lats.length === 0) lats = findNodes(docHko, 'latitude');
        if (lats.length === 0) lats = findNodes(docHko, 'cLat');

        lats.forEach(latNode => {
            let parent = latNode.parentNode;
            if (parent && !parent.getAttribute('data-parsed')) {
                let lonNode = findNodes(parent, 'lon')[0] || findNodes(parent, 'longitude')[0] || findNodes(parent, 'cLon')[0];
                let timeNode = findNodes(parent, 'time')[0] || findNodes(parent, 'date')[0];
                
                if (lonNode) {
                    let lat = parseFloat(latNode.textContent.trim());
                    let lon = parseFloat(lonNode.textContent.trim());
                    let time = timeNode ? timeNode.textContent.trim() : '';
                    if (!isNaN(lat) && !isNaN(lon)) {
                        hkoPoints.push({ lat, lon, time });
                        parent.setAttribute('data-parsed', 'true');
                    }
                }
            }
        });
        
        if (hkoPoints.length === 0) { 
            hkoAlert.style.display = 'flex'; 
        } else {
            hkoAlert.style.display = 'none';
            drawHKOTyphoonTrack(hkoPoints, tcHkoLayerGroup);
            globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], hkoPoints[0].lat, hkoPoints[0].lon);
        }
        tcMapHko.fitBounds(hkoBounds1200);
    } catch (err) { 
        console.error("HKO Typhoon Error:", err);
        hkoAlert.style.display = 'flex'; 
        tcMapHko.setView(hkoCenter, 4); 
    }

    await new Promise(r => setTimeout(r, 10));

    // ==========================================
    // 2. 各國氣象機構 KML (右邊地圖)
    // ==========================================
    try {
        const resAgy = await fetch(`${tcKmlSource}?_=${Date.now()}`);
        if (!resAgy.ok) throw new Error("No KML response");
        const kmlText = await resAgy.text();
        const docAgy = new DOMParser().parseFromString(kmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, ''), "text/xml");
        
        tcAgencyLayerGroup.clearLayers();
        
        // 畫出香港距離警戒圈
        drawHKRingsAndMarker(tcAgencyLayerGroup);

        let hasAgencyData = false; 
        let foundAgencies = new Set(); 
        let typhoonCenterCoords = null; 
        let parsedAgencyTracks = {};
        let agencyPointSet = {}; 

        let placemarks = findNodes(docAgy, 'Placemark');

        placemarks.forEach(pm => {
            let nameNode = findNodes(pm, 'name')[0];
            let pmName = nameNode ? nameNode.textContent.trim() : '';
            
            let folderNode = pm.parentNode;
            let folderName = '';
            while (folderNode && folderNode.nodeType === 1) { 
                let tag = folderNode.tagName.toLowerCase();
                if (tag.includes('folder') || tag.includes('document')) {
                    let fNameNode = findNodes(folderNode, 'name')[0];
                    if (fNameNode) folderName = fNameNode.textContent.trim() + " " + folderName;
                }
                folderNode = folderNode.parentNode;
            }
            
            let combinedText = (pmName + " " + folderName).toUpperCase();
            let agency = null;
            
            if (combinedText.includes('JTWC')) agency = 'JTWC';
            else if (combinedText.includes('JMA')) agency = 'JMA';
            else if (combinedText.includes('NMC') || combinedText.includes('CMA')) agency = 'NMC';
            else if (combinedText.includes('CWA') || combinedText.includes('CWB') || combinedText.includes('TAIWAN')) agency = 'CWA';
            else if (combinedText.includes('PAGASA')) agency = 'PAGASA';
            
            if (!agency || combinedText.includes('HKO')) return; 

            if (!parsedAgencyTracks[agency]) parsedAgencyTracks[agency] = [];
            
            // 抽取 <Point> 的座標
            let points = findNodes(pm, 'Point');
            points.forEach(pt => {
                let coordsNode = findNodes(pt, 'coordinates')[0];
                if (coordsNode) {
                    let parts = coordsNode.textContent.trim().split(',');
                    if (parts.length >= 2) {
                        let lon = parseFloat(parts[0]), lat = parseFloat(parts[1]);
                        if (!isNaN(lat) && !isNaN(lon)) {
                            let isDuplicate = parsedAgencyTracks[agency].some(p => Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lon - lon) < 0.001);
                            if (!isDuplicate) {
                                parsedAgencyTracks[agency].push({ lat, lon, time: pmName });
                            }
                        }
                    }
                }
            });
            
            // 抽取 <LineString> 的座標畫線
            let lineStrs = findNodes(pm, 'LineString');
            lineStrs.forEach(ls => {
                let coordsNode = findNodes(ls, 'coordinates')[0];
                if (coordsNode) {
                    let coords = coordsNode.textContent.trim().split(/\s+/);
                    let latlngs = [];
                    for (let c = 0; c < coords.length; c++) {
                        let parts = coords[c].split(',');
                        if (parts.length >= 2) {
                            let lon = parseFloat(parts[0]); let lat = parseFloat(parts[1]);
                            if (!isNaN(lat) && !isNaN(lon)) latlngs.push([lat, lon]);
                        }
                    }
                    if (latlngs.length > 0) {
                        let colorCode = agencyColorPalette[agency] || agencyColorPalette['OTHER'];
                        let isJMA = (agency === 'JMA');
                        L.polyline(latlngs, { color: colorCode, weight: isJMA ? 3.5 : 2.5, dashArray: '5, 5', opacity: 0.9 }).addTo(tcAgencyLayerGroup);
                    }
                }
            });
        });

        let allAgencyLatLngs = [];
        let jmaPointsForCone = []; 

        Object.keys(parsedAgencyTracks).forEach(agency => {
            let pts = parsedAgencyTracks[agency];
            if (pts.length > 0) {
                hasAgencyData = true; 
                foundAgencies.add(agency);
                let colorCode = agencyColorPalette[agency];
                let isJMA = (agency === 'JMA');
                
                if (isJMA) jmaPointsForCone = pts;

                // 畫出每個點的實時標籤與圖示
                pts.forEach((pt, idx) => {
                    let timeStr = pt.time ? pt.time.replace(/Forecast|預測|Center|Line|JMA|JTWC|CWA|NMC|PAGASA/gi, '').trim() : '';
                    if (timeStr === '') timeStr = `Pt${idx}`;
                    
                    let labelHtml = `<div style="position:absolute; left:16px; top:-10px; background:rgba(20,20,20,0.85); color:${colorCode}; font-size:0.75rem; padding:2px 6px; border-radius:4px; white-space:nowrap; border:1px solid ${colorCode}; font-weight:800; z-index:1000; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">${agency} ${timeStr}</div>`;
                    
                    if (idx === 0) {
                        if (isJMA) {
                            typhoonCenterCoords = [pt.lat, pt.lon];
                            let spinningPin = L.divIcon({ className: '', html: `<div class="spinning-typhoon-icon">🌀</div>${labelHtml}`, iconSize: [40, 40], iconAnchor: [20, 20] });
                            L.marker([pt.lat, pt.lon], { icon: spinningPin, zIndexOffset: 1000 }).addTo(tcAgencyLayerGroup);
                        } else {
                            let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:14px; height:14px; border-radius:50%; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.8); position:relative;">${labelHtml}</div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
                            L.marker([pt.lat, pt.lon], { icon: dotPin, zIndexOffset: 900 }).addTo(tcAgencyLayerGroup);
                        }
                    } else {
                        let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:8px; height:8px; border-radius:50%; border:1px solid rgba(255,255,255,0.9); box-shadow:0 1px 3px rgba(0,0,0,0.5); position:relative;">${labelHtml}</div>`, iconSize: [8, 8], iconAnchor: [4, 4] });
                        L.marker([pt.lat, pt.lon], { icon: dotPin }).addTo(tcAgencyLayerGroup);
                    }
                    allAgencyLatLngs.push([pt.lat, pt.lon]);
                });
            }
        });

        // 專門為 JMA 畫出淡黃色漏斗與覆蓋圈
        if (jmaPointsForCone.length > 0) {
            let jmaColor = agencyColorPalette['JMA']; 
            let currentPt = jmaPointsForCone[0];
            
            L.circle([currentPt.lat, currentPt.lon], { radius: 150000, color: jmaColor, weight: 2, fillColor: jmaColor, fillOpacity: 0.15 }).addTo(tcAgencyLayerGroup);
            
            if (jmaPointsForCone.length > 1) {
                let leftPts = [], rightPts = [];
                for(let i=0; i<jmaPointsForCone.length; i++) {
                    let radius = 60000 + (i * 50000);
                    if (i > 0) L.circle([jmaPointsForCone[i].lat, jmaPointsForCone[i].lon], { radius: radius, color: hexToRgba(jmaColor, 0.3), weight: 1, dashArray: '4, 4', fill: false }).addTo(tcAgencyLayerGroup);
                    
                    let bearing = (i < jmaPointsForCone.length - 1) ? calculateBearing(jmaPointsForCone[i].lat, jmaPointsForCone[i].lon, jmaPointsForCone[i+1].lat, jmaPointsForCone[i+1].lon) : calculateBearing(jmaPointsForCone[i-1].lat, jmaPointsForCone[i-1].lon, jmaPointsForCone[i].lat, jmaPointsForCone[i].lon);
                    leftPts.push(getOffsetLatLng(jmaPointsForCone[i].lat, jmaPointsForCone[i].lon, radius, (bearing - 90 + 360) % 360));
                    rightPts.push(getOffsetLatLng(jmaPointsForCone[i].lat, jmaPointsForCone[i].lon, radius, (bearing + 90) % 360));
                }
                let funnelPolygonCoords = [...leftPts, ...rightPts.reverse()];
                L.polygon(funnelPolygonCoords, { color: jmaColor, weight: 1.5, dashArray: '5, 5', fillColor: 'rgba(241, 196, 15, 0.15)', fillOpacity: 0.25 }).addTo(tcAgencyLayerGroup);
            }
        }

        if (!hasAgencyData || allAgencyLatLngs.length === 0) { 
            agencyAlert.style.display = 'flex'; 
            tcMapAgency.setView(hkoCenter, 4); 
        } else {
            agencyAlert.style.display = 'none'; 
            
            // 加入埋香港坐標入去一齊計 Bounds，等香港同颱風都完美顯示喺畫面入面
            allAgencyLatLngs.push(hkoCenter);
            let bounds = L.latLngBounds(allAgencyLatLngs);
            tcMapAgency.fitBounds(bounds, { padding: [40, 40] });
        }
    } catch (err) { 
        console.error("Agency Typhoon KML Error:", err);
        agencyAlert.style.display = 'flex'; 
        tcMapAgency.setView(hkoCenter, 4); 
    }

    if (typeof updateSmartThreatAlert === "function") updateSmartThreatAlert();
}
