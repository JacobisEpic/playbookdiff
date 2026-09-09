"""Regenerates the social preview card at app/opengraph-image.png.

Run from the website directory with Pillow available:

    python3 scripts/generate-og-image.py

The card is a static asset, generated the same way the favicon is: it uses the
site's own typefaces and brand artwork so a shared link looks like the page it
opens. Re-run it only when the wordmark, the mascots, or the headline change.
"""

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1200, 630
PAPER = (251, 250, 247)
INK = (18, 17, 15)
MUTED = (111, 107, 97)
LINE = (231, 229, 221)
SUNK = (242, 241, 236)

card = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
draw = ImageDraw.Draw(card)

sans_600 = ImageFont.truetype("public/fonts/plex-sans-600.woff2", 62)
sans_400 = ImageFont.truetype("public/fonts/plex-sans-400.woff2", 26)
mono_400 = ImageFont.truetype("public/fonts/plex-mono-400.woff2", 24)

margin = 76

wordmark = Image.open("public/brand/wordmark.png").convert("RGBA")
wordmark = wordmark.resize((240, round(240 * wordmark.height / wordmark.width)), Image.LANCZOS)
card.paste(wordmark, (margin, margin), wordmark)

mascots = Image.open("public/brand/mascots-reading.png").convert("RGBA")
mascots = mascots.resize((364, 297), Image.LANCZOS)
card.paste(mascots, (WIDTH - margin - 364, 196), mascots)

draw.text((margin, 214), "Same code.", font=sans_600, fill=INK)
draw.text((margin, 286), "Different playbook.", font=sans_600, fill=INK)
draw.text(
    (margin, 386),
    "The instructions, skills, and MCP servers\neach coding agent effectively receives.",
    font=sans_400,
    fill=MUTED,
    spacing=10,
)

# One command, on the site's own sunk surface.
box = (margin, 494, margin + 396, 552)
draw.rounded_rectangle(box, radius=10, fill=SUNK, outline=LINE)
draw.text((margin + 18, 510), "$ npm install -g playbookdiff", font=mono_400, fill=INK)

draw.text((WIDTH - margin - 190, 522), "playbookdiff.dev", font=mono_400, fill=MUTED)

card.save("app/opengraph-image.png", optimize=True)
print("Wrote app/opengraph-image.png")
