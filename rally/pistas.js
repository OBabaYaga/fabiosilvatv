// Rally — pistas: traçado, relevo, pisos e física do carro.
// Sem three.js aqui: este ficheiro também corre em node para testes.

// ── as 4 pistas ──────────────────────────────────────────────────────
// pontos: traçado fechado (metros), passado por uma curva suave.
// pisos: [início, fim (0..1 da volta), piso]
export const PISTAS = {
  douro: {
    id: 'douro', nome: 'Douro', desc: 'Terra batida entre socalcos de vinha, sol de fim de tarde.',
    largura: 13, relevo: 26, voltas: 3,
    pontos: [[0, 0], [170, -10], [280, 50], [310, 160], [240, 250], [130, 230], [70, 300], [-60, 320], [-170, 250], [-150, 140], [-240, 60], [-200, -60], [-90, -60]],
    pisos: [[0, 0.12, 'asfalto'], [0.12, 1, 'terra']],
    tema: { ceu: [['#2a5aa8', 0], ['#7fb0e8', 0.55], ['#ffd9a0', 0.9], ['#ffb070', 1]], nevoeiro: [0xe8c9a0, 160, 650], sol: [0xffd9a8, 2.6, [-120, 160, 80]], hemi: [0xcfe2ff, 0x8a6a40, 1.2], fora: 'erva_seca', arvores: 'oliveira', densidade: 0.8, vinhas: true },
  },
  sintra: {
    id: 'sintra', nome: 'Sintra', desc: 'Floresta com nevoeiro, terra e lama nas curvas apertadas.',
    largura: 11.5, relevo: 18, voltas: 3,
    pontos: [[0, 0], [130, 0], [210, -80], [310, -60], [330, 60], [250, 120], [270, 220], [160, 290], [40, 230], [-60, 290], [-190, 230], [-210, 110], [-120, 50], [-170, -60], [-70, -90]],
    pisos: [[0, 0.3, 'terra'], [0.3, 0.45, 'lama'], [0.45, 0.75, 'terra'], [0.75, 0.88, 'lama'], [0.88, 1, 'terra']],
    tema: { ceu: [['#5a6a70', 0], ['#8a9a9a', 0.6], ['#c8d0c8', 1]], nevoeiro: [0x9aa8a0, 40, 240], sol: [0xf0f4e8, 1.4, [80, 140, -60]], hemi: [0xd8e8d8, 0x3a4a2a, 1.3], fora: 'erva', arvores: 'pinheiro', densidade: 1.6 },
  },
  estrela: {
    id: 'estrela', nome: 'Serra da Estrela', desc: 'Neve compacta e pouca aderência, ao anoitecer.',
    largura: 12.5, relevo: 34, voltas: 3,
    pontos: [[0, 0], [190, 30], [270, 140], [190, 230], [70, 190], [10, 270], [-120, 260], [-210, 160], [-150, 60], [-230, -40], [-120, -100]],
    pisos: [[0, 1, 'neve']],
    tema: { ceu: [['#141d3f', 0], ['#3a4a80', 0.5], ['#c98aa0', 0.85], ['#ffb08a', 1]], nevoeiro: [0xb8c0d8, 90, 520], sol: [0xffc8b0, 1.6, [150, 90, -120]], hemi: [0xdfe8ff, 0x6a7090, 1.3], fora: 'neve', arvores: 'abeto', densidade: 1.0, neve: true },
  },
  algarve: {
    id: 'algarve', nome: 'Algarve', desc: 'Asfalto rápido junto ao mar, com troços de areia.',
    largura: 14, relevo: 9, voltas: 3,
    pontos: [[0, 0], [210, 0], [330, 60], [340, 180], [230, 210], [150, 150], [40, 190], [-80, 250], [-210, 210], [-270, 90], [-190, -20], [-90, -60]],
    pisos: [[0, 0.4, 'asfalto'], [0.4, 0.55, 'areia'], [0.55, 0.85, 'asfalto'], [0.85, 0.93, 'areia'], [0.93, 1, 'asfalto']],
    tema: { ceu: [['#1a3a8a', 0], ['#4a8ad8', 0.5], ['#ffc07a', 0.88], ['#ff7a1a', 1]], nevoeiro: [0xf0c8a0, 180, 800], sol: [0xffc890, 2.8, [200, 70, 150]], hemi: [0xcfe8ff, 0xc8a070, 1.2], fora: 'areia_fora', arvores: 'palmeira', densidade: 0.5, mar: true },
  },
};

// Aderência e velocidade por piso
export const PISOS = {
  asfalto: { aderencia: 1.0, vmax: 1.0, cor: '#3a3d44', poeira: 0x8a8a8a },
  terra: { aderencia: 0.78, vmax: 0.96, cor: '#a8784a', poeira: 0xc8a070 },
  lama: { aderencia: 0.6, vmax: 0.86, cor: '#5a4028', poeira: 0x5a4028 },
  neve: { aderencia: 0.56, vmax: 0.9, cor: '#e8eef8', poeira: 0xf4f8ff },
  areia: { aderencia: 0.66, vmax: 0.85, cor: '#e0c890', poeira: 0xe8d8a8 },
  fora: { aderencia: 0.5, vmax: 0.55, poeira: 0x8a7a5a },
};

// ── ruído para o relevo (determinístico) ─────────────────────────────
function hash(x, z) { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function ruido(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(zf) + (a - b - c + d) * s(xf) * s(zf);
}
function fbm(x, z) { return ruido(x / 140, z / 140) * 0.6 + ruido(x / 60 + 31, z / 60 - 7) * 0.3 + ruido(x / 25 - 11, z / 25 + 5) * 0.1; }

// ── construir a pista ────────────────────────────────────────────────
// Curva Catmull-Rom fechada, amostrada de 2 em 2 metros.
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map((i) => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
}
export function construirPista(def) {
  const P = def.pontos, n = P.length;
  // amostragem fina e depois reamostrar com espaçamento igual
  const fino = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let k = 0; k < 60; k++) fino.push(catmull(p0, p1, p2, p3, k / 60));
  }
  const PASSO = 2;
  const am = [fino[0]];
  let acum = 0;
  for (let i = 1; i <= fino.length; i++) {
    const a = fino[i - 1], b = fino[i % fino.length];
    let seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let ini = a;
    while (acum + seg >= PASSO) {
      const t = (PASSO - acum) / seg;
      const p = [ini[0] + (b[0] - ini[0]) * t, ini[1] + (b[1] - ini[1]) * t];
      am.push(p);
      seg -= PASSO - acum; ini = p; acum = 0;
    }
    acum += seg;
  }
  if (Math.hypot(am[am.length - 1][0] - am[0][0], am[am.length - 1][1] - am[0][1]) < PASSO * 0.6) am.pop();
  const N = am.length;
  // altura: relevo suavizado ao longo da pista (sem rampas impossíveis)
  let h = am.map(([x, z]) => fbm(x, z) * def.relevo);
  for (let rep = 0; rep < 6; rep++) {
    const nh = new Array(N);
    for (let i = 0; i < N; i++) { let s = 0; for (let k = -12; k <= 12; k++) s += h[(i + k + N) % N]; nh[i] = s / 25; }
    h = nh;
  }
  // direções, normais e curvatura
  const amostras = am.map(([x, z], i) => {
    const a = am[(i - 1 + N) % N], b = am[(i + 1) % N];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    return { x, z, y: h[i], dx, dz, nx: dz, nz: -dx, i };
  });
  for (let i = 0; i < N; i++) {
    const a = amostras[(i - 5 + N) % N], b = amostras[(i + 5) % N];
    const ang = Math.atan2(a.dx * b.dz - a.dz * b.dx, a.dx * b.dx + a.dz * b.dz);
    amostras[i].curva = Math.abs(ang) / 20; // 1/raio aproximado
  }
  // velocidade aconselhada (para o computador): olha para a frente
  for (let i = 0; i < N; i++) {
    let c = 0;
    for (let k = 0; k < 30; k++) c = Math.max(c, amostras[(i + k) % N].curva * (1 - k / 45));
    amostras[i].vAlvo = Math.min(55, Math.sqrt(9.5 / Math.max(c, 1e-4)));
  }
  const piso = (i) => { const t = i / N; for (const [a, b, p] of def.pisos) if (t >= a && t < b) return p; return def.pisos[0][2]; };
  amostras.forEach((s, i) => { s.piso = piso(i); });
  // grelha espacial para encontrar a pista mais perto depressa
  const CEL = 20, grelha = new Map();
  for (const s of amostras) {
    const k = Math.floor(s.x / CEL) + ',' + Math.floor(s.z / CEL);
    if (!grelha.has(k)) grelha.set(k, []);
    grelha.get(k).push(s);
  }
  const pista = { def, amostras, N, comprimento: N * PASSO, meia: def.largura / 2, grelha, CEL };
  pista.maisPerto = (x, z, raio = 2) => {
    const cx = Math.floor(x / CEL), cz = Math.floor(z / CEL);
    let melhor = null, md = Infinity;
    for (let a = -raio; a <= raio; a++) for (let b = -raio; b <= raio; b++) {
      const l = grelha.get((cx + a) + ',' + (cz + b)); if (!l) continue;
      for (const s of l) { const d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < md) { md = d; melhor = s; } }
    }
    return melhor ? { s: melhor, d: Math.sqrt(md) } : null;
  };
  // altura do chão em qualquer ponto (a estrada fica plana de lado a lado)
  pista.altura = (x, z) => {
    const r = pista.maisPerto(x, z, 3);
    const nat = fbm(x, z) * def.relevo * 1.15 - 1.5;
    if (!r) return nat;
    // posição lateral exata em relação ao segmento
    const s = r.s, lat = Math.abs((x - s.x) * s.nx + (z - s.z) * s.nz);
    const hEstrada = s.y;
    if (lat <= pista.meia + 1.5) return hEstrada;
    const t = Math.min(1, (lat - pista.meia - 1.5) / 28);
    const sm = t * t * (3 - 2 * t);
    return hEstrada - 0.15 + (nat - hEstrada + 0.15) * sm;
  };
  return pista;
}

// ── condução (arcade) ────────────────────────────────────────────────
// carro: { x, z, y, vy, rumo, vx, vz, guinada, noAr, ... }
// ent: { acel 0..1, trava 0..1, dir -1..1, mao bool }
export const CARRO = { vmax: 54, acel: 15, trava: 26, re: 9, raio: 2.1 };

export function novoCarro(x, z, rumo) {
  return { x, z, y: 0, vy: 0, rumo, vx: 0, vz: 0, vel: 0, guinada: 0, noAr: false, derrapa: 0, piso: 'asfalto', foraPista: false, idx: 0, volta: 0, progresso: 0 };
}
export function conduzir(c, ent, pista, dt, mult = 1) {
  const fx = Math.sin(c.rumo), fz = Math.cos(c.rumo);
  const rx = Math.cos(c.rumo), rz = -Math.sin(c.rumo);
  let vLong = c.vx * fx + c.vz * fz, vLat = c.vx * rx + c.vz * rz;
  // onde está o carro
  const r = pista.maisPerto(c.x, c.z, 2);
  if (r) {
    const lat = (c.x - r.s.x) * r.s.nx + (c.z - r.s.z) * r.s.nz;
    c.lat = lat;
    c.foraPista = Math.abs(lat) > pista.meia + 0.8;
    c.amostra = r.s;
  }
  c.piso = c.foraPista ? 'fora' : (c.amostra ? c.amostra.piso : 'terra');
  const P = PISOS[c.piso];
  const ader = c.noAr ? 0.05 : P.aderencia;
  const vmax = CARRO.vmax * P.vmax * mult;
  // motor e travão
  if (!c.noAr) {
    if (ent.acel > 0) vLong += CARRO.acel * ent.acel * Math.max(0, 1 - vLong / vmax) * (0.55 + 0.45 * ader) * dt;
    if (ent.trava > 0) {
      if (vLong > 0.5) vLong -= CARRO.trava * ent.trava * (0.5 + 0.5 * ader) * dt;
      else vLong = Math.max(-CARRO.re * 1.4, vLong - CARRO.re * ent.trava * dt);
    }
  }
  // atrito do ar e do piso
  vLong -= vLong * (0.1 + (c.foraPista ? 0.9 : 0)) * dt;
  if (!ent.acel && !ent.trava) vLong -= Math.sign(vLong) * Math.min(Math.abs(vLong), 2.2 * dt);
  // aderência lateral: com o travão de mão ou piso solto, o carro derrapa
  const k = (ent.mao ? 1.2 : 7.5) * ader;
  vLat *= Math.max(0, 1 - k * dt);
  c.derrapa = Math.min(1, Math.abs(vLat) / 8);
  // direção: vira mais devagar a alta velocidade; em derrapagem, a traseira ajuda
  const v = Math.hypot(vLong, vLat);
  const fator = Math.min(1, v / 7) * (1 - 0.5 * Math.min(1, v / 55));
  const alvo = ent.dir * 1.9 * fator * Math.sign(vLong || 1) + (ent.mao ? ent.dir * 0.9 * Math.min(1, v / 15) : 0);
  c.guinada += (alvo - c.guinada) * Math.min(1, 8 * dt);
  if (!c.noAr) c.rumo += c.guinada * dt;
  const nfx = Math.sin(c.rumo), nfz = Math.cos(c.rumo), nrx = Math.cos(c.rumo), nrz = -Math.sin(c.rumo);
  c.vx = nfx * vLong + nrx * vLat; c.vz = nfz * vLong + nrz * vLat;
  c.x += c.vx * dt; c.z += c.vz * dt;
  // vedação: não deixa fugir da pista
  if (c.amostra) {
    const s = c.amostra, lat = (c.x - s.x) * s.nx + (c.z - s.z) * s.nz, lim = pista.meia + 7;
    if (Math.abs(lat) > lim) {
      const sg = Math.sign(lat), fora = Math.abs(lat) - lim;
      c.x -= s.nx * sg * fora; c.z -= s.nz * sg * fora;
      const vn = c.vx * s.nx + c.vz * s.nz;
      if (vn * sg > 0) { c.vx -= s.nx * vn * 1.4; c.vz -= s.nz * vn * 1.4; }
      c.vx *= 0.93; c.vz *= 0.93;
      c.bateu = (c.bateu || 0) + 1;
    }
  }
  // saltos: o carro só cola ao chão se estiver a descer
  const chao = pista.altura(c.x, c.z);
  c.vy -= 22 * dt;
  c.y += c.vy * dt;
  if (c.y <= chao) {
    // velocidade vertical do chão por baixo do carro (para levantar nas lombas)
    const subida = (chao - (c.chaoAnt ?? chao)) / Math.max(dt, 1e-3);
    c.y = chao;
    c.vy = Math.max(0, subida * 0.75);
    c.noAr = false;
  } else c.noAr = c.y - chao > 0.25;
  c.chaoAnt = chao;
  c.vel = Math.hypot(c.vx, c.vz);
  return c;
}

// Avança o índice ao longo da pista e conta as voltas
export function seguirProgresso(c, pista) {
  const N = pista.N;
  let melhor = c.idx, md = Infinity;
  for (let k = -20; k <= 40; k++) {
    const i = (c.idx + k + N) % N, s = pista.amostras[i];
    const d = (s.x - c.x) ** 2 + (s.z - c.z) ** 2;
    if (d < md) { md = d; melhor = i; }
  }
  if (md > 60 * 60) { const r = pista.maisPerto(c.x, c.z, 4); if (r) melhor = r.s.i; }
  const ant = c.idx;
  if (ant > N * 0.8 && melhor < N * 0.2) c.volta++;
  else if (ant < N * 0.2 && melhor > N * 0.8) c.volta--;
  c.idx = melhor;
  c.progresso = c.volta * N + melhor;
  // contra-mão?
  const s = pista.amostras[melhor];
  c.contraMao = c.vel > 5 && (c.vx * s.dx + c.vz * s.dz) < -3;
}

// Condução do computador: segue a pista com uma margem de erro
export function pilotoComputador(c, pista, perfil) {
  const N = pista.N;
  const olhar = Math.round(7 + c.vel * 0.55);
  const alvo = pista.amostras[(c.idx + olhar) % N];
  const tx = alvo.x + alvo.nx * perfil.linha, tz = alvo.z + alvo.nz * perfil.linha;
  const ang = Math.atan2(tx - c.x, tz - c.z);
  let d = ang - c.rumo; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  const vAlvo = pista.amostras[(c.idx + 6) % N].vAlvo * perfil.ritmo * (PISOS[c.piso] ? 0.55 + 0.45 * PISOS[c.piso].aderencia : 1);
  return {
    dir: Math.max(-1, Math.min(1, d * 2.6)),
    acel: c.vel < vAlvo ? 1 : 0,
    trava: c.vel > vAlvo + 5 ? 0.7 : 0,
    mao: Math.abs(d) > 0.5 && c.vel > 18,
  };
}
