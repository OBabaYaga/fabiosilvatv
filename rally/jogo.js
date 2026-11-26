// Rally — o jogo em 3D: cenário, carros, câmara, adversários, voltas e HUD.
import * as THREE from '../arena/three.module.min.js';
import { PISTAS, PISOS, construirPista, novoCarro, conduzir, seguirProgresso, pilotoComputador } from './pistas.js?v=2';
import { RoundedBoxGeometry } from '../vendor/three/geometries/RoundedBoxGeometry.js';
import { qualidade, definirQualidade, NOMES_QUALIDADE, normalDe, ceuReal, criarComposer } from '../comum/grafico.js?v=1';

const agora = () => performance.now();
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtTempo = (ms) => { if (ms == null || !isFinite(ms)) return '—'; const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, c = Math.floor(ms / 10) % 100; return m + ':' + String(s).padStart(2, '0') + '.' + String(c).padStart(2, '0'); };
const RIVAIS = [
  { nome: 'Rita Ferraz', cor: 0x2f6bff, num: 7, ritmo: 1.0, linha: -1.2 },
  { nome: 'Zé Malheiro', cor: 0xf4f1e6, num: 12, ritmo: 0.965, linha: 1.4 },
  { nome: 'Inês Couto', cor: 0xd62a1f, num: 21, ritmo: 0.93, linha: 0.3 },
];

// ── texturas desenhadas em canvas ────────────────────────────────────
function tela(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function grao(g, w, h, n, cores, a = 0.35) { for (let i = 0; i < n; i++) { g.globalAlpha = a * Math.random(); g.fillStyle = cores[i % cores.length]; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3); } g.globalAlpha = 1; }
function texEstrada(piso) {
  return tela(128, 256, (g, w, h) => {
    const base = { asfalto: '#3a3d44', terra: '#a8784a', lama: '#5e4329', neve: '#b9c4da', areia: '#dcc48c' }[piso];
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const cores = { asfalto: ['#2a2c32', '#4a4d55'], terra: ['#8a5e36', '#c49464', '#6a4a2a'], lama: ['#3a2818', '#7a5838'], neve: ['#d8e0f0', '#9aa8c4', '#ffffff'], areia: ['#c8ae74', '#efdcaa'] }[piso];
    grao(g, w, h, 5000, cores);
    if (piso === 'asfalto') { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(2, 0, 4, h); g.fillRect(w - 6, 0, 4, h); g.fillStyle = 'rgba(255,211,77,.8)'; g.fillRect(w / 2 - 2, 0, 4, h * 0.5); }
    else {
      // marcas dos pneus
      g.fillStyle = piso === 'neve' ? 'rgba(150,165,195,.45)' : 'rgba(0,0,0,.18)';
      for (const x of [0.28, 0.36, 0.64, 0.72]) g.fillRect(w * x, 0, 6, h);
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
      if (piso === 'neve') { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h); g.fillStyle = 'rgba(255,122,26,.9)'; for (let y = 0; y < h; y += 64) { g.fillRect(0, y, 10, 22); g.fillRect(w - 10, y + 32, 10, 22); } }
    }
  });
}
function texChao(tipo) {
  return tela(512, 512, (g, w, h) => {
    const t = { erva: ['#4a7430', ['#3a6024', '#5e8c3c', '#2c4c1c', '#6f9a46']], erva_seca: ['#9a8a4a', ['#7f6e36', '#b4a060', '#6a7a36', '#8a7a40']], neve: ['#eef3fb', ['#ffffff', '#d2dcee', '#e4ebf7']], areia_fora: ['#d4ba84', ['#c2a46e', '#e8d6a8', '#b89a64']] }[tipo] || ['#4a7430', ['#3a6024']];
    g.fillStyle = t[0]; g.fillRect(0, 0, w, h);
    // manchas grandes e grão fino
    for (let i = 0; i < 70; i++) { g.globalAlpha = 0.12; g.fillStyle = t[1][i % t[1].length]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 12 + Math.random() * 40, Math.random() * 3, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    grao(g, w, h, 26000, t[1], 0.55);
    if (tipo === 'erva' || tipo === 'erva_seca') { g.strokeStyle = tipo === 'erva' ? 'rgba(30,60,15,.35)' : 'rgba(90,80,30,.35)'; g.lineWidth = 1; for (let i = 0; i < 3000; i++) { const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y - 3 - Math.random() * 4); g.stroke(); } }
  });
}
function texRocha() {
  return tela(256, 256, (g, w, h) => {
    g.fillStyle = '#7a756c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { g.fillStyle = ['#8f897e', '#615c54', '#a29b8e', '#6e685e'][i % 4]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 22, 4 + Math.random() * 12, Math.random() * 3, 0, 7); g.fill(); }
    grao(g, w, h, 6000, ['#4a4640', '#b0a898'], 0.5);
  });
}
function texBerma(piso) {
  return tela(256, 256, (g, w, h) => {
    const c = { asfalto: ['#7a7468', '#5a554c', '#9a9484'], terra: ['#9a7448', '#7a5634', '#b48c5c'], lama: ['#5a4430', '#3e2c1c', '#6e543a'], neve: ['#dde4f0', '#c4cee2', '#f4f8ff'], areia: ['#d8c08c', '#c0a470', '#ecdcb0'] }[piso] || ['#9a7448', '#7a5634'];
    g.fillStyle = c[0]; g.fillRect(0, 0, w, h);
    grao(g, w, h, 14000, c, 0.6);
    for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 0, 7); g.fill(); }
  });
}
function texCarro(cor, num) {
  return tela(256, 128, (g, w, h) => {
    g.fillStyle = '#' + new THREE.Color(cor).getHexString(); g.fillRect(0, 0, w, h);
    g.fillStyle = cor === 0xff7a1a ? '#0a1022' : 'rgba(0,0,0,.65)'; g.fillRect(0, h * 0.55, w, h * 0.12);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.5, h * 0.32, 22, 0, 7); g.fill();
    g.fillStyle = '#111'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(num), w * 0.5, h * 0.33);
    g.fillStyle = 'rgba(255,255,255,.9)'; g.font = 'bold 15px sans-serif'; g.fillText('FSTV RALLY', w * 0.5, h * 0.82);
  });
}

// ── carro 3D ─────────────────────────────────────────────────────────
function criarCarro(cor, num) {
  const g = new THREE.Group();
  const tex = texCarro(cor, num);
  const pintura = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.38, metalness: 0.12, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const liso = new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.38, metalness: 0.12, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const vidro = new THREE.MeshPhysicalMaterial({ color: 0x0b0f18, roughness: 0.04, metalness: 0.9, clearcoat: 1 });
  const preto = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.7, metalness: 0.2 });
  const plastico = new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: 0.55 });
  const corpo = new THREE.Group(); g.add(corpo);
  const add = (geo, mat, x, y, z, sombra = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = sombra; corpo.add(m); return m; };
  // carroçaria arredondada, com a pintura de lado
  const base = add(new RoundedBoxGeometry(1.86, 0.6, 4.15, 4, 0.16), liso, 0, 0.66, 0);
  const lados = add(new THREE.BoxGeometry(1.875, 0.36, 3.2), [pintura, pintura, liso, liso, liso, liso], 0, 0.7, 0.05, false);
  add(new RoundedBoxGeometry(1.7, 0.2, 1.4, 3, 0.08), liso, 0, 0.98, 1.25);            // capot
  add(new RoundedBoxGeometry(1.58, 0.52, 2.05, 4, 0.18), vidro, 0, 1.2, -0.25);        // cabine (vidros)
  add(new RoundedBoxGeometry(1.5, 0.1, 1.65, 3, 0.04), liso, 0, 1.47, -0.3);           // tejadilho
  add(new THREE.BoxGeometry(0.2, 0.08, 0.6), plastico, 0, 1.54, -0.1);                 // entrada de ar
  // pilares entre os vidros
  for (const x of [-0.77, 0.77]) add(new THREE.BoxGeometry(0.05, 0.48, 1.9), liso, x, 1.2, -0.25, false);
  // aileron, para-choques, espelhos, palas
  add(new RoundedBoxGeometry(1.78, 0.07, 0.48, 2, 0.03), plastico, 0, 1.5, -1.95);
  for (const x of [-0.6, 0.6]) add(new THREE.BoxGeometry(0.06, 0.32, 0.12), plastico, x, 1.32, -1.9);
  add(new RoundedBoxGeometry(1.9, 0.26, 0.24, 2, 0.08), plastico, 0, 0.45, 2.08);
  add(new RoundedBoxGeometry(1.9, 0.26, 0.24, 2, 0.08), plastico, 0, 0.45, -2.08);
  for (const x of [-1.0, 1.0]) add(new RoundedBoxGeometry(0.16, 0.12, 0.24, 2, 0.04), liso, x, 1.1, 0.55);
  for (const z of [0.85, -1.45]) for (const x of [-0.95, 0.95]) add(new THREE.BoxGeometry(0.04, 0.3, 0.3), preto, x, 0.32, z, false);
  // faróis (acesos: brilham com o pós-processamento) e farolins
  const farol = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2cc, emissiveIntensity: 2.2 });
  for (const x of [-0.6, 0.6]) add(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 14).rotateX(Math.PI / 2), farol, x, 0.74, 2.09, false);
  for (const x of [-0.5, 0.5]) add(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 14).rotateX(Math.PI / 2), farol, x, 0.35, 2.2, false); // faróis de nevoeiro
  const traseira = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1a1a, emissiveIntensity: 0.6 });
  for (const x of [-0.7, 0.7]) add(new THREE.BoxGeometry(0.34, 0.12, 0.04), traseira, x, 0.78, -2.09, false);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.3 }), 0.55, 0.3, -2.15, false);
  // rodas: pneu com flanco e jante de 5 raios
  const rodas = [];
  const pneuG = new THREE.CylinderGeometry(0.37, 0.37, 0.28, 22); pneuG.rotateZ(Math.PI / 2);
  const flancoG = new THREE.TorusGeometry(0.33, 0.05, 6, 22); flancoG.rotateY(Math.PI / 2);
  const janteM = new THREE.MeshStandardMaterial({ color: 0xd8dce4, metalness: 0.9, roughness: 0.25 });
  for (const [x, z] of [[-0.9, 1.35], [0.9, 1.35], [-0.9, -1.35], [0.9, -1.35]]) {
    const piv = new THREE.Group(); piv.position.set(x, 0.37, z);
    const r = new THREE.Mesh(pneuG, preto); r.castShadow = true;
    for (const lx of [-0.14, 0.14]) { const f = new THREE.Mesh(flancoG, preto); f.position.x = lx; r.add(f); }
    const lado = x > 0 ? 0.145 : -0.145;
    const centro = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 10).rotateZ(Math.PI / 2), janteM); centro.position.x = lado; r.add(centro);
    for (let k = 0; k < 5; k++) {
      const raio = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.24), janteM);
      raio.position.set(lado, 0, 0); raio.rotation.x = (k / 5) * Math.PI * 2; raio.translateZ(0.12); r.add(raio);
    }
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 6, 22).rotateY(Math.PI / 2), janteM); aro.position.x = lado; r.add(aro);
    piv.add(r); g.add(piv); rodas.push({ piv, r, frente: z > 0 });
  }
  g.userData = { corpo, rodas };
  return g;
}

function relogio(hz, fn) {
  try {
    const url = URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),' + Math.round(1000 / hz) + ')'], { type: 'text/javascript' }));
    const w = new Worker(url); w.onmessage = fn;
    return () => { w.terminate(); URL.revokeObjectURL(url); };
  } catch (e) { const i = setInterval(fn, 1000 / hz); return () => clearInterval(i); }
}

// ── som do motor ─────────────────────────────────────────────────────
class Motor {
  constructor() { this.ctx = null; this.vol = parseFloat(localStorage.getItem('rally_vol') || '0.5'); }
  ligar() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.mestre = c.createGain(); this.mestre.gain.value = this.vol; this.mestre.connect(c.destination);
    this.o1 = c.createOscillator(); this.o1.type = 'sawtooth';
    this.o2 = c.createOscillator(); this.o2.type = 'square';
    this.filtro = c.createBiquadFilter(); this.filtro.type = 'lowpass'; this.filtro.frequency.value = 900;
    this.gm = c.createGain(); this.gm.gain.value = 0.08;
    this.o1.connect(this.filtro); this.o2.connect(this.filtro); this.filtro.connect(this.gm).connect(this.mestre);
    this.o1.start(); this.o2.start();
    const n = c.sampleRate, b = c.createBuffer(1, n, n), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.ruido = c.createBufferSource(); this.ruido.buffer = b; this.ruido.loop = true;
    this.fr = c.createBiquadFilter(); this.fr.type = 'bandpass'; this.fr.frequency.value = 1200;
    this.gr = c.createGain(); this.gr.gain.value = 0;
    this.ruido.connect(this.fr).connect(this.gr).connect(this.mestre); this.ruido.start();
  }
  atualizar(vel, acel, derrapa, piso) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // mudanças fingidas: o motor sobe e cai como se mudasse de velocidade
    const kmh = vel * 3.6, limites = [0, 45, 80, 115, 150, 999];
    let m = 0; while (kmh > limites[m + 1]) m++;
    const rpm = (kmh - limites[m]) / (limites[m + 1] - limites[m]);
    const f = 55 + rpm * 85 + m * 12 + (acel ? 10 : 0);
    this.o1.frequency.setTargetAtTime(f, t, 0.05); this.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    this.gm.gain.setTargetAtTime(0.05 + (acel ? 0.05 : 0.02), t, 0.1);
    const solto = piso !== 'asfalto';
    this.gr.gain.setTargetAtTime(Math.min(0.25, derrapa * 0.25 + (solto ? Math.min(0.1, vel / 300) : 0)), t, 0.08);
    this.fr.frequency.setTargetAtTime(solto ? 500 : 1500, t, 0.1);
  }
  calar() { if (this.ctx) this.ctx.close(); this.ctx = null; }
}

// ════════════════════════════════════════════════════════════════════
export class Rally {
  /** o: { raiz, pista (id), modo: 'corrida'|'relogio', nome, toque, aoFim(resultado), aoSair } */
  constructor(o) {
    Object.assign(this, o);
    this.def = PISTAS[o.pista] || PISTAS.douro;
    this.p = construirPista(this.def);
    this.voltas = this.def.voltas;
    this.teclas = {};
    this.toqueEnt = { esq: false, dir: false, acel: false, trava: false, mao: false };
    this.autoAcel = !!o.toque;
    this.motor = new Motor();
    this.camModo = 0;
    this.fase = 'contagem';
    this.montarDom();
    this.montar3D();
    this.prepararCorrida();
    this.ligarInput();
    this.ultimo = agora();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    this.pararRelogio = relogio(60, () => this.fisica());
  }

  montarDom() {
    const r = this.raiz;
    r.classList.add('rl-raiz');
    r.classList.toggle('toque', !!this.toque);
    r.innerHTML = `
      <canvas class="rl-canvas"></canvas>
      <div class="rl-hud">
        <div class="rl-pos"><b id="rlPos">4</b><small id="rlPosDe">/4</small></div>
        <div class="rl-volta">Volta <b id="rlVolta">1</b>/<span id="rlVoltas">3</span></div>
        <div class="rl-tempos"><div><small>Total</small><b id="rlTotal">0:00.00</b></div><div><small>Volta</small><b id="rlTVolta">0:00.00</b></div><div><small>Melhor</small><b id="rlMelhor">—</b></div></div>
        <canvas class="rl-mapa" id="rlMapa" width="180" height="180"></canvas>
        <div class="rl-velo"><b id="rlVel">0</b><small>km/h</small><span class="rl-mud" id="rlMud">1</span><i class="rl-barra"><i id="rlBarra"></i></i></div>
        <div class="rl-centro" id="rlCentro"></div>
        <div class="rl-aviso" id="rlAviso" hidden>Contra-mão! Dá a volta</div>
        <div class="rl-piso" id="rlPiso"></div>
      </div>
      <div class="rl-toque" id="rlToque" hidden>
        <div class="rl-t-esq"><button data-t="esq" aria-label="Virar à esquerda">◀</button><button data-t="dir" aria-label="Virar à direita">▶</button></div>
        <div class="rl-t-dir"><button data-t="mao" class="peq">Travão de mão</button><button data-t="trava" class="peq">Travar</button><button data-t="acel" class="grande">Acelerar</button></div>
      </div>
      <button class="rl-pausa-btn" id="rlPausaBtn" aria-label="Pausa">II</button>
      <div class="rl-painel" id="rlPainel" hidden></div>`;
    const $ = (id) => r.querySelector('#' + id);
    this.el = { canvas: r.querySelector('.rl-canvas'), pos: $('rlPos'), posDe: $('rlPosDe'), volta: $('rlVolta'), voltasN: $('rlVoltas'), total: $('rlTotal'), tvolta: $('rlTVolta'), melhor: $('rlMelhor'), mapa: $('rlMapa'), vel: $('rlVel'), mud: $('rlMud'), barra: $('rlBarra'), centro: $('rlCentro'), aviso: $('rlAviso'), piso: $('rlPiso'), toque: $('rlToque'), painel: $('rlPainel') };
    this.el.voltasN.textContent = this.voltas;
    if (this.modo === 'relogio') { r.querySelector('.rl-pos').hidden = true; }
    this.el.toque.hidden = !this.toque;
  }

  montar3D() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.el.canvas, antialias: true, powerPreference: 'high-performance' });
    this.q = qualidade();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.q === 'baixa' ? 1 : this.q === 'media' ? 1.25 : 1.5));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.85;
    this.renderer = renderer;
    const T = this.def.tema, p = this.p;
    const cena = new THREE.Scene(); this.cena = cena;
    cena.fog = new THREE.Fog(T.nevoeiro[0], T.nevoeiro[1], T.nevoeiro[2]);
    // céu
    // céu com atmosfera a sério; os reflexos (carros, água) vêm dele
    const ceu = ceuReal(renderer, cena, { ...T.real, tamanho: 2500 });
    this.ceu = ceu.sky;
    cena.add(new THREE.HemisphereLight(T.hemi[0], T.hemi[1], T.hemi[2] * 0.45));
    const sol = new THREE.DirectionalLight(T.sol[0], T.sol[1] * 1.1);
    sol.castShadow = true; const tamS = this.q === 'alta' ? 4096 : this.q === 'media' ? 2048 : 1024; sol.shadow.mapSize.set(tamS, tamS);
    Object.assign(sol.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 500 });
    sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.03;
    this.sol = sol; this.solDir = ceu.sol.clone().normalize(); if (this.solDir.y < 0.08) this.solDir.y = 0.08; this.solDir.normalize();
    cena.add(sol); cena.add(sol.target);

    // limites da zona
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const s of p.amostras) { minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x); minZ = Math.min(minZ, s.z); maxZ = Math.max(maxZ, s.z); }
    const M = 260; minX -= M; maxX += M; minZ -= M; maxZ += M;
    this.zona = { minX, maxX, minZ, maxZ };
    // terreno
    const passo = 5, nx = Math.ceil((maxX - minX) / passo), nz = Math.ceil((maxZ - minZ) / passo);
    const geo = new THREE.PlaneGeometry(nx * passo, nz * passo, nx, nz);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const cores = new Float32Array(pos.count * 3), base = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx, z = pos.getZ(i) + cz;
      let y = p.altura(x, z);
      // bordas: montes à volta (ou o mar, no Algarve)
      const borda = Math.min(x - minX, maxX - x, z - minZ, maxZ - z);
      if (borda < 160) { const t = 1 - borda / 160; y += T.mar ? -t * t * 14 : t * t * 55; }
      pos.setY(i, y);
      pos.setX(i, x); pos.setZ(i, z);
      const v = 0.85 + Math.random() * 0.25;
      base.setRGB(v, v, v);
      cores.set([base.r, base.g, base.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    geo.computeVertexNormals();
    // mistura: x = berma (perto da estrada), y = rocha (onde é íngreme)
    const nor = geo.attributes.normal, mist = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const ny = nor.getY(i), x = pos.getX(i), z = pos.getZ(i);
      const rocha = Math.min(1, Math.max(0, (0.9 - ny) / 0.22));
      const r = p.maisPerto(x, z, 1);
      const berma = r ? Math.min(1, Math.max(0, 1 - (r.d - p.meia - 0.5) / 5)) : 0;
      mist[i * 2] = berma; mist[i * 2 + 1] = T.neve ? rocha * 0.5 : rocha;
    }
    geo.setAttribute('mistura', new THREE.BufferAttribute(mist, 2));
    const tChao = texChao(T.fora); tChao.repeat.set(nx * passo / 14, nz * passo / 14);
    const pisoPrincipal = this.def.pisos.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a))[2];
    const tRocha = texRocha(), tBerma = texBerma(pisoPrincipal);
    const matT = new THREE.MeshStandardMaterial({ map: tChao, normalMap: normalDe(tChao, 3), normalScale: new THREE.Vector2(0.8, 0.8), vertexColors: true, roughness: 0.95 });
    matT.onBeforeCompile = (sh) => {
      sh.uniforms.texRocha = { value: tRocha }; sh.uniforms.texBerma = { value: tBerma };
      sh.vertexShader = 'attribute vec2 mistura;\nvarying vec2 vMistura;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vMistura = mistura;');
      sh.fragmentShader = 'uniform sampler2D texRocha;\nuniform sampler2D texBerma;\nvarying vec2 vMistura;\n' + sh.fragmentShader.replace('#include <map_fragment>',
        '#ifdef USE_MAP\n vec4 cA = texture2D(map, vMapUv);\n vec4 cR = texture2D(texRocha, vMapUv * 1.7);\n vec4 cB = texture2D(texBerma, vMapUv * 2.5);\n vec4 sampledDiffuseColor = mix(mix(cA, cR, vMistura.y), cB, vMistura.x);\n diffuseColor *= sampledDiffuseColor;\n#endif');
    };
    const terreno = new THREE.Mesh(geo, matT);
    terreno.receiveShadow = true;
    cena.add(terreno);
    if (T.mar) {
      const tOnda = tela(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 4 + Math.random() * 14, 1.5 + Math.random() * 3, 0, 0, 7); g.fill(); } });
      tOnda.repeat.set(120, 120);
      this.ondas = normalDe(tOnda, 2); this.ondas.repeat.set(120, 120);
      const mar = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshPhysicalMaterial({ color: 0x0f4a6e, roughness: 0.06, metalness: 0.1, normalMap: this.ondas, normalScale: new THREE.Vector2(0.6, 0.6), clearcoat: 1, clearcoatRoughness: 0.05 }));
      mar.rotation.x = -Math.PI / 2; mar.position.y = -4; cena.add(mar);
    }
    // estrada (uma malha por troço de piso)
    const A = p.amostras, N = p.N, meia = p.meia;
    let ini = 0;
    const trocos = [];
    for (let i = 1; i <= N; i++) if (i === N || A[i].piso !== A[ini].piso) { trocos.push([ini, i, A[ini].piso]); ini = i; }
    const texs = {};
    for (const [a, b, piso] of trocos) {
      const v = [], uv = [], idx = [];
      for (let i = a; i <= b; i++) {
        const s = A[i % N];
        v.push(s.x + s.nx * meia, s.y + 0.08, s.z + s.nz * meia, s.x - s.nx * meia, s.y + 0.08, s.z - s.nz * meia);
        uv.push(0, i * 2 / (meia * 2), 1, i * 2 / (meia * 2));
        if (i > a) { const k = (i - a) * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      if (!texs[piso]) { const te = texEstrada(piso); texs[piso] = new THREE.MeshStandardMaterial({ map: te, normalMap: normalDe(te, piso === 'asfalto' ? 1.5 : 3.5), normalScale: new THREE.Vector2(0.7, 0.7), roughness: piso === 'neve' ? 0.55 : piso === 'asfalto' ? 0.8 : 0.95, polygonOffset: true, polygonOffsetFactor: -2 }); }
      const m = new THREE.Mesh(g, texs[piso]); m.receiveShadow = true; cena.add(m);
    }
    // vedação: postes e fita a cada 8 m
    const nPostes = Math.floor(N / 4) * 2;
    const postes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), new THREE.MeshStandardMaterial({ color: 0xeeeeee }), nPostes);
    const fita = [], fitaCor = [];
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (const lado of [1, -1]) {
      let ant = null;
      for (let i = 0; i < N; i += 4) {
        const s = A[i], d = meia + 6.5;
        const x = s.x + s.nx * d * lado, z = s.z + s.nz * d * lado, y = p.altura(x, z);
        m4.makeTranslation(x, y + 0.55, z); postes.setMatrixAt(k++, m4);
        if (ant) { fita.push(ant[0], ant[1] + 0.95, ant[2], x, y + 0.95, z); const c = (i / 4) % 2 ? [1, 0.48, 0.1] : [1, 1, 1]; fitaCor.push(...c, ...c); }
        ant = [x, y, z];
      }
    }
    postes.count = k; cena.add(postes);
    const gf = new THREE.BufferGeometry(); gf.setAttribute('position', new THREE.Float32BufferAttribute(fita, 3)); gf.setAttribute('color', new THREE.Float32BufferAttribute(fitaCor, 3));
    cena.add(new THREE.LineSegments(gf, new THREE.LineBasicMaterial({ vertexColors: true })));
    // árvores
    this.plantar(T);
    // público nas curvas mais fechadas
    this.publico();
    // pórtico da partida
    this.portico();
    // serras ao longe: um anel de relevo com ruído (por baixo da zona de jogo fica escondido)
    {
      const R0 = Math.max(maxX - minX, maxZ - minZ) / 2;
      const gS = new THREE.PlaneGeometry(R0 * 2 + 3000, R0 * 2 + 3000, 150, 150); gS.rotateX(-Math.PI / 2);
      const ps = gS.attributes.position, cs = new Float32Array(ps.count * 3);
      const cBase = new THREE.Color(T.neve ? 0xe8eef8 : T.mar ? 0xc8a878 : T.fora === 'erva' ? 0x2e4a26 : 0x7a7a4a);
      const cTopo = new THREE.Color(T.neve ? 0xffffff : T.mar ? 0xb89868 : T.fora === 'erva' ? 0x3e5a34 : 0x8a7a5a);
      const ruidoM = (x, z) => { let a = 0, f = 1 / 700, amp = 1; for (let o = 0; o < 4; o++) { a += amp * (Math.sin(x * f * 1.7 + o * 3.1) * Math.cos(z * f * 1.3 - o * 1.7) * 0.5 + 0.5); f *= 2.1; amp *= 0.5; } return a / 1.9; };
      for (let i = 0; i < ps.count; i++) {
        const x = ps.getX(i) + cx, z = ps.getZ(i) + cz;
        const fora = Math.max(minX - x, x - maxX, minZ - z, z - maxZ, 0);
        let y;
        if (fora <= 0) y = -60;
        else { const t = Math.min(1, fora / 700); y = (T.mar ? -10 + t * 60 * ruidoM(x, z) * (z > cz ? 1 : 0.15) : 10 + t * t * (90 + 240 * ruidoM(x, z))) - 18; }
        ps.setX(i, x); ps.setZ(i, z); ps.setY(i, y);
        const k = Math.min(1, Math.max(0, y / 200)); const cc = cBase.clone().lerp(cTopo, k);
        if (T.neve === undefined && y > 170) cc.lerp(new THREE.Color(0xf4f6fa), Math.min(1, (y - 170) / 80));
        cs.set([cc.r, cc.g, cc.b], i * 3);
      }
      gS.setAttribute('color', new THREE.BufferAttribute(cs, 3)); gS.computeVertexNormals();
      const tS = texChao(T.fora); tS.repeat.set(60, 60);
      cena.add(new THREE.Mesh(gS, new THREE.MeshStandardMaterial({ map: tS, vertexColors: true, roughness: 1 })));
    }
    // neve a cair
    if (T.neve) {
      const n = 1500, pts = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) pts.set([(Math.random() - 0.5) * 120, Math.random() * 40, (Math.random() - 0.5) * 120], i * 3);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      const tf = tela(16, 16, (c) => { const gr = c.createRadialGradient(8, 8, 0, 8, 8, 8); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 16, 16); });
      this.flocos = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, map: tf, transparent: true, opacity: 0.9, depthWrite: false }));
      cena.add(this.flocos);
    }
    // poeira
    this.poeira = [];
    const texP = tela(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
    for (let i = 0; i < 160; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texP, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false; cena.add(s); this.poeira.push({ s, vida: 0 });
    }
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.3, 3000);
    this.redim = () => {
      const w = this.raiz.clientWidth || innerWidth, h = this.raiz.clientHeight || innerHeight;
      renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      if (this.comp) this.comp.setSize(w, h);
    };
    renderer.setSize(this.raiz.clientWidth || innerWidth, this.raiz.clientHeight || innerHeight, false);
    if (this.q === 'alta') this.comp = criarComposer(renderer, [[cena, this.camera]], { forca: 0.28, raio: 0.45, limiar: 0.92 });
    addEventListener('resize', this.redim); this.redim();
    this.desenharMapaBase();
  }

  plantar(T) {
    const p = this.p, z = this.zona, cena = this.cena;
    let semente = 12345;
    const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Vector3(), sc = new THREE.Vector3(), cor = new THREE.Color(), eixoY = new THREE.Vector3(0, 1, 0);
    // pontos livres longe da estrada
    const pontos = (n, minD, maxD) => {
      const out = [];
      for (let t = 0; t < n * 10 && out.length < n; t++) {
        const x = z.minX + 90 + rnd() * (z.maxX - z.minX - 180), zz = z.minZ + 90 + rnd() * (z.maxZ - z.minZ - 180);
        const r = p.maisPerto(x, zz, 3);
        const d = r ? r.d : 999;
        if (d < minD || d > maxD) continue;
        out.push([x, p.altura(x, zz), zz]);
      }
      return out;
    };
    const fator = this.q === 'baixa' ? 0.5 : this.q === 'media' ? 0.8 : 1;
    // geometria com cor por vértice (para pontas de neve, sombra na base)
    const pintar = (geo, fn) => { const ps = geo.attributes.position, c = new Float32Array(ps.count * 3); for (let i = 0; i < ps.count; i++) { const k = fn(ps.getX(i), ps.getY(i), ps.getZ(i)); c.set([k.r, k.g, k.b], i * 3); } geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo; };
    const juntar = (geos0) => {
      const geos = geos0.map((g) => (g.index ? g.toNonIndexed() : g));
      let n = 0; for (const g of geos) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), norm = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3), idx = [];
      let o = 0;
      for (const g0 of geos) {
        const g = g0;
        pos.set(g.attributes.position.array, o * 3); norm.set(g.attributes.normal.array, o * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
        if (g.attributes.color) col.set(g.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + g.attributes.position.count) * 3);
        for (let i = 0; i < g.attributes.position.count; i++) idx.push(o + i);
        o += g.attributes.position.count;
      }
      const r = new THREE.BufferGeometry();
      r.setAttribute('position', new THREE.BufferAttribute(pos, 3)); r.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
      r.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); r.setAttribute('color', new THREE.BufferAttribute(col, 3)); r.setIndex(idx);
      return r;
    };
    const texFolha = tela(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); grao(g, w, h, 4000, ['#9a9a9a', '#ffffff', '#d0d0d0'], 0.7); });
    const nFolha = normalDe(texFolha, 4);
    const matCopa = new THREE.MeshStandardMaterial({ map: texFolha, normalMap: nFolha, vertexColors: true, roughness: 0.9, flatShading: true });
    const matTronco = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
    let copaGeo, troncoGeo, altura = 1;
    const branco = new THREE.Color(0xf4f8ff);
    if (T.arvores === 'pinheiro' || T.arvores === 'abeto') {
      const neve = T.arvores === 'abeto';
      const verde = new THREE.Color(neve ? 0x24452c : 0x2c5a2a), escuro = new THREE.Color(neve ? 0x142a1a : 0x1a3a18);
      const camadas = [[3.0, 4.5, 3.2], [2.4, 4.0, 5.4], [1.7, 3.4, 7.4], [1.0, 2.6, 9.2]].map(([r, h, y]) => {
        const g = new THREE.ConeGeometry(r, h, 8, 1); g.translate(0, y, 0);
        return pintar(g, (x, yy) => { const t = Math.min(1, Math.max(0, (yy - y + h / 2) / h)); const c = escuro.clone().lerp(verde, t); return neve && t > 0.55 ? c.lerp(branco, (t - 0.55) * 2.2) : c; });
      });
      copaGeo = juntar(camadas); troncoGeo = new THREE.CylinderGeometry(0.22, 0.32, 4, 6).translate(0, 2, 0); altura = 1;
    } else if (T.arvores === 'oliveira') {
      const v = new THREE.Color(0x76845a), e2 = new THREE.Color(0x4a5a36);
      copaGeo = juntar([[0, 3.4, 0, 1.9], [1.3, 3.0, 0.6, 1.4], [-1.1, 3.1, -0.7, 1.5], [0.2, 4.2, -0.4, 1.3]].map(([x, y, zz, r]) => pintar(new THREE.IcosahedronGeometry(r, 1).translate(x, y, zz), (_, yy) => e2.clone().lerp(v, Math.min(1, (yy - y + r) / (2 * r))))));
      troncoGeo = new THREE.CylinderGeometry(0.22, 0.38, 3, 6).translate(0, 1.5, 0); matTronco.color.setHex(0x6a5a44);
    } else {
      // palmeira: folhas compridas a cair à volta do topo
      const folhas = [];
      for (let k = 0; k < 9; k++) {
        const g = new THREE.PlaneGeometry(0.9, 4.2, 1, 4);
        const ps = g.attributes.position;
        for (let i = 0; i < ps.count; i++) { const yy = ps.getY(i) + 2.1; ps.setY(i, yy); ps.setZ(i, -(yy * yy) * 0.07); }
        g.rotateX(-Math.PI / 2 + 0.35); g.rotateY((k / 9) * Math.PI * 2); g.translate(0, 7.4, 0); g.computeVertexNormals();
        folhas.push(pintar(g, () => new THREE.Color(0x4f8a3a)));
      }
      copaGeo = juntar(folhas); troncoGeo = new THREE.CylinderGeometry(0.2, 0.3, 7.5, 7).translate(0, 3.75, 0); matTronco.color.setHex(0x8a7454);
      matCopa.side = THREE.DoubleSide; matCopa.flatShading = false;
    }
    const lista = pontos(Math.round(900 * T.densidade * fator), p.meia + 11, 260);
    const tr = new THREE.InstancedMesh(troncoGeo, matTronco, lista.length), cp = new THREE.InstancedMesh(copaGeo, matCopa, lista.length);
    cp.castShadow = this.q !== 'baixa'; tr.castShadow = this.q === 'alta';
    lista.forEach(([x, y, zz], k) => {
      const esc = 0.75 + rnd() * 0.6; q.setFromAxisAngle(eixoY, rnd() * Math.PI * 2);
      sc.set(esc, esc * (0.9 + rnd() * 0.25), esc); e.set(x, y - 0.2, zz); m.compose(e, q, sc);
      tr.setMatrixAt(k, m); cp.setMatrixAt(k, m);
      cp.setColorAt(k, cor.setHSL(0, 0, 0.82 + rnd() * 0.3));
    });
    cena.add(tr, cp);
    // erva junto à estrada (tufos de folhas finas)
    if (T.erva) {
      const tErva = tela(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const x = 6 + Math.random() * 52; g.strokeStyle = ['#cfd8a0', '#a8b870', '#e8e8b8'][i % 3]; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + (Math.random() - 0.5) * 10, h * 0.5, x + (Math.random() - 0.5) * 18, 6 + Math.random() * 24); g.stroke(); } });
      tErva.wrapS = tErva.wrapT = THREE.ClampToEdgeWrapping;
      const planos = [0, 1, 2].map((k) => new THREE.PlaneGeometry(1.1, 0.8).translate(0, 0.4, 0).rotateY((k / 3) * Math.PI));
      const gErva = juntar(planos);
      const nE = Math.round(9000 * fator);
      const erva = new THREE.InstancedMesh(gErva, new THREE.MeshStandardMaterial({ map: tErva, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 }), nE);
      const c1 = new THREE.Color(T.erva[0]), c2 = new THREE.Color(T.erva[1]);
      let k = 0;
      for (let t = 0; t < nE * 3 && k < nE; t++) {
        const s = p.amostras[Math.floor(rnd() * p.N)], lado = rnd() < 0.5 ? -1 : 1;
        const d = p.meia + 1.2 + Math.pow(rnd(), 2) * 30, ao = (rnd() - 0.5) * 2;
        const x = s.x + s.nx * d * lado + s.dx * ao, zz = s.z + s.nz * d * lado + s.dz * ao;
        const r = p.maisPerto(x, zz, 1); if (r && r.d < p.meia + 1) continue;
        const esc = 0.7 + rnd() * 0.9; q.setFromAxisAngle(eixoY, rnd() * 6.28); sc.set(esc, esc * (0.8 + rnd() * 0.6), esc);
        e.set(x, p.altura(x, zz) - 0.05, zz); m.compose(e, q, sc); erva.setMatrixAt(k, m);
        erva.setColorAt(k, cor.copy(c1).lerp(c2, rnd())); k++;
      }
      erva.count = k; cena.add(erva);
    }
    // pedras
    const tPedra = texRocha();
    const pedras = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ map: tPedra, normalMap: normalDe(tPedra, 3), roughness: 0.95, flatShading: true }), 260);
    const lp = pontos(260, p.meia + 8, 200);
    lp.forEach(([x, y, zz], k) => { const esc = 0.4 + Math.pow(rnd(), 2) * 2.2; q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)); sc.set(esc * (1 + rnd()), esc * 0.7, esc * (1 + rnd())); e.set(x, y - esc * 0.2, zz); m.compose(e, q, sc); pedras.setMatrixAt(k, m); pedras.setColorAt(k, cor.setHSL(0.08, 0.05, 0.75 + rnd() * 0.3)); });
    pedras.count = lp.length; pedras.castShadow = this.q === 'alta'; pedras.receiveShadow = true; cena.add(pedras);
    // vinhas em filas (Douro)
    if (T.vinhas) {
      const nv = Math.round(1600 * fator);
      const tV = tela(64, 64, (g, w, h) => { g.fillStyle = '#5a7a2a'; g.fillRect(0, 0, w, h); grao(g, w, h, 1500, ['#3a5a1a', '#7a9a3a', '#4a6a24'], 0.8); });
      const vinha = new THREE.InstancedMesh(new RoundedBoxGeometry(0.8, 1.2, 5, 2, 0.3), new THREE.MeshStandardMaterial({ map: tV, normalMap: normalDe(tV, 5), roughness: 1 }), nv);
      let j = 0;
      for (let tries = 0; tries < nv * 6 && j < nv; tries++) {
        const x = z.minX + 120 + rnd() * (z.maxX - z.minX - 240), zz = z.minZ + 120 + rnd() * (z.maxZ - z.minZ - 240);
        const xr = Math.round(x / 3) * 3;
        const r = p.maisPerto(xr, zz, 2);
        if (r && r.d < p.meia + 9) continue;
        e.set(xr, p.altura(xr, zz) + 0.5, zz); sc.set(1, 1, 1); q.identity(); m.compose(e, q, sc); vinha.setMatrixAt(j++, m);
      }
      vinha.count = j; vinha.castShadow = this.q === 'alta'; cena.add(vinha);
    }
  }
  publico() {
    const p = this.p, A = p.amostras;
    const curvas = A.filter((s, i) => i % 6 === 0 && s.curva > 0.025).slice(0, 18);
    const n = Math.max(1, curvas.length * 14);
    const corpo = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.24, 0.85, 3, 8), new THREE.MeshStandardMaterial({ roughness: 0.9 }), n);
    const cabeca = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd6a27c, roughness: 0.8 }), n);
    const pernas = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.55, 3, 8), new THREE.MeshStandardMaterial({ color: 0x2a3346, roughness: 0.9 }), n);
    const m = new THREE.Matrix4(), c = new THREE.Color();
    const paleta = [0xff7a1a, 0x2f6bff, 0xf4f1e6, 0xd62a1f, 0x1a8a3a, 0xffd34d, 0x6a2aa8, 0x2a2a2a];
    let k = 0;
    for (const s of curvas) {
      const prox = A[(s.i + 5) % p.N], lado = Math.sign((prox.dx - s.dx) * s.nx + (prox.dz - s.dz) * s.nz) || 1;
      for (let j = 0; j < 14; j++) {
        const d = p.meia + 8.5 + (j % 3) * 1.1, ao = (j - 7) * 1.3 + Math.sin(j * 7.3) * 0.4;
        const x = s.x - s.nx * d * lado + s.dx * ao, z = s.z - s.nz * d * lado + s.dz * ao, y = p.altura(x, z);
        m.makeTranslation(x, y + 0.45, z); pernas.setMatrixAt(k, m);
        m.makeTranslation(x, y + 1.2, z); corpo.setMatrixAt(k, m); corpo.setColorAt(k, c.setHex(paleta[(k * 7) % paleta.length]));
        m.makeTranslation(x, y + 1.85, z); cabeca.setMatrixAt(k, m);
        k++;
      }
    }
    for (const o of [corpo, cabeca, pernas]) { o.count = k; o.castShadow = this.q === 'alta'; this.cena.add(o); }
  }
  portico() {
    const s = this.p.amostras[0], meia = this.p.meia;
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x1c2333, roughness: 0.6 });
    for (const l of [1, -1]) { const poste = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), mat); poste.position.set(l * (meia + 1.5), 3.5, 0); poste.castShadow = true; g.add(poste); }
    const faixa = tela(512, 64, (c, w, h) => { c.fillStyle = '#0a1022'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff7a1a'; c.fillRect(0, h - 8, w, 8); c.fillStyle = '#fff'; c.font = 'bold 36px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FabioSilva_TV · RALLY', w / 2, h / 2 - 3); });
    faixa.wrapS = faixa.wrapT = THREE.ClampToEdgeWrapping;
    const banner = new THREE.Mesh(new THREE.BoxGeometry(meia * 2 + 3.5, 1.4, 0.3), new THREE.MeshStandardMaterial({ map: faixa }));
    banner.position.y = 6.6; g.add(banner);
    // linha de xadrez no chão
    const xad = tela(64, 16, (c, w, h) => { for (let x = 0; x < w; x += 8) for (let y = 0; y < h; y += 8) { c.fillStyle = ((x + y) / 8) % 2 ? '#111' : '#fff'; c.fillRect(x, y, 8, 8); } });
    xad.wrapS = xad.wrapT = THREE.ClampToEdgeWrapping;
    const linha = new THREE.Mesh(new THREE.PlaneGeometry(meia * 2, 2), new THREE.MeshStandardMaterial({ map: xad, polygonOffset: true, polygonOffsetFactor: -4 }));
    linha.rotation.x = -Math.PI / 2; linha.position.y = 0.1; g.add(linha);
    g.position.set(s.x, s.y, s.z);
    g.rotation.y = Math.atan2(s.dx, s.dz);
    this.cena.add(g);
  }

  // ── corrida ────────────────────────────────────────────────────────
  prepararCorrida() {
    const p = this.p, A = p.amostras, N = p.N;
    this.carros = [];
    const lista = this.modo === 'relogio' ? [] : RIVAIS;
    const grelha = [...lista.map((r, i) => ({ ...r, i })), { nome: this.nome || 'Tu', cor: 0xff7a1a, num: 1, eu: true, i: lista.length }];
    grelha.forEach((g, k) => {
      const s = A[(N - 6 - k * 5) % N], lado = k % 2 ? -1 : 1;
      const x = s.x + s.nx * 2.8 * lado, z = s.z + s.nz * 2.8 * lado;
      const c = novoCarro(x, z, Math.atan2(s.dx, s.dz));
      c.y = p.altura(x, z); c.idx = s.i; c.volta = -1; c.progresso = -N + s.i;
      Object.assign(c, { nome: g.nome, cor: '#' + new THREE.Color(g.cor).getHexString(), eu: !!g.eu, perfil: { ritmo: g.ritmo || 1, linha: g.linha || 0 }, voltasT: [], inicioVolta: null, fim: null });
      c.obj = criarCarro(g.cor, g.num); this.cena.add(c.obj);
      c.inclina = { x: 0, z: 0 };
      this.carros.push(c);
      if (g.eu) this.eu = c;
    });
    this.contagemAte = agora() + 3600;
    this.inicio = null;
    this.melhorVolta = null;
    this.ultimoCentro = '';
  }
  ligarInput() {
    this.onKey = (e) => {
      const d = e.type === 'keydown';
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      this.teclas[e.code] = d;
      if (!d) return;
      this.motor.ligar();
      if (e.code === 'Escape' || e.code === 'KeyP') this.pausar(this.fase !== 'pausa');
      if (e.code === 'KeyC') this.camModo = (this.camModo + 1) % 2;
      if (e.code === 'KeyR') this.repor(this.eu);
    };
    addEventListener('keydown', this.onKey); addEventListener('keyup', this.onKey);
    this.onBlur = () => { if (this.fase === 'corrida' || this.fase === 'contagem') this.pausar(true); };
    addEventListener('blur', this.onBlur);
    this.raiz.querySelector('#rlPausaBtn').addEventListener('click', () => this.pausar(this.fase !== 'pausa'));
    // botões de toque
    this.el.toque.querySelectorAll('[data-t]').forEach((b) => {
      const k = b.dataset.t;
      const on = (ev) => { ev.preventDefault(); this.motor.ligar(); this.toqueEnt[k] = true; b.classList.add('on'); };
      const off = (ev) => { ev.preventDefault(); this.toqueEnt[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    });
    this.el.canvas.addEventListener('pointerdown', () => this.motor.ligar());
  }
  entradaJogador() {
    const k = this.teclas, t = this.toqueEnt;
    let dir = 0, acel = 0, trava = 0, mao = false;
    if (k.ArrowLeft || k.KeyA || t.esq) dir += 1;
    if (k.ArrowRight || k.KeyD || t.dir) dir -= 1;
    if (k.ArrowUp || k.KeyW || t.acel) acel = 1;
    if (k.ArrowDown || k.KeyS || t.trava) trava = 1;
    if (k.Space || t.mao) mao = true;
    if (this.autoAcel && !trava) acel = 1;
    // comando (gamepad)
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g) : null;
    if (gp) {
      const ax = gp.axes[0] || 0; if (Math.abs(ax) > 0.12) dir = -ax;
      if (gp.buttons[7] && gp.buttons[7].value > 0.05) acel = gp.buttons[7].value;
      if (gp.buttons[6] && gp.buttons[6].value > 0.05) trava = gp.buttons[6].value;
      if (gp.buttons[0] && gp.buttons[0].pressed) mao = true;
    }
    return { dir, acel, trava, mao };
  }
  repor(c) {
    if (!c || this.fase !== 'corrida') return;
    const s = this.p.amostras[c.idx];
    c.x = s.x; c.z = s.z; c.y = s.y + 1; c.vx = c.vz = c.vy = 0; c.rumo = Math.atan2(s.dx, s.dz); c.guinada = 0;
    if (c.eu) this.centro('Reposto na pista', 900);
  }
  pausar(sim) {
    if (this.fase === 'fim') return;
    if (sim && this.fase !== 'pausa') {
      this.faseAntes = this.fase; this.fase = 'pausa'; this.pausaEm = agora();
      this.desenharPainel();
    } else if (!sim && this.fase === 'pausa') {
      const dur = agora() - this.pausaEm;
      if (this.inicio) this.inicio += dur;
      this.contagemAte += dur;
      for (const c of this.carros) if (c.inicioVolta) c.inicioVolta += dur;
      this.fase = this.faseAntes;
      this.el.painel.hidden = true;
    }
  }

  // física a 60 Hz (não pára com a janela em segundo plano; a pausa sim)
  fisica() {
    if (this.fechado) return;
    const t = agora();
    const dt = 1 / 60;
    if (this.fase === 'pausa' || this.fase === 'fim2') return;
    if (this.fase === 'contagem') {
      const resta = this.contagemAte - t;
      const n = Math.ceil(resta / 1000 - 0.6);
      const txt = n >= 1 ? String(n) : 'VAI!';
      if (txt !== this.ultimoCentro) { this.centro(txt, 1000, 'grande'); this.ultimoCentro = txt; this.bip(n >= 1 ? 440 : 880); }
      if (resta <= 600) { this.fase = 'corrida'; this.inicio = t; for (const c of this.carros) c.inicioVolta = null; }
      // motores a aquecer
      return;
    }
    const p = this.p;
    for (const c of this.carros) {
      let ent;
      if (c.eu) ent = c.fim ? { dir: 0, acel: 0, trava: 0.4, mao: false } : this.entradaJogador();
      else {
        ent = pilotoComputador(c, p, c.perfil);
        // um pouco de "elástico": quem vai muito à frente do jogador abranda
        if (this.eu && !c.fim) { const dif = (c.progresso - this.eu.progresso) / p.N; c.multi = dif > 0.25 ? 0.93 : dif < -0.25 ? 1.05 : 1; }
      }
      conduzir(c, ent, p, dt, c.multi || 1);
      const voltaAntes = c.volta;
      seguirProgresso(c, p);
      // passou a meta
      if (c.volta > voltaAntes && c.volta >= 0 && !c.fim) {
        if (c.inicioVolta != null) {
          const tv = t - c.inicioVolta;
          c.voltasT.push(tv);
          if (c.eu) {
            const melhor = this.melhorVolta == null || tv < this.melhorVolta;
            if (melhor) this.melhorVolta = tv;
            if (c.volta < this.voltas) this.centro((melhor && c.voltasT.length > 1 ? 'Melhor volta! ' : 'Volta ') + fmtTempo(tv), 1800);
          }
        }
        c.inicioVolta = t;
        if (c.volta >= this.voltas) { c.fim = t - this.inicio; if (c.eu) this.terminar(); }
      }
    }
    // choques entre carros
    for (let i = 0; i < this.carros.length; i++) for (let j = i + 1; j < this.carros.length; j++) {
      const a = this.carros[i], b = this.carros[j];
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = 4.2;
      if (d >= min || d === 0) continue;
      const nx = dx / d, nz = dz / d, o = (min - d) / 2;
      a.x -= nx * o; a.z -= nz * o; b.x += nx * o; b.z += nz * o;
      const vr = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (vr > 0) { a.vx -= vr * nx * 0.8; a.vz -= vr * nz * 0.8; b.vx += vr * nx * 0.8; b.vz += vr * nz * 0.8; }
    }
    // computador preso? repõe
    for (const c of this.carros) {
      if (c.eu) continue;
      if (c.vel < 2) { c.parado = (c.parado || 0) + dt; if (c.parado > 3) { this.repor(c); c.parado = 0; } } else c.parado = 0;
    }
    if (this.fase === 'fim' && t - this.fimEm > 3500) { this.fase = 'fim2'; this.desenharPainel(); }
  }
  terminar() {
    this.fase = 'fim'; this.fimEm = agora();
    const pos = this.posicao();
    this.centro(this.modo === 'relogio' ? 'Tempo: ' + fmtTempo(this.eu.fim) : (pos === 1 ? 'Vitória!' : pos + '.º lugar'), 3200, 'grande');
    this.bip(660); setTimeout(() => this.bip(990), 180);
    if (this.aoFim) this.aoFim({ pista: this.def.id, modo: this.modo, total: this.eu.fim, melhorVolta: this.melhorVolta, posicao: pos });
  }
  posicao() {
    const ord = [...this.carros].sort((a, b) => (a.fim != null && b.fim != null ? a.fim - b.fim : a.fim != null ? -1 : b.fim != null ? 1 : b.progresso - a.progresso));
    return ord.indexOf(this.eu) + 1;
  }
  bip(f) {
    const c = this.motor.ctx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.12 * this.motor.vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.26);
  }

  // ── desenho ────────────────────────────────────────────────────────
  loop() {
    if (this.fechado) return;
    this.raf = requestAnimationFrame(this.loop);
    const t = agora(), dtReal = Math.min(0.5, (t - this.ultimo) / 1000), dt = Math.min(0.05, dtReal);
    this.ultimo = t;
    const p = this.p;
    for (const c of this.carros) {
      const o = c.obj;
      o.position.set(c.x, c.y, c.z);
      o.rotation.order = 'YXZ';
      o.rotation.y = c.rumo;
      // inclinação seguindo o chão
      const fx = Math.sin(c.rumo), fz = Math.cos(c.rumo), rx = Math.cos(c.rumo), rz = -Math.sin(c.rumo);
      if (!c.noAr) {
        const hF = p.altura(c.x + fx * 1.6, c.z + fz * 1.6), hT = p.altura(c.x - fx * 1.6, c.z - fz * 1.6);
        const hE = p.altura(c.x + rx, c.z + rz), hD = p.altura(c.x - rx, c.z - rz);
        c.inclina.x += (-Math.atan2(hF - hT, 3.2) - c.inclina.x) * Math.min(1, dt * 10);
        c.inclina.z += (Math.atan2(hE - hD, 2) - c.inclina.z) * Math.min(1, dt * 10);
      }
      // a carroçaria inclina para fora nas curvas
      o.rotation.x = c.inclina.x;
      o.rotation.z = c.inclina.z;
      o.userData.corpo.rotation.z = -c.guinada * 0.05 * Math.min(1, c.vel / 20);
      for (const r of o.userData.rodas) {
        r.r.rotation.x += (c.vx * fx + c.vz * fz) * dt / 0.36;
        if (r.frente) r.piv.rotation.y = Math.max(-0.45, Math.min(0.45, c.guinada * 0.35));
      }
      // poeira
      if (c.vel > 7 && !c.noAr && (c.piso !== 'asfalto' || c.derrapa > 0.35) && Math.random() < 0.6) this.soltarPoeira(c);
    }
    this.atualizarPoeira(dt);
    if (this.flocos) { this.flocos.position.set(this.eu.x, this.eu.y, this.eu.z); const a = this.flocos.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * 4; if (y < 0) y += 40; a.setY(i, y); } a.needsUpdate = true; }
    this.atualizarCamera(dtReal);
    const e = this.eu;
    this.sol.position.set(e.x + this.solDir.x * 200, e.y + this.solDir.y * 200, e.z + this.solDir.z * 200);
    this.sol.target.position.set(e.x, e.y, e.z);
    this.ceu.position.copy(this.camera.position);
    if (this.ondas) this.ondas.offset.set(t * 0.00002, t * 0.000013);
    if (this.comp) this.comp.render(); else this.renderer.render(this.cena, this.camera);
    this.atualizarHud(t);
    if (this.fase === 'corrida' || this.fase === 'contagem') this.motor.atualizar(e.vel, this.entradaJogador().acel > 0, e.derrapa, e.piso);
    else this.motor.atualizar(0, false, 0, 'asfalto');
  }
  soltarPoeira(c) {
    const q = this.poeira.find((x) => x.vida <= 0); if (!q) return;
    const fx = Math.sin(c.rumo), fz = Math.cos(c.rumo), lado = Math.random() < 0.5 ? -0.9 : 0.9;
    q.s.position.set(c.x - fx * 1.9 + Math.cos(c.rumo) * lado, c.y + 0.3, c.z - fz * 1.9 - Math.sin(c.rumo) * lado);
    q.s.material.color.setHex((PISOS[c.piso] || PISOS.terra).poeira);
    q.vida = 1; q.s.visible = true; q.v = [(Math.random() - 0.5) * 2 - c.vx * 0.1, 1 + Math.random(), (Math.random() - 0.5) * 2 - c.vz * 0.1];
    q.max = c.piso === 'asfalto' ? 0.35 : c.piso === 'neve' ? 0.8 : 0.6;
  }
  atualizarPoeira(dt) {
    for (const q of this.poeira) {
      if (q.vida <= 0) continue;
      q.vida -= dt * 0.9;
      if (q.vida <= 0) { q.s.visible = false; continue; }
      q.s.position.x += q.v[0] * dt; q.s.position.y += q.v[1] * dt; q.s.position.z += q.v[2] * dt;
      const k = 1 - q.vida; q.s.scale.setScalar(1 + k * 5);
      q.s.material.opacity = q.vida * q.max;
    }
  }
  atualizarCamera(dt) {
    const c = this.eu, cam = this.camera;
    const fx = Math.sin(c.rumo), fz = Math.cos(c.rumo);
    if (this.camModo === 1) {
      cam.position.set(c.x + fx * 0.4, c.y + 1.25, c.z + fz * 0.4);
      cam.lookAt(c.x + fx * 20, c.y + 1.0, c.z + fz * 20);
    } else {
      // atrás do carro, segue a direção do movimento quando derrapa
      const dir = c.vel > 4 ? Math.atan2(c.vx, c.vz) : c.rumo;
      if (this.camRumo == null) this.camRumo = c.rumo;
      let d = (c.vel > 4 ? dir * 0.35 + c.rumo * 0.65 : c.rumo) - this.camRumo;
      while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      this.camRumo += d * (1 - Math.exp(-dt * 4));
      const dist = 5.6 + c.vel * 0.025, alt = 2.15;
      const alvo = new THREE.Vector3(c.x - Math.sin(this.camRumo) * dist, 0, c.z - Math.cos(this.camRumo) * dist);
      alvo.y = Math.max(c.y + alt, this.p.altura(alvo.x, alvo.z) + 1.2);
      if (this.camPos == null) this.camPos = alvo.clone();
      this.camPos.lerp(alvo, 1 - Math.exp(-dt * 7));
      cam.position.copy(this.camPos);
      cam.lookAt(c.x + fx * 5, c.y + 1.25, c.z + fz * 5);
    }
    cam.fov = 66 + Math.min(14, c.vel * 0.25);
    cam.updateProjectionMatrix();
  }

  desenharMapaBase() {
    const A = this.p.amostras;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const s of A) { minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x); minZ = Math.min(minZ, s.z); maxZ = Math.max(maxZ, s.z); }
    const esc = 150 / Math.max(maxX - minX, maxZ - minZ);
    this.mapaT = (x, z) => [15 + (x - minX) * esc + (150 - (maxX - minX) * esc) / 2, 165 - ((z - minZ) * esc + (150 - (maxZ - minZ) * esc) / 2)];
    const c = document.createElement('canvas'); c.width = c.height = 180;
    const g = c.getContext('2d');
    g.lineJoin = 'round'; g.strokeStyle = 'rgba(10,16,34,.75)'; g.lineWidth = 9;
    const traco = () => { g.beginPath(); A.forEach((s, i) => { const [x, y] = this.mapaT(s.x, s.z); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); };
    traco(); g.strokeStyle = '#f5f7ff'; g.lineWidth = 3.5; traco();
    const [sx, sy] = this.mapaT(A[0].x, A[0].z); g.fillStyle = '#ffd34d'; g.fillRect(sx - 3, sy - 3, 6, 6);
    this.mapaBase = c;
  }
  atualizarHud(t) {
    const e = this.eu, el = this.el;
    el.vel.textContent = Math.round(e.vel * 3.6);
    const kmh = e.vel * 3.6, lim = [0, 45, 80, 115, 150, 999]; let m = 0; while (kmh > lim[m + 1]) m++;
    el.mud.textContent = e.vx * Math.sin(e.rumo) + e.vz * Math.cos(e.rumo) < -1 ? 'R' : m + 1;
    el.barra.style.width = Math.min(100, kmh / 1.9) + '%';
    el.volta.textContent = Math.max(1, Math.min(this.voltas, e.volta + 1));
    if (this.inicio) {
      el.total.textContent = fmtTempo((e.fim != null ? e.fim : t - this.inicio));
      el.tvolta.textContent = e.fim != null ? '—' : fmtTempo(e.inicioVolta ? t - e.inicioVolta : t - this.inicio);
    }
    el.melhor.textContent = fmtTempo(this.melhorVolta);
    if (this.modo !== 'relogio') { el.pos.textContent = this.posicao(); el.posDe.textContent = '/' + this.carros.length; }
    el.aviso.hidden = !(e.contraMao && this.fase === 'corrida');
    const nomes = { asfalto: 'Asfalto', terra: 'Terra', lama: 'Lama', neve: 'Neve', areia: 'Areia', fora: 'Fora da pista' };
    el.piso.textContent = nomes[e.piso] || '';
    el.piso.className = 'rl-piso ' + e.piso;
    // mini-mapa
    const g = el.mapa.getContext('2d');
    g.clearRect(0, 0, 180, 180); g.drawImage(this.mapaBase, 0, 0);
    for (const c of this.carros) {
      const [x, y] = this.mapaT(c.x, c.z);
      g.fillStyle = c.cor;
      g.beginPath(); g.arc(x, y, c.eu ? 5.5 : 4, 0, 7); g.fill();
      g.strokeStyle = '#0a1022'; g.lineWidth = 1.5; g.stroke();
    }
    if (this.centroAte && t > this.centroAte) { el.centro.className = 'rl-centro'; this.centroAte = 0; }
  }
  centro(txt, ms, cls) {
    const c = this.el.centro;
    c.textContent = txt; c.className = 'rl-centro ver ' + (cls || '');
    this.centroAte = agora() + ms;
  }
  desenharPainel() {
    const p = this.el.painel;
    p.hidden = false;
    if (this.fase === 'pausa') {
      p.innerHTML = '<div class="rl-caixa"><h2>Pausa</h2><p>' + esc(this.def.nome) + ' · ' + (this.modo === 'relogio' ? 'contra-relógio' : 'corrida') + '</p>' +
        '<div class="rl-acoes"><button class="btn-primary" data-ac="continuar">Continuar</button><button class="btn-ghost" data-ac="recomecar">Recomeçar</button><button class="btn-ghost" data-ac="sair">Sair</button></div>' +
        '<label class="rl-op">Volume <input type="range" min="0" max="1" step="0.05" value="' + this.motor.vol + '" data-op="vol"></label>' +
        '<label class="rl-op">Gráficos <select data-op="graf">' + Object.entries(NOMES_QUALIDADE).map(([k, n]) => '<option value="' + k + '"' + (k === this.q ? ' selected' : '') + '>' + n + '</option>').join('') + '</select> <small>(aplica na próxima corrida)</small></label>' +
        (this.toque ? '<label class="rl-op"><input type="checkbox" data-op="auto"' + (this.autoAcel ? ' checked' : '') + '> Acelerar sozinho</label>' : '') +
        '<p class="rl-teclas"><b>↑/W</b> acelerar · <b>↓/S</b> travar e marcha-atrás · <b>←→/A D</b> virar · <b>Espaço</b> travão de mão · <b>C</b> câmara · <b>R</b> voltar à pista · <b>Esc</b> pausa. Também dá com comando (gamepad).</p></div>';
    } else {
      const ord = [...this.carros].sort((a, b) => (a.fim != null && b.fim != null ? a.fim - b.fim : a.fim != null ? -1 : b.fim != null ? 1 : b.progresso - a.progresso));
      const linhas = ord.map((c, i) => '<tr class="' + (c.eu ? 'eu' : '') + '"><td>' + (i + 1) + '.º</td><td>' + esc(c.nome) + '</td><td>' + (c.fim != null ? fmtTempo(c.fim) : 'a correr…') + '</td><td>' + fmtTempo(c.voltasT.length ? Math.min(...c.voltasT) : null) + '</td></tr>').join('');
      p.innerHTML = '<div class="rl-caixa"><h2>' + (this.modo === 'relogio' ? 'Tempo final' : this.posicao() === 1 ? 'Vitória!' : this.posicao() + '.º lugar') + '</h2>' +
        '<p>' + esc(this.def.nome) + ' · ' + this.voltas + ' voltas · melhor volta <b>' + fmtTempo(this.melhorVolta) + '</b></p>' +
        '<p class="rl-recorde" id="rlRecorde">' + (this.msgRecorde || '') + '</p>' +
        '<table class="rl-tab"><thead><tr><th></th><th>Piloto</th><th>Total</th><th>Melhor volta</th></tr></thead><tbody>' + linhas + '</tbody></table>' +
        '<div class="rl-acoes"><button class="btn-primary" data-ac="recomecar">Correr outra vez</button><button class="btn-ghost" data-ac="sair">Escolher outra pista</button></div></div>';
    }
    p.querySelectorAll('[data-ac]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.ac;
      if (a === 'continuar') this.pausar(false);
      else if (a === 'sair') this.sair();
      else if (a === 'recomecar') this.recomecar();
    }));
    p.querySelectorAll('[data-op]').forEach((i) => i.addEventListener('input', () => {
      if (i.dataset.op === 'graf') { definirQualidade(i.value); return; }
      if (i.dataset.op === 'vol') { this.motor.vol = +i.value; localStorage.setItem('rally_vol', i.value); if (this.motor.mestre) this.motor.mestre.gain.value = this.motor.vol; }
      else this.autoAcel = i.checked;
    }));
  }
  mostrarRecorde(txt) { this.msgRecorde = txt; const e = this.raiz.querySelector('#rlRecorde'); if (e) e.textContent = txt; }
  recomecar() {
    for (const c of this.carros) this.cena.remove(c.obj);
    this.el.painel.hidden = true;
    this.msgRecorde = '';
    this.fase = 'contagem';
    this.ultimoCentro = '';
    this.camPos = null; this.camRumo = null;
    this.prepararCorrida();
  }
  sair() {
    if (this.fechado) return;
    this.fechado = true;
    cancelAnimationFrame(this.raf); this.pararRelogio();
    removeEventListener('keydown', this.onKey); removeEventListener('keyup', this.onKey);
    removeEventListener('blur', this.onBlur); removeEventListener('resize', this.redim);
    this.motor.calar();
    this.renderer.dispose();
    this.raiz.innerHTML = ''; this.raiz.classList.remove('rl-raiz', 'toque');
    if (this.aoSair) this.aoSair();
  }
}
