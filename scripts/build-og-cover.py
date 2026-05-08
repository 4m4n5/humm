"""Build a 1200x630 OG cover for WhatsApp/Instagram link previews.

Composes a dark background with the app halo, the home screenshot
on the right, and the tagline on the left. Output: docs/store/images/og-cover.png

Run: python3 scripts/build-og-cover.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/store/images/og-cover.png"
SCREENSHOT = ROOT / "docs/store/images/marketing/01-home.png"

W, H = 1200, 630
BG = (15, 14, 20)        # #0F0E14
PRIMARY = (232, 160, 154)  # #E8A09A
TEXT = (250, 247, 244)
MUTED = (173, 167, 179)
DIM = (118, 112, 137)


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    """Try a series of system fonts; fall back to default bitmap."""
    candidates = [
        f"/System/Library/Fonts/{name}",
        f"/System/Library/Fonts/Supplemental/{name}",
        f"/Library/Fonts/{name}",
        name,
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def main() -> None:
    if not SCREENSHOT.exists():
        sys.exit(f"missing screenshot: {SCREENSHOT}")

    canvas = Image.new("RGB", (W, H), BG)

    # Soft radial halo (mendl pink) at top-left
    halo = Image.new("RGB", (W, H), BG)
    halo_draw = ImageDraw.Draw(halo, "RGB")
    cx, cy, max_r = 240, -60, 720
    for i in range(60, 0, -1):
        r = int((i / 60) * max_r)
        alpha = (i / 60) ** 2 * 0.32
        color = tuple(
            int(BG[c] * (1 - alpha) + PRIMARY[c] * alpha) for c in range(3)
        )
        halo_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    halo = halo.filter(ImageFilter.GaussianBlur(60))
    canvas.paste(halo, (0, 0))

    # Secondary halo behind the phone (right side)
    halo2 = Image.new("RGB", (W, H), BG)
    halo2_draw = ImageDraw.Draw(halo2, "RGB")
    cx2, cy2, max_r2 = 940, 320, 600
    for i in range(60, 0, -1):
        r = int((i / 60) * max_r2)
        alpha = (i / 60) ** 2 * 0.22
        color = tuple(
            int(BG[c] * (1 - alpha) + PRIMARY[c] * alpha) for c in range(3)
        )
        halo2_draw.ellipse(
            [cx2 - r, cy2 - r, cx2 + r, cy2 + r], fill=color
        )
    halo2 = halo2.filter(ImageFilter.GaussianBlur(40))
    canvas.paste(
        Image.blend(canvas, halo2, 0.55), (0, 0)
    )

    # Phone — load screenshot, scale to fit, add bezel + rounded corners
    shot = Image.open(SCREENSHOT).convert("RGBA")
    target_h = 540
    scale = target_h / shot.height
    target_w = int(shot.width * scale)
    shot = shot.resize((target_w, target_h), Image.LANCZOS)

    radius = int(target_w * 0.12)
    bezel = 10
    phone_w, phone_h = target_w + bezel * 2, target_h + bezel * 2

    # Rounded mask for screenshot
    mask = Image.new("L", (target_w, target_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, target_w, target_h], radius=radius - bezel, fill=255
    )
    shot.putalpha(mask)

    # Phone bezel: dark gradient rounded box
    phone = Image.new("RGBA", (phone_w, phone_h), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(phone)
    pdraw.rounded_rectangle(
        [0, 0, phone_w, phone_h], radius=radius, fill=(26, 23, 34, 255)
    )

    # Drop shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    px, py = W - phone_w - 70, (H - phone_h) // 2
    sdraw.rounded_rectangle(
        [px - 8, py + 14, px + phone_w + 8, py + phone_h + 30],
        radius=radius,
        fill=(0, 0, 0, 200),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow)

    canvas.alpha_composite(phone, (px, py))
    canvas.alpha_composite(shot, (px + bezel, py + bezel))

    # Text — left column
    draw = ImageDraw.Draw(canvas)
    f_eyebrow = load_font("HelveticaNeue.ttc", 18)
    f_h1 = load_font("HelveticaNeue.ttc", 76)
    f_sub = load_font("HelveticaNeue.ttc", 26)
    f_meta = load_font("HelveticaNeue.ttc", 18)

    text_x = 70
    draw.text((text_x, 90), "HUM  ·  RITUALS", font=f_eyebrow, fill=DIM)

    h1_lines = ["your relationship's", "private corner"]
    y = 134
    for i, line in enumerate(h1_lines):
        fill = PRIMARY if i == 1 else TEXT
        draw.text((text_x, y), line, font=f_h1, fill=fill)
        y += 86

    sub_lines = [
        "a calm, intimate space for two —",
        "share moods, build habits,",
        "decide together, trade reasons.",
    ]
    y = 350
    for line in sub_lines:
        draw.text((text_x, y), line, font=f_sub, fill=MUTED)
        y += 36

    draw.text(
        (text_x, H - 60),
        "·  invite-only   ·  no public feed   ·  no ads",
        font=f_meta,
        fill=DIM,
    )

    # Save (PNG, optimized; OG limit ~300KB)
    canvas.convert("RGB").save(OUT, "PNG", optimize=True)
    size_kb = OUT.stat().st_size / 1024
    print(f"wrote {OUT.relative_to(ROOT)} ({size_kb:.0f} KB, {W}x{H})")


if __name__ == "__main__":
    main()
