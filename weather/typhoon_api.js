// typhoon_api.js - 香港天文台與各國氣象機構颱風路徑追蹤 (完美修復版)

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

// 畫出 HKO 左邊地圖的路徑與漏斗
function drawHKOTyphoonTrack(points, mapLayerGroup) {
    if (points.length === 0) return;
    let colorCode = themeColors.red;
    let currentPt = points[0]; 
    
    L.circle([currentPt.lat, currentPt.lon], { radius: 150000, color: colorCode, weight: 2, fillColor: colorCode, fillOpacity: 0.15 }).addTo(mapLayerGroup);
    
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

    // 1. 香港天文台 XML
    try {
        const resHko = await fetch(`${tcXmlSource}?_=${Date.now()}`);
        if (!resHko.ok) throw new Error("No XML response");
        let xmlText = await resHko.text();
        xmlText = xmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, '');
        const docHko = new DOMParser().parseFromString(xmlText, "text/xml");

        tcHkoLayerGroup.clearLayers();
        let hkoPoints = [];
        let elements = docHko.getElementsByTagName("*");
        
        for (let i = 0; i < elements.length; i++) {
            let el = elements[i];
            let latNode = el.getElementsByTagName('lat')[0] || el.getElementsByTagName('latitude')[0] || el.getElementsByTagName('cLat')[0];
            let lonNode = el.getElementsByTagName('lon')[0] || el.getElementsByTagName('longitude')[0] || el.getElementsByTagName('cLon')[0];
            
            if (latNode && lonNode && latNode.parentNode === el) {
                if (!el.getAttribute('data-parsed')) {
                    let lat = parseFloat(latNode.textContent.trim()); let lon = parseFloat(lonNode.textContent.trim());
                    let timeNode = el.getElementsByTagName('time')[0] || el.getElementsByTagName('date')[0];
                    let time = timeNode ? timeNode.textContent.trim().replace(/HKT|UTC/g, '').trim() : '';
                    if (!isNaN(lat) && !isNaN(lon)) { hkoPoints.push({ lat, lon, time }); el.setAttribute('data-parsed', 'true'); }
                }
            }
        }
        
        if (hkoPoints.length === 0) { 
            hkoAlert.style.display = 'flex'; 
        } else {
            hkoAlert.style.display = 'none';
            drawHKOTyphoonTrack(hkoPoints, tcHkoLayerGroup);
            globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], hkoPoints[0].lat, hkoPoints[0].lon);
        }
        tcMapHko.fitBounds(hkoBounds1200);
    } catch (err) { hkoAlert.style.display = 'flex'; tcMapHko.setView(hkoCenter, 4); }

    await new Promise(r => setTimeout(r, 10));

    // =========================================================
    // 2. 各國氣象機構 KML (完美套用 Folder 分類與 LineString)
    // =========================================================
    try {
        const resAgy = await fetch(`${tcKmlSource}?_=${Date.now()}`);
        if (!resAgy.ok) throw new Error("No KML response");
        let kmlText = await resAgy.text();
        kmlText = kmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, ''); // 清除命名空間
        const docAgy = new DOMParser().parseFromString(kmlText, "text/xml");
        
        tcAgencyLayerGroup.clearLayers();
        let hasAgencyData = false; 
        let allAgencyLatLngs = [];
        let jmaPointsForCone = []; // 專門儲存日本 JMA 的點用來畫漏斗

        // 【參考你的寫法】直接搵 Folder，解決全部變晒 JTWC 嘅 Bug！
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
            
            if (agency === 'OTHER' || agencyNameRaw.includes('HKO')) continue;

            hasAgencyData = true;
            let colorCode = agencyColorPalette[agency];
            let isJMA = (agency === 'JMA');
            
            let placemarks = folder.querySelectorAll("Placemark");
            let pointIndex = 0;

            for (let p = 0; p < placemarks.length; p++) {
                let pm = placemarks[p];
                
                // 1. 【解決亂線】直接抽 LineString 畫平滑路線！
                let lineString = pm.querySelector("LineString coordinates");
                if (lineString) {
                    let coords = lineString.textContent.trim().split(/\s+/);
                    let latlngs = [];
                    for (let c = 0; c < coords.length; c++) {
                        let parts = coords[c].split(',');
                        if (parts.length >= 2) {
                            let lon = parseFloat(parts[0]); let lat = parseFloat(parts[1]);
                            if (!isNaN(lat) && !isNaN(lon)) {
                                latlngs.push([lat, lon]);
                                allAgencyLatLngs.push([lat, lon]);
                            }
                        }
                    }
                    if (latlngs.length > 0) {
                        L.polyline(latlngs, { color: colorCode, weight: isJMA ? 3.5 : 2.5, dashArray: '5, 5', opacity: 0.9 }).addTo(tcAgencyLayerGroup);
                    }
                }

                // 2. 抽取 Point 加標籤
                let point = pm.querySelector("Point coordinates");
                if (point) {
                    let pts = point.textContent.trim().split(',');
                    if (pts.length >= 2) {
                        let lon = parseFloat(pts[0]); let lat = parseFloat(pts[1]);
                        if (!isNaN(lat) && !isNaN(lon)) {
                            let pmNameNode = pm.querySelector("name");
                            let timeStr = pmNameNode ? pmNameNode.textContent.trim().replace(/Forecast|預測|Center|Line|JMA|JTWC|CWA|NMC|PAGASA/gi, '').trim() : `Pt${pointIndex}`;
                            
                            // 實時機構名稱與時間標籤
                            let labelHtml = `<div style="position:absolute; left:14px; top:-10px; background:rgba(20,20,20,0.85); color:${colorCode}; font-size:0.75rem; padding:2px 6px; border-radius:4px; white-space:nowrap; border:1px solid ${colorCode}; font-weight:800; z-index:1000;">${agency} ${timeStr}</div>`;
                            
                            if (pointIndex === 0) {
                                if (isJMA) {
                                    // 日本氣象局專屬：逆時針旋轉 🌀
                                    let spinningPin = L.divIcon({ className: '', html: `<div class="spinning-typhoon-icon">🌀</div>${labelHtml}`, iconSize: [40, 40], iconAnchor: [20, 20] });
                                    L.marker([lat, lon], { icon: spinningPin, zIndexOffset: 1000 }).addTo(tcAgencyLayerGroup);
                                } else {
                                    // 其他局：實心大點
                                    let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:14px; height:14px; border-radius:50%; border:2px solid #fff; position:relative;">${labelHtml}</div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
                                    L.marker([lat, lon], { icon: dotPin, zIndexOffset: 900 }).addTo(tcAgencyLayerGroup);
                                }
                            } else {
                                // 預測點：空心小點
                                let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:8px; height:8px; border-radius:50%; border:1px solid rgba(255,255,255,0.9); position:relative;">${labelHtml}</div>`, iconSize: [8, 8], iconAnchor: [4, 4] });
                                L.marker([lat, lon], { icon: dotPin }).addTo(tcAgencyLayerGroup);
                            }
                            
                            // 將 JMA 的點儲存起來，用來畫漏斗
                            if (isJMA) jmaPointsForCone.push({lat: lat, lon: lon});
                            pointIndex++;
                        }
                    }
                }
            }
        }

        // 3. 【專為日本氣象局 JMA 畫淡黃色漏斗與颱風覆蓋圈】
        if (jmaPointsForCone.length > 0) {
            let jmaColor = agencyColorPalette['JMA']; // 淡黃色
            let currentPt = jmaPointsForCone[0];
            
            // 颱風當前覆蓋圓圈
            L.circle([currentPt.lat, currentPt.lon], { radius: 150000, color: jmaColor, weight: 2, fillColor: jmaColor, fillOpacity: 0.15 }).addTo(tcAgencyLayerGroup);
            
            // 預測漏斗
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

        // 4. 【修復假 Alert 遮擋】
        if (!hasAgencyData || allAgencyLatLngs.length === 0) { 
            agencyAlert.style.display = 'flex'; 
            tcMapAgency.setView(hkoCenter, 4); 
        } else {
            agencyAlert.style.display = 'none'; // 確定隱藏！
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
