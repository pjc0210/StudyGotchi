#!/usr/bin/env python3
"""Find Sketchfab 3D viewers for the Minecraft meme balls + famous game creatures."""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
UA = "StudyGotchiCreatureResearch/1.0 (local style board; educational)"

# query, display name, game, family
QUERIES = [
    ("verity ball thatmob pill", "Verity", "ThatMob Minecraft meme", "meme"),
    ("falsity thatmob pill ball", "Falsity", "ThatMob Minecraft meme", "meme"),
    ("cruelity thatmob pill", "Cruelity", "ThatMob Minecraft meme", "meme"),
    ("lovity thatmob pill", "Lovity", "ThatMob Minecraft meme", "meme"),
    ("verity pack yellow sphere", "Verity pack", "ThatMob Minecraft meme", "meme"),
    ("yoshi super mario 64", "Yoshi", "Super Mario 64", "mario"),
    ("yoshi nintendo character 3d", "Yoshi (smooth)", "Yoshi's Island", "mario"),
    ("birdo mario", "Birdo", "Super Mario Bros. 2", "mario"),
    ("luma mario galaxy", "Luma", "Super Mario Galaxy", "mario"),
    ("cheep cheep mario", "Cheep Cheep", "Super Mario Bros.", "mario"),
    ("blooper mario squid", "Blooper", "Super Mario Bros.", "mario"),
    ("goomba mario", "Goomba", "Super Mario Bros.", "mario"),
    ("koopa troopa mario", "Koopa Troopa", "Super Mario Bros.", "mario"),
    ("shy guy mario", "Shy Guy", "Super Mario Bros. 2", "mario"),
    ("chain chomp mario", "Chain Chomp", "Super Mario Bros. 3", "mario"),
    ("piranha plant mario", "Piranha Plant", "Super Mario Bros.", "mario"),
    ("bob-omb mario", "Bob-omb", "Super Mario Bros. 2", "mario"),
    ("thwomp mario", "Thwomp", "Super Mario Bros. 3", "mario"),
    ("bullet bill mario", "Bullet Bill", "Super Mario Bros.", "mario"),
    ("boo mario ghost", "Boo", "Super Mario Bros. 3", "mario"),
    ("cappy mario odyssey", "Cappy", "Super Mario Odyssey", "mario"),
    ("diddy kong", "Diddy Kong", "Donkey Kong Country", "mario"),
    ("rambi donkey kong", "Rambi", "Donkey Kong Country", "mario"),
    ("red pikmin", "Red Pikmin", "Pikmin", "pikmin"),
    ("yellow pikmin", "Yellow Pikmin", "Pikmin", "pikmin"),
    ("blue pikmin", "Blue Pikmin", "Pikmin", "pikmin"),
    ("purple pikmin", "Purple Pikmin", "Pikmin 2", "pikmin"),
    ("white pikmin", "White Pikmin", "Pikmin 2", "pikmin"),
    ("rock pikmin", "Rock Pikmin", "Pikmin 3", "pikmin"),
    ("winged pikmin", "Winged Pikmin", "Pikmin 3", "pikmin"),
    ("oatchi pikmin", "Oatchi", "Pikmin 4", "pikmin"),
    ("red bulborb pikmin", "Red Bulborb", "Pikmin", "pikmin"),
    ("kirby nintendo", "Kirby", "Kirby's Dream Land", "kirby"),
    ("waddle dee kirby", "Waddle Dee", "Kirby's Dream Land", "kirby"),
    ("king dedede", "King Dedede", "Kirby's Dream Land", "kirby"),
    ("meta knight kirby", "Meta Knight", "Kirby's Adventure", "kirby"),
    ("awoofy kirby", "Awoofy", "Kirby and the Forgotten Land", "kirby"),
    ("elfilin kirby", "Elfilin", "Kirby and the Forgotten Land", "kirby"),
    ("pikachu pokemon", "Pikachu", "Pokémon", "pokemon"),
    ("eevee pokemon", "Eevee", "Pokémon", "pokemon"),
    ("ditto pokemon", "Ditto", "Pokémon", "pokemon"),
    ("mimikyu pokemon", "Mimikyu", "Pokémon", "pokemon"),
    ("jigglypuff pokemon", "Jigglypuff", "Pokémon", "pokemon"),
    ("snorlax pokemon", "Snorlax", "Pokémon", "pokemon"),
    ("magikarp pokemon", "Magikarp", "Pokémon", "pokemon"),
    ("bulbasaur pokemon", "Bulbasaur", "Pokémon", "pokemon"),
    ("squirtle pokemon", "Squirtle", "Pokémon", "pokemon"),
    ("charmander pokemon", "Charmander", "Pokémon", "pokemon"),
    ("gengar pokemon", "Gengar", "Pokémon", "pokemon"),
    ("isabelle animal crossing", "Isabelle", "Animal Crossing", "ac"),
    ("tom nook animal crossing", "Tom Nook", "Animal Crossing", "ac"),
    ("kk slider animal crossing", "K.K. Slider", "Animal Crossing", "ac"),
    ("chao sonic adventure", "Chao", "Sonic Adventure", "sonic"),
    ("korok zelda botw", "Korok", "Breath of the Wild", "zelda"),
    ("cucco zelda", "Cucco", "The Legend of Zelda", "zelda"),
    ("tingle zelda", "Tingle", "Majora's Mask", "zelda"),
    ("midna zelda", "Midna", "Twilight Princess", "zelda"),
    ("banjo kazooie", "Banjo", "Banjo-Kazooie", "rare"),
    ("untitled goose game", "The Goose", "Untitled Goose Game", "indie"),
    ("fall guys bean", "Fall Guy", "Fall Guys", "indie"),
    ("among us crewmate", "Crewmate", "Among Us", "indie"),
    ("kirby pink puff", "Kirby (puff)", "Kirby", "kirby"),
    ("slime rancher pink slime", "Pink Slime", "Slime Rancher", "slime"),
    ("dragon quest slime", "Dragon Quest Slime", "Dragon Quest", "slime"),
    ("cult of the lamb", "The Lamb", "Cult of the Lamb", "gotchi"),
    ("flowey undertale", "Flowey", "Undertale", "story"),
    ("temmie undertale", "Temmie", "Undertale", "story"),
    ("crossy road chicken", "Crossy Chicken", "Crossy Road", "indie"),
    ("sackboy littlebigplanet", "Sackboy", "LittleBigPlanet", "indie"),
    ("astro bot playstation", "Astro Bot", "Astro Bot", "indie"),
    ("spyro the dragon", "Spyro", "Spyro the Dragon", "indie"),
    ("crash bandicoot", "Crash Bandicoot", "Crash Bandicoot", "indie"),
    ("toad mario", "Toad", "Super Mario Bros.", "mario"),
    ("wario mario", "Wario", "Super Mario Land 2", "mario"),
    ("poochy yoshi", "Poochy", "Yoshi's Island", "mario"),
    ("smallfry splatoon", "Smallfry", "Splatoon 3", "splatoon"),
    ("fox mccloud star fox", "Fox McCloud", "Star Fox", "starfox"),
    ("junimo stardew", "Junimo", "Stardew Valley", "story"),
    ("slugcat rain world", "Slugcat", "Rain World", "story"),
]


def search(query: str) -> dict | None:
    params = {
        "type": "models",
        "q": query,
        "count": 8,
        "sort_by": "-likeCount",
    }
    url = "https://api.sketchfab.com/v3/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8", "replace"))
    except Exception as exc:
        print("fail", query, exc)
        return None
    results = data.get("results") or []
    if not results:
        return None
    # prefer models whose name actually mentions a keyword from the query
    keys = [w.lower() for w in query.split() if len(w) > 3]
    def score(item: dict) -> tuple:
        name = (item.get("name") or "").lower()
        hits = sum(1 for k in keys if k in name)
        return (hits, item.get("likeCount") or 0)
    results.sort(key=score, reverse=True)
    return results[0]


def main() -> None:
    items = []
    seen = set()
    for query, name, game, family in QUERIES:
        hit = search(query)
        time.sleep(0.12)
        if not hit:
            print("miss", name)
            continue
        uid = hit.get("uid")
        if not uid or uid in seen:
            print("dup/miss", name, uid)
            continue
        seen.add(uid)
        thumb = None
        images = (hit.get("thumbnails") or {}).get("images") or []
        if images:
            images = sorted(images, key=lambda i: i.get("width") or 0)
            mid = images[len(images) // 2] if images else None
            thumb = (mid or images[-1]).get("url")
        items.append(
            {
                "name": name,
                "game": game,
                "family": family,
                "uid": uid,
                "sketchfab": hit.get("name"),
                "author": ((hit.get("user") or {}).get("displayName")),
                "likes": hit.get("likeCount") or 0,
                "embed": f"https://sketchfab.com/models/{uid}/embed?autostart=1&ui_theme=light&ui_infos=0&ui_watermark=0",
                "page": f"https://sketchfab.com/3d-models/{uid}",
                "thumb": thumb,
            }
        )
        print(f"ok {name:22} -> {hit.get('name')} ({uid})")

    catalog = {"count": len(items), "items": items}
    (ROOT / "models.json").write_text(json.dumps(catalog, indent=2), encoding="utf-8")
    (ROOT / "models.html").write_text(render(catalog), encoding="utf-8")
    print("wrote", catalog["count"], "models")


def render(catalog: dict) -> str:
    options = "\n".join(
        f'<option value="{i}">{esc(item["name"])} — {esc(item["game"])}</option>'
        for i, item in enumerate(catalog["items"])
    )
    data = json.dumps(catalog["items"])
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Game character 3D cycle</title>
<style>
  :root {{ --bg:#11110f; --ink:#f4efe4; --muted:#b4a894; --card:#1c1b18; --line:#3a342c; }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin:0; height:100%; background:var(--bg); color:var(--ink); font-family:"Avenir Next","Segoe UI",sans-serif; }}
  .app {{ height:100%; display:grid; grid-template-rows:auto 1fr auto; }}
  header, footer {{ padding:14px 18px; background:var(--card); border-color:var(--line); }}
  header {{ border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; align-items:flex-end; }}
  footer {{ border-top:1px solid var(--line); display:flex; gap:10px; align-items:center; flex-wrap:wrap; }}
  h1 {{ margin:0; font-size:1.25rem; }}
  .lede {{ margin:4px 0 0; color:var(--muted); font-size:0.85rem; max-width:70ch; }}
  .stage {{ position:relative; }}
  iframe {{ width:100%; height:100%; border:0; background:#000; }}
  button, select {{ background:#2a261f; color:var(--ink); border:1px solid var(--line); border-radius:10px; padding:8px 12px; font:inherit; }}
  button.on {{ background:var(--ink); color:#111; }}
  .meta {{ color:var(--muted); font-size:0.8rem; }}
  a {{ color:#9ec9f0; }}
</style>
</head>
<body>
<div class="app">
  <header>
    <div>
      <h1 id="title">Game character 3D</h1>
      <p class="lede" id="sub">Sketchfab viewers of the actual characters. These are not StudyGotchi assets and cannot ship.</p>
    </div>
    <select id="jump">{options}</select>
  </header>
  <div class="stage"><iframe id="frame" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe></div>
  <footer>
    <button id="prev">Previous</button>
    <button class="on" id="next">Next</button>
    <span class="meta" id="count"></span>
    <span class="meta" id="credit"></span>
    <a id="open" href="#" target="_blank" rel="noreferrer">Open on Sketchfab</a>
  </footer>
</div>
<script>
const ITEMS = {data};
let i = 0;
const title = document.getElementById("title");
const sub = document.getElementById("sub");
const count = document.getElementById("count");
const credit = document.getElementById("credit");
const frame = document.getElementById("frame");
const jump = document.getElementById("jump");
const open = document.getElementById("open");
function show(n) {{
  i = (n + ITEMS.length) % ITEMS.length;
  const item = ITEMS[i];
  title.textContent = item.name;
  sub.textContent = item.game + " · look-at only, do not ship";
  count.textContent = (i + 1) + " / " + ITEMS.length;
  credit.textContent = (item.sketchfab || "") + (item.author ? " by " + item.author : "");
  frame.src = item.embed;
  jump.value = String(i);
  open.href = item.page;
}}
document.getElementById("prev").onclick = () => show(i - 1);
document.getElementById("next").onclick = () => show(i + 1);
jump.onchange = () => show(parseInt(jump.value, 10));
window.addEventListener("keydown", (e) => {{
  if (e.key === "ArrowRight" || e.key === "ArrowDown") show(i + 1);
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") show(i - 1);
}});
show(0);
</script>
</body>
</html>
"""


def esc(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


if __name__ == "__main__":
    main()
