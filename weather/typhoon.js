// typhoon.js

const agencyColorPalette = { 
    'JTWC': '#9b59b6',   // 美軍 (紫)
    'JMA': '#f1c40f',    // 日本 (淡黃)
    'NMC': '#2ecc71',    // 中國 (綠)
    'CWA': '#e67e22',    // 台灣 (橙)
    'PAGASA': '#e84393', // 菲律賓 (粉紅)
    'OTHER': '#9e9e9e'   // 其他 (灰)
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

function getDirectChildName(node) {
    for (let i = 0; i < node.children.length; i++) {
        if (node.children[i].tagName.toLowerCase() === 'name') { return node.children[i].textContent.trim(); }
    }
    return '';
}

function drawTyphoonTrack(points, mapLayerGroup, colorCode, agencyName, isPrimary, isHKO) {
    if (points.length === 0) return;
    
    // 漏斗與覆蓋圈設定 (HKO固定紅色，其他根據是否為基準使用該國顏色)
    const coneColor = isHKO ? themeColors.red : colorCode; 
    const coneFill = hexToRgba(coneColor, 0.15); 

    if (isPrimary || isHKO) {
        let currentPt = points[0]; 
        L.circle([currentPt.lat, currentPt.lon], { 
            radius: 150000, color: coneColor, weight: 2, fillColor: coneColor, fillOpacity: 0.15 
        }).addTo(mapLayerGroup);
        
        if (points.length > 1) {
            let leftPoints = [], rightPoints = [];
            points.forEach((pt, idx) => {
                let radius = 60000 + (idx * 50000); 
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

    let latlngs = points.map(p => [p.lat, p.lon]);
    L.polyline(latlngs, { color: colorCode, weight: (isPrimary || isHKO) ? 3.5 : 2.5, opacity: 0.9 }).addTo(mapLayerGroup);
    
    points.forEach((pt, idx) => {
        let timeStr = pt.time ? pt.time.replace(/Forecast|預測|Center|Line/gi, '').trim() : '';
        if (timeStr === '') timeStr = `Pt${idx}`;
        
        let labelHtml = `
            <div style="position:absolute; left:14px; top:-10px; background:rgba(20,20,20,0.85); color:${colorCode}; font-size:0.7rem; padding:2px 6px; border-radius:4px; white-space:nowrap; border:1px solid ${colorCode}; font-weight:800; z-index:1000; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">
                ${agencyName} ${timeStr}
            </div>
        `;
        
        if (idx === 0) {
            if (isPrimary || isHKO) {
                // 基準氣象局或香港天文台，顯示專屬顏色的逆時針 🌀
                let spinningPin = L.divIcon({ className: '', html: `<div class="spinning-typhoon-icon" style="color:${colorCode}; text-shadow: 0 0 5px ${colorCode};">🌀</div>${labelHtml}`, iconSize: [40, 40], iconAnchor: [20, 20] });
                L.marker([pt.lat, pt.lon], { icon: spinningPin, zIndexOffset: 1000 }).addTo(mapLayerGroup);
            } else {
                let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:12px; height:12px; border-radius:50%; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.8); position:relative;">${labelHtml}</div>`, iconSize: [12, 12], iconAnchor: [6, 6] });
                L.marker([pt.lat, pt.lon], { icon: dotPin, zIndexOffset: 900 }).addTo(mapLayerGroup);
            }
        } else {
            let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:6px; height:6px; border-radius:50%; border:1px solid rgba(255,255,255,0.9); box-shadow:0 1px 3px rgba(0,0,0,0.5); position:relative;">${labelHtml}</div>`, iconSize: [6, 6], iconAnchor: [3, 3] });
            L.marker([pt.lat, pt.lon], { icon: dotPin }).addTo(mapLayerGroup);
        }
    });
}

window.setAgencyView = function(agency) {
    currentSelectedAgency = agency;
    
    document.querySelectorAll('#agency-legend-bar .legend-btn').forEach(btn => {
        let btnAgency = btn.getAttribute('data-agency');
        let color = btnAgency === 'ALL' ? '#ffffff' : (agencyColorPalette[btnAgency] || '#9e9e9e');
        if (btnAgency === agency) {
            btn.style.background = hexToRgba(color, 0.25);
            btn.classList.add('active');
        } else {
            btn.style.background = 'transparent';
            btn.classList.remove('active');
        }
    });
    
    renderAgencyMap();
}

function renderAgencyMap() {
    tcAgencyLayerGroup.clearLayers();
    let hasData = false;
    let typhoonCenterCoords = null;
    let allAgencyLatLngs = [];
    const agencyAlert = document.getElementById('no-tc-agency-alert');

    if (currentSelectedAgency === 'ALL') {
        // 全部顯示，但只有 JMA 會有 🌀 同 漏斗
        let baselineAgency = 'JMA';
        if (!globalParsedAgencyTracks['JMA'] || globalParsedAgencyTracks['JMA'].length === 0) {
            baselineAgency = Object.keys(globalParsedAgencyTracks)[0]; 
        }

        Object.keys(globalParsedAgencyTracks).forEach(agency => {
            let pts = globalParsedAgencyTracks[agency];
            if (pts && pts.length > 0) {
                hasData = true;
                let color = agencyColorPalette[agency] || agencyColorPalette['OTHER'];
                let isBaseline = (agency === baselineAgency);
                drawTyphoonTrack(pts, tcAgencyLayerGroup, color, agency, isBaseline, false);
                
                pts.forEach(p => allAgencyLatLngs.push([p.lat, p.lon]));
                if (isBaseline) typhoonCenterCoords = [pts[0].lat, pts[0].lon];
            }
        });
    } else {
        // 單選模式
        let agency = currentSelectedAgency;
        let pts = globalParsedAgencyTracks[agency];
        if (pts && pts.length > 0) {
            hasData = true;
            let color = agencyColorPalette[agency] || agencyColorPalette['OTHER'];
            // 因為單選，所以它就是主角，畫出專屬顏色的 🌀 和 漏斗
            drawTyphoonTrack(pts, tcAgencyLayerGroup, color, agency, true, false);
            
            pts.forEach(p => allAgencyLatLngs.push([p.lat, p.lon]));
            typhoonCenterCoords = [pts[0].lat, pts[0].lon];
        }
    }

    if (!hasData) { 
        agencyAlert.style.display = 'flex'; 
        tcMapAgency.setView(hkoCenter, 4); 
    } else {
        agencyAlert.style.display = 'none';
        try {
            if (allAgencyLatLngs.length > 0) {
                let bounds = L.latLngBounds(allAgencyLatLngs);
                tcMapAgency.fitBounds(bounds, { padding: [40, 40] });
            } else if (typhoonCenterCoords) {
                tcMapAgency.setView(typhoonCenterCoords, 5);
            }
        } catch (e) { tcMapAgency.setView(hkoCenter, 4); }
    }
}

async function fetchAndRenderBothTyphoonMaps() {
    const hkoAlert = document.getElementById('no-tc-hko-alert');
    const agencyAlert = document.getElementById('no-tc-agency-alert');

    hkoAlert.style.display = 'none';
    agencyAlert.style.display = 'none';

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
                    let lat = parseFloat(latNode.textContent.trim()); 
                    let lon = parseFloat(lonNode.textContent.trim());
                    let timeNode = el.getElementsByTagName('time')[0] || el.getElementsByTagName('date')[0];
                    let time = timeNode ? timeNode.textContent.trim() : '';
                    if (!isNaN(lat) && !isNaN(lon)) { hkoPoints.push({ lat, lon, time }); el.setAttribute('data-parsed', 'true'); }
                }
            }
        }
        
        if (hkoPoints.length === 0) { 
            hkoAlert.style.display = 'flex'; 
            tcMapHko.setView(hkoCenter, 4);
        } else {
            // 香港地圖永遠顯示 HKO 漏斗與 🌀
            drawTyphoonTrack(hkoPoints, tcHkoLayerGroup, themeColors.red, 'HKO', true, true);
            globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], hkoPoints[0].lat, hkoPoints[0].lon);
            let bounds = L.latLngBounds(hkoPoints.map(p => [p.lat, p.lon]));
            tcMapHko.fitBounds(bounds, { padding: [30, 30] });
        }
    } catch (err) { 
        console.error("HKO Typhoon Error:", err);
        hkoAlert.style.display = 'flex'; tcMapHko.setView(hkoCenter, 4);
    }

    await new Promise(r => setTimeout(r, 10));

    // 2. 各國機構 KML
    try {
        const resAgy = await fetch(`${tcKmlSource}?_=${Date.now()}`);
        if (!resAgy.ok) throw new Error("No KML response");
        let kmlText = await resAgy.text();
        
        kmlText = kmlText.replace(/xmlns(:\w+)?="[^"]*"/gi, '');
        const docAgy = new DOMParser().parseFromString(kmlText, "text/xml");
        
        globalParsedAgencyTracks = {};
        let agencyPointSet = {}; 

        let placemarks = docAgy.getElementsByTagName("Placemark");

        for (let i = 0; i < placemarks.length; i++) {
            let pm = placemarks[i];
            let pmName = getDirectChildName(pm);
            
            let parentPath = '';
            let currNode = pm.parentNode;
            while (currNode && currNode.nodeType === 1) { 
                let pNameNode = Array.from(currNode.childNodes).find(n => n.nodeType === 1 && n.tagName.toLowerCase() === 'name');
                if (pNameNode) parentPath += ' ' + pNameNode.textContent.toUpperCase();
                currNode = currNode.parentNode;
            }
            
            let combinedText = parentPath + ' ' + pmName.toUpperCase();
            
            let agency = null;
            if (combinedText.includes('JTWC')) agency = 'JTWC';
            else if (combinedText.includes('JMA')) agency = 'JMA';
            else if (combinedText.includes('NMC') || combinedText.includes('CMA')) agency = 'NMC';
            else if (combinedText.includes('CWA') || combinedText.includes('CWB') || combinedText.includes('TAIWAN')) agency = 'CWA';
            else if (combinedText.includes('PAGASA')) agency = 'PAGASA';
            
            if (!agency || combinedText.includes('HKO')) continue;

            if (!globalParsedAgencyTracks[agency]) globalParsedAgencyTracks[agency] = [];
            if (!agencyPointSet[agency]) agencyPointSet[agency] = new Set();
            
            let ptNodes = pm.getElementsByTagName('Point');
            
            for(let j = 0; j < ptNodes.length; j++) {
                let coordsNode = ptNodes[j].getElementsByTagName('coordinates')[0];
                if(coordsNode) {
                    let parts = coordsNode.textContent.trim().split(',');
                    if (parts.length >= 2) {
                        let lon = parseFloat(parts[0]), lat = parseFloat(parts[1]);
                        if (!isNaN(lat) && !isNaN(lon)) {
                            let coordKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
                            if (!agencyPointSet[agency].has(coordKey)) {
                                agencyPointSet[agency].add(coordKey);
                                globalParsedAgencyTracks[agency].push({ lat, lon, time: pmName });
                            }
                        }
                    }
                }
            }
        }
        
        // 渲染地圖
        renderAgencyMap();
        
    } catch (err) { 
        console.error("Agency Typhoon Error:", err);
        if (Object.keys(globalParsedAgencyTracks).length === 0) {
            agencyAlert.style.display = 'flex'; 
        }
        tcMapAgency.setView(hkoCenter, 4); 
    }

    updateSmartThreatAlert();
}
