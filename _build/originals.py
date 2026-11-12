#!/usr/bin/env python3
"""
Gera as páginas dos minijogos "Originals" (estilo Stake):
crash, blackjack, dados, minas, plinko, roleta e slots.

Usa o crash.html como molde (cabeçalho, menu, rodapé, chat) e troca só
a parte do jogo. Corre a partir da raiz do site:

    python3 _build/originals.py

ATENÇÃO: se correres o _build/build.py, ele volta a gerar as páginas
antigas dos jogos — corre este script logo a seguir.
"""
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
VER = "3"

# Seletor Treino / Ranking + saldo + caixa do ranking (igual em todos os jogos)
SALDO = '''<div class="og-modo" role="group" aria-label="Modo de jogo"><button type="button" data-modo="treino" aria-pressed="true"><i class="fas fa-dumbbell" aria-hidden="true"></i> Treino</button><button type="button" data-modo="ranking" aria-pressed="false"><i class="fas fa-trophy" aria-hidden="true"></i> Ranking semanal</button></div>
  <div class="og-balance"><span class="og-balance-l">Fichas</span><strong><i class="fas fa-coins" aria-hidden="true"></i> <span data-balance>1.000</span></strong><button class="og-mini" id="balanceReset" type="button" title="Repor 1.000 fichas"><i class="fas fa-rotate-right" aria-hidden="true"></i></button></div>
  <div class="og-rankbox" id="ogRankBox" hidden></div>'''


def lado(bet_id, extra="", botao_id="", botao_txt="Apostar", depois=""):
    return f'''<aside class="og-side">
{SALDO}
  <div class="og-field">
    <label class="og-label" for="{bet_id}">Montante da aposta</label>
    <div class="og-amount"><i class="fas fa-coins" aria-hidden="true"></i><input id="{bet_id}" type="number" min="1" step="1" value="10" inputmode="numeric"><button type="button" data-bet-op="half" data-target="{bet_id}">½</button><button type="button" data-bet-op="double" data-target="{bet_id}">2×</button><button type="button" data-bet-op="max" data-target="{bet_id}">Máx</button></div>
  </div>
  {extra}
  <button class="og-play" id="{botao_id}" type="button">{botao_txt}</button>
  {depois}
  <p class="og-fair"><i class="fas fa-shield-halved" aria-hidden="true"></i> Fichas sem valor · não se trocam por prémios</p>
</aside>'''

def topo(recent_id):
    return f'<div class="og-topbar"><div class="og-recent" id="{recent_id}" aria-label="Resultados recentes"></div><button class="og-sound" type="button"></button></div>'

JOGOS = {
    "crash": dict(
        nome="Crash", icone="fa-rocket", hist="crash", script="og-crash.js",
        desc="Crash com fichas virtuais: o foguete sobe e o multiplicador com ele. Recolhe antes de rebentar.",
        html=lado("crashBet", '''<div class="og-field"><label class="og-label" for="crashAuto">Recolha automática</label><div class="og-input-suffix"><input id="crashAuto" type="number" min="1.01" step="0.01" value="2.00"><span>x</span></div><small class="og-hint" id="crashAutoNota" hidden>No ranking a recolha é sempre a automática.</small></div>''', "crashPlay")
        + '''<div class="og-stage og-crash" id="crashStage">''' + topo("crashRecent") + '''
  <div class="og-crash-area"><canvas id="crashCanvas"></canvas><div class="og-crash-center"><div class="og-crash-mult" id="crashMult">1.00x</div><div class="og-crash-status" id="crashStatus">Faz a tua aposta para lançar o foguete</div></div></div>
</div>'''),
    "minas": dict(
        nome="Minas", icone="fa-bomb", hist="mines", script="og-mines.js",
        desc="Minas com fichas virtuais: encontra gemas, evita as minas e recolhe quando quiseres.",
        html=lado("minesBet", '''<div class="og-field"><label class="og-label" for="minesCount">Minas</label><select id="minesCount" class="og-select">''' + "".join(f'<option value="{n}"{" selected" if n == 3 else ""}>{n}</option>' for n in range(1, 25)) + '''</select></div>
  <div class="og-stats2"><div><small>Gemas</small><strong id="minesGems">22</strong></div><div><small>Minas</small><strong id="minesBombs">3</strong></div><div><small>Multiplicador</small><strong id="minesMult">1.00x</strong></div><div><small>Próxima</small><strong id="minesNext">1.13x</strong></div></div>
  <div class="og-field"><label class="og-label">Lucro</label><div class="og-amount og-readonly"><i class="fas fa-coins" aria-hidden="true"></i><span id="minesProfit">0</span></div></div>''', "minesPlay", depois='<button class="og-btn2" id="minesRandom" type="button" hidden><i class="fas fa-shuffle" aria-hidden="true"></i> Escolha aleatória</button>')
        + '''<div class="og-stage og-mines" id="minesStage">''' + topo("minesRecent") + '''<div class="og-mines-grid" id="minesGrid"></div></div>'''),
    "dados": dict(
        nome="Dados", icone="fa-dice", hist="dice", script="og-dice.js",
        desc="Dados com fichas virtuais: escolhe o alvo, acima ou abaixo, e rola.",
        html=lado("diceBet", '''<div class="og-field"><label class="og-label">Lucro se ganhares</label><div class="og-amount og-readonly"><i class="fas fa-coins" aria-hidden="true"></i><span id="diceProfit">0</span></div></div>''', "dicePlay", "Rolar")
        + '''<div class="og-stage og-dice" id="diceStage">''' + topo("diceRecent") + '''
  <div class="og-dice-area">
    <div class="og-dice-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
    <div class="og-dice-track" id="diceTrack">
      <div class="og-dice-bar"></div>
      <input type="range" id="diceSlider" min="2" max="98" step="0.01" value="50.5" aria-label="Alvo">
      <div class="og-dice-result" id="diceResult"><span>50.00</span></div>
    </div>
  </div>
  <div class="og-dice-fields">
    <label class="og-field"><span class="og-label">Multiplicador</span><div class="og-input-suffix"><input id="diceMultIn" type="number" step="0.0001" min="1.0102" max="49.5"><span>x</span></div></label>
    <div class="og-field"><span class="og-label" id="diceModeLabel">Rolar acima</span><div class="og-input-suffix"><input id="diceTarget" type="number" step="0.01" min="2" max="98"><button type="button" id="diceMode" class="og-swap" aria-label="Trocar acima/abaixo"><i class="fas fa-arrow-right-arrow-left" aria-hidden="true"></i></button></div></div>
    <label class="og-field"><span class="og-label">Probabilidade</span><div class="og-input-suffix"><input id="diceChance" type="number" step="0.01" min="2" max="98"><span>%</span></div></label>
  </div>
</div>'''),
    "blackjack": dict(
        nome="Blackjack", icone="fa-clone", hist="blackjack", script="og-blackjack.js",
        desc="Blackjack com fichas virtuais: 6 baralhos, dealer fica nos 17, Blackjack paga 3 para 2. Dobrar e dividir.",
        html=lado("bjBet", '''<div class="og-bj-actions"><button class="og-btn2" id="bjHit" type="button">Pedir <kbd>H</kbd></button><button class="og-btn2" id="bjStand" type="button">Ficar <kbd>S</kbd></button><button class="og-btn2" id="bjSplit" type="button">Dividir</button><button class="og-btn2" id="bjDouble" type="button">Dobrar <kbd>D</kbd></button></div>''', "bjPlay", "Distribuir")
        + '''<div class="og-stage og-bj" id="bjStage">''' + topo("bjRecent") + '''
  <div class="og-bj-table">
    <div class="og-shoe" aria-hidden="true"></div>
    <div class="og-bj-dealer"><div class="og-cards" id="bjDealer"></div><span class="og-total" id="bjDealerTotal" hidden></span></div>
    <div class="og-bj-felt"><strong>BLACKJACK PAGA 3 PARA 2</strong><span>O DEALER FICA EM TODOS OS 17</span></div>
    <div class="og-bj-player" id="bjPlayer"></div>
    <div class="og-bj-msg" id="bjMsg"></div>
  </div>
</div>'''),
    "plinko": dict(
        nome="Plinko", icone="fa-circle-dot", hist="plinko", script="og-plinko.js",
        desc="Plinko com fichas virtuais: a bola cai pelos pinos até um multiplicador. Escolhe o risco e as linhas.",
        html=lado("plinkoBet", '''<div class="og-field"><label class="og-label" for="plinkoRisk">Risco</label><select id="plinkoRisk" class="og-select"><option value="baixo">Baixo</option><option value="medio" selected>Médio</option><option value="alto">Alto</option></select></div>
  <div class="og-field"><label class="og-label" for="plinkoRows">Linhas</label><select id="plinkoRows" class="og-select"><option value="8">8</option><option value="12">12</option><option value="16" selected>16</option></select></div>''', "plinkoPlay", "Lançar bola")
        + '''<div class="og-stage og-plinko" id="plinkoStage">''' + topo("plinkoRecent") + '''<div class="og-plinko-area"><canvas id="plinkoCanvas"></canvas><div class="og-buckets" id="plinkoBuckets"></div></div></div>'''),
    "roleta": dict(
        nome="Roleta", icone="fa-life-ring", hist="roulette", script="og-roulette.js",
        desc="Roleta europeia com fichas virtuais: aposta em números, cores, dúzias e colunas.",
        html='''<aside class="og-side">
  ''' + SALDO + '''
  <div class="og-field"><span class="og-label">Valor da ficha</span><div class="og-chips" id="rlChips"></div></div>
  <div class="og-field"><span class="og-label">Total apostado</span><div class="og-amount og-readonly"><i class="fas fa-coins" aria-hidden="true"></i><span id="rlTotal">0</span></div></div>
  <div class="og-bj-actions"><button class="og-btn2" id="rlUndo" type="button"><i class="fas fa-rotate-left" aria-hidden="true"></i> Desfazer</button><button class="og-btn2" id="rlClear" type="button"><i class="fas fa-trash" aria-hidden="true"></i> Limpar</button></div>
  <button class="og-btn2" id="rlRepeat" type="button"><i class="fas fa-repeat" aria-hidden="true"></i> Repetir última aposta</button>
  <button class="og-play" id="rlPlay" type="button">Girar</button>
  <p class="og-hint">Clica na mesa para pôr fichas. Botão direito tira as fichas de uma casa.</p>
  <p class="og-fair"><i class="fas fa-shield-halved" aria-hidden="true"></i> Fichas sem valor · não se trocam por prémios</p>
</aside>
<div class="og-stage og-rl" id="rlStage">''' + topo("rlRecent") + '''
  <div class="og-rl-top"><div class="og-rl-wheelwrap"><canvas id="rlWheel"></canvas><div class="og-rl-pointer"></div></div><div class="og-rl-result" id="rlResult"></div></div>
  <div class="og-rl-boardwrap"><div class="og-rl-board" id="rlBoard"></div></div>
</div>'''),
    "slots": dict(
        nome="Slot", icone="fa-gem", hist="slots", script="og-slots.js",
        desc="Slot de 5 rolos com fichas virtuais: 10 linhas, símbolos clássicos e Big Wins.",
        html=lado("slotBet", '''<div class="og-field"><span class="og-label">Tabela de prémios <small>(× a aposta)</small></span><div class="og-paytable" id="slotPaytable"></div></div>''', "slotPlay", "Girar")
        + '''<div class="og-stage og-slots" id="slotStage">''' + topo("slotRecent") + '''
  <div class="og-slot-frame"><div class="og-slot-title">FabioSilva<span>_TV</span></div><div class="og-slot-reels" id="slotReels"></div><div class="og-slot-win" id="slotWin"></div><p class="og-slot-info">10 linhas · 3 ou mais símbolos iguais a partir da esquerda</p></div>
</div>'''),
}

def gerar(slug, j, molde):
    s = molde
    titulo = f'{j["nome"]} — Minijogos FabioSilva_TV'
    s = re.sub(r"<title>.*?</title>", f"<title>{titulo}</title>", s, count=1)
    for attr in ('name="description"', 'property="og:description"', 'name="twitter:description"'):
        s = re.sub(rf'<meta {attr} content="[^"]*">', f'<meta {attr} content="{j["desc"]}">', s, count=1)
    for attr in ('property="og:title"', 'name="twitter:title"'):
        s = re.sub(rf'<meta {attr} content="[^"]*">', f'<meta {attr} content="{titulo}">', s, count=1)
    s = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="https://fabiosilvatv.com/{slug}.html">', s, count=1)
    s = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="https://fabiosilvatv.com/{slug}.html">', s, count=1)
    # cabeçalho do jogo
    s = re.sub(r'(<section class="panel game-header">.*?<span class="game-icon"><i class="fas )[^"]*(" aria-hidden="true"></i></span>\s*<h1>)[^<]*(</h1>)',
               lambda m: m.group(1) + j["icone"] + m.group(2) + j["nome"] + m.group(3), s, count=1, flags=re.S)
    # área do jogo
    s = re.sub(r'<section class="(?:game-layout|og-shell)">.*?\n</section>', f'<section class="og-shell">\n{j["html"]}\n</section>', s, count=1, flags=re.S)
    # histórico
    s = re.sub(r'As tuas últimas jogadas em [^·<]+·', f'As tuas últimas jogadas em {j["nome"]} ·', s, count=1)
    s = re.sub(r'<tbody id="historyBody" data-game="[^"]*">', f'<tbody id="historyBody" data-game="{j["hist"]}">', s, count=1)
    # "Estás em …" na barra de cima
    s = re.sub(r'(<div class="crumb"><small>Estás em</small><strong>)[^<]*(</strong>)', lambda m: m.group(1) + j["nome"] + m.group(2), s, count=1)
    # css e scripts
    s = re.sub(r'\s*<link rel="stylesheet" href="og\.css[^"]*">', '', s)
    s = re.sub(r'(<link rel="stylesheet" href="style\.css[^"]*">)', rf'\1\n    <link rel="stylesheet" href="og.css?v={VER}">', s, count=1)
    s = re.sub(r'<script src="(?:games|og-[a-z]+)\.js[^"]*"></script>\n?', '', s)
    s = re.sub(r'(<script src="twitch-auth\.js[^"]*"></script>\n)', rf'\1<script src="og-motor.js?v={VER}"></script>\n<script src="og-core.js?v={VER}"></script>\n<script src="{j["script"]}?v={VER}"></script>\n', s, count=1)
    (RAIZ / f"{slug}.html").write_text(s, encoding="utf-8")
    print("gerado", slug + ".html")

if __name__ == "__main__":
    molde = (RAIZ / "crash.html").read_text(encoding="utf-8")
    for slug, j in JOGOS.items():
        gerar(slug, j, molde)
