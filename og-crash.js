// ===================================================================
// Crash — o multiplicador sobe até rebentar. Recolhe antes!
// Margem da casa 3%: 3% das rondas rebentam logo em 1.00x e o resto
// segue a distribuição clássica (P(chegar a x) = 0.97 / x).
// ===================================================================
(function () {
  const $ = (id) => document.getElementById(id);
  const K = 0.075; // velocidade de subida: 2x ≈ 9 s, 10x ≈ 31 s

  let estado = 'idle'; // idle | running
  let aposta = 0, crashAt = 1, t0 = 0, recolhido = 0, raf = 0;
  let stars = [], particulas = [];

  const multEm = (s) => Math.exp(K * s);
  const tempoPara = (m) => Math.log(m) / K;

  // ---------- desenho ----------
  const cv = () => $('crashCanvas');
  function resize() {
    const c = cv(), r = c.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr; c.height = r.height * dpr;
    c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!stars.length) stars = Array.from({ length: 90 }, () => ({ x: OG.rand(), y: OG.rand(), z: 0.3 + OG.rand() * 0.7 }));
    desenhar(estado === 'running' ? (performance.now() - t0) / 1000 : 0, estado === 'crashed');
  }

  function desenhar(seg, rebentou) {
    const c = cv(); if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.clientWidth, H = c.clientHeight;
    const pad = { l: 48, r: 24, t: 70, b: 34 };
    ctx.clearRect(0, 0, W, H);

    // estrelas (movem-se com o tempo, dá a sensação de voo)
    stars.forEach((s) => {
      const x = ((s.x - seg * 0.02 * s.z) % 1 + 1) % 1, y = ((s.y + seg * 0.035 * s.z) % 1 + 1) % 1;
      ctx.globalAlpha = 0.25 + s.z * 0.55;
      ctx.fillStyle = '#cfe3ff';
      ctx.fillRect(x * W, y * H, s.z * 1.8, s.z * 1.8);
    });
    ctx.globalAlpha = 1;

    const m = multEm(seg);
    const xMax = Math.max(10, seg * 1.2), yMax = Math.max(2, 1 + (m - 1) * 1.25);
    const X = (s) => pad.l + (s / xMax) * (W - pad.l - pad.r);
    const Y = (v) => H - pad.b - ((v - 1) / (yMax - 1)) * (H - pad.t - pad.b);

    // grelha + eixos
    ctx.strokeStyle = 'rgba(160,190,230,0.08)'; ctx.fillStyle = 'rgba(190,210,240,0.55)';
    ctx.font = '600 11px Inter, sans-serif'; ctx.lineWidth = 1;
    const passoY = yMax <= 3 ? 0.5 : yMax <= 6 ? 1 : yMax <= 15 ? 2 : yMax <= 40 ? 5 : 10;
    for (let v = 1; v <= yMax; v += passoY) {
      const y = Y(v); ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText(v.toFixed(v < 10 ? 1 : 0) + 'x', 6, y + 4);
    }
    const passoX = xMax <= 12 ? 2 : xMax <= 30 ? 5 : 10;
    for (let s = passoX; s <= xMax; s += passoX) ctx.fillText(s + 's', X(s) - 8, H - 12);

    if (seg <= 0 && !rebentou) return;

    // curva
    const n = 80, pts = [];
    for (let i = 0; i <= n; i++) { const s = (seg * i) / n; pts.push([X(s), Y(multEm(s))]); }
    const cor = rebentou ? '#ff4d6d' : recolhido ? '#3ddc84' : '#f0c14b';
    const grad = ctx.createLinearGradient(0, H, 0, pad.t);
    grad.addColorStop(0, rebentou ? 'rgba(255,77,109,0.02)' : 'rgba(240,193,75,0.02)');
    grad.addColorStop(1, rebentou ? 'rgba(255,77,109,0.28)' : 'rgba(240,193,75,0.30)');
    ctx.beginPath(); ctx.moveTo(pts[0][0], H - pad.b);
    pts.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.lineTo(pts[n][0], H - pad.b); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = cor; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.shadowColor = cor; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;

    // foguete na ponta (ou explosão)
    const [px, py] = pts[n];
    if (!rebentou) {
      const [qx, qy] = pts[n - 2];
      const ang = Math.atan2(py - qy, px - qx);
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang + Math.PI / 4);
      ctx.font = '30px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🚀', 0, 0); ctx.restore();
      // rasto de fogo
      for (let i = 0; i < 2; i++) particulas.push({ x: px - Math.cos(ang) * 14, y: py - Math.sin(ang) * 14, vx: -Math.cos(ang) * 1.5 + (OG.rand() - 0.5), vy: -Math.sin(ang) * 1.5 + (OG.rand() - 0.5), v: 1, c: OG.rand() < 0.5 ? '#ffb347' : '#ff6b3d', r: 3 + OG.rand() * 3 });
    }
    particulas = particulas.filter((p) => (p.v -= rebentou ? 0.018 : 0.05) > 0);
    particulas.forEach((p) => {
      p.x += p.vx; p.y += p.vy; if (rebentou) p.vy += 0.08;
      ctx.globalAlpha = p.v; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.v, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function explodir() {
    const c = cv(), W = c.clientWidth, H = c.clientHeight;
    const seg = tempoPara(crashAt);
    const xMax = Math.max(10, seg * 1.2), yMax = Math.max(2, 1 + (crashAt - 1) * 1.25);
    const px = 48 + (seg / xMax) * (W - 72), py = H - 34 - ((crashAt - 1) / (yMax - 1)) * (H - 104);
    for (let i = 0; i < 70; i++) {
      const a = OG.rand() * Math.PI * 2, v = 1 + OG.rand() * 6;
      particulas.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, v: 1, c: ['#ff4d6d', '#ffb347', '#ffd166', '#ffffff'][OG.randInt(4)], r: 2 + OG.rand() * 4 });
    }
    let f = 0;
    (function loop() { desenhar(seg, true); if (++f < 70) requestAnimationFrame(loop); })();
  }

  // ---------- jogo ----------
  // Treino: o browser sabe onde rebenta e podes recolher à mão.
  // Ranking: o servidor resolve a ronda logo com a tua recolha automática
  // (é por isso que ela é obrigatória) e o ecrã só mostra o voo.
  let autoServidor = 0, creditoServidor = 0, aIniciar = false;

  function setUI() {
    const jogando = estado === 'running';
    const ranking = OG.emRanking();
    const play = $('crashPlay');
    if (jogando && ranking) {
      play.innerHTML = recolhido ? 'A aguardar…' : 'Recolha auto <small>' + OG.fmtMult(parseFloat($('crashAuto').value) || 0) + '</small>';
      play.disabled = true;
    } else {
      play.textContent = jogando ? (recolhido ? 'A aguardar…' : 'Recolher') : 'Apostar';
      play.disabled = (jogando && !!recolhido) || aIniciar;
    }
    play.classList.toggle('og-play-cash', jogando && !recolhido && !ranking);
    OG.lockBet('crashBet', jogando || aIniciar);
    $('crashAuto').disabled = jogando || aIniciar;
    const nota = $('crashAutoNota');
    if (nota) nota.hidden = !ranking;
  }

  async function iniciar() {
    if (aIniciar || estado === 'running') return;
    const v = OG.readBet('crashBet'); if (!v) return;
    const ranking = OG.emRanking();
    const auto = parseFloat($('crashAuto').value);
    if (ranking && !(auto >= 1.01)) {
      OG.toast('No ranking tens de pôr uma recolha automática (mínimo 1.01x).');
      OG.shake($('crashAuto'));
      return;
    }
    aIniciar = true; setUI();
    let res;
    try {
      res = await OG.jogar('crash', 'iniciar', ranking ? { aposta: v, auto } : { aposta: v });
    } catch (e) {
      aIniciar = false; setUI();
      return;
    }
    aIniciar = false;
    aposta = v; recolhido = 0; particulas = [];
    crashAt = res.view.crashAt;
    autoServidor = ranking ? res.view.recolheu : 0;
    creditoServidor = ranking ? res.credito : 0;
    OG.sound('bet');
    estado = 'running'; t0 = performance.now();
    $('crashMult').className = 'og-crash-mult';
    $('crashStatus').textContent = 'Em voo…';
    setUI();
    loop();
  }

  function mostrarRecolha(mult, ganho) {
    OG.revelarSaldo();
    OG.sound('win');
    OG.winCard($('crashStage'), mult, ganho);
    OG.pushHistory('crash', aposta, ganho - aposta, 'Recolheu ' + OG.fmtMult(mult));
    $('crashStatus').textContent = 'Recolheste a ' + OG.fmtMult(mult) + ' (+' + OG.fmt(ganho - aposta) + ')';
    $('crashMult').classList.add('cash');
    setUI();
  }

  // só no Treino (no Ranking a recolha é a automática)
  async function recolher(mult) {
    if (estado !== 'running' || recolhido || OG.emRanking()) return;
    recolhido = mult;
    setUI();
    try {
      const res = await OG.jogar('crash', 'recolher', { mult });
      mostrarRecolha(res.view.recolheu || mult, res.credito);
    } catch (e) {
      /* o aviso já apareceu */
    }
  }

  function loop() {
    const seg = (performance.now() - t0) / 1000;
    let m = multEm(seg);
    if (!recolhido) {
      if (OG.emRanking()) {
        if (autoServidor && m >= autoServidor) {
          recolhido = autoServidor;
          mostrarRecolha(autoServidor, creditoServidor);
        }
      } else {
        const auto = parseFloat($('crashAuto').value);
        if (auto >= 1.01 && m >= auto && auto <= crashAt) recolher(auto);
      }
    }
    if (m >= crashAt) {
      m = crashAt; estado = 'crashed';
      $('crashMult').textContent = OG.fmtMult(crashAt);
      $('crashMult').className = 'og-crash-mult boom';
      $('crashStatus').textContent = 'Rebentou a ' + OG.fmtMult(crashAt);
      OG.pushRecent('crashRecent', OG.fmtMult(crashAt), crashAt >= 2 ? 'win' : 'lose');
      if (!recolhido) { OG.revelarSaldo(); OG.sound('boom'); OG.pushHistory('crash', aposta, -aposta, 'Rebentou a ' + OG.fmtMult(crashAt)); }
      explodir();
      estado = 'idle'; setUI();
      return;
    }
    $('crashMult').textContent = OG.fmtMult(m);
    if (!recolhido && !OG.emRanking()) $('crashPlay').innerHTML = 'Recolher <small>' + OG.fmt(Math.floor(aposta * m)) + '</small>';
    desenhar(seg, false);
    raf = requestAnimationFrame(loop);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('crashCanvas')) return;
    OG.registarJogo({ emJogo: () => estado === 'running' || aIniciar, reset: setUI });
    resize(); window.addEventListener('resize', resize);
    $('crashPlay').addEventListener('click', () => {
      if (estado === 'running') recolher(Math.floor(multEm((performance.now() - t0) / 1000) * 100) / 100);
      else iniciar();
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('crashPlay').click(); }
    });
    setUI();
  });
})();
