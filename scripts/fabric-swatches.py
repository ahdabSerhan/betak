# Cuts one swatch per colour out of the fabric charts photographed on the old betak.co.il
# (public/img/g), and writes src/data/fabrics.json: the catalogs, their colours, and which
# products show which chart in their gallery. Run once: python3 scripts/fabric-swatches.py
import json
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
GALLERY = os.path.join(ROOT, "public/img/g")
OUT_DIR = os.path.join(ROOT, "public/img/fabrics")
TILE = (240, 180)  # Swatch size in pixels (4:3).


def label_rows(image, x0, x1):
    """Vertical centres of the printed labels (rows of dark text) between x0 and x1."""
    gray = image.convert("L")
    px = gray.load()
    clusters, start = [], None
    for y in range(gray.height):
        dark = sum(1 for x in range(x0, x1) if px[x, y] < 70) > 3
        if dark and start is None:
            start = y
        if not dark and start is not None:
            if y - start > 8:
                clusters.append((start, y))
            start = None
    if start is not None:
        clusters.append((start, gray.height))
    centres = []
    for a, b in clusters:
        # Two labels printed so close that they touch: split them.
        if b - a > 60:
            centres += [a + (b - a) // 4, b - (b - a) // 4]
        else:
            centres.append((a + b) // 2)
    return centres


# Each chart: the photo, where the fabric strips and the labels are, and the printed codes.
# shift moves the sampling point up (+) when the labels sit lower than their strip; fix gives exact rows.
CHARTS = [
    {"id": "rado", "name": {"he": "רדו", "en": "Rado"}, "photo": 1000, "columns": [((60, 700), (775, 1100), 0, [f"RADO-{n}" for n in range(1, 26)])]},
    {"id": "reef", "name": {"he": "ריף", "en": "Reef"}, "photo": 1004, "columns": [((60, 740), (820, 1100), 0, [f"REEF-{n}" for n in range(4601, 4620)])]},
    {"id": "flamingo", "name": {"he": "פלמינגו", "en": "Flamingo"}, "photo": 1003, "columns": [((60, 620), (690, 1120), 0, [f"Flamingo {n}" for n in range(2401, 2421)])]},
    {"id": "dallas", "name": {"he": "דאלאס", "en": "Dallas"}, "photo": 1001, "columns": [((60, 720), (870, 1190), 0, [f"Dallas-{n}" for n in range(601, 617)])]},
    {"id": "dream", "name": {"he": "דרים", "en": "Dream"}, "photo": 1002, "columns": [
        ((210, 560), (20, 140), 7, [f"Dream {n}" for n in range(1, 36)]),
        ((650, 1000), (1040, 1150), 0, [f"Dream {n}" for n in range(36, 71)]),
    ], "fix": {"Dream 29": 1400, "Dream 30": 1443, "Dream 31": 1488, "Dream 32": 1530, "Dream 33": 1570, "Dream 34": 1610, "Dream 35": 1638, "Dream 45": 505, "Dream 48": 654, "Dream 69": 1585, "Dream 70": 1622}},
]


def fingerprint(image):
    small = image.convert("L").resize((8, 16))
    values = list(small.get_flattened_data())
    mean = sum(values) / len(values)
    return [v > mean for v in values]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    catalogs = []
    for chart in CHARTS:
        photo = Image.open(os.path.join(GALLERY, f"{chart['photo']}.webp")).convert("RGB")
        swatches = []
        for (fx0, fx1), (lx0, lx1), shift, codes in chart["columns"]:
            rows = label_rows(photo, lx0, lx1)
            assert len(rows) == len(codes), f"{chart['id']}: {len(rows)} labels, expected {len(codes)}"
            for i, (y, code) in enumerate(zip(rows, codes)):
                # A few labels at the bottom of a chart sit too far from their strip: sampled by hand.
                y = chart.get("fix", {}).get(code, y - shift)
                gap = min(abs(y - rows[j]) for j in (i - 1, i + 1) if 0 <= j < len(rows))
                height = max(24, int(gap * 0.45))
                width = int(height * TILE[0] / TILE[1])
                cx = (fx0 + fx1) // 2
                box = (cx - width // 2, y - height // 2, cx + width // 2, y + height // 2)
                tile = photo.crop(box).resize(TILE, Image.LANCZOS)
                name = code.lower().replace(" ", "-")
                tile.save(os.path.join(OUT_DIR, f"{chart['id']}-{name}.webp"), quality=82)
                # The colour for the sofa preview: the median of the swatch, which ignores the weave's highlights.
                pixels = list(photo.crop(box).get_flattened_data())
                hexes = "#" + "".join(f"{sorted(p[c] for p in pixels)[len(pixels) // 2]:02x}" for c in range(3))
                swatches.append({"code": code, "file": f"{chart['id']}-{name}.webp", "color": hexes})
        catalogs.append({"id": chart["id"], "name": chart["name"], "photo": chart["photo"], "swatches": swatches})

    # Which charts each product shows in its gallery, matched by a small picture fingerprint.
    prints = {c["id"]: fingerprint(Image.open(os.path.join(GALLERY, f"{c['photo']}.webp"))) for c in catalogs}
    galleries = json.load(open(os.path.join(ROOT, "src/data/galleries.json")))
    products = {}
    for product, photos in galleries.items():
        found = []
        for photo in photos:
            path = os.path.join(GALLERY, f"{photo}.webp")
            if not os.path.exists(path):
                continue
            mine = fingerprint(Image.open(path))
            for cid, ref in prints.items():
                if cid not in found and sum(a != b for a, b in zip(mine, ref)) <= 12:
                    found.append(cid)
        if found:
            products[product] = [c["id"] for c in catalogs if c["id"] in found]

    path = os.path.join(ROOT, "src/data/fabrics.json")
    # Keep the preview list written by scripts/fabric-preview.py.
    previews = json.load(open(path)).get("previews", {}) if os.path.exists(path) else {}
    with open(path, "w") as out:
        json.dump({"catalogs": catalogs, "products": products, "previews": previews}, out, ensure_ascii=False, indent=1)
    print(len(catalogs), "catalogs,", sum(len(c["swatches"]) for c in catalogs), "swatches,", len(products), "products")


if __name__ == "__main__":
    main()
