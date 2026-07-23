from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import json

class ProxyHTTPRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # 攔截對 /api/tc_list 的請求，代替瀏覽器去抓天文台的 tc_list.xml
        if self.path == '/api/tc_list':
            try:
                url = 'https://www.weather.gov.hk/wxinfo/currwx/tc_list.xml'
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    self.send_response(200)
                    self.send_header('Content-type', 'application/xml')
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_error(500, f'Error fetching list: {e}')
                
        # 攔截對 /api/tc_data?file=xxx.xml 的請求，代替瀏覽器去抓具體路徑檔
        elif self.path.startswith('/api/tc_data?file='):
            try:
                filename = self.path.split('=')[1]
                url = f'https://www.weather.gov.hk/wxinfo/currwx/{filename}'
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    self.send_response(200)
                    self.send_header('Content-type', 'application/xml')
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_error(500, f'Error fetching data: {e}')
                
        # 其他請求則正常伺服本地檔案 (如 HTML)
        else:
            super().do_GET()

if __name__ == '__main__':
    port = 8000
    server_address = ('', port)
    httpd = HTTPServer(server_address, ProxyHTTPRequestHandler)
    print(f"✅ 本地伺服器已啟動！請在瀏覽器打開: http://localhost:{port}/index.html")
    httpd.serve_forever()
