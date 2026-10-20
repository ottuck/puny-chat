"""Draws the gift pictures (docs/fun-improvements.md, 직업 선물) into src/features/buddy/pixel/gifts.ts.

Each is 32 x 32, made of shapes lit from the top left (three or four shades of each material), outlined
in a darker shade of the thing it surrounds, with a line where one thing lies on another. A new gift in
gifts.ts gets a function here and an entry in ART. Run from app/, then format:

    python scripts/gift-art.py && pnpm exec prettier --write src/features/buddy/pixel/gifts.ts
"""
import math

W = H = 32

# material: [shadow, base, light, highlight], outline (None: no outline, e.g. steam)
MAT = {
    'porc': (['#D6CEC6', '#EFE9E3', '#FBF8F5', '#FFFFFF'], '#8A7A70'),
    'plate': (['#CBD3DD', '#E4E9EF', '#F4F7FA', '#FFFFFF'], '#7A8796'),
    'coffee': (['#3E2416', '#5A3622', '#7A4C30', '#9A6A48'], '#2E1A10'),
    'crema': (['#B9875A', '#D3A575', '#E6C197', '#F3DDBE'], '#8A5C36'),
    'foam': (['#E6DED5', '#F6F2EC', '#FFFFFF', '#FFFFFF'], '#A49688'),
    'cocoa': (['#6E4630', '#8A5A3C', '#A87652', '#A87652'], '#6E4630'),
    'steam': (['#E2DCD6', '#E2DCD6', '#E2DCD6', '#E2DCD6'], None),
    'red': (['#B83A33', '#DE5249', '#F07A6E', '#FFC2B8'], '#7E2620'),
    'pink': (['#D9849C', '#EEA6B9', '#F8C7D3', '#FFE6EC'], '#9C5468'),
    'blue': (['#3E6CB4', '#5487D2', '#7DA8E6', '#B8D2F4'], '#284A80'),
    'enamel': (['#3F6FA8', '#5A8CC8', '#86B0E0', '#C4DAF4'], '#26466E'),
    'glass': (['#A9C6DE', '#C9DDEE', '#E6F0F8', '#FFFFFF'], '#6A8AA6'),
    'hojicha': (['#8E5E38', '#AC7A50', '#C89870', '#DDB894'], '#5E3A1E'),
    'egg': (['#DDA02A', '#F2C23E', '#FAD978', '#FFF0B8'], '#946414'),
    'rice': (['#DCD7CE', '#F2EFE9', '#FCFBF8', '#FFFFFF'], '#958D82'),
    'nori': (['#18221B', '#26342A', '#3A4C3E', '#52685A'], '#101812'),
    'curry': (['#7E4A1A', '#A0642A', '#BE8040', '#D9A060'], '#56320E'),
    'carrot': (['#D0601E', '#EE8436', '#F8A866', '#F8A866'], '#8E3C10'),
    'potato': (['#C9A250', '#E2C072', '#F0D898', '#F0D898'], '#8A6A28'),
    'cake': (['#B06C28', '#D08E44', '#E8B066', '#F4CC8C'], '#74461A'),
    'butter': (['#E8C454', '#F8DE86', '#FFF0BC', '#FFFFFF'], '#A08024'),
    'syrup': (['#7E3E10', '#A65A1A', '#CC7E34', '#F0B070'], '#5A2A08'),
    'soup': (['#DDA834', '#F0C24E', '#F9DA86', '#FFF0C0'], '#9C7018'),
    'corn': (['#E8B820', '#F8D23A', '#FFE680', '#FFE680'], '#A07C10'),
    'leaf': (['#357A36', '#4F9C46', '#76BE5E', '#A6DC86'], '#22521F'),
    'basil': (['#3C8A32', '#58AE44', '#84CC64', '#B4E890'], '#235A1C'),
    'mint': (['#3E8C5A', '#5EB27A', '#8CD2A2', '#C0ECCC'], '#255C3A'),
    'rosemary': (['#2E5E44', '#46805E', '#6AA282', '#94C4A6'], '#1C3E2C'),
    'stem': (['#4E6A26', '#6A8A36', '#88AA4E', '#88AA4E'], '#34481A'),
    'pot': (['#AA4A26', '#CC663A', '#E68A5C', '#F4AE86'], '#6E2C12'),
    'soil': (['#4A3222', '#5E4230', '#76563E', '#76563E'], '#3A261A'),
    'tomato': (['#B42E26', '#DC4636', '#F06E5C', '#FFD0C4'], '#761A14'),
    'twine': (['#9A7448', '#B88E5E', '#D2AC7C', '#D2AC7C'], '#6A4C2C'),
    'kraft': (['#B48C62', '#CCA67C', '#E0C29C', '#EED8BC'], '#7C5C3A'),
    'yellow': (['#E0A824', '#F4C83C', '#FCE07E', '#FFF2C0'], '#A07414'),
    'white': (['#E2DCD4', '#F6F3EE', '#FFFFFF', '#FFFFFF'], '#9A9086'),
    'lilac': (['#8A72C4', '#A68EDC', '#C4B0EE', '#E0D4F8'], '#5A4690'),
    'vinyl': (['#18161C', '#26232C', '#3A3644', '#6A6676'], '#0E0C12'),
    'navy': (['#1E2850', '#2C3A6A', '#3E5088', '#5468A4'], '#141A36'),
    'sky': (['#8CB8E2', '#A8CCEE', '#C6E0F6', '#E4F0FC'], '#5A86B4'),
    'sea': (['#2E6AA8', '#3E86C4', '#62A6DC', '#B4D8F4'], '#1E4A7A'),
    'sand': (['#D9BA82', '#EAD09C', '#F4E2BA', '#F4E2BA'], '#9A7E4C'),
    'orange': (['#E07A28', '#F39A3B', '#F8BA6A', '#FCD8A0'], '#9A4A10'),
    'dusk': (['#E8885A', '#F4A472', '#F8C08E', '#FCDAB2'], '#A45A34'),
    'ink': (['#2E2630', '#3A3140', '#4E4456', '#4E4456'], '#1E1820'),
    'wood': (['#7A5234', '#966A46', '#B28660', '#B28660'], '#52361E'),
    'cream': (['#F2E6CC', '#FBF3E2', '#FFFBF2', '#FFFFFF'], '#A8987A'),
    'maple': (['#B8361E', '#DA4E2C', '#F0764A', '#F8A07A'], '#7A200E'),
    'gold': (['#C89A2A', '#E4BC48', '#F4D878', '#FFF0B0'], '#8A6410'),
    'grass': (['#4E8A3A', '#6AA84C', '#8CC46A', '#B0DC8E'], '#30602A'),
    'hill': (['#3E7A44', '#56965A', '#78B278', '#78B278'], '#28542E'),
    'iced': (['#8E6E58', '#AE907A', '#CCB4A2', '#EEE2D8'], '#3E2416'),
    'stone': (['#5E5A56', '#7A7570', '#98938E', '#B8B4AE'], '#3A3632'),
    'straw': (['#2A7446', '#3C945A', '#5EB47A', '#5EB47A'], '#1C5030'),
    'caramel': (['#A8641C', '#C98430', '#E4A650', '#F2C884'], '#74400C'),
    'matcha': (['#5E9036', '#7CAA48', '#9EC66A', '#C2DE98'], '#3E6420'),
    'mocha': (['#7E5038', '#9C6A50', '#BA8A6E', '#D4AC94'], '#56341E'),
    'milk': (['#E6D8C4', '#F2E8D8', '#FAF4EA', '#FFFFFF'], '#A08E76'),
    'stamp': (['#C8D8C0', '#E2EEDC', '#F4FAF0', '#F4FAF0'], '#7A9070'),
    'shade': (['#D8CFC4', '#D8CFC4', '#D8CFC4', '#D8CFC4'], None),
}


class Art:
    def __init__(self):
        self.g = [[None] * W for _ in range(H)]  # (mat, shade, group, layer)
        self.layer = 0

    def set(self, x, y, mat, shade=1, group=None):
        if 0 <= x < W and 0 <= y < H:
            cur = self.g[y][x]
            layer = self.layer if group is None or cur is None or cur[2] != group else cur[3]
            self.g[y][x] = (mat, shade, group or f'_{self.layer}', layer)

    def fill(self, test, mat, shade=None, group=None):
        self.layer += 1
        grp = group or f'g{self.layer}'
        for y in range(H):
            for x in range(W):
                cx, cy = x + 0.5, y + 0.5
                if test(cx, cy):
                    s = shade(cx, cy) if callable(shade) else (1 if shade is None else shade)
                    self.g[y][x] = (mat, s, grp, self.layer)
        return grp

    def dot(self, pts, mat, shade=1, group=None):
        """Points into an existing group (no line between them)."""
        for x, y in pts:
            x, y = int(x), int(y)
            if 0 <= x < W and 0 <= y < H:
                cur = self.g[y][x]
                grp = group or (cur[2] if cur else f'd{self.layer}')
                layer = cur[3] if cur else self.layer
                self.g[y][x] = (mat, shade, grp, layer)

    def erase(self, test):
        for y in range(H):
            for x in range(W):
                if test(x + 0.5, y + 0.5):
                    self.g[y][x] = None

    def render(self, lines=True):
        out = [[None] * W for _ in range(H)]
        for y in range(H):
            for x in range(W):
                cell = self.g[y][x]
                if cell:
                    ramp = MAT[cell[0]][0]
                    out[y][x] = ramp[max(0, min(3, cell[1]))]
        # A line on the lower thing where something lies on top of it.
        if lines:
            for y in range(H):
                for x in range(W):
                    cell = self.g[y][x]
                    if not cell or MAT[cell[0]][1] is None:
                        continue
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < W and 0 <= ny < H:
                            n = self.g[ny][nx]
                            if n and n[2] != cell[2] and n[3] > cell[3] and MAT[n[0]][1]:
                                out[y][x] = MAT[n[0]][1]
                                break
        # Outline outside everything.
        final = [row[:] for row in out]
        for y in range(H):
            for x in range(W):
                if self.g[y][x]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and self.g[ny][nx]:
                        o = MAT[self.g[ny][nx][0]][1]
                        if o:
                            final[y][x] = o
                            break
        return final


# Shapes (tested at pixel centers)
def ell(cx, cy, rx, ry):
    return lambda x, y: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1


def rect(x0, y0, x1, y1):
    return lambda x, y: x0 <= x <= x1 and y0 <= y <= y1


def poly(pts):
    def inside(x, y):
        c = False
        n = len(pts)
        for i in range(n):
            x1, y1 = pts[i]
            x2, y2 = pts[(i + 1) % n]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                c = not c
        return c
    return inside


def both(*tests):
    return lambda x, y: all(t(x, y) for t in tests)


def anyof(*tests):
    return lambda x, y: any(t(x, y) for t in tests)


def minus(a, b):
    return lambda x, y: a(x, y) and not b(x, y)


def line(a, x0, y0, x1, y1, mat, width=0.7, shade=1, group=None):
    def t(x, y):
        dx, dy = x1 - x0, y1 - y0
        L = dx * dx + dy * dy
        u = max(0.0, min(1.0, ((x - x0) * dx + (y - y0) * dy) / L)) if L else 0
        return math.hypot(x - (x0 + u * dx), y - (y0 + u * dy)) <= width
    return a.fill(t, mat, shade, group)


# Shading
def sphere(cx, cy, rx, ry, hi=True):
    def s(x, y):
        nx, ny = (x - cx) / rx, (y - cy) / ry
        nz = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
        d = -0.5 * nx - 0.6 * ny + 0.62 * nz
        if hi and d > 0.86:
            return 3
        return 2 if d > 0.5 else 1 if d > 0.05 else 0
    return s


def cyl(x0, x1):
    def s(x, y):
        t = (x - x0) / max(1, x1 - x0)
        if 0.18 <= t <= 0.27:
            return 3
        if t < 0.42:
            return 2
        if t < 0.74:
            return 1
        return 0
    return s


def vert(y0, y1):
    def s(x, y):
        t = (y - y0) / max(1, y1 - y0)
        return 2 if t < 0.3 else 1 if t < 0.75 else 0
    return s


def heart(cx, cy, r):
    return lambda x, y: (
        ell(cx - r * 0.5, cy - r * 0.15, r * 0.58, r * 0.55)(x, y)
        or ell(cx + r * 0.5, cy - r * 0.15, r * 0.58, r * 0.55)(x, y)
        or poly([(cx - r * 1.05, cy), (cx + r * 1.05, cy), (cx, cy + r * 1.05)])(x, y)
    )


def steam(a, xs, y0, y1):
    pts = []
    for bx in xs:
        for y in range(y0, y1):
            pts.append((bx + round(math.sin(y * 0.85 + bx) * 1.1), y))
    a.fill(lambda x, y: (int(x), int(y)) in set(pts), 'steam', 1)


def saucer(a, cy=27, rx=14, ry=3.6):
    a.fill(ell(16, cy, rx, ry), 'porc', lambda x, y: 2 if y < cy - 0.5 else 1 if y < cy + 1.5 else 0)


def cup(a, mat, top=13, bottom=26, half=9.4, taper=2.0, cx=15.5, handle=True):
    body = lambda x, y: top <= y <= bottom and abs(x - cx) <= half - (y - top) * taper / (bottom - top)
    g = a.fill(anyof(body, ell(cx, bottom - 0.2, half - taper - 0.1, 1.6)), mat, cyl(cx - half, cx + half))
    if handle:
        hx, hy = cx + half + 0.8, top + (bottom - top) * 0.42
        a.fill(both(minus(ell(hx, hy, 4.0, 4.3), ell(hx, hy, 1.8, 2.2)), lambda x, y: x > hx - 1.6),
               mat, lambda x, y: 1 if y < hy else 0)
    return g


def rim(a, cx, cy, rx, ry, mat_rim, mat_in, inner_shade=None):
    a.fill(ell(cx, cy, rx, ry), mat_rim, lambda x, y: 3 if y < cy - 0.6 else 2)
    return a.fill(ell(cx, cy + 0.2, rx - 1.4, ry - 0.9), mat_in,
                  inner_shade or (lambda x, y: 2 if x < cx - rx * 0.35 else 1))


# ---------------- Barista ----------------
def latte():
    a = Art()
    steam(a, [12, 19], 2, 9)
    saucer(a)
    cup(a, 'porc')
    rim(a, 15.5, 13, 9.6, 3.4, 'porc', 'crema')
    # A heart in the milk.
    a.dot([(13, 12), (14, 12), (16, 12), (17, 12), (13, 13), (14, 13), (15, 13), (16, 13), (17, 13),
           (14, 14), (15, 14), (16, 14)], 'foam', 2)
    # A little heart on the cup.
    a.dot([(10, 19), (12, 19), (10, 20), (11, 20), (12, 20), (11, 21)], 'red', 1)
    return a


def iced_cup(a, top=7, bottom=29, half_top=8.6, half_bottom=6.2, cx=15.5):
    """A clear cup, wider at the top, as cold drinks come in; returns its inside."""
    side = lambda y: half_top - (y - top) * (half_top - half_bottom) / (bottom - top)
    a.fill(lambda x, y: top <= y <= bottom and abs(x - cx) <= side(y), 'glass', cyl(cx - half_top, cx + half_top))
    return lambda x, y: top + 1 <= y <= bottom - 1 and abs(x - cx) <= side(y) - 1.2


def iced_americano():
    a = Art()
    line(a, 21.5, 0.5, 20, 8, 'straw', 0.9)
    inside = iced_cup(a)
    a.fill(both(inside, lambda x, y: y >= 10), 'coffee', cyl(8, 23), group='drink')
    line(a, 20, 8, 18.6, 24, 'straw', 0.9, 0, group='straw-in')
    # Ice in the coffee, catching the light.
    for i, (cx, cy) in enumerate(((11.5, 12.5), (16, 13), (12.5, 18))):
        a.fill(both(inside, rect(cx - 2.3, cy - 2.3, cx + 2.3, cy + 2.3)), 'iced',
               lambda x, y, cx=cx, cy=cy: 3 if (x < cx - 1 and y < cy - 1) else 2 if y < cy else 1,
               group=f'ice{i}')
    a.fill(ell(15.5, 7.4, 8.6, 1.5), 'glass', 3, group='rim')
    a.dot([(8, 14), (8, 15), (9, 22), (22, 20), (23, 12)], 'glass', 3)
    return a


def caramel_macchiato():
    a = Art()
    a.fill(ell(15.5, 28.6, 11, 2.4), 'wood', lambda x, y: 2 if y < 28.4 else 1)
    glass = lambda x, y: 7 <= y <= 28 and abs(x - 15) <= 8
    a.fill(glass, 'glass', cyl(7, 23))
    a.fill(minus(ell(23.8, 17.5, 4, 5), ell(23.8, 17.5, 1.8, 2.8)), 'glass', 1)
    inner = lambda x, y: abs(x - 15) <= 6.8 and y <= 27
    a.fill(both(inner, lambda x, y: 18 <= y), 'milk', cyl(8, 22), group='drink')
    a.fill(both(inner, lambda x, y: 14 <= y < 18), 'crema', cyl(8, 22), group='drink')
    a.dot([(x, 17 + (x % 3 == 0)) for x in range(9, 22)], 'crema', 0, group='drink')
    a.fill(both(inner, lambda x, y: 10 <= y < 14), 'foam', cyl(8, 22), group='drink')
    a.fill(ell(15, 9.8, 6.8, 1.6), 'foam', 2, group='drink')
    # Caramel in a grid over the foam.
    a.dot([(x, y) for x in range(9, 22) for y in (9, 11) if x % 2] + [(x, 10) for x in (10, 13, 16, 19)],
          'caramel', 2, group='drink')
    a.fill(ell(15, 7.4, 8, 1.4), 'glass', 3, group='rim')
    a.dot([(9, 15), (9, 19), (9, 20), (9, 21)], 'glass', 3)
    return a


def matcha_latte():
    a = Art()
    steam(a, [12, 19], 1, 8)
    a.fill(ell(16, 28.4, 11.5, 2.2), 'shade', 1)
    cup(a, 'stone', top=12, bottom=27, half=8.6, taper=1.2, cx=15)
    rim(a, 15, 12, 8.8, 2.8, 'stone', 'matcha')
    # A heart drawn in the milk.
    a.dot([(13, 11), (14, 11), (16, 11), (17, 11), (13, 12), (14, 12), (15, 12), (16, 12), (17, 12), (14, 13),
           (15, 13), (16, 13)], 'foam', 2)
    a.dot([(x, 18 + (x % 2)) for x in range(8, 22)], 'stone', 3)
    return a


def chip_frappe():
    a = Art()
    line(a, 18, 0.5, 15.5, 8, 'straw', 0.9, group='straw')
    inside = iced_cup(a, top=13, bottom=30, half_top=8.2, half_bottom=6)
    a.fill(both(inside, lambda x, y: y >= 14), 'mocha', cyl(8, 23), group='drink')
    a.dot([(10, 17), (14, 19), (19, 16), (12, 23), (17, 22), (20, 25), (11, 27), (15, 26), (18, 19)], 'coffee', 0,
          group='drink')
    # Whipped cream in a swirl under a clear dome, chocolate over it.
    a.fill(anyof(ell(15.5, 12, 7.6, 3.2), ell(15.5, 9.2, 5.6, 2.8), ell(15.5, 6.8, 3.4, 2.2)), 'foam',
           sphere(13.5, 7, 7.6, 7), group='cream')
    a.dot([(10, 11), (11, 11), (12, 12), (13, 12), (18, 11), (19, 11), (20, 12), (12, 9), (13, 8), (17, 8), (18, 9),
           (14, 6), (16, 6), (15, 5)], 'cocoa', 1, group='cream')
    a.fill(minus(both(ell(15.5, 13, 9.4, 9), lambda x, y: y <= 13.4), ell(15.5, 13, 8.2, 7.8)), 'glass', 2,
           group='dome')
    a.fill(ell(15.5, 13.4, 9.6, 1.4), 'glass', 1, group='lid')
    line(a, 16.6, 4, 16, 8, 'straw', 0.9, group='straw')
    return a


# ---------------- Chef ----------------
def plate(a, cy=25, rx=14.5, ry=5):
    a.fill(ell(16, cy, rx, ry), 'plate', lambda x, y: 2 if y < cy - 1 else 1 if y < cy + 2 else 0)
    a.fill(ell(16, cy - 0.2, rx - 3, ry - 1.6), 'plate', 1, group='well')


def omurice():
    a = Art()
    steam(a, [11, 17, 22], 2, 8)
    plate(a)
    a.fill(both(ell(16, 22, 11, 7.2), lambda x, y: y <= 25.5), 'egg', sphere(14, 19, 11, 7))
    a.fill(heart(16.5, 19.5, 3.4), 'red', sphere(15.5, 18.5, 4, 4), group='ketchup')
    a.dot([(14, 18), (15, 18)], 'red', 3)
    # Parsley on the side.
    a.fill(anyof(ell(26, 24.5, 1.6, 1.3), ell(27.6, 23.4, 1.4, 1.2)), 'leaf', 1)
    return a


def soup():
    a = Art()
    steam(a, [11, 16, 21], 1, 7)
    a.fill(ell(16, 29, 9, 1.8), 'shade', 1)
    a.fill(rect(10.5, 25.5, 21.5, 28.5), 'porc', cyl(10, 22), group='foot')
    a.fill(both(ell(16, 13, 14, 13.5), lambda x, y: y >= 13), 'porc', cyl(2, 30), group='bowl')
    a.fill(both(ell(16, 13, 14, 13.5), lambda x, y: 16.5 <= y <= 18), 'blue', cyl(2, 30), group='band')
    a.fill(ell(16, 13, 14, 4), 'porc', 3, group='rim')
    a.fill(ell(16, 13.3, 12.2, 2.9), 'soup', lambda x, y: 3 if (x < 10 and y < 13) else 2 if x < 14 else 1)
    a.dot([(9, 13), (12, 14), (17, 12), (20, 14), (14, 15), (22, 13)], 'corn', 3)
    a.dot([(15, 13), (16, 13), (11, 12), (19, 15)], 'leaf', 1)
    a.fill(anyof(rect(17.5, 13.5, 19.5, 15.3), rect(12.5, 11.2, 14.3, 12.8)), 'cake', 2)
    # A spoon resting on the rim.
    a.fill(ell(22.5, 13.2, 2.4, 1.4), 'plate', 1, group='spoon')
    line(a, 24, 12.6, 30, 6.5, 'plate', 0.85, 2, group='spoon')
    return a


def pancakes():
    a = Art()
    plate(a, cy=26, rx=14.5, ry=4.4)
    for i, cy in enumerate((22, 18.5, 15)):
        a.fill(anyof(ell(16, cy + 1.6, 10.5, 2.6), both(rect(5.5, cy - 1, 26.5, cy + 1.6))), 'cake',
               lambda x, y, cy=cy: 0 if y > cy + 1.5 else (1 if x > 20 else 2))
        a.fill(ell(16, cy - 1, 10.5, 2.6), 'cake', 3 if i == 2 else 2)
    # Syrup over the top and down the side, butter on top.
    a.fill(ell(16, 13.8, 8.6, 2.0), 'syrup', lambda x, y: 3 if x < 12 else 2)
    # Drips down the side, on the cakes themselves (no line around them).
    drips = [(9, 16, 19), (10, 16, 17), (20, 16, 23), (21, 16, 21), (15, 16, 17)]
    a.dot([(x, y) for x, y0, y1 in drips for y in range(y0, y1)], 'syrup', 1)
    a.dot([(x, y1) for x, y0, y1 in drips], 'syrup', 0)
    a.fill(poly([(12.5, 10.5), (18.5, 10.5), (19.5, 12.5), (13.5, 13.5)]), 'butter', lambda x, y: 2 if y < 11.8 else 1)
    a.fill(poly([(12.5, 10.5), (18.5, 10.5), (17.5, 9), (13.5, 9)]), 'butter', 3, group='butter-top')
    return a


def rice_balls():
    a = Art()
    a.fill(ell(16, 26.5, 14.5, 3.6), 'leaf', lambda x, y: 2 if y < 26 else 1)
    a.dot([(x, 26) for x in range(5, 28)], 'leaf', 0)

    def onigiri(cx, top, w, h):
        tri = lambda x, y: top <= y <= top + h and abs(x - cx) <= (y - top) / h * w + 1.2
        shape = anyof(both(tri, lambda x, y: y > top + 2), ell(cx, top + 2.6, 2.6, 2.6),
                      ell(cx - w + 2.4, top + h - 2.2, 2.6, 2.6), ell(cx + w - 2.4, top + h - 2.2, 2.6, 2.6),
                      rect(cx - w + 2.4, top + h - 4, cx + w - 2.4, top + h + 0.4))
        a.fill(shape, 'rice', sphere(cx - 2, top + h * 0.45, w, h * 0.7))
        a.fill(both(shape, rect(cx - w * 0.42, top + h - 6, cx + w * 0.42, top + h + 1)), 'nori',
               cyl(cx - w * 0.42, cx + w * 0.42))
        a.dot([(round(cx - 3), top + 5), (round(cx + 2), top + 8), (round(cx - 1), top + 3)], 'rice', 0)

    onigiri(11, 9, 8, 15)
    onigiri(21.5, 11.5, 7, 13)
    return a


def curry():
    a = Art()
    steam(a, [12, 18, 23], 2, 9)
    plate(a, cy=23, rx=15, ry=7)
    a.fill(ell(11.5, 21.5, 7.2, 4.6), 'rice', sphere(10, 19.5, 7, 4.6))
    a.fill(minus(ell(19.5, 23, 9, 5.2), ell(11.5, 21.5, 7.4, 4.8)), 'curry', sphere(18, 21.5, 9, 5.2))
    a.fill(anyof(ell(18, 22.5, 1.8, 1.3), ell(23.5, 24.5, 1.7, 1.2)), 'carrot', 1)
    a.fill(anyof(ell(21.5, 20.6, 1.9, 1.5), ell(16.2, 25.4, 1.8, 1.3)), 'potato', 2)
    a.dot([(20, 23), (25, 22), (17, 20)], 'curry', 3)
    return a


# ---------------- Gardener ----------------
def leaf_shape(cx, cy, length, width, angle):
    ca, sa = math.cos(angle), math.sin(angle)

    def t(x, y):
        dx, dy = x - cx, y - cy
        u = dx * ca + dy * sa
        v = -dx * sa + dy * ca
        if u < 0 or u > length:
            return False
        return abs(v) <= width * math.sin(math.pi * (u / length) ** 0.8) ** 0.8
    return t


def leaf_shade(cx, cy, angle):
    ca, sa = math.cos(angle), math.sin(angle)

    def s(x, y):
        v = -(x - cx) * sa + (y - cy) * ca
        return 1 if abs(v) < 0.6 else (2 if v < 0 else 1) if abs(v) < 2.2 else (2 if v < 0 else 0)
    return s


def basil():
    a = Art()
    # Stems gathered at the bottom.
    for x0, x1 in ((15, 10), (16, 16), (17, 22)):
        a.fill(lambda x, y, x0=x0, x1=x1: 14 <= y <= 29 and abs(x - (x0 + (x1 - x0) * (29 - y) / 15)) <= 0.7,
               'stem', 1)
    leaves = [(10, 15, 9, 3.6, -2.0), (10, 15, 8, 3.4, -2.7), (16, 13, 10, 3.8, -1.57), (22, 15, 9, 3.6, -1.15),
              (22, 15, 8, 3.4, -0.45), (13, 20, 7, 3.0, -2.5), (19, 20, 7, 3.0, -0.65), (16, 9, 6, 2.8, -1.57)]
    for cx, cy, ln, wd, ang in leaves:
        a.fill(leaf_shape(cx, cy, ln, wd, ang), 'basil', leaf_shade(cx, cy, ang))
    # Twine.
    a.fill(rect(13, 23, 19, 24.6), 'twine', lambda x, y: 2 if y < 23.8 else 1)
    a.fill(anyof(ell(12, 25.6, 1.4, 1.6), ell(20, 25.6, 1.4, 1.6)), 'twine', 1, group='bow')
    return a


def mint():
    a = Art()
    a.fill(poly([(7, 20), (25, 20), (22.5, 30), (9.5, 30)]), 'pot', cyl(7, 25))
    a.fill(rect(5.5, 18, 26.5, 21.4), 'pot', cyl(5, 27), group='pot-rim')
    a.fill(ell(16, 18.4, 9.6, 1.6), 'soil', 1)
    sprigs = ((16, 18.5, 9, 7), (16, 18.5, 16, 4), (16, 18.5, 23, 7))
    for x0, y0, x1, y1 in sprigs:
        line(a, x0, y0, x1, y1, 'stem', 0.6, group='stems')
    # Round leaves in pairs along each sprig, the back ones first.
    n = 0
    for x0, y0, x1, y1 in sprigs:
        ang = math.atan2(y1 - y0, x1 - x0)
        for t, ln, wd in ((0.45, 5.2, 2.6), (0.75, 4.6, 2.4)):
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for side in (-1, 1):
                n += 1
                la = ang + side * 1.25
                a.fill(leaf_shape(x, y, ln, wd, la), 'mint', leaf_shade(x, y, la), group=f'leaf{n}')
        n += 1
        a.fill(leaf_shape(x1, y1, 3.8, 2.2, ang), 'mint', leaf_shade(x1, y1, ang), group=f'leaf{n}')
    return a


def tomatoes():
    a = Art()
    line(a, 16, 2.5, 16, 8.5, 'stem', 0.8, group='vine')
    line(a, 16, 8, 11, 10.5, 'stem', 0.7, group='vine')
    line(a, 16, 8, 21, 11.5, 'stem', 0.7, group='vine')
    a.fill(leaf_shape(16, 4, 6.5, 2.4, -0.5), 'leaf', leaf_shade(16, 4, -0.5))
    a.fill(leaf_shape(16, 6, 5.5, 2.0, -2.7), 'leaf', leaf_shade(16, 6, -2.7))
    for cx, cy, r in ((10.5, 15, 5.4), (21.5, 16, 5.4), (16, 23.5, 6.0)):
        a.fill(ell(cx, cy, r, r * 0.95), 'tomato', sphere(cx, cy, r, r))
        hx, hy = round(cx - r * 0.45), round(cy - r * 0.42)
        a.dot([(hx, hy), (hx + 1, hy), (hx, hy + 1)], 'tomato', 3)
        top = cy - r * 0.95
        a.fill(anyof(ell(cx - 1.8, top + 0.9, 2.0, 0.8), ell(cx + 1.8, top + 0.9, 2.0, 0.8), ell(cx, top + 0.4, 0.9, 1.4)),
               'leaf', 2)
    line(a, 16, 8, 16, 17.6, 'stem', 0.7, group='vine')
    return a


def rosemary():
    a = Art()
    for n, (x0, y0, x1, y1) in enumerate(((8, 4, 16, 29), (24, 4, 16, 29), (16, 2, 16, 29))):
        sprig = f'sprig{n}'
        line(a, x0, y0, x1, y1, 'stem', 0.6, group=sprig)
        ang = math.atan2(y1 - y0, x1 - x0)
        for i in range(1, 9):
            t = i / 14
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for side in (-1, 1):
                a.fill(leaf_shape(x, y, 3.8, 0.5, ang + side * 2.2), 'rosemary', 2 if side < 0 else 1, group=sprig)
        a.fill(leaf_shape(x0, y0, 2.6, 0.7, ang + math.pi), 'rosemary', 3, group=sprig)
    a.fill(rect(12, 21, 20, 23), 'red', lambda x, y: 2 if y < 22 else 1)
    a.fill(anyof(heart(11, 21.8, 2.2), heart(21, 21.8, 2.2)), 'red', 1, group='bow')
    a.fill(anyof(poly([(13, 23), (15, 23), (12, 28), (10.5, 27)]), poly([(17, 23), (19, 23), (21.5, 27), (20, 28)])),
           'red', 0, group='tails')
    return a


def flowers():
    a = Art()
    # Stems and leaves behind, then the paper.
    for x0 in (11, 14, 18, 21):
        a.fill(lambda x, y, x0=x0: 9 <= y <= 22 and abs(x - (x0 + (16 - x0) * (y - 9) / 13)) <= 0.6, 'stem', 1)
    for cx, cy, r, mat in ((10, 8, 3.4, 'pink'), (21.5, 7.5, 3.4, 'yellow'), (16, 5, 3.2, 'lilac'),
                           (13.5, 11.5, 3.0, 'white'), (19, 11.5, 3.0, 'pink')):
        petals = anyof(*[ell(cx + math.cos(k * 1.2566) * r * 0.55, cy + math.sin(k * 1.2566) * r * 0.55, r * 0.55, r * 0.55)
                         for k in range(5)])
        a.fill(petals, mat, sphere(cx, cy, r, r, hi=False))
        a.fill(ell(cx, cy, 1.1, 1.1), 'gold' if mat != 'yellow' else 'orange', 2)
    a.fill(leaf_shape(9, 15, 6, 2.2, -2.6), 'leaf', leaf_shade(9, 15, -2.6))
    a.fill(leaf_shape(23, 15, 6, 2.2, -0.55), 'leaf', leaf_shade(23, 15, -0.55))
    a.fill(poly([(6, 14), (26, 14), (19, 30), (13, 30)]), 'kraft', cyl(6, 26))
    a.fill(poly([(6, 14), (12, 14), (14.5, 30), (13, 30)]), 'kraft', 3, group='fold')
    a.fill(rect(12.5, 22, 19.5, 24), 'red', lambda x, y: 2 if y < 23 else 1)
    a.fill(anyof(heart(12, 23, 2.0), heart(20, 23, 2.0)), 'red', 1, group='bow')
    return a


# ---------------- DJ ----------------
def record(sleeve_art, label='red'):
    a = Art()
    # The record, half out of its sleeve.
    cx, cy, r = 21, 15.5, 9.8
    a.fill(ell(cx, cy, r, r), 'vinyl',
           lambda x, y: (2 if int(math.hypot(x - cx, y - cy) * 1.3) % 3 == 0 else 1))
    a.dot([(x, y) for x in range(32) for y in range(32)
           if 5.5 < math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 9 and abs(math.atan2(y + 0.5 - cy, x + 0.5 - cx) + 0.75) < 0.2],
          'vinyl', 3)
    a.fill(ell(cx, cy, 3.4, 3.4), label, sphere(cx, cy, 3.4, 3.4), group='label')
    a.fill(ell(cx, cy, 0.8, 0.8), 'vinyl', 0, group='label')
    # The sleeve and its picture.
    a.fill(rect(1.5, 5.5, 18.5, 25.5), 'cream', 1)
    sleeve_art(a, 2.5, 6.5, 15, 18)
    return a


def moon_sleeve(a, x0, y0, w, h):
    a.fill(rect(x0, y0, x0 + w, y0 + h), 'navy', vert(y0, y0 + h), group='pic')
    a.fill(minus(ell(x0 + 7, y0 + 8, 4.6, 4.6), ell(x0 + 9.4, y0 + 6.6, 4, 4)), 'gold', 2, group='moon')
    for sx, sy in ((14, 4), (16, 11), (4, 16), (12, 17), (16, 2)):
        a.dot([(int(x0 + sx), int(y0 + sy))], 'gold', 3, group='pic')
    a.dot([(int(x0 + 13), int(y0 + 9)), (int(x0 + 14), int(y0 + 9)), (int(x0 + 13), int(y0 + 8)),
           (int(x0 + 13), int(y0 + 10)), (int(x0 + 12), int(y0 + 9))], 'gold', 2, group='pic')


def rain_sleeve(a, x0, y0, w, h):
    a.fill(rect(x0, y0, x0 + w, y0 + h), 'sky', vert(y0, y0 + h), group='pic')
    a.fill(anyof(ell(x0 + 7, y0 + 5, 5, 2.6), ell(x0 + 11, y0 + 4, 4, 3), ell(x0 + 14, y0 + 5.4, 3.6, 2.2)), 'white',
           lambda x, y: 2 if y < y0 + 4.5 else 1)
    drops = [(5, 10), (9, 12), (13, 10), (7, 15), (11, 16), (15, 14), (4, 18), (16, 18)]
    for dx, dy in drops:
        a.dot([(int(x0 + dx), int(y0 + dy)), (int(x0 + dx), int(y0 + dy) + 1)], 'blue', 1, group='pic')


def heart_sleeve(a, x0, y0, w, h):
    a.fill(rect(x0, y0, x0 + w, y0 + h), 'pink', vert(y0, y0 + h), group='pic')
    a.fill(heart(x0 + 6.5, y0 + 7.5, 3.8), 'red', sphere(x0 + 5.5, y0 + 6.5, 4, 4), group='h1')
    a.fill(heart(x0 + 12.5, y0 + 12.5, 3.8), 'white', sphere(x0 + 11.5, y0 + 11.5, 4, 4), group='h2')


def sun_sleeve(a, x0, y0, w, h):
    a.fill(rect(x0, y0, x0 + w, y0 + h), 'orange', vert(y0, y0 + h), group='pic')
    cx, cy = x0 + w / 2, y0 + h / 2
    for k in range(8):
        ang = k * math.pi / 4
        a.dot([(int(cx + math.cos(ang) * rr), int(cy + math.sin(ang) * rr)) for rr in (6.5, 7.5)], 'yellow', 3, group='pic')
    a.fill(ell(cx, cy, 4.6, 4.6), 'yellow', sphere(cx, cy, 4.6, 4.6), group='sun')


def sunrise_sleeve(a, x0, y0, w, h):
    a.fill(rect(x0, y0, x0 + w, y0 + h), 'dusk',
           lambda x, y: 3 if y < y0 + 4 else (3 if (int(x) + int(y)) % 2 else 2) if y < y0 + 6 else 2 if y < y0 + 9 else 1,
           group='pic')
    sx, sy = x0 + w / 2, y0 + 12
    for k in range(7):
        ang = math.pi + k * math.pi / 6
        a.dot([(sx + math.cos(ang) * rr, sy + math.sin(ang) * rr) for rr in (6.6, 7.6)], 'yellow', 3, group='pic')
    a.fill(both(ell(sx, sy, 5, 5), lambda x, y: y < sy + 1), 'yellow', sphere(sx, sy - 2, 5, 5), group='sun')
    a.fill(both(rect(x0, y0, x0 + w, y0 + h), anyof(ell(x0 + 2, y0 + h + 4, 9, 7.5), ell(x0 + 14, y0 + h + 4.5, 9, 7))),
           'grass', vert(y0 + 11, y0 + h), group='hills')
    a.fill(both(rect(x0, y0, x0 + w, y0 + h), ell(x0 + 14, y0 + h + 4.5, 9, 7)), 'grass', vert(y0 + 12, y0 + h),
           group='hill2')


# ---------------- Writer ----------------
def postcard(scene, stamp_mat):
    a = Art()
    a.fill(rect(2.5, 7.5, 30.5, 27.5), 'shade', 1)
    a.fill(rect(1.5, 6.5, 29.5, 26.5), 'cream', 2)
    scene(a, 3.5, 8.5, 25, 16)
    # The stamp at the top right corner.
    a.fill(rect(23.5, 3.5, 29.5, 10.5), 'stamp', 1, group='stamp')
    a.fill(rect(24.5, 4.5, 28.5, 9.5), stamp_mat, 2, group='stamp-pic')
    a.dot([(x, 3) for x in range(24, 30, 2)] + [(30, y) for y in range(4, 11, 2)], 'stamp', 1, group='stamp')
    return a


def sea_scene(a, x0, y0, w, h):
    a.fill(rect(x0, y0, x0 + w, y0 + 7), 'sky', lambda x, y: 3 if y < y0 + 2 else 2 if y < y0 + 4.5 else 1, group='pic')
    a.fill(ell(x0 + 18, y0 + 6.5, 2.6, 2.6), 'yellow', 2, group='pic')
    a.fill(rect(x0, y0 + 7, x0 + w, y0 + 13), 'sea', lambda x, y: 2 if y < y0 + 8.5 else 1 if y < y0 + 11 else 0, group='pic')
    a.fill(rect(x0, y0 + 13, x0 + w, y0 + h), 'sand', 2, group='pic')
    for wx, wy in ((3, 9), (10, 11), (17, 9), (21, 12), (6, 12)):
        a.dot([(int(x0 + wx), int(y0 + wy)), (int(x0 + wx) + 1, int(y0 + wy))], 'sea', 3, group='pic')
    # A sailboat.
    a.fill(poly([(x0 + 8, y0 + 2), (x0 + 8, y0 + 8), (x0 + 4, y0 + 8)]), 'white', 2, group='boat')
    a.fill(rect(x0 + 3, y0 + 8, x0 + 10, y0 + 9.2), 'red', 1, group='boat')


def forest_scene(a, x0, y0, w, h):
    a.fill(rect(x0, y0, x0 + w, y0 + h), 'sky', lambda x, y: 3 if y < y0 + 3 else 2 if y < y0 + 6 else 1, group='pic')
    for i, (tx, th, mat) in enumerate(((3, 11, 'hill'), (9, 13, 'leaf'), (15, 10, 'hill'), (20, 12, 'leaf'), (25, 9, 'hill'))):
        top = y0 + h - th
        a.fill(both(rect(x0, y0, x0 + w, y0 + h),
                    poly([(x0 + tx, top), (x0 + tx + 4.2, y0 + h - 2), (x0 + tx - 4.2, y0 + h - 2)])),
               mat, lambda x, y, tx=tx: 2 if x < x0 + tx else 1, group=f'tree{i}')
    a.fill(rect(x0, y0 + h - 2.5, x0 + w, y0 + h), 'grass', 1, group='ground')


def stars_scene(a, x0, y0, w, h):
    def night(x, y):
        t = (y - y0) / h
        if t < 0.35:
            return 0
        if t < 0.5:
            return 1 if (int(x) + int(y)) % 2 else 0
        if t < 0.7:
            return 1
        return 2 if (int(x) + int(y)) % 2 else 1
    a.fill(rect(x0, y0, x0 + w, y0 + h), 'navy', night, group='pic')
    for sx, sy, big in ((3, 3, 0), (8, 6, 1), (14, 2, 0), (19, 5, 0), (23, 9, 0), (5, 10, 0), (12, 9, 0)):
        x, y = int(x0 + sx), int(y0 + sy)
        pts = [(x, y)] + ([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)] if big else [])
        a.dot(pts, 'gold', 3, group='pic')
    a.fill(minus(ell(x0 + 20, y0 + 4, 2.6, 2.6), ell(x0 + 21.4, y0 + 3.2, 2.2, 2.2)), 'gold', 2, group='moon')
    a.fill(both(rect(x0, y0, x0 + w, y0 + h), anyof(ell(x0 + 5, y0 + h + 4, 12, 6.5), ell(x0 + 21, y0 + h + 3, 10, 5))),
           'ink', 1, group='hills')


def cat_scene(a, x0, y0, w, h):
    a.fill(rect(x0, y0, x0 + w, y0 + h), 'dusk', lambda x, y: 3 if y < y0 + 4 else 2 if y < y0 + 9 else 1, group='pic')
    a.fill(ell(x0 + 18, y0 + 10, 3.6, 3.6), 'yellow', 2, group='pic')
    a.fill(rect(x0, y0 + h - 3, x0 + w, y0 + h), 'wood', vert(y0 + h - 3, y0 + h), group='sill')
    cx, base = x0 + 9, y0 + h - 3
    body = anyof(ell(cx, base - 3, 4.6, 3.6), ell(cx - 1, base - 8, 3.2, 2.9),
                 poly([(cx - 4, base - 9.5), (cx - 3.4, base - 13), (cx - 1.6, base - 10)]),
                 poly([(cx - 0.4, base - 10), (cx + 1.4, base - 13), (cx + 2, base - 9.5)]))
    a.fill(body, 'ink', 1, group='cat')
    a.fill(lambda x, y: base - 6 <= y <= base - 0.5 and abs(x - (cx + 5.5 + math.sin((y - base) * 0.7) * 1.2)) <= 0.7,
           'ink', 1, group='cat')
    a.dot([(int(cx - 2), int(base - 8)), (int(cx), int(base - 8))], 'gold', 3, group='cat')


MAPLE = [
    '.......#.......',
    '......###......',
    '..#...###...#..',
    '..##.#####.##..',
    '...#########...',
    '#...#######...#',
    '###.#######.###',
    '.#############.',
    '..###########..',
    '...#########...',
    '.#####.#.#####.',
    '..###..#..###..',
]


def autumn_scene(a, x0, y0, w, h):
    a.fill(rect(x0, y0, x0 + w, y0 + h), 'cream', lambda x, y: 3 if (int(x) * 3 + int(y)) % 9 == 0 else 2, group='pic')
    ox, oy = int(x0 + 5), int(y0 + 1)

    def mask(x, y):
        c, r = int(x) - ox, int(y) - oy
        return 0 <= r < len(MAPLE) and 0 <= c < 15 and MAPLE[r][c] == '#'

    def shade(x, y):
        c, r = int(x) - ox, int(y) - oy
        if c == 7 and 2 <= r <= 10:
            return 0
        if r == 7 and c in (3, 4, 10, 11) or r == 6 and c in (5, 9) or r == 8 and c in (2, 12):
            return 0
        return 2 if c < 7 and r < 8 else 1 if c < 10 else 0 if r > 8 else 1
    a.fill(mask, 'maple', shade, group='leaf')
    line(a, ox + 7.5, oy + 11, ox + 8.5, y0 + h - 0.6, 'wood', 0.6, group='stalk')

ART = {
    'BARISTA': {'latte': latte, 'icedAmericano': iced_americano, 'caramelMacchiato': caramel_macchiato,
                'matchaLatte': matcha_latte, 'chipFrappe': chip_frappe},
    'CHEF': {'omurice': omurice, 'soup': soup, 'pancakes': pancakes, 'riceBalls': rice_balls, 'curry': curry},
    'GARDENER': {'basil': basil, 'mint': mint, 'tomatoes': tomatoes, 'rosemary': rosemary, 'flowers': flowers},
    'DJ': {'record1': lambda: record(moon_sleeve, 'gold'), 'record2': lambda: record(rain_sleeve, 'red'),
           'record3': lambda: record(heart_sleeve, 'pink'), 'record4': lambda: record(sun_sleeve, 'blue'),
           'record5': lambda: record(sunrise_sleeve, 'grass')},
    'WRITER': {'sea': lambda: postcard(sea_scene, 'red'), 'forest': lambda: postcard(forest_scene, 'orange'),
               'stars': lambda: postcard(stars_scene, 'pink'), 'cat': lambda: postcard(cat_scene, 'blue'),
               'autumn': lambda: postcard(autumn_scene, 'grass')},
}

DESCRIBE = {
    'latte': 'a cup and saucer, a heart in the milk', 'icedAmericano': 'iced coffee in a clear cup with a straw',
    'caramelMacchiato': 'milk, espresso and foam in a glass, caramel over it',
    'matchaLatte': 'a mug of matcha latte with a leaf in the milk',
    'chipFrappe': 'a chocolate chip frappé under whipped cream and a dome lid', 'omurice': 'omurice with a ketchup heart',
    'soup': 'corn soup in a bowl with a spoon', 'pancakes': 'a stack with syrup and butter',
    'riceBalls': 'two rice balls on a leaf', 'curry': 'curry and rice', 'basil': 'a bunch of basil tied with twine',
    'mint': 'mint in a pot', 'tomatoes': 'cherry tomatoes on the vine', 'rosemary': 'rosemary tied with a ribbon',
    'flowers': 'wildflowers in paper', 'record1': 'a record from a sleeve with the moon',
    'record2': 'a record from a sleeve with rain', 'record3': 'a record from a sleeve with hearts',
    'record4': 'a record from a sleeve with the sun', 'record5': 'a record from a sleeve with a sunrise',
    'sea': 'a postcard of the sea', 'forest': 'a postcard of the forest', 'stars': 'a postcard of the stars',
    'cat': 'a postcard of a cat at the window', 'autumn': 'a postcard of a maple leaf',
}

CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' + ''.join(chr(c) for c in range(0xC0, 0x250) if c not in (0xD7, 0xF7))

rendered = {job: {kind: fn().render() for kind, fn in kinds.items()} for job, kinds in ART.items()}
colors = sorted({c for kinds in rendered.values() for grid in kinds.values() for row in grid for c in row if c})
assert len(colors) <= len(CHARS), len(colors)
key = {c: CHARS[i] for i, c in enumerate(colors)}
frames = {job: {kind: [''.join(key[c] if c else '.' for c in row) for row in grid] for kind, grid in kinds.items()}
          for job, kinds in rendered.items()}

out = ["""import type { BuddyJob } from '../api';
import type { GIFTS, GiftKind } from '../gifts';
import type { Frame, Palette } from './pixel-sprite';

// What a grown-up makes at work for one of us (docs/fun-improvements.md, 직업 선물), drawn on the
// mailbox's letter paper: a 32 × 32 picture for each gift in gifts.ts, lit from the top left, outlined
// in a darker shade of each thing. Made by scripts/gift-art.py: change it there, not here.

export const GIFT_PALETTE: Palette = {
"""]
out += [f"  '{key[c]}': '{c}',\n" for c in colors]
out.append('};\n\n')
out.append('const GIFT_ART: { [J in BuddyJob]: Record<(typeof GIFTS)[J][number], Frame> } = {\n')
for job, kinds in frames.items():
    out.append(f'  {job}: {{\n')
    for kind, rows in kinds.items():
        out.append(f'    // {DESCRIBE[kind]}\n    // prettier-ignore\n    {kind}: [\n')
        out += [f"      '{r}',\n" for r in rows]
        out.append('    ],\n')
    out.append('  },\n')
out.append('};\n\n')
out.append("""export const giftArt = (gift: GiftKind): Frame =>
  (GIFT_ART[gift.job] as Record<string, Frame>)[gift.kind];
""")
open('src/features/buddy/pixel/gifts.ts', 'w', encoding='utf-8', newline='\n').write(''.join(out))
print('written', len(colors), 'colors')
