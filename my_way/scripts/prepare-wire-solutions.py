"""Trim full-position loops in the original Wolf player's bundled solutions.

Run against the local Vite server. The original HTML remains the source;
every cleaned route must reach the same surface finish in the original player.
"""
import asyncio
import json
from html.parser import HTMLParser
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]


class Solutions(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "span" and attrs.get("class") == "solution":
            self.rows.append({"title": attrs["name"], "directions": attrs["path"]})
        if tag == "a" and attrs.get("href", "").startswith("?path="):
            self.links.append(attrs["href"].split("=", 1)[1])


async def main():
    source = Solutions()
    source.feed((ROOT / "public/programs/wolf/index.html").read_text())
    source.rows.extend([
        {"title": "another route", "directions": source.links[0]},
        {"title": "one route", "directions": source.links[1]},
    ])
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path="/home/jay/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome"
        )
        page = await browser.new_page()
        await page.goto("http://127.0.0.1:5173/Fractal-Maze/programs/wolf/index.html")
        await page.wait_for_function("typeof maze !== 'undefined' && maze.node")
        # The historical player starts an automatic victory replay at this node.
        # Stop at the finish so extraction observes the completed route itself.
        await page.evaluate("delete maze.nodes[-2].north")
        for index, row in enumerate(source.rows, 1):
            trimmed = await page.evaluate("""directions => {
                const key = () => {
                    const address = [];
                    for (let copy = maze.traversing; copy.up; copy = copy.up)
                        address.unshift(copy.box);
                    return JSON.stringify([address, maze.node.x, maze.node.y]);
                };
                const moves = {n: 'north', s: 'south', e: 'east', w: 'west'};
                maze.reset(); maze.animate = false;
                const history = [key()], route = [];
                for (const direction of directions) {
                    maze.move(moves[direction]);
                    const position = key(), previous = history.indexOf(position);
                    if (previous >= 0) {
                        history.splice(previous + 1); route.splice(previous);
                    } else { history.push(position); route.push(direction); }
                }
                const ending = key();
                if (maze.node !== maze.nodes[-2] || maze.traversing.up)
                    throw Error('Original route does not finish on the surface');
                maze.reset(); maze.animate = false;
                for (const direction of route) maze.move(moves[direction]);
                if (key() !== ending) throw Error('Trimming changed the destination');
                return route.join('');
            }""", row["directions"])
            print(f"{row['title']}: {len(row['directions'])} → {len(trimmed)}")
            row.update(id=str(index), directions=trimmed)
        await browser.close()
    (ROOT / "src/data/mazes/wire-solutions.json").write_text(
        json.dumps(source.rows, indent=2) + "\n"
    )


asyncio.run(main())
