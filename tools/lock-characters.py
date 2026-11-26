#!/usr/bin/env python3
"""Hide characters that are not introduced yet ("locked", like in a video game).

For every id listed in LOCKED this script
  * paints the character black in the group picture
    (images/gruppenbild.webp  ->  images/gruppenbild-geheim.webp)
  * makes a black silhouette of its card picture
    (images/<id>.webp  ->  images/<id>-geheim.webp)

To unlock a character: remove its id from LOCKED, run the script again, and set
"locked: false" for it in js/katalog.js. When LOCKED is empty, point the header
picture in index.html back to images/gruppenbild.webp.

Needs Pillow, numpy and scipy:  python3 tools/lock-characters.py
"""
import base64, io, os, re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage as ndi

LOCKED = ["chunky-monkey", "sunday-in-sicily"]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DARK = (30, 15, 9)          # silhouette colour: almost black, a touch of chocolate
MARK = (255, 246, 225)      # the question mark

# Outlines traced by hand on images/gruppenbild.webp (1670 x 942).
#   poly   the figure            holes  see-through gaps inside it
#   snap   True = the tracing runs just outside the drawn outline and is pulled in to it
#   mark   where the question mark sits: (x, y, height)
SCENE = {
    "chunky-monkey": {
        "poly": [(458,60),(462,48),(475,35),(491,27),(511,21),(526,20),(536,25),(540,37),(537,46),(545,55),(552,66),(560,72),(566,82),(574,92),(582,101),(588,108),(596,107),(592,99),(596,89),(602,79),(604,71),(607,62),(610,52),(612,42),(612,25),(619,11),(631,3),(648,0),(665,2),(681,12),(691,25),(694,36),(689,44),(682,52),(673,58),(664,68),(661,80),(652,89),(647,99),(646,109),(652,119),(657,127),(666,142),(671,156),(676,166),(682,179),(687,192),(700,205),(709,222),(711,243),(714,260),(716,273),(717,283),(721,296),(724,302),(733,304),(752,301),(765,308),(767,319),(760,330),(742,336),(739,340),(741,348),(733,358),(718,361),(708,356),(699,352),(687,352),(677,346),(674,340),(657,344),(627,347),(623,350),(624,361),(616,373),(602,377),(590,373),(586,366),(577,371),(565,368),(555,360),(553,350),(556,347),(542,346),(529,338),(523,327),(528,318),(535,315),(533,301),(534,293),(530,291),(522,285),(512,273),(505,259),(503,243),(506,228),(513,216),(518,205),(516,193),(518,180),(520,172),(521,160),(523,150),(527,139),(538,133),(529,123),(521,113),(516,106),(508,101),(500,97),(493,93),(479,91),(465,81),(458,71),(455,62)],
        "holes": [[(590,279),(648,275),(664,284),(667,300),(670,311),(668,314),(606,318),(592,303),(588,285)]],
        "snap": True,
        "mark": (612, 218, 96),
    },
    "sunday-in-sicily": {
        "poly": [(1298,375),(1320,372),(1340,377),(1350,385),(1367,378),(1387,385),(1397,395),(1403,407),(1415,418),(1422,437),(1423,453),(1420,470),(1412,487),(1403,498),(1395,507),(1402,515),(1403,531),(1352,529),(1350,545),(1352,560),(1353,573),(1352,590),(1347,602),(1337,605),(1327,615),(1313,622),(1297,620),(1277,612),(1263,607),(1250,612),(1240,623),(1233,640),(1227,660),(1220,673),(1223,678),(1227,690),(1225,703),(1210,712),(1187,718),(1163,717),(1157,710),(1158,700),(1170,687),(1187,673),(1198,668),(1193,660),(1196,646),(1177,649),(1153,651),(1133,646),(1127,637),(1132,627),(1147,621),(1163,614),(1175,605),(1183,595),(1195,580),(1203,567),(1213,555),(1222,543),(1219,533),(1219,520),(1223,512),(1232,510),(1232,498),(1237,492),(1253,488),(1268,492),(1268,477),(1265,460),(1268,443),(1275,427),(1283,410),(1293,397)],
        "holes": [[(1353,531),(1430,531),(1430,559),(1353,559)]],   # the biscuit Biscoff Break holds in front of him
        "snap": False,
        "mark": (1345, 446, 92),
    },
}


def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


def display_font(size):
    """The site's headline font, taken out of css/fonts.css."""
    css = open(os.path.join(ROOT, "css", "fonts.css"), encoding="utf-8").read()
    m = re.search(r"Bagel Fat One.*?base64,([A-Za-z0-9+/=]+)", css, re.S)
    try:
        return ImageFont.truetype(io.BytesIO(base64.b64decode(m.group(1))), size)
    except Exception:
        return ImageFont.load_default()


def figure_mask(lum, spec):
    h, w = lum.shape

    def area(points):
        m = Image.new("L", (w, h), 0)
        ImageDraw.Draw(m).polygon(points, fill=255)
        return np.asarray(m) > 0

    gaps = np.zeros((h, w), bool)
    for hole in spec["holes"]:
        gaps |= area(hole)
    inside = ndi.binary_dilation(area(spec["poly"]), structure=disk(2 if spec["snap"] else 3)) & ~gaps
    if spec["snap"]:
        # everything light that can be reached from the tracing's edge is background
        free = inside & (lum >= 95)
        lab, _ = ndi.label(free)
        edge = inside & ~ndi.binary_erosion(inside, iterations=2)
        ids = set(np.unique(lab[edge]).tolist())
        ids.discard(0)
        fg = inside & ~np.isin(lab, list(ids))
        fg |= ndi.binary_erosion(inside, iterations=5)      # the tracing is trusted this far in
        fg = ndi.binary_opening(fg, structure=disk(2))
    else:
        fg = inside
    lab, _ = ndi.label(fg)
    count = np.bincount(lab.ravel())
    count[0] = 0
    fg = lab == count.argmax()
    fg = ndi.binary_closing(fg, structure=disk(2)) & ~gaps
    return ndi.gaussian_filter(fg.astype(np.float32), 0.8)


def question_mark(img, x, y, height):
    font = display_font(height)
    d = ImageDraw.Draw(img)
    box = d.textbbox((0, 0), "?", font=font)
    d.text((x - (box[0] + box[2]) / 2, y - (box[1] + box[3]) / 2), "?", font=font, fill=MARK)


def lock_scene():
    src = Image.open(os.path.join(ROOT, "images", "gruppenbild.webp")).convert("RGB")
    a = np.asarray(src).astype(np.float32)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    out = a.copy()
    for cid in LOCKED:
        alpha = figure_mask(lum, SCENE[cid])[..., None]
        out = out * (1 - alpha) + np.array(DARK, np.float32) * alpha
    img = Image.fromarray(out.clip(0, 255).astype(np.uint8))
    for cid in LOCKED:
        question_mark(img, *SCENE[cid]["mark"])
    img.save(os.path.join(ROOT, "images", "gruppenbild-geheim.webp"), quality=88, method=6)
    print("images/gruppenbild-geheim.webp", img.size)


def lock_cards():
    for cid in LOCKED:
        pic = Image.open(os.path.join(ROOT, "images", cid + ".webp")).convert("RGBA")
        alpha = pic.getchannel("A")
        shade = Image.new("RGBA", pic.size, DARK + (255,))
        shade.putalpha(alpha)
        ys, xs = np.where(np.asarray(alpha) > 40)
        question_mark(shade, (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2 - pic.height * 0.04, int(pic.height * 0.34))
        shade.save(os.path.join(ROOT, "images", cid + "-geheim.webp"), quality=90, method=6)
        print("images/%s-geheim.webp" % cid, shade.size)


if __name__ == "__main__":
    if LOCKED:
        lock_scene()
        lock_cards()
    else:
        print("Nothing is locked: use images/gruppenbild.webp in index.html.")
