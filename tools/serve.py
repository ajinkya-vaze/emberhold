"""Local dev server with caching disabled. Usage: python3 tools/serve.py [port]

Also accepts PUT /icons/<name>.png from this machine only, so tools/make-icons.html
can save the app icons it draws.
"""
import http.server
import os
import re
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_PATH = re.compile(r"^/icons/([a-z0-9-]+\.png)$")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_PUT(self):
        m = ICON_PATH.match(self.path)
        if self.client_address[0] != "127.0.0.1" or not m:
            self.send_error(403)
            return
        length = int(self.headers.get("Content-Length", 0))
        if length <= 0 or length > 2_000_000:
            self.send_error(400)
            return
        data = self.rfile.read(length)
        if not data.startswith(b"\x89PNG"):
            self.send_error(400)
            return
        os.makedirs(os.path.join(ROOT, "icons"), exist_ok=True)
        with open(os.path.join(ROOT, "icons", m.group(1)), "wb") as f:
            f.write(data)
        self.send_response(201)
        self.end_headers()


http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
