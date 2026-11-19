"""Gera tema-vice.css a partir de style.css e manager.css.
Cada declaracao com cor azul e repetida com a cor rodada para rosa/roxo (tema Vice),
com o prefixo :where(html.tema-vice) (nao muda a especificidade).
Correr de novo sempre que style.css ou manager.css mudarem:  python3 _build/tema_vice.py
"""
import re, colorsys, os, tinycss2
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRE = ':where(html.tema-vice)'

def rodar(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r/255, g/255, b/255)
    hd = h*360
    if 185 <= hd <= 255 and s > 0.12:
        h = ((hd + (75 if l < 0.32 else 118)) % 360)/360  # fundos escuros -> roxo, destaques -> rosa
        r2, g2, b2 = colorsys.hls_to_rgb(h, l, min(1, s*1.05))
        return round(r2*255), round(g2*255), round(b2*255)
    return None

HEX = re.compile(r'#([0-9a-fA-F]{3,8})\b')
RGB = re.compile(r'rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*([,/]\s*[\d.]+%?\s*)?\)')

def trocar(txt):
    mud = [False]
    def fh(m):
        v = m.group(1)
        if len(v) in (3, 4): v = ''.join(c*2 for c in v)
        if len(v) not in (6, 8): return m.group(0)
        n = rodar(int(v[0:2],16), int(v[2:4],16), int(v[4:6],16))
        if not n: return m.group(0)
        mud[0] = True
        return '#%02x%02x%02x' % n + v[6:]
    def fr(m):
        n = rodar(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if not n: return m.group(0)
        mud[0] = True
        a = m.group(4)
        if a: return 'rgba(%d, %d, %d, %s)' % (n + (a.strip(' ,/').strip(),))
        return 'rgb(%d, %d, %d)' % n
    out = RGB.sub(fr, HEX.sub(fh, txt))
    return out, mud[0]

def prefixar(sel):
    partes = []
    for s in sel.split(','):
        s = s.strip()
        if not s: continue
        if s.startswith(':root'): partes.append('html.tema-vice' + s[5:])  # tem de ganhar a :root
        elif re.match(r'html\b', s): partes.append('html.tema-vice' + s[4:])
        else: partes.append(PRE + ' ' + s)
    return ', '.join(partes)

def regras(nodes, ind=''):
    out = []
    for n in nodes:
        if n.type == 'qualified-rule':
            sel = tinycss2.serialize(n.prelude).strip()
            if re.search(r'@|^\d|from|to\b', sel) and '{' in sel: continue
            decls = tinycss2.parse_declaration_list(n.content, skip_comments=True, skip_whitespace=True)
            novas = []
            for d in decls:
                if d.type != 'declaration': continue
                val = tinycss2.serialize(d.value).strip()
                nv, m = trocar(val)
                if m: novas.append('%s: %s%s;' % (d.name, nv, ' !important' if d.important else ''))
            if novas: out.append('%s%s { %s }' % (ind, prefixar(sel), ' '.join(novas)))
        elif n.type == 'at-rule' and n.lower_at_keyword in ('media', 'supports') and n.content:
            dentro = regras(tinycss2.parse_rule_list(n.content, skip_comments=True, skip_whitespace=True), ind + '  ')
            if dentro: out.append('%s@%s %s {\n%s\n%s}' % (ind, n.at_keyword, tinycss2.serialize(n.prelude).strip(), '\n'.join(dentro), ind))
    return out

saida = ['/* GERADO por _build/tema_vice.py — nao editar a mao. Extras do tema em tema-vice-extra.css */']
for f in ('style.css', 'manager.css', 'banca.css'):
    css = open(os.path.join(RAIZ, f), encoding='utf-8').read()
    saida.append('/* ---- ' + f + ' ---- */')
    saida += regras(tinycss2.parse_stylesheet(css, skip_comments=True, skip_whitespace=True))
open(os.path.join(RAIZ, 'tema-vice.css'), 'w', encoding='utf-8').write('\n'.join(saida) + '\n')
print('regras:', len(saida))
