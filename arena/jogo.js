// Arena 4v4 — o jogo: regras, armas, rondas, bots, rede e HUD.
//
// Quem cria a sala é o "anfitrião": é o PC dele que decide o que conta
// (vida, mortes, rondas, bots). Os outros jogadores mandam-lhe a sua
// posição e os seus tiros, e recebem dele o estado do jogo 20x por
// segundo. No modo Treino o anfitrião és tu e só há bots.
import * as THREE from './three.module.min.js';
import { CAIXAS, SPAWNS, OLHAR_INICIAL, raioMapa, raioJogador, visivel, mover, cabeDePe, ALTURA, OLHOS, LIMITES } from './mapa.js';
import { criarCena, criarBoneco, poseBoneco, criarArmaFP, Efeitos, normalCaixa, CORES } from './cenario.js';

export const ARMAS = {
  rifle:   { nome: 'Rifle',   tecla: '1', pente: 30, reserva: 90, cadencia: 0.1,  auto: true,  dano: { cabeca: 115, corpo: 33, pernas: 25 }, recarga: 2.3, base: 0.0025, mover: 0.045, ar: 0.12, agachado: 0.6, acum: 0.006, maxAcum: 0.05, recuo: 0.011, alcance: 250 },
  pistola: { nome: 'Pistola', tecla: '2', pente: 12, reserva: 36, cadencia: 0.17, auto: false, dano: { cabeca: 90,  corpo: 26, pernas: 20 }, recarga: 1.6, base: 0.004,  mover: 0.02,  ar: 0.08, agachado: 0.7, acum: 0.012, maxAcum: 0.04, recuo: 0.018, alcance: 200 },
  faca:    { nome: 'Faca',    tecla: '3', pente: 0,  reserva: 0,  cadencia: 0.55, auto: true,  dano: { cabeca: 75,  corpo: 55, pernas: 55 }, recarga: 0,   base: 0,      mover: 0,     ar: 0,    agachado: 1,   acum: 0,     maxAcum: 0,    recuo: 0,     alcance: 1.9 },
};
const ORDEM_ARMAS = ['rifle', 'pistola', 'faca'];
export const REGRAS = { vitoria: 7, congelado: 5, ronda: 115, fimRonda: 4, porEquipa: 4 };
const VEL = { correr: 6.2, andar: 3.2, agachado: 2.6, salto: 6.8, gravidade: 19 };
const NOMES_BOTS = ['Bot Rita', 'Bot Zé', 'Bot Inês', 'Bot Tó', 'Bot Bia', 'Bot Rui', 'Bot Sara', 'Bot Nuno'];
const NOME_EQUIPA = { L: 'Laranja', A: 'Azul' };

const r2 = (v) => Math.round(v * 100) / 100;
const agora = () => performance.now();
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dirDe = (yaw, pitch) => [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
function normalizar(d) { const L = Math.hypot(d[0], d[1], d[2]) || 1; return [d[0] / L, d[1] / L, d[2] / L]; }
function espalhar(d, ang) {
  if (ang <= 0) return d;
  // desvio aleatório dentro de um cone
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * ang;
  const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const x = normalizar([up[1] * d[2] - up[2] * d[1], up[2] * d[0] - up[0] * d[2], up[0] * d[1] - up[1] * d[0]]);
  const y = [d[1] * x[2] - d[2] * x[1], d[2] * x[0] - d[0] * x[2], d[0] * x[1] - d[1] * x[0]];
  return normalizar([d[0] + (x[0] * Math.cos(a) + y[0] * Math.sin(a)) * r, d[1] + (x[1] * Math.cos(a) + y[1] * Math.sin(a)) * r, d[2] + (x[2] * Math.cos(a) + y[2] * Math.sin(a)) * r]);
}
function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
function angDif(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

// ── navegação dos bots: grelha com caminhos livres ──────────────────
let NAV = null;
function grelhaNav() {
  if (NAV) return NAV;
  const passo = 2, nos = [], idx = new Map();
  for (let x = -LIMITES.x + 1; x <= LIMITES.x - 1; x += passo) {
    for (let z = -LIMITES.z + 1; z <= LIMITES.z - 1; z += passo) {
      if (cabeDePe([x, 0, z])) { idx.set(x + ',' + z, nos.length); nos.push({ x, z, viz: [] }); }
    }
  }
  const livre = (a, b) => {
    for (const f of [0.2, 0.4, 0.6, 0.8]) if (!cabeDePe([a.x + (b.x - a.x) * f, 0, a.z + (b.z - a.z) * f])) return false;
    return true;
  };
  for (const n of nos) {
    for (const [dx, dz] of [[passo, 0], [0, passo], [passo, passo], [passo, -passo]]) {
      const j = idx.get((n.x + dx) + ',' + (n.z + dz));
      if (j == null) continue;
      const m = nos[j];
      if (dx && dz && (!idx.has((n.x + dx) + ',' + n.z) || !idx.has(n.x + ',' + (n.z + dz)))) continue;
      if (livre(n, m)) { const c = Math.hypot(dx, dz); n.viz.push([j, c]); m.viz.push([nos.indexOf(n), c]); }
    }
  }
  NAV = { nos };
  return NAV;
}
function noMaisPerto(x, z) {
  const { nos } = grelhaNav();
  let b = -1, bd = Infinity;
  for (let i = 0; i < nos.length; i++) { const d = (nos[i].x - x) ** 2 + (nos[i].z - z) ** 2; if (d < bd) { bd = d; b = i; } }
  return b;
}
function caminho(de, para) {
  const { nos } = grelhaNav();
  const a = noMaisPerto(de[0], de[2]), b = noMaisPerto(para[0], para[2]);
  if (a < 0 || b < 0) return [];
  const g = new Map([[a, 0]]), veio = new Map(), aberto = new Set([a]);
  const h = (i) => Math.hypot(nos[i].x - nos[b].x, nos[i].z - nos[b].z);
  const f = new Map([[a, h(a)]]);
  let voltas = 0;
  while (aberto.size && voltas++ < 3000) {
    let cur = -1, cf = Infinity;
    for (const i of aberto) { const v = f.get(i); if (v < cf) { cf = v; cur = i; } }
    if (cur === b) break;
    aberto.delete(cur);
    for (const [j, c] of nos[cur].viz) {
      const ng = g.get(cur) + c;
      if (ng < (g.has(j) ? g.get(j) : Infinity)) { g.set(j, ng); veio.set(j, cur); f.set(j, ng + h(j)); aberto.add(j); }
    }
  }
  if (!veio.has(b) && a !== b) return [];
  const out = [];
  for (let i = b; i !== undefined && i !== a; i = veio.get(i)) out.unshift([nos[i].x, nos[i].z]);
  return out;
}

// ── som (gerado na hora, sem ficheiros) ──────────────────────────────
class Som {
  constructor() { this.ctx = null; this.vol = 0.5; }
  ligar() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const n = this.ctx.sampleRate * 0.4, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.ruido = b;
  }
  tiro(arma, dist = 0) {
    if (!this.ctx || !this.ruido) return;
    const t = this.ctx.currentTime, v = this.vol * Math.max(0.05, 1 - dist / 70);
    const s = this.ctx.createBufferSource(); s.buffer = this.ruido;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = arma === 'pistola' ? 2600 : arma === 'faca' ? 5000 : 1700;
    const g = this.ctx.createGain();
    const dur = arma === 'faca' ? 0.08 : arma === 'pistola' ? 0.14 : 0.2;
    g.gain.setValueAtTime(arma === 'faca' ? v * 0.25 : v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.ctx.destination); s.start(t); s.stop(t + dur);
    if (arma !== 'faca') {
      const o = this.ctx.createOscillator(), og = this.ctx.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      og.gain.setValueAtTime(v * 0.6, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(og).connect(this.ctx.destination); o.start(t); o.stop(t + 0.13);
    }
  }
  bip(freq, dur = 0.06, vol = 0.25, tipo = 'square') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = tipo; o.frequency.value = freq;
    g.gain.setValueAtTime(vol * this.vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.01);
  }
}

// Relógio que não pára quando a janela fica em segundo plano (um Worker
// não é travado como o setInterval da página). Sem isto, se o anfitrião
// mudasse de janela o jogo congelava para todos.
function relogio(hz, fn) {
  try {
    const url = URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),' + Math.round(1000 / hz) + ')'], { type: 'text/javascript' }));
    const w = new Worker(url);
    w.onmessage = fn;
    return () => { w.terminate(); URL.revokeObjectURL(url); };
  } catch (e) {
    const i = setInterval(fn, 1000 / hz);
    return () => clearInterval(i);
  }
}

// ════════════════════════════════════════════════════════════════════
export class Jogo {
  /**
   * @param {object} o
   *  raiz: elemento onde o jogo é desenhado
   *  modo: 'treino' | 'anfitriao' | 'cliente'
   *  eu: { id, nome }
   *  rede: Anfitriao | Cliente | null
   *  api, cod: para o anfitrião manter a sala na lista
   *  hostId: login do anfitrião (modo cliente)
   *  aoSair: chamado quando o jogador sai
   */
  constructor(o) {
    Object.assign(this, o);
    this.ehHost = o.modo !== 'cliente';
    this.jogadores = new Map();
    this.bonecos = new Map();
    this.fase = 'lobby';
    this.ronda = 0;
    this.placar = { L: 0, A: 0 };
    this.faseAte = 0;
    this.teclas = {};
    this.rato = { premido: false, largou: true };
    this.sens = parseFloat(localStorage.getItem('arena_sens') || '1') || 1;
    this.som = new Som();
    this.som.vol = parseFloat(localStorage.getItem('arena_vol') || '0.5');
    this.local = {
      p: [0, 0, 0], v: [0, 0, 0], yaw: 0, pitch: 0, agachado: false, alturaOlhos: OLHOS.pe,
      noChao: true, arma: 'rifle', armaAnt: 'pistola', mun: {}, recarregarAte: 0, proxTiro: 0, acum: 0,
      punch: [0, 0], aMexer: false, tAnim: 0, trocaAte: 0,
    };
    this.espectar = null;
    this.feed = [];
    this.ultimoEstadoApi = 0;
    this.montarDom();
    this.montar3D();
    this.ligarInput();
    if (this.ehHost) this.prepararHost(); else this.prepararCliente();
    this.ultimo = agora();
    this.ciclo = this.ciclo.bind(this);
    this.raf = requestAnimationFrame(this.ciclo);
    this.pararRelogio = relogio(30, () => this.tickRede());
  }

  // ── DOM: HUD, menus, lobby ─────────────────────────────────────────
  montarDom() {
    const r = this.raiz;
    r.classList.add('ar-raiz');
    r.innerHTML = `
      <canvas class="ar-canvas"></canvas>
      <div class="ar-hud" hidden>
        <div class="ar-topo"><span class="ar-eq L"><b id="arAL">0</b> vivos</span><div class="ar-placar"><b class="L" id="arPL">0</b><span id="arTempo">1:55</span><b class="A" id="arPA">0</b></div><span class="ar-eq A"><b id="arAA">0</b> vivos</span></div>
        <div class="ar-mira" id="arMira"><i></i><i></i><i></i><i></i></div>
        <div class="ar-hit" id="arHit"></div>
        <div class="ar-vida"><i class="fas fa-plus" aria-hidden="true"></i><b id="arHp">100</b><span class="ar-barra"><span id="arHpB"></span></span></div>
        <div class="ar-mun"><span id="arArma">Rifle</span><b id="arMun">30</b><small id="arRes">/ 90</small></div>
        <div class="ar-feed" id="arFeed"></div>
        <div class="ar-centro" id="arCentro"></div>
        <div class="ar-espect" id="arEspect" hidden></div>
        <div class="ar-dano" id="arDano"></div>
      </div>
      <div class="ar-tabela" id="arTabela" hidden></div>
      <div class="ar-painel" id="arPainel"></div>
      <div class="ar-aviso" id="arAviso" hidden></div>`;
    const $ = (id) => r.querySelector('#' + id);
    this.el = { canvas: r.querySelector('.ar-canvas'), hud: r.querySelector('.ar-hud'), mira: $('arMira'), hit: $('arHit'), hp: $('arHp'), hpB: $('arHpB'), arma: $('arArma'), mun: $('arMun'), res: $('arRes'), feed: $('arFeed'), centro: $('arCentro'), espect: $('arEspect'), dano: $('arDano'), tabela: $('arTabela'), painel: $('arPainel'), aviso: $('arAviso'), pl: $('arPL'), pa: $('arPA'), tempo: $('arTempo'), al: $('arAL'), aa: $('arAA') };
  }

  montar3D() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.el.canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.autoClear = false;
    this.renderer = renderer;
    this.cena = criarCena(renderer);
    this.camera = new THREE.PerspectiveCamera(78, 1, 0.05, 500);
    this.camera.rotation.order = 'YXZ';
    this.cenaFP = new THREE.Scene();
    this.cenaFP.add(new THREE.HemisphereLight(0xffd0a0, 0x304070, 2.4));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(1, 2, 1); this.cenaFP.add(dl);
    this.camFP = new THREE.PerspectiveCamera(65, 1, 0.01, 10);
    this.armaFP = criarArmaFP();
    this.armaFP.scale.setScalar(0.62);
    this.cenaFP.add(this.armaFP);
    this.efeitos = new Efeitos(this.cena);
    this.mapaMeshes = this.cena.children.filter((m) => m.isMesh);
    this.redimensionar = () => {
      const w = this.raiz.clientWidth || window.innerWidth, h = this.raiz.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      this.camera.aspect = this.camFP.aspect = w / h;
      this.camera.updateProjectionMatrix(); this.camFP.updateProjectionMatrix();
    };
    window.addEventListener('resize', this.redimensionar);
    this.redimensionar();
    this.mostrarArma('rifle');
  }

  ligarInput() {
    const c = this.el.canvas;
    this.onKey = (e) => {
      const down = e.type === 'keydown';
      if (e.code === 'Tab') { e.preventDefault(); this.el.tabela.hidden = !down || this.fase === 'lobby'; if (down) this.desenharTabela(); return; }
      if (!this.bloqueado()) return;
      this.teclas[e.code] = down;
      if (!down) return;
      if (e.code === 'KeyR') this.recarregar();
      if (e.code === 'Digit1') this.trocarArma('rifle');
      if (e.code === 'Digit2') this.trocarArma('pistola');
      if (e.code === 'Digit3') this.trocarArma('faca');
      if (e.code === 'KeyQ') this.trocarArma(this.local.armaAnt);
      if (['Space', 'ControlLeft'].includes(e.code)) e.preventDefault();
    };
    document.addEventListener('keydown', this.onKey);
    document.addEventListener('keyup', this.onKey);
    this.onMove = (e) => {
      if (!this.bloqueado()) return;
      const k = 0.0022 * this.sens;
      this.local.yaw -= e.movementX * k;
      this.local.pitch = Math.max(-1.5, Math.min(1.5, this.local.pitch - e.movementY * k));
    };
    document.addEventListener('mousemove', this.onMove);
    this.onDown = (e) => {
      if (!this.bloqueado()) return;
      if (e.button === 0) { this.rato.premido = true; if (!this.eu_().vivo && this.fase !== 'lobby') this.proximoEspectar(); }
    };
    this.onUp = (e) => { if (e.button === 0) { this.rato.premido = false; this.rato.largou = true; } };
    document.addEventListener('mousedown', this.onDown);
    document.addEventListener('mouseup', this.onUp);
    this.onWheel = (e) => {
      if (!this.bloqueado()) return;
      const i = ORDEM_ARMAS.indexOf(this.local.arma);
      this.trocarArma(ORDEM_ARMAS[(i + (e.deltaY > 0 ? 1 : -1) + ORDEM_ARMAS.length) % ORDEM_ARMAS.length]);
    };
    document.addEventListener('wheel', this.onWheel, { passive: true });
    this.onLock = () => {
      const b = this.bloqueado();
      if (!b) { this.teclas = {}; this.rato.premido = false; }
      this.desenharPainel();
    };
    document.addEventListener('pointerlockchange', this.onLock);
    c.addEventListener('click', () => this.entrar());
  }
  bloqueado() { return document.pointerLockElement === this.el.canvas; }
  entrar() {
    this.som.ligar();
    if (!this.bloqueado()) {
      const p = this.el.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => this.el.canvas.requestPointerLock());
    }
  }

  // ── estado partilhado ──────────────────────────────────────────────
  eu_() { return this.jogadores.get(this.eu.id) || { vivo: false, hp: 0 }; }
  novoJogador(id, nome, equipa, bot = false) {
    const J = { id, nome, equipa, bot, vivo: this.fase === 'lobby', hp: 100, k: 0, d: 0, p: [0, 0, 0], yaw: 0, pitch: 0, c: false, a: 'rifle', ver: [0, 0, 0], verYaw: 0 };
    if (bot) J.ia = { caminho: [], repath: 0, visto: 0, alvo: null, proxTiro: 0, mun: 30, recarga: 0, estrafe: 1, estrafeT: 0, preso: 0, ultimaP: [0, 0, 0] };
    this.jogadores.set(id, J);
    return J;
  }
  lista() {
    return [...this.jogadores.values()].map((J) => ({ id: J.id, nome: J.nome, equipa: J.equipa, bot: J.bot, vivo: J.vivo, hp: J.hp, k: J.k, d: J.d }));
  }
  aplicarLista(lista) {
    const ids = new Set(lista.map((x) => x.id));
    for (const id of [...this.jogadores.keys()]) if (!ids.has(id)) { this.jogadores.delete(id); this.tirarBoneco(id); }
    for (const x of lista) {
      let J = this.jogadores.get(x.id);
      if (!J) J = this.novoJogador(x.id, x.nome, x.equipa, x.bot);
      const mudouEq = J.equipa !== x.equipa;
      Object.assign(J, { nome: x.nome, equipa: x.equipa, bot: x.bot, vivo: x.vivo, hp: x.hp, k: x.k, d: x.d });
      if (mudouEq) this.tirarBoneco(x.id);
    }
    this.desenharPainel();
  }
  tirarBoneco(id) { const b = this.bonecos.get(id); if (b) { this.cena.remove(b); this.bonecos.delete(id); } }

  contar(eq, soVivos) { let n = 0; for (const J of this.jogadores.values()) if (J.equipa === eq && (!soVivos || J.vivo)) n++; return n; }

  // ── armas ──────────────────────────────────────────────────────────
  encherArmas() {
    for (const k of ['rifle', 'pistola']) this.local.mun[k] = [ARMAS[k].pente, ARMAS[k].reserva];
    this.local.recarregarAte = 0;
  }
  mostrarArma(a) {
    const u = this.armaFP.userData;
    for (const k of ORDEM_ARMAS) u[k].visible = k === a;
    u.clarao.position.copy(u[a].userData.boca);
  }
  trocarArma(a) {
    const L = this.local;
    if (!a || a === L.arma) return;
    L.armaAnt = L.arma; L.arma = a; L.recarregarAte = 0; L.trocaAte = agora() + 350; L.acum = 0;
    this.mostrarArma(a);
    this.som.bip(520, 0.04, 0.12, 'triangle');
  }
  recarregar() {
    const L = this.local, A = ARMAS[L.arma], m = L.mun[L.arma];
    if (!m || L.recarregarAte || m[0] >= A.pente || m[1] <= 0) return;
    L.recarregarAte = agora() + A.recarga * 1000;
    this.som.bip(300, 0.05, 0.15, 'triangle');
  }

  // Disparo do jogador local
  disparar() {
    const L = this.local, A = ARMAS[L.arma], J = this.eu_();
    const t = agora();
    if (!J.vivo || this.fase === 'congelado' || this.fase === 'fim' || this.fase === 'terminado') return;
    if (t < L.proxTiro || t < L.trocaAte || L.recarregarAte) return;
    if (!A.auto && !this.rato.largou) return;
    const m = L.mun[L.arma];
    if (m) {
      if (m[0] <= 0) { if (m[1] > 0) this.recarregar(); else if (this.rato.largou) this.som.bip(900, 0.03, 0.1); this.rato.largou = false; return; }
      m[0]--;
    }
    this.rato.largou = false;
    L.proxTiro = t + A.cadencia * 1000;
    // imprecisão: base + movimento + no ar + tiros seguidos
    const vel = Math.hypot(L.v[0], L.v[2]);
    let cone = A.base + A.mover * Math.min(1, vel / VEL.correr) + (L.noChao ? 0 : A.ar) + L.acum;
    if (L.agachado) cone *= A.agachado;
    const yaw = L.yaw + L.punch[1], pitch = L.pitch + L.punch[0] * 2;
    const o = [L.p[0], L.p[1] + L.alturaOlhos, L.p[2]];
    const d = espalhar(dirDe(yaw, pitch), cone);
    L.acum = Math.min(A.maxAcum, L.acum + A.acum);
    L.punch[0] += A.recuo * (0.8 + Math.random() * 0.4);
    L.punch[1] += A.recuo * gauss() * 0.4;
    this.anim = { coice: 1 };
    const res = this.resolverTiro(this.eu.id, o, d, L.arma);
    this.efeitoTiro(o, d, res, true, L.arma);
    const msg = { t: 'tiro', o: o.map(r2), d: d.map((v) => Math.round(v * 1e4) / 1e4), a: L.arma, alvo: res.alvo ? res.alvo.id : null, zona: res.alvo ? res.zona : null };
    if (this.ehHost) this.hostTiro(this.eu.id, msg, res);
    else this.rede.enviar(msg, true);
  }

  // Raio contra o mapa e todos os jogadores vivos (menos o atirador)
  resolverTiro(deId, o, d, arma) {
    const A = ARMAS[arma];
    const tMapa = raioMapa(o, d, A.alcance);
    let melhor = null;
    for (const J of this.jogadores.values()) {
      if (J.id === deId || !J.vivo) continue;
      const pos = J.id === this.eu.id ? this.local.p : (this.ehHost ? J.p : J.ver);
      const h = raioJogador(o, d, pos, J.c, 0, Math.min(tMapa, A.alcance));
      if (h && (!melhor || h.t < melhor.t)) melhor = { t: h.t, zona: h.zona, alvo: J };
    }
    if (melhor) return melhor;
    return { t: tMapa, zona: null, alvo: null };
  }

  efeitoTiro(o, d, res, meu, arma) {
    const p = new THREE.Vector3(o[0] + d[0] * res.t, o[1] + d[1] * res.t, o[2] + d[2] * res.t);
    if (arma !== 'faca') {
      let ini;
      if (meu) ini = this.fpParaMundo();
      else ini = new THREE.Vector3(o[0], o[1] - 0.15, o[2]);
      if (res.t < 250) this.efeitos.rasto(ini, p);
    }
    if (res.alvo) this.efeitos.sangue(p);
    else if (res.t < ARMAS[arma].alcance - 0.01 && arma !== 'faca') {
      const c = CAIXAS.find((cx) => p.x >= cx.min[0] - 0.02 && p.x <= cx.max[0] + 0.02 && p.y >= cx.min[1] - 0.02 && p.y <= cx.max[1] + 0.02 && p.z >= cx.min[2] - 0.02 && p.z <= cx.max[2] + 0.02);
      this.efeitos.marca(p, c ? normalCaixa(p, c) : new THREE.Vector3(0, 1, 0));
    }
    const dist = meu ? 0 : Math.hypot(o[0] - this.local.p[0], o[2] - this.local.p[2]);
    this.som.tiro(arma, dist);
    if (meu) {
      const cl = this.armaFP.userData.clarao;
      if (arma !== 'faca') { cl.visible = true; cl.rotation.z = Math.random() * 3; this.claraoAte = agora() + 45; }
    }
  }
  // posição da boca da arma, em coordenadas do mundo
  fpParaMundo() {
    const v = this.armaFP.userData.clarao.position.clone();
    this.armaFP.localToWorld(v);
    v.project(this.camFP); v.unproject(this.camera);
    const o = this.camera.position;
    return o.clone().add(v.sub(o).normalize().multiplyScalar(0.9));
  }

  // ── anfitrião ──────────────────────────────────────────────────────
  prepararHost() {
    grelhaNav();
    const me = this.novoJogador(this.eu.id, this.eu.nome, 'L');
    me.vivo = true;
    this.irParaSpawn(me, 0);
    if (this.modo === 'treino') {
      this.addBot('A'); this.addBot('A'); this.addBot('L');
    }
    if (this.rede) {
      this.rede.aoEntrar = (id, nome) => this.hostEntrar(id, nome);
      this.rede.aoSair = (id) => this.hostSair(id);
      this.rede.aoReceber = (id, m) => this.hostMsg(id, m);
    }
    this.encherArmas();
    this.posicionarLocal(me);
    this.desenharPainel();
  }
  irParaSpawn(J, i) {
    const s = SPAWNS[J.equipa][i % SPAWNS[J.equipa].length];
    J.p = [s[0], 0, s[1]]; J.yaw = OLHAR_INICIAL[J.equipa]; J.pitch = 0; J.c = false;
    J.ver = J.p.slice(); J.verYaw = J.yaw;
  }
  posicionarLocal(J) {
    const L = this.local;
    L.p = J.p.slice(); L.v = [0, 0, 0]; L.yaw = J.yaw; L.pitch = 0; L.agachado = false; L.punch = [0, 0]; L.acum = 0;
  }
  equipaComEspaco(pref) {
    const nL = this.contar('L'), nA = this.contar('A');
    if (pref && this.contar(pref) < REGRAS.porEquipa) return pref;
    if (nL >= REGRAS.porEquipa && nA >= REGRAS.porEquipa) return null;
    return nL <= nA ? (nL < REGRAS.porEquipa ? 'L' : 'A') : (nA < REGRAS.porEquipa ? 'A' : 'L');
  }
  addBot(eq) {
    if (this.contar(eq) >= REGRAS.porEquipa) return;
    const usados = new Set([...this.jogadores.values()].map((J) => J.nome));
    const nome = NOMES_BOTS.find((n) => !usados.has(n)) || 'Bot';
    let i = 1; while (this.jogadores.has('bot' + i)) i++;
    const J = this.novoJogador('bot' + i, nome, eq, true);
    J.vivo = this.fase === 'lobby';
    this.irParaSpawn(J, this.contar(eq) - 1);
    this.hostAvisarLista();
  }
  tirarBot(eq) {
    const b = [...this.jogadores.values()].reverse().find((J) => J.bot && (!eq || J.equipa === eq));
    if (b) { this.jogadores.delete(b.id); this.tirarBoneco(b.id); this.hostAvisarLista(); }
  }
  hostEntrar(id, nome) {
    if (this.jogadores.has(id)) { this.jogadores.delete(id); this.tirarBoneco(id); }
    let eq = this.equipaComEspaco();
    if (!eq) {
      // dá lugar tirando um bot
      const bot = [...this.jogadores.values()].find((J) => J.bot);
      if (bot) { eq = bot.equipa; this.jogadores.delete(bot.id); this.tirarBoneco(bot.id); }
    }
    if (!eq) { this.rede.enviar(id, { t: 'cheia' }); setTimeout(() => this.rede.expulsar(id), 500); return; }
    const J = this.novoJogador(id, nome, eq);
    J.vivo = this.fase === 'lobby';
    this.irParaSpawn(J, this.contar(eq) - 1);
    this.rede.enviar(id, { t: 'bem', eu: id, host: this.eu.id, fase: this.fase, ronda: this.ronda, placar: this.placar, resta: Math.max(0, this.faseAte - agora()), lista: this.lista(), p: J.p, yaw: J.yaw });
    this.hostAvisarLista();
    this.evento({ t: 'aviso', txt: nome + ' entrou na sala' }, true);
  }
  hostSair(id) {
    const J = this.jogadores.get(id);
    if (!J) return;
    this.jogadores.delete(id); this.tirarBoneco(id);
    this.hostAvisarLista();
    this.evento({ t: 'aviso', txt: J.nome + ' saiu' }, true);
  }
  hostAvisarLista() {
    const m = { t: 'lista', lista: this.lista() };
    if (this.rede) this.rede.todos(m, true);
    this.desenharPainel();
  }
  hostMsg(id, m) {
    const J = this.jogadores.get(id);
    if (!J || !m || typeof m !== 'object') return;
    if (m.t === 's' && Array.isArray(m.p)) {
      const p = m.p.map(Number);
      if (p.every(Number.isFinite)) {
        J.p = [Math.max(-LIMITES.x, Math.min(LIMITES.x, p[0])), Math.max(0, Math.min(10, p[1])), Math.max(-LIMITES.z, Math.min(LIMITES.z, p[2]))];
        J.yaw = +m.y || 0; J.pitch = +m.x || 0; J.c = !!m.c; J.a = ARMAS[m.a] ? m.a : 'rifle';
      }
    } else if (m.t === 'tiro') {
      this.hostTiro(id, m, null);
    } else if (m.t === 'equipa' && this.fase === 'lobby' && (m.e === 'L' || m.e === 'A') && m.e !== J.equipa) {
      if (this.contar(m.e) < REGRAS.porEquipa) { J.equipa = m.e; this.tirarBoneco(id); this.irParaSpawn(J, this.contar(m.e) - 1); this.rede.enviar(id, { t: 'spawn', p: J.p, yaw: J.yaw }); this.hostAvisarLista(); }
    }
  }
  // Valida e aplica um tiro. res vem calculado quando o tiro é do anfitrião ou de um bot.
  hostTiro(id, m, res) {
    const J = this.jogadores.get(id), A = ARMAS[m.a];
    if (!J || !A || !J.vivo) return;
    const t = agora();
    if (J.ultimoTiro && t - J.ultimoTiro < A.cadencia * 1000 * 0.6) return; // ritmo impossível
    J.ultimoTiro = t;
    const o = (m.o || []).map(Number), d = normalizar((m.d || []).map(Number));
    if (o.length !== 3 || !o.every(Number.isFinite) || !d.every(Number.isFinite)) return;
    // reenvia o tiro aos outros para verem o clarão e ouvirem
    if (this.rede) this.rede.todos({ t: 'fx', de: id, o: m.o, d: m.d, a: m.a, tt: res ? r2(res.t) : null }, false, id);
    if (id !== this.eu.id && !res) {
      // tiro de um jogador remoto: mostra o efeito aqui também
      const r = this.resolverTiro(id, o, d, m.a);
      this.efeitoTiro(o, d, r, false, m.a);
    }
    if (this.fase !== 'jogo' || !m.alvo) return;
    const V = this.jogadores.get(m.alvo);
    if (!V || !V.vivo || V.equipa === J.equipa) return;
    if (!res) {
      // o atirador tem de estar perto de onde o anfitrião o vê
      const olho = [J.p[0], J.p[1] + (J.c ? OLHOS.agachado : OLHOS.pe), J.p[2]];
      if (Math.hypot(o[0] - olho[0], o[1] - olho[1], o[2] - olho[2]) > 2.5) return;
      const h = raioJogador(o, d, V.p, V.c, 0.65, A.alcance);
      if (!h) return;
      if (raioMapa(o, d, h.t) < h.t - 0.3) return; // parede pelo meio
      res = { alvo: V, zona: ['cabeca', 'corpo', 'pernas'].includes(m.zona) ? m.zona : h.zona };
    }
    this.hostDano(V, J, A.dano[res.zona] || A.dano.corpo, res.zona, m.a);
  }
  hostDano(V, J, dano, zona, arma) {
    V.hp = Math.max(0, V.hp - dano);
    if (V.hp <= 0) {
      V.vivo = false; V.d++; J.k++;
      this.evento({ t: 'morte', alvo: V.id, de: J.id, a: arma, cab: zona === 'cabeca' }, true);
      this.hostVerFimRonda();
    } else {
      this.evento({ t: 'dano', alvo: V.id, de: J.id, hp: V.hp, zona }, true);
    }
  }
  hostVerFimRonda() {
    if (this.fase !== 'jogo') return;
    const vL = this.contar('L', true), vA = this.contar('A', true);
    const nL = this.contar('L'), nA = this.contar('A');
    if (nL && nA) {
      if (!vL) return this.hostFimRonda('A');
      if (!vA) return this.hostFimRonda('L');
    }
  }
  hostComecar() {
    if (!this.contar('L') || !this.contar('A')) { this.mensagem('Precisas de pelo menos um jogador ou bot em cada equipa.'); return; }
    this.placar = { L: 0, A: 0 }; this.ronda = 0;
    for (const J of this.jogadores.values()) { J.k = 0; J.d = 0; }
    this.hostNovaRonda();
  }
  hostNovaRonda() {
    this.ronda++;
    const spawns = {}, idx = { L: 0, A: 0 };
    for (const J of this.jogadores.values()) {
      J.vivo = true; J.hp = 100;
      this.irParaSpawn(J, idx[J.equipa]++);
      spawns[J.id] = [J.p[0], J.p[2], J.yaw];
      if (J.ia) Object.assign(J.ia, { caminho: [], repath: 0, visto: 0, alvo: null, mun: 30, recarga: 0 });
    }
    this.faseAte = agora() + REGRAS.congelado * 1000;
    this.evento({ t: 'ronda', n: this.ronda, fase: 'congelado', resta: REGRAS.congelado * 1000, placar: this.placar, spawns, lista: this.lista() }, true);
  }
  hostFimRonda(venc) {
    if (venc) this.placar[venc]++;
    this.faseAte = agora() + REGRAS.fimRonda * 1000;
    const acabou = this.placar.L >= REGRAS.vitoria || this.placar.A >= REGRAS.vitoria;
    this.evento({ t: 'fimRonda', venc, placar: this.placar, acabou }, true);
  }
  hostTick() {
    const t = agora();
    if (this.fase === 'congelado' && t >= this.faseAte) {
      this.faseAte = t + REGRAS.ronda * 1000;
      this.evento({ t: 'fase', fase: 'jogo', resta: REGRAS.ronda * 1000 }, true);
    } else if (this.fase === 'jogo') {
      if (t >= this.faseAte) {
        const vL = this.contar('L', true), vA = this.contar('A', true);
        this.hostFimRonda(vL > vA ? 'L' : vA > vL ? 'A' : null);
      } else this.hostVerFimRonda();
    } else if (this.fase === 'fim' && t >= this.faseAte) {
      if (this.placar.L >= REGRAS.vitoria || this.placar.A >= REGRAS.vitoria) {
        this.evento({ t: 'fimJogo', venc: this.placar.L > this.placar.A ? 'L' : 'A', placar: this.placar, lista: this.lista() }, true);
      } else this.hostNovaRonda();
    }
    // a sala continua na lista do site
    if (this.api && this.cod && this.modo === 'anfitriao' && t - this.ultimoEstadoApi > 20000) {
      this.ultimoEstadoApi = t;
      this.api.estado({ cod: this.cod, n: this.jogadores.size - [...this.jogadores.values()].filter((J) => J.bot).length, estado: this.fase === 'lobby' ? 'lobby' : this.fase === 'terminado' ? 'fim' : 'jogo', placar: this.fase === 'lobby' ? '' : this.placar.L + '-' + this.placar.A }).catch(() => {});
    }
  }
  hostVoltarLobby() {
    this.placar = { L: 0, A: 0 }; this.ronda = 0;
    const idx = { L: 0, A: 0 };
    for (const J of this.jogadores.values()) { J.vivo = true; J.hp = 100; this.irParaSpawn(J, idx[J.equipa]++); }
    this.evento({ t: 'lobby', lista: this.lista(), spawns: Object.fromEntries([...this.jogadores.values()].map((J) => [J.id, [J.p[0], J.p[2], J.yaw]])) }, true);
  }

  // ── bots (correm no anfitrião) ─────────────────────────────────────
  tickBots(dt) {
    if (this.fase === 'terminado') return;
    const t = agora();
    for (const B of this.jogadores.values()) {
      if (!B.bot || !B.vivo) continue;
      const ia = B.ia;
      const olho = [B.p[0], B.p[1] + OLHOS.pe, B.p[2]];
      // inimigo à vista?
      let alvo = null, dAlvo = Infinity;
      if (this.fase === 'jogo') {
        for (const J of this.jogadores.values()) {
          if (!J.vivo || J.equipa === B.equipa) continue;
          const pos = J.id === this.eu.id ? this.local.p : J.p;
          const peito = [pos[0], pos[1] + (J.c ? 0.9 : 1.3), pos[2]];
          const dist = Math.hypot(peito[0] - olho[0], peito[2] - olho[2]);
          if (dist > 55 || dist >= dAlvo) continue;
          const ang = Math.abs(angDif(Math.atan2(-(peito[0] - olho[0]), -(peito[2] - olho[2])), B.yaw));
          if (ang > 1.2 && !(ia.alvo === J.id)) continue; // fora do campo de visão
          if (!visivel(olho, peito)) continue;
          alvo = J; dAlvo = dist;
        }
      }
      let quer = [0, 0];
      if (alvo) {
        if (ia.alvo !== alvo.id) { ia.alvo = alvo.id; ia.visto = t; }
        const pos = alvo.id === this.eu.id ? this.local.p : alvo.p;
        const mira = [pos[0], pos[1] + (Math.random() < 0.2 ? (alvo.c ? 1.15 : 1.62) : (alvo.c ? 0.85 : 1.2)), pos[2]];
        const dx = mira[0] - olho[0], dy = mira[1] - olho[1], dz = mira[2] - olho[2];
        const yawQ = Math.atan2(-dx, -dz), pitchQ = Math.atan2(dy, Math.hypot(dx, dz));
        const dy_ = angDif(yawQ, B.yaw), maxGiro = 5 * dt;
        B.yaw += Math.max(-maxGiro, Math.min(maxGiro, dy_));
        B.pitch += Math.max(-maxGiro, Math.min(maxGiro, pitchQ - B.pitch));
        // anda de lado enquanto dispara
        ia.estrafeT -= dt;
        if (ia.estrafeT <= 0) { ia.estrafe = Math.random() < 0.5 ? -1 : Math.random() < 0.5 ? 0 : 1; ia.estrafeT = 0.4 + Math.random() * 0.8; }
        quer = [Math.cos(B.yaw) * ia.estrafe, -Math.sin(B.yaw) * ia.estrafe];
        if (ia.recarga && t >= ia.recarga) { ia.mun = 30; ia.recarga = 0; }
        const reacao = 350 + Math.min(500, dAlvo * 8);
        if (!ia.recarga && Math.abs(dy_) < 0.12 && t - ia.visto > reacao && t >= ia.proxTiro) {
          ia.proxTiro = t + ARMAS.rifle.cadencia * 1000 * (1.4 + Math.random());
          ia.mun--; if (ia.mun <= 0) ia.recarga = t + 2300;
          const erro = 0.012 + dAlvo * 0.0009 + (ia.estrafe ? 0.012 : 0);
          const d = espalhar(dirDe(B.yaw, B.pitch), erro);
          const res = this.resolverTiro(B.id, olho, d, 'rifle');
          this.efeitoTiro(olho, d, res, false, 'rifle');
          this.hostTiro(B.id, { t: 'tiro', o: olho.map(r2), d, a: 'rifle', alvo: res.alvo ? res.alvo.id : null, zona: res.zona }, res);
        }
      } else {
        ia.alvo = null;
        if (this.fase === 'jogo' || this.fase === 'lobby') {
          // vai ter com o inimigo mais perto (ou passeia no aquecimento)
          if (t >= ia.repath || !ia.caminho.length) {
            ia.repath = t + 2500 + Math.random() * 1500;
            let destino = null;
            if (this.fase === 'jogo') {
              let melhor = Infinity;
              for (const J of this.jogadores.values()) {
                if (!J.vivo || J.equipa === B.equipa) continue;
                const pos = J.id === this.eu.id ? this.local.p : J.p;
                const dd = Math.hypot(pos[0] - B.p[0], pos[2] - B.p[2]);
                if (dd < melhor) { melhor = dd; destino = pos; }
              }
            }
            if (!destino) { const n = grelhaNav().nos; const r = n[Math.floor(Math.random() * n.length)]; destino = [r.x, 0, r.z]; }
            // um desvio para não irem todos pelo mesmo sítio
            const lado = (parseInt(B.id.replace(/\D/g, ''), 10) % 3) - 1;
            ia.caminho = caminho(B.p, [destino[0], 0, Math.max(-LIMITES.z + 2, Math.min(LIMITES.z - 2, destino[2] + lado * 8 * Math.random()))]);
            if (!ia.caminho.length) ia.caminho = caminho(B.p, destino);
          }
          const prox = ia.caminho[0];
          if (prox) {
            const dx = prox[0] - B.p[0], dz = prox[1] - B.p[2], dd = Math.hypot(dx, dz);
            if (dd < 0.9) ia.caminho.shift();
            else {
              quer = [dx / dd, dz / dd];
              const yawQ = Math.atan2(-dx, -dz);
              B.yaw += Math.max(-4 * dt, Math.min(4 * dt, angDif(yawQ, B.yaw)));
              B.pitch *= 0.9;
            }
          }
        }
      }
      if (this.fase === 'congelado') quer = [0, 0];
      const vel = alvo ? VEL.andar : VEL.correr * 0.92;
      if (!B.v) B.v = [0, 0, 0];
      B.v[0] = quer[0] * vel; B.v[2] = quer[1] * vel; B.v[1] -= VEL.gravidade * dt;
      mover(B.p, B.v, dt, ALTURA.pe);
      // preso? tenta outro caminho
      if (t - (ia.vistoPreso || 0) > 1000) {
        ia.vistoPreso = t;
        if (!alvo && Math.hypot(B.p[0] - ia.ultimaP[0], B.p[2] - ia.ultimaP[2]) < 0.4) { ia.caminho = []; ia.repath = 0; }
        ia.ultimaP = B.p.slice();
      }
      B.a = 'rifle'; B.c = false;
    }
  }

  // ── jogador (cliente) ──────────────────────────────────────────────
  prepararCliente() {
    const fila = this.rede.fila || [];
    this.rede.aoReceber = (m) => this.evento(m, false);
    for (const m of fila) this.evento(m, false);
    this.rede.fila = [];
    this.rede.aoFechar = () => this.avisoFinal('O anfitrião fechou a sala ou a ligação caiu.');
    this.encherArmas();
    this.desenharPainel();
  }

  // Tudo o que acontece no jogo passa por aqui (no anfitrião é chamado
  // diretamente e enviado aos outros; nos jogadores chega pela rede).
  evento(m, enviar) {
    if (enviar && this.rede && this.ehHost) this.rede.todos(m, true);
    switch (m.t) {
      case 'bem':
        this.eu.id = m.eu;
        this.fase = m.fase; this.ronda = m.ronda; this.placar = m.placar; this.faseAte = agora() + (m.resta || 0);
        this.aplicarLista(m.lista);
        { const J = this.jogadores.get(this.eu.id); if (J) { J.p = m.p; J.yaw = m.yaw; this.posicionarLocal(J); } }
        break;
      case 'lista': this.aplicarLista(m.lista); break;
      case 'cheia': this.avisoFinal('A sala está cheia (4 contra 4).'); break;
      case 'spawn': { const L = this.local; L.p = m.p.slice(); L.yaw = m.yaw; L.v = [0, 0, 0]; break; }
      case 'snap':
        if (this.ehHost) break;
        for (const s of m.j) {
          const [id, x, y, z, yaw, pitch, c, a, vivo, hp] = s;
          const J = this.jogadores.get(id);
          if (!J) continue;
          J.vivo = !!vivo; J.hp = hp;
          if (id === this.eu.id) continue;
          J.p = [x, y, z]; J.yaw = yaw; J.pitch = pitch; J.c = !!c; J.a = a;
        }
        break;
      case 'fx':
        if (m.de === this.eu.id) break;
        {
          const o = m.o, d = m.d;
          const res = m.tt != null ? { t: m.tt, alvo: null } : this.resolverTiro(m.de, o, d, m.a);
          this.efeitoTiro(o, d, res, false, m.a);
        }
        break;
      case 'dano': {
        const V = this.jogadores.get(m.alvo);
        if (V) V.hp = m.hp;
        if (m.alvo === this.eu.id) this.levarDano(m.de);
        if (m.de === this.eu.id) this.marcarAcerto(m.zona === 'cabeca', false);
        break;
      }
      case 'morte': {
        const V = this.jogadores.get(m.alvo), J = this.jogadores.get(m.de);
        if (V) { V.vivo = false; V.hp = 0; if (!this.ehHost) V.d++; }
        if (J && !this.ehHost) J.k++;
        this.addFeed(J, V, m.a, m.cab);
        if (m.de === this.eu.id) this.marcarAcerto(m.cab, true);
        if (m.alvo === this.eu.id) { this.levarDano(m.de); this.centro('Morreste' + (J ? ' — eliminado por ' + esc(J.nome) : ''), 2500); this.espectar = null; }
        break;
      }
      case 'ronda':
        this.fase = 'congelado'; this.ronda = m.n; this.placar = m.placar; this.faseAte = agora() + m.resta;
        if (m.lista && !this.ehHost) this.aplicarLista(m.lista);
        for (const [id, s] of Object.entries(m.spawns)) {
          const J = this.jogadores.get(id); if (!J) continue;
          J.vivo = true; J.hp = 100; J.p = [s[0], 0, s[1]]; J.yaw = s[2]; J.ver = J.p.slice(); J.verYaw = J.yaw;
          if (id === this.eu.id) this.posicionarLocal(J);
        }
        this.encherArmas(); this.trocarArma('rifle'); this.efeitos.limpar();
        this.centro('Ronda ' + m.n, 2200);
        this.som.bip(660, 0.12, 0.2, 'sine');
        this.desenharPainel();
        break;
      case 'fase':
        this.fase = m.fase; this.faseAte = agora() + m.resta;
        if (m.fase === 'jogo') { this.centro('Vai!', 900); this.som.bip(880, 0.15, 0.25, 'sine'); }
        break;
      case 'fimRonda': {
        this.fase = 'fim'; this.placar = m.placar; this.faseAte = agora() + REGRAS.fimRonda * 1000;
        const eqEu = (this.eu_() || {}).equipa;
        const txt = !m.venc ? 'Empate — ninguém marca' : (m.venc === eqEu ? 'A tua equipa ganhou a ronda' : 'A equipa ' + NOME_EQUIPA[m.venc] + ' ganhou a ronda');
        this.centro(txt, 3500, m.venc);
        break;
      }
      case 'fimJogo':
        this.fase = 'terminado'; this.placar = m.placar;
        if (!this.ehHost) this.aplicarLista(m.lista);
        if (document.pointerLockElement) document.exitPointerLock();
        this.desenharPainel();
        break;
      case 'lobby':
        this.fase = 'lobby'; this.placar = { L: 0, A: 0 }; this.ronda = 0;
        if (!this.ehHost) this.aplicarLista(m.lista);
        for (const [id, s] of Object.entries(m.spawns || {})) { const J = this.jogadores.get(id); if (J) { J.p = [s[0], 0, s[1]]; J.yaw = s[2]; J.vivo = true; J.hp = 100; if (id === this.eu.id) this.posicionarLocal(J); } }
        this.encherArmas();
        this.desenharPainel();
        break;
      case 'aviso': this.addFeedTexto(m.txt); break;
    }
  }

  // ── ciclo ──────────────────────────────────────────────────────────
  tickRede() {
    const t = agora();
    const dt = Math.min(0.1, (t - (this.ultimoTickRede || t)) / 1000);
    this.ultimoTickRede = t;
    if (this.fechado) return;
    if (this.ehHost) {
      // no lobby atende entradas depressa; a meio do jogo pergunta menos vezes à API
      if (this.rede) this.rede.intervalo = this.fase === 'lobby' || this.fase === 'terminado' ? 1200 : 3000;
      this.hostTick();
      this.tickBots(dt);
      // o anfitrião também é jogador: copia o estado local
      const me = this.jogadores.get(this.eu.id);
      if (me) { me.p = this.local.p.slice(); me.yaw = this.local.yaw; me.pitch = this.local.pitch; me.c = this.local.agachado; me.a = this.local.arma; }
      this.passoSnap = (this.passoSnap || 0) + 1;
      if (this.rede && this.passoSnap % 2 === 0) {
        const j = [...this.jogadores.values()].map((J) => [J.id, r2(J.p[0]), r2(J.p[1]), r2(J.p[2]), r2(J.yaw), r2(J.pitch), J.c ? 1 : 0, J.a, J.vivo ? 1 : 0, J.hp]);
        this.rede.todos({ t: 'snap', j }, false);
      }
    } else if (this.rede && (this.passoSnap = (this.passoSnap || 0) + 1) % 2 === 0) {
      const L = this.local;
      this.rede.enviar({ t: 's', p: L.p.map(r2), y: r2(L.yaw), x: r2(L.pitch), c: L.agachado ? 1 : 0, a: L.arma }, false);
    }
  }

  ciclo() {
    if (this.fechado) return;
    this.raf = requestAnimationFrame(this.ciclo);
    const t = agora();
    const dt = Math.min(0.05, (t - this.ultimo) / 1000);
    this.ultimo = t;
    this.atualizarLocal(dt, t);
    this.atualizarOutros(dt, t);
    this.atualizarCamera(dt, t);
    this.efeitos.atualizar(dt);
    this.atualizarHud(t);
    this.renderer.clear();
    this.renderer.render(this.cena, this.camera);
    if (this.eu_().vivo || this.fase === 'lobby') {
      this.renderer.clearDepth();
      this.renderer.render(this.cenaFP, this.camFP);
    }
  }

  atualizarLocal(dt, t) {
    const L = this.local, J = this.eu_();
    const pode = this.bloqueado() && (J.vivo || this.fase === 'lobby') && this.fase !== 'congelado' && this.fase !== 'terminado';
    const k = this.teclas;
    // agachar
    const querAgachar = pode && (k.ControlLeft || k.KeyC);
    if (querAgachar) L.agachado = true;
    else if (L.agachado && cabeDePe(L.p)) L.agachado = false;
    const alvoOlhos = L.agachado ? OLHOS.agachado : OLHOS.pe;
    L.alturaOlhos += (alvoOlhos - L.alturaOlhos) * Math.min(1, dt * 14);
    // movimento
    let fx = 0, fz = 0;
    if (pode) {
      if (k.KeyW || k.ArrowUp) fz -= 1;
      if (k.KeyS || k.ArrowDown) fz += 1;
      if (k.KeyA || k.ArrowLeft) fx -= 1;
      if (k.KeyD || k.ArrowRight) fx += 1;
    }
    const n = Math.hypot(fx, fz) || 1;
    fx /= n; fz /= n;
    const s = Math.sin(L.yaw), c = Math.cos(L.yaw);
    const wx = fx * c + fz * s, wz = -fx * s + fz * c;
    let vmax = L.agachado ? VEL.agachado : k.ShiftLeft ? VEL.andar : VEL.correr;
    if (L.arma === 'faca') vmax *= 1.08;
    const acel = L.noChao ? 14 : 2.5;
    L.v[0] += (wx * vmax - L.v[0]) * Math.min(1, acel * dt);
    L.v[2] += (wz * vmax - L.v[2]) * Math.min(1, acel * dt);
    if (pode && k.Space && L.noChao) { L.v[1] = VEL.salto; L.noChao = false; }
    L.v[1] -= VEL.gravidade * dt;
    if (J.vivo || this.fase === 'lobby') L.noChao = mover(L.p, L.v, dt, L.agachado ? ALTURA.agachado : ALTURA.pe);
    L.aMexer = Math.hypot(L.v[0], L.v[2]) > 0.5 && L.noChao;
    if (L.aMexer) L.tAnim += dt * Math.hypot(L.v[0], L.v[2]) / VEL.correr;
    // recuo volta ao sítio
    L.punch[0] *= Math.exp(-dt * 9); L.punch[1] *= Math.exp(-dt * 9);
    L.acum *= Math.exp(-dt * (this.rato.premido ? 2.5 : 7));
    // recarga
    if (L.recarregarAte && t >= L.recarregarAte) {
      const A = ARMAS[L.arma], m = L.mun[L.arma];
      if (m) { const falta = Math.min(A.pente - m[0], m[1]); m[0] += falta; m[1] -= falta; }
      L.recarregarAte = 0;
    }
    if (pode && this.rato.premido) this.disparar();
    if (this.claraoAte && t > this.claraoAte) { this.armaFP.userData.clarao.visible = false; this.claraoAte = 0; }
  }

  atualizarOutros(dt, t) {
    for (const J of this.jogadores.values()) {
      if (J.id === this.eu.id) continue;
      let b = this.bonecos.get(J.id);
      if (!b) { b = criarBoneco(J.equipa, J.nome); this.cena.add(b); this.bonecos.set(J.id, b); J.ver = J.p.slice(); J.verYaw = J.yaw; }
      // suaviza a posição (chega a 20x por segundo)
      const f = Math.min(1, dt * 14);
      const salto = Math.hypot(J.p[0] - J.ver[0], J.p[2] - J.ver[2]) > 4;
      for (let i = 0; i < 3; i++) J.ver[i] = salto ? J.p[i] : J.ver[i] + (J.p[i] - J.ver[i]) * f;
      J.verYaw += angDif(J.yaw, J.verYaw) * f;
      const aMexer = Math.hypot(J.p[0] - J.ver[0], J.p[2] - J.ver[2]) > 0.03 || (J.mexia = (J.mexia || 0) * 0.9) > 0.1;
      if (aMexer) J.mexia = 1;
      J.tAnim = (J.tAnim || 0) + (aMexer ? dt : 0);
      poseBoneco(b, J.ver, J.verYaw, J.c, J.vivo, J.tAnim, aMexer);
      const eu = this.eu_();
      b.userData.etiqueta.visible = J.vivo && (J.equipa === eu.equipa || this.fase === 'lobby' || this.miraEm === J.id);
      b.visible = J.vivo || this.fase !== 'lobby';
    }
  }

  atualizarCamera(dt, t) {
    const L = this.local, J = this.eu_();
    const cam = this.camera;
    if (!J.vivo && this.fase !== 'lobby') {
      // a ver um colega
      let alvo = this.espectar && this.jogadores.get(this.espectar);
      if (!alvo || !alvo.vivo || alvo.equipa !== J.equipa) { alvo = null; this.proximoEspectar(); alvo = this.espectar && this.jogadores.get(this.espectar); }
      if (alvo) {
        const pos = alvo.ver || alvo.p, d = dirDe(alvo.verYaw ?? alvo.yaw, alvo.pitch);
        cam.position.set(pos[0] - d[0] * 2.6, pos[1] + 2.2, pos[2] - d[2] * 2.6);
        cam.rotation.set(-0.25, alvo.verYaw ?? alvo.yaw, 0);
        this.el.espect.hidden = false;
        this.el.espect.innerHTML = 'A ver <b>' + esc(alvo.nome) + '</b> · clica para trocar';
      } else {
        const a = t / 9000;
        cam.position.set(Math.cos(a) * 30, 22, Math.sin(a) * 20);
        cam.lookAt(0, 0, 0);
        this.el.espect.hidden = this.fase === 'terminado';
        this.el.espect.textContent = 'À espera da próxima ronda';
      }
      return;
    }
    this.el.espect.hidden = true;
    cam.position.set(L.p[0], L.p[1] + L.alturaOlhos, L.p[2]);
    cam.rotation.set(L.pitch + L.punch[0], L.yaw + L.punch[1], 0);
    // arma na mão: balanço ao andar, coice e recarga
    const a = this.armaFP, bob = L.aMexer ? Math.sin(L.tAnim * 9) : 0;
    const co = this.anim ? this.anim.coice : 0;
    if (this.anim) { this.anim.coice *= Math.exp(-dt * 18); if (this.anim.coice < 0.01) this.anim = null; }
    let baixar = 0;
    if (L.recarregarAte) baixar = Math.sin(Math.min(1, 1 - (L.recarregarAte - t) / (ARMAS[L.arma].recarga * 1000)) * Math.PI) * 0.6;
    if (t < L.trocaAte) baixar = Math.max(baixar, (L.trocaAte - t) / 350 * 0.6);
    const ofs = L.arma === 'faca' ? [0.2, -0.19, -0.4] : L.arma === 'pistola' ? [0.15, -0.16, -0.42] : [0.16, -0.17, -0.36];
    a.position.set(ofs[0] + bob * 0.012, ofs[1] + Math.abs(bob) * 0.01 - baixar * 0.25, ofs[2] + co * 0.05);
    a.rotation.set(co * 0.08 - baixar, 0, L.arma === 'faca' && co > 0.1 ? -co * 0.8 : 0);
    // quem está na mira (para mostrar o nome de inimigos)
    this.miraEm = null;
    const o = [cam.position.x, cam.position.y, cam.position.z], d = dirDe(L.yaw, L.pitch);
    const r = this.resolverTiro(this.eu.id, o, d, 'rifle');
    if (r.alvo) this.miraEm = r.alvo.id;
  }

  proximoEspectar() {
    const eu = this.eu_();
    const vivos = [...this.jogadores.values()].filter((J) => J.vivo && J.id !== this.eu.id && J.equipa === eu.equipa);
    if (!vivos.length) { this.espectar = null; return; }
    const i = vivos.findIndex((J) => J.id === this.espectar);
    this.espectar = vivos[(i + 1) % vivos.length].id;
  }

  // ── HUD ────────────────────────────────────────────────────────────
  atualizarHud(t) {
    const e = this.el, J = this.eu_(), L = this.local;
    const emJogo = this.fase !== 'lobby' && this.fase !== 'terminado';
    e.hud.hidden = !this.bloqueado() && this.fase !== 'congelado' && this.fase !== 'jogo' && this.fase !== 'fim';
    e.hp.textContent = Math.max(0, Math.round(J.hp));
    e.hpB.style.width = Math.max(0, J.hp) + '%';
    e.hpB.parentElement.classList.toggle('baixa', J.hp <= 30);
    const m = L.mun[L.arma];
    e.arma.textContent = ARMAS[L.arma].nome + (L.recarregarAte ? ' · a recarregar' : '');
    e.mun.textContent = m ? m[0] : '—';
    e.res.textContent = m ? '/ ' + m[1] : '';
    e.pl.textContent = this.placar.L; e.pa.textContent = this.placar.A;
    e.al.textContent = this.contar('L', true); e.aa.textContent = this.contar('A', true);
    const resta = Math.max(0, this.faseAte - t);
    e.tempo.textContent = emJogo ? Math.floor(resta / 60000) + ':' + String(Math.floor(resta / 1000) % 60).padStart(2, '0') : (this.fase === 'lobby' ? 'Aquecimento' : 'Fim');
    e.tempo.classList.toggle('congelado', this.fase === 'congelado');
    // mira abre com a imprecisão
    const A = ARMAS[L.arma];
    const vel = Math.hypot(L.v[0], L.v[2]);
    const cone = A.base + A.mover * Math.min(1, vel / VEL.correr) + (L.noChao ? 0 : A.ar) + L.acum;
    e.mira.style.setProperty('--abre', Math.min(60, 4 + cone * 900) + 'px');
    e.mira.hidden = !J.vivo && this.fase !== 'lobby';
    e.mira.classList.toggle('inimigo', !!(this.miraEm && this.jogadores.get(this.miraEm) && this.jogadores.get(this.miraEm).equipa !== J.equipa && this.fase !== 'lobby'));
    if (this.centroAte && t > this.centroAte) { e.centro.classList.remove('ver'); this.centroAte = 0; }
    // feed de mortes some ao fim de 6 s
    const antes = this.feed.length;
    this.feed = this.feed.filter((f) => t - f.t < 6000);
    if (antes !== this.feed.length) this.desenharFeed();
  }
  centro(html, ms, eq) {
    const e = this.el.centro;
    e.innerHTML = html; e.className = 'ar-centro ver' + (eq ? ' ' + eq : '');
    this.centroAte = agora() + ms;
  }
  mensagem(txt) { this.addFeedTexto(txt); }
  addFeed(J, V, arma, cab) {
    this.feed.push({ t: agora(), html: '<span class="' + (J ? J.equipa : '') + '">' + esc(J ? J.nome : '?') + '</span><i class="ar-ic">' + (arma === 'faca' ? '🔪' : arma === 'pistola' ? '⁍' : '▬') + (cab ? ' ◎' : '') + '</i><span class="' + (V ? V.equipa : '') + '">' + esc(V ? V.nome : '?') + '</span>', meu: J && J.id === this.eu.id });
    if (this.feed.length > 6) this.feed.shift();
    this.desenharFeed();
  }
  addFeedTexto(txt) {
    this.feed.push({ t: agora(), html: '<em>' + esc(txt) + '</em>' });
    if (this.feed.length > 6) this.feed.shift();
    this.desenharFeed();
  }
  desenharFeed() { this.el.feed.innerHTML = this.feed.map((f) => '<div class="' + (f.meu ? 'meu' : '') + '">' + f.html + '</div>').join(''); }
  marcarAcerto(cab, morte) {
    const h = this.el.hit;
    h.className = 'ar-hit ver' + (morte ? ' morte' : '') + (cab ? ' cab' : '');
    clearTimeout(this.hitT); this.hitT = setTimeout(() => (h.className = 'ar-hit'), 160);
    this.som.bip(cab ? 1500 : 1100, 0.05, 0.2, 'square');
  }
  levarDano(deId) {
    const d = this.el.dano;
    d.classList.remove('ver'); void d.offsetWidth; d.classList.add('ver');
    this.som.bip(160, 0.08, 0.3, 'sawtooth');
  }
  desenharTabela() {
    const lin = (eq) => [...this.jogadores.values()].filter((J) => J.equipa === eq).sort((a, b) => b.k - a.k)
      .map((J) => '<tr class="' + (J.vivo ? '' : 'morto') + (J.id === this.eu.id ? ' eu' : '') + '"><td>' + esc(J.nome) + (J.id === this.hostId_() ? ' <small>anfitrião</small>' : '') + '</td><td>' + J.k + '</td><td>' + J.d + '</td></tr>').join('');
    this.el.tabela.innerHTML = ['L', 'A'].map((eq) => '<div class="ar-tab ' + eq + '"><h3>' + NOME_EQUIPA[eq] + ' <b>' + this.placar[eq] + '</b></h3><table><thead><tr><th>Jogador</th><th>Mortes</th><th>Morreu</th></tr></thead><tbody>' + lin(eq) + '</tbody></table></div>').join('');
  }
  hostId_() { return this.ehHost ? this.eu.id : this.hostId; }

  // Painel por cima do jogo: lobby, pausa ou fim
  desenharPainel() {
    const p = this.el.painel;
    if (this.fechado) return;
    if (this.bloqueado() && this.fase !== 'terminado') { p.hidden = true; return; }
    p.hidden = false;
    const eu = this.eu_();
    const equipa = (eq) => {
      const js = [...this.jogadores.values()].filter((J) => J.equipa === eq);
      const vagas = REGRAS.porEquipa - js.length;
      return '<div class="ar-eqbox ' + eq + '"><h3>' + NOME_EQUIPA[eq] + ' <small>' + js.length + '/' + REGRAS.porEquipa + '</small></h3><ul>' +
        js.map((J) => '<li' + (J.id === this.eu.id ? ' class="eu"' : '') + '>' + (J.bot ? '<i class="fas fa-robot" aria-hidden="true"></i> ' : '<i class="fab fa-twitch" aria-hidden="true"></i> ') + esc(J.nome) + (J.id === this.hostId_() ? ' <small>anfitrião</small>' : '') + '</li>').join('') +
        '<li class="vaga">' + (vagas > 0 ? vagas + (vagas === 1 ? ' lugar livre' : ' lugares livres') : 'Equipa cheia') + '</li></ul>' +
        (this.fase === 'lobby' && eu.equipa !== eq && vagas > 0 ? '<button class="btn-ghost" data-ac="equipa" data-eq="' + eq + '">Mudar para ' + NOME_EQUIPA[eq] + '</button>' : '') +
        (this.ehHost && this.fase === 'lobby' ? '<div class="ar-bots"><button class="btn-ghost" data-ac="bot+" data-eq="' + eq + '"' + (vagas > 0 ? '' : ' disabled') + '>+ Bot</button><button class="btn-ghost" data-ac="bot-" data-eq="' + eq + '"' + (js.some((J) => J.bot) ? '' : ' disabled') + '>− Bot</button></div>' : '') +
        '</div>';
    };
    let topo = '', acoes = '';
    if (this.fase === 'lobby') {
      topo = this.modo === 'treino' ? '<h2>Treino com bots</h2><p>Joga contra bots para aprender o mapa e as armas. Ajusta as equipas e começa.</p>'
        : '<h2>Sala <span class="ar-cod">' + esc(this.cod || '') + '</span></h2><p>' + (this.ehHost ? 'Partilha o código no chat ou no Discord. Quem entrar fica na equipa com menos jogadores. Podes completar as equipas com bots.' : 'Estás dentro. Escolhe a equipa e espera que o anfitrião comece.') + '</p>';
      acoes = (this.ehHost ? '<button class="btn-primary" data-ac="comecar">Começar o jogo</button>' : '') + (this.cod ? '<button class="btn-ghost" data-ac="convite">Copiar convite</button>' : '') + '<button class="btn-ghost" data-ac="entrar">Aquecer no mapa</button>';
    } else if (this.fase === 'terminado') {
      const venc = this.placar.L > this.placar.A ? 'L' : 'A';
      topo = '<h2 class="ar-venc ' + venc + '">' + (eu.equipa === venc ? 'Vitória!' : 'Derrota') + '</h2><p>A equipa ' + NOME_EQUIPA[venc] + ' ganhou ' + this.placar[venc] + ' a ' + this.placar[venc === 'L' ? 'A' : 'L'] + '.</p>';
      this.desenharTabela();
      topo += '<div class="ar-tabela dentro">' + this.el.tabela.innerHTML + '</div>';
      acoes = this.ehHost ? '<button class="btn-primary" data-ac="lobby">Jogar outra vez</button>' : '<p class="ar-nota">À espera que o anfitrião comece outra partida.</p>';
    } else {
      topo = '<h2>Pausa</h2><p>O jogo continua a correr. Clica em voltar para jogares.</p>';
      acoes = '<button class="btn-primary" data-ac="entrar">Voltar ao jogo</button>';
    }
    const corpo = this.fase === 'terminado' ? '' : '<div class="ar-equipas">' + equipa('L') + equipa('A') + '</div>';
    p.innerHTML = '<div class="ar-caixa">' + topo + corpo +
      '<div class="ar-acoes">' + acoes + '<button class="btn-ghost" data-ac="sair">' + (this.ehHost && this.modo === 'anfitriao' ? 'Fechar a sala' : 'Sair') + '</button></div>' +
      '<details class="ar-opcoes"><summary>Controlos e opções</summary>' +
      '<p class="ar-teclas"><b>WASD</b> mover · <b>Rato</b> apontar · <b>Clique</b> disparar · <b>Espaço</b> saltar · <b>Ctrl/C</b> agachar · <b>Shift</b> andar devagar · <b>R</b> recarregar · <b>1 2 3 / Q / roda</b> armas · <b>Tab</b> tabela · <b>Esc</b> pausa</p>' +
      '<label>Sensibilidade do rato <input type="range" min="0.2" max="3" step="0.05" value="' + this.sens + '" data-op="sens"> <output>' + this.sens.toFixed(2) + '</output></label>' +
      '<label>Volume <input type="range" min="0" max="1" step="0.05" value="' + this.som.vol + '" data-op="vol"></label></details></div>';
    p.querySelectorAll('[data-ac]').forEach((b) => b.addEventListener('click', () => this.acao(b.dataset.ac, b.dataset.eq)));
    p.querySelectorAll('[data-op]').forEach((i) => i.addEventListener('input', () => {
      if (i.dataset.op === 'sens') { this.sens = parseFloat(i.value); localStorage.setItem('arena_sens', i.value); i.nextElementSibling.textContent = this.sens.toFixed(2); }
      else { this.som.vol = parseFloat(i.value); localStorage.setItem('arena_vol', i.value); }
    }));
  }
  acao(ac, eq) {
    if (ac === 'entrar') return this.entrar();
    if (ac === 'sair') return this.sair();
    if (ac === 'comecar' && this.ehHost) { this.hostComecar(); if (this.fase !== 'lobby') this.entrar(); return; }
    if (ac === 'lobby' && this.ehHost) return this.hostVoltarLobby();
    if (ac === 'equipa') {
      if (this.ehHost) {
        const me = this.eu_();
        if (this.contar(eq) < REGRAS.porEquipa) { me.equipa = eq; this.irParaSpawn(me, this.contar(eq) - 1); this.posicionarLocal(me); this.hostAvisarLista(); }
      } else this.rede.enviar({ t: 'equipa', e: eq }, true);
      return;
    }
    if (ac === 'convite') {
      const txt = 'Arena 4v4 do FabioSilva_TV, sala ' + this.cod + ': https://fabiosilvatv.com/arena.html?sala=' + this.cod;
      const b = this.el.painel.querySelector('[data-ac="convite"]');
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { if (b) b.textContent = 'Copiado!'; }, () => { if (b) b.textContent = this.cod; });
      return;
    }
    if (ac === 'bot+' && this.ehHost) return this.addBot(eq);
    if (ac === 'bot-' && this.ehHost) return this.tirarBot(eq);
  }
  avisoFinal(txt) {
    if (this.fechado) return;
    if (document.pointerLockElement) document.exitPointerLock();
    const a = this.el.aviso;
    a.hidden = false;
    a.innerHTML = '<div class="ar-caixa"><h2>Fim da ligação</h2><p>' + esc(txt) + '</p><div class="ar-acoes"><button class="btn-primary">Voltar</button></div></div>';
    a.querySelector('button').addEventListener('click', () => this.sair());
  }

  sair() {
    if (this.fechado) return;
    this.fechado = true;
    cancelAnimationFrame(this.raf);
    this.pararRelogio();
    if (document.pointerLockElement) document.exitPointerLock();
    document.removeEventListener('keydown', this.onKey); document.removeEventListener('keyup', this.onKey);
    document.removeEventListener('mousemove', this.onMove); document.removeEventListener('mousedown', this.onDown);
    document.removeEventListener('mouseup', this.onUp); document.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('pointerlockchange', this.onLock);
    window.removeEventListener('resize', this.redimensionar);
    if (this.rede) this.rede.fechar();
    if (this.ehHost && this.api && this.cod && this.modo === 'anfitriao') this.api.fechar(this.cod).catch(() => {});
    this.renderer.dispose();
    this.raiz.innerHTML = '';
    this.raiz.classList.remove('ar-raiz');
    if (this.aoSair) this.aoSair();
  }
}
