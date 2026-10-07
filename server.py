import sys
import http.server
import urllib.request
import urllib.parse
import re
import os
import gzip
import zlib
import mimetypes

PORT = 8080
if len(sys.argv) > 1:
    try:
        PORT = int(sys.argv[1])
    except ValueError:
        pass

USER_AGENTS = {
    'mobile': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'tablet': 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'desktop': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
}

class ResponsiveStudioHandler(http.server.SimpleHTTPRequestHandler):
    def do_HEAD(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/proxy' or parsed.path.startswith('/localfs/'):
            self.do_GET()
        else:
            super().do_HEAD()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        # 1. Local Filesystem Bridge: /localfs/<absolute_path>
        if parsed.path.startswith('/localfs/'):
            req_path = parsed.path[len('/localfs/'):]
            clean_path = urllib.parse.unquote(req_path)
            
            # Clean Windows drive letter format (/C:/ or C:/)
            clean_path = re.sub(r'^/+', '', clean_path)
            clean_path = os.path.normpath(clean_path)

            if os.path.isdir(clean_path):
                clean_path = os.path.join(clean_path, 'index.html')

            if os.path.isfile(clean_path):
                try:
                    ctype, _ = mimetypes.guess_type(clean_path)
                    if not ctype:
                        ctype = 'text/html' if clean_path.endswith('.html') else 'application/octet-stream'

                    with open(clean_path, 'rb') as f:
                        data = f.read()

                    self.send_response(200)
                    self.send_header('Content-Type', ctype)
                    self.send_header('Content-Length', str(len(data)))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('X-Frame-Options', 'ALLOWALL')
                    self.send_header('Content-Security-Policy', "frame-ancestors *")
                    self.end_headers()
                    self.wfile.write(data)
                    return
                except Exception as e:
                    self.send_error(500, f"Error reading local file: {str(e)}")
                    return
            else:
                self.send_error(404, f"Local file not found on disk: {clean_path}")
                return
        
        # 2. External Smart Proxy Endpoint: /proxy?url=...
        if parsed.path == '/proxy':
            query = urllib.parse.parse_qs(parsed.query)
            target_url = query.get('url', [None])[0]
            device = query.get('device', ['desktop'])[0]

            if not target_url:
                self.send_error(400, "Missing 'url' parameter")
                return

            if not target_url.startswith(('http://', 'https://')):
                target_url = 'https://' + target_url

            ua = USER_AGENTS.get(device, USER_AGENTS['desktop'])

            try:
                headers = {
                    'User-Agent': ua,
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate'
                }
                req = urllib.request.Request(target_url, headers=headers)
                
                with urllib.request.urlopen(req, timeout=12) as response:
                    final_url = response.geturl()
                    content_type = response.headers.get('Content-Type', 'text/html')
                    content_encoding = response.headers.get('Content-Encoding', '').lower()
                    raw_data = response.read()

                    # Decompress if compressed
                    if 'gzip' in content_encoding or (len(raw_data) > 2 and raw_data[:2] == b'\x1f\x8b'):
                        try:
                            raw_data = gzip.decompress(raw_data)
                        except Exception:
                            pass
                    elif 'deflate' in content_encoding:
                        try:
                            raw_data = zlib.decompress(raw_data)
                        except Exception:
                            pass

                    # If HTML, inject base tag and neutralize frame-busting scripts
                    if 'text/html' in content_type:
                        try:
                            encoding = response.headers.get_content_charset() or 'utf-8'
                            html_str = raw_data.decode(encoding, errors='replace')

                            base_tag = f'<base href="{final_url}">'
                            if re.search(r'<head[^>]*>', html_str, re.IGNORECASE):
                                html_str = re.sub(r'(<head[^>]*>)', r'\1' + base_tag, html_str, count=1, flags=re.IGNORECASE)
                            else:
                                html_str = base_tag + html_str

                            # Neutralize top.location frame busting
                            html_str = re.sub(r'(top|parent|window\.top|window\.parent)\.location\s*=', r'// location =', html_str)
                            html_str = re.sub(r'if\s*\(\s*(top|parent)\s*!==?\s*(self|window)\s*\)', r'if(false)', html_str)

                            raw_data = html_str.encode(encoding, errors='replace')
                        except Exception:
                            pass

                    self.send_response(200)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Content-Length', str(len(raw_data)))
                    # Strip frame restrictions
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('X-Frame-Options', 'ALLOWALL')
                    self.send_header('Content-Security-Policy', "frame-ancestors *")
                    self.end_headers()
                    self.wfile.write(raw_data)
                    return

            except Exception as e:
                self.send_response(502)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                err_page = f"""
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <title>로드 실패</title>
                  <style>
                    body {{ font-family: -apple-system, sans-serif; background: #0c0e17; color: #f8fafc; padding: 40px 20px; text-align: center; }}
                    .box {{ max-width: 480px; margin: 0 auto; background: #161a29; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; }}
                    h3 {{ color: #f43f5e; margin: 0 0 12px; font-size: 1.15rem; }}
                    p {{ color: #94a3b8; font-size: 0.88rem; line-height: 1.5; margin: 8px 0; }}
                    .code {{ font-family: monospace; background: #070911; padding: 6px 10px; border-radius: 6px; color: #a5b4fc; font-size: 0.8rem; display: inline-block; word-break: break-all; margin: 10px 0; }}
                    a {{ display: inline-block; margin-top: 14px; padding: 8px 16px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 0.85rem; }}
                  </style>
                </head>
                <body>
                  <div class="box">
                    <h3>⚠️ 웹페이지 로드 실패</h3>
                    <p>대상 주소: <span class="code">{target_url}</span></p>
                    <p style="color:#ef4444;">에러: {str(e)}</p>
                    <p>외부 사이트가 프록시 요청을 차단했거나 일시적인 네트워크 오류일 수 있습니다.</p>
                    <a href="{target_url}" target="_blank">새 창에서 직접 열기 ↗</a>
                  </div>
                </body>
                </html>
                """
                self.wfile.write(err_page.encode('utf-8'))
                return

        return super().do_GET()

def run_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = http.server.ThreadingHTTPServer(("", PORT), ResponsiveStudioHandler)
    server.daemon_threads = True
    print(f"========================================================", flush=True)
    print(f"  반응형 뷰포트 스튜디오 (Responsive Viewport Studio)", flush=True)
    print(f"  서버 실행 중: http://localhost:{PORT}", flush=True)
    print(f"  로컬 파일시스템 브리지(/localfs/...) 활성화됨", flush=True)
    print(f"  기기별 프록시(Mobile/Tablet/PC UA) 지원 활성화됨", flush=True)
    print(f"========================================================", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n서버가 종료되었습니다.", flush=True)

if __name__ == '__main__':
    run_server()
