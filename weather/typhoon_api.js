// typhoon_api.js - 香港天文台與各國氣象機構颱風路徑追蹤

const agencyColorPalette = { 'JTWC': '#9b59b6', 'JMA': '#3498db', 'NMC': '#2ecc71', 'CWA': '#f39c12', 'PAGASA': '#e84393', 'OTHER': '#9e9e9e' };

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

function drawTyphoonTrack(points, mapLayerGroup, colorCode, agencyName, drawCone, isPrimary) {
    if (points.length === 0) return;
    let currentPt = points[0]; 
    if (drawCone) {
        L.circle([currentPt.lat, currentPt.lon], { radius: 180000, color: colorCode, weight: 1.5, fillColor: colorCode, fillOpacity: 0.1 }).addTo(mapLayerGroup);
        if (points.length > 1) {
            let leftPoints = [], rightPoints = [];
            points.forEach((pt, idx) => {
                let radius = 60000 + (idx * 65000); 
                if (idx > 0) L.circle([pt.lat, pt.lon], { radius: radius, color: 'rgba(255,255,255,0.1)', weight: 1, dashArray: '4, 4', fill: false }).addTo(mapLayerGroup);
                let bearing = (idx < points.length - 1) ? calculateBearing(pt.lat, pt.lon, points[idx+1].lat, points[idx+1].lon) : calculateBearing(points[idx-1].lat, points[idx-1].lon, pt.lat, pt.lon);
                leftPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing - 90 + 360) % 360));
                rightPoints.push(getOffsetLatLng(pt.lat, pt.lon, radius, (bearing + 90) % 360));
            });
            let funnelPolygonCoords = [...leftPoints, ...rightPoints.reverse()];
            L.polygon(funnelPolygonCoords, { color: hexToRgba(colorCode, 0.5), weight: 1, dashArray: '4, 4', fillColor: hexToRgba(colorCode, 0.1), fillOpacity: 0.2 }).addTo(mapLayerGroup);
        }
    }
    let latlngs = points.map(p => [p.lat, p.lon]);
    L.polyline(latlngs, { color: colorCode, weight: isPrimary ? 3 : 2, dashArray: isPrimary ? '4, 6' : '3, 5', opacity: 0.8 }).addTo(mapLayerGroup);
    points.forEach((pt, idx) => {
        if (idx === 0) {
            if (isPrimary) {
                let spinningPin = L.divIcon({ className: '', html: `<div class="spinning-typhoon-icon">🌀</div>`, iconSize: [40, 40], iconAnchor: [20, 20] });
                let m = L.marker([pt.lat, pt.lon], { icon: spinningPin, zIndexOffset: 1000 }).addTo(mapLayerGroup);
                m.bindPopup(`<div class="popup-title">🌀 ${agencyName} 當前位置</div><div class="popup-value" style="font-size:1rem;">${pt.time || '最新'}</div>`, {className: 'brutal-popup'});
            } else {
                let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:10px; height:10px; border-radius:50%; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>`, iconSize: [10, 10], iconAnchor: [5, 5] });
                let m = L.marker([pt.lat, pt.lon], { icon: dotPin, zIndexOffset: 900 }).addTo(mapLayerGroup);
                m.bindPopup(`<div class="popup-title">🏛️ ${agencyName} 當前位置</div><div style="font-size:0.9rem; color:#fff;">${pt.time || '最新'}</div>`, {className: 'brutal-popup'});
            }
        } else {
            let dotPin = L.divIcon({ className: '', html: `<div style="background:${colorCode}; width:6px; height:6px; border-radius:50%; border:1px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>`, iconSize: [6, 6], iconAnchor: [3, 3] });
            let m = L.marker([pt.lat, pt.lon], { icon: dotPin }).addTo(mapLayerGroup);
            m.bindPopup(`<div class="popup-title">🏛️ ${agencyName} 預測位置</div><div style="font-size:0.9rem; color:#fff;">${pt.name || pt.time}</div>`, {className: 'brutal-popup'});
        }
    });
}

async function fetchAndRenderBothTyphoonMaps() {
    const hkoAlert = document.getElementById('no-tc-hko-alert');
    const agencyAlert = document.getElementById('no-tc-agency-alert');

    // 1. 香港天文台 XML (完全清除命名空間)
    try {
        const resHko = await fetch(`${tcXmlSource}?_=${Date.now()}`);
        if (!resHko.ok) throw new Error("No XML response");
        let xmlText = await resHko.text();
        
        // 防彈處理：強制移除 XML 的命名空間
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
                let lat = parseFloat(latEl.textContent); 
                let lon = parseFloat(lonEl.textContent);
                let timeEl = el.querySelector(':scope > time') || el.querySelector(':scope > date') || el.getElementsByTagName('time')[0];
                let time = timeEl ? timeEl.textContent : '';
                
                if (!isNaN(lat) && !isNaN(lon)) { 
                    hkoPoints.push({ lat, lon, time }); 
                    el.setAttribute('data-parsed', 'true'); 
                }
            }
        }
        
        if (hkoPoints.length === 0) { hkoAlert.style.display = 'flex'; } 
        else {
            hkoAlert.style.display = 'none';
            drawTyphoonTrack(hkoPoints, tcHkoLayerGroup, themeColors.red, '香港天文台', true, true);
            globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], hkoPoints[0].lat, hkoPoints[0].lon);
        }
        tcMapHko.fitBounds(hkoBounds1200);
    } catch (err) { hkoAlert.style.display = 'flex'; tcMapHko.fitBounds(hkoBounds1200); }

    await new Promise(r => setTimeout(r, 10));

    // 2. 各國氣象機構 KML (完全清除命名空間)
    try {
        const resAgy = await fetch(`${tcKmlSource}?_=${Date.now()}`);
        if (!resAgy.ok) throw new Error("No KML response");
        let kmlText = await resAgy.text();
        
        // 🚨 防彈處理：強制移除 KML 嘅所有命名空間
        kmlText = kmlText.replace(/xmlns(:\w+)?="[^"]*"/g, '');
        const docAgy = new DOMParser().parseFromString(kmlText, "text/xml");
        
        tcAgencyLayerGroup.clearLayers();
        let hasAgencyData = false; 
        let foundAgencies = new Set(); 
        let typhoonCenterCoords = null; 
        
        let placemarks = docAgy.getElementsByTagName("Placemark");
        let parsedAgencyTracks = {};

        for (let i = 0; i < placemarks.length; i++) {
            let pm = placemarks[i];
            let nameNode = pm.getElementsByTagName('name')[0];
            let pmName = nameNode ? nameNode.textContent : '';
            
            let folderNode = pm.parentNode;
            while (folderNode && folderNode.nodeName !== 'Folder' && folderNode.nodeName !== 'Document') {
                folderNode = folderNode.parentNode;
            }
            let fNameNode = folderNode ? folderNode.getElementsByTagName('name')[0] : null;
            let folderName = fNameNode ? fNameNode.textContent : '';
            
            let combinedText = (pmName + " " + folderName).toUpperCase();
            
            let agency = 'OTHER';
            if (combinedText.includes('JTWC')) agency = 'JTWC';
            else if (combinedText.includes('JMA')) agency = 'JMA';
            else if (combinedText.includes('NMC') || combinedText.includes('CMA')) agency = 'NMC';
            else if (combinedText.includes('CWA') || combinedText.includes('CWB')) agency = 'CWA';
            else if (combinedText.includes('PAGASA')) agency = 'PAGASA';
            
            if (combinedText.includes('HKO')) continue; 

            if (!parsedAgencyTracks[agency]) parsedAgencyTracks[agency] = [];
            
            let lineStrs = pm.getElementsByTagName('LineString');
            for(let j = 0; j < lineStrs.length; j++) {
                let ls = lineStrs[j];
                let coordsNode = ls.getElementsByTagName('coordinates')[0];
                if (coordsNode) {
                    let coordsText = coordsNode.textContent.trim().split(/\s+/);
                    coordsText.forEach((c, index) => {
                        let parts = c.split(','); 
                        if (parts.length >= 2) {
                            let lon = parseFloat(parts[0]); 
                            let lat = parseFloat(parts[1]);
                            if (!isNaN(lat) && !isNaN(lon)) { 
                                parsedAgencyTracks[agency].push({ lat, lon, name: `${agency} pt ${index + 1}` }); 
                            }
                        }
                    });
                }
            }
        }

        Object.keys(parsedAgencyTracks).forEach(agency => {
            let pts = parsedAgencyTracks[agency];
            if (pts.length > 0) {
                hasAgencyData = true; 
                foundAgencies.add(agency);
                let color = agencyColorPalette[agency] || agencyColorPalette['OTHER'];
                if (agency === 'JMA') {
                    typhoonCenterCoords = [pts[0].lat, pts[0].lon];
                    drawTyphoonTrack(pts, tcAgencyLayerGroup, color, agency, true, true);
                } else { 
                    drawTyphoonTrack(pts, tcAgencyLayerGroup, color, agency, false, false); 
                }
                if (globalLatestTcDist === null) globalLatestTcDist = calculateDistance(hkoCenter[0], hkoCenter[1], pts[0].lat, pts[0].lon);
            }
        });

        if (!hasAgencyData) { 
            agencyAlert.style.display = 'flex'; 
            tcMapAgency.fitBounds(hkoBounds1200); 
        } else {
            agencyAlert.style.display = 'none';
            if (foundAgencies.has('OTHER')) document.getElementById('legend-other').style.display = 'inline-block';
            
            if (!typhoonCenterCoords) {
                let firstAgency = Object.keys(parsedAgencyTracks)[0];
                if (firstAgency && parsedAgencyTracks[firstAgency].length > 0) typhoonCenterCoords = [parsedAgencyTracks[firstAgency][0].lat, parsedAgencyTracks[firstAgency][0].lon];
            }
            if (typhoonCenterCoords) {
                tcMapAgency.fitBounds(L.latLng(typhoonCenterCoords).toBounds(4000000), { padding: [20, 20] });
            } else {
                tcMapAgency.fitBounds(hkoBounds1200);
            }
        }
    } catch (err) { 
        agencyAlert.style.display = 'flex'; 
        tcMapAgency.fitBounds(hkoBounds1200); 
    }

    updateSmartThreatAlert();
}
