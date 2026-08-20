// utils.js

function parseCSVLine(text) {
    let ret = [], keep = false, item = '';
    for(let i=0; i<text.length; i++) {
        if(text[i] === '"') { keep = !keep; }
        else if(text[i] === ',' && !keep) { ret.push(item.trim()); item = ''; }
        else { item += text[i]; }
    }
    ret.push(item.trim()); return ret;
}

function getWindAngle(translatedTextArr) {
    let combined = translatedTextArr.join(' ').toUpperCase(); let angle = null;
    if (combined.includes('NNE') || combined.includes('北北東')) angle = 22.5; else if (combined.includes('ENE') || combined.includes('東北東')) angle = 67.5; else if (combined.includes('ESE') || combined.includes('東南東')) angle = 112.5; else if (combined.includes('SSE') || combined.includes('南南東')) angle = 157.5; else if (combined.includes('SSW') || combined.includes('南南西')) angle = 202.5; else if (combined.includes('WSW') || combined.includes('西南西')) angle = 247.5; else if (combined.includes('WNW') || combined.includes('西北西')) angle = 292.5; else if (combined.includes('NNW') || combined.includes('北北西')) angle = 337.5; else if (combined.includes('NE') || combined.includes('東北')) angle = 45; else if (combined.includes('SE') || combined.includes('東南')) angle = 135; else if (combined.includes('SW') || combined.includes('西南')) angle = 225; else if (combined.includes('NW') || combined.includes('西北')) angle = 315; else if (combined.includes('N') || combined.includes('北')) angle = 0; else if (combined.includes('E') || combined.includes('東')) angle = 90; else if (combined.includes('S') || combined.includes('南')) angle = 180; else if (combined.includes('W') || combined.includes('西')) angle = 270;
    return angle !== null ? (angle + 180) % 360 : null;
}

function getTempColor(val) {
    if(isNaN(val)) return themeColors.gray;
    if(val >= 33) return themeColors.red;
    if(val >= 28) return themeColors.orange;
    if(val >= 20) return themeColors.green;
    if(val >= 13) return themeColors.blue;
    return themeColors.purple;
}

function getTempLevelInfo(val) {
    if (isNaN(val)) return { level: 1, color: '#9e9e9e', badgeBg: 'rgba(255,255,255,0.05)', name: '未知' };
    if (val >= 33) return { level: 5, color: '#e74c3c', badgeBg: 'rgba(231,76,60,0.15)', name: '酷熱' };
    if (val >= 28) return { level: 4, color: '#e67e22', badgeBg: 'rgba(230,126,34,0.15)', name: '炎熱' };
    if (val >= 20) return { level: 3, color: '#2ecc71', badgeBg: 'rgba(46,204,113,0.15)', name: '溫暖' };
    if (val >= 13) return { level: 2, color: '#3498db', badgeBg: 'rgba(52,152,219,0.15)', name: '清涼' };
    return { level: 1, color: '#9b59b6', badgeBg: 'rgba(155,89,182,0.15)', name: '寒冷' };
}

function getWindLevelInfo(speed) {
    if (speed >= 88) return { level: 5, color: '#e74c3c', badgeBg: 'rgba(231,76,60,0.15)', name: '暴風/颶風' };
    if (speed >= 63) return { level: 4, color: '#e67e22', badgeBg: 'rgba(230,126,34,0.15)', name: '烈風' };
    if (speed >= 41) return { level: 3, color: '#f39c12', badgeBg: 'rgba(243,156,18,0.15)', name: '強風' };
    if (speed >= 15) return { level: 2, color: '#2ecc71', badgeBg: 'rgba(46,204,113,0.15)', name: '清勁' };
    if (speed > 0) return { level: 1, color: '#3498db', badgeBg: 'rgba(52,152,219,0.15)', name: '微風' };
    return { level: 1, color: '#9e9e9e', badgeBg: 'rgba(255,255,255,0.05)', name: '靜止' };
}

function degreesToCompass(deg) {
    if (deg === null || isNaN(deg)) return { dir: '無定向', arrow: '•' };
    const sectors = ['北', '北北東', '東北', '東北東', '東', '東南東', '東南', '南南東', '南', '南南西', '西南', '西南西', '西', '西北西', '西北', '北北西'];
    const arrows = ['⬇', '↙', '↙', '⬅', '⬅', '↖', '↖', '⬆', '⬆', '↗', '↗', '➡', '➡', '↘', '↘', '⬇'];
    let idx = Math.round(deg / 22.5) % 16;
    return { dir: sectors[idx], arrow: arrows[idx] };
}

function getRainLevel(rainVal) {
    if (rainVal >= 70) return { level: 5, color: '#e74c3c', badgeBg: 'rgba(231,76,60,0.15)', name: '黑雨級別特大暴雨', desc: '極度危險水浸' };
    if (rainVal >= 50) return { level: 4, color: '#e67e22', badgeBg: 'rgba(230,126,34,0.15)', name: '紅雨級別大暴雨', desc: '嚴重水浸風險' };
    if (rainVal >= 30) return { level: 3, color: '#f39c12', badgeBg: 'rgba(243,156,18,0.15)', name: '黃雨級別大雨', desc: '低窪地區水浸' };
    if (rainVal >= 15) return { level: 2, color: '#2ecc71', badgeBg: 'rgba(46,204,113,0.15)', name: '中雨至大雨', desc: '局部地區驟雨' };
    if (rainVal > 0) return { level: 1, color: '#3498db', badgeBg: 'rgba(52,152,219,0.15)', name: '微雨', desc: '輕微降雨' };
    return { level: 1, color: '#9e9e9e', badgeBg: 'rgba(255,255,255,0.05)', name: '無雨', desc: '未有降雨' };
}
