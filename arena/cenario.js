// Arena 4v4 — tudo o que se vê: mapa, céu, bonecos, armas e efeitos.
import * as THREE from './three.module.min.js';
import { CAIXAS, LIMITES, ALTURA, MAPA } from './mapa.js?v=3';
import { RoundedBoxGeometry } from '../vendor/three/geometries/RoundedBoxGeometry.js';
import { normalDe, ceuReal, ambienteInterior, ambienteDe } from '../comum/grafico.js?v=1';
const NORM = {};
const FORCA_NORMAL = { cont_laranja: 3, cont_azul: 3, muro: 1.6, armazem: 1.4, caixote: 2.5, betao: 1.2, chao: 1.5, calcada: 2, alcatifa: 1, terra: 1.6, pedra: 4, muro_pedra_alto: 4, telhado: 3, fardo: 2.5, tronco: 3, copa: 2, casa: 0.6, igreja: 0.6, predio_a: 1, predio_b: 1, predio_c: 1.2 };
function normalCache(tipo, tex) { if (!NORM[tipo]) NORM[tipo] = normalDe(tex, FORCA_NORMAL[tipo] || 2); const n = NORM[tipo].clone(); n.needsUpdate = true; n.repeat.copy(tex.repeat); return n; }

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

  // ── Lisboa ──
  const fachada = (base, janela, faixa) => tela(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    ruido(g, w, h, 2500, 0.18, () => '#000');
    for (let y = 18; y < h - 10; y += 64) for (let x = 20; x < w; x += 64) {
      const acesa = Math.random() < 0.45;
      g.fillStyle = acesa ? janela : '#1a2030'; g.fillRect(x, y, 26, 38);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 3, y + 38, 32, 4);
    }
    g.fillStyle = faixa; g.fillRect(0, h - 8, w, 8);
  });
  TEX.predio_a = fachada('#d9c27a', '#ffd98a', '#8a7a4a');
  TEX.predio_b = fachada('#c98a7a', '#ffe0a0', '#7a4a3a');
  TEX.predio_c = tela(256, 256, (g, w, h) => {
    // azulejo azul e branco
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
      g.fillStyle = (x + y) % 32 ? '#e9eef7' : '#2f5aa8'; g.fillRect(x, y, 16, 16);
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, y, 16, 1); g.fillRect(x, y, 1, 16);
    }
    for (let y = 18; y < h - 10; y += 64) for (let x = 20; x < w; x += 64) { g.fillStyle = Math.random() < 0.5 ? '#ffd98a' : '#1a2030'; g.fillRect(x, y, 26, 38); }
  });
  TEX.calcada = tela(512, 512, (g, w, h) => {
    g.fillStyle = '#d8d4c8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? '#cfcabd' : '#e4e0d6'; g.fillRect(Math.random() * w, Math.random() * h, 9, 9); }
    // ondas de pedra preta (calçada portuguesa)
    g.fillStyle = '#2b2b30';
    for (let o = 0; o < 4; o++) for (let x = 0; x < w; x += 4) {
      const y = h * (o + 0.5) / 4 + Math.sin(x / w * Math.PI * 4) * 22;
      g.fillRect(x, y, 5, 14);
    }
    g.strokeStyle = 'rgba(0,0,0,.08)';
    for (let x = 0; x < w; x += 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  });
  TEX.eletrico = tela(256, 128, (g, w, h) => {
    g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, w, 26);
    g.fillStyle = '#2a3040'; for (let x = 14; x < w - 10; x += 40) g.fillRect(x, 32, 28, 40);
    g.fillStyle = '#8a1f1f'; g.fillRect(0, h - 18, w, 18);
    g.fillStyle = '#222'; g.font = 'bold 18px sans-serif'; g.fillText('28', w - 40, 20);
  });
  TEX.carro = tela(128, 64, (g, w, h) => { g.fillStyle = '#b8202a'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a3346'; g.fillRect(18, 6, 92, 22); g.fillStyle = '#111'; g.fillRect(0, h - 10, w, 10); });
  TEX.carro_b = tela(128, 64, (g, w, h) => { g.fillStyle = '#e8e8ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a3346'; g.fillRect(18, 6, 92, 22); g.fillStyle = '#111'; g.fillRect(0, h - 10, w, 10); });
  TEX.quiosque = tela(128, 128, (g, w, h) => { g.fillStyle = '#2f6b4a'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9d9a0'; g.fillRect(10, 30, w - 20, 50); g.fillStyle = '#c33'; g.fillRect(0, 0, w, 14); });
  TEX.banco = tela(64, 64, (g, w, h) => { g.fillStyle = '#6b4a2a'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a3218'; for (let y = 0; y < h; y += 12) g.fillRect(0, y, w, 3); });
  TEX.lixo = tela(64, 64, (g, w, h) => { g.fillStyle = '#2f5a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#244a2e'; g.fillRect(0, 0, w, 10); });
  TEX.pilarete = tela(32, 64, (g, w, h) => { g.fillStyle = '#2a2a2e'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8b04a'; g.fillRect(0, 8, w, 6); });
  TEX.floreira = tela(64, 64, (g, w, h) => { g.fillStyle = '#7a5a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#3f7a2f'; g.fillRect(0, 0, w, 18); for (let i = 0; i < 20; i++) { g.fillStyle = ['#e33', '#fd4', '#f8a'][i % 3]; g.fillRect(Math.random() * w, Math.random() * 14, 5, 5); } });
  // ── Casino ──
  TEX.alcatifa = tela(256, 256, (g, w, h) => {
    g.fillStyle = '#5a0f22'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d4a63a'; g.lineWidth = 3;
    for (let y = 0; y <= h; y += 64) for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, y - 20); g.lineTo(x + 20, y); g.lineTo(x, y + 20); g.lineTo(x - 20, y); g.closePath(); g.stroke(); }
    g.fillStyle = '#2a0a3a'; for (let y = 32; y < h; y += 64) for (let x = 32; x < w; x += 64) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
  });
  TEX.parede_casino = tela(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a0f3e'); gr.addColorStop(1, '#4a1a5e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d4a63a'; g.fillRect(0, h * 0.62, w, 5); g.fillRect(0, h * 0.08, w, 3);
    for (let x = 16; x < w; x += 64) { g.fillStyle = 'rgba(212,166,58,.25)'; g.fillRect(x, h * 0.15, 32, h * 0.4); }
  });
  const slot = (cor) => tela(64, 128, (g, w, h) => {
    g.fillStyle = cor; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0d0d14'; g.fillRect(8, 26, w - 16, 40);
    for (let i = 0; i < 3; i++) { g.fillStyle = ['#ff4', '#f44', '#4f8'][(i + (cor.length)) % 3]; g.fillRect(12 + i * 14, 38, 10, 16); }
    g.fillStyle = '#ffd34d'; g.fillRect(0, 0, w, 14); g.fillStyle = '#222'; g.fillRect(10, 78, w - 20, 10);
  });
  TEX.slot = slot('#7a1fd6'); TEX.slot_b = slot('#d61f6a');
  TEX.mesa = tela(128, 64, (g, w, h) => { g.fillStyle = '#0f6a3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e9d9a0'; g.lineWidth = 2; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#5a3418'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5); });
  TEX.mesa_roleta = tela(128, 64, (g, w, h) => { g.fillStyle = '#0f6a3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#b11' : '#111'; g.fillRect(40 + i * 6, 14, 6, 36); } g.fillStyle = '#5a3418'; g.fillRect(0, 0, w, 5); });
  TEX.balcao = tela(128, 64, (g, w, h) => { g.fillStyle = '#3a1f12'; g.fillRect(0, 0, w, h); g.fillStyle = '#d4a63a'; g.fillRect(0, 0, w, 6); for (let x = 8; x < w; x += 20) { g.fillStyle = '#4a2a18'; g.fillRect(x, 14, 12, h - 20); } });
  TEX.pilar_ouro = tela(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#8a6a1a'); gr.addColorStop(0.5, '#f4d26a'); gr.addColorStop(1, '#8a6a1a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  TEX.sofa = tela(64, 64, (g, w, h) => { g.fillStyle = '#6a1230'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a0a20'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 2, h); });
  // ── Aldeia ──
  TEX.terra = tela(512, 512, (g, w, h) => {
    g.fillStyle = '#c9a876'; g.fillRect(0, 0, w, h);
    ruido(g, w, h, 9000, 0.35, (r) => (r > 0.5 ? '#b8956a' : '#d8bb8a'));
    for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(110,90,60,.5)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 0, 7); g.fill(); }
  });
  TEX.casa = tela(256, 256, (g, w, h) => {
    g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, w, h);
    ruido(g, w, h, 1500, 0.12, () => '#9a9080');
    g.fillStyle = '#2f62b8'; g.fillRect(0, h - 26, w, 26); // barra azul caiada
    g.fillStyle = '#2f62b8'; g.fillRect(40, 70, 46, 60); g.fillRect(170, 70, 46, 60);
    g.fillStyle = '#5a3a22'; g.fillRect(112, 120, 40, 110);
  });
  TEX.telhado = tela(128, 64, (g, w, h) => { g.fillStyle = '#c4562a'; g.fillRect(0, 0, w, h); g.fillStyle = '#a8441e'; for (let x = 0; x < w; x += 10) g.fillRect(x, 0, 4, h); });
  TEX.igreja = tela(256, 256, (g, w, h) => {
    g.fillStyle = '#f8f5ec'; g.fillRect(0, 0, w, h); ruido(g, w, h, 1200, 0.1, () => '#999');
    g.fillStyle = '#d8b04a'; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 14, w, 14);
    g.fillStyle = '#4a3020'; g.beginPath(); g.moveTo(98, h - 14); g.lineTo(98, 150); g.arc(128, 150, 30, Math.PI, 0); g.lineTo(158, h - 14); g.fill();
  });
  TEX.pedra = tela(128, 128, (g, w, h) => {
    g.fillStyle = '#8c8578'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = ['#a39b8c', '#77705f', '#9a917f'][i % 3]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 10 + Math.random() * 12, 7 + Math.random() * 8, Math.random(), 0, 7); g.fill(); }
  });
  TEX.muro_pedra_alto = TEX.pedra;
  TEX.fardo = tela(64, 64, (g, w, h) => { g.fillStyle = '#d9b85a'; g.fillRect(0, 0, w, h); ruido(g, w, h, 900, 0.4, () => '#a88a3a'); g.fillStyle = '#8a6a2a'; g.fillRect(w * 0.3, 0, 3, h); g.fillRect(w * 0.7, 0, 3, h); });
  TEX.carroca = tela(64, 64, (g, w, h) => { g.fillStyle = '#7a5230'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a3a20'; for (let y = 0; y < h; y += 10) g.fillRect(0, y, w, 2); });
  TEX.tronco = tela(32, 64, (g, w, h) => { g.fillStyle = '#5a4630'; g.fillRect(0, 0, w, h); ruido(g, w, h, 300, 0.4, () => '#3a2a18'); });
  TEX.copa = tela(64, 64, (g, w, h) => { g.fillStyle = '#6f8a4a'; g.fillRect(0, 0, w, h); ruido(g, w, h, 1500, 0.5, (r) => (r > 0.5 ? '#55703a' : '#8aa45e')); });
  TEX.pilar = TEX.betao;
  return TEX;
}

// ── céu de cada mapa (gradiente; estrelas em Lisboa) ─────────────────
function ceu(tema) {
  const t = tela(16, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    for (const [cor, pos] of tema.ceu) gr.addColorStop(pos, cor);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  const grupo = new THREE.Group();
  grupo.add(new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false })));
  if (tema.estrelas) {
    const pos = [];
    for (let i = 0; i < 700; i++) {
      const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.3;
      pos.push(Math.cos(a) * Math.cos(e) * 380, Math.sin(e) * 380, Math.sin(a) * Math.cos(e) * 380);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    grupo.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, fog: false })));
    const lua = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf4f1dc, fog: false }));
    lua.position.set(120, 160, -220); grupo.add(lua);
  }
  return grupo;
}

export function criarCena(renderer) {
  texturas();
  const tema = MAPA.tema;
  const cena = new THREE.Scene();
  cena.fog = new THREE.Fog(tema.nevoeiro[0], tema.nevoeiro[1], tema.nevoeiro[2]);
  let solDir = null;
  if (tema.interior) { cena.background = new THREE.Color(tema.fundo); ambienteInterior(renderer, cena, 0.45); }
  else if (tema.real) { const r = ceuReal(renderer, cena, { ...tema.real, tamanho: 450 }); solDir = r.sol; }
  else { const c = ceu(tema); cena.add(c); const fonte = new THREE.Scene(); fonte.add(ceu(tema)); ambienteDe(renderer, cena, fonte, 0.55); }
  renderer.toneMappingExposure = tema.real ? (tema.exposicao ? 0.62 : 0.72) : tema.exposicao || 1.25;

  cena.add(new THREE.HemisphereLight(tema.hemi[0], tema.hemi[1], tema.hemi[2] * (tema.real ? 0.45 : 0.75)));
  const sol = new THREE.DirectionalLight(tema.sol[0], tema.sol[1] * (tema.real ? 0.8 : 1));
  sol.position.set(...tema.sol[2]);
  if (solDir) { const d = solDir.clone(); if (d.y < 0.12) d.y = 0.12; d.normalize(); sol.position.copy(d.multiplyScalar(80)); }
  sol.castShadow = !tema.interior;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -LIMITES.x - 6, right: LIMITES.x + 6, top: LIMITES.z + 10, bottom: -LIMITES.z - 10, near: 5, far: 160 });
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.02;
  cena.add(sol);
  cena.add(new THREE.AmbientLight(tema.ambiente[0], tema.ambiente[1]));

  // chão
  const tc = (TEX[tema.chao] || TEX.chao).clone(); tc.needsUpdate = true;
  const escChao = tema.chao === 'calcada' ? 2.5 : 4;
  tc.repeat.set(LIMITES.x / escChao, LIMITES.z / escChao);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(LIMITES.x * 2 + 2, LIMITES.z * 2 + 2), new THREE.MeshStandardMaterial({ map: tc, normalMap: normalCache(tema.chao, tc), normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.92 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  cena.add(chao);
  if (tema.agua) {
    const agua = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x1b2a4a, roughness: 0.25, metalness: 0.6 }));
    agua.rotation.x = -Math.PI / 2; agua.position.y = -0.6;
    cena.add(agua);
  }
  if (tema.interior) {
    // teto com sancas douradas
    const teto = new THREE.Mesh(new THREE.PlaneGeometry(LIMITES.x * 2 + 2, LIMITES.z * 2 + 2), new THREE.MeshStandardMaterial({ color: 0x1c0f2a, roughness: 0.9 }));
    teto.rotation.x = Math.PI / 2; teto.position.y = tema.interior;
    cena.add(teto);
  } else if (tema.deco !== 'gruas') {
    // chão à volta do mapa, para não se ver o vazio por cima dos muros
    const fora = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: tema.deco === 'montes' ? 0xa89068 : 0x2a2f3a, roughness: 1 }));
    fora.rotation.x = -Math.PI / 2; fora.position.y = -0.02;
    cena.add(fora);
  }

  // caixas do mapa
  const mats = {};
  const mat = (tipo, w, h) => {
    const t = TEX[tipo] || TEX.betao;
    const k = tipo + ':' + w.toFixed(1) + ':' + h.toFixed(1);
    if (!mats[k]) {
      const tx = t.clone(); tx.needsUpdate = true;
      const unico = ['caixote', 'slot', 'slot_b', 'mesa', 'mesa_roleta', 'carro', 'carro_b', 'eletrico', 'quiosque', 'lixo', 'fardo', 'sofa', 'pilarete', 'tronco', 'pilar_ouro'];
      const esc = tipo.startsWith('cont') ? [w / 6.5, 1] : unico.includes(tipo) ? [1, 1] : tipo.startsWith('predio') ? [w / 8, h / 8] : [w / 4, h / 4];
      tx.repeat.set(Math.max(0.5, esc[0]), Math.max(0.5, esc[1]));
      const brilho = tipo.startsWith('cont') || tipo === 'pilar_ouro' || tipo.startsWith('carro') || tipo === 'eletrico';
      mats[k] = new THREE.MeshStandardMaterial({ map: tx, normalMap: normalCache(tipo, tx), normalScale: new THREE.Vector2(0.9, 0.9), roughness: brilho ? 0.45 : 0.88, metalness: tipo === 'pilar_ouro' ? 0.7 : brilho ? 0.3 : 0, emissive: tipo.startsWith('slot') ? 0x401060 : 0x000000, emissiveIntensity: 0.6 });
    }
    return mats[k];
  };
  for (const c of CAIXAS) {
    const w = c.max[0] - c.min[0], h = c.max[1] - c.min[1], d = c.max[2] - c.min[2];
    const lado = Math.max(w, d);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c.tipo, lado, h));
    m.position.set((c.min[0] + c.max[0]) / 2, (c.min[1] + c.max[1]) / 2, (c.min[2] + c.max[2]) / 2);
    m.castShadow = h < 9;
    m.receiveShadow = true;
    cena.add(m);
  }

  // sombra de contacto: escurece o chão junto à base de cada caixa
  const texAO = tela(64, 64, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = Math.max(0, Math.abs(x - w / 2 + 0.5) - w * 0.3) / (w * 0.2), dy = Math.max(0, Math.abs(y - h / 2 + 0.5) - h * 0.3) / (h * 0.2);
      const d = Math.min(1, Math.hypot(dx, dy)); const a = (1 - d) * (1 - d) * 0.55;
      img.data.set([0, 0, 0, a * 255], (y * w + x) * 4);
    }
    g.putImageData(img, 0, 0);
  });
  texAO.wrapS = texAO.wrapT = THREE.ClampToEdgeWrapping; texAO.colorSpace = THREE.NoColorSpace;
  const matAO = new THREE.MeshBasicMaterial({ map: texAO, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const c of CAIXAS) {
    if (c.min[1] > 0.01 || c.max[1] - c.min[1] < 0.7) continue;
    const w = c.max[0] - c.min[0], d = c.max[2] - c.min[2];
    if (w > LIMITES.x * 1.5 || d > LIMITES.z * 1.5) continue;
    const ao = new THREE.Mesh(new THREE.PlaneGeometry(w / 0.6, d / 0.6), matAO);
    ao.rotation.x = -Math.PI / 2; ao.position.set((c.min[0] + c.max[0]) / 2, 0.02, (c.min[2] + c.max[2]) / 2);
    ao.scale.set(1 + 0.6 / w, 1 + 0.6 / d, 1);
    ao.renderOrder = 1;
    cena.add(ao);
  }

  // decoração fora da zona de jogo
  if (tema.deco === 'gruas') {
    const ferro = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, metalness: 0.4 });
    for (const [x, z] of [[-20, 30], [18, 31], [0, -32]]) {
      const g = new THREE.Group();
      const torre = new THREE.Mesh(new THREE.BoxGeometry(1.2, 22, 1.2), ferro); torre.position.y = 11; g.add(torre);
      const braco = new THREE.Mesh(new THREE.BoxGeometry(18, 0.9, 0.9), ferro); braco.position.set(5, 21.5, 0); g.add(braco);
      g.position.set(x, 0, z);
      g.rotation.y = x * 0.37;
      cena.add(g);
    }
  } else if (tema.deco === 'predios') {
    // mais prédios e o castelo ao fundo
    const tipos = ['predio_a', 'predio_b', 'predio_c'];
    let n = 0;
    for (let x = -LIMITES.x - 6; x <= LIMITES.x + 6; x += 9) for (const z of [LIMITES.z + 6, -LIMITES.z - 6]) {
      const h = 13 + ((n * 7) % 9);
      const b = new THREE.Mesh(new THREE.BoxGeometry(8.5, h, 9), mat(tipos[n++ % 3], 9, h)); b.position.set(x, h / 2, z); cena.add(b);
    }
    for (const x of [LIMITES.x + 6, -LIMITES.x - 6]) for (let z = -LIMITES.z; z <= LIMITES.z; z += 9) {
      const h = 13 + ((n * 5) % 8);
      const b = new THREE.Mesh(new THREE.BoxGeometry(9, h, 8.5), mat(tipos[n++ % 3], 9, h)); b.position.set(x, h / 2, z); cena.add(b);
    }
    const pedra = new THREE.MeshStandardMaterial({ color: 0x8a8470, roughness: 1 });
    const castelo = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(40, 8, 14), pedra); base.position.y = 22; castelo.add(base);
    for (const x of [-18, -6, 6, 18]) { const t = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 5), pedra); t.position.set(x, 30, 0); castelo.add(t); }
    const monte = new THREE.Mesh(new THREE.BoxGeometry(70, 18, 30), new THREE.MeshStandardMaterial({ color: 0x1a2a2a, roughness: 1 })); monte.position.y = 9; castelo.add(monte);
    castelo.position.set(10, 0, 70); cena.add(castelo);
  } else if (tema.deco === 'montes') {
    const verde = new THREE.MeshStandardMaterial({ color: 0x8a9a5a, roughness: 1 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, r = 110 + (i % 3) * 25;
      const m = new THREE.Mesh(new THREE.SphereGeometry(30 + (i % 4) * 8, 12, 8), verde);
      m.scale.y = 0.35; m.position.set(Math.cos(a) * r, -4, Math.sin(a) * r); cena.add(m);
    }
    const moinho = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 9, 12), new THREE.MeshStandardMaterial({ color: 0xf6f3ea }));
    moinho.position.set(-60, 8, 75); cena.add(moinho);
  }

  // candeeiros / luzes do teto
  const luzMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  for (const [x, z] of tema.luzes || []) {
    const y = tema.alturaLuz || 6;
    if (!tema.interior) {
      const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, y), new THREE.MeshStandardMaterial({ color: 0x222833 }));
      poste.position.set(x, y / 2, z); cena.add(poste);
    }
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.3), luzMat); lamp.position.set(x, y, z); cena.add(lamp);
    const pl = new THREE.PointLight(tema.corLuz || 0xffc070, tema.intLuz || 6, tema.interior ? 18 : 15, 1.6); pl.position.set(x, y - 0.3, z); cena.add(pl);
  }
  return cena;
}

// ── boneco de um jogador ─────────────────────────────────────────────
export function criarBoneco(equipa, nome) {
  const cor = new THREE.Color(CORES[equipa]);
  const pele = new THREE.MeshStandardMaterial({ color: 0xc98f6a, roughness: 0.75 });
  const roupa = new THREE.MeshStandardMaterial({ color: cor.clone().multiplyScalar(0.85), roughness: 0.85 });
  const calcas = new THREE.MeshStandardMaterial({ color: 0x2a3142, roughness: 0.9 });
  const colete = new THREE.MeshStandardMaterial({ color: 0x23282f, roughness: 0.7 });
  const botas = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.6 });
  const capacete = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.45, metalness: 0.1 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x1a1d24, metalness: 0.7, roughness: 0.35 });
  const g = new THREE.Group();
  const corpo = new THREE.Group(); g.add(corpo);
  const add = (pai, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; pai.add(m); return m; };
  // pernas: rodam a partir da anca
  const perna = (x) => {
    const piv = new THREE.Group(); piv.position.set(x, 0.86, 0); corpo.add(piv);
    add(piv, new THREE.CapsuleGeometry(0.1, 0.34, 4, 8), calcas, 0, -0.22, 0);
    add(piv, new THREE.CapsuleGeometry(0.085, 0.32, 4, 8), calcas, 0, -0.6, 0);
    add(piv, new RoundedBoxGeometry(0.16, 0.12, 0.28, 2, 0.04), botas, 0, -0.81, -0.04);
    return piv;
  };
  const pernaE = perna(-0.12), pernaD = perna(0.12);
  // tronco, colete e cinto
  add(corpo, new RoundedBoxGeometry(0.44, 0.6, 0.26, 3, 0.09), roupa, 0, 1.17, 0);
  add(corpo, new RoundedBoxGeometry(0.48, 0.42, 0.32, 3, 0.07), colete, 0, 1.22, 0);
  for (const x of [-0.12, 0, 0.12]) add(corpo, new RoundedBoxGeometry(0.1, 0.12, 0.06, 2, 0.02), colete, x, 1.1, -0.18);
  add(corpo, new THREE.BoxGeometry(0.46, 0.06, 0.28), botas, 0, 0.9, 0);
  // cabeça com capacete e óculos
  add(corpo, new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), pele, 0, 1.52, 0);
  const cabeca = add(corpo, new THREE.SphereGeometry(0.13, 16, 12), pele, 0, 1.65, 0);
  const cap = add(corpo, new THREE.SphereGeometry(0.155, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), capacete, 0, 1.68, 0.01);
  add(corpo, new THREE.TorusGeometry(0.155, 0.012, 6, 20).rotateX(Math.PI / 2), capacete, 0, 1.66, 0.01);
  add(corpo, new RoundedBoxGeometry(0.2, 0.05, 0.04, 2, 0.015), new THREE.MeshStandardMaterial({ color: 0x0b0d12, metalness: 0.8, roughness: 0.1 }), 0, 1.67, -0.12);
  // braços a segurar a arma
  const braco = (x, z, rx) => { const piv = new THREE.Group(); piv.position.set(x, 1.38, 0); piv.rotation.set(rx, 0, 0); corpo.add(piv); add(piv, new THREE.CapsuleGeometry(0.065, 0.42, 4, 8), roupa, 0, 0, -0.25).rotation.x = Math.PI / 2; add(piv, new THREE.SphereGeometry(0.06, 10, 8), pele, 0, 0, z); return piv; };
  braco(-0.25, -0.5, -0.12); braco(0.25, -0.32, 0.1);
  // arma
  const arma = new THREE.Group(); arma.position.set(0.06, 1.3, -0.45); corpo.add(arma);
  add(arma, new RoundedBoxGeometry(0.07, 0.11, 0.7, 2, 0.02), metal, 0, 0, 0);
  add(arma, new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8).rotateX(Math.PI / 2), metal, 0, 0.02, -0.48);
  add(arma, new THREE.BoxGeometry(0.05, 0.16, 0.07), metal, 0, -0.12, -0.05);
  add(arma, new THREE.BoxGeometry(0.06, 0.03, 0.26), new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5 }), 0, 0.07, -0.1);
  g.userData = { corpo, pernaE, pernaD, cabeca, arma, nome, equipa };
  const etiqueta = criarEtiqueta(nome, equipa);
  etiqueta.position.y = 2.2;
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
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x2c313d, metalness: 0.85, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const detalhe = new THREE.MeshStandardMaterial({ color: 0xff7a1a, metalness: 0.3, roughness: 0.5 });
  const luva = new THREE.MeshStandardMaterial({ color: 0x3a3426, roughness: 0.95 });
  const fazer = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };

  const rifle = new THREE.Group();
  rifle.add(fazer(new RoundedBoxGeometry(0.07, 0.1, 0.62, 2, 0.021), metal, 0, 0, -0.25));
  rifle.add(fazer(new RoundedBoxGeometry(0.035, 0.035, 0.32, 2, 0.011), metal, 0, 0.02, -0.7));
  rifle.add(fazer(new RoundedBoxGeometry(0.05, 0.16, 0.08, 2, 0.015), metal, 0, -0.12, -0.28));
  rifle.add(fazer(new RoundedBoxGeometry(0.06, 0.12, 0.06, 2, 0.018), metal, 0, -0.09, -0.05));
  rifle.add(fazer(new RoundedBoxGeometry(0.06, 0.08, 0.2, 2, 0.018), metal, 0, -0.02, 0.12));
  rifle.add(fazer(new RoundedBoxGeometry(0.075, 0.02, 0.3, 2, 0.006), detalhe, 0, 0.06, -0.3));
  rifle.add(fazer(new RoundedBoxGeometry(0.09, 0.09, 0.12, 2, 0.027), luva, 0.0, -0.08, -0.45));
  rifle.add(fazer(new RoundedBoxGeometry(0.09, 0.1, 0.1, 2, 0.027), luva, 0.0, -0.11, -0.04));
  rifle.userData.boca = new THREE.Vector3(0, 0.02, -0.88);

  const pistola = new THREE.Group();
  pistola.add(fazer(new RoundedBoxGeometry(0.05, 0.07, 0.24, 2, 0.015), metal, 0, 0, -0.12));
  pistola.add(fazer(new RoundedBoxGeometry(0.045, 0.13, 0.06, 2, 0.013), metal, 0, -0.08, -0.02));
  pistola.add(fazer(new RoundedBoxGeometry(0.052, 0.015, 0.2, 2, 0.004), detalhe, 0, 0.04, -0.12));
  pistola.add(fazer(new RoundedBoxGeometry(0.09, 0.1, 0.1, 2, 0.027), luva, 0, -0.1, 0.0));
  pistola.userData.boca = new THREE.Vector3(0, 0.01, -0.26);

  const faca = new THREE.Group();
  faca.add(fazer(new RoundedBoxGeometry(0.02, 0.05, 0.22, 2, 0.006), new THREE.MeshStandardMaterial({ color: 0xc8ccd6, metalness: 0.9, roughness: 0.2 }), 0, 0, -0.15));
  faca.add(fazer(new RoundedBoxGeometry(0.035, 0.04, 0.1, 2, 0.011), luva, 0, 0, 0.0));
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
