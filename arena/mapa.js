// Arena 4v4 — mapas.
// Tudo o que bloqueia é uma caixa alinhada com os eixos (AABB): serve
// para desenhar, para as colisões e para os tiros (raio contra caixa).
// Unidades em metros. x: oeste(-) / este(+), z: sul(-) / norte(+).
// A equipa Laranja começa a oeste (x negativo), a Azul a este.

function construir(limites, muroTipo, alturaMuro, fn) {
  const C = [];
  const caixa = (cx, cz, w, d, h, tipo = 'betao', y0 = 0) => C.push([cx, cz, w, d, h, y0, tipo]);
  caixa(0, limites.z + 0.5, limites.x * 2 + 2, 1, alturaMuro, muroTipo);
  caixa(0, -limites.z - 0.5, limites.x * 2 + 2, 1, alturaMuro, muroTipo);
  caixa(limites.x + 0.5, 0, 1, limites.z * 2, alturaMuro, muroTipo);
  caixa(-limites.x - 0.5, 0, 1, limites.z * 2, alturaMuro, muroTipo);
  fn(caixa);
  return C.map(([cx, cz, w, d, h, y0, tipo]) => ({ min: [cx - w / 2, y0, cz - d / 2], max: [cx + w / 2, y0 + h, cz + d / 2], tipo }));
}
// espelha uma lista de pontos da equipa L para a equipa A
const espelho = (pts) => pts.map(([x, z]) => [-x, -z]);

export const MAPAS = {};

// ── DOCAS: porto ao pôr do sol ───────────────────────────────────────
MAPAS.docas = {
  id: 'docas', nome: 'Docas', desc: 'Porto ao pôr do sol, contentores e três corredores.',
  limites: { x: 36, z: 23 },
  tema: { ceu: [['#141d3f', 0], ['#2a3770', 0.4], ['#7a3b4a', 0.72], ['#ff7a1a', 0.86], ['#ffd34d', 1]], nevoeiro: [0x2a2440, 45, 140], hemi: [0xffd2aa, 0x2a3770, 1.4], sol: [0xffb070, 2.2, [-40, 35, 18]], ambiente: [0x404a70, 0.35], chao: 'chao', agua: true, deco: 'gruas', real: { elevacao: 5, azimute: 290, turbidez: 8, rayleigh: 2.6, mie: 0.01, intensidadeAmbiente: 0.6 }, luzes: [[-22, 0], [22, 0], [0, 10.5], [0, -10.5]], corLuz: 0xffc070 },
};
MAPAS.docas.caixas = construir(MAPAS.docas.limites, 'muro', 7, (caixa) => {
  for (const lado of [-1, 1]) {
    const x = lado * 27;
    caixa(x, 9.5, 1, 7, 4, 'armazem');
    caixa(x, -9.5, 1, 7, 4, 'armazem');
    caixa(x, 0, 1, 6, 4, 'armazem');
    caixa(lado * 31, 13, 9, 1, 4, 'armazem');
    caixa(lado * 31, -13, 9, 1, 4, 'armazem');
    caixa(lado * 33, 6, 1.2, 1.2, 1.2, 'caixote');
    caixa(lado * 33, -6, 1.2, 1.2, 1.2, 'caixote');
  }
  caixa(0, 0, 2.6, 7, 2.6, 'cont_laranja');
  caixa(0, 0, 2.6, 3, 2.6, 'cont_azul', 2.6);
  caixa(-9, 2.5, 6.5, 2.6, 2.6, 'cont_azul');
  caixa(9, -2.5, 6.5, 2.6, 2.6, 'cont_laranja');
  caixa(-15, -3, 1.2, 1.2, 1.2, 'caixote');
  caixa(-14, -3, 1.2, 1.2, 1.2, 'caixote');
  caixa(-14.5, -3, 1.2, 1.2, 1.2, 'caixote', 1.2);
  caixa(15, 3, 1.2, 1.2, 1.2, 'caixote');
  caixa(14, 3, 1.2, 1.2, 1.2, 'caixote');
  caixa(14.5, 3, 1.2, 1.2, 1.2, 'caixote', 1.2);
  for (const lado of [-1, 1]) {
    caixa(lado * 6, 7.5, 8, 0.8, 3.6, 'muro');
    caixa(lado * 19, 7.5, 6, 0.8, 3.6, 'muro');
    caixa(lado * 6, -7.5, 8, 0.8, 3.6, 'muro');
    caixa(lado * 19, -7.5, 6, 0.8, 3.6, 'muro');
  }
  caixa(-12, 14, 2.6, 6.5, 2.6, 'cont_azul');
  caixa(-4, 17, 6.5, 2.6, 2.6, 'cont_laranja');
  caixa(5, 12.5, 6.5, 2.6, 2.6, 'cont_azul');
  caixa(13, 17, 2.6, 6.5, 2.6, 'cont_laranja');
  caixa(0, 20.5, 1.2, 1.2, 1.2, 'caixote');
  caixa(-1.2, 20.5, 1.2, 1.2, 1.2, 'caixote');
  caixa(19, 11, 1.2, 1.2, 1.2, 'caixote');
  caixa(-13, -15, 2.6, 6.5, 2.6, 'cont_laranja');
  caixa(-5, -12.5, 6.5, 2.6, 2.6, 'cont_azul');
  caixa(4, -17, 6.5, 2.6, 2.6, 'cont_laranja');
  caixa(12, -14, 2.6, 6.5, 2.6, 'cont_azul');
  caixa(-19, -11, 1.2, 1.2, 1.2, 'caixote');
  caixa(1.2, -20.5, 1.2, 1.2, 1.2, 'caixote');
  caixa(0, -20.5, 1.2, 1.2, 1.2, 'caixote');
  for (const x of [-20, -8, 8, 20]) caixa(x, -19, 1, 1, 6, 'pilar');
  for (const x of [-20, -8, 8, 20]) caixa(x, 19, 1, 1, 6, 'pilar');
});
MAPAS.docas.spawns = { L: [[-31, 3], [-31, -3], [-33, 1], [-33, -1], [-29.5, 6], [-29.5, -6], [-34, 4], [-34, -4]] };

// ── LISBOA: rua da Baixa à noite ─────────────────────────────────────
// Avenida ao meio com o elétrico, dois becos (norte e sul) atrás de
// quarteirões de prédios, e travessas a ligar tudo.
MAPAS.lisboa = {
  id: 'lisboa', nome: 'Lisboa', desc: 'Rua da Baixa à noite: elétrico, calçada e becos.',
  limites: { x: 34, z: 20 },
  tema: { ceu: [['#05081a', 0], ['#0b1636', 0.55], ['#1f2d5e', 0.85], ['#3b3f6e', 1]], estrelas: true, nevoeiro: [0x101a38, 30, 110], hemi: [0x8fa4ff, 0x1a1a30, 0.9], sol: [0xb8c8ff, 0.7, [25, 40, -15]], ambiente: [0x303a66, 0.45], chao: 'calcada', deco: 'predios', luzes: [[-20, 5.2], [-6, -5.2], [8, 5.2], [22, -5.2], [-11, 16.5], [11, -16.5], [-26, -12], [26, 12]], corLuz: 0xffc36b, intLuz: 11 },
};
MAPAS.lisboa.caixas = construir(MAPAS.lisboa.limites, 'predio_a', 12, (caixa) => {
  // quarteirões (com travessas de 4 m em x = ±11)
  caixa(-18, 10, 10, 6, 10, 'predio_a'); caixa(0, 10, 18, 6, 11.5, 'predio_b'); caixa(18, 10, 10, 6, 9, 'predio_c');
  caixa(-18, -10, 10, 6, 9.5, 'predio_c'); caixa(0, -10, 18, 6, 10.5, 'predio_a'); caixa(18, -10, 10, 6, 11, 'predio_b');
  // avenida: elétrico, quiosque, carros, bancos
  caixa(1, 1.6, 11, 2.6, 3.1, 'eletrico');
  caixa(-13, -2.5, 2.2, 2.2, 2.6, 'quiosque');
  caixa(14, -2.4, 4.4, 1.9, 1.5, 'carro');
  caixa(-6, 3.4, 4.4, 1.9, 1.5, 'carro_b');
  caixa(-22, 0, 0.6, 3, 1.0, 'banco');
  caixa(22, 0, 0.6, 3, 1.0, 'banco');
  caixa(7, -3.6, 2.6, 0.6, 1.0, 'banco');
  // becos: contentores do lixo, carros, andaimes
  caixa(-8, 16.5, 1.6, 1, 1.3, 'lixo'); caixa(-6.2, 16.5, 1.6, 1, 1.3, 'lixo');
  caixa(4, 18, 4.4, 1.9, 1.5, 'carro');
  caixa(15, 15.5, 1.2, 1.2, 1.2, 'caixote'); caixa(16.3, 15.5, 1.2, 1.2, 1.2, 'caixote');
  caixa(6, -16.5, 1.6, 1, 1.3, 'lixo');
  caixa(-4, -18, 4.4, 1.9, 1.5, 'carro_b');
  caixa(-15, -15.5, 1.2, 1.2, 1.2, 'caixote'); caixa(-16.3, -15.5, 1.2, 1.2, 1.2, 'caixote');
  // pilaretes nas travessas (cobertura baixa)
  for (const z of [-1.5, 1.5]) { caixa(-11, z + 10, 0.4, 0.4, 0.9, 'pilarete'); caixa(11, z - 10, 0.4, 0.4, 0.9, 'pilarete'); }
  // bases: esplanadas com floreiras
  for (const lado of [-1, 1]) {
    caixa(lado * 27, 7, 0.8, 4, 1.1, 'floreira'); caixa(lado * 27, -7, 0.8, 4, 1.1, 'floreira');
    caixa(lado * 27, 15, 0.8, 4, 1.1, 'floreira'); caixa(lado * 27, -15, 0.8, 4, 1.1, 'floreira');
  }
});
MAPAS.lisboa.spawns = { L: [[-30, 2], [-30, -2], [-32, 4], [-32, -4], [-29, 6], [-29, -6], [-32.5, 0], [-28, 0]] };

// ── CASINO: sala de jogo (interior) ──────────────────────────────────
// Entrada (Laranja) a oeste, sala VIP (Azul) a este. Filas de slots a
// norte e a sul, mesas e bar ao centro. Combate mais perto.
MAPAS.casino = {
  id: 'casino', nome: 'Casino', desc: 'Sala de jogo fechada: slots, mesas e bar. Combate de perto.',
  limites: { x: 26, z: 17 },
  tema: { interior: 7.2, fundo: 0x120a1e, nevoeiro: [0x1a0f2a, 25, 70], hemi: [0xffd9a0, 0x3a1450, 1.2], sol: [0xffe0b0, 0.5, [0, 30, 0]], ambiente: [0x5a3a7a, 0.55], chao: 'alcatifa', luzes: [[-14, 0], [0, 0], [14, 0], [-8, 10], [8, -10], [-8, -10], [8, 10], [-22.5, 0], [22.5, 0]], corLuz: 0xffcf7a, intLuz: 14, alturaLuz: 6.6 },
};
MAPAS.casino.caixas = construir(MAPAS.casino.limites, 'parede_casino', 7.2, (caixa) => {
  // paredes das bases com duas portas cada
  for (const lado of [-1, 1]) {
    caixa(lado * 19, 14, 0.8, 6, 7.2, 'parede_casino');
    caixa(lado * 19, 0, 0.8, 10, 7.2, 'parede_casino');
    caixa(lado * 19, -14, 0.8, 6, 7.2, 'parede_casino');
  }
  // filas de slots (costas com costas), com uma passagem ao meio
  for (const z of [10.5, -10.5]) {
    for (let x = -14.5; x <= -5.5; x += 1.1) { caixa(x, z + 0.45, 1, 0.9, 2.1, 'slot'); caixa(x, z - 0.45, 1, 0.9, 2.1, 'slot_b'); }
    for (let x = 5.5; x <= 14.5; x += 1.1) { caixa(x, z + 0.45, 1, 0.9, 2.1, 'slot_b'); caixa(x, z - 0.45, 1, 0.9, 2.1, 'slot'); }
  }
  // mesas (dá para disparar por cima, agachado tapa)
  caixa(-6, 4, 3.4, 1.8, 1.0, 'mesa'); caixa(6, -4, 3.4, 1.8, 1.0, 'mesa');
  caixa(-6, -4, 1.8, 3.4, 1.0, 'mesa_roleta'); caixa(6, 4, 1.8, 3.4, 1.0, 'mesa_roleta');
  // bar ao centro com coluna dourada
  caixa(0, 0, 4.5, 2, 1.2, 'balcao'); caixa(0, 0, 1, 1, 7.2, 'pilar_ouro');
  for (const [x, z] of [[-12, 4.5], [12, -4.5], [-12, -4.5], [12, 4.5]]) caixa(x, z, 1, 1, 7.2, 'pilar_ouro');
  // bases: bancada da caixa (entrada) e sofás (VIP)
  caixa(-23.5, 8, 3, 1, 1.2, 'balcao'); caixa(-23.5, -8, 3, 1, 1.2, 'balcao');
  caixa(23.5, 8, 3, 1.2, 0.9, 'sofa'); caixa(23.5, -8, 3, 1.2, 0.9, 'sofa');
});
MAPAS.casino.spawns = { L: [[-23, 2], [-23, -2], [-21, 4.5], [-21, -4.5], [-24.5, 0], [-21, 0], [-24.5, 4], [-24.5, -4]] };

// ── ALDEIA: aldeia alentejana ao meio-dia ────────────────────────────
// Praça com chafariz ao centro, igreja a norte, casas caiadas, muros de
// pedra baixos e um olival em cada base.
MAPAS.aldeia = {
  id: 'aldeia', nome: 'Aldeia', desc: 'Aldeia ao sol: praça, igreja, muros de pedra e olival.',
  limites: { x: 34, z: 22 },
  tema: { ceu: [['#2f7fd6', 0], ['#6fb2ee', 0.6], ['#cfe8ff', 0.9], ['#f4efe0', 1]], nevoeiro: [0xa9c2dc, 140, 360], hemi: [0xdfeeff, 0x9a8460, 0.9], sol: [0xfff1d6, 2.4, [30, 60, 25]], ambiente: [0xb0b8c8, 0.15], chao: 'terra', deco: 'montes', exposicao: 1.0, real: { elevacao: 58, azimute: 140, turbidez: 3, rayleigh: 1.2, mie: 0.004, intensidadeAmbiente: 0.45 } },
};
MAPAS.aldeia.caixas = construir(MAPAS.aldeia.limites, 'muro_pedra_alto', 3.2, (caixa) => {
  const casa = (cx, cz, w, d, h) => { caixa(cx, cz, w, d, h, 'casa'); caixa(cx, cz, w + 0.4, d + 0.4, 0.5, 'telhado', h); };
  // igreja a norte da praça
  caixa(0, 16, 10, 8, 8, 'igreja'); caixa(0, 16, 3, 3, 4, 'igreja', 8);
  // chafariz
  caixa(0, 0, 3.2, 3.2, 0.8, 'pedra'); caixa(0, 0, 0.7, 0.7, 2.2, 'pedra');
  // casas à volta da praça (ruas de 4 m entre elas)
  casa(-12, 8, 7, 5, 4); casa(12, -8, 7, 5, 4);
  casa(-12, -8, 6, 6, 4.5); casa(12, 8, 6, 6, 4.5);
  casa(-12, 17.5, 8, 5, 4); casa(12, -17.5, 8, 5, 4);
  casa(-3, -15, 6, 5, 3.8); casa(9, 17.5, 6, 5, 3.8);
  // muros de pedra baixos (cobertura; salta-se por cima)
  caixa(-6, 3.5, 4, 0.6, 1.05, 'pedra'); caixa(6, -3.5, 4, 0.6, 1.05, 'pedra');
  caixa(-20, 0, 0.6, 6, 1.05, 'pedra'); caixa(20, 0, 0.6, 6, 1.05, 'pedra');
  caixa(-20, 13, 0.6, 5, 1.05, 'pedra'); caixa(20, -13, 0.6, 5, 1.05, 'pedra');
  // fardos de palha e uma carroça
  caixa(5, 7, 1.6, 1.1, 1.1, 'fardo'); caixa(-5, -7, 1.6, 1.1, 1.1, 'fardo');
  caixa(-22, -16, 1.6, 1.1, 1.1, 'fardo'); caixa(-22, -16, 1.6, 1.1, 1.1, 'fardo', 1.1);
  caixa(22, 16, 1.6, 1.1, 1.1, 'fardo'); caixa(22, 16, 1.6, 1.1, 1.1, 'fardo', 1.1);
  caixa(16, 0, 3.2, 1.6, 1.3, 'carroca');
  // olival nas bases (troncos; a copa fica acima da cabeça)
  for (const lado of [-1, 1]) {
    for (const [x, z] of [[27, 9], [31, 14], [27, -9], [31, -14], [24, 18], [24, -18]]) {
      caixa(lado * x, lado * z, 0.6, 0.6, 2.4, 'tronco'); caixa(lado * x, lado * z, 3, 3, 1.6, 'copa', 2.4);
    }
  }
});
MAPAS.aldeia.spawns = { L: [[-30, 2], [-30, -2], [-32, 4.5], [-32, -4.5], [-28, 5], [-28, -5], [-33, 0], [-27, 0]] };

for (const m of Object.values(MAPAS)) { if (!m.spawns.A) m.spawns.A = espelho(m.spawns.L); }

// Mapa ativo (as variáveis abaixo mudam quando se troca de mapa)
export let MAPA, LIMITES, CAIXAS, SPAWNS;
export const OLHAR_INICIAL = { L: -Math.PI / 2, A: Math.PI / 2 }; // a olhar para o centro
export function usarMapa(id) {
  MAPA = MAPAS[id] || MAPAS.docas;
  LIMITES = MAPA.limites; CAIXAS = MAPA.caixas; SPAWNS = MAPA.spawns;
  return MAPA;
}
usarMapa('docas');

// Raio contra caixa (método das lajes). Devolve a distância ou Infinity.
export function raioCaixa(o, d, min, max, tMax = Infinity) {
  let t0 = 0, t1 = tMax;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < min[i] || o[i] > max[i]) return Infinity;
      continue;
    }
    let a = (min[i] - o[i]) / d[i];
    let b = (max[i] - o[i]) / d[i];
    if (a > b) { const t = a; a = b; b = t; }
    if (a > t0) t0 = a;
    if (b < t1) t1 = b;
    if (t0 > t1) return Infinity;
  }
  return t0;
}

// Primeiro obstáculo do mapa no caminho do raio (inclui o chão)
export function raioMapa(o, d, tMax = 200) {
  let melhor = tMax;
  if (d[1] < -1e-6) { const t = -o[1] / d[1]; if (t >= 0 && t < melhor) melhor = t; }
  for (const c of CAIXAS) {
    const t = raioCaixa(o, d, c.min, c.max, melhor);
    if (t < melhor) melhor = t;
  }
  return melhor;
}

// Há linha de vista entre dois pontos?
export function visivel(a, b) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(d[0], d[1], d[2]) || 1;
  d[0] /= L; d[1] /= L; d[2] /= L;
  return raioMapa(a, d, L) >= L - 0.05;
}

// ── jogador: colisões ─────────────────────────────────────────────
export const RAIO = 0.35;
export const ALTURA = { pe: 1.8, agachado: 1.25 };
export const OLHOS = { pe: 1.65, agachado: 1.1 };

function sobrepoe(p, h, c) {
  return p[0] + RAIO > c.min[0] && p[0] - RAIO < c.max[0] &&
         p[2] + RAIO > c.min[2] && p[2] - RAIO < c.max[2] &&
         p[1] + h > c.min[1] && p[1] < c.max[1];
}

// Move o jogador (pés em p) com velocidade v durante dt. Altera p e v.
// Devolve true se estiver no chão.
export function mover(p, v, dt, h) {
  let noChao = false;
  // eixo a eixo: resolver cada um em separado dá o "deslizar" nas paredes
  for (const eixo of [0, 2]) {
    p[eixo] += v[eixo] * dt;
    for (const c of CAIXAS) {
      if (!sobrepoe(p, h, c)) continue;
      // degrau baixo (até 0.45 m): sobe em vez de bater
      const degrau = c.max[1] - p[1];
      if (degrau > 0 && degrau <= 0.45 && !CAIXAS.some((o) => o !== c && sobrepoe([p[0], c.max[1] + 0.01, p[2]], h, o))) {
        p[1] = c.max[1];
        continue;
      }
      if (v[eixo] > 0) p[eixo] = c.min[eixo] - RAIO - 1e-4;
      else if (v[eixo] < 0) p[eixo] = c.max[eixo] + RAIO + 1e-4;
      else {
        // já estava dentro (ex.: levantou-se debaixo de algo): empurra para o lado mais perto
        const a = p[eixo] - (c.min[eixo] - RAIO), b = (c.max[eixo] + RAIO) - p[eixo];
        p[eixo] = a < b ? c.min[eixo] - RAIO - 1e-4 : c.max[eixo] + RAIO + 1e-4;
      }
      v[eixo] = 0;
    }
  }
  p[1] += v[1] * dt;
  if (p[1] <= 0) { p[1] = 0; v[1] = 0; noChao = true; }
  for (const c of CAIXAS) {
    if (!sobrepoe(p, h, c)) continue;
    if (v[1] <= 0) { p[1] = c.max[1]; noChao = true; }
    else p[1] = c.min[1] - h - 1e-4;
    v[1] = 0;
  }
  p[0] = Math.max(-LIMITES.x + RAIO, Math.min(LIMITES.x - RAIO, p[0]));
  p[2] = Math.max(-LIMITES.z + RAIO, Math.min(LIMITES.z - RAIO, p[2]));
  return noChao;
}

// Há espaço para ficar de pé?
export function cabeDePe(p) {
  return !CAIXAS.some((c) => sobrepoe(p, ALTURA.pe, c));
}

// Zonas de dano do jogador (pés em p, a olhar para yaw), relativo ao mundo.
// Simplificado: caixas alinhadas com os eixos (o corpo é quase cilíndrico).
export function hitboxes(p, agachado, folga = 0) {
  const h = agachado ? ALTURA.agachado : ALTURA.pe;
  const cab = agachado ? 1.0 : 1.5;
  const f = folga;
  return [
    { zona: 'cabeca', min: [p[0] - 0.17 - f, p[1] + cab - f, p[2] - 0.17 - f], max: [p[0] + 0.17 + f, p[1] + h + 0.05 + f, p[2] + 0.17 + f] },
    { zona: 'corpo', min: [p[0] - 0.3 - f, p[1] + h * 0.45 - f, p[2] - 0.3 - f], max: [p[0] + 0.3 + f, p[1] + cab + f, p[2] + 0.3 + f] },
    { zona: 'pernas', min: [p[0] - 0.25 - f, p[1] - f, p[2] - 0.25 - f], max: [p[0] + 0.25 + f, p[1] + h * 0.45 + f, p[2] + 0.25 + f] },
  ];
}

// Raio contra um jogador: devolve { t, zona } ou null
export function raioJogador(o, d, p, agachado, folga = 0, tMax = 200) {
  let melhor = null;
  for (const hb of hitboxes(p, agachado, folga)) {
    const t = raioCaixa(o, d, hb.min, hb.max, tMax);
    if (t < tMax && (!melhor || t < melhor.t)) melhor = { t, zona: hb.zona };
  }
  return melhor;
}
