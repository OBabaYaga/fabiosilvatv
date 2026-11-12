# -*- coding: utf-8 -*-
import re, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from offers import OFFERS, FEATURED
from legal import TERMS, PRIVACY, COOKIES

ROOT = pathlib.Path(__file__).parent.parent
SITE = "https://obabayaga.com"
AVATAR = "assets/logo-160.png"
VER = "39"

PAY_ICON = {
    "btc": '<span title="Bitcoin"><i class="fab fa-bitcoin" aria-hidden="true"></i><span class="sr-only">Bitcoin</span></span>',
    "usdt": '<span title="USDT / cripto"><i class="fas fa-coins" aria-hidden="true"></i><span class="sr-only">USDT</span></span>',
    "card": '<span title="Cartão"><i class="far fa-credit-card" aria-hidden="true"></i><span class="sr-only">Cartão</span></span>',
    "bank": '<span title="Transferência bancária"><i class="fas fa-building-columns" aria-hidden="true"></i><span class="sr-only">Transferência</span></span>',
    "mbway": '<span class="mbway" title="MB WAY">MB WAY</span>',
    "gpay": '<span title="Google Pay"><i class="fab fa-google-pay" aria-hidden="true"></i><span class="sr-only">Google Pay</span></span>',
    "apay": '<span title="Apple Pay"><i class="fab fa-apple-pay" aria-hidden="true"></i><span class="sr-only">Apple Pay</span></span>',
    "skrill": '<span title="Skrill / carteiras"><i class="fas fa-wallet" aria-hidden="true"></i><span class="sr-only">Carteira</span></span>',
}
BADGE_LABEL = {"hot": "Hot", "new": "Novo", "fs": "Free Spins", "mbway": "MB WAY", "crypto": "Cripto"}

def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;")

def short_bonus(o):
    if o.get("bonus_short"):
        return o["bonus_short"]
    return o["bonus"].split(" até")[0]

def offer_card(o):
    badges = "".join(f'<span class="badge {b}">{BADGE_LABEL[b]}</span>' for b in o["badges"])
    pays = "".join(PAY_ICON[p] for p in o["pay"])
    deps = "".join(f'<li><b>{a}</b><span>{b}</span><span>{c}</span></li>' for a, b, c in o["deposits"])
    perks = "".join(f'<li><i class="fas fa-check" aria-hidden="true"></i>{p}</li>' for p in o["perks"])
    cats = " ".join(o["cats"] + o["badges"])
    code = o["code"]
    code_chip = f'<span class="gm-code">{code}</span>' if code != "—" else '<span class="gm-code none">—</span>'
    href = esc(o["link"])
    fs = o["fs"]
    if " até " in o["bonus"]:
        bl, bv = "Bónus máx.", o["bonus"].split(" até ", 1)[1]
    else:
        bl, bv = "Valor do bónus", short_bonus(o)
    return f'''
<article class="offer-card gm-card" data-cats="{cats}" data-name="{o['name'].lower()}" id="offer-{o['id']}">
  <div class="gm-art" style="--art-img: url('assets/brands/art-{o['id']}.jpg')">
    <div class="gm-badges">{badges}</div>
    <img class="gm-logo" src="{o['logo']}" alt="{o['name']}" loading="lazy" style="max-height:{o.get('logo_h', 38) + 14}px">
    <div class="gm-blur" aria-hidden="true"></div>
    <div class="gm-fade" aria-hidden="true"></div>
    <div class="gm-text"><h3 class="gm-name">{o['name']}</h3><p class="gm-tag">{o['tag']}</p></div>
  </div>
  <div class="gm-body">
    <div class="gm-row gm-label"><span>BÓNUS</span><span>CÓDIGO</span></div>
    <div class="gm-row"><strong class="gm-value">{short_bonus(o)}</strong>{code_chip}</div>
    <div class="gm-perks">
      <div class="gm-perk"><i class="fas fa-coins" aria-hidden="true"></i><span>Dep. mínimo</span><em></em><b>{o['min_dep'].split(' (')[0]}</b></div>
      <div class="gm-perk"><i class="fas fa-gift" aria-hidden="true"></i><span>{bl}</span><em></em><b>{bv}</b></div>
      <div class="gm-perk"><i class="fas fa-star" aria-hidden="true"></i><span>Free spins</span><em></em><b>{fs}</b></div>
    </div>
    <div class="gm-actions">
      <a class="gm-claim" href="{href}" target="_blank" rel="noopener noreferrer sponsored">RECLAMAR BÓNUS</a>
      <button class="gm-more more-btn" type="button" aria-expanded="false" aria-label="Mais informação sobre {o['name']}"><svg viewBox="0 0 10 10" aria-hidden="true" focusable="false"><path d="M4 0H6V10H4V0Z" fill="currentColor"/><path d="M0 6V4H10V6H0Z" fill="currentColor"/></svg></button>
    </div>
    <span class="gm-fine">+18 · T&amp;C aplicáveis · Joga com responsabilidade</span>
  </div>
  <div class="offer-more">
    <div class="pay-row" aria-label="Métodos de pagamento">{pays}</div>
    <div class="gm-facts">
      <div><small>Licença</small><strong>{o['license']}</strong></div>
      <div><small>Levantamento</small><strong>{o['withdraw']}</strong></div>
    </div>
    <h4>Bónus de boas-vindas · por depósito</h4>
    <ul class="dep-list">{deps}</ul>
    <ul class="perks">{perks}</ul>
    <p class="schedule-note">{o['desc']}</p>
    <div class="offer-foot"><a class="gm-claim" href="{href}" target="_blank" rel="noopener noreferrer sponsored">RECLAMAR BÓNUS</a><a class="tc-link" href="{href}" target="_blank" rel="noopener noreferrer">T&amp;C</a></div>
  </div>
</article>'''

FILTERS = [("all", "Todas as ofertas"), ("fs", "Free spins"), ("welcome", "Bónus de boas-vindas"), ("hot", "Hot"), ("crypto", "Cripto"), ("sports", "Apostas"), ("new", "Novo")]

def filters_html():
    return '<div class="filters" role="group" aria-label="Filtrar ofertas">' + "".join(
        f'<button class="filter-btn{" active" if k == "all" else ""}" data-filter="{k}" type="button">{v}</button>' for k, v in FILTERS) + "</div>"

def brand_row():
    return '<div class="brand-row">' + "".join(f'<a class="brand-chip" href="casinos.html#offer-{o["id"]}" title="{o["name"]}"><img src="{o["logo"]}" alt="{o["name"]}" loading="lazy"></a>' for o in OFFERS) + "</div>"

def brand_marquee():
    """Faixa de logos em loop contínuo (todas as marcas de OFFERS). A segunda metade é cópia
    idêntica da primeira (aria-hidden) para a animação translateX(-50%) fechar sem saltos."""
    def chips(hidden):
        extra = ' aria-hidden="true" tabindex="-1"' if hidden else ""
        return "".join(
            f'<a class="brand-chip" href="casinos.html#offer-{o["id"]}" title="{o["name"]}" style="--art-img: url(\'assets/brands/art-{o["id"]}.jpg\')"{extra}>'
            f'<img src="{o["logo"]}" alt="{"" if hidden else o["name"]}"></a>' for o in OFFERS)
    reps = 3  # repetições do conjunto por metade, para encher ecrãs largos
    half_vis = chips(False) + chips(True) * (reps - 1)
    half_hid = chips(True) * reps
    return f'<div class="brand-marquee" role="region" aria-label="Marcas parceiras"><div class="brand-marquee-track">{half_vis}{half_hid}</div></div>'

# ---------------------------------------------------------------- layout
NAV = [
    ("principal", "Principal", [
        ("index.html", "fa-house", "Início", ""),
        ("casinos.html", "fa-gift", "Casinos", ""),
        ("comunidade.html", "fa-users", "Comunidade", ""),
        ("loja.html", "fa-cart-shopping", "Loja", ""),
    ]),
    ("live", "Live", [
        ("index.html#live", "fa-tower-broadcast", "Live Hub", '<span class="pill live" id="navLivePill" hidden>LIVE</span>'),
        ("ranking.html", "fa-trophy", "Ranking", ""),
    ]),
    ("tools", "Ferramentas", [
        ("bonus-hunt.html", "fa-crosshairs", "Bonus Hunt", ""),
        ("jogos.html", "fa-gamepad", "Minijogos", ""),
        ("contacto.html", "fa-envelope", "Contacto", ""),
    ]),
]

SOCIALS = [("https://www.twitch.tv/obaba_yaga", "fa-twitch", "Twitch"), ("https://discord.gg/fDWqsxheRb", "fa-discord", "Discord"),
           ("https://www.instagram.com/obaba_yaga75/", "fa-instagram", "Instagram"), ("https://t.me/+IZ6rt8kCZixmNzY0", "fa-telegram", "Telegram")]

def sidebar(active):
    groups = ""
    for _, label, items in NAV:
        groups += f'<div class="sidebar-group">{label}</div>'
        for href, icon, text, extra in items:
            cls = " active" if href.split("#")[0] == active or (href == "jogos.html" and active in ("crash.html", "blackjack.html", "dados.html", "minas.html")) else ""
            groups += f'<a class="sidebar-link{cls}" href="{href}"><i class="fas {icon}" aria-hidden="true"></i>{text}{extra}</a>'
    socials = "".join(f'<a href="{h}" target="_blank" rel="noopener noreferrer" aria-label="{l}"><i class="fab {i}" aria-hidden="true"></i></a>' for h, i, l in SOCIALS)
    return f'''
<aside class="sidebar" id="sidebar" aria-label="Navegação principal">
  <a class="sidebar-brand" href="index.html"><img src="{AVATAR}" alt="" width="64" height="64"><span>OBABA_<em>YAGA</em></span></a>
  <nav>{groups}</nav>
  <div class="sidebar-socials">{socials}</div>
</aside>'''

def topbar(crumb):
    return f'''
<header class="topbar">
  <button class="menu-toggle" id="menuToggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="sidebar"><i class="fas fa-bars" aria-hidden="true"></i></button>
  <div class="crumb"><small>Estás em</small><strong>{crumb}</strong></div>
  <form class="search" role="search" action="casinos.html" method="get"><i class="fas fa-magnifying-glass" aria-hidden="true"></i><input type="search" name="q" id="siteSearch" placeholder="Pesquisar casinos, ofertas, códigos..." autocomplete="off" aria-label="Pesquisar"></form>
  <div class="topbar-actions">
    <div class="nav-auth" id="navAuth"></div>
    <button class="chat-toggle" id="chatToggle" aria-label="Abrir chat da comunidade"><i class="fas fa-comments" aria-hidden="true"></i></button>
  </div>
</header>'''

def chat():
    return '''
<aside class="chat" id="chat" aria-label="Chat da comunidade">
  <div class="chat-head"><i class="fas fa-comment" aria-hidden="true"></i><span>Chat da comunidade <em class="live" id="chatLive">● OFFLINE</em></span><button class="chat-collapse" id="chatCollapse" aria-label="Recolher chat"><i class="fas fa-chevron-right" aria-hidden="true"></i></button></div>
  <iframe id="chatFrame" title="Chat da Twitch do obaba_yaga" loading="lazy" data-channel="obaba_yaga"></iframe>
</aside>'''

def footer():
    socials = "".join(f'<a href="{h}" target="_blank" rel="noopener noreferrer" aria-label="{l}"><i class="fab {i}" aria-hidden="true"></i></a>' for h, i, l in SOCIALS)
    return f'''
<footer class="footer">
  <div class="footer-top">
    <div class="footer-brand"><img src="{AVATAR}" alt=""><div><div class="footer-brand-name">O Baba Yaga</div><div class="footer-brand-tagline">Casino Streamer · Twitch</div></div></div>
    <div class="footer-social">{socials}</div>
  </div>
  <div class="gambling-logos">
    <span class="age-warning" title="Apenas para maiores de 18 anos">18+</span>
    <a href="https://www.jogoresponsavel.pt/" target="_blank" rel="noopener noreferrer">Jogo Responsável (SRIJ)</a>
    <a href="https://www.sicad.pt/" target="_blank" rel="noopener noreferrer">SICAD · Linha Vida 1414</a>
    <a href="https://www.begambleaware.org/" target="_blank" rel="noopener noreferrer">BeGambleAware</a>
  </div>
  <div>
    <div class="warning-header"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> Aviso importante</div>
    <p class="warning-text">Este site apresenta e compara ofertas de bónus de vários operadores de jogo. Destina-se exclusivamente a adultos, em países onde a utilização dos operadores apresentados é legalmente permitida. Não organizamos jogos de fortuna e azar nem aceitamos apostas. A informação é verificada com cuidado, mas sem garantia de estar completa, exata ou atualizada. O jogo é entretenimento, não uma fonte de rendimento, e pode criar dependência. Se sentes que estás a perder o controlo, procura ajuda em <a href="https://www.jogoresponsavel.pt/" target="_blank" rel="noopener noreferrer">jogoresponsavel.pt</a> ou na Linha Vida <a href="tel:1414">1414</a>.</p>
    <p class="warning-text affiliate-disclosure"><strong>Transparência:</strong> os links para casinos são links de afiliado. Se te registares através deles, o O BABA YAGA pode receber uma comissão, sem custo adicional para ti. Confirma sempre se o operador está autorizado no teu país antes de jogares.</p>
  </div>
  <div class="footer-bottom">
    <p>© <span id="year">2026</span> O Baba Yaga · Joga com responsabilidade. 18+</p>
    <div class="footer-links"><a href="termos.html">Termos e Condições</a><a href="privacidade.html">Política de Privacidade</a><a href="cookies.html">Política de Cookies</a><a href="contacto.html">Contacto</a></div>
  </div>
</footer>'''

AGE_GATE = '''
<div id="ageGate" class="age-gate" role="dialog" aria-modal="true" aria-labelledby="ageGateTitle">
  <div class="age-gate-content">
    <div class="age-gate-icon"><i class="fas fa-user-shield" aria-hidden="true"></i></div>
    <h2 class="age-gate-title" id="ageGateTitle">Verificação de idade</h2>
    <p class="age-gate-text">Este site contém conteúdo relacionado com jogos de fortuna e azar e destina-se apenas a maiores de 18 anos.</p>
    <p class="age-gate-question">Confirmas que tens 18 anos ou mais?</p>
    <div class="age-gate-buttons">
      <button id="ageConfirm" class="age-btn age-btn-confirm">Sim, tenho +18</button>
      <button id="ageDeny" class="age-btn age-btn-deny">Não, sou menor</button>
    </div>
    <p class="age-gate-warning"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> Joga com responsabilidade</p>
  </div>
</div>'''

PROMO = ''  # popup promocional desligado (pedido do Fabio, nov. 2026)

def head(path, title, desc, extra=""):
    url = f"{SITE}/{path}"
    return f'''<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <meta name="description" content="{desc}">
    <link rel="canonical" href="{url}">
    <meta name="theme-color" content="#040d1c">
    <meta name="rating" content="adult">{extra}
    <link rel="icon" href="assets/favicon-64.png" type="image/png">
    <link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="O BABA YAGA">
    <meta property="og:locale" content="pt_PT">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{desc}">
    <meta property="og:url" content="{url}">
    <meta property="og:image" content="{SITE}/assets/og-image.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{desc}">
    <meta name="twitter:image" content="{SITE}/assets/og-image.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="style.css?v={VER}">
</head>'''

def page(path, title, desc, crumb, main, age_gate=True, promo=False, scripts=(), with_chat=True, extra_head="", body_attr=""):
    body = head(path, title, desc, extra_head) + f"\n<body{body_attr}>"
    if age_gate: body += AGE_GATE
    if promo: body += PROMO
    body += f'\n<div class="backdrop" id="backdrop"></div>\n<div class="app{" has-chat" if with_chat else ""}" id="app">'
    body += sidebar(path)
    body += f'\n<div class="main">{topbar(crumb)}\n<main id="content">{main}\n</main>{footer()}\n</div>'
    if with_chat: body += chat()
    body += "\n</div>"
    body += f'\n<script src="script.js?v={VER}"></script>\n<script src="twitch-auth.js?v={VER}"></script>'
    for s in scripts: body += f'\n<script src="{s}?v={VER}"></script>'
    body += "\n</body>\n</html>\n"
    (ROOT / path).write_text(body, encoding="utf-8")
    print("ok", path)

# ---------------------------------------------------------------- pages
def home():
    by_id = {o["id"]: o for o in OFFERS}
    featured = "".join(offer_card(by_id[i]) for i in FEATURED if i in by_id)
    return f'''
<a class="promo-strip" href="casinos.html#offer-royalxo"><span class="brand">ROYAL XO</span> 100% até 4.000€ + 1.200 giros grátis · T&amp;C aplicáveis · +18 <span class="code">Ver oferta</span></a>

<section class="panel" id="offers">
  <div class="panel-head">
    <div><h2 class="panel-title">Ofertas em destaque</h2><p class="panel-sub">As parcerias oficiais do O BABA YAGA, com os bónus e códigos em vigor.</p></div>
    <a class="btn-outline-green" href="casinos.html">Ver todas as ofertas <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
  </div>
  <div class="offers-grid featured">{featured}</div>
  {brand_marquee()}
</section>

<section class="panel" id="schedule">
  <div class="panel-head">
    <div><h2 class="panel-title">Horário das lives</h2><p class="panel-sub" id="scheduleSub">Horas no teu fuso horário · sujeito a alterações</p></div>
    <a class="link-green" href="https://www.twitch.tv/obaba_yaga/schedule" target="_blank" rel="noopener noreferrer">Ver na Twitch <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
  </div>
  <div class="schedule-grid" id="scheduleGrid"></div>
  <p class="schedule-note">Horário sujeito a alterações. Segue na Twitch para receberes notificação quando a live começar.</p>
</section>

<section class="panel" id="shop">
  <div class="panel-head">
    <div><h2 class="panel-title">Da loja</h2><p class="panel-sub">Gasta os teus pontos em vantagens e prémios.</p></div>
    <a class="link-green" href="loja.html">Ver a loja <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
  </div>
  <div class="shop-grid">
    <a class="shop-item" href="https://streamelements.com/obaba_yaga/store" target="_blank" rel="noopener noreferrer"><i class="fas fa-ticket" aria-hidden="true"></i><strong>Entrada em sorteio</strong><span>Pontos</span></a>
    <a class="shop-item" href="https://streamelements.com/obaba_yaga/store" target="_blank" rel="noopener noreferrer"><i class="fas fa-share-nodes" aria-hidden="true"></i><strong>Bonus share</strong><span>Pontos</span></a>
    <a class="shop-item" href="https://streamelements.com/obaba_yaga/store" target="_blank" rel="noopener noreferrer"><i class="fas fa-music" aria-hidden="true"></i><strong>Pedido de música</strong><span>Pontos</span></a>
    <a class="shop-item" href="https://streamelements.com/obaba_yaga/store" target="_blank" rel="noopener noreferrer"><i class="fas fa-crown" aria-hidden="true"></i><strong>VIP no chat</strong><span>Pontos</span></a>
  </div>
</section>

<section class="panel" id="social">
  <div class="panel-head"><div><h2 class="panel-title">Ganha. Joga. Vence.</h2><p class="panel-sub">Como funciona a comunidade.</p></div></div>
  <div class="steps">
    <div class="step"><i class="fas fa-tv" aria-hidden="true"></i><div><strong>Vê a stream</strong><span>Ganhas pontos automaticamente enquanto estás na live.</span></div></div>
    <div class="step"><i class="fas fa-gamepad" aria-hidden="true"></i><div><strong>Joga e vota</strong><span>Usa os pontos nos minijogos e nas votações do chat.</span></div></div>
    <div class="step"><i class="fas fa-gift" aria-hidden="true"></i><div><strong>Resgata prémios</strong><span>Troca pontos por vantagens e drops na loja.</span></div></div>
  </div>
</section>

<section class="panel hero" id="live">
  <div class="hero-content">
    <div class="live-badge" id="liveBadge"><span class="live-dot"></span><span id="liveText">OFFLINE</span></div>
    <h1 class="hero-title">As melhores <span class="gradient-text">lives &amp; ofertas</span></h1>
    <p class="hero-description">Junta-te à comunidade do O BABA YAGA: lives de casino na Twitch, giveaways, minijogos e as ofertas exclusivas dos patrocínios oficiais.</p>
    <div class="hero-actions">
      <a class="btn-twitch" href="https://www.twitch.tv/obaba_yaga" target="_blank" rel="noopener noreferrer"><i class="fab fa-twitch" aria-hidden="true"></i> Ver na Twitch</a>
      <a class="btn-ghost" href="casinos.html"><i class="fas fa-gift" aria-hidden="true"></i> Ver ofertas</a>
    </div>
  </div>
  <div class="stream-panel">
    <div class="gate-content">
      <div class="stream-placeholder" id="streamContainer">
        <div id="twitch-embed-container"></div>
        <div class="offline-card" id="offlineCard">
          <img src="assets/logo.png" alt="" class="offline-card-image">
          <div class="offline-indicator"><span class="offline-dot"></span><span>Stream offline</span></div>
          <p class="offline-text">A stream começa em breve. Segue-me na Twitch para seres avisado!</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="ticker-grid hero-ticker" aria-label="Estatísticas">
  <div class="ticker-item"><i class="fas fa-users" aria-hidden="true"></i><div><span class="ticker-value" id="followerCount" aria-live="polite">+--</span><span class="ticker-label">Followers</span></div></div>
  <div class="ticker-item"><i class="fas fa-trophy" aria-hidden="true"></i><div><span class="ticker-value">+2.932€</span><span class="ticker-label">Maior vitória</span></div></div>
  <div class="ticker-item"><i class="fas fa-comments" aria-hidden="true"></i><div><span class="ticker-value" data-target="100">+100</span><span class="ticker-label">Discord</span></div></div>
  <div class="ticker-item"><i class="fas fa-clock" aria-hidden="true"></i><div><span class="ticker-value" data-target="1300">+1.300</span><span class="ticker-label">Horas ao vivo</span></div></div>
</section>'''

def casinos():
    cards = "".join(offer_card(o) for o in OFFERS)
    return f'''
<section class="panel page-hero">
  <div class="icon"><i class="fas fa-gift" aria-hidden="true"></i></div>
  <div><h1>Os casinos do Baba Yaga</h1><p>Começa pelas 3 ofertas em destaque e explora depois todas as outras marcas. Usa os filtros ou a pesquisa.</p></div>
</section>
<section class="panel">
  {filters_html()}
  <p class="schedule-note" id="noResults" hidden>Nenhuma oferta corresponde à pesquisa.</p>
  <div class="offers-grid" id="offersGrid">{cards}</div>
</section>'''

def comunidade():
    socials = "".join(f'<a href="{h}" target="_blank" rel="noopener noreferrer" class="social-card {l.lower()}"><i class="fab {i}" aria-hidden="true"></i><span>{l}</span></a>' for h, i, l in SOCIALS)
    return f'''
<section class="panel page-hero">
  <div class="icon"><i class="fas fa-users" aria-hidden="true"></i></div>
  <div><h1>Comunidade</h1><p>Redes sociais, ranking, minijogos e tudo o que a comunidade do O BABA YAGA tem para oferecer, num só sítio.</p></div>
</section>
<section class="panel">
  <div class="panel-head"><div><h2 class="panel-title">Segue-nos</h2><p class="panel-sub">Para não perderes nenhum sorteio, big win ou stream especial.</p></div></div>
  <div class="social-grid">{socials}</div>
</section>
<section class="panel">
  <div class="panel-head"><div><h2 class="panel-title">Explorar</h2></div></div>
  <div class="shop-grid">
    <a class="shop-item" href="ranking.html"><i class="fas fa-trophy" aria-hidden="true"></i><strong>Ranking</strong><span>Top da comunidade</span></a>
    <a class="shop-item" href="jogos.html"><i class="fas fa-gamepad" aria-hidden="true"></i><strong>Minijogos</strong><span>Blackjack, dados, minas</span></a>
    <a class="shop-item" href="loja.html"><i class="fas fa-cart-shopping" aria-hidden="true"></i><strong>Loja</strong><span>Troca os teus pontos</span></a>
    <a class="shop-item" href="casinos.html"><i class="fas fa-gift" aria-hidden="true"></i><strong>Casinos</strong><span>Ofertas exclusivas</span></a>
  </div>
</section>'''

GAMES = [
    ("crash", "Crash", "fa-rocket", "Arrisca tudo por multiplicadores massivos. Recolhe antes de rebentar.", "crash.html", "linear-gradient(135deg, #3a0a0a, #b3202a 60%, #ff7a3d)"),
    ("blackjack", "Blackjack", "fa-clone", "Vence o dealer e acumula fichas. Paga 3 para 2.", "blackjack.html", "linear-gradient(135deg, #062c1c, #0b6b3a 60%, #1fad7e)"),
    ("dice", "Dados", "fa-dice", "Escolhe o alvo, define a hipótese e roda.", "dados.html", "linear-gradient(135deg, #0a1a33, #12408a 60%, #00c8ff)"),
    ("mines", "Minas", "fa-bomb", "Limpa a grelha e foge das minas.", "minas.html", "linear-gradient(135deg, #1a1030, #4a2478 60%, #9146ff)"),
]

PARTNER_BANNER = '''
<a class="partner-banner" href="casinos.html">
  <span class="pb-icon"><i class="fas fa-coins" aria-hidden="true"></i></span>
  <span class="pb-text"><strong>Queres jogar a sério?</strong><small>Bónus exclusivos nos parceiros oficiais do O BABA YAGA</small></span>
  <span class="btn-gold">Ver parceiros <i class="fas fa-arrow-right" aria-hidden="true"></i></span>
  <span class="pb-age">18+</span>
</a>'''

def balance_box():
    return '''
<div class="balance-box">
  <div><span class="balance-label">Saldo</span><span class="balance-value"><i class="fas fa-coins" aria-hidden="true"></i> <span data-balance>1.000</span></span></div>
  <button class="balance-reset" id="balanceReset" type="button"><i class="fas fa-rotate-right" aria-hidden="true"></i> Repor</button>
</div>'''

def bet_control(id_, label="Aposta"):
    return f'''
<div class="bet-control">
  <label for="{id_}">{label}</label>
  <div class="bet-input-group">
    <button class="bet-step" type="button" data-target="{id_}" data-step="-10" aria-label="Diminuir aposta">−</button>
    <input type="number" id="{id_}" value="50" min="10" step="10">
    <button class="bet-step" type="button" data-target="{id_}" data-step="10" aria-label="Aumentar aposta">+</button>
  </div>
  <div class="bet-quick">
    <button class="bet-step" type="button" data-target="{id_}" data-op="half">½</button>
    <button class="bet-step" type="button" data-target="{id_}" data-op="double">2×</button>
    <button class="bet-step" type="button" data-target="{id_}" data-op="max">Máx</button>
  </div>
</div>'''

def history_panel(game):
    return f'''
<section class="panel">
  <div class="panel-head"><div><h2 class="panel-title">Histórico</h2><p class="panel-sub">As tuas últimas jogadas{" em " + GAME_NAMES_PT[game] if game else ""} · guardadas neste browser</p></div><span class="fair-tag"><i class="fas fa-shield-halved" aria-hidden="true"></i> Fichas virtuais</span></div>
  <div class="stats-grid stats-inline" id="gameStats"></div>
  <div class="history-wrap"><table class="history">
    <thead><tr><th>Jogador</th><th>Aposta</th><th>Jogada</th><th>Resultado</th></tr></thead>
    <tbody id="historyBody" data-game="{game}"></tbody>
  </table></div>
</section>'''

GAME_NAMES_PT = {"crash": "Crash", "blackjack": "Blackjack", "dice": "Dados", "mines": "Minas"}

def game_header(gid, name, icon):
    return f'''
<section class="panel game-header">
  <a class="back-hub" href="jogos.html"><i class="fas fa-arrow-left" aria-hidden="true"></i> Hub</a>
  <span class="game-icon"><i class="fas {icon}" aria-hidden="true"></i></span>
  <h1>{name}</h1>
  <span class="game-tag">Fichas virtuais · sem dinheiro real</span>
</section>
{PARTNER_BANNER}'''

def jogos():
    cards = "".join(f'''
<a class="game-card-hub" href="{href}" style="--art: {art}">
  <div class="gch-art"><i class="fas {icon}" aria-hidden="true"></i></div>
  <div class="gch-body"><strong><i class="fas {icon}" aria-hidden="true"></i> {name}</strong><span>{desc}</span><em class="btn-gold">Jogar</em></div>
</a>''' for gid, name, icon, desc, href, art in GAMES)
    cards += '''
<div class="game-card-hub soon">
  <div class="gch-art"><i class="fas fa-hourglass-half" aria-hidden="true"></i></div>
  <div class="gch-body"><strong>Em breve</strong><span>Roleta, Plinko e torneios da comunidade.</span><em class="btn-ghost">Em breve</em></div>
</div>'''
    return f'''
<section class="panel page-hero">
  <div class="icon"><i class="fas fa-gamepad" aria-hidden="true"></i></div>
  <div><h1>Minijogos</h1><p>Joga com fichas virtuais da comunidade: crash, blackjack, dados e minas. Sem dinheiro real, só diversão.</p></div>
</section>
{PARTNER_BANNER}
<section class="panel">
  {balance_box()}
</section>
<div class="hub-grid">
  <div class="games-grid">{cards}</div>
  {history_panel("")}
</div>'''

def game_page(gid, controls, table):
    name = GAME_NAMES_PT[gid]; icon = dict((g[0], g[2]) for g in GAMES)[gid]
    return f'''
{game_header(gid, name, icon)}
<section class="game-layout">
  <aside class="panel game-controls">
    {balance_box()}
    {controls}
  </aside>
  <div class="panel game-table-wrap">{table}</div>
</section>
{history_panel(gid)}
<div class="game-toast" id="gameToast" role="status" aria-live="polite"></div>'''

def blackjack():
    controls = bet_control("bjBet") + '''
<div class="game-actions" id="bjPreActions"><button class="btn-primary" id="bjDealBtn" type="button">Distribuir cartas</button></div>
<div class="game-actions hidden" id="bjInGameActions">
  <button class="btn-secondary" id="bjHitBtn" type="button">Pedir (H)</button>
  <button class="btn-secondary" id="bjStandBtn" type="button">Ficar (S)</button>
  <button class="btn-secondary" id="bjDoubleBtn" type="button" disabled>Dobrar</button>
</div>
<p class="game-message" id="bjMessage" aria-live="polite">Faz a tua aposta para começar.</p>'''
    table = '''
<div class="felt">
  <div class="felt-mark">BY</div>
  <div class="bj-hand-area">
    <div class="bj-hand-label"><span>Dealer</span><span class="bj-hand-score" id="dealerScore">—</span></div>
    <div class="bj-cards" id="dealerCards"></div>
  </div>
  <div class="felt-plaque"><strong>Blackjack paga 3 para 2</strong><small>Dealer fica a 17 · Dobrar disponível</small></div>
  <div class="bj-hand-area">
    <div class="bj-hand-label"><span>A tua mão</span><span class="bj-hand-score" id="playerScore">—</span></div>
    <div class="bj-cards" id="playerCards"></div>
  </div>
  <div class="felt-shoe" aria-hidden="true"><span></span><span></span><span></span></div>
</div>'''
    return game_page("blackjack", controls, table)

def dados():
    controls = bet_control("diceBet") + '''
<div class="bet-control">
  <label for="diceTarget">Rolar abaixo de</label>
  <input type="range" id="diceSlider" min="2" max="98" value="50" aria-label="Alvo">
  <input type="number" id="diceTarget" value="50" min="2" max="98">
</div>
<div class="info-grid">
  <div class="stat"><small id="diceChanceLabel">Hipótese</small><strong id="diceChance" aria-labelledby="diceChanceLabel" aria-live="polite">49.00%</strong></div>
  <div class="stat"><small id="diceMultLabel">Multiplicador</small><strong id="diceMultiplier" aria-labelledby="diceMultLabel" aria-live="polite">2.0000x</strong></div>
  <div class="stat"><small>Ganho possível</small><strong id="dicePayout">100</strong></div>
</div>
<div class="game-actions"><button class="btn-primary" id="diceRollBtn" type="button">Rodar dados</button></div>
<p class="game-message" id="diceMessage" aria-live="polite">Escolhe um alvo e roda.</p>'''
    table = '''
<div class="felt felt-blue">
  <div class="felt-mark">BY</div>
  <div class="dice-result-display"><span class="dice-result-label">Resultado</span><span class="dice-result-value" id="diceResultValue">--</span></div>
  <div class="dice-track-wrapper">
    <div class="dice-track">
      <div class="dice-track-fill" id="diceTrackFill"></div>
      <div class="dice-track-target" id="diceTrackTarget"></div>
      <div class="dice-track-marker" id="diceTrackMarker"></div>
    </div>
    <div class="dice-track-labels"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
  </div>
  <div class="felt-plaque"><strong>Ganhas se o número sair abaixo do alvo</strong><small>Margem da casa 2%</small></div>
</div>'''
    return game_page("dice", controls, table)

def minas():
    controls = bet_control("minesBet") + '''
<div class="bet-control">
  <label for="minesCount">Nº de minas</label>
  <select id="minesCount"><option value="3">3</option><option value="5" selected>5</option><option value="10">10</option><option value="15">15</option><option value="24">24</option></select>
</div>
<div class="info-grid">
  <div class="stat"><small>Multiplicador</small><strong id="minesMultiplier">1.00x</strong></div>
  <div class="stat"><small>Próxima gema</small><strong id="minesNext">1.00x</strong></div>
</div>
<div class="game-actions" id="minesPreActions"><button class="btn-primary" id="minesStartBtn" type="button">Iniciar jogo</button></div>
<div class="game-actions hidden" id="minesInGameActions"><button class="btn-primary" id="minesCashoutBtn" type="button">Recolher <span id="minesCashoutValue"></span></button></div>
<p class="game-message" id="minesMessage" aria-live="polite">Escolhe o número de minas e começa.</p>'''
    table = '''
<div class="felt felt-purple">
  <div class="felt-mark">BY</div>
  <div class="mines-grid" id="minesGrid"></div>
</div>'''
    return game_page("mines", controls, table)

def crash():
    controls = bet_control("crashBet") + '''
<div class="bet-control">
  <label for="crashAuto">Recolha automática (x)</label>
  <input type="number" id="crashAuto" value="2.00" min="1.01" step="0.1" placeholder="ex.: 2.00">
</div>
<div class="game-actions" id="crashPreActions"><button class="btn-primary" id="crashStartBtn" type="button">Apostar</button></div>
<div class="game-actions hidden" id="crashInGameActions"><button class="btn-primary btn-cash" id="crashCashBtn" type="button">Recolher <span id="crashCashValue"></span></button></div>
<p class="game-message" id="crashMessage" aria-live="polite">Aposta e recolhe antes de rebentar.</p>'''
    table = '''
<div class="felt felt-red crash-table">
  <div class="crash-history" id="crashHistory"></div>
  <canvas id="crashCanvas" class="crash-canvas"></canvas>
  <div class="crash-mult" id="crashMult">1.00x</div>
  <div class="felt-plaque"><strong>O multiplicador sobe até rebentar</strong><small>Margem da casa 3%</small></div>
</div>'''
    return game_page("crash", controls, table)

def ranking():
    return '''
<section class="panel page-hero">
  <div class="icon gold"><i class="fas fa-trophy" aria-hidden="true"></i></div>
  <div><h1>Ranking da comunidade</h1><p>Os pontos de fidelidade e a tua posição entre os membros mais ativos.</p></div>
</section>
<div class="player-stats-card" id="playerStats"></div>
<section class="panel ranking-card">
  <div class="ranking-header">
    <h2 class="ranking-title"><i class="fas fa-ranking-star" aria-hidden="true"></i> Top da comunidade</h2>
    <button class="player-stats-refresh" id="rankingRefresh" title="Atualizar" aria-label="Atualizar ranking"><i class="fas fa-rotate-right" aria-hidden="true"></i></button>
  </div>
  <div class="ranking-list" id="rankingList" aria-live="polite"><p class="ranking-loading">A carregar ranking...</p></div>
</section>'''

def loja():
    # Loja de pontos própria (loja.js + API fabiosilvatv-api).
    return '''
<section class="panel page-hero">
<div class="icon gold"><i class="fas fa-cart-shopping" aria-hidden="true"></i></div>
<div><h1>Loja</h1><p>Troca o teu saldo por prémios. Os teus pontos da live nunca são gastos.</p></div>
</section>
<section class="panel" id="lojaCarteira"><p class="loja-vazio">A carregar…</p></section>
<section class="panel">
<div class="panel-head"><div><h2 class="panel-title">Prémios</h2><p class="panel-sub">O saldo da loja ganha os mesmos pontos que recebes a ver a live.</p></div></div>
<div class="loja-grid" id="lojaProdutos"><p class="loja-vazio">A carregar prémios…</p></div>
</section>
<section class="panel" id="lojaMeusPedidos" hidden>
<div class="panel-head"><div><h2 class="panel-title">Os meus pedidos</h2><p class="panel-sub">Os pedidos ficam pendentes até serem entregues. Se forem recusados, os pontos voltam ao teu saldo.</p></div></div>
<ul class="loja-pedidos" id="lojaMeusPedidosLista"></ul>
</section>
<section class="panel loja-admin" id="lojaAdmin" hidden>
<div class="panel-head"><div><h2 class="panel-title"><i class="fas fa-screwdriver-wrench" aria-hidden="true"></i> Gestão da loja</h2><p class="panel-sub">Só tu vês esta secção.</p></div><span class="loja-badge" id="lojaAdminPendentes"></span></div>
<h3 class="loja-admin-titulo">Pedidos</h3>
<div class="loja-filtros"><button class="loja-filtro" data-filtro="pendente" type="button">Pendentes</button><button class="loja-filtro" data-filtro="entregue" type="button">Entregues</button><button class="loja-filtro" data-filtro="recusado" type="button">Recusados</button><button class="loja-filtro" data-filtro="todos" type="button">Todos</button></div>
<ul class="loja-pedidos" id="lojaAdminPedidos"></ul>
<h3 class="loja-admin-titulo">Prémios</h3>
<div id="lojaAdminProdutos"></div>
<form class="loja-admin-produto novo" id="lojaNovoProduto">
<div class="loja-admin-grid">
<label class="loja-campo largo"><span>Novo prémio</span><input name="nome" maxlength="80" placeholder="Ex: Voucher Amazon 10 €" required></label>
<label class="loja-campo"><span>Preço (pontos)</span><input name="preco" type="number" min="1" required></label>
<label class="loja-campo"><span>Stock</span><input name="stock" type="number" min="0" value="0"></label>
<label class="loja-campo"><span>Máx./pessoa/mês</span><input name="limitePorMes" type="number" min="0" value="0"></label>
<label class="loja-campo largo"><span>Descrição</span><input name="descricao" maxlength="300"></label>
<label class="loja-campo largo"><span>Imagem (ex: assets/loja/nome.jpg ou https://…)</span><input name="imagem" maxlength="300"></label>
<label class="loja-campo"><span>O viewer indica</span><select name="tipo"><option value="nenhum">Nada</option><option value="deposito">Casino + ID da conta</option><option value="email">Email</option><option value="texto">Texto livre</option></select></label>
<label class="loja-check"><input type="checkbox" name="ativo" checked> Visível na loja</label>
</div>
<div class="loja-admin-acoes"><button type="submit" class="btn-gold"><i class="fas fa-plus" aria-hidden="true"></i> Adicionar prémio</button></div>
</form>
<h3 class="loja-admin-titulo">Ajustar saldo de um viewer</h3>
<form class="loja-ajuste" id="lojaAjuste">
<label class="loja-campo"><span>Utilizador da Twitch</span><input name="username" required placeholder="ex: fabiosilva_tv"></label>
<label class="loja-campo"><span>Quantidade (+ ou −)</span><input name="quantidade" type="number" required placeholder="ex: 500 ou -500"></label>
<button type="submit" class="btn-gold"><i class="fas fa-wallet" aria-hidden="true"></i> Aplicar</button>
</form>
<h3 class="loja-admin-titulo">Pôr pontos a zero (reset)</h3>
<form class="loja-reset" id="lojaReset">
<p class="loja-reset-aviso"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> Afeta <strong>todos</strong> os viewers e não se pode desfazer. Os pontos da StreamElements e os pedidos já feitos não mudam.</p>
<label class="loja-check"><input type="checkbox" name="saldos" checked> Saldo da loja de todos (fica 0; só conta o que ganharem a ver a live daqui para a frente)</label>
<label class="loja-check"><input type="checkbox" name="fichas" checked> Fichas dos minijogos (todos voltam às 1.000 e o ranking fica vazio)</label>
<label class="loja-campo"><span>Escreve RESET para confirmar</span><input name="confirmar" autocomplete="off" placeholder="RESET"></label>
<button type="submit" class="btn-ghost loja-reset-btn"><i class="fas fa-rotate-left" aria-hidden="true"></i> Pôr a zero</button>
</form>
</section>
<script src="loja.js?v=3"></script>'''

def contacto():
    return '''
<section class="panel page-hero">
  <div class="icon"><i class="fas fa-envelope" aria-hidden="true"></i></div>
  <div><h1>Contacto</h1><p>Para propostas de parceria, patrocínios ou outras questões. Respondo em 24 a 48 horas.</p></div>
</section>
<section class="panel">
  <div class="contact-grid">
    <div class="contact-card">
      <div class="contact-card-icon"><i class="fas fa-envelope" aria-hidden="true"></i></div>
      <h2 class="contact-card-title">Email</h2>
      <p class="contact-card-text">Propostas de parceria e patrocínio.</p>
      <a href="mailto:parceriasobabayaga@gmail.com" class="contact-card-link">parceriasobabayaga@gmail.com <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
    </div>
    <div class="contact-card">
      <div class="contact-card-icon"><i class="fab fa-instagram" aria-hidden="true"></i></div>
      <h2 class="contact-card-title">Instagram</h2>
      <p class="contact-card-text">Updates diários e mensagens diretas.</p>
      <a href="https://www.instagram.com/obaba_yaga75/" target="_blank" rel="noopener noreferrer" class="contact-card-link">@obaba_yaga75 <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
    </div>
    <div class="contact-card">
      <div class="contact-card-icon"><i class="fab fa-discord" aria-hidden="true"></i></div>
      <h2 class="contact-card-title">Discord</h2>
      <p class="contact-card-text">Suporte da comunidade e reclamações.</p>
      <a href="https://discord.gg/fDWqsxheRb" target="_blank" rel="noopener noreferrer" class="contact-card-link">Entrar no Discord <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
    </div>
  </div>
</section>'''

def legal(kind, title, sub, body, updated="7 de setembro de 2026"):
    nav = "".join('<a href="%s"%s>%s</a>' % (h, ' class="active"' if h == kind else '', t) for h, t in
                  [("termos.html", "Termos e Condições"), ("privacidade.html", "Privacidade"), ("cookies.html", "Cookies")])
    return f'''
<section class="panel page-hero">
  <div class="icon"><i class="fas fa-file-shield" aria-hidden="true"></i></div>
  <div><h1>{title}</h1><p>{sub}</p></div>
</section>
<section class="panel">
  <nav class="legal-nav" aria-label="Documentos legais">{nav}</nav>
  <div class="legal-body">
    <p class="legal-updated">Última atualização: {updated}</p>
    {body}
  </div>
</section>'''

def notfound():
    return f'''
<section class="panel page-hero">
  <div class="icon gold"><i class="fas fa-dice" aria-hidden="true"></i></div>
  <div><h1>404 · Página não encontrada</h1><p>Esta rodada não saiu. A página que procuras não existe ou mudou de sítio.</p>
  <div class="hero-actions" style="margin-top:1rem"><a href="{SITE}/" class="btn-gold">Voltar ao início</a><a href="{SITE}/casinos.html" class="btn-ghost">Ver ofertas</a></div></div>
</section>'''

if __name__ == "__main__":
    page("index.html", "O BABA YAGA — Casino Streamer", "Lives de casino na Twitch, ofertas exclusivas dos patrocínios oficiais, minijogos com fichas virtuais, ranking da comunidade e loja de pontos. 18+ Joga com responsabilidade.", "Início", home(), promo=True)
    page("casinos.html", "Casinos e ofertas — O BABA YAGA", "Todas as ofertas dos patrocinadores do O BABA YAGA: bónus de boas-vindas, free spins, casinos cripto e códigos promocionais. 18+", "Casinos", casinos())
    page("comunidade.html", "Comunidade — O BABA YAGA", "Redes sociais, ranking, minijogos e loja de pontos da comunidade do O BABA YAGA.", "Comunidade", comunidade())
    page("jogos.html", "Minijogos — O BABA YAGA", "Crash, Blackjack, Dados e Minas com fichas virtuais, sem dinheiro real. Diverte-te e joga com responsabilidade.", "Minijogos", jogos(), scripts=("games.js",), body_attr=' data-game="hub"')
    page("crash.html", "Crash — Minijogos O BABA YAGA", "Crash com fichas virtuais: o multiplicador sobe até rebentar, recolhe a tempo.", "Crash", crash(), scripts=("games.js",), body_attr=' data-game="crash"')
    page("blackjack.html", "Blackjack — Minijogos O BABA YAGA", "Blackjack com fichas virtuais. Vence o dealer, paga 3 para 2.", "Blackjack", blackjack(), scripts=("games.js",), body_attr=' data-game="blackjack"')
    page("dados.html", "Dados — Minijogos O BABA YAGA", "Dados com fichas virtuais: escolhe o alvo, define a hipótese e roda.", "Dados", dados(), scripts=("games.js",), body_attr=' data-game="dice"')
    page("minas.html", "Minas — Minijogos O BABA YAGA", "Minas com fichas virtuais: limpa a grelha e foge das minas.", "Minas", minas(), scripts=("games.js",), body_attr=' data-game="mines"')
    page("ranking.html", "Ranking da comunidade — O BABA YAGA", "Vê os teus pontos de fidelidade e a tabela classificativa da comunidade do O BABA YAGA.", "Ranking", ranking())
    page("loja.html", "Loja de pontos — O BABA YAGA", "Troca os teus pontos de fidelidade por prémios e vantagens exclusivas.", "Loja", loja())
    page("contacto.html", "Contacto — O BABA YAGA", "Contacto para propostas de parceria, patrocínios e outras questões. Resposta em 24–48 horas.", "Contacto", contacto(), age_gate=False)
    page("termos.html", "Termos e Condições — O BABA YAGA", "Condições de utilização do site obabayaga.com: idade mínima, pontos virtuais, promoções, links de afiliado, uso proibido e jogo responsável.", "Termos e Condições", legal("termos.html", "Termos e Condições", "As regras de utilização deste site e da comunidade.", TERMS), age_gate=False, with_chat=False)
    page("privacidade.html", "Política de Privacidade — O BABA YAGA", "Que dados o site obabayaga.com trata, serviços de terceiros, links de afiliado e os teus direitos ao abrigo do RGPD.", "Privacidade", legal("privacidade.html", "Política de Privacidade", "Que dados usamos, porquê, e os teus direitos.", PRIVACY), age_gate=False, with_chat=False)
    page("cookies.html", "Política de Cookies — O BABA YAGA", "Que cookies e armazenamento local o site obabayaga.com usa, para quê, e como os podes gerir.", "Cookies", legal("cookies.html", "Política de Cookies", "Cookies, armazenamento local e como os controlas.", COOKIES), age_gate=False, with_chat=False)
    page("404.html", "Página não encontrada — O BABA YAGA", "A página que procuras não existe.", "404", notfound(), age_gate=False, with_chat=False, extra_head='\n    <meta name="robots" content="noindex">')
    # 404: GitHub Pages serve-o em qualquer caminho -> URLs absolutos
    p = ROOT / "404.html"; s = p.read_text(encoding="utf-8")
    s = s.replace('href="style.css', f'href="{SITE}/style.css').replace('href="assets/', f'href="{SITE}/assets/').replace('src="assets/', f'src="{SITE}/assets/')
    s = s.replace('src="script.js', f'src="{SITE}/script.js').replace('src="twitch-auth.js', f'src="{SITE}/twitch-auth.js')
    s = re.sub(r'href="([a-z0-9]+\.html)', rf'href="{SITE}/\1', s)
    p.write_text(s, encoding="utf-8")
    # sitemap
    pages = ["", "casinos.html", "comunidade.html", "jogos.html", "crash.html", "blackjack.html", "dados.html", "minas.html", "ranking.html", "loja.html", "contacto.html", "termos.html", "privacidade.html", "cookies.html"]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for pg in pages:
        pr = "1.0" if pg == "" else ("0.3" if pg in ("termos.html", "privacidade.html", "cookies.html") else "0.7")
        sm += f"  <url><loc>{SITE}/{pg}</loc><lastmod>2026-09-07</lastmod><priority>{pr}</priority></url>\n"
    (ROOT / "sitemap.xml").write_text(sm + "</urlset>\n")
    print("ok sitemap")
