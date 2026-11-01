"""Baut die goldenen Muskel-Overlays (m-<seite>-<gruppe>.webp) sauber neu.

Schritt 1 (--masks): aus den bisherigen Overlays saubere Binärmasken machen
  (Streuflecken weg, Löcher zu, Kanten glätten) -> tools/masks/*.png
Schritt 2 (Standard): aus tools/masks + body-*.jpg die Overlays rendern.
  Gold kommt aus der Helligkeit der weissen Figur, damit Licht und Schatten
  exakt passen. Alpha wird an der Körpersilhouette abgeschnitten.
Schritt 0 (--base): Figur body-*.jpg aus tools/src retuschieren
  (Splitter am Nacken, fleckige Glanzlichter an Brust/Gesaess, Zacken im Schritt).
Aufruf aus dem Repo-Ordner: python3 tools/build_overlays.py [--base] [--masks]
"""
import sys, glob, os
import numpy as np
import cv2
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASKS = os.path.join(ROOT, 'tools', 'masks')
# Anzahl erwarteter Teile je Gruppe (links/rechts)
PARTS = {'front-waden': 4}


def lum(side):
    return np.array(Image.open(os.path.join(ROOT, f'body-{side}.jpg')).convert('L')).astype(np.float32)


def silhouette(side):
    b = lum(side)
    hard = (b > 45).astype(np.uint8)
    hard = cv2.erode(hard, np.ones((3, 3), np.uint8))  # 1 px innen bleiben
    soft = np.clip((b - 40) / 60, 0, 1)
    return hard, soft


def disk(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def clean_mask(m, keep):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    order = sorted(range(1, n), key=lambda i: -st[i, cv2.CC_STAT_AREA])
    out = np.zeros_like(m)
    for i in order[:keep]:
        if st[i, cv2.CC_STAT_AREA] > 800:
            part = (lab == i).astype(np.uint8)
            # Loecher fuellen
            cnts, _ = cv2.findContours(part, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            cv2.drawContours(part, cnts, -1, 1, -1)
            # Zacken und Nasen weg, dann Kerben zu
            part = cv2.morphologyEx(part, cv2.MORPH_OPEN, disk(4))
            part = cv2.morphologyEx(part, cv2.MORPH_CLOSE, disk(4))
            out |= part
    return out


def make_masks():
    os.makedirs(MASKS, exist_ok=True)
    out = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'm-*.webp'))):
        key = os.path.basename(f)[2:-5]
        side = key.split('-')[0]
        a = np.array(Image.open(f))[:, :, 3]
        m = (a > 127).astype(np.uint8)
        m = clean_mask(m, PARTS.get(key, 2))
        m &= silhouette(side)[0]
        out.setdefault(side, {})[key] = m
    for side, masks in out.items():
        fill_holes_between(masks, side)
        for key, m in masks.items():
            Image.fromarray(m * 255).save(os.path.join(MASKS, key + '.png'))
            print('Maske', key, int(m.sum()))


# Goldverlauf nach Helligkeit der Figur (Schatten angehoben, damit keine braunen Raender)
STOPS = [(0.00, (112, 70, 16)), (0.25, (150, 100, 28)), (0.50, (193, 139, 50)),
         (0.72, (228, 180, 88)), (0.88, (247, 218, 146)), (1.00, (255, 244, 214))]


def gold(b):
    t = np.clip((b - 125) / 130, 0, 1) ** 1.35
    out = np.zeros(b.shape + (3,), np.float32)
    xs = [s[0] for s in STOPS]
    for c in range(3):
        out[..., c] = np.interp(t, xs, [s[1][c] for s in STOPS])
    return out


def smooth_region(img, mask, erode=6):
    """Fleckige Glanzlichter in einer Muskelflaeche weich machen."""
    inner = cv2.erode(mask, disk(erode)).astype(np.float32)
    w = cv2.GaussianBlur(inner, (0, 0), 3)[..., None]
    sm = cv2.medianBlur(img, 9)
    sm = cv2.GaussianBlur(sm, (0, 0), 2.2)
    return (img * (1 - w) + sm * w).round().astype(np.uint8)


def fill_holes_between(masks, side):
    """Weisse Inseln, die rundum von Gold umschlossen sind, der Nachbargruppe geben."""
    union = np.zeros_like(next(iter(masks.values())))
    for m in masks.values():
        union |= m
    sil = silhouette(side)[0]
    holes = (sil & (1 - union)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(holes, 4)
    for i in range(1, n):
        h = (lab == i).astype(np.uint8)
        area = st[i, cv2.CC_STAT_AREA]
        if area < 150 or area > 4000:
            continue
        ring = cv2.dilate(h, disk(2)) & (1 - h)
        if (ring & (1 - union)).sum() > 0.2 * ring.sum():
            continue  # nicht umschlossen (offene Naht)
        if cv2.distanceTransform(h, cv2.DIST_L2, 3).max() < 3:
            continue  # duenne Naht bleibt weiss
        best = max(masks, key=lambda k: (ring & masks[k]).sum())
        masks[best] |= h
        print('Luecke', area, 'px ->', best)


def fix_base():
    for side in ('front', 'back'):
        img = cv2.imread(os.path.join(ROOT, 'tools', 'src', f'body-{side}.jpg'))
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        for f in glob.glob(os.path.join(MASKS, f'{side}-*.png')):
            key = os.path.basename(f)[:-4]
            if key in ('front-brust', 'back-gesaess'):
                m = (cv2.imread(f, 0) > 127).astype(np.uint8)
                img = smooth_region(img, m)
        bad = np.zeros(g.shape, np.uint8)
        core = np.zeros(g.shape, np.uint8)
        if side == 'back':
            # grauer Splitter am Nacken
            box = np.zeros_like(bad); box[140:168, 234:258] = 1
            bad |= ((g < 215) & (box > 0)).astype(np.uint8)
            # Zacken am Schritt: dunkle Spitzen, die nicht zur Beinluecke gehoeren
            dark = (g < 90).astype(np.uint8)
            roi = np.zeros_like(bad); roi[525:580, 205:320] = 1
            core = cv2.morphologyEx(dark, cv2.MORPH_OPEN, disk(3))
            spikes = dark & (1 - core) & roi
            # feine dunkle Kratzer neben der Gesaessfalte
            med = cv2.medianBlur(g, 9).astype(int)
            scratch = ((med - g.astype(int)) > 22) & (g > 90).astype(np.uint8) & roi
            bad |= spikes | scratch
        bad = cv2.dilate(bad, disk(1))
        if bad.any():
            img = cv2.inpaint(img, bad, 4, cv2.INPAINT_TELEA)
            # Retuschierte Stellen weich in die Umgebung blenden
            w = cv2.GaussianBlur(cv2.dilate(bad, disk(4)).astype(np.float32), (0, 0), 2.5)
            w = (w * (1 - cv2.dilate(core, disk(2)))).astype(np.float32)[..., None]
            img = (img * (1 - w) + cv2.GaussianBlur(img, (0, 0), 2.5) * w).round().astype(np.uint8)
        cv2.imwrite(os.path.join(ROOT, f'body-{side}.jpg'), img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        print('Figur', side, 'retuschiert,', int(bad.sum()), 'px')


def render():
    for f in sorted(glob.glob(os.path.join(MASKS, '*.png'))):
        key = os.path.basename(f)[:-4]
        side = key.split('-')[0]
        m = np.array(Image.open(f).convert('L')).astype(np.float32) / 255
        # weiche Kante: 1.5 px Uebergang
        a = cv2.GaussianBlur(m, (0, 0), 0.9)
        a = np.clip((a - 0.5) * 1.6 + 0.5, 0, 1) * silhouette(side)[1]
        rgb = gold(cv2.GaussianBlur(lum(side), (0, 0), 0.6))
        out = np.dstack([rgb, a * 255]).round().astype(np.uint8)
        Image.fromarray(out, 'RGBA').save(os.path.join(ROOT, f'm-{key}.webp'), quality=90, method=6)
        print('Overlay', key)


if __name__ == '__main__':
    if '--masks' in sys.argv:
        make_masks()
    if '--base' in sys.argv:
        fix_base()
    render()
