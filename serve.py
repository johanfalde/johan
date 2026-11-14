"""Server lokal KanvasCut tanpa cache, supaya browser selalu memuat versi terbaru.

Pakai:  python serve.py        lalu buka http://localhost:8000
        python serve.py 9000   untuk port lain
"""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".mjs": "text/javascript"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"KanvasCut berjalan di http://localhost:{port}  (Ctrl+C untuk berhenti)")
    http.server.ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
