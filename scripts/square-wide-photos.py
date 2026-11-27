# Makes wide (16:9) product photos square for the product cards: the whole photo sits in the middle,
# over a blurred, enlarged copy of itself, so nothing is cut off. Run once per photo; it skips square ones.
# Usage: python3 scripts/square-wide-photos.py public/img/p555.webp [...]
import sys
from PIL import Image, ImageEnhance, ImageFilter

SIZE = 640

for path in sys.argv[1:]:
    photo = Image.open(path).convert("RGB")
    if photo.width == photo.height:
        continue
    # The background: the photo enlarged to fill the square, blurred and a little darker.
    scale = SIZE / min(photo.size)
    back = photo.resize((round(photo.width * scale), round(photo.height * scale)), Image.LANCZOS)
    left, top = (back.width - SIZE) // 2, (back.height - SIZE) // 2
    back = back.crop((left, top, left + SIZE, top + SIZE)).filter(ImageFilter.GaussianBlur(28))
    back = ImageEnhance.Brightness(back).enhance(0.85)
    # The whole photo, as wide as the square, in the middle.
    fit = SIZE / max(photo.size)
    front = photo.resize((round(photo.width * fit), round(photo.height * fit)), Image.LANCZOS)
    back.paste(front, ((SIZE - front.width) // 2, (SIZE - front.height) // 2))
    back.save(path, "WEBP", quality=86)
    print(path, photo.size, "->", back.size)
