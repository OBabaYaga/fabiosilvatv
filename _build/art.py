# -*- coding: utf-8 -*-
"""Gera ilustrações SVG originais (uma por marca) para os cartões de oferta e a faixa rotativa.
Corre automaticamente a partir do build.py -> assets/brands/art-<id>.svg"""
import math, os

W = H = 400

def defs(c1, c2, c3, glow):
    return f'''<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset=".55" stop-color="{c2}"/><stop offset="1" stop-color="{c3}"/></linearGradient>
<radialGradient id="glow" cx=".72" cy=".38" r=".6"><stop offset="0" stop-color="{glow}" stop-opacity=".95"/><stop offset=".45" stop-color="{glow}" stop-opacity=".28"/><stop offset="1" stop-color="{glow}" stop-opacity="0"/></radialGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".45" stop-color="#f2b933"/><stop offset="1" stop-color="#b9740f"/></linearGradient>
<linearGradient id="goldd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6c94f"/><stop offset="1" stop-color="#8a5200"/></linearGradient>
<filter id="blur"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation="2"/></filter>
</defs>'''

def rays(cx, cy, n=14, op=.10, color="#fff"):
    out = []
    for i in range(n):
        a = i * 2 * math.pi / n
        b = a + math.pi / n * .55
        r = 700
        out.append(f'<polygon points="{cx},{cy} {cx+r*math.cos(a):.0f},{cy+r*math.sin(a):.0f} {cx+r*math.cos(b):.0f},{cy+r*math.sin(b):.0f}" fill="{color}" opacity="{op}"/>')
    return "".join(out)

def spark(x, y, s, color="#fff", op=.9):
    return (f'<path d="M{x} {y-s} Q{x+s*.12} {y-s*.12} {x+s} {y} Q{x+s*.12} {y+s*.12} {x} {y+s} '
            f'Q{x-s*.12} {y+s*.12} {x-s} {y} Q{x-s*.12} {y-s*.12} {x} {y-s}Z" fill="{color}" opacity="{op}"/>')

def sparks(pts, color="#fff"):
    return "".join(spark(x, y, s, color, o) for x, y, s, o in pts)

def coin(x, y, r, sym="€", rot=0, tilt=1.0):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale(1 {tilt})">'
            f'<circle r="{r}" fill="url(#goldd)"/><circle r="{r*.92}" fill="url(#gold)"/>'
            f'<circle r="{r*.72}" fill="none" stroke="#a8650a" stroke-width="{max(1.5, r*.05):.1f}" opacity=".7"/>'
            f'<text y="{r*.3:.1f}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="{r*.95:.0f}" fill="#9a5a05" opacity=".85">{sym}</text></g>')

def coin_stack(x, y, r, n):
    out = []
    for i in range(n):
        yy = y - i * r * .32
        out.append(f'<ellipse cx="{x}" cy="{yy+r*.2:.1f}" rx="{r}" ry="{r*.36:.1f}" fill="#8a5200"/>'
                   f'<ellipse cx="{x}" cy="{yy:.1f}" rx="{r}" ry="{r*.36:.1f}" fill="url(#gold)" stroke="#b9740f" stroke-width="1.5"/>')
    return "".join(out)

def wheel(cx, cy, r, a="#c0392b", b="#111", gold="#f2b933"):
    out = [f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#2b1a0a"/><circle cx="{cx}" cy="{cy}" r="{r*.97}" fill="none" stroke="url(#gold)" stroke-width="{r*.06:.1f}"/>']
    n = 18
    for i in range(n):
        a0 = i * 2 * math.pi / n
        a1 = (i + 1) * 2 * math.pi / n
        R, r2 = r * .88, r * .52
        p = [(cx + R*math.cos(a0), cy + R*math.sin(a0)), (cx + R*math.cos(a1), cy + R*math.sin(a1)),
             (cx + r2*math.cos(a1), cy + r2*math.sin(a1)), (cx + r2*math.cos(a0), cy + r2*math.sin(a0))]
        d = f"M{p[0][0]:.1f} {p[0][1]:.1f} L{p[1][0]:.1f} {p[1][1]:.1f} L{p[2][0]:.1f} {p[2][1]:.1f} L{p[3][0]:.1f} {p[3][1]:.1f}Z"
        out.append(f'<path d="{d}" fill="{a if i%2 else b}" stroke="{gold}" stroke-width="1"/>')
    out.append(f'<circle cx="{cx}" cy="{cy}" r="{r*.5}" fill="#3a230c" stroke="url(#gold)" stroke-width="{r*.03:.1f}"/>'
               f'<circle cx="{cx}" cy="{cy}" r="{r*.2}" fill="url(#gold)"/>')
    for k in range(4):
        t = k * math.pi / 2
        out.append(f'<line x1="{cx}" y1="{cy}" x2="{cx+r*.46*math.cos(t):.1f}" y2="{cy+r*.46*math.sin(t):.1f}" stroke="url(#gold)" stroke-width="{r*.04:.1f}"/>')
    return "".join(out)

def card(x, y, rot, rank, suit, red=True, s=1.0):
    col = "#d62839" if red else "#14161c"
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><rect x="-45" y="-65" width="90" height="130" rx="9" fill="#fff" stroke="#d9d9d9"/>'
            f'<text x="-34" y="-36" font-family="Arial Black,Arial" font-weight="900" font-size="26" fill="{col}">{rank}</text>'
            f'<text x="0" y="22" text-anchor="middle" font-family="Arial" font-size="54" fill="{col}">{suit}</text></g>')

def shield(cx, cy, s, fill1="#38a8a0", fill2="#0e4a52"):
    d = f"M0 {-s} L{s*.82} {-s*.62} L{s*.82} {s*.1} Q{s*.82} {s*.7} 0 {s} Q{-s*.82} {s*.7} {-s*.82} {s*.1} L{-s*.82} {-s*.62}Z"
    return (f'<g transform="translate({cx} {cy})"><defs><linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{fill1}"/><stop offset="1" stop-color="{fill2}"/></linearGradient></defs>'
            f'<path d="{d}" fill="url(#sh)" stroke="#e8f7f4" stroke-width="{s*.05:.1f}"/>'
            f'<path d="M{-s*.34} {s*.02} L{-s*.08} {s*.3} L{s*.4} {-s*.3}" fill="none" stroke="#fff" stroke-width="{s*.14:.1f}" stroke-linecap="round" stroke-linejoin="round"/></g>')

def gift(cx, cy, s, c1="#9b6bff", c2="#4b2a9a", ribbon="#ffd23f"):
    return (f'<g transform="translate({cx} {cy})"><rect x="{-s}" y="{-s*.45}" width="{s*2}" height="{s*1.35}" rx="{s*.1:.1f}" fill="{c2}"/>'
            f'<rect x="{-s*1.08}" y="{-s*.85}" width="{s*2.16}" height="{s*.52}" rx="{s*.1:.1f}" fill="{c1}"/>'
            f'<rect x="{-s*.17}" y="{-s*.85}" width="{s*.34}" height="{s*1.75}" fill="{ribbon}"/>'
            f'<path d="M0 {-s*.85} C{-s*.9} {-s*1.6} {-s*.95} {-s*.6} 0 {-s*.85} C{s*.9} {-s*1.6} {s*.95} {-s*.6} 0 {-s*.85}Z" fill="{ribbon}"/></g>')

def helm(cx, cy, r, col="#f2b933"):
    out = [f'<g transform="translate({cx} {cy})"><circle r="{r}" fill="none" stroke="{col}" stroke-width="{r*.12:.1f}"/><circle r="{r*.28}" fill="{col}"/>']
    for i in range(8):
        t = i * math.pi / 4
        x2, y2 = (r*1.3)*math.cos(t), (r*1.3)*math.sin(t)
        out.append(f'<line x1="0" y1="0" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{col}" stroke-width="{r*.1:.1f}" stroke-linecap="round"/><circle cx="{x2:.1f}" cy="{y2:.1f}" r="{r*.11:.1f}" fill="{col}"/>')
    out.append("</g>")
    return "".join(out)

def ball(cx, cy, r):
    pts = []
    for i in range(5):
        t = i * 2 * math.pi / 5 - math.pi / 2
        pts.append(f"{cx + r*.42*math.cos(t):.1f},{cy + r*.42*math.sin(t):.1f}")
    out = [f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#fff"/><polygon points="{" ".join(pts)}" fill="#111"/>']
    for i in range(5):
        t = i * 2 * math.pi / 5 - math.pi / 2
        x1, y1 = cx + r*.42*math.cos(t), cy + r*.42*math.sin(t)
        x2, y2 = cx + r*.92*math.cos(t), cy + r*.92*math.sin(t)
        out.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#111" stroke-width="3"/><circle cx="{x2:.1f}" cy="{y2:.1f}" r="{r*.16:.1f}" fill="#111"/>')
    out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#111" stroke-width="2"/>')
    return "".join(out)

def slot7(x, y, s, col="#ff3b5c"):
    return (f'<g transform="translate({x} {y})"><rect x="{-s*.7}" y="{-s*.95}" width="{s*1.4}" height="{s*1.9}" rx="{s*.18:.1f}" fill="#fff" stroke="#e5e5e5" stroke-width="3"/>'
            f'<text y="{s*.5:.0f}" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="{s*1.55:.0f}" fill="{col}" stroke="#7a0f26" stroke-width="2">7</text></g>')

def svg(body, c1, c2, c3, glow, ray_col="#fff", sp_col="#fff"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">'
            f'{defs(c1, c2, c3, glow)}<rect width="{W}" height="{H}" fill="url(#bg)"/>'
            f'{rays(290, 150, 16, .08, ray_col)}<rect width="{W}" height="{H}" fill="url(#glow)"/>{body}</svg>')

ART = {}

# Royal XO: coroa/cobre sobre azul-marinho, moedas e brilhos dourados
ART["royalxo"] = svg(
    coin_stack(300, 340, 52, 6) + coin(250, 230, 44, "€", -14) + coin(345, 215, 36, "€", 18, .92) + coin(205, 330, 30, "€", 10, .85) +
    '<g transform="translate(300 118)"><path d="M-60 40 L-70 -20 L-35 10 L0 -40 L35 10 L70 -20 L60 40Z" fill="url(#gold)" stroke="#b9740f" stroke-width="3"/>'
    '<rect x="-60" y="40" width="120" height="14" rx="5" fill="url(#goldd)"/>'
    '<circle cx="-70" cy="-22" r="7" fill="#fff6c8"/><circle cx="0" cy="-42" r="8" fill="#fff6c8"/><circle cx="70" cy="-22" r="7" fill="#fff6c8"/>'
    '<circle cx="0" cy="22" r="9" fill="#e0453a"/></g>' +
    sparks([(150, 90, 14, .9), (360, 60, 10, .8), (110, 200, 9, .6), (380, 290, 12, .8), (215, 150, 8, .7)], "#ffe9a8"),
    "#081224", "#16294d", "#6a3a22", "#e2995a")

# SafeCasino: roleta + escudo, tons verde-azulado
ART["safecasino"] = svg(
    wheel(285, 235, 118, "#1b8d86", "#0b2e33", "#9fe7de") +
    shield(300, 140, 62) + coin(165, 330, 34, "€", -10) + coin(375, 335, 28, "€", 14) +
    sparks([(150, 110, 13, .9), (360, 40, 10, .8), (100, 230, 9, .6), (230, 60, 8, .7)], "#d6fff8"),
    "#0a2a30", "#1f5a60", "#c9cf9a", "#53d2c6", "#d6fff8")

# CaptainsBet: mar/pirata, leme e ouro, amarelo sobre azul-noite
ART["captainsbet"] = svg(
    helm(295, 190, 82) + coin_stack(210, 365, 46, 5) + coin(360, 330, 34, "€", 14) +
    '<path d="M0 340 Q60 310 120 340 T240 340 T360 340 T480 340 V400 H0Z" fill="#0b2f57" opacity=".75"/>'
    '<path d="M0 365 Q60 340 120 365 T240 365 T360 365 T480 365 V400 H0Z" fill="#06203d" opacity=".9"/>' +
    sparks([(130, 90, 13, .9), (365, 60, 10, .8), (90, 220, 9, .6), (230, 60, 8, .7)], "#fff3b0"),
    "#06142b", "#0f3a66", "#1a5da0", "#f2c230", "#9ccfff")

# Betlabel: verde desportivo, bola e cartas
ART["betlabel"] = svg(
    card(235, 245, -18, "A", "♠", False, .95) + card(325, 235, 14, "K", "♥", True, .95) +
    ball(285, 140, 52) + coin(165, 335, 34, "€", -8) + coin(370, 345, 28, "€", 14) +
    '<path d="M0 395 H400" stroke="#fff" stroke-width="3" opacity=".25"/>' +
    sparks([(120, 100, 12, .8), (370, 60, 10, .8), (95, 240, 9, .6), (215, 70, 8, .7)], "#d7ffe0"),
    "#06260f", "#0c6a35", "#16a34a", "#46e07b", "#c9ffd8")

# 22bit: vermelho/azul-petróleo, slots 7 e moedas cripto
ART["22bit"] = svg(
    slot7(210, 215, 62, "#ff3b5c") + slot7(290, 195, 62, "#19c1c1") + slot7(370, 215, 62, "#ff3b5c") +
    coin(180, 345, 34, "€", -10) + coin(345, 335, 38, "€", 12) +
    sparks([(120, 90, 14, .9), (350, 55, 11, .8), (90, 220, 9, .6), (245, 60, 8, .8)], "#fff"),
    "#1a0710", "#4b1030", "#0f6b73", "#ff4d6d", "#ffd0da")

def write_all(root):
    d = os.path.join(root, "assets", "brands")
    os.makedirs(d, exist_ok=True)
    for k, v in ART.items():
        with open(os.path.join(d, f"art-{k}.svg"), "w", encoding="utf-8") as f:
            f.write(v)

if __name__ == "__main__":
    write_all(os.path.join(os.path.dirname(__file__), ".."))
