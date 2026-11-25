// Rally — o jogo em 3D: cenário, carros, câmara, adversários, voltas e HUD.
import * as THREE from '../arena/three.module.min.js';
import { PISTAS, PISOS, construirPista, novoCarro, conduzir, seguirProgresso, pilotoComputador } from './pistas.js?v=1';

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
  return tela(256, 256, (g, w, h) => {
    const t = { erva: ['#4f7a34', ['#3e6528', '#63903f', '#2f5220']], erva_seca: ['#9a8a4a', ['#7a6a34', '#b8a462', '#6a8a3a']], neve: ['#eef3fb', ['#ffffff', '#d4ddee']], areia_fora: ['#d8c08a', ['#c4a870', '#ecdcae']] }[tipo] || ['#4f7a34', ['#3e6528']];
    g.fillStyle = t[0]; g.fillRect(0, 0, w, h);
    grao(g, w, h, 9000, t[1], 0.5);
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
  const pintura = new THREE.MeshStandardMaterial({ map: texCarro(cor, num), roughness: 0.35, metalness: 0.4 });
  const liso = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.35, metalness: 0.4 });
  const vidro = new THREE.MeshStandardMaterial({ color: 0x111824, roughness: 0.15, metalness: 0.6 });
  const preto = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.8 });
  const corpo = new THREE.Group(); g.add(corpo);
  const carro = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.62, 4.1), [pintura, pintura, liso, liso, liso, liso]);
  carro.position.y = 0.62;
  const cabine = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.0), [vidro, vidro, liso, liso, vidro, vidro]);
  cabine.position.set(0, 1.18, -0.25);
  const aileron = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.45), preto); aileron.position.set(0, 1.42, -1.85);
  const suporte = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.1), preto); suporte.position.set(0, 1.18, -1.85);
  const farois = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff4d0 })); farois.position.set(0, 0.7, 2.06);
  for (const m of [carro, cabine, aileron, suporte]) { m.castShadow = true; corpo.add(m); }
  corpo.add(farois);
  const rodas = [];
  const geoR = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 14); geoR.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.92, 1.35], [0.92, 1.35], [-0.92, -1.35], [0.92, -1.35]]) {
    const piv = new THREE.Group(); piv.position.set(x, 0.36, z);
    const r = new THREE.Mesh(geoR, preto); r.castShadow = true;
    const jante = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc8ccd6, metalness: 0.8, roughness: 0.3 }));
    r.add(jante); piv.add(r); g.add(piv); rodas.push({ piv, r, frente: z > 0 });
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.toque ? 1.25 : 1.5));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    this.renderer = renderer;
    const T = this.def.tema, p = this.p;
    const cena = new THREE.Scene(); this.cena = cena;
    cena.fog = new THREE.Fog(T.nevoeiro[0], T.nevoeiro[1], T.nevoeiro[2]);
    // céu
    const ceuT = tela(16, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); for (const [c, pos] of T.ceu) gr.addColorStop(pos, c); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    ceuT.wrapS = ceuT.wrapT = THREE.ClampToEdgeWrapping;
    this.ceu = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 16), new THREE.MeshBasicMaterial({ map: ceuT, side: THREE.BackSide, fog: false, depthWrite: false }));
    cena.add(this.ceu);
    cena.add(new THREE.HemisphereLight(T.hemi[0], T.hemi[1], T.hemi[2]));
    const sol = new THREE.DirectionalLight(T.sol[0], T.sol[1]);
    sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 500 });
    sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.03;
    this.sol = sol; this.solDir = new THREE.Vector3(...T.sol[2]).normalize();
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
    const tChao = texChao(T.fora); tChao.repeat.set(nx * passo / 18, nz * passo / 18);
    const terreno = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tChao, vertexColors: true, roughness: 1 }));
    terreno.receiveShadow = true;
    cena.add(terreno);
    if (T.mar) {
      const mar = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: 0x1a5a8a, roughness: 0.2, metalness: 0.5 }));
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
      if (!texs[piso]) texs[piso] = new THREE.MeshStandardMaterial({ map: texEstrada(piso), roughness: piso === 'neve' ? 0.6 : 0.95, polygonOffset: true, polygonOffsetFactor: -2 });
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
    // montanhas ao longe
    const mont = new THREE.MeshStandardMaterial({ color: T.neve ? 0xdfe6f2 : T.mar ? 0xc8a878 : 0x6a7a5a, roughness: 1, flatShading: true });
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2, r = 1100 + (i % 3) * 120;
      const h = 160 + ((i * 37) % 7) * 40;
      const mm = new THREE.Mesh(new THREE.ConeGeometry(260 + (i % 4) * 60, h, 6), mont);
      mm.position.set(cx + Math.cos(a) * r, h / 2 - 30, cz + Math.sin(a) * r); cena.add(mm);
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
    };
    addEventListener('resize', this.redim); this.redim();
    this.desenharMapaBase();
  }

  plantar(T) {
    const p = this.p, z = this.zona;
    const n = Math.round(900 * T.densidade);
    const tipos = {
      pinheiro: { tronco: [0.25, 3, 0x5a4030], copa: new THREE.ConeGeometry(2.4, 7, 7), cor: 0x2f5a2f, y: 5.5 },
      abeto: { tronco: [0.25, 2, 0x4a3a2a], copa: new THREE.ConeGeometry(2.2, 7.5, 7), cor: 0xe8eef8, y: 5.2 },
      oliveira: { tronco: [0.3, 2, 0x6a5a40], copa: new THREE.SphereGeometry(2.3, 7, 5), cor: 0x7a8a5a, y: 3.2 },
      palmeira: { tronco: [0.25, 7, 0x8a7050], copa: new THREE.ConeGeometry(3, 1.6, 7), cor: 0x4a8a3a, y: 7.6 },
    };
    const t = tipos[T.arvores] || tipos.pinheiro;
    const tronco = new THREE.InstancedMesh(new THREE.CylinderGeometry(t.tronco[0], t.tronco[0] * 1.3, t.tronco[1], 6), new THREE.MeshStandardMaterial({ color: t.tronco[2], roughness: 1 }), n);
    const copa = new THREE.InstancedMesh(t.copa, new THREE.MeshStandardMaterial({ color: t.cor, roughness: 1, flatShading: true }), n);
    copa.castShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Vector3(), sc = new THREE.Vector3();
    let k = 0, tent = 0;
    let s = 12345;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    while (k < n && tent++ < n * 8) {
      const x = z.minX + 100 + rnd() * (z.maxX - z.minX - 200), zz = z.minZ + 100 + rnd() * (z.maxZ - z.minZ - 200);
      const r = p.maisPerto(x, zz, 2);
      if (r && r.d < p.meia + 11) continue;
      const y = p.altura(x, zz), esc = 0.8 + rnd() * 0.5;
      sc.set(esc, esc, esc); e.set(x, y + (t.tronco[1] / 2) * esc, zz);
      m.compose(e, q, sc); tronco.setMatrixAt(k, m);
      e.set(x, y + t.y * esc, zz); m.compose(e, q, sc); copa.setMatrixAt(k, m);
      k++;
    }
    tronco.count = copa.count = k;
    this.cena.add(tronco, copa);
    // vinhas em filas (Douro)
    if (T.vinhas) {
      const nv = 1400, vinha = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 1.1, 5), new THREE.MeshStandardMaterial({ color: 0x5a7a2a, roughness: 1 }), nv);
      let j = 0;
      for (let tries = 0; tries < nv * 6 && j < nv; tries++) {
        const x = z.minX + 120 + rnd() * (z.maxX - z.minX - 240), zz = z.minZ + 120 + rnd() * (z.maxZ - z.minZ - 240);
        const xr = Math.round(x / 3) * 3;
        const r = p.maisPerto(xr, zz, 2);
        if (r && r.d < p.meia + 9) continue;
        e.set(xr, p.altura(xr, zz) + 0.55, zz); sc.set(1, 1, 1); m.compose(e, q, sc); vinha.setMatrixAt(j++, m);
      }
      vinha.count = j; this.cena.add(vinha);
    }
  }
  publico() {
    const p = this.p, A = p.amostras;
    const curvas = A.filter((s, i) => i % 6 === 0 && s.curva > 0.025).slice(0, 18);
    const n = curvas.length * 14;
    const pessoas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1.7, 0.4), new THREE.MeshStandardMaterial({ roughness: 1 }), Math.max(1, n));
    const m = new THREE.Matrix4(), c = new THREE.Color();
    const paleta = [0xff7a1a, 0x2f6bff, 0xf4f1e6, 0xd62a1f, 0x1a8a3a, 0xffd34d, 0x6a2aa8];
    let k = 0;
    for (const s of curvas) {
      // lado de fora da curva
      const prox = A[(s.i + 5) % p.N], lado = Math.sign((prox.dx - s.dx) * s.nx + (prox.dz - s.dz) * s.nz) || 1;
      for (let j = 0; j < 14; j++) {
        const d = p.meia + 8.5 + (j % 3) * 1.1, ao = (j - 7) * 1.3;
        const x = s.x - s.nx * d * lado + s.dx * ao, z = s.z - s.nz * d * lado + s.dz * ao;
        m.makeTranslation(x, p.altura(x, z) + 0.85, z);
        pessoas.setMatrixAt(k, m); pessoas.setColorAt(k, c.setHex(paleta[(k * 7) % paleta.length])); k++;
      }
    }
    pessoas.count = k; this.cena.add(pessoas);
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
    const t = agora(), dt = Math.min(0.05, (t - this.ultimo) / 1000);
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
    this.atualizarCamera(dt);
    const e = this.eu;
    this.sol.position.set(e.x + this.solDir.x * 200, e.y + this.solDir.y * 200, e.z + this.solDir.z * 200);
    this.sol.target.position.set(e.x, e.y, e.z);
    this.ceu.position.copy(this.camera.position);
    this.renderer.render(this.cena, this.camera);
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
      this.camRumo += d * Math.min(1, dt * 4);
      const dist = 5.6 + c.vel * 0.025, alt = 2.15;
      const alvo = new THREE.Vector3(c.x - Math.sin(this.camRumo) * dist, 0, c.z - Math.cos(this.camRumo) * dist);
      alvo.y = Math.max(c.y + alt, this.p.altura(alvo.x, alvo.z) + 1.2);
      if (this.camPos == null) this.camPos = alvo.clone();
      this.camPos.lerp(alvo, Math.min(1, dt * 7));
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
