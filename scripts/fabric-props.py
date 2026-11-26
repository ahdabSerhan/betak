# Marks the props standing in the product cut-outs (coffee tables, vases, plants), so the fabric
# preview recolours only the upholstery. Each box (fractions of the cut-out: x0, y0, x1, y1) is drawn
# around one prop by hand, and GrabCut finds the prop's exact outline inside it.
# Needs OpenCV (pip install opencv-python-headless). Run: python3 scripts/fabric-props.py
import json
import os
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_DIR = os.path.join(ROOT, "public/img/fabric-props")
DATA = os.path.join(ROOT, "src/data/fabrics.json")

BOXES = {
    "1682": [[0.29, 0.35, 0.64, 1.0]],
    "1897": [[0.62, 0.12, 0.97, 1.0]],
    "1686": [[0.6, 0.42, 1.0, 1.0], [0.68, 0.0, 0.92, 0.62]],
    "1861": [[0.44, 0.4, 0.92, 1.0]],
    "1856": [[0.32, 0.45, 0.72, 1.0]],
    "1702": [[0.38, 0.05, 0.97, 0.95]],
    "1838": [[0.35, 0.42, 0.8, 1.0]],
    "1873": [[0.29, 0.15, 0.72, 1.0]],
    "1865": [[0.0, 0.3, 0.46, 1.0]],
    "2065": [[0.72, 0.2, 0.98, 0.95]],
    "1887": [[0.12, 0.25, 0.57, 1.0]],
    "1908": [[0.52, 0.42, 0.98, 1.0]],
    "1923": [[0.06, 0.35, 0.5, 0.95]],
    "1935": [[0.27, 0.3, 0.78, 1.0]],
    "1938": [[0.04, 0.5, 0.3, 0.97]],
    "1672": [[0.44, 0.38, 0.85, 1.0]],
    "1876": [[0.18, 0.2, 0.62, 1.0]],
    "1870": [[0.0, 0.3, 0.4, 1.0]],
    "1890": [[0.22, 0.48, 0.88, 1.0]],
    "1674": [[0.0, 0.25, 0.1, 0.7], [0.68, 0.35, 1.0, 0.8]],
    "1893": [[0.18, 0.33, 0.72, 1.0]],
    "1895": [[0.15, 0.25, 0.68, 1.0]],
    "1903": [[0.37, 0.35, 1.0, 1.0]],
    "1943": [[0.0, 0.5, 0.66, 1.0]],
    "1948": [[0.0, 0.38, 0.57, 1.0]],
    "1929": [[0.29, 0.3, 0.73, 1.0]],
    "1965": [[0.0, 0.0, 0.15, 0.7]],
    "1961": [[0.42, 0.0, 0.57, 0.75]],
    "1932": [[0.42, 0.6, 0.56, 0.95]],
    "1884": [[0.43, 0.7, 0.62, 1.0]],
    "1850": [[0.12, 0.0, 0.88, 0.45]],
}


def prop_mask(path, boxes):
    """White where a prop is, black elsewhere, at the cut-out's own size."""
    rgba = np.asarray(Image.open(path).convert("RGBA"))
    image = np.ascontiguousarray(rgba[:, :, 2::-1])
    height, width = rgba.shape[:2]
    props = np.zeros((height, width), bool)
    for x0, y0, x1, y1 in boxes:
        marks = np.zeros((height, width), np.uint8)
        rect = (int(x0 * width), int(y0 * height), int((x1 - x0) * width), int((y1 - y0) * height))
        cv2.grabCut(image, marks, rect, np.zeros((1, 65)), np.zeros((1, 65)), 6, cv2.GC_INIT_WITH_RECT)
        props |= (marks == cv2.GC_FGD) | (marks == cv2.GC_PR_FGD)
    return props & (rgba[:, :, 3] > 0)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for product, boxes in BOXES.items():
        props = prop_mask(os.path.join(ROOT, f"public/img/cut/c{product}.webp"), boxes)
        Image.fromarray(props.astype(np.uint8) * 255).convert("1").save(os.path.join(OUT_DIR, f"p{product}.png"), optimize=True)
    # The preview only asks for masks that exist.
    data = json.load(open(DATA))
    data["props"] = sorted(BOXES)
    with open(DATA, "w") as out:
        json.dump(data, out, ensure_ascii=False, indent=1)
    print(len(BOXES), "prop masks")


if __name__ == "__main__":
    main()
