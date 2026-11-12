// ===================================================================
// Plinko — a bola cai pelos pinos e acaba num multiplicador.
// Tabelas iguais às dos "originals" (retorno teórico ≈ 99%).
// ===================================================================
(function () {
  const $ = (id) => document.getElementById(id);
  const TABELAS = {
    8: { baixo: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6], medio: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13], alto: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29] },
    12: { baixo: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10], medio: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33], alto: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170] },
    16: { baixo: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16], medio: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110], alto: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000] },
  };
  const PASSO_MS = 95;

  let linhas = 16, risco = 'medio';
  let bolas = [];
  let brilho = []; // pinos tocados (para brilharem)
  let raf = 0;
  let geo = null;

  const mults = () => TABELAS[linhas][risco];

  function corBalde(i, n) {
    // vermelho nas pontas → amarelo no meio
    const d = Math.abs(i - n / 2) / (n / 2);
    const h = 48 - d * 48; // 48 = amarelo, 0 = vermelho
    return `hsl(${h}, 95%, ${52 + (1 - d) * 4}%)`;
  }

  function construirBaldes() {
    const m = mults();
    $('plinkoBuckets').innerHTML = m
      .map((v, i) => `<span class="og-bucket" data-i="${i}" style="--c:${corBalde(i, m.length - 1)}">${v >= 100 ? v : v}${v < 1000 ? 'x' : ''}</span>`)
      .join('');
  }

  function geometria() {
    const c = $('plinkoCanvas');
    const W = c.clientWidth, H = c.clientHeight;
    const gap = Math.min(W / (linhas + 2.2), (H - 30) / (linhas + 0.6));
    const topo = 22;
    const larguraBaldes = gap * (linhas + 1);
    $('plinkoBuckets').style.width = larguraBaldes + 'px';
    return { W, H, gap, topo, cx: W / 2 };
  }
  function pino(r, j) {
    const { gap, topo, cx } = geo;
    return { x: cx + (j - (r + 2) / 2) * gap, y: topo + r * gap };
  }

  function resize() {
    const c = $('plinkoCanvas'), r = c.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const H = Math.min(r.width * 0.92, 560);
    c.style.height = H + 'px'; c.style.width = r.width + 'px';
    c.width = r.width * dpr; c.height = H * dpr;
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    geo = geometria();
    desenhar();
  }

  function desenhar() {
    const c = $('plinkoCanvas'), ctx = c.getContext('2d');
    ctx.clearRect(0, 0, geo.W, geo.H);
    const agora = performance.now();
    const raio = Math.max(2.4, geo.gap * 0.1);
    for (let r = 0; r < linhas; r++) {
      for (let j = 0; j < r + 3; j++) {
        const p = pino(r, j);
        const b = brilho.find((x) => x.r === r && x.j === j && agora - x.t < 250);
        ctx.beginPath(); ctx.arc(p.x, p.y, b ? raio * 1.5 : raio, 0, Math.PI * 2);
        ctx.fillStyle = b ? '#ffffff' : 'rgba(225,235,250,0.92)';
        if (b) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12; }
        ctx.fill(); ctx.shadowBlur = 0;
      }
    }
    brilho = brilho.filter((x) => agora - x.t < 250);

    const rBola = Math.max(4, geo.gap * 0.22);
    bolas.forEach((b) => {
      const t = (agora - b.t0) / PASSO_MS;
      const seg = Math.min(Math.floor(t), linhas);
      const f = Math.min(1, t - seg);
      let x, y;
      if (seg >= linhas) {
        x = b.xs[linhas]; y = geo.topo + (linhas - 0.4) * geo.gap;
      } else {
        const x0 = b.xs[seg], x1 = b.xs[seg + 1];
        const y0 = geo.topo + (seg - 0.75) * geo.gap, y1 = geo.topo + (seg + 0.25) * geo.gap;
        x = x0 + (x1 - x0) * f;
        y = y0 + (y1 - y0) * f - Math.sin(f * Math.PI) * geo.gap * 0.35;
        if (seg !== b.ultimo) {
          b.ultimo = seg;
          brilho.push({ r: seg, j: b.ks[seg] + 1, t: agora });
          OG.sound('peg');
        }
      }
      const g = ctx.createRadialGradient(x - rBola * 0.35, y - rBola * 0.35, 1, x, y, rBola);
      g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#f0c14b'); g.addColorStop(1, '#c7881a');
      ctx.beginPath(); ctx.arc(x, y, rBola, 0, Math.PI * 2); ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(240,193,75,0.6)'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      if (t >= linhas + 0.3 && !b.pago) { b.pago = true; aterrar(b); }
    });
    bolas = bolas.filter((b) => !b.pago);
    if (bolas.length || brilho.length) raf = requestAnimationFrame(desenhar);
    else raf = 0;
    bloquear(bolas.length > 0 || pendentes > 0);
  }

  let pendentes = 0;
  async function lancar() {
    const aposta = OG.readBet('plinkoBet'); if (!aposta) return;
    const l = linhas, rk = risco;
    pendentes++;
    bloquear(true);
    let res;
    try {
      res = await OG.jogar('plinko', 'iniciar', { aposta, linhas: l, risco: rk });
    } catch (e) {
      pendentes--;
      return;
    }
    pendentes--;
    if (l !== linhas) { OG.revelarSaldo(); return; }
    OG.sound('bet');
    const passos = res.view.passos;
    const xs = [geo.cx];
    const ks = [];
    let k = 0;
    for (let r = 0; r < linhas; r++) {
      ks.push(k);
      k += passos[r];
      xs.push(geo.cx + (k - (r + 1) / 2) * geo.gap);
    }
    bolas.push({ aposta, xs, ks, balde: res.view.balde, mult: res.view.mult, ganho: res.credito, risco: rk, t0: performance.now(), ultimo: -1, pago: false });
    if (!raf) raf = requestAnimationFrame(desenhar);
  }

  function aterrar(b) {
    const m = b.mult;
    const ganho = b.ganho;
    if (!bolas.some((x) => x !== b && !x.pago)) OG.revelarSaldo();
    else OG.renderBalance();
    const el = $('plinkoBuckets').querySelector(`[data-i="${b.balde}"]`);
    if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
    OG.sound(m >= 1 ? (m >= 3 ? 'win' : 'gem') : 'tick');
    if (m >= 10) { OG.winCard($('plinkoStage'), m, ganho); if (m >= 100) OG.confetti($('plinkoStage')); }
    OG.pushRecent('plinkoRecent', m + 'x', m >= 1 ? 'win' : 'lose');
    OG.pushHistory('plinko', b.aposta, ganho - b.aposta, `${m}x · ${b.xs.length - 1} linhas, risco ${b.risco}`);
  }

  function bloquear(sim) {
    $('plinkoRows').disabled = sim;
    $('plinkoRisk').disabled = sim;
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('plinkoCanvas')) return;
    OG.registarJogo({ emJogo: () => bolas.length > 0 || pendentes > 0 });
    construirBaldes(); resize();
    window.addEventListener('resize', resize);
    $('plinkoRows').addEventListener('change', (e) => { linhas = +e.target.value; construirBaldes(); resize(); });
    $('plinkoRisk').addEventListener('change', (e) => { risco = e.target.value; construirBaldes(); });
    $('plinkoPlay').addEventListener('click', lancar);
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); lancar(); }
    });
  });
})();
