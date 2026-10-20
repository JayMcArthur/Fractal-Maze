"""Check fresh Pages and root builds on plain static HTTP servers.

Build dist normally, then build the root variant into a separate directory:
VITE_BASE_PATH=/ npm run build -- --outDir /tmp/fractal-root-build
python scripts/check-static-hosting.py /tmp/fractal-root-build
"""
import argparse
import asyncio
import functools
import json
import os
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


class StaticHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, fallback, **kwargs):
        self.fallback = fallback
        super().__init__(*args, **kwargs)

    def send_error(self, code, message=None, explain=None):
        if code != 404:
            return super().send_error(code, message, explain)
        content = self.fallback.read_bytes()
        self.send_response(404 if self.fallback.name == '404.html' else 200)
        self.send_header('Content-Type', 'text/html')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, *_):
        pass


async def check_hosts(root_build):
    routes = [('', 'Find your way through infinity.'), ('library', 'Choose your maze.'),
              ('build', 'Build a maze.'), ('solver?id=alice-in-wonderland', 'Solve & analyze'),
              ('play/alice-in-wonderland', None),
              ('play/alice-in-wonderland?replay=bundled-alice-in-wonderland', None),
              ('play/wolf-wire-original', None),
              ('play/wolf-wire-original?replay=bundled-wire-1', None),
              ('solver?id=wolf-wire-original', 'Solve & analyze'),
              ('workbench/wolf-wire-original?tab=play', 'Mark J. P. Wolf — original wire maze'),
              ('play/koteitan-block-3', None),
              ('play/koteitan-block-5?replay=bundled-koteitan-block-5', None),
              ('play/repeated-atomic-cp3-3?replay=bundled-repeated-atomic-cp3-3', None),
              ('play/repeated-atomic-cp3-4?replay=bundled-repeated-atomic-cp3-4', None),
              ('play/repeated-atomic-cp-n3-godel?replay=bundled-repeated-atomic-cp-n3-godel', None),
              ('play/1695993784968:0.6965701909885131', None),
              ('play/1695993784968:0.6965701909885131?replay=bundled-1695993784968:0.6965701909885131', None),
              ('solver?id=1695993784968:0.6965701909885131', 'Solve & analyze'),
              ('workbench/1695993784968:0.6965701909885131?tab=play', 'Tsat - Cubist'),
              ('workbench/proof-maze-images-siggy-infinite-descent-svg?tab=proof', 'Your proof notebook'),
              ('play/proof-maze-images-siggy-infinite-descent-svg?replay=bundled-proof-maze-images-siggy-infinite-descent-svg', None),
              ('play/pda-guide-6', None),
              ('play/pda-guide-3?replay=bundled-pda-guide-3', None),
              ('solver?id=pda-guide-6', 'Solve & analyze'),
              ('workbench/simple-nested-infinite-hop?tab=play', 'Simple nested infinite hop')]
    checks = []
    with tempfile.TemporaryDirectory(prefix='fractal-static-') as temporary:
        pages_root = Path(temporary)
        (pages_root / 'Fractal-Maze').symlink_to(ROOT / 'dist', target_is_directory=True)
        mounts = [(pages_root, ROOT / 'dist/404.html', '/Fractal-Maze/'),
                  (root_build, root_build / 'index.html', '/')]
        for directory, fallback, mount in mounts:
            handler = functools.partial(StaticHandler, directory=str(directory), fallback=fallback)
            server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
            threading.Thread(target=server.serve_forever, daemon=True).start()
            base = f'http://127.0.0.1:{server.server_port}{mount}'
            try:
                async with async_playwright() as p:
                    browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
                    page = await browser.new_page(viewport=dict(width=1440, height=1000), reduced_motion='reduce')
                    errors, failed_resources = [], []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('response', lambda response: failed_resources.append(response.url)
                            if response.status >= 400 and not response.request.is_navigation_request() else None)
                    await page.add_init_script("window.cspFailures=[];document.addEventListener('securitypolicyviolation',e=>window.cspFailures.push(e.violatedDirective))")
                    for route, heading in routes:
                        for refresh in [False, True]:
                            if refresh:
                                await page.reload()
                            else:
                                await page.goto(base + route)
                            if heading:
                                await page.get_by_role('heading', name=heading, exact=True).wait_for()
                            elif '?replay=' in route:
                                await page.get_by_role('button', name='Play replay', exact=True).wait_for()
                            else:
                                await page.get_by_label('Maze replay', exact=True).wait_for()
                            if route.startswith('play/repeated-atomic-') and '?replay=' in route:
                                await page.get_by_role('button', name='Seek to end', exact=True).click()
                                await expect(page.get_by_role('img', name='Directed repeated blocks around the current terminal')).to_contain_text('0,0,W1')
                            if route == 'play/koteitan-block-3':
                                await page.get_by_label('Search detail', exact=True).fill('2')
                                await page.get_by_role('button', name='Find finite route', exact=True).click()
                                await expect(page.locator('section > .format-note[role="status"]')).to_contain_text('Solution loaded')
                            if route in ['solver?id=1695993784968:0.6965701909885131', 'solver?id=wolf-wire-original', 'solver?id=pda-guide-6']:
                                await page.get_by_role('button', name='Find finite route', exact=True).click()
                                await expect(page.get_by_role('button', name='Save & play replay', exact=True)).to_be_enabled()
                            assert page.url == base + route, page.url
                            csp = await page.evaluate('window.cspFailures')
                            assert not errors and not csp and not failed_resources, (route, errors, csp, failed_resources)
                            checks.append(dict(mount=mount, route=route, refresh=refresh,
                                               pageErrors=list(errors), csp=csp, failedResources=list(failed_resources),
                                               workerChecked=route in ['play/koteitan-block-3', 'solver?id=1695993784968:0.6965701909885131', 'solver?id=wolf-wire-original', 'solver?id=pda-guide-6']))
                    await browser.close()
            finally:
                server.shutdown()
                server.server_close()
    (ROOT / 'docs/STATIC_HOSTING_CHECKS.json').write_text(json.dumps(checks, indent=2) + '\n')
    print(len(checks), 'static hosting, refresh and deep-link checks passed; both mounts run a solver worker')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root_build', type=Path)
    args = parser.parse_args()
    asyncio.run(check_hosts(args.root_build.resolve()))
