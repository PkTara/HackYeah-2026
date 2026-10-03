"""Pixel-art sport pets (mascots), one per sport mode.

Each pet is a 32x32 grid of palette keys, painted in layers with `paint`
(strings are written at a row/column; '.' leaves the pixel untouched).
Running this script writes, per pet, into assets/pets/:
  <name>.svg        crisp vector version (no dependencies)
  <name>.png        10x upscaled still   (needs Pillow)
  <name>.gif        2-frame idle animation (needs Pillow)
  <name>-sheet.png  1x sprite sheet with both frames side by side (needs Pillow)

Usage: python3 tools/pixel_pets.py
"""

from pathlib import Path

SIZE = 32
SCALE = 10
OUT = Path(__file__).resolve().parent.parent / "assets" / "pets"


def blank():
    return [["."] * SIZE for _ in range(SIZE)]


def paint(grid, row, col, text):
    for i, ch in enumerate(text):
        if ch != "." and 0 <= col + i < SIZE:
            grid[row][col + i] = ch


def limb(grid, pixels, outline="O"):
    """Paint (row, col, key) pixels, then outline their empty 4-neighbours."""
    for r, c, key in pixels:
        grid[r][c] = key
    for r, c, _ in pixels:
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            rr, cc = r + dr, c + dc
            if 0 <= rr < SIZE and 0 <= cc < SIZE and grid[rr][cc] == ".":
                grid[rr][cc] = outline


# --------------------------------------------------------------------------
# Climbing monkey: hangs from a climbing hold, wears a red harness.

MONKEY_PALETTE = {
    "O": "#2b1a10",  # outline
    "B": "#9a5f2e",  # fur
    "b": "#74431d",  # fur shade
    "L": "#c4834a",  # fur light
    "T": "#f5cf9f",  # face / belly
    "E": "#1b1b1b",  # eye
    "X": "#ffffff",  # eye highlight
    "P": "#f59c9c",  # cheeks / inner ear
    "R": "#e2463f",  # harness
    "G": "#4fbf73",  # climbing hold
    "g": "#2f8a4f",  # hold shade
    "H": "#a8f5bf",  # hold highlight
    "C": "#f2f2f2",  # chalk dust
}


def monkey(blink=False):
    g = blank()
    # climbing hold
    paint(g, 1, 21, "OOOOOOO")
    paint(g, 2, 20, "OGGGGGGGO")
    paint(g, 3, 19, "OGHHGGGGGgO")
    paint(g, 4, 19, "OGHGGGGGGgO")
    paint(g, 5, 19, "OGGGGGGGggO")
    paint(g, 6, 20, "OgggggggO")
    paint(g, 7, 21, "OOOOOOO")
    # chalk puffs
    paint(g, 2, 30, "C")
    paint(g, 4, 31, "C")
    paint(g, 1, 18, "C")
    # curly tail (behind body)
    paint(g, 20, 22, "OOOO")
    paint(g, 21, 21, "OBBBBO")
    paint(g, 22, 21, "OBOOBO")
    paint(g, 23, 21, "OO.OBO")
    paint(g, 24, 24, "OBO")
    paint(g, 25, 19, "OOOOOOBO")
    paint(g, 26, 18, "OBBBBBBBO")
    paint(g, 27, 19, "OOOOOOOO")
    # body + harness + legs
    paint(g, 19, 8, "OBBBBBBBBBO")
    paint(g, 20, 8, "OBBTTTTTBBO")
    paint(g, 21, 8, "OBTTTTTTTBO")
    paint(g, 22, 8, "OBTTTTTTTBO")
    paint(g, 23, 8, "ORRRRRRRRRO")
    paint(g, 24, 8, "OBRTTTTTRBO")
    paint(g, 25, 8, "OBBRBOBRBBO")
    paint(g, 26, 8, "OBBBOOOBBBO")
    paint(g, 27, 7, "OTTTTO.OTTTTO")
    paint(g, 28, 7, "OOOOO...OOOOO")
    # raised arm gripping the hold
    limb(g, [(r, 24, "B") for r in range(8, 17)] + [(r, 25, "b") for r in range(8, 17)])
    limb(g, [(17, 23, "B"), (17, 24, "b"), (18, 22, "B"), (18, 23, "b"),
             (19, 20, "B"), (19, 21, "B"), (19, 22, "b"), (20, 18, "B"), (20, 19, "B")])
    g[19][18] = "B"
    g[20][18] = "B"
    # hand over the front of the hold
    paint(g, 4, 22, "OOOOOO")
    paint(g, 5, 22, "OLBLBO")
    paint(g, 6, 22, "OBBBBO")
    paint(g, 7, 22, "OBBBBO")
    # other arm waving
    limb(g, [(20, 7, "B"), (21, 6, "B"), (21, 7, "b"), (22, 5, "B"), (22, 6, "b"),
             (23, 4, "T"), (23, 5, "T"), (24, 4, "T"), (24, 3, "T")])
    # head
    paint(g, 7, 9, "OOOOOOO")
    paint(g, 8, 7, "OOBBBBBBBOO")
    paint(g, 9, 6, "OBBLLBBBBBBBO")
    paint(g, 10, 5, "OBBLBBBBBBBBBBO")
    paint(g, 11, 5, "OBBTTTTBTTTTBBO")
    paint(g, 12, 5, "OBTTTTTTTTTTTBO")
    if blink:
        paint(g, 13, 5, "OBTTTTTTTTTTTBO")
        paint(g, 14, 5, "OBPTEETTTEETPBO")
    else:
        paint(g, 13, 5, "OBTTEXTTTEXTTBO")
        paint(g, 14, 5, "OBPTEETTTEETPBO")
    paint(g, 15, 5, "OBTTTTOTOTTTTBO")
    paint(g, 16, 5, "OBTTTOTTTOTTTBO")
    paint(g, 17, 6, "OBTTTOOOTTTBO")
    paint(g, 18, 7, "OOTTTTTTTOO")
    paint(g, 19, 9, "OOOOOOO")
    # ears
    paint(g, 10, 3, "OO")
    paint(g, 11, 2, "OTTO")
    paint(g, 12, 2, "OTPO")
    paint(g, 13, 2, "OTTO")
    paint(g, 14, 3, "OO")
    paint(g, 10, 21, "OO")
    paint(g, 11, 19, "OTTO")
    paint(g, 12, 19, "OPTO")
    paint(g, 13, 19, "OTTO")
    paint(g, 14, 21, "OO")
    return g


# --------------------------------------------------------------------------
# Running gazelle: mid-gallop, red sweatband, speed lines behind.

GAZELLE_PALETTE = {
    "O": "#2a1a0e",  # outline
    "A": "#d9954a",  # tan coat
    "a": "#b0703a",  # far legs (shade)
    "L": "#f0b870",  # coat highlight
    "W": "#fff6e8",  # white face / belly
    "K": "#3a2a20",  # side stripe, nose, hooves, tail
    "H": "#a88a6c",  # horn
    "h": "#6e5642",  # horn ring
    "E": "#1b1b1b",  # eye
    "X": "#ffffff",  # eye highlight
    "P": "#f59c9c",  # cheek / inner ear
    "R": "#e2463f",  # sweatband
    "r": "#a82e2a",  # sweatband tail
    "S": "#9fd4ff",  # speed lines
}


def gazelle(stride=False):
    g = blank()
    # horns (swept back, ringed)
    paint(g, 1, 18, "OO.OO")
    paint(g, 2, 17, "OHOOHO")
    paint(g, 3, 17, "OhOOhO")
    paint(g, 4, 18, "OHOOHO")
    paint(g, 5, 18, "OhOOhO")
    paint(g, 6, 19, "OHOOHO")
    paint(g, 7, 19, "OhOOhO")
    # ear pointing back
    paint(g, 8, 13, "OOOO")
    paint(g, 9, 12, "OPPPA")
    paint(g, 10, 13, "OOOO")
    # head with sweatband
    paint(g, 8, 19, "OOOOOOO")
    paint(g, 9, 17, "OOAAAAAAAOO")
    paint(g, 10, 16, "ORRRRRRRRRRRO")
    paint(g, 11, 16, "OAAAAAAAEXAAO")
    paint(g, 12, 16, "OAAAAAAAEEAAAAO")
    paint(g, 13, 16, "OAAAAAPAEEWWWWO")
    paint(g, 14, 16, "OAAAAAAWWWWWWKO")
    paint(g, 15, 17, "OAAAWWWWWOWWO")
    paint(g, 16, 16, "OAAOOOOOOOOO")
    # sweatband tails flapping behind
    paint(g, 11, 11, "OOOOO")
    paint(g, 12, 10, "ORRRRR")
    paint(g, 13, 9, "OrrOOOO")
    paint(g, 14, 9, "OO")
    # neck + body
    paint(g, 17, 15, "OAAAAO")
    paint(g, 18, 5, "OOOOOOOOOOAAAAAO")
    paint(g, 19, 3, "OOLLLLLLLLAAAAAAAO")
    paint(g, 20, 2, "OAAAAAAAAAAAAAAAAAO")
    paint(g, 21, 2, "OKKKKKKKKKKKKKKKKKO")
    paint(g, 22, 2, "OWWWWWWWWWWWWWWWWWO")
    paint(g, 23, 3, "OWWWWWWWWWWWWWWWO")
    paint(g, 24, 4, "OOOOOOOOOOOOOOO")
    limb(g, [(19, 1, "K"), (19, 2, "K"), (20, 1, "K")])  # tail tuft

    def leg(points, key):
        # points: (row, col) of the left pixel of a 2px-wide leg; last one is the hoof
        px = []
        for i, (r, c) in enumerate(points):
            k = "K" if i == len(points) - 1 else key
            px += [(r, c, k), (r, c + 1, k)]
        return px

    if stride:  # legs gathered under the body
        far = leg([(24, 9), (25, 8), (26, 7), (27, 6)], "a") + leg([(24, 13), (25, 14), (26, 15), (27, 16)], "a")
        near = leg([(24, 6), (25, 7), (26, 8), (27, 9), (28, 9)], "A") + leg([(24, 16), (25, 15), (26, 14), (27, 13), (28, 12)], "A")
    else:  # flying gallop: legs stretched out
        far = leg([(24, 9), (25, 9), (26, 8), (27, 8)], "a") + leg([(24, 13), (25, 13), (26, 14), (27, 14)], "a")
        near = leg([(24, 6), (25, 5), (26, 4), (27, 3), (28, 2)], "A") + leg([(24, 16), (25, 17), (26, 18), (27, 19), (28, 20)], "A")
    limb(g, far)
    limb(g, near)
    # speed lines
    paint(g, 12, 2, "SSSS" if not stride else ".SSS")
    paint(g, 15, 0, "SSSSSS" if not stride else "SSSSS")
    paint(g, 17, 3, "SSS")
    return g


PETS = {
    "climbing-monkey": (MONKEY_PALETTE, [monkey(), monkey(blink=True)], [2400, 160]),
    "running-gazelle": (GAZELLE_PALETTE, [gazelle(), gazelle(stride=True)], [180, 180]),
}


def to_svg(grid, palette):
    rects = []
    for r, row in enumerate(grid):
        for c, key in enumerate(row):
            if key != ".":
                rects.append(f'<rect x="{c}" y="{r}" width="1" height="1" fill="{palette[key]}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" '
            f'width="{SIZE * SCALE}" height="{SIZE * SCALE}" shape-rendering="crispEdges">\n'
            + "\n".join(rects) + "\n</svg>\n")


def to_image(grid, palette):
    from PIL import Image

    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    for r, row in enumerate(grid):
        for c, key in enumerate(row):
            if key != ".":
                hexcol = palette[key].lstrip("#")
                img.putpixel((c, r), tuple(int(hexcol[i:i + 2], 16) for i in (0, 2, 4)) + (255,))
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (palette, frames, durations) in PETS.items():
        (OUT / f"{name}.svg").write_text(to_svg(frames[0], palette))
        try:
            from PIL import Image
        except ImportError:
            print(f"{name}: wrote SVG only (install Pillow for PNG/GIF)")
            continue
        imgs = [to_image(f, palette) for f in frames]
        big = [i.resize((SIZE * SCALE, SIZE * SCALE), Image.NEAREST) for i in imgs]
        big[0].save(OUT / f"{name}.png")
        big[0].save(OUT / f"{name}.gif", save_all=True, append_images=big[1:],
                    duration=durations, loop=0, disposal=2)
        sheet = Image.new("RGBA", (SIZE * len(imgs), SIZE), (0, 0, 0, 0))
        for i, img in enumerate(imgs):
            sheet.paste(img, (i * SIZE, 0))
        sheet.save(OUT / f"{name}-sheet.png")
        print(f"{name}: wrote SVG, PNG, GIF and sprite sheet")


if __name__ == "__main__":
    main()
