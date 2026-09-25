# Static server for the lab (serves the scratchpad) plus a POST sink:
# POST /snap/<relative/path> writes the body under scratchpad/snaps/.
import http.server, os, sys, urllib.parse
ROOT = os.path.dirname(os.path.abspath(__file__))
SNAPS = os.path.join(ROOT, "snaps")
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); self.cors(); super().end_headers()
    def do_OPTIONS(self): self.send_response(204); self.end_headers()
    def do_POST(self):
        p = urllib.parse.urlparse(self.path).path
        if not p.startswith("/snap/"): self.send_response(404); self.end_headers(); return
        rel = os.path.normpath(p[len("/snap/"):]).lstrip("/")
        if rel.startswith(".."): self.send_response(400); self.end_headers(); return
        out = os.path.join(SNAPS, rel); os.makedirs(os.path.dirname(out), exist_ok=True)
        n = int(self.headers.get("Content-Length", 0)); data = self.rfile.read(n)
        with open(out, "wb") as f: f.write(data)
        self.send_response(200); self.send_header("Content-Type", "text/plain"); self.end_headers()
        self.wfile.write(("saved %s %d bytes" % (rel, len(data))).encode())
    def log_message(self, *a): pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
