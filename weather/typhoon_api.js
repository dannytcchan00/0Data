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
    
    // 淡黃色漏斗與覆蓋圈設定
    const coneColor = isHKO ? '#e74c3c' : '#f1c40f'; 
    const coneFill = isHKO ? 'rgba(231, 76, 60, 0.15)' : 'rgba(241, 196, 15, 0.15)'; 

    if (isJMA || isHKO) {
        let currentPt = points[0]; 
        
        L.circle([currentPt.lat, currentPt.lon], { 
            radius: 150000, color: coneColor, weight: 2, fillColor: coneColor, fillOpacity: 0.2, dashArray: '6, 6'
        }).addTo(mapLayerGroup);
        
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

    let latlngs = points.map(p => [p.lat, p.lon]);
    L.polyline(latlngs, { 
        color: colorCode, 
        weight: (isJMA || isHKO) ? 3.5 : 2.5, 
        opacity: 1, 
        dashArray: (isJMA || isHKO) ? '' : '6, 6' 
    }).addTo(mapLayerGroup);
    
    points.forEach((pt, idx) => {
        // 如果沒有時間，就隱藏標籤文字，避免 120 個點嘅標籤重疊塞爆畫面
        if (!pt.time) return; 

        let timeStr = pt.time.replace(/Forecast|預測|Center|Line|JMA|JTWC|CWA|NMC|PAGASA/gi, '').trim();
        
        let labelHtml = `
            <div style="position:absolute; left:14px; top:-10px; background:rgba(18,18,18,0.9); color:${colorCode}; font-size:0.7rem; padding:2px 6px; border-radius:4px; white-space:nowrap; border:1px solid ${colorCode}; font-weight:900; z-index:1000; box-shadow: 2px 2px 0px rgba(0,0,0,0.8);">
                ${agencyName} ${timeStr}
            </div>
        `;
        
        if (idx === 0) {
            if (isJMA || isHKO) {
                let spinningPin = L.divIcon({ className: '', html: `<div class="spin-ccw-icon" style="font-size:45px; filter:drop-shadow(3px 3px 0px #121212);">🌀</div>${labelHtml}`, iconSize: [45, 45], iconAnchor: [22, 22] });
                L.marker([pt.lat, pt.lon], { icon: spinningPin, zIndexOffset: 1000 }).addTo(mapLayerGroup);
            } else {
                let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:14px; height:14px; border-radius:50%; border:2px solid #121212; box-shadow:2px 2px 0px #121212; position:relative;">${labelHtml}</div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
                L.marker([pt.lat, pt.lon], { icon: dotPin, zIndexOffset: 900 }).addTo(mapLayerGroup);
            }
        } else {
            let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:8px; height:8px; border-radius:50%; border:2px solid #121212; box-shadow:1px 1px 0px #121212; position:relative;">${labelHtml}</div>`, iconSize: [8, 8], iconAnchor: [4, 4] });
            L.marker([pt.lat, pt.lon], { icon: dotPin }).addTo(mapLayerGroup);
        }
    });
}

function clearOldHKOMarkers(mapObj) {
    mapObj.eachLayer(layer => {
        if (layer.options && layer.options.icon && layer.options.icon.options.html) {
            if (layer.options.icon.options.html.includes('香港天文台')) mapObj.removeLayer(layer);
        }
    });
}

function drawHongKongRings(layerGroup) {
    L.circle(hkoCenter, { radius: 1200000, color: '#38b6ff', weight: 2, fillColor: '#38b6ff', fillOpacity: 0.05, dashArray: '8, 8' }).addTo(layerGroup);
    L.circle(hkoCenter, { radius: 800000, color: '#ffde59', weight: 2, fillColor: '#ffde59', fillOpacity: 0.08, dashArray: '8, 8' }).addTo(layerGroup);
    L.circle(hkoCenter, { radius: 400000, color: '#ff914d', weight: 3, fillColor: '#ff914d', fillOpacity: 0.08, dashArray: '6, 6' }).addTo(layerGroup);
    let hkIcon = L.divIcon({ html: '<div class="hk-marker-label">HONG KONG</div>', className: '', iconSize: null, iconAnchor: [30, 10] });
    L.marker(hkoCenter, { icon: hkIcon, zIndexOffset: 2000 }).addTo(layerGroup);
}

// 幫助函數：無視大細楷獲取特定子標籤內容
function getChildNodeText(parentEl, possibleTags) {
    for (let i = 0; i < parentEl.childNodes.length; i++) {
        let child = parentEl.childNodes[i];
        if (child.nodeType === 1 && possibleTags.includes(child.tagName.toLowerCase())) {
            return child.textContent.trim();
        }
    }
    return null;
}

// 幫助函數：向上尋找標題或時間
function findParentName(node) {
    let parent = node.parentNode;
    while(parent && parent.nodeType === 1) {
        let nameStr = getChildNodeText(parent, ['name', 'title', 'time', 'pubdate', 'date']);
        if (nameStr) return nameStr;
        parent = parent.parentNode;
    }
    return null;
}

async function fetchAndRenderBothTyphoonMaps() {
    const hkoAlert = document.getElementById('no-tc-hko-alert');
    const agencyAlert = document.getElementById('no-tc-agency-alert');

    clearOldHKOMarkers(tcMapHko);
    clearOldHKOMarkers(tcMapAgency);

    // ==========================================
    // 1. 香港天文台 XML (專屬結構解析法)
    // ==========================================
    try {
        const hkoDirectUrl = "https://dannytcchan00.github.io/0Data/data/current_typhoon.xml";
        const resHko = await fetch(`${hkoDirectUrl}?_=${Date.now()}`);
        if (!resHko.ok) throw new Error("無法讀取 current_typhoon.xml");
        
        let xmlText = await resHko.text();
        
        // 確保移除 XML 命名空間，避免解析障礙
        xmlText = xmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, '');
        xmlText = xmlText.replace(/(<\/?)[a-zA-Z0-9_-]+:/g, '$1');
        
        const docHko = new DOMParser().parseFromString(xmlText, "text/xml");

        tcHkoLayerGroup.clearLayers();
        drawHongKongRings(tcHkoLayerGroup); 

        let hkoPoints = [];

        // 針對你提供嘅專屬結構：抽出 AnalysisInformation 同 ForecastInformation
        let analysisNodes = Array.from(docHko.getElementsByTagName("AnalysisInformation"));
        let forecastNodes = Array.from(docHko.getElementsByTagName("ForecastInformation"));
        let targetNodes = [...analysisNodes, ...forecastNodes];

        if (targetNodes.length > 0) {
            targetNodes.forEach(node => {
                let latNode = node.getElementsByTagName("Latitude")[0];
                let lonNode = node.getElementsByTagName("Longitude")[0];
                
                if (latNode && lonNode) {
                    let latStr = latNode.textContent.trim(); // 例如 "19.70N"
                    let lonStr = lonNode.textContent.trim(); // 例如 "109.00E"
                    
                    let lat = parseFloat(latStr);
                    let lon = parseFloat(lonStr);
                    
                    // 檢查有無 S (南半球) 或 W (西半球)，有的話轉為負數
                    if (latStr.toUpperCase().includes('S')) lat = -lat;
                    if (lonStr.toUpperCase().includes('W')) lon = -lon;

                    let timeNode = node.getElementsByTagName("Time")[0];
                    let time = timeNode ? timeNode.textContent.trim() : '';

                    if (!isNaN(lat) && !isNaN(lon)) {
                        hkoPoints.push({ lat, lon, time });
                        node.setAttribute('data-parsed', 'true');
                    }
                }
            });
        }

        // 備用方案：如果上面搵唔到，再用通用掃描法 (確保萬無一失)
        if (hkoPoints.length === 0) {
            let elements = docHko.getElementsByTagName("*");
            for (let i = 0; i < elements.length; i++) {
                let el = elements[i];
                if (el.getAttribute('data-parsed')) continue;
                
                let tagName = el.tagName.toLowerCase();

                let latStr = getChildNodeText(el, ['lat', 'latitude', 'clat']);
                let lonStr = getChildNodeText(el, ['lon', 'longitude', 'clon']);
                if (latStr && lonStr) {
                    let lat = parseFloat(latStr), lon = parseFloat(lonStr);
                    if (!isNaN(lat) && !isNaN(lon)) { 
                        let time = getChildNodeText(el, ['time', 'date', 'pubdate', 'name', 'title']) || '';
                        hkoPoints.push({ lat, lon, time }); 
                        el.setAttribute('data-parsed', 'true'); 
                        continue; 
                    }
                }
            }
        }
        
        if (hkoPoints.length === 0) { 
            hkoAlert.style.display = 'flex'; 
        } else {
            hkoAlert.style.display = 'none';
            drawTyphoonTrack(hkoPoints, tcHkoLayerGroup, '#ff3b30', 'HKO', false, true);
            if (typeof hkoCenter !== 'undefined' && typeof calculateDistance === 'function') {
                globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], hkoPoints[0].lat, hkoPoints[0].lon);
            }
        }
        
        if (typeof tcMapHko !== 'undefined' && typeof hkoCenter !== 'undefined') tcMapHko.setView(hkoCenter, 4);
        
    } catch (err) { 
        console.error("HKO Typhoon Error:", err);
        hkoAlert.style.display = 'flex'; 
        if (typeof tcMapHko !== 'undefined' && typeof hkoCenter !== 'undefined') tcMapHko.setView(hkoCenter, 4); 
    }

    await new Promise(r => setTimeout(r, 10));

    // ==========================================
    // 2. 各國氣象機構 KML - 完美 Folder 解析法
    // ==========================================
    try {
        const resAgy = await fetch(`${tcKmlSource}?_=${Date.now()}`);
        if (!resAgy.ok) throw new Error("No KML response");
        let kmlText = await resAgy.text();
        
        kmlText = kmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, '');
        const docAgy = new DOMParser().parseFromString(kmlText, "text/xml");
        
        tcAgencyLayerGroup.clearLayers();
        drawHongKongRings(tcAgencyLayerGroup);
        
        let hasAgencyData = false; 
        let parsedAgencyTracks = {};
        let agencyPointSet = {}; 

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

            let placemarks = folder.getElementsByTagName("Placemark");
            for (let p = 0; p < placemarks.length; p++) {
                let pm = placemarks[p];
                let pmNameNode = pm.getElementsByTagName("name")[0];
                let pmName = pmNameNode ? pmNameNode.textContent.trim() : "";
                
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

        Object.keys(parsedAgencyTracks).forEach(agency => {
            let pts = parsedAgencyTracks[agency];
            if (pts.length > 0) {
                hasAgencyData = true; 
                let color = agencyColorPalette[agency] || agencyColorPalette['OTHER'];
                let isJMA = (agency === 'JMA');
                drawTyphoonTrack(pts, tcAgencyLayerGroup, color, agency, isJMA, false);
            }
        });

        if (!hasAgencyData) { 
            agencyAlert.style.display = 'flex'; 
        } else {
            agencyAlert.style.display = 'none';
        }
        
        if (typeof tcMapAgency !== 'undefined' && typeof hkoCenter !== 'undefined') tcMapAgency.setView(hkoCenter, 4); 

    } catch (err) { 
        console.error("Agency Typhoon KML Error:", err);
        agencyAlert.style.display = 'flex'; 
        if (typeof tcMapAgency !== 'undefined' && typeof hkoCenter !== 'undefined') tcMapAgency.setView(hkoCenter, 4); 
    }

    if (typeof updateSmartThreatAlert === "function") {
        updateSmartThreatAlert();
    }
}
