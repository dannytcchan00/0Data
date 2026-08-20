// typhoon_api.js - 颱風預測路徑、淡黃色漏斗範圍與實時機構標籤模組

const agencyColorPalette = { 
    'JTWC': '#9b59b6', // 美軍 (紫)
    'JMA': '#3498db',  // 日本 (藍)
    'NMC': '#2ecc71',  // 中國 (綠)
    'CWA': '#f39c12',  // 台灣 (橙)
    'PAGASA': '#e84393', // 菲律賓 (粉紅)
    'OTHER': '#9e9e9e' // 其他 (灰)
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

// 繪製颱風路徑、淡黃色漏斗與實時標籤
function drawTyphoonTrack(points, mapLayerGroup, colorCode, agencyName, drawCone, isPrimary) {
    if (points.length === 0) return;
    
    // 淡黃色漏斗與覆蓋圈設定 (專為 JMA 基準而設)
    const coneColor = '#f1c40f'; // 淡黃色邊線
    const coneFill = 'rgba(241, 196, 15, 0.15)'; // 淡黃色半透明填充

    if (drawCone) {
        let currentPt = points[0]; 
        
        // 畫出當前颱風影響覆蓋範圍的圓圈
        L.circle([currentPt.lat, currentPt.lon], { 
            radius: 150000, // 150公里覆蓋
            color: coneColor, 
            weight: 2, 
            fillColor: coneColor, 
            fillOpacity: 0.15 
        }).addTo(mapLayerGroup);
        
        // 畫出淡黃色的漏斗預測影響範圍
        if (points.length > 1) {
            let leftPoints = [], rightPoints = [];
            points.forEach((pt, idx) => {
                let radius = 60000 + (idx * 50000); // 隨時間推移，誤差半徑逐漸擴大
                if (idx > 0) {
                    L.circle([pt.lat, pt.lon], { radius: radius, color: 'rgba(241, 196, 15, 0.3)', weight: 1, dashArray: '4, 4', fill: false }).addTo(mapLayerGroup);
                }
                let bearing = (idx < points.length - 1) ? calculateBearing(pt.lat, pt.lon, points[idx+1].lat, points[idx+1].lon) : calculateBearing(points[idx-1].lat, points[idx-1].lon, pt.lat, pt.lon);
                leftPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing - 90 + 360) % 360));
                rightPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing + 90) % 360));
            });
            let funnelPolygonCoords = [...leftPoints, ...rightPoints.reverse()];
            L.polygon(funnelPolygonCoords, { 
                color: coneColor, 
                weight: 1.5, 
                dashArray: '5, 5', 
                fillColor: coneFill, 
                fillOpacity: 0.25 
            }).addTo(mapLayerGroup);
        }
    }

    // 畫出路徑實線
    let latlngs = points.map(p => [p.lat, p.lon]);
    L.polyline(latlngs, { color: colorCode, weight: isPrimary ? 3.5 : 2.5, opacity: 0.9 }).addTo(mapLayerGroup);
    
    // 畫出每個點的「氣象局縮寫 + 時間」直觀標籤
    points.forEach((pt, idx) => {
        let timeStr = pt.time ? pt.time.replace('Forecast', '').replace('預測', '').trim() : '';
        
        // 實時標籤的 HTML 設計
        let labelHtml = `
            <div style="position:absolute; left:12px; top:-12px; background:rgba(20,20,20,0.85); color:${colorCode}; font-size:0.7rem; padding:2px 6px; border-radius:4px; white-space:nowrap; border:1px solid ${colorCode}; font-weight:800; z-index:1000; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">
                ${agencyName} ${timeStr}
            </div>
        `;
        
        if (idx === 0) {
            // 當前位置點
            if (isPrimary) {
                let spinningPin = L.divIcon({ className: '', html: `<div class="spinning-typhoon-icon">🌀</div>${labelHtml}`, iconSize: [40, 40], iconAnchor: [20, 20] });
                L.marker([pt.lat, pt.lon], { icon: spinningPin, zIndexOffset: 1000 }).addTo(mapLayerGroup);
            } else {
                let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:12px; height:12px; border-radius:50%; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.8); position:relative;">${labelHtml}</div>`, iconSize: [12, 12], iconAnchor: [6, 6] });
                L.marker([pt.lat, pt.lon], { icon: dotPin, zIndexOffset: 900 }).addTo(mapLayerGroup);
            }
        } else {
            // 預測位置點
            let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:8px; height:8px; border-radius:50%; border:1px solid rgba(255,255,255,0.9); box-shadow:0 1px 3px rgba(0,0,0,0.5); position:relative;">${labelHtml}</div>`, iconSize: [8, 8], iconAnchor: [4, 4] });
            L.marker([pt.lat, pt.lon], { icon: dotPin }).addTo(mapLayerGroup);
        }
    });
}

async function fetchAndRenderBothTyphoonMaps() {
    const hkoAlert = document.getElementById('no-tc-hko-alert');
    const agencyAlert = document.getElementById('no-tc-agency-alert');

    // ==========================================
    // 1. 香港天文台 XML 讀取
    // ==========================================
    try {
        const resHko = await fetch(`${tcXmlSource}?_=${Date.now()}`);
        if (!resHko.ok) throw new Error("No XML response");
        let xmlText = await resHko.text();
        xmlText = xmlText.replace(/xmlns(:\w+)?="[^"]*"/g, '');
        const docHko = new DOMParser().parseFromString(xmlText, "text/xml");

        tcHkoLayerGroup.clearLayers();
        let hkoPoints = [];
        let elements = docHko.getElementsByTagName("*");
        
        for (let i = 0; i < elements.length; i++) {
            let el = elements[i];
            let latEl = el.querySelector(':scope > lat') || el.querySelector(':scope > latitude') || el.querySelector(':scope > cLat') || el.getElementsByTagName('lat')[0];
            let lonEl = el.querySelector(':scope > lon') || el.querySelector(':scope > longitude') || el.querySelector(':scope > cLon') || el.getElementsByTagName('lon')[0];
            
            if (latEl && lonEl && !el.getAttribute('data-parsed')) {
                let lat = parseFloat(latEl.textContent); let lon = parseFloat(lonEl.textContent);
                let timeEl = el.querySelector(':scope > time') || el.querySelector(':scope > date') || el.getElementsByTagName('time')[0];
                let time = timeEl ? timeEl.textContent : '';
                if (!isNaN(lat) && !isNaN(lon)) { hkoPoints.push({ lat, lon, time }); el.setAttribute('data-parsed', 'true'); }
            }
        }
        
        if (hkoPoints.length === 0) { hkoAlert.style.display = 'flex'; } 
        else {
            hkoAlert.style.display = 'none';
            // 香港地圖獨立漏斗 (紅色)
            drawTyphoonTrack(hkoPoints, tcHkoLayerGroup, themeColors.red, 'HKO', true, true);
            globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], hkoPoints[0].lat, hkoPoints[0].lon);
        }
        tcMapHko.fitBounds(hkoBounds1200);
    } catch (err) { hkoAlert.style.display = 'flex'; tcMapHko.fitBounds(hkoBounds1200); }

    await new Promise(r => setTimeout(r, 10));

    // ==========================================
    // 2. 各國氣象機構 KML 讀取 (解決亂線問題)
    // ==========================================
    try {
        const resAgy = await fetch(`${tcKmlSource}?_=${Date.now()}`);
        if (!resAgy.ok) throw new Error("No KML response");
        let kmlText = await resAgy.text();
        
        kmlText = kmlText.replace(/xmlns(:\w+)?="[^"]*"/g, '');
        const docAgy = new DOMParser().parseFromString(kmlText, "text/xml");
        
        tcAgencyLayerGroup.clearLayers();
        let hasAgencyData = false; let foundAgencies = new Set(); let typhoonCenterCoords = null; 
        
        let placemarks = docAgy.getElementsByTagName("Placemark");
        let parsedAgencyTracks = {};

        for (let i = 0; i < placemarks.length; i++) {
            let pm = placemarks[i];
            let nameNode = pm.getElementsByTagName('name')[0];
            let pmName = nameNode ? nameNode.textContent.trim() : '';
            
            let folderNode = pm.parentNode;
            let folderName = '';
            while (folderNode && folderNode.nodeType === 1) { 
                let tag = folderNode.tagName.toLowerCase();
                if (tag === 'folder' || tag === 'document') {
                    let fNameNode = folderNode.getElementsByTagName('name')[0];
                    if (fNameNode) folderName = fNameNode.textContent.trim() + " " + folderName;
                }
                folderNode = folderNode.parentNode;
            }
            
            let combinedText = (pmName + " " + folderName).toUpperCase();
            
            let agency = 'OTHER';
            if (combinedText.includes('JTWC')) agency = 'JTWC';
            else if (combinedText.includes('JMA')) agency = 'JMA';
            else if (combinedText.includes('NMC') || combinedText.includes('CMA')) agency = 'NMC';
            else if (combinedText.includes('CWA') || combinedText.includes('CWB') || combinedText.includes('TAIWAN')) agency = 'CWA';
            else if (combinedText.includes('PAGASA')) agency = 'PAGASA';
            
            if (combinedText.includes('HKO')) continue; 

            if (!parsedAgencyTracks[agency]) parsedAgencyTracks[agency] = [];
            
            // 【防亂線修復】嚴格篩選只抽取 <Point> 的座標，避免混入 LineString 導致折線重疊！
            let hasPoint = false;
            let ptNodes = pm.getElementsByTagName('Point');
            
            for(let j = 0; j < ptNodes.length; j++) {
                let coordsNode = ptNodes[j].getElementsByTagName('coordinates')[0];
                if(coordsNode) {
                    let parts = coordsNode.textContent.trim().split(',');
                    if (parts.length >= 2) {
                        let lon = parseFloat(parts[0]), lat = parseFloat(parts[1]);
                        if (!isNaN(lat) && !isNaN(lon)) {
                            parsedAgencyTracks[agency].push({ lat, lon, time: pmName });
                            hasPoint = true;
                        }
                    }
                }
            }

            // 如果該機構只提供 LineString 沒有 Point (極少數情況)，才使用 LineString 解析
            if (!hasPoint) {
                let lsNodes = pm.getElementsByTagName('LineString');
                for(let j = 0; j < lsNodes.length; j++) {
                    let coordsNode = lsNodes[j].getElementsByTagName('coordinates')[0];
                    if(coordsNode) {
                        let pairs = coordsNode.textContent.trim().split(/\s+/);
                        pairs.forEach((pair, idx) => {
                            let parts = pair.split(',');
                            if (parts.length >= 2) {
                                let lon = parseFloat(parts[0]), lat = parseFloat(parts[1]);
                                if (!isNaN(lat) && !isNaN(lon)) {
                                    parsedAgencyTracks[agency].push({ lat, lon, time: `Pt ${idx+1}` });
                                }
                            }
                        });
                    }
                }
            }
        }

        // 開始將不同國家的路徑分別畫上地圖
        Object.keys(parsedAgencyTracks).forEach(agency => {
            let pts = parsedAgencyTracks[agency];
            if (pts.length > 0) {
                hasAgencyData = true; 
                foundAgencies.add(agency);
                let color = agencyColorPalette[agency] || agencyColorPalette['OTHER'];
                
                // 檢查是否為日本氣象局 (JMA)
                let isJMA = (agency === 'JMA');
                
                // 只有 JMA 會觸發淡黃色漏斗覆蓋範圍 (drawCone 為 isJMA)
                drawTyphoonTrack(pts, tcAgencyLayerGroup, color, agency, isJMA, isJMA);
                
                if (isJMA) {
                    typhoonCenterCoords = [pts[0].lat, pts[0].lon];
                }
                
                if (globalLatestTcDist === null) {
                    globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], pts[0].lat, pts[0].lon);
                }
            }
        });

        if (!hasAgencyData) { 
            agencyAlert.style.display = 'flex'; 
            tcMapAgency.fitBounds(hkoBounds1200); 
        } else {
            agencyAlert.style.display = 'none';
            if (foundAgencies.has('OTHER')) document.getElementById('legend-other').style.display = 'inline-block';
            
            // 視角置中於 JMA (或首個可用氣象局)
            if (!typhoonCenterCoords) {
                let firstAgency = Object.keys(parsedAgencyTracks)[0];
                if (firstAgency && parsedAgencyTracks[firstAgency].length > 0) typhoonCenterCoords = [parsedAgencyTracks[firstAgency][0].lat, parsedAgencyTracks[firstAgency][0].lon];
            }
            if (typhoonCenterCoords) tcMapAgency.fitBounds(L.latLng(typhoonCenterCoords).toBounds(4000000), { padding: [20, 20] });
            else tcMapAgency.fitBounds(hkoBounds1200);
        }
    } catch (err) { 
        console.error("Agency Typhoon KML Error:", err);
        agencyAlert.style.display = 'flex'; 
        tcMapAgency.fitBounds(hkoBounds1200); 
    }

    updateSmartThreatAlert();
}
