// Bilhar 8 bolas — motor: física, regras, triângulo e computador.
// A física só usa + − × ÷ e raiz quadrada, em passos fixos, para que os
// dois jogadores calculem a mesma jogada (e no fim o anfitrião confirma).

export const W = 1000, H = 500, R = 12.5;          // mesa (área de jogo) e raio da bola
export const COZINHA = W * 0.25;                    // linha de saída
export const PE = { x: W * 0.73, y: H / 2 };        // ponto do triângulo
const PASSO = 1 / 600;                              // segundos por passo
const ATRITO = 210;                                 // desaceleração (unidades/s²)
const E_BOLA = 0.95, E_TABELA = 0.78;
export const VMAX = 2700;

// Bolsos: centro e raio de captura
export const BOLSOS = [
  { x: -6, y: -6, r: 27 }, { x: W / 2, y: -14, r: 22 }, { x: W + 6, y: -6, r: 27 },
  { x: -6, y: H + 6, r: 27 }, { x: W / 2, y: H + 14, r: 22 }, { x: W + 6, y: H + 6, r: 27 },
];
const C = 30, S = 25;                               // abertura dos cantos e dos bolsos do meio
// Tabelas (segmentos); as pontas funcionam como "bicos" dos bolsos
export const TABELAS = [
  [C, 0, W / 2 - S, 0], [W / 2 + S, 0, W - C, 0],
  [C, H, W / 2 - S, H], [W / 2 + S, H, W - C, H],
  [0, C, 0, H - C], [W, C, W, H - C],
  // bocas dos bolsos (um pouco inclinadas para dentro)
  [C, 0, C - 14, -16], [W - C, 0, W - C + 14, -16], [C, H, C - 14, H + 16], [W - C, H, W - C + 14, H + 16],
  [0, C, -16, C - 14], [0, H - C, -16, H - C + 14], [W, C, W + 16, C - 14], [W, H - C, W + 16, H - C + 14],
  [W / 2 - S, 0, W / 2 - S + 4, -18], [W / 2 + S, 0, W / 2 + S - 4, -18],
  [W / 2 - S, H, W / 2 - S + 4, H + 18], [W / 2 + S, H, W / 2 + S - 4, H + 18],
];

export const grupoDe = (n) => (n >= 1 && n <= 7 ? 'lisas' : n >= 9 && n <= 15 ? 'riscadas' : null);

// ── triângulo ────────────────────────────────────────────────────────
// sorte: número inteiro (o anfitrião escolhe e envia, para ser igual nos dois)
export function triangulo(sorte = Date.now()) {
  let s = sorte >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const lisas = [1, 2, 3, 4, 5, 6, 7], riscadas = [9, 10, 11, 12, 13, 14, 15];
  const baralhar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  baralhar(lisas); baralhar(riscadas);
  // cantos de trás: uma lisa e uma riscada; o 8 no meio da 3.ª fila
  const ordem = new Array(15).fill(0);
  ordem[4] = 8;
  const cantoL = rnd() < 0.5;
  ordem[10] = cantoL ? lisas.pop() : riscadas.pop();
  ordem[14] = cantoL ? riscadas.pop() : lisas.pop();
  const resto = baralhar([...lisas, ...riscadas]);
  for (let i = 0; i < 15; i++) if (!ordem[i]) ordem[i] = resto.pop();
  const bolas = [{ n: 0, x: W * 0.22, y: H / 2, vx: 0, vy: 0, dentro: false }];
  const dx = R * 2 * 0.8661, folga = 0.05;
  let k = 0;
  for (let fila = 0; fila < 5; fila++) {
    for (let i = 0; i <= fila; i++) {
      bolas.push({ n: ordem[k++], x: PE.x + fila * (dx + folga), y: PE.y + (i - fila / 2) * (2 * R + folga), vx: 0, vy: 0, dentro: false });
    }
  }
  return bolas;
}

export function copiarBolas(b) { return b.map((o) => ({ n: o.n, x: o.x, y: o.y, vx: 0, vy: 0, dentro: o.dentro })); }

// ── simulação ────────────────────────────────────────────────────────
// Cria uma simulação passo-a-passo de uma tacada.
// tacada: { dx, dy (direção, normalizada), forca 0..1, ex, ey (efeito -1..1) }
export function novaSimulacao(bolas, tacada) {
  const b = copiarBolas(bolas);
  const cue = b.find((o) => o.n === 0);
  const v = tacada.forca * VMAX;
  cue.vx = tacada.dx * v; cue.vy = tacada.dy * v;
  return {
    bolas: b,
    // efeito: (ey > 0 segue, < 0 puxa) aplicado no primeiro choque; ex muda as tabelas
    spin: { x: tacada.dx * v * tacada.ey * 0.55, y: tacada.dy * v * tacada.ey * 0.55, lado: tacada.ex * 0.32 },
    ev: { primeiro: null, tabelaDepois: false, tabelas: 0, encacapadas: [], toques: 0 },
    acabou: false, passos: 0,
  };
}

function choqueTabela(o, sim, eCue) {
  for (const [ax, ay, bx, by] of TABELAS) {
    const ex = bx - ax, ey = by - ay;
    const L2 = ex * ex + ey * ey;
    let t = ((o.x - ax) * ex + (o.y - ay) * ey) / L2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + ex * t, py = ay + ey * t;
    const dx = o.x - px, dy = o.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R || d2 === 0) continue;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
    const vn = o.vx * nx + o.vy * ny;
    o.x = px + nx * R; o.y = py + ny * R;
    if (vn >= 0) continue;
    o.vx -= (1 + E_TABELA) * vn * nx; o.vy -= (1 + E_TABELA) * vn * ny;
    if (eCue && sim.spin.lado) {
      // efeito lateral: empurra ao longo da tabela
      const tx = -ny, ty = nx, f = -vn * sim.spin.lado;
      o.vx += tx * f; o.vy += ty * f;
      sim.spin.lado *= 0.5;
    }
    if (sim.ev.primeiro !== null) sim.ev.tabelaDepois = true;
    sim.ev.tabelas++;
  }
}

export function passo(sim) {
  const b = sim.bolas;
  const dv = ATRITO * PASSO;
  let mexe = false;
  for (const o of b) {
    if (o.dentro) continue;
    const v2 = o.vx * o.vx + o.vy * o.vy;
    if (v2 === 0) continue;
    const v = Math.sqrt(v2);
    if (v <= dv) { o.vx = 0; o.vy = 0; continue; }
    const k = (v - dv) / v;
    o.vx *= k; o.vy *= k;
    o.x += o.vx * PASSO; o.y += o.vy * PASSO;
    mexe = true;
  }
  // o efeito vai-se gastando antes do primeiro choque
  sim.spin.x *= 0.9992; sim.spin.y *= 0.9992;
  // bolas contra bolas
  for (let i = 0; i < b.length; i++) {
    const a = b[i]; if (a.dentro) continue;
    for (let j = i + 1; j < b.length; j++) {
      const c = b[j]; if (c.dentro) continue;
      const dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 >= 4 * R * R || d2 === 0) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
      const sobre = 2 * R - d;
      a.x -= nx * sobre / 2; a.y -= ny * sobre / 2; c.x += nx * sobre / 2; c.y += ny * sobre / 2;
      const vrel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
      if (vrel <= 0) continue;
      const imp = vrel * (1 + E_BOLA) / 2;
      a.vx -= imp * nx; a.vy -= imp * ny; c.vx += imp * nx; c.vy += imp * ny;
      sim.ev.toques++;
      const cue = a.n === 0 ? a : c.n === 0 ? c : null;
      if (cue && sim.ev.primeiro === null) {
        sim.ev.primeiro = (cue === a ? c : a).n;
        // segue / puxa
        cue.vx += sim.spin.x * 0.6; cue.vy += sim.spin.y * 0.6;
        sim.spin.x = 0; sim.spin.y = 0;
      }
      mexe = true;
    }
  }
  // tabelas e bolsos
  for (const o of b) {
    if (o.dentro) continue;
    choqueTabela(o, sim, o.n === 0);
    for (let k = 0; k < BOLSOS.length; k++) {
      const p = BOLSOS[k], dx = o.x - p.x, dy = o.y - p.y;
      if (dx * dx + dy * dy < p.r * p.r) { o.dentro = true; o.vx = 0; o.vy = 0; sim.ev.encacapadas.push({ n: o.n, bolso: k }); break; }
    }
    // saiu da mesa por um canto mal resolvido: conta como no bolso mais perto
    if (!o.dentro && (o.x < -40 || o.x > W + 40 || o.y < -40 || o.y > H + 40)) {
      let melhor = 0, md = Infinity;
      BOLSOS.forEach((p, k) => { const d = (o.x - p.x) ** 2 + (o.y - p.y) ** 2; if (d < md) { md = d; melhor = k; } });
      o.dentro = true; o.vx = 0; o.vy = 0; sim.ev.encacapadas.push({ n: o.n, bolso: melhor });
    }
  }
  sim.passos++;
  if (!mexe || sim.passos > 600 * 40) { sim.acabou = true; for (const o of b) { o.vx = 0; o.vy = 0; } }
  return !sim.acabou;
}

// Corre a tacada até ao fim (para o computador e para confirmar)
export function simularTudo(bolas, tacada) {
  const sim = novaSimulacao(bolas, tacada);
  while (passo(sim));
  return sim;
}

// ── regras ───────────────────────────────────────────────────────────
// estado: { vez, grupos:[g0,g1], aberta, mao (bola na mão), cozinha, saida (1.ª tacada),
//           vencedor, msg, chamado (bolso do 8) }
export function estadoInicial(quemSai = 0) {
  return { vez: quemSai, grupos: [null, null], aberta: true, mao: true, cozinha: true, saida: true, vencedor: null, msg: 'Saída: põe a bola branca atrás da linha e parte o triângulo.', tacadas: 0 };
}
export const restantes = (bolas, g) => bolas.filter((o) => !o.dentro && grupoDe(o.n) === g).length;
export function naOito(estado, bolas, jog) { const g = estado.grupos[jog]; return !!g && restantes(bolas, g) === 0; }

// Bolas a que o jogador da vez pode acertar primeiro
export function alvosLegais(estado, bolas) {
  const j = estado.vez;
  if (estado.aberta || !estado.grupos[j]) return bolas.filter((o) => !o.dentro && o.n !== 0 && o.n !== 8).map((o) => o.n);
  if (naOito(estado, bolas, j)) return [8];
  return bolas.filter((o) => !o.dentro && grupoDe(o.n) === estado.grupos[j]).map((o) => o.n);
}

// Decide o que acontece depois da tacada. Devolve { estado, bolas } novos.
export function aplicarRegras(estadoAntes, bolasAntes, sim, chamado, nomes = ['Jogador 1', 'Jogador 2']) {
  const e = JSON.parse(JSON.stringify(estadoAntes));
  const bolas = copiarBolas(sim.bolas);
  const j = e.vez, o = 1 - j;
  const ev = sim.ev;
  const dentro = ev.encacapadas.map((x) => x.n);
  const branca = dentro.includes(0);
  const oito = ev.encacapadas.find((x) => x.n === 8);
  const estavaNoOito = naOito(estadoAntes, bolasAntes, j);
  const legais = alvosLegais(estadoAntes, bolasAntes);
  let falta = null;
  if (ev.primeiro === null) falta = 'não tocou em nenhuma bola';
  else if (!legais.includes(ev.primeiro)) falta = ev.primeiro === 8 ? 'tocou primeiro na bola 8' : 'tocou primeiro numa bola do adversário';
  else if (branca) falta = 'meteu a bola branca';
  else if (!dentro.length && !ev.tabelaDepois && !estadoAntes.saida) falta = 'nenhuma bola foi à tabela';
  e.tacadas++;
  e.msg = '';
  // bola 8
  if (oito) {
    if (estadoAntes.saida) {
      // 8 na saída: volta ao ponto do triângulo
      const b8 = bolas.find((x) => x.n === 8);
      b8.dentro = false; colocarLivre(bolas, b8, PE.x, PE.y);
      e.msg = 'A bola 8 entrou na saída e voltou para a mesa.';
    } else if (estavaNoOito && !falta && (chamado == null || oito.bolso === chamado)) {
      e.vencedor = j; e.msg = nomes[j] + ' meteu a bola 8 e ganhou!';
      return { estado: e, bolas };
    } else {
      e.vencedor = o;
      e.msg = nomes[j] + (estavaNoOito ? (falta ? ' meteu a 8 com falta (' + falta + ')' : ' meteu a 8 no bolso errado') : ' meteu a bola 8 antes do tempo') + '. Ganha ' + nomes[o] + '.';
      return { estado: e, bolas };
    }
  }
  // grupos: na mesa aberta, a primeira bola metida (sem falta) decide
  const meus = () => (e.grupos[j] ? dentro.filter((n) => grupoDe(n) === e.grupos[j]) : []);
  if (e.aberta && !falta && !estadoAntes.saida) {
    const primeira = ev.encacapadas.find((x) => grupoDe(x.n));
    if (primeira) {
      const g = grupoDe(primeira.n);
      e.grupos[j] = g; e.grupos[o] = g === 'lisas' ? 'riscadas' : 'lisas'; e.aberta = false;
      e.msg = nomes[j] + ' fica com as ' + g + '.';
    }
  }
  const saidaComBolas = estadoAntes.saida && dentro.some((n) => grupoDe(n));
  const continua = !falta && (meus().length > 0 || (e.aberta && saidaComBolas));
  if (branca) { const c = bolas.find((x) => x.n === 0); c.dentro = false; c.x = W * 0.22; c.y = H / 2; }
  e.saida = false; e.cozinha = false;
  if (falta) {
    e.vez = o; e.mao = true;
    e.msg = 'Falta: ' + nomes[j] + ' ' + falta + '. ' + nomes[o] + ' tem a bola na mão.';
  } else if (continua) {
    e.mao = false;
    if (!e.msg) e.msg = nomes[j] + ' continua.';
  } else {
    e.vez = o; e.mao = false;
    if (!e.msg) e.msg = 'Vez de ' + nomes[o] + '.';
  }
  return { estado: e, bolas };
}

// Põe uma bola no sítio livre mais perto de (x, y)
export function colocarLivre(bolas, bola, x, y) {
  for (let r = 0; r < 300; r += 2) {
    for (let k = 0; k < (r ? 16 : 1); k++) {
      const a = (k / 16) * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (posicaoLivre(bolas, px, py, bola)) { bola.x = px; bola.y = py; return; }
    }
  }
}
export function posicaoLivre(bolas, x, y, ignorar, cozinha = false) {
  if (x < R || x > W - R || y < R || y > H - R) return false;
  if (cozinha && x > COZINHA) return false;
  return !bolas.some((o) => o !== ignorar && !o.dentro && (o.x - x) ** 2 + (o.y - y) ** 2 < (2 * R + 0.5) ** 2);
}

// ── mira: onde a branca vai bater ────────────────────────────────────
// Devolve { t, bola (n) ou null, px, py (centro da fantasma), tabela: [nx, ny] }
export function primeiroImpacto(bolas, x, y, dx, dy) {
  let melhor = { t: Infinity, bola: null };
  for (const o of bolas) {
    if (o.dentro || o.n === 0) continue;
    const fx = o.x - x, fy = o.y - y;
    const proj = fx * dx + fy * dy;
    if (proj <= 0) continue;
    const perp2 = fx * fx + fy * fy - proj * proj;
    if (perp2 >= 4 * R * R) continue;
    const t = proj - Math.sqrt(4 * R * R - perp2);
    if (t < melhor.t) melhor = { t, bola: o.n, alvo: o };
  }
  // tabelas (retângulo simples, chega para desenhar)
  const tx = dx > 0 ? (W - R - x) / dx : dx < 0 ? (R - x) / dx : Infinity;
  const ty = dy > 0 ? (H - R - y) / dy : dy < 0 ? (R - y) / dy : Infinity;
  const tt = Math.min(tx, ty);
  if (tt < melhor.t) return { t: tt, bola: null, px: x + dx * tt, py: y + dy * tt, normal: tx < ty ? [-Math.sign(dx), 0] : [0, -Math.sign(dy)] };
  return { t: melhor.t, bola: melhor.bola, alvo: melhor.alvo, px: x + dx * melhor.t, py: y + dy * melhor.t };
}

// ── computador ───────────────────────────────────────────────────────
// nivel: 0 fácil, 1 médio, 2 difícil
const ERRO = [0.045, 0.018, 0.006];
function caminhoLivre(bolas, x1, y1, x2, y2, ignorar) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1;
  for (const o of bolas) {
    if (o.dentro || ignorar.includes(o.n)) continue;
    const t = ((o.x - x1) * dx + (o.y - y1) * dy) / (L * L);
    if (t <= 0 || t >= 1) continue;
    const px = x1 + dx * t, py = y1 + dy * t;
    if ((o.x - px) ** 2 + (o.y - py) ** 2 < (2 * R - 1) ** 2) return false;
  }
  return true;
}
// melhores tacadas possíveis a partir da posição da branca
function candidatas(estado, bolas) {
  const cue = bolas.find((o) => o.n === 0);
  const alvos = alvosLegais(estado, bolas);
  const lista = [];
  for (const n of alvos) {
    const o = bolas.find((b) => b.n === n);
    BOLSOS.forEach((p, k) => {
      // ponto de mira do bolso (um pouco para dentro da mesa)
      const bx = Math.min(W - R, Math.max(R, p.x)), by = Math.min(H - R, Math.max(R, p.y));
      const ox = bx - o.x, oy = by - o.y, oL = Math.sqrt(ox * ox + oy * oy);
      if (oL < 1) return;
      const ux = ox / oL, uy = oy / oL;
      const gx = o.x - ux * 2 * R, gy = o.y - uy * 2 * R;          // bola fantasma
      const cx = gx - cue.x, cy = gy - cue.y, cL = Math.sqrt(cx * cx + cy * cy);
      if (cL < 1) return;
      const dx = cx / cL, dy = cy / cL;
      const cos = dx * ux + dy * uy;                                  // ângulo de corte
      if (cos < 0.25) return;
      if (!caminhoLivre(bolas, cue.x, cue.y, gx, gy, [0, n])) return;
      if (!caminhoLivre(bolas, o.x, o.y, bx, by, [0, n])) return;
      const nota = cos * cos * 3 - (cL + oL) / 900 - (k === 1 || k === 4 ? 0.25 * (1 - Math.abs(uy)) : 0);
      lista.push({ dx, dy, forca: Math.min(1, 0.22 + (cL + oL * 1.4) / 2600 / Math.max(0.35, cos)), nota, bolso: k, n });
    });
  }
  return lista.sort((a, b) => b.nota - a.nota);
}
export function jogadaComputador(estado, bolas, nivel = 1) {
  const cue = bolas.find((o) => o.n === 0);
  let pos = null;
  if (estado.mao) {
    // escolhe onde pôr a branca: experimenta uma grelha
    let melhor = null;
    for (let x = R * 2; x < (estado.cozinha ? COZINHA : W - R * 2); x += 40) {
      for (let y = R * 2; y < H - R * 2; y += 40) {
        if (!posicaoLivre(bolas, x, y, cue, estado.cozinha)) continue;
        const b2 = bolas.map((o) => (o.n === 0 ? { ...o, x, y } : o));
        const c = candidatas(estado, b2)[0];
        if (c && (!melhor || c.nota > melhor.nota)) melhor = { ...c, x, y };
      }
    }
    pos = melhor ? [melhor.x, melhor.y] : [W * 0.22, H / 2];
    if (!posicaoLivre(bolas, pos[0], pos[1], cue, estado.cozinha)) { const t = { ...cue }; colocarLivre(bolas, t, pos[0], pos[1]); pos = [t.x, t.y]; }
  }
  const b2 = pos ? bolas.map((o) => (o.n === 0 ? { ...o, x: pos[0], y: pos[1] } : o)) : bolas;
  if (estado.saida) {
    const c2 = b2.find((o) => o.n === 0);
    const dx = PE.x - c2.x, dy = PE.y - c2.y + (Math.random() - 0.5) * 6, L = Math.sqrt(dx * dx + dy * dy);
    return { pos, tacada: { dx: dx / L, dy: dy / L, forca: 0.95, ex: 0, ey: 0 }, chamado: null };
  }
  const cs = candidatas(estado, b2);
  let escolha = cs[nivel === 0 ? Math.min(cs.length - 1, Math.floor(Math.random() * 3)) : 0];
  if (!escolha) {
    // sem tacada limpa: bate na bola legal mais perto, com força média
    const c2 = b2.find((o) => o.n === 0);
    const alvos = alvosLegais(estado, b2).map((n) => b2.find((o) => o.n === n)).sort((a, b) => ((a.x - c2.x) ** 2 + (a.y - c2.y) ** 2) - ((b.x - c2.x) ** 2 + (b.y - c2.y) ** 2));
    const a = alvos[0] || b2.find((o) => o.n === 8);
    const dx = a.x - c2.x, dy = a.y - c2.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
    escolha = { dx: dx / L, dy: dy / L, forca: 0.45, bolso: null };
  }
  // erro de pontaria conforme o nível
  const err = (Math.random() + Math.random() - 1) * ERRO[nivel];
  const c = Math.cos(err), s = Math.sin(err);
  const dx = escolha.dx * c - escolha.dy * s, dy = escolha.dx * s + escolha.dy * c;
  const L = Math.sqrt(dx * dx + dy * dy);
  return { pos, tacada: { dx: dx / L, dy: dy / L, forca: Math.min(1, escolha.forca * (0.95 + Math.random() * 0.15)), ex: 0, ey: nivel === 2 ? -0.15 : 0 }, chamado: escolha.bolso };
}
