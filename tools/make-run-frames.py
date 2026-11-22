#!/usr/bin/env python3
"""Draws the running pictures in images/run/.

Each cookie gets six small drawings that show it from behind, in the
middle of a running step. Played one after the other they look like
running. The page uses them when a cookie runs into the cart.

Run it from the main folder:   python3 tools/make-run-frames.py
(It only needs Python, nothing else.)
"""
import math
import os

FRAMES = 6
LINE = "#3A1D12"          # outline colour of the drawings
VIEW = "0 0 200 230"


def lumpy(cx, cy, r, seed, n=16, amp=2.6):
    """A circle with a slightly uneven, baked edge."""
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r + amp * math.sin(seed + i * 2.4) + amp * 0.6 * math.sin(seed * 1.7 + i * 5.1)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    mids = [((pts[i][0] + pts[(i + 1) % n][0]) / 2, (pts[i][1] + pts[(i + 1) % n][1]) / 2) for i in range(n)]
    d = "M%.1f %.1f" % mids[-1]
    for i in range(n):
        d += " Q%.1f %.1f %.1f %.1f" % (pts[i] + mids[i])
    return d + "Z"


def limb(p0, p1, p2, colour, w):
    d = "M%.1f %.1f Q%.1f %.1f %.1f %.1f" % (p0 + p1 + p2)
    return ('<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" stroke-linecap="round"/>' % (d, LINE, w + 7) +
            '<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" stroke-linecap="round"/>' % (d, colour, w))


def leg(side, lift, c):
    """side -1 = left, 1 = right. lift 0 = foot on the ground, 1 = kicked up behind."""
    hx, hy = 100 + side * c["hip_dx"], c["hip_y"]
    fx, fy = hx + side * (3 + 3 * lift), c["ground"] - c["lift"] * lift
    knee = ((hx + fx) / 2 + side * (3 + 10 * lift), (hy + fy) / 2 + 5 * lift)
    out = limb((hx, hy), knee, (fx, fy - 6), c["leg"], c["leg_w"])
    if lift < 0.3:      # heel, seen from behind
        out += '<rect x="%.1f" y="%.1f" width="27" height="17" rx="8" fill="%s" stroke="%s" stroke-width="4"/>' % (fx - 13.5, fy - 10, c["shoe"], LINE)
        if c.get("sneaker"):
            out += '<path d="M%.1f %.1f h19" stroke="%s" stroke-width="3.5" stroke-linecap="round"/>' % (fx - 9.5, fy + 3.5, c["sole"])
    else:               # the sole shows when the foot kicks up
        ry = 9 + 6 * lift
        out += '<ellipse cx="%.1f" cy="%.1f" rx="12.5" ry="%.1f" fill="%s" stroke="%s" stroke-width="4"/>' % (fx, fy, ry, c["sole"], LINE)
        out += '<path d="M%.1f %.1f h11 M%.1f %.1f h11" stroke="%s" stroke-width="2" stroke-linecap="round" opacity="0.45"/>' % (
            fx - 5.5, fy - ry * 0.3, fx - 5.5, fy + ry * 0.3, LINE)
    return out


def arm(side, swing, c):
    """swing 1 = elbow back and hand up, -1 = arm reaching down in front."""
    sx, sy = 100 + side * c["sh_dx"], c["sh_y"]
    reach = c.get("reach", 1.0)
    elbow = (sx + side * 30 * reach, sy + 26 * reach + 2 * swing)
    hand = (sx + side * (19 + 8 * swing) * reach, sy + (16 - 30 * swing) * reach)
    out = limb((sx, sy), elbow, hand, c["arm"], c["arm_w"])
    extra = c.get("hold", {}).get(side)
    if extra:
        out += extra(hand[0], hand[1])
    out += '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" stroke="%s" stroke-width="4"/>' % (hand[0], hand[1], c.get("hand_r", 9), c["hand"], LINE)
    return out


def chip(x, y, r, rot, colour="#5B2E1B", shine="#7D4A2E"):
    return ('<g transform="rotate(%d %.1f %.1f)"><ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" stroke="%s" stroke-width="2.5"/>'
            '<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s"/></g>') % (
        rot, x, y, x, y, r, r * 0.78, colour, LINE, x - r * 0.25, y - r * 0.25, r * 0.4, r * 0.25, shine)


def chunk(x, y, s, rot, colour="#6A3A22"):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="3" transform="rotate(%d %.1f %.1f)" fill="%s" stroke="%s" stroke-width="2.5"/>' % (
        x - s / 2, y - s * 0.42, s, s * 0.84, rot, x, y, colour, LINE)


def splat(x, y, r, colour):
    return ('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/><circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/><circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>') % (
        x, y, r, colour, x + r * 1.1, y - r * 0.7, r * 0.45, colour, x - r * 0.9, y + r * 0.9, r * 0.35, colour)


# ---------------------------------------------------------------- the characters

def golden_body():
    d = lumpy(100, 96, 62, 1.0)
    out = '<path d="%s" fill="#DFA043" stroke="%s" stroke-width="5"/>' % (d, LINE)
    out += '<ellipse cx="116" cy="72" rx="34" ry="24" fill="#EBB65C" opacity="0.6"/>'
    out += '<path d="M52 118 Q70 150 108 152" fill="none" stroke="#C4832E" stroke-width="5" stroke-linecap="round" opacity="0.7"/>'
    for x, y, r, rot in [(70, 62, 8, -20), (112, 48, 7, 30), (141, 82, 8, 60), (128, 124, 9, -30), (84, 126, 8, 15), (58, 98, 7, 70), (101, 90, 6, 0)]:
        out += chip(x, y, r, rot)
    for x, y in [(88, 70), (124, 100), (72, 112), (108, 132), (134, 60)]:
        out += '<circle cx="%d" cy="%d" r="2.2" fill="#B9772A"/>' % (x, y)
    return out


def biscoff_body():
    d = lumpy(100, 96, 62, 2.3)
    out = '<path d="%s" fill="#D28C45" stroke="%s" stroke-width="5"/>' % (d, LINE)
    out += '<ellipse cx="88" cy="70" rx="32" ry="22" fill="#E0A45C" opacity="0.6"/>'
    out += '<path d="M134 56 q14 18 5 36 q-7 14 5 28" fill="none" stroke="#B56F2B" stroke-width="9" stroke-linecap="round"/>'
    for x, y, s, rot in [(72, 58, 17, -25), (108, 50, 15, 20), (62, 100, 16, 35), (104, 104, 17, -10), (84, 136, 15, 15), (122, 136, 14, -35)]:
        out += chunk(x, y, s, rot)
    for x, y in [(90, 82), (126, 84), (76, 120), (112, 74)]:
        out += '<circle cx="%d" cy="%d" r="2.2" fill="#A9682A"/>' % (x, y)
    return out


def mug(x, y):
    return ('<rect x="%.1f" y="%.1f" width="25" height="24" rx="5" fill="#6F9CC0" stroke="%s" stroke-width="4"/>'
            '<path d="M%.1f %.1f h15" stroke="#4E7A9E" stroke-width="3" stroke-linecap="round"/>') % (x - 6, y - 19, LINE, x + 1.5, y - 13)


def vinci_body():
    out = '<path d="M70 124 Q100 116 130 124 L137 170 Q100 178 63 170 Z" fill="#5F86A0" stroke="%s" stroke-width="5" stroke-linejoin="round"/>' % LINE
    out += '<path d="M73 138 Q100 147 127 138 M100 143 V173" fill="none" stroke="#47677E" stroke-width="2.5" stroke-linecap="round"/>'
    out += splat(84, 156, 4.5, "#EE5C8F") + splat(117, 160, 4, "#7BC043") + splat(110, 150, 2.6, "#F2B632")
    out += '<path d="%s" fill="#C98B4D" stroke="%s" stroke-width="5"/>' % (lumpy(100, 76, 50, 0.6, amp=1.8), LINE)
    # paint-drip hair below the cap
    out += '<path d="M50 80 V104 q6 13 12 1 q7 16 13 2 q6 12 12 0 q6 10 13 1 V80 Z" fill="#F27DA6" stroke="%s" stroke-width="4" stroke-linejoin="round"/>' % LINE
    out += '<path d="M100 80 V108 q7 14 13 0 q6 13 13 1 q6 13 12 -2 q6 9 12 -5 V80 Z" fill="#7BC043" stroke="%s" stroke-width="4" stroke-linejoin="round"/>' % LINE
    # cap
    out += '<path d="M47 82 Q42 30 100 23 Q158 30 153 82 Z" fill="#8C8440" stroke="%s" stroke-width="5" stroke-linejoin="round"/>' % LINE
    out += splat(121, 47, 6, "#EE5C8F") + splat(82, 42, 5, "#F2B632") + splat(138, 60, 4, "#D6402F") + splat(68, 58, 4, "#4FA6A0")
    out += '<rect x="43" y="68" width="114" height="23" rx="10" fill="#7A7336" stroke="%s" stroke-width="5"/>' % LINE
    out += '<path d="%s" stroke="#5A5426" stroke-width="2.5" stroke-linecap="round"/>' % " ".join("M%d 74 V85" % x for x in range(58, 143, 14))
    return out


def brush(x, y):
    return ('<path d="M%.1f %.1f L%.1f %.1f" stroke="%s" stroke-width="8" stroke-linecap="round"/>'
            '<path d="M%.1f %.1f L%.1f %.1f" stroke="#9A6532" stroke-width="3.5" stroke-linecap="round"/>'
            '<ellipse cx="%.1f" cy="%.1f" rx="4.5" ry="7.5" transform="rotate(-18 %.1f %.1f)" fill="#EE5C8F" stroke="%s" stroke-width="2.5"/>') % (
        x + 5, y + 10, x - 8, y - 26, LINE, x + 5, y + 10, x - 8, y - 26, x - 10, y - 32, x - 10, y - 32, LINE)


def noir_body():
    d = lumpy(100, 98, 58, 3.1, amp=1.0)
    out = '<clipPath id="ball"><path d="%s"/></clipPath>' % d
    out += '<path d="%s" fill="#5C3321"/>' % d
    out += '<g clip-path="url(#ball)">'
    out += '<rect x="30" y="30" width="140" height="92" fill="#221D1E"/>'
    out += '<ellipse cx="124" cy="62" rx="17" ry="9" transform="rotate(-32 124 62)" fill="#FFFFFF" opacity="0.2"/>'
    out += '<path d="M100 42 V118" stroke="#3B3334" stroke-width="2.5"/>'
    out += '<path d="M36 110 Q100 134 164 110 V127 Q100 152 36 127 Z" fill="#141112"/>'
    out += '</g>'
    for x, y in [(60, 128), (80, 134.5), (100, 136.5), (120, 134.5), (140, 128)]:
        out += '<circle cx="%.1f" cy="%.1f" r="3.3" fill="#F3E6C8"/>' % (x, y)
    for x, y in [(84, 149), (112, 150), (98, 146)]:
        out += '<circle cx="%d" cy="%d" r="2" fill="#E9D9B8"/>' % (x, y)
    out += '<path d="%s" fill="none" stroke="%s" stroke-width="5"/>' % (d, LINE)
    return out


COOKIE = {"sh_dx": 54, "sh_y": 104, "hip_dx": 20, "hip_y": 150, "ground": 214, "lift": 35, "arm_w": 9, "leg_w": 9}

CHARACTERS = {
    "golden-standard": dict(COOKIE, body=golden_body, arm="#DFA043", leg="#DFA043", hand="#DFA043", shoe="#DFA043", sole="#C98732"),
    "biscoff-break": dict(COOKIE, body=biscoff_body, arm="#D28C45", leg="#D28C45", hand="#FFFFFF", shoe="#8A4B2A", sole="#5E3018",
                          hold={1: mug}),
    "dough-vinci": dict(body=vinci_body, sh_dx=33, sh_y=131, hip_dx=13, hip_y=168, ground=215, lift=24, reach=0.8,
                        arm="#5F86A0", arm_w=11, leg="#C98B4D", leg_w=7, hand="#C98B4D", hand_r=8,
                        shoe="#D6402F", sole="#F4EBDD", sneaker=True, hold={-1: brush}),
    "choc-noir": dict(COOKIE, body=noir_body, sh_dx=51, arm="#2A2425", leg="#2A2425", arm_w=8, leg_w=8, hand="#2A2425", hand_r=10,
                      shoe="#C8392D", sole="#F4EBDD", sneaker=True),
}


def frame(c, i):
    th = 2 * math.pi * (i + 0.5) / FRAMES
    s = math.sin(th)
    inner = arm(-1, -s, c) + arm(1, s, c) + leg(-1, max(0, s), c) + leg(1, max(0, -s), c)
    inner += '<g transform="rotate(%.1f 100 %d)">%s</g>' % (2.5 * s, c["hip_y"], c["body"]())
    return inner


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(here, "..", "images", "run")
    os.makedirs(out_dir, exist_ok=True)
    for name, c in CHARACTERS.items():
        for i in range(FRAMES):
            svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s">%s</svg>\n' % (VIEW, frame(c, i))
            with open(os.path.join(out_dir, "%s-%d.svg" % (name, i + 1)), "w") as f:
                f.write(svg)
    print("Wrote %d pictures to images/run/" % (len(CHARACTERS) * FRAMES))


if __name__ == "__main__":
    main()
