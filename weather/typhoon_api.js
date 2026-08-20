// typhoon_api.js - 香港天文台與各國氣象機構颱風路徑追蹤

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

// 核心繪圖函數：畫出路徑、節點、實時標籤以及「漏斗型影響範圍」
function drawTyphoonTrack(points, mapLayerGroup, colorCode, agencyName, isJMA, isHKO) {
    if (points.length === 0) return;
    
    // 淡黃色漏斗與覆蓋圈設定 (專為 JMA 基準而設)
    const coneColor = isHKO ? themeColors.red : '#f1c40f'; // HKO用紅色，JMA用淡黃色
    const coneFill = isHKO ? 'rgba(231, 76, 60, 0.12)' : 'rgba(241, 196, 15, 0.12)'; 

    // 只為香港天文台(左圖) 或 日本氣象局(右圖基準) 畫出漏斗與覆蓋圈
    if (isJMA || isHKO) {
        let currentPt = points[0]; 
        
        // 畫出當前颱風影響覆蓋範圍的圓圈 (半徑 150 公里)
        L.circle([currentPt.lat, currentPt.lon], { 
            radius: 150000, color: coneColor, weight: 2, fillColor: coneColor, fillOpacity: 0.15 
        }).addTo(mapLayerGroup);
        
        // 畫出漏斗預測影響範圍
        if (points.length > 1) {
            let leftPoints = [], rightPoints = [];
            points.forEach((pt, idx) => {
                let radius = 60000 + (idx * 50000); // 模擬誤差範圍逐漸擴大
                if (idx > 0) {
                    L.circle([pt.lat, pt.lon], { radius: radius, color: hexToRgba(coneColor, 0.4), weight: 1, dashArray: '4, 4', fill: false }).addTo(mapLayerGroup);
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
            <div style="position:absolute; left:14px; top:-10px; background:rgba(20,20,20,0.85); color:${colorCode}; font-size:0.7rem; padding:2px 6px; border-radius:4px; white-space:nowrap; border:1px solid ${colorCode}; font-weight:800; z-index:1000; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">
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
                let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:12px; height:12px; border-radius:50%; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.8); position:relative;">${labelHtml}</div>`, iconSize: [12, 12], iconAnchor: [6, 6] });
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

    // 初始隱藏警告字句
    hkoAlert.style.display = 'none';
    agencyAlert.style.display = 'none';

    // ==========================================
    // 1. 香港天文台 XML 讀取
    // ==========================================
    try {
        const resHko = await fetch(`${tcXmlSource}?_=${Date.now()}`);
        if (!resHko.ok) throw new Error("No XML response");
        let xmlText = await resHko.text();
        xmlText = xmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, ''); // 防彈清理
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
            drawTyphoonTrack(hkoPoints, tcHkoLayerGroup, themeColors.red, 'HKO', false, true);
            globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], hkoPoints[0].lat, hkoPoints[0].lon);
            let bounds = L.latLngBounds(hkoPoints.map(p => [p.lat, p.lon]));
            bounds.extend(hkoCenter); // 將香港納入視角
            tcMapHko.fitBounds(bounds, { padding: [30, 30] });
        }
    } catch (err) { 
        console.error("HKO Typhoon Error:", err);
        hkoAlert.style.display = 'flex'; 
    }

    await new Promise(r => setTimeout(r, 10));

    // ==========================================
    // 2. 各國氣象機構 KML 讀取 (解決亂線問題)
    // ==========================================
    try {
        const resAgy = await fetch(`${tcKmlSource}?_=${Date.now()}`);
        if (!resAgy.ok) throw new Error("No KML response");
        let kmlText = await resAgy.text();
        
        kmlText = kmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, ''); // 防彈清理
        const docAgy = new DOMParser().parseFromString(kmlText, "text/xml");
        
        tcAgencyLayerGroup.clearLayers();
        let hasAgencyData = false; 
        let foundAgencies = new Set(); 
        let typhoonCenterCoords = null; 
        let parsedAgencyTracks = {};

        // 【參考了你的寫法】先搵 Folder 來判斷氣象局，保證不會撈亂國家！
        let folders = docAgy.getElementsByTagName("Folder");

        for (let f = 0; f < folders.length; f++) {
            let folder = folders[f];
            
            // 獲取氣象局名稱
            let fNameNode = folder.getElementsByTagName("name")[0];
            let folderName = fNameNode ? fNameNode.textContent.trim().toUpperCase() : "";
            
            let agency = 'OTHER';
            if (folderName.includes('JTWC')) agency = 'JTWC';
            else if (folderName.includes('JMA')) agency = 'JMA';
            else if (folderName.includes('NMC') || folderName.includes('CMA')) agency = 'NMC';
            else if (folderName.includes('CWA') || folderName.includes('TAIWAN')) agency = 'CWA';
            else if (folderName.includes('PAGASA')) agency = 'PAGASA';
            
            if (folderName.includes('HKO') || agency === 'OTHER') continue; 

            if (!parsedAgencyTracks[agency]) parsedAgencyTracks[agency] = [];
            
            // 在該氣象局的 Folder 內尋找 Placemark
            let placemarks = folder.getElementsByTagName("Placemark");
            
            for (let p = 0; p < placemarks.length; p++) {
                let pm = placemarks[p];
                let pmNameNode = pm.getElementsByTagName('name')[0];
                let pmName = pmNameNode ? pmNameNode.textContent.trim() : '';

                // 嚴格只抽取 <Point> 的座標，絕對不碰 LineString
                let ptNodes = pm.getElementsByTagName('Point');
                let hasPoint = false;
                
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

                // 後備方案：如果某個氣象局真的沒有 <Point>，才去抽 <LineString>
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
                                        parsedAgencyTracks[agency].push({ lat, lon, time: pmName + " Pt" + (idx+1) });
                                    }
                                }
                            });
                        }
                    }
                }
            }
        }

        let allAgencyLatLngs = [];

        // 開始將不同國家的路徑分別畫上地圖
        Object.keys(parsedAgencyTracks).forEach(agency => {
            let pts = parsedAgencyTracks[agency];
            if (pts.length > 0) {
                hasAgencyData = true; 
                foundAgencies.add(agency);
                let color = agencyColorPalette[agency];
                
                // 檢查是否為日本氣象局 (JMA) 以觸發淡黃色漏斗與 🌀
                let isJMA = (agency === 'JMA');
                
                drawTyphoonTrack(pts, tcAgencyLayerGroup, color, agency, isJMA, false);
                
                if (isJMA) typhoonCenterCoords = [pts[0].lat, pts[0].lon];
                pts.forEach(p => allAgencyLatLngs.push([p.lat, p.lon]));
            }
        });

        // 處理地圖視角與警告字眼
        if (!hasAgencyData) { 
            agencyAlert.style.display = 'flex'; 
        } else {
            agencyAlert.style.display = 'none'; // 確保有數據時警告文字消失
            if (foundAgencies.has('OTHER')) document.getElementById('legend-other').style.display = 'inline-block';
            
            // 視角置中
            if (!typhoonCenterCoords) {
                let firstAgency = Object.keys(parsedAgencyTracks)[0];
                if (firstAgency && parsedAgencyTracks[firstAgency].length > 0) typhoonCenterCoords = [parsedAgencyTracks[firstAgency][0].lat, parsedAgencyTracks[firstAgency][0].lon];
            }
            
            try {
                let bounds = L.latLngBounds(allAgencyLatLngs);
                bounds.extend(hkoCenter); // 將香港納入視角
                tcMapAgency.fitBounds(bounds, { padding: [40, 40] });
            } catch (boundsErr) {
                if (typhoonCenterCoords) tcMapAgency.setView(typhoonCenterCoords, 5);
                else tcMapAgency.setView(hkoCenter, 4);
            }
        }
    } catch (err) { 
        console.error("Agency Typhoon KML Error:", err);
        agencyAlert.style.display = 'flex'; 
    }

    updateSmartThreatAlert();
}
