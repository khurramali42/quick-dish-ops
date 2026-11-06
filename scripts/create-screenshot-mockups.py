#!/usr/bin/env python3
"""Compose real Chromium app screenshots into device marketing previews.

The application UI comes exclusively from docs/screenshots/{dashboard,pos,orders}.png.
No synthetic data, controls, charts, or fictitious app screen is drawn.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "screenshots"
OUT = ROOT / "docs" / "mockups"
OUT.mkdir(parents=True, exist_ok=True)
W, H = 2400, 1350

def font(size, bold=False):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for path in paths:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def background():
    im = Image.new("RGB", (W, H), (247, 248, 251))
    pix = im.load()
    for y in range(H):
        for x in range(W):
            # Nearly-white premium neutral gradient with warm orange glow at top-right.
            glow = max(0, 1 - ((x - 1990)**2 / 1250**2 + (y - 230)**2 / 780**2))
            base = int(248 - y / H * 7)
            pix[x, y] = (min(255, base + int(7 * glow)), min(255, base + int(3 * glow)), max(0, base - int(4 * glow)))
    return im

def shadow(canvas, rect, radius=40, blur=35, alpha=68):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x1,y1,x2,y2 = rect
    d.rounded_rectangle((x1, y1 + 21, x2, y2 + 21), radius=radius, fill=(16, 24, 40, alpha))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))

def device(canvas, imgpath, box, label=None, bezel=19, corner=32):
    source = Image.open(imgpath).convert("RGB")
    x, y, w, h = box
    shadow(canvas, (x, y, x+w, y+h), radius=corner, blur=32, alpha=65)
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle((x, y, x+w, y+h), corner, fill=(26, 31, 40), outline=(77, 87, 98), width=3)
    left, top, right, bottom = (x+bezel, y+bezel, x+w-bezel, y+h-bezel)
    inner_w, inner_h = right-left, bottom-top
    # Scale to FIT the entire real app screenshot, with no crop or invented UI.
    scale = min(inner_w/source.width, inner_h/source.height)
    sw, sh = round(source.width*scale), round(source.height*scale)
    sx, sy = left+(inner_w-sw)//2, top+(inner_h-sh)//2
    d.rectangle((left, top, right, bottom), fill=(241,243,247))
    resized = source.resize((sw,sh), Image.Resampling.LANCZOS)
    mask = Image.new("L", (sw,sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0,0,sw-1,sh-1),radius=max(6,corner-bezel),fill=255)
    canvas.paste(resized, (sx,sy), mask)
    if label:
        fontstyle = font(25,True)
        # A small label outside the screen, never cover screenshot pixels.
        d.text((x+8, y+h+18), label, fill=(77,83,92), font=fontstyle)

def headline(c, heading, subheading, accent="SPICE KITCHEN POS"):
    d = ImageDraw.Draw(c)
    d.rounded_rectangle((117,78,195,156), radius=23, fill=(231,77,37))
    d.line((141,115,151,126,174,103), fill="white",width=9,joint="curve")
    d.text((218,78),accent,fill=(39,43,51),font=font(56,True))
    d.text((120,176),heading,fill=(37,42,53),font=font(74,True))
    d.text((121,273),subheading,fill=(94,101,112),font=font(29))
    d.line((120,325,2280,325), fill=(226,228,234),width=2)

def badge(c,text,x,y):
    d=ImageDraw.Draw(c)
    f=font(24,True)
    bounds=d.textbbox((0,0),text,font=f)
    width=bounds[2]+48
    d.rounded_rectangle((x,y,x+width,y+54),radius=22,fill=(255,245,240),outline=(255,217,195),width=2)
    d.text((x+24,y+12),text,fill=(189,70,29),font=f)

dash=SRC/"dashboard.png"
pos=SRC/"pos.png"
orders=SRC/"orders.png"
for p in (dash,pos,orders):
    if not p.is_file():
        raise SystemExit("Missing real screenshot: "+str(p))
    verify=Image.open(p)
    verify.verify()

# HERO: real dashboard in a monitor + real POS in tablet.
hero=background().convert("RGBA")
headline(hero,"Restaurant management, in one place","Actual interface screenshots captured from the running app")
device(hero,dash,(120,405,1510,885),bezel=20,corner=34)
device(hero,pos,(1403,605,875,558),bezel=20,corner=34)
d=ImageDraw.Draw(hero)
badge(hero,"DASHBOARD",175,363)
badge(hero,"POINT OF SALE",1600,562)
hero.convert("RGB").save(OUT/"overview-device-mockup.png",optimize=True)

# Larger POS screen preview with product selection & cart readable.
detail=background().convert("RGBA")
headline(detail,"Point of sale and checkout","Actual POS screen, not a recreated design")
device(detail,pos,(188,392,2024,898),bezel=22,corner=38)
detail.convert("RGB").save(OUT/"pos-device-mockup.png",optimize=True)

# Orders preview
orders_im=background().convert("RGBA")
headline(orders_im,"Orders and kitchen workflow","Actual Orders screen from the application")
device(orders_im,orders,(188,392,2024,898),bezel=22,corner=38)
orders_im.convert("RGB").save(OUT/"orders-device-mockup.png",optimize=True)

for p in OUT.glob("*.png"):
    print(f"Generated {p.relative_to(ROOT)}: {p.stat().st_size:,} bytes")
