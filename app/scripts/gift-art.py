"""Draws the pictures of what a barista, a cook or a gardener makes (docs/fun-improvements.md, 직업 이벤트)
into src/features/buddy/pixel/gifts.ts.

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
    'broth': (['#C2924E', '#D8AC6C', '#E8C48C', '#F4DEB2'], '#86602C'),
    'noodle': (['#E2C060', '#F0D684', '#F8E8B0', '#F8E8B0'], '#A08430'),
    'chashu': (['#A85E4A', '#C47C64', '#DCA08A', '#F0C8B6'], '#6E3626'),
    'yolk': (['#E0841E', '#F4A230', '#FAC060', '#FAC060'], '#9A5210'),
    'cello': (['#C8DDEA', '#DDEBF4', '#EEF6FB', '#FFFFFF'], '#86A6BC'),
    'seed': (['#4A2C18', '#643C22', '#7E5030', '#A07048'], '#33200F'),
    'pebble': (['#A8A29A', '#BFB9B0', '#D4CFC8', '#E8E4DE'], '#76706A'),
    'agave': (['#5E9A8A', '#7CB6A4', '#A0CEBE', '#C8E6DA'], '#3A6A5C'),
    'dough': (['#D8C4A0', '#EBDCC0', '#F6EEDC', '#FFFAF0'], '#9A8460'),
    'crisp': (['#9A5A22', '#B87432', '#D29450', '#D29450'], '#6A3A10'),
    'bamboo': (['#B0884A', '#C9A262', '#DDBC80', '#EED6A4'], '#7A5A26'),
    'bambooIn': (['#8A6A3A', '#A2804C', '#B89660', '#B89660'], '#6A4C22'),
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
    steam(a, [12, 17, 21], 5, 10)
    plate(a, cy=24.5, rx=12, ry=4.2)
    a.fill(both(ell(16, 22.2, 8.8, 5.8), lambda x, y: y <= 24.8), 'egg', sphere(14.4, 19.8, 8.8, 5.6))
    a.fill(heart(16.4, 20.2, 2.8), 'red', sphere(15.6, 19.4, 3.2, 3.2), group='ketchup')
    a.dot([(15, 19)], 'red', 3)
    # Parsley on the side.
    a.fill(anyof(ell(24.6, 23.8, 1.4, 1.1), ell(26, 22.9, 1.2, 1.0)), 'leaf', 1)
    return a


def ramen():
    a = Art()
    steam(a, [12, 16, 20], 3, 8)
    a.fill(ell(16, 28, 6.4, 1.4), 'shade', 1)
    a.fill(rect(12, 25.4, 20, 27.6), 'porc', cyl(11.5, 20.5), group='foot')
    bowl = both(ell(16, 16, 10.5, 10.6), lambda x, y: y >= 16)
    a.fill(bowl, 'porc', cyl(5.5, 26.5), group='bowl')
    a.fill(both(bowl, lambda x, y: 20.5 <= y <= 21.9), 'red', cyl(5.5, 26.5), group='band')
    # The nori sheet standing at the back, then the rim and the broth.
    a.fill(poly([(18.5, 8), (23, 8.8), (22.6, 15), (18.6, 14.6)]), 'nori', lambda x, y: 2 if x < 19.8 else 1,
           group='nori')
    a.fill(ell(16, 16, 10.5, 4.6), 'porc', 3, group='rim')
    a.fill(ell(16, 16.3, 9.2, 3.6), 'broth', lambda x, y: 3 if (x < 10 and y < 15.5) else 2 if x < 14 else 1,
           group='broth')
    a.dot([(x, y) for y in (17, 18) for x in range(10, 22) if (x + y * 2) % 4 in (0, 1)], 'noodle', 2,
          group='broth')
    a.fill(ell(11.5, 15, 2.8, 2.0), 'chashu', sphere(11, 14.4, 2.8, 2.0), group='chashu')
    a.fill(minus(ell(11.5, 15, 2.8, 2.0), ell(11.5, 15, 1.9, 1.2)), 'rice', 2, group='chashu')
    a.fill(ell(20, 17.2, 2.4, 1.7), 'white', 2, group='egg')
    a.fill(ell(20.2, 17.3, 1.2, 0.9), 'yolk', 2, group='egg')
    a.fill(ell(15.6, 14, 1.8, 1.2), 'white', 2, group='naruto')
    a.dot([(15, 14), (16, 14)], 'pink', 1, group='naruto')
    a.dot([(13, 17), (14, 18), (17, 17), (18, 18), (18, 15)], 'leaf', 2, group='broth')
    return a


def pancakes():
    a = Art()
    plate(a, cy=25.5, rx=12, ry=3.8)
    for i, cy in enumerate((22.4, 19.6, 16.8)):
        a.fill(anyof(ell(16, cy + 1.3, 8.4, 2.1), rect(7.6, cy - 0.8, 24.4, cy + 1.3)), 'cake',
               lambda x, y, cy=cy: 0 if y > cy + 1.2 else (1 if x > 19.5 else 2))
        a.fill(ell(16, cy - 0.8, 8.4, 2.1), 'cake', 3 if i == 2 else 2)
    # Syrup over the top and down the side (on the cakes themselves: no line around it), butter on top.
    a.fill(ell(16, 15.9, 6.8, 1.6), 'syrup', lambda x, y: 3 if x < 13 else 2)
    drips = [(10, 17, 20), (11, 17, 18), (20, 17, 23), (21, 17, 21), (16, 17, 18)]
    a.dot([(x, y) for x, y0, y1 in drips for y in range(y0, y1)], 'syrup', 1)
    a.dot([(x, y1) for x, y0, y1 in drips], 'syrup', 0)
    a.fill(poly([(13.4, 13.4), (18.2, 13.4), (19, 15), (14.2, 15.8)]), 'butter', lambda x, y: 2 if y < 14.4 else 1)
    a.fill(poly([(13.4, 13.4), (18.2, 13.4), (17.4, 12.2), (14.2, 12.2)]), 'butter', 3, group='butter-top')
    return a


def rounded(pts, r):
    """A triangle with its corners rounded by r, the same size as the triangle."""
    # Shrink toward the incenter so the rounded outline keeps the polygon's size.
    sides = [math.hypot(pts[(i + 1) % 3][0] - pts[(i + 2) % 3][0], pts[(i + 1) % 3][1] - pts[(i + 2) % 3][1])
             for i in range(3)]
    per = sum(sides)
    cx = sum(sides[i] * pts[i][0] for i in range(3)) / per
    cy = sum(sides[i] * pts[i][1] for i in range(3)) / per
    area = abs((pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[2][0] - pts[0][0]) * (pts[1][1] - pts[0][1])) / 2
    f = 1 - r / (2 * area / per)
    inner = [(cx + (x - cx) * f, cy + (y - cy) * f) for x, y in pts]
    inside = poly(inner)

    def seg(px, py, ax, ay, bx, by):
        vx, vy = bx - ax, by - ay
        t = max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)))
        return math.hypot(px - (ax + t * vx), py - (ay + t * vy))

    def test(x, y):
        if inside(x, y):
            return True
        return min(seg(x, y, *inner[i], *inner[(i + 1) % len(inner)]) for i in range(len(inner))) <= r
    return test


def onigiri(a, cx, top, w, h, name):
    """A rice ball: a soft triangle of rice with a grain here and there, nori wrapped round the bottom."""
    shape = rounded([(cx, top), (cx + w / 2, top + h), (cx - w / 2, top + h)], w * 0.11)

    def rice(x, y):
        nx, ny = (x - cx) / (w / 2), (y - top - h * 0.55) / h
        d = -0.55 * nx - 0.8 * ny
        base = 3 if d > 0.45 else 2 if d > 0.0 else 1 if d > -0.4 else 0
        grain = (int(x) * 5 + int(y) * 3) % 7
        return min(3, base + 1) if grain == 0 and base < 3 else base
    a.fill(shape, 'rice', rice, group=f'{name}-rice')
    nw = w * 0.18
    band = both(shape, rect(cx - nw, top + h * 0.6, cx + nw, top + h + 1))
    a.fill(band, 'nori', lambda x, y: 3 if abs(x - (cx - nw * 0.45)) < 0.55 else 2 if x < cx else 1,
           group=f'{name}-nori')


def rice_balls():
    a = Art()
    # A small wooden board under two rice balls, a slice of pickled radish beside them.
    a.fill(rect(4.5, 23.5, 27.5, 27.5), 'wood', lambda x, y: 2 if y < 24.6 else 1 if y < 26.6 else 0, group='board')
    onigiri(a, 20, 12, 12, 11.6, 'back')
    onigiri(a, 12.5, 10.5, 13.6, 13.2, 'front')
    a.fill(ell(25, 22.4, 2.4, 1.2), 'yellow', 2, group='pickle')
    return a


def steamed_bun():
    a = Art()
    steam(a, [13, 16, 19], 5, 10)
    # A small bamboo steamer, its lid off, and one bun sitting in it.
    a.fill(ell(16, 28, 7.4, 1.5), 'shade', 1)
    a.fill(anyof(rect(8.5, 21.5, 23.5, 27.4), ell(16, 27.4, 7.5, 1.7)), 'bamboo', cyl(8.5, 23.5), group='steamer')
    a.dot([(x, 24) for x in range(9, 24) if x % 3 != 0], 'bamboo', 0, group='steamer')
    a.fill(ell(16, 21.5, 7.5, 2.4), 'bamboo', 3, group='rim')
    a.fill(ell(16, 21.7, 6.4, 1.6), 'bambooIn', 1, group='inside')
    # The bun: a soft dome, its pleats gathered into a twist on top.
    bun = both(ell(16, 21.2, 5, 5), lambda x, y: y <= 22.2)
    a.fill(bun, 'dough', sphere(14.8, 18.4, 5, 5), group='bun')
    for k in (-2, -1, 1, 2):
        line(a, 16 + k * 0.4, 16.6, 16 + k * 1.8, 19.4 - abs(k) * 0.3, 'dough', 0.35, 0, group='bun')
    a.fill(ell(16, 16.4, 1.2, 0.9), 'dough', 3, group='bun')
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


def rose():
    a = Art()
    # One rose lying across, its stem tied with a ribbon.
    line(a, 5, 30, 18, 13, 'stem', 0.8, group='stem')
    a.fill(leaf_shape(11.5, 22, 6.5, 2.6, -2.45), 'leaf', leaf_shade(11.5, 22, -2.45), group='leaf1')
    a.fill(leaf_shape(14, 18.6, 6.5, 2.5, -0.15), 'leaf', leaf_shade(14, 18.6, -0.15), group='leaf2')
    a.dot([(8, 25), (10, 24), (7, 28)], 'stem', 0, group='stem')
    cx, cy = 21, 9.5
    a.fill(anyof(ell(cx - 3.6, cy + 1.8, 3.4, 3.0), ell(cx + 3.4, cy + 2, 3.4, 3.0), ell(cx, cy + 3.4, 3.6, 2.6)), 'red',
           sphere(cx - 2, cy, 7, 6), group='outer')
    a.fill(ell(cx, cy, 4.6, 4.4), 'red', sphere(cx - 1.4, cy - 1.4, 4.6, 4.4), group='cup')
    a.fill(both(ell(cx, cy - 0.8, 2.8, 2.3), lambda x, y: y < cy + 0.4), 'red', 1, group='curl')
    a.dot([(cx - 1, cy - 2), (cx, cy - 3), (cx + 1, cy - 2), (cx - 2, cy - 1)], 'red', 0, group='curl')
    a.fill(anyof(ell(cx - 3.2, cy + 5, 1.8, 0.9), ell(cx - 0.6, cy + 6, 1.8, 0.9)), 'leaf', 1, group='sepal')
    return a


def tulip_head(a, cx, cy, mat, group):
    cup = poly([(cx - 3, cy - 2.2), (cx - 1.4, cy - 0.6), (cx, cy - 3.2), (cx + 1.4, cy - 0.6), (cx + 3, cy - 2.2),
                (cx + 3.1, cy + 1.2), (cx + 1.7, cy + 3.2), (cx - 1.7, cy + 3.2), (cx - 3.1, cy + 1.2)])
    a.fill(cup, mat, sphere(cx - 1, cy, 3.4, 3.6), group=group)
    a.dot([(cx, cy - 1), (cx, cy), (cx, cy + 1)], mat, 0, group=group)


def tulips():
    a = Art()
    for x0, y0 in ((10, 9), (16, 5), (22, 9)):
        line(a, x0, y0 + 3, 16, 24, 'stem', 0.6, group='stems')
    a.fill(leaf_shape(16, 22, 11, 2.0, -2.2), 'leaf', leaf_shade(16, 22, -2.2), group='lf1')
    a.fill(leaf_shape(16, 22, 11, 2.0, -0.95), 'leaf', leaf_shade(16, 22, -0.95), group='lf2')
    tulip_head(a, 10, 9, 'pink', 't1')
    tulip_head(a, 22, 9, 'yellow', 't3')
    tulip_head(a, 16, 5.5, 'red', 't2')
    # Wrapped in white paper with a blue ribbon.
    edge = [(6.5, 14.5), (8.5, 17), (10.5, 14), (12.5, 16.6), (14.5, 13.8), (16.5, 16.4), (18.5, 13.8), (20.5, 16.6),
            (22.5, 14), (24.5, 16.8), (25.5, 14.6)]
    a.fill(poly(edge + [(19.5, 30), (12.5, 30)]), 'white', cyl(6, 26), group='paper')
    a.dot([(9, 18), (10, 19), (22, 18), (21, 19)], 'white', 0, group='paper')
    a.fill(rect(12.5, 22.5, 19.5, 24.4), 'blue', lambda x, y: 2 if y < 23.4 else 1, group='ribbon')
    a.fill(anyof(heart(12, 23.4, 1.9), heart(20, 23.4, 1.9)), 'blue', 1, group='bow')
    return a


def sunflower():
    a = Art()
    line(a, 15, 14, 17, 30, 'stem', 0.9, group='stem')
    a.fill(leaf_shape(16, 22, 8, 3.4, -2.75), 'leaf', leaf_shade(16, 22, -2.75), group='lf1')
    a.fill(leaf_shape(16.5, 19, 8, 3.2, -0.3), 'leaf', leaf_shade(16.5, 19, -0.3), group='lf2')
    cx, cy = 15, 10.5
    for k in range(14):
        ang = k * 2 * math.pi / 14
        px, py = cx + math.cos(ang) * 6.2, cy + math.sin(ang) * 6.0
        a.fill(leaf_shape(cx + math.cos(ang) * 3.4, cy + math.sin(ang) * 3.3, 5.2, 1.7, ang), 'yellow',
               lambda x, y, ang=ang: 3 if math.cos(ang) + math.sin(ang) < -0.9 else 2 if math.sin(ang) < 0.3 else 1,
               group=f'petal{k % 2}')
    a.fill(ell(cx, cy, 4.2, 4.0), 'seed', sphere(cx, cy, 4.2, 4.0, hi=False), group='center')
    a.dot([(x, y) for x in range(10, 20) for y in range(6, 15)
           if (x + y) % 2 == 0 and ((x + 0.5 - cx) / 4.2) ** 2 + ((y + 0.5 - cy) / 4.0) ** 2 <= 0.75], 'seed', 0,
          group='center')
    a.dot([(13, 8), (14, 8)], 'seed', 3, group='center')
    return a


def succulent():
    a = Art()
    # A little white pot with pebbles, the rosette sitting in it.
    a.fill(ell(16, 29.2, 8.5, 1.6), 'shade', 1)
    pot = poly([(10, 21), (22, 21), (20.8, 29), (11.2, 29)])
    a.fill(pot, 'porc', cyl(10, 22), group='pot')
    a.fill(both(pot, lambda x, y: 25 <= y <= 26.2), 'blue', cyl(10, 22), group='band')
    a.fill(ell(16, 21, 6.6, 1.8), 'porc', 3, group='rim')
    rings = (
        (8.4, 2.8, 0, (math.pi + 0.25, math.pi + 0.9, 1.5 * math.pi, 2 * math.pi - 0.9, 2 * math.pi - 0.25)),
        (6.2, 2.5, 1, (math.pi + 0.62, 1.5 * math.pi - 0.26, 1.5 * math.pi + 0.26, 2 * math.pi - 0.62)),
        (3.8, 2.0, 2, (1.5 * math.pi,)),
    )
    for ring, (length, width, lift, angles) in enumerate(rings):
        for k, ang in enumerate(angles):
            g = f'ring{ring}-{k}'
            base = leaf_shade(16, 21, ang)
            a.fill(leaf_shape(16, 21, length, width, ang), 'agave',
                   lambda x, y, base=base, lift=lift: min(3, base(x, y) + lift), group=g)
            if ring == 0:
                tx, ty = 16 + math.cos(ang) * (length - 0.6), 21 + math.sin(ang) * (length - 0.6)
                a.dot([(tx, ty)], 'pink', 1, group=g)
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


ART = {
    'BARISTA': {'latte': latte, 'icedAmericano': iced_americano, 'caramelMacchiato': caramel_macchiato,
                'matchaLatte': matcha_latte, 'chipFrappe': chip_frappe},
    'CHEF': {'omurice': omurice, 'ramen': ramen, 'pancakes': pancakes, 'riceBalls': rice_balls, 'steamedBun': steamed_bun},
    'GARDENER': {'rose': rose, 'tulips': tulips, 'sunflower': sunflower, 'succulent': succulent, 'flowers': flowers},
}

DESCRIBE = {
    'latte': 'a cup and saucer, a heart in the milk', 'icedAmericano': 'iced coffee in a clear cup with a straw',
    'caramelMacchiato': 'milk, espresso and foam in a glass, caramel over it',
    'matchaLatte': 'a stone mug of matcha latte with a heart in the milk',
    'chipFrappe': 'a chocolate chip frappé under whipped cream and a dome lid', 'omurice': 'omurice with a ketchup heart',
    'ramen': 'a small bowl of ramen with its toppings', 'pancakes': 'a stack with syrup and butter',
    'riceBalls': 'two rice balls in nori on a wooden board', 'steamedBun': 'a steamed bun in a bamboo steamer', 'rose': 'a single rose lying across',
    'tulips': 'three tulips wrapped in paper', 'sunflower': 'a sunflower', 'succulent': 'a succulent in a little pot',
    'flowers': 'wildflowers in paper',
}

CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' + ''.join(chr(c) for c in range(0xC0, 0x250) if c not in (0xD7, 0xF7))

rendered = {job: {kind: fn().render() for kind, fn in kinds.items()} for job, kinds in ART.items()}
colors = sorted({c for kinds in rendered.values() for grid in kinds.values() for row in grid for c in row if c})
assert len(colors) <= len(CHARS), len(colors)
key = {c: CHARS[i] for i, c in enumerate(colors)}
frames = {job: {kind: [''.join(key[c] if c else '.' for c in row) for row in grid] for kind, grid in kinds.items()}
          for job, kinds in rendered.items()}

out = ["""import type { ITEMS, ItemGift, ItemJob } from '../gifts';
import type { Frame, Palette } from './pixel-sprite';

// What a barista, a cook or a gardener makes at work for one of us (docs/fun-improvements.md, 직업 이벤트),
// shown in the chat as it is handed over: a 32 × 32 picture for each item in gifts.ts, lit from the
// top left, outlined in a darker shade of each thing. Made by scripts/gift-art.py: change it there,
// not here.

export const GIFT_PALETTE: Palette = {
"""]
out += [f"  '{key[c]}': '{c}',\n" for c in colors]
out.append('};\n\n')
out.append('const GIFT_ART: { [J in ItemJob]: Record<(typeof ITEMS)[J][number], Frame> } = {\n')
for job, kinds in frames.items():
    out.append(f'  {job}: {{\n')
    for kind, rows in kinds.items():
        out.append(f'    // {DESCRIBE[kind]}\n    // prettier-ignore\n    {kind}: [\n')
        out += [f"      '{r}',\n" for r in rows]
        out.append('    ],\n')
    out.append('  },\n')
out.append('};\n\n')
out.append("""export const giftArt = (gift: ItemGift): Frame =>
  (GIFT_ART[gift.job] as Record<string, Frame>)[gift.item];
""")
open('src/features/buddy/pixel/gifts.ts', 'w', encoding='utf-8', newline='\n').write(''.join(out))
print('written', len(colors), 'colors')
