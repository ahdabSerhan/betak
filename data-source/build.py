"""Turns the crawl notes into the site's galleries.json and reviews.json."""
import json
import pathlib
import sys

crawl = pathlib.Path(__file__).parent
data = pathlib.Path(sys.argv[1])

galleries = {}
for line in (crawl / "galleries.txt").read_text(encoding="utf-8").splitlines():
    if not line.strip() or line.startswith("#"):
        continue
    product, ids = line.split(":")
    # The first id is the main photo, which the site already has.
    extra = [int(i) for i in ids.split(",") if int(i) != int(product)]
    if extra:
        galleries[product.strip()] = extra

reviews = {}
for line in (crawl / "reviews.txt").read_text(encoding="utf-8").splitlines():
    if not line.strip() or line.startswith("#"):
        continue
    product, name, text = line.split("|", 2)
    reviews.setdefault(product, []).append({"name": name, "text": text})

(data / "galleries.json").write_text(json.dumps(galleries, ensure_ascii=False, indent=1), encoding="utf-8")
(data / "reviews.json").write_text(json.dumps(reviews, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(galleries), "galleries,", sum(map(len, reviews.values())), "reviews on", len(reviews), "products")
