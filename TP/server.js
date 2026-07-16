// server.js
const http = require('http');
const https = require('https');

const PORT = 3000; // 你可以自訂 port

const server = http.createServer((req, res) => {
    // 設置 CORS headers，允許任何前端網站讀取呢個 API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 處理 OPTIONS 預檢請求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 當前端請求 /api/jma/tc 時，幫佢去日本氣象廳攞資料
    if (req.url === '/api/jma/tc' && req.method === 'GET') {
        const jmaUrl = 'https://www.jma.go.jp/bosai/typhoon/data/TC.json';

        https.get(jmaUrl, (jmaRes) => {
            let data = '';
            
            jmaRes.on('data', (chunk) => { data += chunk; });
            
            jmaRes.on('end', () => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            });
        }).on('error', (err) => {
            console.error('JMA 請求失敗:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '無法連接日本氣象廳' }));
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`CORS Proxy 伺服器已啟動: http://localhost:${PORT}`);
});
