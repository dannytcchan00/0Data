// typhoon_api.js - 香港天文台與各國氣象機構颱風路徑追蹤與漏斗預測圈繪製

const agencyColorPalette = { 
    'JTWC': '#9b59b6', 
    'JMA': '#3498db', 
    'NMC': '#2ecc71', 
    'CWA': '#f39c12', 
    'PAGASA': '#e84393', 
    'OTHER': '#9e9e9e' 
};

// 計算經緯度偏移，用作繪製漏斗型預測圈
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

// 核心繪圖函數：畫出路徑、節點以及「漏斗型影響範圍」
function drawTyphoonTrack(points, mapLayerGroup, colorCode, agencyName, drawCone, isPrimary) {
    if (points.length === 0) return;
    
    // 繪製漏斗型預測影響範圍
    if (drawCone) {
        // 當前位置風暴覆蓋半徑
        let currentPt = points[0]; 
        L.circle([currentPt.lat, currentPt.lon], { radius: 150000, color: colorCode, weight: 1.5, fillColor: colorCode, fillOpacity: 0.15 }).addTo(mapLayerGroup);
        
        if (points.length > 1) {
            let leftPoints = [], rightPoints = [];
            points.forEach((pt, idx) => {
                // 模擬漏斗形狀：越後期，預測誤差半徑越大
                let radius = 60000 + (idx * 65000); 
                
                if (idx > 0) {
                    L.circle([pt.lat, pt.lon], { radius: radius, color: 'rgba(255,255,255,0.1)', weight: 1, dashArray: '4, 4', fill: false }).addTo(mapLayerGroup);
                }
                
                // 計算左右邊界點，用來畫漏斗外框
                let bearing = (idx < points.length - 1) ? calculateBearing(pt.lat, pt.lon, points[idx+1].lat, points[idx+1].lon) : calculateBearing(points[idx-1].lat, points[idx-1].lon, pt.lat, pt.lon);
                leftPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing - 90 + 360) % 360));
                rightPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing + 90) % 360));
            });
            
            // 合併左右邊界，形成一個完整嘅漏斗 Polygon
            let funnelPolygonCoords = [...leftPoints, ...rightPoints.reverse()];
            L.polygon(funnelPolygonCoords, { 
                color: hexToRgba(colorCode, 0.6), 
                weight: 1.5, 
                dashArray: '4, 4', 
                fillColor: hexToRgba(colorCode, 0.1), 
                fillOpacity: 0.2 
            }).addTo(mapLayerGroup);
        }
    }

    // 繪製中心連線 (路徑)
    let latlngs = points.map(p => [p.lat, p.lon]);
    L.polyline(latlngs, { color: colorCode, weight: isPrimary ? 3 : 2, dashArray: isPrimary ? '4, 6' : '3, 5', opacity: 0.9 }).addTo(mapLayerGroup);
    
    // 繪製每個節點 (標記點)
    points.forEach((pt, idx) => {
        if (idx === 0) {
            // 當前風暴中心
            if (isPrimary) {
                let spinningPin = L.divIcon({ className: '', html: `<div class="spinning-typhoon-icon">🌀</div>`, iconSize: [40, 40], iconAnchor: [20, 20] });
                let m = L.marker([pt.lat, pt.lon], { icon: spinningPin, zIndexOffset: 1000 }).addTo(mapLayerGroup);
                m.bindPopup(`<div class="popup-title">🌀 ${agencyName} 當前位置</div><div class="popup-value" style="font-size:1rem;">${pt.time || '最新'}</div>`, {className: 'brutal-popup'});
            } else {
                let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:12px; height:12px; border-radius:50%; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.8);"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] });
                let m = L.marker([pt.lat, pt.lon], { icon: dotPin, zIndexOffset: 900 }).addTo(mapLayerGroup);
                m.bindPopup(`<div class="popup-title">🏛️ ${agencyName} 當前位置</div><div style="font-size:0.9rem; color:#fff;">${pt.time || '最新'}</div>`, {className: 'brutal-popup'});
            }
        } else {
            // 預測位置
            let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:6px; height:6px; border-radius:50%; border:1px solid rgba(255,255,255,0.8); box-shadow:0 1px 3px rgba(0,0,0,0.5);"></div>`, iconSize: [6, 6], iconAnchor: [3, 3] });
            let m = L.marker([pt.lat, pt.lon], { icon: dotPin }).addTo(mapLayerGroup);
            m.bindPopup(`<div class="popup-title">🏛️ ${agencyName} 預測位置</div><div style="font-size:0.9rem; color:#fff;">${pt.name || pt.time}</div>`, {className: 'brutal-popup'});
        }
    });
}

// 獲取與解析 API 數據
async function fetchAndRenderBothTyphoonMaps() {
    const hkoAlert = document.getElementById('no-tc-hko-alert');
    const agencyAlert = document.getElementById('no-tc-agency-alert');

    // ==========================================
    // 1. 讀取香港天文台 XML (左邊地圖)
    // ==========================================
    try {
        const resHko = await fetch(`${tcXmlSource}?_=${Date.now()}`);
        if (!resHko.ok) throw new Error("No XML response");
        let xmlText = await resHko.text();
        
        // 【防彈機制】: 強制移除 XML 的 xmlns，避免 DOMParser 崩潰
        xmlText = xmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, '');
        const docHko = new DOMParser().parseFromString(xmlText, "text/xml");

        tcHkoLayerGroup.clearLayers();
        let hkoPoints = [];
        let elements = docHko.getElementsByTagName("*");
        
        for (let i = 0; i < elements.length; i++) {
            let el = elements[i];
            
            // 尋找經緯度標籤
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
        } else {
            hkoAlert.style.display = 'none';
            // 為香港天文台畫出完整漏斗範圍 (drawCone: true)
            drawTyphoonTrack(hkoPoints, tcHkoLayerGroup, themeColors.red, '香港天文台', true, true);
            globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], hkoPoints[0].lat, hkoPoints[0].lon);
        }
        tcMapHko.fitBounds(hkoBounds1200);
    } catch (err) { 
        console.error("HKO Typhoon parsing error:", err);
        hkoAlert.style.display = 'flex'; 
        tcMapHko.fitBounds(hkoBounds1200); 
    }

    await new Promise(r => setTimeout(r, 10));

    // ==========================================
    // 2. 讀取各國氣象機構 KML (右邊地圖)
    // ==========================================
    try {
        const resAgy = await fetch(`${tcKmlSource}?_=${Date.now()}`);
        if (!resAgy.ok) throw new Error("No KML response");
        let kmlText = await resAgy.text();
        
        // 【終極防彈機制】: 強制徹底清除 KML 的 xmlns 命名空間，解決全部白板問題
        kmlText = kmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, '');
        const docAgy = new DOMParser().parseFromString(kmlText, "text/xml");
        
        tcAgencyLayerGroup.clearLayers();
        let hasAgencyData = false; 
        let foundAgencies = new Set(); 
        let typhoonCenterCoords = null; 
        let parsedAgencyTracks = {};

        // 搜尋所有的 Placemark
        let placemarks = docAgy.getElementsByTagName("Placemark");

        for (let i = 0; i < placemarks.length; i++) {
            let pm = placemarks[i];
            
            // 抓取預測時間點的名字 (例如 24h, 48h 或具體時間)
            let nameNode = pm.getElementsByTagName('name')[0];
            let pmName = nameNode ? nameNode.textContent.trim() : '';
            
            // 往上尋找屬於哪個氣象機構的 Folder
            let folderNode = pm.parentNode;
            let folderName = '';
            while (folderNode && folderNode.nodeType === 1) { 
                let tag = folderNode.tagName.toLowerCase();
                if (tag === 'folder' || tag === 'document') {
                    let fNameNode = folderNode.getElementsByTagName('name')[0];
                    if (fNameNode) {
                        folderName = fNameNode.textContent.trim() + " " + folderName;
                    }
                }
                folderNode = folderNode.parentNode;
            }
            
            let combinedText = (pmName + " " + folderName).toUpperCase();
            
            // 判斷所屬氣象局
            let agency = 'OTHER';
            if (combinedText.includes('JTWC')) agency = 'JTWC';
            else if (combinedText.includes('JMA')) agency = 'JMA';
            else if (combinedText.includes('NMC') || combinedText.includes('CMA')) agency = 'NMC';
            else if (combinedText.includes('CWA') || combinedText.includes('CWB') || combinedText.includes('TAIWAN')) agency = 'CWA';
            else if (combinedText.includes('PAGASA')) agency = 'PAGASA';
            
            if (combinedText.includes('HKO')) continue; // 跳過香港天文台，因為已在左圖顯示

            if (!parsedAgencyTracks[agency]) parsedAgencyTracks[agency] = [];
            
            // 【關鍵】只抽取 <Point> 作為路徑節點，跳過造成混亂的 <Polygon> 誤差圈
            let pointsParsed = false;
            let ptNodes = pm.getElementsByTagName('Point');
            
            for(let j = 0; j < ptNodes.length; j++) {
                let coordsNode = ptNodes[j].getElementsByTagName('coordinates')[0];
                if(coordsNode) {
                    let parts = coordsNode.textContent.trim().split(',');
                    if (parts.length >= 2) {
                        let lon = parseFloat(parts[0]), lat = parseFloat(parts[1]);
                        if (!isNaN(lat) && !isNaN(lon)) {
                            parsedAgencyTracks[agency].push({ lat, lon, time: pmName, name: pmName });
                            pointsParsed = true;
                        }
                    }
                }
            }
            
            // 若該機構完全沒有 <Point>，後備使用 <LineString>
            if (!pointsParsed) {
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
                                    parsedAgencyTracks[agency].push({ lat, lon, time: pmName + " pt" + (idx+1), name: pmName });
                                }
                            }
                        });
                    }
                }
            }
        }

        // 開始將解析出來的路徑畫上地圖
        Object.keys(parsedAgencyTracks).forEach(agency => {
            let pts = parsedAgencyTracks[agency];
            if (pts.length > 0) {
                hasAgencyData = true; 
                foundAgencies.add(agency);
                let color = agencyColorPalette[agency] || agencyColorPalette['OTHER'];
                
                // 強制為每個氣象機構畫出專屬顏色的「漏斗型影響範圍」 (drawCone = true)
                drawTyphoonTrack(pts, tcAgencyLayerGroup, color, agency, true, false);
                
                if (agency === 'JMA') {
                    typhoonCenterCoords = [pts[0].lat, pts[0].lon];
                }
                
                if (globalLatestTcDist === null) {
                    globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], pts[0].lat, pts[0].lon);
                }
            }
        });

        // 處理視角對焦
        if (!hasAgencyData) { 
            agencyAlert.style.display = 'flex'; 
            tcMapAgency.fitBounds(hkoBounds1200); 
        } else {
            agencyAlert.style.display = 'none';
            if (foundAgencies.has('OTHER')) document.getElementById('legend-other').style.display = 'inline-block';
            
            if (!typhoonCenterCoords) {
                let firstAgency = Object.keys(parsedAgencyTracks)[0];
                if (firstAgency && parsedAgencyTracks[firstAgency].length > 0) {
                    typhoonCenterCoords = [parsedAgencyTracks[firstAgency][0].lat, parsedAgencyTracks[firstAgency][0].lon];
                }
            }
            if (typhoonCenterCoords) {
                tcMapAgency.fitBounds(L.latLng(typhoonCenterCoords).toBounds(4000000), { padding: [20, 20] });
            } else {
                tcMapAgency.fitBounds(hkoBounds1200);
            }
        }
    } catch (err) { 
        console.error("Agency Typhoon KML Error:", err);
        agencyAlert.style.display = 'flex'; 
        tcMapAgency.fitBounds(hkoBounds1200); 
    }

    // 更新左側的威脅警報數據
    updateSmartThreatAlert();
}
