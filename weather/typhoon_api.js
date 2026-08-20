// typhoon_api.js - 颱風預測路徑、淡黃色漏斗範圍與實時機構標籤模組

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

// 繪製颱風路徑、淡黃色漏斗與實時標籤
function drawTyphoonTrack(points, mapLayerGroup, colorCode, agencyName, isJMA, isHKO) {
    if (points.length === 0) return;
    
    // 淡黃色漏斗與覆蓋圈設定 (專為 JMA 基準而設)
    const coneColor = isHKO ? '#e74c3c' : '#f1c40f'; // HKO用紅色，JMA用淡黃色
    const coneFill = isHKO ? 'rgba(231, 76, 60, 0.15)' : 'rgba(241, 196, 15, 0.15)'; 

    if (isJMA || isHKO) {
        let currentPt = points[0]; 
        
        // 畫出當前颱風影響覆蓋範圍的圓圈 (150公里)
        L.circle([currentPt.lat, currentPt.lon], { 
            radius: 150000, color: coneColor, weight: 2, fillColor: coneColor, fillOpacity: 0.15 
        }).addTo(mapLayerGroup);
        
        // 畫出漏斗預測影響範圍
        if (points.length > 1) {
            let leftPoints = [], rightPoints = [];
            points.forEach((pt, idx) => {
                let radius = 60000 + (idx * 50000); // 模擬誤差範圍逐漸擴大
                if (idx > 0) {
                    L.circle([pt.lat, pt.lon], { radius: radius, color: hexToRgba(coneColor, 0.3), weight: 1, dashArray: '4, 4', fill: false }).addTo(mapLayerGroup);
                }
                let bearing = (idx < points.length - 1) ? calculateBearing(pt.lat, pt.lon, points[idx+1].lat, points[idx+1].lon) : calculateBearing(points[idx-1].lat, points[idx-1].lon, pt.lat, pt.lon);
                leftPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing - 90 + 360) % 360));
                rightPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing + 90) % 360));
            });
            let funnelPolygonCoords = [...leftPoints, ...rightPoints.reverse()];
            L.polygon(funnelPolygonCoords, { 
                color: coneColor, weight: 1.5, dashArray: '5, 5', fillColor: coneFill, fillOpacity: 0.25 
            }).addTo(mapLayerGroup);
        }
    }

    // 畫出各國預測路徑實線
    let latlngs = points.map(p => [p.lat, p.lon]);
    L.polyline(latlngs, { color: colorCode, weight: (isJMA || isHKO) ? 3.5 : 2.5, opacity: 0.9 }).addTo(mapLayerGroup);
    
    // 畫出每個點的「氣象局縮寫 + 時間」直觀標籤與圖示
    points.forEach((pt, idx) => {
        let timeStr = pt.time ? pt.time.replace(/Forecast|預測|Center|Line|JMA|JTWC|CWA|NMC|PAGASA/gi, '').trim() : '';
        if (timeStr === '') timeStr = `Pt${idx}`;
        
        // 實時標籤 HTML 設計
        let labelHtml = `
            <div style="position:absolute; left:16px; top:-10px; background:rgba(20,20,20,0.85); color:${colorCode}; font-size:0.75rem; padding:2px 6px; border-radius:4px; white-space:nowrap; border:1px solid ${colorCode}; font-weight:800; z-index:1000; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">
                ${agencyName} ${timeStr}
            </div>
        `;
        
        if (idx === 0) {
            // 當前位置點
            if (isJMA || isHKO) {
                // JMA & HKO 專屬：逆時針旋轉的 🌀
                let spinningPin = L.divIcon({ className: '', html: `<div class="spinning-typhoon-icon">🌀</div>${labelHtml}`, iconSize: [40, 40], iconAnchor: [20, 20] });
                L.marker([pt.lat, pt.lon], { icon: spinningPin, zIndexOffset: 1000 }).addTo(mapLayerGroup);
            } else {
                // 其他國家：實心大圓點
                let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:14px; height:14px; border-radius:50%; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.8); position:relative;">${labelHtml}</div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
                L.marker([pt.lat, pt.lon], { icon: dotPin, zIndexOffset: 900 }).addTo(mapLayerGroup);
            }
        } else {
            // 預測位置點 (所有國家通用小圓點)
            let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:8px; height:8px; border-radius:50%; border:1px solid rgba(255,255,255,0.9); box-shadow:0 1px 3px rgba(0,0,0,0.5); position:relative;">${labelHtml}</div>`, iconSize: [8, 8], iconAnchor: [4, 4] });
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
        const docHko = new DOMParser().parseFromString(xmlText, "text/xml");

        tcHkoLayerGroup.clearLayers();
        let hkoPoints = [];
        
        // 使用防彈搜尋器尋找 lat
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
            drawTyphoonTrack(hkoPoints, tcHkoLayerGroup, themeColors.red, 'HKO', false, true);
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
    // 2. 各國氣象機構 KML (右邊地圖) - 完美解決亂線與名稱混亂
    // ==========================================
    try {
        const resAgy = await fetch(`${tcKmlSource}?_=${Date.now()}`);
        if (!resAgy.ok) throw new Error("No KML response");
        const kmlText = await resAgy.text();
        const docAgy = new DOMParser().parseFromString(kmlText, "text/xml");
        
        tcAgencyLayerGroup.clearLayers();
        let hasAgencyData = false; 
        let foundAgencies = new Set(); 
        let typhoonCenterCoords = null; 
        let parsedAgencyTracks = {};

        // 搜尋所有的 Placemark
        let placemarks = findNodes(docAgy, 'Placemark');

        placemarks.forEach(pm => {
            let nameNode = findNodes(pm, 'name')[0];
            let pmName = nameNode ? nameNode.textContent.trim() : '';
            
            // 往上尋找屬於哪個氣象機構的 Folder
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
            
            // 準確判斷所屬氣象局
            if (combinedText.includes('JTWC')) agency = 'JTWC';
            else if (combinedText.includes('JMA')) agency = 'JMA';
            else if (combinedText.includes('NMC') || combinedText.includes('CMA')) agency = 'NMC';
            else if (combinedText.includes('CWA') || combinedText.includes('CWB') || combinedText.includes('TAIWAN')) agency = 'CWA';
            else if (combinedText.includes('PAGASA')) agency = 'PAGASA';
            
            // 排除 HKO 或未能辨識的機構
            if (!agency || combinedText.includes('HKO')) return; 

            if (!parsedAgencyTracks[agency]) parsedAgencyTracks[agency] = [];
            
            // 【解決亂線】嚴格只抽取 <Point> 的座標，絕對不碰 LineString
            let points = findNodes(pm, 'Point');
            points.forEach(pt => {
                let coordsNode = findNodes(pt, 'coordinates')[0];
                if (coordsNode) {
                    let parts = coordsNode.textContent.trim().split(',');
                    if (parts.length >= 2) {
                        let lon = parseFloat(parts[0]), lat = parseFloat(parts[1]);
                        if (!isNaN(lat) && !isNaN(lon)) {
                            // 防重複過濾器
                            let isDuplicate = parsedAgencyTracks[agency].some(p => Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lon - lon) < 0.001);
                            if (!isDuplicate) {
                                parsedAgencyTracks[agency].push({ lat, lon, time: pmName });
                            }
                        }
                    }
                }
            });
        });

        let allAgencyLatLngs = [];

        // 開始將不同國家的路徑分別畫上地圖
        Object.keys(parsedAgencyTracks).forEach(agency => {
            let pts = parsedAgencyTracks[agency];
            if (pts.length > 0) {
                hasAgencyData = true; 
                foundAgencies.add(agency);
                let color = agencyColorPalette[agency] || agencyColorPalette['OTHER'];
                
                // 檢查是否為日本氣象局 (JMA) 以觸發淡黃色漏斗
                let isJMA = (agency === 'JMA');
                
                drawTyphoonTrack(pts, tcAgencyLayerGroup, color, agency, isJMA, false);
                
                if (isJMA) typhoonCenterCoords = [pts[0].lat, pts[0].lon];
                pts.forEach(p => allAgencyLatLngs.push([p.lat, p.lon]));
            }
        });

        // 完美解決圖表縮放與假 Error 警告
        if (!hasAgencyData) { 
            agencyAlert.style.display = 'flex'; 
            tcMapAgency.setView(hkoCenter, 4); 
        } else {
            agencyAlert.style.display = 'none';
            
            if (!typhoonCenterCoords) {
                let firstAgency = Object.keys(parsedAgencyTracks)[0];
                if (firstAgency && parsedAgencyTracks[firstAgency].length > 0) {
                    typhoonCenterCoords = [parsedAgencyTracks[firstAgency][0].lat, parsedAgencyTracks[firstAgency][0].lon];
                }
            }

            try {
                let bounds = L.latLngBounds(allAgencyLatLngs);
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

    // 觸發左側面板評估
    if (typeof updateSmartThreatAlert === "function") {
        updateSmartThreatAlert();
    }
}
