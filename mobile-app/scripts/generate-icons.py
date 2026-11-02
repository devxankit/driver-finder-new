"""
Generate every launcher icon and the in-app logo from the one brand source.

    python scripts/generate-icons.py

Source: assets/brand/logo-full.png (the client's round emblem on white).

Outputs
  android/app/src/main/res/mipmap-*/ic_launcher.png             legacy rounded square
  android/app/src/main/res/mipmap-*/ic_launcher_round.png       legacy round
  android/app/src/main/res/mipmap-*/ic_launcher_foreground.png  adaptive foreground (API 26+)
  android/app/src/main/res/mipmap-anydpi-v26/ic_launcher(_round).xml
  assets/brand/playstore-icon-512.png                           Play Store icon
  src/assets/images/logo-mark.png                               emblem for splash and headers

An adaptive icon only guarantees the central 66dp circle of its 108dp canvas,
so the emblem is scaled to 64% of the canvas there.
"""

import os
from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'brand', 'logo-full.png')
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def load_mark():
    im = Image.open(SRC).convert('RGB')
    diff = ImageChops.difference(im, Image.new('RGB', im.size, 'white')).convert('L')
    mark = im.crop(diff.point(lambda p: 255 if p > 18 else 0).getbbox())
    side = max(mark.size)
    square = Image.new('RGB', (side, side), 'white')
    square.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2))
    return square


def tile(mark, size, scale, shape=None):
    base = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    m = mark.resize((int(size * scale),) * 2, Image.LANCZOS).convert('RGBA')
    base.paste(m, ((size - m.width) // 2, (size - m.height) // 2))
    if not shape:
        return base
    big = size * 4
    mask = Image.new('L', (big, big), 0)
    d = ImageDraw.Draw(mask)
    if shape == 'circle':
        d.ellipse((0, 0, big - 1, big - 1), fill=255)
    else:
        d.rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * 0.22), fill=255)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask.resize((size, size), Image.LANCZOS))
    return out


def main():
    mark = load_mark()
    for name, k in DENSITIES.items():
        d = os.path.join(RES, 'mipmap-' + name)
        os.makedirs(d, exist_ok=True)
        tile(mark, int(48 * k), 0.86, 'rounded').save(os.path.join(d, 'ic_launcher.png'))
        tile(mark, int(48 * k), 0.86, 'circle').save(os.path.join(d, 'ic_launcher_round.png'))
        tile(mark, int(108 * k), 0.64).save(os.path.join(d, 'ic_launcher_foreground.png'))
    any_dir = os.path.join(RES, 'mipmap-anydpi-v26')
    os.makedirs(any_dir, exist_ok=True)
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
           '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           '    <background android:drawable="@color/ic_launcher_background"/>\n'
           '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
           '</adaptive-icon>\n')
    for n in ('ic_launcher.xml', 'ic_launcher_round.xml'):
        open(os.path.join(any_dir, n), 'w').write(xml)
    tile(mark, 512, 0.86).convert('RGB').save(os.path.join(ROOT, 'assets', 'brand', 'playstore-icon-512.png'))
    mark.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'src', 'assets', 'images', 'logo-mark.png'))
    print('icons written')


if __name__ == '__main__':
    main()
