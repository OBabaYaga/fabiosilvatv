// Arena 4v4 — tudo o que se vê: mapa, céu, bonecos, armas e efeitos.
import * as THREE from './three.module.min.js';
import { CAIXAS, LIMITES, ALTURA } from './mapa.js';

export const CORES = { L: 0xff7a1a, A: 0x3d8bff };

// ── texturas desenhadas em canvas (nada vem de fora) ─────────────────
function tela(w, h, desenhar) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  desenhar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function ruido(g, w, h, n, a, cor) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cor(Math.random());
    g.globalAlpha = a * Math.random();
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  g.globalAlpha = 1;
}
const TEX = {};
function texturas() {
  if (TEX.betao) return TEX;
  TEX.betao = tela(256, 256, (g, w, h) => {
    g.fillStyle = '#8a8f99'; g.fillRect(0, 0, w, h);
    ruido(g, w, h, 4000, 0.35, (r) => (r > 0.5 ? '#6c717c' : '#a3a8b2'));
    g.strokeStyle = 'rgba(40,44,52,.35)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  });
  TEX.chao = tela(512, 512, (g, w, h) => {
    g.fillStyle = '#4b505b'; g.fillRect(0, 0, w, h);
    ruido(g, w, h, 12000, 0.3, (r) => (r > 0.5 ? '#3d424c' : '#5a606c'));
    g.strokeStyle = 'rgba(25,28,34,.5)'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
    g.fillStyle = 'rgba(255,211,77,.55)'; g.fillRect(w / 2 - 6, 0, 12, h * 0.18); g.fillRect(w / 2 - 6, h * 0.5, 12, h * 0.18);
  });
  const contentor = (base, escuro) => tela(256, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { g.fillStyle = escuro; g.fillRect(x, 0, 6, h); }
    ruido(g, w, h, 1500, 0.25, () => '#000');
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
  });
  TEX.cont_laranja = contentor('#d9631a', '#b44e10');
  TEX.cont_azul = contentor('#1f3c78', '#162c5a');
  TEX.caixote = tela(128, 128, (g, w, h) => {
    g.fillStyle = '#a5773f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7d5629';
    for (let y = 0; y < h; y += 21) g.fillRect(0, y, w, 3);
    g.lineWidth = 10; g.strokeStyle = '#6b4721'; g.strokeRect(5, 5, w - 10, h - 10);
    g.beginPath(); g.moveTo(8, 8); g.lineTo(w - 8, h - 8); g.stroke();
    ruido(g, w, h, 800, 0.2, () => '#3b2611');
  });
  TEX.muro = tela(256, 256, (g, w, h) => {
    g.fillStyle = '#5c6270'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(30,33,40,.55)'; g.lineWidth = 2;
    for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
    ruido(g, w, h, 3000, 0.25, (r) => (r > 0.5 ? '#4a4f5a' : '#717784'));
  });
  TEX.armazem = tela(256, 256, (g, w, h) => {
    g.fillStyle = '#9aa1ad'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 12) { g.fillStyle = 'rgba(60,65,75,.35)'; g.fillRect(x, 0, 3, h); }
    g.fillStyle = 'rgba(255,122,26,.85)'; g.fillRect(0, h - 26, w, 12);
    ruido(g, w, h, 2000, 0.2, () => '#333');
  });
  TEX.pilar = TEX.betao;
  return TEX;
}

// ── céu "After Work": pôr do sol laranja a cair para azul-noite ─────
function ceu() {
  const t = tela(16, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#141d3f'); gr.addColorStop(0.4, '#2a3770'); gr.addColorStop(0.72, '#7a3b4a'); gr.addColorStop(0.86, '#ff7a1a'); gr.addColorStop(1, '#ffd34d');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false });
  const s = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), m);
  return s;
}

export function criarCena(renderer) {
  texturas();
  const cena = new THREE.Scene();
  cena.fog = new THREE.Fog(0x2a2440, 45, 140);
  cena.add(ceu());

  cena.add(new THREE.HemisphereLight(0xffd2aa, 0x2a3770, 1.4));
  const sol = new THREE.DirectionalLight(0xffb070, 2.2);
  sol.position.set(-40, 35, 18);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -45, right: 45, top: 32, bottom: -32, near: 5, far: 120 });
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.02;
  cena.add(sol);
  cena.add(new THREE.AmbientLight(0x404a70, 0.35));

  // chão
  const tc = TEX.chao.clone(); tc.needsUpdate = true; tc.repeat.set(LIMITES.x / 4, LIMITES.z / 4);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(LIMITES.x * 2 + 2, LIMITES.z * 2 + 2), new THREE.MeshStandardMaterial({ map: tc, roughness: 0.95 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  cena.add(chao);
  // água para lá dos muros (é um porto)
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x1b2a4a, roughness: 0.25, metalness: 0.6 }));
  agua.rotation.x = -Math.PI / 2; agua.position.y = -0.6;
  cena.add(agua);

  // caixas do mapa
  const mats = {};
  const mat = (tipo, w, h) => {
    const t = TEX[tipo] || TEX.betao;
    const k = tipo + ':' + w.toFixed(1) + ':' + h.toFixed(1);
    if (!mats[k]) {
      const tx = t.clone(); tx.needsUpdate = true;
      const esc = tipo.startsWith('cont') ? [w / 6.5, 1] : tipo === 'caixote' ? [1, 1] : [w / 4, h / 4];
      tx.repeat.set(Math.max(0.5, esc[0]), Math.max(0.5, esc[1]));
      mats[k] = new THREE.MeshStandardMaterial({ map: tx, roughness: tipo.startsWith('cont') ? 0.6 : 0.9, metalness: tipo.startsWith('cont') ? 0.3 : 0 });
    }
    return mats[k];
  };
  for (const c of CAIXAS) {
    const w = c.max[0] - c.min[0], h = c.max[1] - c.min[1], d = c.max[2] - c.min[2];
    const lado = Math.max(w, d);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c.tipo, lado, h));
    m.position.set((c.min[0] + c.max[0]) / 2, (c.min[1] + c.max[1]) / 2, (c.min[2] + c.max[2]) / 2);
    m.castShadow = c.tipo !== 'muro' || h < 6;
    m.receiveShadow = true;
    cena.add(m);
  }

  // gruas e candeeiros (só decoração, fora da zona de jogo)
  const ferro = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, metalness: 0.4 });
  for (const [x, z] of [[-20, 30], [18, 31], [0, -32]]) {
    const g = new THREE.Group();
    const torre = new THREE.Mesh(new THREE.BoxGeometry(1.2, 22, 1.2), ferro); torre.position.y = 11; g.add(torre);
    const braco = new THREE.Mesh(new THREE.BoxGeometry(18, 0.9, 0.9), ferro); braco.position.set(5, 21.5, 0); g.add(braco);
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * Math.PI;
    cena.add(g);
  }
  const luzMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  for (const [x, z] of [[-22, 0], [22, 0], [0, 10.5], [0, -10.5]]) {
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0x222833 }));
    poste.position.set(x, 3, z); cena.add(poste);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.3), luzMat); lamp.position.set(x, 6, z); cena.add(lamp);
    const pl = new THREE.PointLight(0xffc070, 6, 14, 1.6); pl.position.set(x, 5.7, z); cena.add(pl);
  }
  return cena;
}

// ── boneco de um jogador ─────────────────────────────────────────────
export function criarBoneco(equipa, nome) {
  const cor = new THREE.Color(CORES[equipa]);
  const pele = new THREE.MeshStandardMaterial({ color: 0xd8a27a, roughness: 0.8 });
  const roupa = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.7 });
  const escuro = new THREE.MeshStandardMaterial({ color: 0x1c2333, roughness: 0.8 });
  const g = new THREE.Group();
  const corpo = new THREE.Group(); g.add(corpo);
  const pernaE = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.26), escuro); pernaE.position.set(-0.13, 0.4, 0);
  const pernaD = pernaE.clone(); pernaD.position.x = 0.13;
  const tronco = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.68, 0.32), roupa); tronco.position.y = 1.15;
  const colete = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.36), escuro); colete.position.y = 1.2;
  const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), pele); cabeca.position.y = 1.66;
  const gorro = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), roupa); gorro.position.y = 1.8;
  const bracoE = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.55), roupa); bracoE.position.set(-0.22, 1.3, -0.28);
  const bracoD = bracoE.clone(); bracoD.position.x = 0.22;
  const arma = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.8), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.4 }));
  arma.position.set(0.12, 1.32, -0.6);
  for (const m of [pernaE, pernaD, tronco, colete, cabeca, gorro, bracoE, bracoD, arma]) { m.castShadow = true; corpo.add(m); }
  g.userData = { corpo, pernaE, pernaD, cabeca, arma, nome, equipa };
  // nome por cima
  const etiqueta = criarEtiqueta(nome, equipa);
  etiqueta.position.y = 2.25;
  g.add(etiqueta);
  g.userData.etiqueta = etiqueta;
  return g;
}

function criarEtiqueta(texto, equipa) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = '600 30px Sora, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(texto.slice(0, 16), 128, 32);
  g.fillStyle = equipa === 'L' ? '#ffb27a' : '#9cc4ff'; g.fillText(texto.slice(0, 16), 128, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(1.6, 0.4, 1);
  s.renderOrder = 10;
  return s;
}

// Põe o boneco na posição/pose certa
export function poseBoneco(b, p, yaw, agachado, vivo, tAnim, aMexer) {
  b.position.set(p[0], p[1], p[2]);
  b.rotation.y = yaw;
  const u = b.userData;
  if (!vivo) {
    u.corpo.rotation.x = -Math.PI / 2; u.corpo.position.y = 0.2;
    u.etiqueta.visible = false;
    return;
  }
  u.corpo.rotation.x = 0;
  const esc = agachado ? ALTURA.agachado / ALTURA.pe : 1;
  u.corpo.scale.y = esc; u.corpo.position.y = 0;
  const balanco = aMexer ? Math.sin(tAnim * 10) * 0.5 : 0;
  u.pernaE.rotation.x = balanco; u.pernaD.rotation.x = -balanco;
}

// ── arma na primeira pessoa ──────────────────────────────────────────
export function criarArmaFP() {
  const grupo = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x3b4356, metalness: 0.45, roughness: 0.4 });
  const detalhe = new THREE.MeshStandardMaterial({ color: 0xff7a1a, metalness: 0.3, roughness: 0.5 });
  const luva = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.9 });
  const fazer = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };

  const rifle = new THREE.Group();
  rifle.add(fazer(new THREE.BoxGeometry(0.07, 0.1, 0.62), metal, 0, 0, -0.25));
  rifle.add(fazer(new THREE.BoxGeometry(0.035, 0.035, 0.32), metal, 0, 0.02, -0.7));
  rifle.add(fazer(new THREE.BoxGeometry(0.05, 0.16, 0.08), metal, 0, -0.12, -0.28));
  rifle.add(fazer(new THREE.BoxGeometry(0.06, 0.12, 0.06), metal, 0, -0.09, -0.05));
  rifle.add(fazer(new THREE.BoxGeometry(0.06, 0.08, 0.2), metal, 0, -0.02, 0.12));
  rifle.add(fazer(new THREE.BoxGeometry(0.075, 0.02, 0.3), detalhe, 0, 0.06, -0.3));
  rifle.add(fazer(new THREE.BoxGeometry(0.09, 0.09, 0.12), luva, 0.0, -0.08, -0.45));
  rifle.add(fazer(new THREE.BoxGeometry(0.09, 0.1, 0.1), luva, 0.0, -0.11, -0.04));
  rifle.userData.boca = new THREE.Vector3(0, 0.02, -0.88);

  const pistola = new THREE.Group();
  pistola.add(fazer(new THREE.BoxGeometry(0.05, 0.07, 0.24), metal, 0, 0, -0.12));
  pistola.add(fazer(new THREE.BoxGeometry(0.045, 0.13, 0.06), metal, 0, -0.08, -0.02));
  pistola.add(fazer(new THREE.BoxGeometry(0.052, 0.015, 0.2), detalhe, 0, 0.04, -0.12));
  pistola.add(fazer(new THREE.BoxGeometry(0.09, 0.1, 0.1), luva, 0, -0.1, 0.0));
  pistola.userData.boca = new THREE.Vector3(0, 0.01, -0.26);

  const faca = new THREE.Group();
  faca.add(fazer(new THREE.BoxGeometry(0.02, 0.05, 0.22), new THREE.MeshStandardMaterial({ color: 0xc8ccd6, metalness: 0.9, roughness: 0.2 }), 0, 0, -0.15));
  faca.add(fazer(new THREE.BoxGeometry(0.035, 0.04, 0.1), luva, 0, 0, 0.0));
  faca.userData.boca = new THREE.Vector3(0, 0, -0.25);

  grupo.add(rifle, pistola, faca);
  grupo.userData = { rifle, pistola, faca };

  // clarão do disparo
  const clarao = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, map: texClarao() }));
  clarao.visible = false;
  grupo.add(clarao);
  grupo.userData.clarao = clarao;
  return grupo;
}

let _clarao;
function texClarao() {
  if (_clarao) return _clarao;
  _clarao = tela(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.35, 'rgba(255,190,90,.9)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  return _clarao;
}

// ── efeitos: rastos de bala e marcas na parede ───────────────────────
export class Efeitos {
  constructor(cena) {
    this.cena = cena; this.rastos = []; this.marcas = [];
    this.matRasto = new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.8 });
    this.matMarca = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    this.geoMarca = new THREE.PlaneGeometry(0.06, 0.06);
    this.matSangue = new THREE.SpriteMaterial({ color: 0xc0182a, transparent: true, opacity: 0.9 });
    this.faiscas = [];
  }
  rasto(a, b) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    const l = new THREE.Line(g, this.matRasto.clone());
    this.cena.add(l);
    this.rastos.push({ o: l, t: 0.09 });
  }
  marca(p, normal) {
    const m = new THREE.Mesh(this.geoMarca, this.matMarca);
    m.position.copy(p).addScaledVector(normal, 0.01);
    m.lookAt(p.clone().add(normal));
    this.cena.add(m);
    this.marcas.push(m);
    if (this.marcas.length > 80) this.cena.remove(this.marcas.shift());
  }
  sangue(p) {
    const s = new THREE.Sprite(this.matSangue.clone());
    s.position.copy(p); s.scale.set(0.35, 0.35, 1);
    this.cena.add(s);
    this.faiscas.push({ o: s, t: 0.25 });
  }
  atualizar(dt) {
    for (const lista of [this.rastos, this.faiscas]) {
      for (let i = lista.length - 1; i >= 0; i--) {
        const r = lista[i]; r.t -= dt;
        r.o.material.opacity = Math.max(0, r.t * 8);
        if (r.t <= 0) { this.cena.remove(r.o); if (r.o.geometry && lista === this.rastos) r.o.geometry.dispose(); lista.splice(i, 1); }
      }
    }
  }
  limpar() {
    for (const m of this.marcas) this.cena.remove(m);
    this.marcas = [];
  }
}

// Normal da face de uma caixa onde o ponto está
export function normalCaixa(p, c) {
  const d = [p.x - c.min[0], c.max[0] - p.x, p.y - c.min[1], c.max[1] - p.y, p.z - c.min[2], c.max[2] - p.z];
  let i = 0; for (let k = 1; k < 6; k++) if (d[k] < d[i]) i = k;
  return new THREE.Vector3(...[[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]][i]);
}
