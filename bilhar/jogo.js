// Bilhar 8 bolas — mesa, controlos, computador e jogo online (1 contra 1).
//
// Online: o anfitrião é o jogador 1 e é quem decide (regras e posição
// final das bolas). Quem dá a tacada manda a direção/força; os dois
// simulam a jogada para a verem; no fim o anfitrião envia o resultado.
import * as M from './motor.js?v=1';

const RAIL = 46;                       // largura da tabela de madeira (unidades da mesa)
const TEMPO = 45;                      // segundos por tacada
const CORES = { 1: '#f2c21b', 2: '#1f4fd6', 3: '#d62a1f', 4: '#6a2aa8', 5: '#f07a12', 6: '#1a8a3a', 7: '#7a1a22', 8: '#111111' };
const corDe = (n) => CORES[n > 8 ? n - 8 : n] || '#fff';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const agora = () => performance.now();
const NIVEIS = ['fácil', 'médio', 'difícil'];

function relogio(hz, fn) {
  try {
    const url = URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),' + Math.round(1000 / hz) + ')'], { type: 'text/javascript' }));
    const w = new Worker(url); w.onmessage = fn;
    return () => { w.terminate(); URL.revokeObjectURL(url); };
  } catch (e) { const i = setInterval(fn, 1000 / hz); return () => clearInterval(i); }
}

class Som {
  constructor() { this.ctx = null; this.ligado = localStorage.getItem('bilhar_som') !== '0'; }
  ligar() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } else if (this.ctx.state === 'suspended') this.ctx.resume(); }
  toc(vol, freq = 1900) {
    if (!this.ctx || !this.ligado) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.04);
    g.gain.setValueAtTime(Math.min(0.5, vol), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + 0.06);
  }
  bolso() { if (!this.ctx || !this.ligado) return; this.toc(0.3, 260); setTimeout(() => this.toc(0.2, 180), 60); }
}

export class Bilhar {
  /**
   * o: { raiz, modo: 'cpu'|'anfitriao'|'cliente', eu: {id, nome}, rede, api, cod, nivel, hostId, aoSair }
   */
  constructor(o) {
    Object.assign(this, o);
    this.ehHost = o.modo !== 'cliente';
    this.som = new Som();
    this.jogadores = [{ id: this.eu.id, nome: this.eu.nome }, null];
    if (this.modo === 'cpu') this.jogadores[1] = { id: 'cpu', nome: 'Computador (' + NIVEIS[this.nivel ?? 1] + ')', cpu: true };
    this.meuIdx = this.ehHost ? 0 : 1;
    this.bolas = M.triangulo(1);
    this.estado = null;           // null = à espera de adversário
    this.mira = { dx: 1, dy: 0 };
    this.forca = 0;
    this.efeito = { x: 0, y: 0 };
    this.chamado = null;
    this.sim = null;
    this.estadoPendente = null;
    this.miraOutro = null;
    this.vitorias = [0, 0];
    this.montar();
    if (this.rede) this.ligarRede();
    if (this.modo === 'cpu') this.novoJogo(Math.random() < 0.5 ? 0 : 1);
    this.desenharPainel();
    this.ultimo = agora();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    this.pararRelogio = relogio(60, () => this.tick());
  }

  // ── DOM ────────────────────────────────────────────────────────────
  montar() {
    const r = this.raiz;
    r.classList.add('bh-raiz');
    r.innerHTML = `
      <div class="bh-topo">
        <div class="bh-jog" id="bhJ0"></div>
        <div class="bh-msg" id="bhMsg" role="status"></div>
        <div class="bh-jog dir" id="bhJ1"></div>
      </div>
      <div class="bh-zona">
        <div class="bh-mesa"><canvas id="bhCanvas"></canvas></div>
        <div class="bh-forca" id="bhForca" title="Puxa para baixo e larga para dar a tacada"><div class="bh-taco" id="bhTaco"></div><span>Força</span></div>
      </div>
      <div class="bh-baixo">
        <button class="bh-efeito" id="bhEfeito" type="button" aria-label="Efeito na bola branca"><span id="bhEfeitoPonto"></span></button>
        <div class="bh-fino"><button type="button" id="bhEsq" aria-label="Rodar a mira para a esquerda">◀</button><span>Ajuste fino</span><button type="button" id="bhDir" aria-label="Rodar a mira para a direita">▶</button></div>
        <button class="bh-botao" id="bhSom" type="button"></button>
        <button class="bh-botao" id="bhSair" type="button">Sair</button>
      </div>
      <div class="bh-efeito-grande" id="bhEfeitoG" hidden><div class="bh-bola-branca" id="bhBB"><span id="bhBBp"></span></div><p>Toca na bola para escolher o efeito: em cima segue, em baixo puxa, aos lados muda as tabelas.</p><button type="button" class="btn-ghost" id="bhEfOk">Feito</button></div>
      <div class="bh-painel" id="bhPainel" hidden></div>`;
    const $ = (id) => r.querySelector('#' + id);
    this.el = { canvas: $('bhCanvas'), j0: $('bhJ0'), j1: $('bhJ1'), msg: $('bhMsg'), forca: $('bhForca'), taco: $('bhTaco'), efeito: $('bhEfeito'), efeitoP: $('bhEfeitoPonto'), efG: $('bhEfeitoG'), bb: $('bhBB'), bbp: $('bhBBp'), painel: $('bhPainel'), som: $('bhSom') };
    this.ctx = this.el.canvas.getContext('2d');
    this.redim = () => this.redimensionar();
    window.addEventListener('resize', this.redim);
    this.redimensionar();
    setTimeout(this.redim, 300);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(this.redim);
    this.ligarControlos();
    this.el.som.textContent = this.som.ligado ? 'Som: sim' : 'Som: não';
  }
  redimensionar() {
    const c = this.el.canvas, caixa = c.parentElement;
    const topo = this.raiz.querySelector('.bh-topo'), baixo = this.raiz.querySelector('.bh-baixo');
    const altLivre = (this.raiz.clientHeight || window.innerHeight) - (topo ? topo.offsetHeight : 80) - (baixo ? baixo.offsetHeight : 50) - 60;
    const disp = Math.min(caixa.clientWidth, altLivre * (M.W + 2 * RAIL) / (M.H + 2 * RAIL));
    const w = Math.max(280, disp), h = w * (M.H + 2 * RAIL) / (M.W + 2 * RAIL);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    this.esc = (w * dpr) / (M.W + 2 * RAIL);
    this.dpr = dpr;
    this.el.forca.style.height = h + 'px';
  }
  // coordenadas do rato -> mesa
  paraMesa(ev) {
    const r = this.el.canvas.getBoundingClientRect();
    return [((ev.clientX - r.left) * this.dpr) / this.esc - RAIL, ((ev.clientY - r.top) * this.dpr) / this.esc - RAIL];
  }

  // ── controlos ──────────────────────────────────────────────────────
  minhaVez() { return this.estado && this.estado.vencedor === null && this.estado.vez === this.meuIdx && !this.sim && !this.estadoPendente; }
  ligarControlos() {
    const c = this.el.canvas;
    let arrastarBranca = false;
    c.addEventListener('pointerdown', (ev) => {
      this.som.ligar();
      if (!this.minhaVez()) return;
      const [x, y] = this.paraMesa(ev);
      const cue = this.bolas.find((o) => o.n === 0);
      // escolher o bolso da bola 8
      if (M.naOito(this.estado, this.bolas, this.meuIdx)) {
        const k = M.BOLSOS.findIndex((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < 45 * 45);
        if (k >= 0) { this.chamado = k; this.mostrarMsg('Bolso escolhido. Agora aponta e dá a tacada.'); return; }
      }
      if (this.estado.mao && (cue.x - x) ** 2 + (cue.y - y) ** 2 < (M.R * 2.6) ** 2) { arrastarBranca = true; c.setPointerCapture(ev.pointerId); return; }
      this.apontarPara(x, y);
      c.setPointerCapture(ev.pointerId);
      this.aApontar = true;
    });
    c.addEventListener('pointermove', (ev) => {
      if (!this.minhaVez()) return;
      const [x, y] = this.paraMesa(ev);
      if (arrastarBranca) { this.moverBranca(x, y); return; }
      // com rato aponta só de passar; com o dedo só a arrastar
      if (ev.pointerType === 'mouse' || this.aApontar) this.apontarPara(x, y);
    });
    const fim = () => { arrastarBranca = false; this.aApontar = false; };
    c.addEventListener('pointerup', fim); c.addEventListener('pointercancel', fim);
    c.addEventListener('wheel', (ev) => { if (!this.minhaVez()) return; ev.preventDefault(); this.rodar(ev.deltaY > 0 ? 0.0025 : -0.0025); }, { passive: false });
    this.onKey = (ev) => {
      if (!this.minhaVez() || ev.target.closest('input')) return;
      if (ev.key === 'ArrowLeft') { this.rodar(ev.shiftKey ? -0.01 : -0.0015); ev.preventDefault(); }
      if (ev.key === 'ArrowRight') { this.rodar(ev.shiftKey ? 0.01 : 0.0015); ev.preventDefault(); }
    };
    document.addEventListener('keydown', this.onKey);
    // ajuste fino (botões, carregar e manter)
    for (const [id, d] of [['bhEsq', -0.0015], ['bhDir', 0.0015]]) {
      const b = this.raiz.querySelector('#' + id);
      let t = null;
      const parar = () => { clearInterval(t); t = null; };
      b.addEventListener('pointerdown', () => { this.rodar(d); t = setInterval(() => this.rodar(d), 60); });
      b.addEventListener('pointerup', parar); b.addEventListener('pointerleave', parar);
    }
    // barra de força: puxa para baixo e larga
    const f = this.el.forca;
    let puxar = false, y0 = 0;
    f.addEventListener('pointerdown', (ev) => {
      this.som.ligar();
      if (!this.minhaVez()) return;
      puxar = true; y0 = ev.clientY; f.setPointerCapture(ev.pointerId);
    });
    f.addEventListener('pointermove', (ev) => {
      if (!puxar) return;
      this.forca = Math.max(0, Math.min(1, (ev.clientY - y0) / (f.clientHeight * 0.85)));
    });
    const largar = () => {
      if (!puxar) return;
      puxar = false;
      if (this.forca > 0.02 && this.minhaVez()) this.tacar(); else this.forca = 0;
    };
    f.addEventListener('pointerup', largar); f.addEventListener('pointercancel', largar);
    // efeito
    this.el.efeito.addEventListener('click', () => { this.el.efG.hidden = false; });
    this.raiz.querySelector('#bhEfOk').addEventListener('click', () => { this.el.efG.hidden = true; });
    this.el.bb.addEventListener('pointerdown', (ev) => {
      const r = this.el.bb.getBoundingClientRect();
      let x = ((ev.clientX - r.left) / r.width) * 2 - 1, y = ((ev.clientY - r.top) / r.height) * 2 - 1;
      const L = Math.hypot(x, y); if (L > 0.8) { x *= 0.8 / L; y *= 0.8 / L; }
      this.efeito = { x, y: -y };
      this.desenharEfeito();
    });
    this.el.som.addEventListener('click', () => { this.som.ligado = !this.som.ligado; localStorage.setItem('bilhar_som', this.som.ligado ? '1' : '0'); this.el.som.textContent = this.som.ligado ? 'Som: sim' : 'Som: não'; this.som.ligar(); });
    this.raiz.querySelector('#bhSair').addEventListener('click', () => this.sair());
    this.desenharEfeito();
  }
  desenharEfeito() {
    const { x, y } = this.efeito;
    for (const [el, k] of [[this.el.efeitoP, 40], [this.el.bbp, 40]]) { el.style.left = 50 + x * k + '%'; el.style.top = 50 - y * k + '%'; }
  }
  apontarPara(x, y) {
    const cue = this.bolas.find((o) => o.n === 0);
    const dx = x - cue.x, dy = y - cue.y, L = Math.hypot(dx, dy);
    if (L < 2) return;
    this.mira = { dx: dx / L, dy: dy / L };
  }
  rodar(a) {
    const c = Math.cos(a), s = Math.sin(a), { dx, dy } = this.mira;
    this.mira = { dx: dx * c - dy * s, dy: dx * s + dy * c };
  }
  moverBranca(x, y) {
    const cue = this.bolas.find((o) => o.n === 0);
    const lim = this.estado.cozinha ? M.COZINHA : M.W - M.R;
    x = Math.max(M.R, Math.min(lim, x)); y = Math.max(M.R, Math.min(M.H - M.R, y));
    if (M.posicaoLivre(this.bolas, x, y, cue, this.estado.cozinha)) { cue.x = x; cue.y = y; cue.dentro = false; }
  }

  // ── jogo ───────────────────────────────────────────────────────────
  novoJogo(quemSai, sorte) {
    this.sorte = sorte ?? Math.floor(Math.random() * 1e9);
    this.bolas = M.triangulo(this.sorte);
    this.estado = M.estadoInicial(quemSai);
    this.estado.msg = this.nome(quemSai) + ' faz a saída. Põe a bola branca atrás da linha e parte o triângulo.';
    this.inicioVez = agora();
    this.chamado = null; this.forca = 0; this.sim = null; this.estadoPendente = null;
    this.mira = { dx: 1, dy: 0 };
    if (this.rede && this.ehHost) this.rede.todos({ t: 'jogo', sorte: this.sorte, quemSai, jogadores: this.jogadores }, true);
    this.depoisDeMudar();
  }
  nome(i) { return (this.jogadores[i] && this.jogadores[i].nome) || 'Jogador ' + (i + 1); }

  tacar() {
    const t = { dx: this.mira.dx, dy: this.mira.dy, forca: this.forca, ex: this.efeito.x, ey: this.efeito.y };
    if (M.naOito(this.estado, this.bolas, this.meuIdx) && this.chamado == null) {
      this.forca = 0;
      this.mostrarMsg('Estás na bola 8: toca primeiro no bolso onde a vais meter.');
      return;
    }
    const cue = this.bolas.find((o) => o.n === 0);
    const jogada = { t: 'tacada', pos: this.estado.mao ? [cue.x, cue.y] : null, tacada: t, chamado: this.chamado, n: this.estado.tacadas };
    if (this.rede) (this.ehHost ? this.rede.todos(jogada, true) : this.rede.enviar(jogada, true));
    this.comecarTacada(jogada);
  }
  comecarTacada(j) {
    if (j.pos) { const c = this.bolas.find((o) => o.n === 0); c.x = j.pos[0]; c.y = j.pos[1]; c.dentro = false; }
    this.jogadaAtual = j;
    this.sim = M.novaSimulacao(this.bolas, j.tacada);
    this.antes = { toques: 0, tabelas: 0, dentro: 0 };
    this.som.toc(0.15 + j.tacada.forca * 0.35, 900);
    this.forca = 0; this.miraOutro = null;
    this.acum = 0;
  }
  // avança a simulação (chamado 60x por segundo, mesmo com a janela escondida)
  tick() {
    if (this.fechado) return;
    const t = agora();
    const dt = Math.min(0.25, (t - (this.ultimoTick || t)) / 1000);
    this.ultimoTick = t;
    if (this.sim) {
      this.acum += dt;
      const nPassos = Math.floor(this.acum * 600);
      this.acum -= nPassos / 600;
      for (let i = 0; i < nPassos && !this.sim.acabou; i++) M.passo(this.sim);
      this.bolas = this.sim.bolas;
      // sons
      const ev = this.sim.ev;
      if (ev.toques > this.antes.toques) { this.som.toc(0.25); this.antes.toques = ev.toques; }
      if (ev.tabelas > this.antes.tabelas) { this.som.toc(0.08, 500); this.antes.tabelas = ev.tabelas; }
      if (ev.encacapadas.length > this.antes.dentro) { this.som.bolso(); this.antes.dentro = ev.encacapadas.length; }
      if (this.sim.acabou) this.fimTacada();
    } else if (this.estado && this.estado.vencedor === null && !this.estadoPendente) {
      // tempo da vez (quem decide é o anfitrião)
      if (this.ehHost && t - this.inicioVez > TEMPO * 1000) this.faltaTempo();
      if (this.modo === 'cpu' && this.estado.vez === 1) this.vezComputador(t);
      // mostrar a mira ao adversário
      if (this.rede && this.minhaVez() && t - (this.ultimaMira || 0) > 100) {
        this.ultimaMira = t;
        const cue = this.bolas.find((o) => o.n === 0);
        const m = { t: 'mira', d: [Math.round(this.mira.dx * 1e4) / 1e4, Math.round(this.mira.dy * 1e4) / 1e4], f: Math.round(this.forca * 100) / 100, mao: this.estado.mao ? [Math.round(cue.x), Math.round(cue.y)] : null };
        if (this.ehHost) this.rede.todos(m, false); else this.rede.enviar(m, false);
      }
    }
    // a sala continua na lista do site
    if (this.api && this.cod && this.ehHost && this.modo === 'anfitriao' && t - (this.ultimoEstadoApi || 0) > 20000) {
      this.ultimoEstadoApi = t;
      this.api.estado({ cod: this.cod, n: this.jogadores[1] ? 2 : 1, estado: this.estado ? (this.estado.vencedor !== null ? 'fim' : 'jogo') : 'lobby', placar: this.vitorias[0] + '-' + this.vitorias[1] }).catch(() => {});
    }
  }
  fimTacada() {
    const sim = this.sim, j = this.jogadaAtual;
    this.sim = null;
    if (this.ehHost) {
      const r = M.aplicarRegras(this.estado, this.bolasAntes || this.bolas, sim, j.chamado, [this.nome(0), this.nome(1)]);
      this.aplicarEstado(r.estado, r.bolas);
      if (this.rede) this.rede.todos({ t: 'estado', estado: this.estado, bolas: this.bolas.map((o) => [o.n, o.x, o.y, o.dentro ? 1 : 0]), vitorias: this.vitorias }, true);
    } else if (this.estadoPendente) {
      const p = this.estadoPendente; this.estadoPendente = null;
      this.aplicarEstadoRede(p);
    } else this.estadoPendente = 'espera';
  }
  aplicarEstado(estado, bolas) {
    const vezAntes = this.estado ? this.estado.vez : null;
    if (estado.vencedor !== null && this.estado.vencedor === null) this.vitorias[estado.vencedor]++;
    this.estado = estado; this.bolas = bolas;
    if (estado.vez !== vezAntes || estado.mao) this.chamado = null;
    this.inicioVez = agora();
    this.depoisDeMudar();
  }
  aplicarEstadoRede(m) {
    const bolas = m.bolas.map(([n, x, y, d]) => ({ n, x, y, vx: 0, vy: 0, dentro: !!d }));
    this.vitorias = m.vitorias || this.vitorias;
    this.estado = m.estado; this.bolas = bolas;
    this.chamado = null; this.inicioVez = agora();
    this.depoisDeMudar();
  }
  depoisDeMudar() {
    this.bolasAntes = M.copiarBolas(this.bolas);
    this.mostrarMsg(this.estado.msg);
    this.desenharJogadores();
    if (this.estado.vencedor !== null) setTimeout(() => this.desenharPainel(), 900);
    else this.desenharPainel();
    // aponta para a bola mais perto, para começar
    if (this.minhaVez()) {
      const cue = this.bolas.find((o) => o.n === 0);
      const alvos = M.alvosLegais(this.estado, this.bolas).map((n) => this.bolas.find((o) => o.n === n));
      const a = alvos.sort((p, q) => ((p.x - cue.x) ** 2 + (p.y - cue.y) ** 2) - ((q.x - cue.x) ** 2 + (q.y - cue.y) ** 2))[0];
      if (a) this.apontarPara(a.x, a.y);
      if (this.estado.saida) this.apontarPara(M.PE.x, M.PE.y);
    }
  }
  faltaTempo() {
    const e = JSON.parse(JSON.stringify(this.estado));
    const j = e.vez;
    e.vez = 1 - j; e.mao = true; e.cozinha = false; e.saida = false;
    e.msg = 'Acabou o tempo de ' + this.nome(j) + '. ' + this.nome(1 - j) + ' tem a bola na mão.';
    this.aplicarEstado(e, this.bolas);
    if (this.rede) this.rede.todos({ t: 'estado', estado: this.estado, bolas: this.bolas.map((o) => [o.n, o.x, o.y, o.dentro ? 1 : 0]), vitorias: this.vitorias }, true);
  }
  vezComputador(t) {
    if (!this.pensarAte) { this.pensarAte = t + 900 + Math.random() * 700; this.jogadaCpu = M.jogadaComputador(this.estado, this.bolas, this.nivel ?? 1); return; }
    // mostra a mira a rodar até à jogada escolhida
    const j = this.jogadaCpu;
    if (j.pos) { const c = this.bolas.find((o) => o.n === 0); c.x = j.pos[0]; c.y = j.pos[1]; c.dentro = false; }
    this.miraOutro = { dx: j.tacada.dx, dy: j.tacada.dy, f: Math.min(1, Math.max(0, (t - (this.pensarAte - 400)) / 400)) * j.tacada.forca };
    if (t < this.pensarAte) return;
    this.pensarAte = 0;
    this.comecarTacada({ t: 'tacada', pos: j.pos, tacada: j.tacada, chamado: j.chamado });
  }

  // ── rede ───────────────────────────────────────────────────────────
  ligarRede() {
    if (this.ehHost) {
      this.rede.aoEntrar = (id, nome) => {
        if (this.jogadores[1]) { this.rede.enviar(id, { t: 'cheia' }); setTimeout(() => this.rede.expulsar(id), 400); return; }
        this.jogadores[1] = { id, nome };
        this.vitorias = [0, 0];
        this.novoJogo(Math.random() < 0.5 ? 0 : 1);
        this.ultimoEstadoApi = 0;
      };
      this.rede.aoSair = (id) => {
        if (!this.jogadores[1] || this.jogadores[1].id !== id) return;
        this.jogadores[1] = null; this.estado = null; this.sim = null;
        this.mostrarMsg(''); this.desenharJogadores();
        this.desenharPainel('O adversário saiu. A sala continua aberta para outra pessoa entrar.');
        this.ultimoEstadoApi = 0;
      };
      this.rede.aoReceber = (id, m) => {
        if (!this.jogadores[1] || id !== this.jogadores[1].id) return;
        if (m.t === 'mira') { if (this.estado && this.estado.vez === 1 && !this.sim) this.miraOutro = { dx: +m.d[0], dy: +m.d[1], f: +m.f || 0, mao: m.mao }; }
        else if (m.t === 'tacada') {
          if (!this.estado || this.estado.vez !== 1 || this.sim || this.estado.vencedor !== null) return;
          const t = m.tacada || {};
          const ok = [t.dx, t.dy, t.forca, t.ex, t.ey].every(Number.isFinite) && t.forca > 0 && t.forca <= 1;
          if (!ok) return;
          const L = Math.hypot(t.dx, t.dy) || 1;
          const tac = { dx: t.dx / L, dy: t.dy / L, forca: t.forca, ex: Math.max(-1, Math.min(1, t.ex)), ey: Math.max(-1, Math.min(1, t.ey)) };
          let pos = null;
          if (this.estado.mao && Array.isArray(m.pos)) {
            const cue = this.bolas.find((o) => o.n === 0);
            if (!M.posicaoLivre(this.bolas, +m.pos[0], +m.pos[1], cue, this.estado.cozinha)) return this.rede.enviar(id, { t: 'estado', estado: this.estado, bolas: this.bolas.map((o) => [o.n, o.x, o.y, o.dentro ? 1 : 0]), vitorias: this.vitorias }, true);
            pos = [+m.pos[0], +m.pos[1]];
          }
          const chamado = Number.isInteger(m.chamado) && m.chamado >= 0 && m.chamado < 6 ? m.chamado : null;
          this.comecarTacada({ t: 'tacada', pos, tacada: tac, chamado });
        } else if (m.t === 'revanche' && this.estado && this.estado.vencedor !== null) {
          this.novoJogo(1 - this.estado.vencedor);
        }
      };
    } else {
      const fila = this.rede.fila || [];
      this.rede.aoReceber = (m) => this.receber(m);
      this.rede.aoFechar = () => this.desenharPainel('O anfitrião fechou a sala ou a ligação caiu.', true);
      for (const m of fila) this.receber(m);
      this.rede.fila = [];
    }
  }
  receber(m) {
    if (m.t === 'jogo') {
      this.jogadores = m.jogadores;
      this.novoJogo(m.quemSai, m.sorte);
    } else if (m.t === 'mira') {
      if (this.estado && this.estado.vez === 0 && !this.sim) this.miraOutro = { dx: +m.d[0], dy: +m.d[1], f: +m.f || 0, mao: m.mao };
    } else if (m.t === 'tacada') {
      if (this.estado && this.estado.vez === 0 && !this.sim) this.comecarTacada(m);
    } else if (m.t === 'estado') {
      if (this.sim) this.estadoPendente = m;
      else { this.estadoPendente = null; this.aplicarEstadoRede(m); }
    } else if (m.t === 'cheia') this.desenharPainel('Esta sala já tem dois jogadores.', true);
  }

  // ── desenho ────────────────────────────────────────────────────────
  loop() {
    if (this.fechado) return;
    this.raf = requestAnimationFrame(this.loop);
    this.desenhar();
    this.atualizarTempo();
  }
  desenhar() {
    const g = this.ctx, k = this.esc;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.el.canvas.width, this.el.canvas.height);
    g.setTransform(k, 0, 0, k, RAIL * k, RAIL * k);
    const W = M.W, H = M.H;
    // madeira
    const mad = g.createLinearGradient(0, -RAIL, 0, H + RAIL);
    mad.addColorStop(0, '#5a3418'); mad.addColorStop(0.5, '#3a1f0e'); mad.addColorStop(1, '#5a3418');
    g.fillStyle = mad; this.ret(g, -RAIL, -RAIL, W + 2 * RAIL, H + 2 * RAIL, 30); g.fill();
    g.strokeStyle = 'rgba(255,122,26,.55)'; g.lineWidth = 2; this.ret(g, -RAIL + 7, -RAIL + 7, W + 2 * RAIL - 14, H + 2 * RAIL - 14, 24); g.stroke();
    // pano
    const pano = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.65);
    pano.addColorStop(0, '#1f55a8'); pano.addColorStop(1, '#123468');
    g.fillStyle = pano; g.fillRect(-14, -14, W + 28, H + 28);
    // tabelas (borracha)
    g.fillStyle = '#0f2c5a';
    for (const [ax, ay, bx, by] of M.TABELAS.slice(0, 6)) {
      if (ay === by) { const y = ay === 0 ? -14 : H; g.fillRect(ax, y, bx - ax, 14); }
      else { const x = ax === 0 ? -14 : W; g.fillRect(x, ay, 14, by - ay); }
    }
    // diamantes
    g.fillStyle = '#ffd9a8';
    for (let i = 1; i < 8; i++) { if (i === 4) continue; for (const y of [-RAIL / 2 - 4, H + RAIL / 2 + 4]) this.diamante(g, (W / 8) * i, y); }
    for (let i = 1; i < 4; i++) for (const x of [-RAIL / 2 - 4, W + RAIL / 2 + 4]) this.diamante(g, x, (H / 4) * i);
    // marcas no pano
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(M.COZINHA, 0); g.lineTo(M.COZINHA, H); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(M.PE.x, M.PE.y, 2.5, 0, 7); g.fill();
    g.save(); g.globalAlpha = 0.08; g.fillStyle = '#fff'; g.font = '700 46px Rajdhani, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FabioSilva_TV · After Work', W / 2, H / 2); g.restore();
    // bolsos
    M.BOLSOS.forEach((p, i) => {
      const r = i === 1 || i === 4 ? 22 : 25;
      g.fillStyle = '#05070c'; g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill();
      if (this.chamado === i || (this.estado && this.minhaVez() && M.naOito(this.estado, this.bolas, this.meuIdx) && this.chamado == null)) {
        g.strokeStyle = this.chamado === i ? '#ffd34d' : 'rgba(255,211,77,.45)'; g.lineWidth = this.chamado === i ? 4 : 2;
        g.beginPath(); g.arc(p.x, p.y, r + 5, 0, 7); g.stroke();
      }
    });
    // bola na mão: mostra onde se pode pôr
    const cue = this.bolas.find((o) => o.n === 0);
    if (this.minhaVez() && this.estado.mao) {
      if (this.estado.cozinha) { g.fillStyle = 'rgba(255,211,77,.07)'; g.fillRect(0, 0, M.COZINHA, H); }
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.setLineDash([5, 5]); g.lineWidth = 2;
      g.beginPath(); g.arc(cue.x, cue.y, M.R + 7, 0, 7); g.stroke(); g.setLineDash([]);
    }
    // sombras e bolas
    for (const o of this.bolas) if (!o.dentro) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(o.x + 3, o.y + 4, M.R, M.R * 0.85, 0, 0, 7); g.fill(); }
    // mira
    const aMirar = this.minhaVez() ? { dx: this.mira.dx, dy: this.mira.dy, f: this.forca } : (!this.sim && this.miraOutro);
    if (aMirar && this.estado && this.estado.vencedor === null && !cue.dentro) {
      if (this.minhaVez() || this.modo !== 'cpu' || true) this.desenharMira(g, cue, aMirar);
    }
    for (const o of this.bolas) if (!o.dentro) this.bola(g, o.n, o.x, o.y);
    if (aMirar && this.estado && this.estado.vencedor === null && !cue.dentro) this.desenharTaco(g, cue, aMirar);
  }
  ret(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  diamante(g, x, y) { g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 3, y); g.lineTo(x, y + 4); g.lineTo(x - 3, y); g.closePath(); g.fill(); }
  bola(g, n, x, y) {
    const R = M.R;
    g.save();
    g.beginPath(); g.arc(x, y, R, 0, 7); g.clip();
    if (n === 0) { g.fillStyle = '#f7f4ea'; g.fillRect(x - R, y - R, 2 * R, 2 * R); }
    else if (n > 8) { g.fillStyle = '#f7f4ea'; g.fillRect(x - R, y - R, 2 * R, 2 * R); g.fillStyle = corDe(n); g.fillRect(x - R, y - R * 0.55, 2 * R, R * 1.1); }
    else { g.fillStyle = corDe(n); g.fillRect(x - R, y - R, 2 * R, 2 * R); }
    if (n) {
      g.fillStyle = '#fbf8ef'; g.beginPath(); g.arc(x, y, R * 0.48, 0, 7); g.fill();
      g.fillStyle = '#111'; g.font = '700 ' + (n > 9 ? 9.5 : 11) + 'px Sora, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), x, y + 0.5);
    }
    const luz = g.createRadialGradient(x - R * 0.4, y - R * 0.45, 1, x, y, R * 1.05);
    luz.addColorStop(0, 'rgba(255,255,255,.75)'); luz.addColorStop(0.25, 'rgba(255,255,255,.12)'); luz.addColorStop(0.75, 'rgba(0,0,0,0)'); luz.addColorStop(1, 'rgba(0,0,0,.35)');
    g.fillStyle = luz; g.fillRect(x - R, y - R, 2 * R, 2 * R);
    g.restore();
  }
  desenharMira(g, cue, m) {
    const imp = M.primeiroImpacto(this.bolas, cue.x, cue.y, m.dx, m.dy);
    if (!isFinite(imp.t)) return;
    const legal = !imp.bola || M.alvosLegais(this.estado, this.bolas).includes(imp.bola) || this.estado.saida;
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(cue.x, cue.y); g.lineTo(imp.px, imp.py); g.stroke();
    g.beginPath(); g.arc(imp.px, imp.py, M.R, 0, 7); g.strokeStyle = legal ? 'rgba(255,255,255,.9)' : '#ff5c5c'; g.stroke();
    if (!legal) { g.beginPath(); g.moveTo(imp.px - 6, imp.py - 6); g.lineTo(imp.px + 6, imp.py + 6); g.moveTo(imp.px + 6, imp.py - 6); g.lineTo(imp.px - 6, imp.py + 6); g.stroke(); }
    if (imp.bola) {
      const o = imp.alvo, nx = o.x - imp.px, ny = o.y - imp.py, L = Math.hypot(nx, ny) || 1;
      const ux = nx / L, uy = ny / L;
      const corte = m.dx * ux + m.dy * uy;
      g.strokeStyle = 'rgba(255,255,255,.75)';
      g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + ux * (40 + 140 * corte), o.y + uy * (40 + 140 * corte)); g.stroke();
      // para onde vai a branca depois do choque
      let tx = m.dx - ux * corte, ty = m.dy - uy * corte; const tl = Math.hypot(tx, ty);
      if (tl > 0.05) { tx /= tl; ty /= tl; g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(imp.px, imp.py); g.lineTo(imp.px + tx * 50 * tl, imp.py + ty * 50 * tl); g.stroke(); }
    } else if (imp.normal) {
      const [nx, ny] = imp.normal, d = m.dx * nx + m.dy * ny;
      const rx = m.dx - 2 * d * nx, ry = m.dy - 2 * d * ny;
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(imp.px, imp.py); g.lineTo(imp.px + rx * 70, imp.py + ry * 70); g.stroke();
    }
  }
  desenharTaco(g, cue, m) {
    const atras = 16 + (m.f || 0) * 90;
    const x0 = cue.x - m.dx * (M.R + atras), y0 = cue.y - m.dy * (M.R + atras);
    const comp = 420;
    const x1 = x0 - m.dx * comp, y1 = y0 - m.dy * comp;
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 9; g.beginPath(); g.moveTo(x0 + 4, y0 + 6); g.lineTo(x1 + 4, y1 + 6); g.stroke();
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, '#f4f1e6'); gr.addColorStop(0.02, '#f4f1e6'); gr.addColorStop(0.025, '#ff7a1a'); gr.addColorStop(0.06, '#ff7a1a'); gr.addColorStop(0.065, '#e8c890'); gr.addColorStop(0.6, '#c9925a'); gr.addColorStop(0.62, '#2a1a10'); gr.addColorStop(1, '#1a0f08');
    g.strokeStyle = gr; g.lineWidth = 6.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.restore();
  }

  // ── painéis e textos ───────────────────────────────────────────────
  mostrarMsg(t) { this.el.msg.textContent = t || ''; }
  desenharJogadores() {
    for (const i of [0, 1]) {
      const J = this.jogadores[i], el = i ? this.el.j1 : this.el.j0;
      if (!J) { el.innerHTML = '<div class="bh-nome apagado">À espera de adversário…</div>'; el.className = 'bh-jog' + (i ? ' dir' : ''); continue; }
      const g = this.estado && this.estado.grupos[i];
      const nums = g === 'lisas' ? [1, 2, 3, 4, 5, 6, 7] : g === 'riscadas' ? [9, 10, 11, 12, 13, 14, 15] : [];
      const bolinhas = nums.map((n) => {
        const fora = this.bolas.find((o) => o.n === n).dentro;
        return '<i class="bh-mini' + (n > 8 ? ' risc' : '') + (fora ? ' fora' : '') + '" style="--c:' + corDe(n) + '"></i>';
      }).join('') + (g && M.restantes(this.bolas, g) === 0 ? '<i class="bh-mini" style="--c:#111"></i>' : '');
      const vez = this.estado && this.estado.vencedor === null && this.estado.vez === i;
      el.className = 'bh-jog' + (i ? ' dir' : '') + (vez ? ' vez' : '');
      el.innerHTML = '<div class="bh-nome">' + esc(J.nome) + (i === this.meuIdx ? ' <small>(tu)</small>' : '') + ' <b class="bh-vit">' + this.vitorias[i] + '</b></div>' +
        '<div class="bh-grupo">' + (g ? bolinhas : '<small>' + (this.estado && this.estado.aberta ? 'mesa aberta' : '') + '</small>') + '</div>' +
        '<div class="bh-tempo"><span></span></div>';
    }
  }
  atualizarTempo() {
    if (!this.estado || this.estado.vencedor !== null) return;
    const i = this.estado.vez, el = (i ? this.el.j1 : this.el.j0).querySelector('.bh-tempo span');
    if (!el) return;
    const resta = this.sim || this.estadoPendente ? 1 : Math.max(0, 1 - (agora() - this.inicioVez) / (TEMPO * 1000));
    el.style.width = resta * 100 + '%';
    el.parentElement.classList.toggle('pouco', resta < 0.25);
    const outro = (i ? this.el.j0 : this.el.j1).querySelector('.bh-tempo span');
    if (outro) outro.style.width = '0%';
    // força a mexer na barra
    this.el.taco.style.transform = 'translateY(' + (this.forca * 70) + '%)';
    this.el.forca.classList.toggle('ativa', this.minhaVez());
    this.el.forca.style.setProperty('--f', this.forca);
  }
  desenharPainel(aviso, fatal) {
    const p = this.el.painel;
    if (fatal) {
      p.hidden = false;
      p.innerHTML = '<div class="bh-caixa"><h2>Fim da ligação</h2><p>' + esc(aviso) + '</p><div class="bh-acoes"><button class="btn-primary" data-ac="sair">Voltar</button></div></div>';
    } else if (!this.estado) {
      p.hidden = false;
      p.innerHTML = '<div class="bh-caixa"><h2>' + (this.ehHost ? 'Sala <span class="bh-cod">' + esc(this.cod) + '</span>' : 'A entrar…') + '</h2>' +
        (aviso ? '<p class="bh-aviso">' + esc(aviso) + '</p>' : '') +
        (this.ehHost ? '<p>À espera de adversário. Partilha o código no chat ou no Discord; o jogo começa sozinho quando alguém entrar.</p><div class="bh-acoes"><button class="btn-primary" data-ac="convite">Copiar convite</button><button class="btn-ghost" data-ac="sair">Fechar a sala</button></div>' : '<p>A ligar ao anfitrião…</p>') + '</div>';
    } else if (this.estado.vencedor !== null) {
      const ganhei = this.estado.vencedor === this.meuIdx;
      p.hidden = false;
      p.innerHTML = '<div class="bh-caixa"><h2 class="' + (ganhei ? 'ganhou' : 'perdeu') + '">' + (ganhei ? 'Ganhaste!' : 'Perdeste') + '</h2><p>' + esc(this.estado.msg) + '</p><p class="bh-placar">' + esc(this.nome(0)) + ' <b>' + this.vitorias[0] + ' – ' + this.vitorias[1] + '</b> ' + esc(this.nome(1)) + '</p>' +
        '<div class="bh-acoes"><button class="btn-primary" data-ac="revanche">' + (this.modo === 'cpu' ? 'Jogar outra vez' : 'Revanche') + '</button><button class="btn-ghost" data-ac="sair">Sair</button></div></div>';
    } else { p.hidden = true; p.innerHTML = ''; }
    p.querySelectorAll('[data-ac]').forEach((b) => b.addEventListener('click', () => this.acao(b.dataset.ac, b)));
  }
  acao(ac, b) {
    if (ac === 'sair') return this.sair();
    if (ac === 'convite') {
      const txt = 'Bilhar do FabioSilva_TV, sala ' + this.cod + ': https://fabiosilvatv.com/bilhar.html?sala=' + this.cod;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => (b.textContent = 'Copiado!'), () => (b.textContent = this.cod));
      return;
    }
    if (ac === 'revanche') {
      if (this.ehHost) this.novoJogo(1 - this.estado.vencedor);
      else { this.rede.enviar({ t: 'revanche' }, true); b.textContent = 'Pedido enviado…'; b.disabled = true; }
    }
  }
  sair() {
    if (this.fechado) return;
    this.fechado = true;
    cancelAnimationFrame(this.raf);
    this.pararRelogio();
    window.removeEventListener('resize', this.redim);
    document.removeEventListener('keydown', this.onKey);
    if (this.rede) this.rede.fechar();
    if (this.ehHost && this.api && this.cod && this.modo === 'anfitriao') this.api.fechar(this.cod).catch(() => {});
    this.raiz.innerHTML = '';
    this.raiz.classList.remove('bh-raiz');
    if (this.aoSair) this.aoSair();
  }
}
