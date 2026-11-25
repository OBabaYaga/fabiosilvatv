// Arena 4v4 — mapa "Docas" (zona portuária ao fim do dia).
// Tudo o que bloqueia é uma caixa alinhada com os eixos (AABB): serve
// para desenhar, para as colisões e para os tiros (raio contra caixa).
// Unidades em metros. x: oeste(-) / este(+), z: sul(-) / norte(+).

export const LIMITES = { x: 36, z: 23 };

// Cada caixa: [cx, cz, largura(x), profundidade(z), altura, y0, tipo]
const C = [];
const caixa = (cx, cz, w, d, h, tipo = 'betao', y0 = 0) => C.push([cx, cz, w, d, h, y0, tipo]);

// ── muros exteriores ──────────────────────────────────────────────
caixa(0, LIMITES.z + 0.5, LIMITES.x * 2 + 2, 1, 7, 'muro');
caixa(0, -LIMITES.z - 0.5, LIMITES.x * 2 + 2, 1, 7, 'muro');
caixa(LIMITES.x + 0.5, 0, 1, LIMITES.z * 2, 7, 'muro');
caixa(-LIMITES.x - 0.5, 0, 1, LIMITES.z * 2, 7, 'muro');

// ── bases (armazéns abertos com 3 saídas) ─────────────────────────
for (const lado of [-1, 1]) {
  const x = lado * 27;
  caixa(x, 9.5, 1, 7, 4, 'armazem');            // parede norte do armazém
  caixa(x, -9.5, 1, 7, 4, 'armazem');           // parede sul
  caixa(x, 0, 1, 6, 4, 'armazem');              // centro (duas portas de 3 m)
  caixa(lado * 31, 13, 9, 1, 4, 'armazem');     // telhado lateral norte
  caixa(lado * 31, -13, 9, 1, 4, 'armazem');
  caixa(lado * 33, 6, 1.2, 1.2, 1.2, 'caixote');
  caixa(lado * 33, -6, 1.2, 1.2, 1.2, 'caixote');
}

// ── via central: contentores ──────────────────────────────────────
caixa(0, 0, 2.6, 7, 2.6, 'cont_laranja');
caixa(0, 0, 2.6, 3, 2.6, 'cont_azul', 2.6);     // em cima do do meio
caixa(-9, 2.5, 6.5, 2.6, 2.6, 'cont_azul');
caixa(9, -2.5, 6.5, 2.6, 2.6, 'cont_laranja');
caixa(-15, -3, 1.2, 1.2, 1.2, 'caixote');
caixa(-14, -3, 1.2, 1.2, 1.2, 'caixote');
caixa(-14.5, -3, 1.2, 1.2, 1.2, 'caixote', 1.2);
caixa(15, 3, 1.2, 1.2, 1.2, 'caixote');
caixa(14, 3, 1.2, 1.2, 1.2, 'caixote');
caixa(14.5, 3, 1.2, 1.2, 1.2, 'caixote', 1.2);

// ── divisórias entre corredores (com passagens) ───────────────────
for (const lado of [-1, 1]) {
  caixa(lado * 6, 7.5, 8, 0.8, 3.6, 'muro');
  caixa(lado * 19, 7.5, 6, 0.8, 3.6, 'muro');
  caixa(lado * 6, -7.5, 8, 0.8, 3.6, 'muro');
  caixa(lado * 19, -7.5, 6, 0.8, 3.6, 'muro');
}

// ── corredor norte: cais com contentores em L ─────────────────────
caixa(-12, 14, 2.6, 6.5, 2.6, 'cont_azul');
caixa(-4, 17, 6.5, 2.6, 2.6, 'cont_laranja');
caixa(5, 12.5, 6.5, 2.6, 2.6, 'cont_azul');
caixa(13, 17, 2.6, 6.5, 2.6, 'cont_laranja');
caixa(0, 20.5, 1.2, 1.2, 1.2, 'caixote');
caixa(-1.2, 20.5, 1.2, 1.2, 1.2, 'caixote');
caixa(19, 11, 1.2, 1.2, 1.2, 'caixote');

// ── corredor sul: pilares e paletes ───────────────────────────────
caixa(-13, -15, 2.6, 6.5, 2.6, 'cont_laranja');
caixa(-5, -12.5, 6.5, 2.6, 2.6, 'cont_azul');
caixa(4, -17, 6.5, 2.6, 2.6, 'cont_laranja');
caixa(12, -14, 2.6, 6.5, 2.6, 'cont_azul');
caixa(-19, -11, 1.2, 1.2, 1.2, 'caixote');
caixa(1.2, -20.5, 1.2, 1.2, 1.2, 'caixote');
caixa(0, -20.5, 1.2, 1.2, 1.2, 'caixote');
for (const x of [-20, -8, 8, 20]) caixa(x, -19, 1, 1, 6, 'pilar');
for (const x of [-20, -8, 8, 20]) caixa(x, 19, 1, 1, 6, 'pilar');

export const CAIXAS = C.map(([cx, cz, w, d, h, y0, tipo]) => ({
  min: [cx - w / 2, y0, cz - d / 2],
  max: [cx + w / 2, y0 + h, cz + d / 2],
  tipo,
}));

// Pontos de nascimento de cada equipa (L = laranja / oeste, A = azul / este)
export const SPAWNS = {
  L: [[-31, 3], [-31, -3], [-33, 1], [-33, -1], [-29.5, 6], [-29.5, -6], [-34, 4], [-34, -4]],
  A: [[31, -3], [31, 3], [33, -1], [33, 1], [29.5, -6], [29.5, 6], [34, -4], [34, 4]],
};
export const OLHAR_INICIAL = { L: -Math.PI / 2, A: Math.PI / 2 }; // yaw a olhar para o centro

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
