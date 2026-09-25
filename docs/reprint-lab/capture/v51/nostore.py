# Static server for the repo with caching off, so every reload sees the latest files.
import http.server, sys
ROOT = sys.argv[2] if len(sys.argv) > 2 else "/Users/ggz/true82"
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); self.send_header("Access-Control-Allow-Origin", "*"); super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
