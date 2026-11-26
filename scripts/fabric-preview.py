# Builds the pictures for the fabric preview: each piece cut out of its sharpest gallery photo
# (1200 px, background removed with rembg's isnet model), and a mask of the props standing in it
# (coffee tables, vases, plants) so the preview recolours only the upholstery.
# Each prop box (fractions of the cut-out: x0, y0, x1, y1) is drawn around one prop by hand, and
# GrabCut finds the prop's outline inside it.
# Needs: pip install "rembg[cpu]" opencv-python-headless. Run: python3 scripts/fabric-preview.py
import importlib.util
import json
import os
import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_DIR = os.path.join(ROOT, "public/img/fabric-preview")
DATA = os.path.join(ROOT, "src/data/fabrics.json")

# A gallery photo that cuts out better than the product's first one.
PHOTO = {"1682": 1745, "1837": 1835, "1838": 1840, "1916": 1918, "1841": 1843}
# Products whose gallery photos do not cut out well keep the older, smaller cut-out (public/img/cut).
OLD_CUTOUT = ['1890', '1961', '1965']

PROPS = {
    "1672": [[0.0, 0.0, 0.4, 1.0], [0.94, 0.3, 1.0, 0.5], [0.05, 0.48, 0.42, 1.0]],
    "1682": [[0.45, 0.48, 0.83, 1.0]],
    "1702": [[0.68, 0.25, 1.0, 0.75]],
    "1789": [[0.0, 0.55, 0.42, 1.0]],
    "1821": [[0.0, 0.4, 0.28, 1.0]],
    "1838": [[0.08, 0.6, 0.2, 0.95]],
    "1850": [[0.12, 0.15, 0.92, 0.45], [0.25, 0.08, 0.4, 0.25], [0.7, 0.0, 0.82, 0.1]],
    "1865": [[0.06, 0.15, 0.64, 1.0]],
    "1870": [[0.0, 0.4, 0.3, 1.0]],
    "1873": [[0.5, 0.3, 0.99, 1.0]],
    "1876": [[0.0, 0.15, 0.33, 0.62]],
    "1881": [[0.0, 0.45, 1.0, 1.0]],
    "1887": [[0.28, 0.38, 0.73, 1.0]],
    "1893": [[0.34, 0.35, 0.92, 1.0]],
    "1895": [[0.37, 0.25, 0.9, 1.0]],
    "1897": [[0.63, 0.45, 0.98, 1.0]],
    "1900": [[0.5, 0.25, 0.97, 1.0]],
    "1903": [[0.0, 0.3, 0.6, 1.0]],
    "1907": [[0.0, 0.4, 1.0, 1.0]],
    "1908": [[0.28, 0.2, 0.72, 1.0]],
    "1916": [[0.82, 0.35, 1.0, 0.65]],
    "1920": [[0.4, 0.47, 1.0, 1.0]],
    "1923": [[0.0, 0.25, 0.3, 0.8]],
    "1926": [[0.15, 0.25, 0.68, 1.0]],
    "1929": [[0.35, 0.35, 0.73, 1.0]],
    "1932": [[0.45, 0.48, 0.82, 1.0]],
    "1935": [[0.38, 0.3, 0.95, 1.0]],
    "1938": [[0.3, 0.45, 0.7, 1.0]],
    "1943": [[0.1, 0.55, 0.9, 1.0]],
    "1948": [[0.2, 0.42, 0.82, 1.0]],
    "2065": [[0.62, 0.15, 0.76, 0.72], [0.45, 0.5, 0.83, 1.0], [0.9, 0.1, 1.0, 0.75]],
    "2067": [[0.0, 0.15, 0.22, 0.45]],
}
# Boxes for the older cut-outs.
OLD_PROPS = {
    "1890": [[0.22, 0.48, 0.88, 1.0]],
    "1961": [[0.42, 0.0, 0.57, 0.75]],
    "1965": [[0.0, 0.0, 0.15, 0.7]],
}


def chart_photos():
    """The fabric chart photos, which are in many galleries but show no furniture."""
    spec = importlib.util.spec_from_file_location("swatches", os.path.join(ROOT, "scripts/fabric-swatches.py"))
    swatches = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(swatches)
    charts = [swatches.fingerprint(Image.open(os.path.join(ROOT, f"public/img/g/{c['photo']}.webp"))) for c in json.load(open(DATA))["catalogs"]]

    def is_chart(photo):
        mine = swatches.fingerprint(Image.open(photo))
        return any(sum(a != b for a, b in zip(mine, chart)) <= 12 for chart in charts)
    return is_chart


def prop_mask(rgba, boxes):
    """White where a prop is, black elsewhere, at the cut-out's own size."""
    pixels = np.asarray(rgba)
    image = np.ascontiguousarray(pixels[:, :, 2::-1])
    height, width = pixels.shape[:2]
    props = np.zeros((height, width), bool)
    for x0, y0, x1, y1 in boxes:
        marks = np.zeros((height, width), np.uint8)
        rect = (int(x0 * width), int(y0 * height), int((x1 - x0) * width), int((y1 - y0) * height))
        cv2.grabCut(image, marks, rect, np.zeros((1, 65)), np.zeros((1, 65)), 6, cv2.GC_INIT_WITH_RECT)
        props |= (marks == cv2.GC_FGD) | (marks == cv2.GC_PR_FGD)
    return props & (pixels[:, :, 3] > 0)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    session = new_session("isnet-general-use")
    is_chart = chart_photos()
    data = json.load(open(DATA))
    galleries = json.load(open(os.path.join(ROOT, "src/data/galleries.json")))
    previews = {}
    for product in data["products"]:
        if product in OLD_CUTOUT:
            cut = Image.open(os.path.join(ROOT, f"public/img/cut/c{product}.webp")).convert("RGBA")
            boxes = OLD_PROPS.get(product, [])
        else:
            photos = [p for p in galleries[product] if os.path.exists(os.path.join(ROOT, f"public/img/g/{p}.webp"))]
            photo = PHOTO.get(product) or next(p for p in photos if not is_chart(os.path.join(ROOT, f"public/img/g/{p}.webp")))
            cut = remove(Image.open(os.path.join(ROOT, f"public/img/g/{photo}.webp")), session=session, post_process_mask=True)
            cut = cut.crop(cut.getbbox())
            boxes = PROPS.get(product, [])
        cut.save(os.path.join(OUT_DIR, f"f{product}.webp"), quality=86)
        if boxes:
            mask = prop_mask(cut, boxes)
            Image.fromarray(mask.astype(np.uint8) * 255).convert("1").save(os.path.join(OUT_DIR, f"p{product}.png"), optimize=True)
        previews[product] = bool(boxes)
        print(product, cut.size, "props" if boxes else "", flush=True)
    # The preview asks only for pictures that exist: true when the product also has a props mask.
    data.pop("props", None)
    data["previews"] = previews
    with open(DATA, "w") as out:
        json.dump(data, out, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
