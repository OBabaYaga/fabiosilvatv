// ===================================================================
// Roleta europeia (um só zero). Pagamentos normais de casino:
// número 35:1, dúzia/coluna 2:1, vermelho/preto/par/ímpar/1-18/19-36 1:1.
// ===================================================================
(function () {
  const $ = (id) => document.getElementById(id);
  const RODA = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const VERMELHOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const FICHAS = [1, 5, 10, 25, 100, 500];

  let ficha = 10;
  let apostas = {}; // chave -> valor
  let historicoApostas = []; // para "desfazer"
  let ultimasApostas = null;
  let aGirar = false;
  let anguloRoda = 0;

  const cor = (n) => (n === 0 ? 'verde' : VERMELHOS.has(n) ? 'vermelho' : 'preto');

  // Que números cobre cada aposta e quanto paga (x vezes, além da aposta)
  function cobre(chave) {
    const [tipo, v] = chave.split(':');
    const nums = [];
    if (tipo === 'n') nums.push(+v);
    else for (let n = 1; n <= 36; n++) {
      if (tipo === 'duzia' && Math.ceil(n / 12) === +v) nums.push(n);
      if (tipo === 'coluna' && ((n - 1) % 3) + 1 === +v) nums.push(n);
      if (tipo === 'cor' && cor(n) === v) nums.push(n);
      if (tipo === 'par' && (v === 'par' ? n % 2 === 0 : n % 2 === 1)) nums.push(n);
      if (tipo === 'metade' && (v === '1' ? n <= 18 : n >= 19)) nums.push(n);
    }
    const paga = tipo === 'n' ? 35 : tipo === 'duzia' || tipo === 'coluna' ? 2 : 1;
    return { nums, paga };
  }

  // ---------- mesa ----------
  function construirMesa() {
    const cel = (chave, txt, cls) => `<button type="button" class="og-rl-cell ${cls || ''}" data-k="${chave}"><span>${txt}</span></button>`;
    let numeros = '';
    for (let linha = 3; linha >= 1; linha--) {
      for (let col = 0; col < 12; col++) {
        const n = col * 3 + linha;
        numeros += cel('n:' + n, n, cor(n));
      }
      numeros += cel('coluna:' + linha, '2:1', 'out col');
    }
    $('rlBoard').innerHTML = `
      <div class="og-rl-zero">${cel('n:0', '0', 'verde zero')}</div>
      <div class="og-rl-nums">${numeros}</div>
      <div class="og-rl-dozens">${cel('duzia:1', '1 a 12', 'out')}${cel('duzia:2', '13 a 24', 'out')}${cel('duzia:3', '25 a 36', 'out')}</div>
      <div class="og-rl-outs">${cel('metade:1', '1 a 18', 'out')}${cel('par:par', 'Par', 'out')}${cel('cor:vermelho', '<i class="og-rl-diamond red"></i>', 'out')}${cel('cor:preto', '<i class="og-rl-diamond"></i>', 'out')}${cel('par:impar', 'Ímpar', 'out')}${cel('metade:2', '19 a 36', 'out')}</div>`;
    $('rlBoard').querySelectorAll('.og-rl-cell').forEach((b) => {
      b.addEventListener('click', () => colocar(b.dataset.k));
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); tirar(b.dataset.k); });
      b.addEventListener('mouseenter', () => realcar(b.dataset.k, true));
      b.addEventListener('mouseleave', () => realcar(b.dataset.k, false));
    });
  }
  function realcar(chave, sim) {
    if (chave.startsWith('n:')) return;
    cobre(chave).nums.forEach((n) => { const c = $('rlBoard').querySelector(`[data-k="n:${n}"]`); if (c) c.classList.toggle('hover', sim); });
  }
  function totalApostado() {
    return Object.values(apostas).reduce((s, v) => s + v, 0);
  }
  function pintarFichas() {
    $('rlBoard').querySelectorAll('.og-rl-cell').forEach((b) => {
      const v = apostas[b.dataset.k];
      let f = b.querySelector('.og-chip');
      if (v) {
        if (!f) { f = document.createElement('em'); f.className = 'og-chip'; b.appendChild(f); }
        f.textContent = v >= 1000 ? Math.round(v / 100) / 10 + 'k' : v;
        f.dataset.v = v >= 500 ? 500 : v >= 100 ? 100 : v >= 25 ? 25 : v >= 10 ? 10 : v >= 5 ? 5 : 1;
      } else if (f) f.remove();
    });
    $('rlTotal').textContent = OG.fmt(totalApostado());
    $('rlPlay').disabled = aGirar || !totalApostado();
    $('rlUndo').disabled = aGirar || !historicoApostas.length;
    $('rlClear').disabled = aGirar || !totalApostado();
    $('rlRepeat').disabled = aGirar || !ultimasApostas || !!totalApostado();
  }
  function colocar(chave) {
    if (aGirar) return;
    if (totalApostado() + ficha > OG.getBalance()) { OG.toast('Não tens fichas suficientes.'); return; }
    apostas[chave] = (apostas[chave] || 0) + ficha;
    historicoApostas.push([chave, ficha]);
    OG.sound('tick');
    limparResultado();
    pintarFichas();
  }
  function tirar(chave) {
    if (aGirar || !apostas[chave]) return;
    delete apostas[chave];
    historicoApostas = historicoApostas.filter(([k]) => k !== chave);
    pintarFichas();
  }
  function desfazer() {
    const ult = historicoApostas.pop(); if (!ult) return;
    apostas[ult[0]] -= ult[1];
    if (apostas[ult[0]] <= 0) delete apostas[ult[0]];
    pintarFichas();
  }
  function limpar() { apostas = {}; historicoApostas = []; pintarFichas(); }
  function repetir() {
    if (!ultimasApostas) return;
    const total = Object.values(ultimasApostas).reduce((s, v) => s + v, 0);
    if (total > OG.getBalance()) { OG.toast('Não tens fichas suficientes para repetir.'); return; }
    apostas = { ...ultimasApostas };
    historicoApostas = Object.entries(apostas);
    pintarFichas();
  }
  function limparResultado() {
    $('rlBoard').querySelectorAll('.win-cell').forEach((c) => c.classList.remove('win-cell'));
  }

  // ---------- roda ----------
  function desenharRoda(angRoda, angBola, raioBola) {
    const c = $('rlWheel'), ctx = c.getContext('2d');
    const S = c.clientWidth, R = S / 2;
    ctx.clearRect(0, 0, S, S);
    ctx.save(); ctx.translate(R, R);
    // aro
    let g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
    g.addColorStop(0, '#2b1a0c'); g.addColorStop(0.86, '#5a3a1a'); g.addColorStop(0.93, '#c99a4a'); g.addColorStop(1, '#3d2610');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    // casas
    ctx.rotate(angRoda);
    const a = (Math.PI * 2) / 37, rExt = R * 0.84, rInt = R * 0.56;
    RODA.forEach((n, i) => {
      const a0 = i * a - a / 2 - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a0) * rInt, Math.sin(a0) * rInt);
      ctx.arc(0, 0, rExt, a0, a0 + a); ctx.arc(0, 0, rInt, a0 + a, a0, true); ctx.closePath();
      ctx.fillStyle = n === 0 ? '#11a85a' : VERMELHOS.has(n) ? '#d6283f' : '#151a22'; ctx.fill();
      ctx.strokeStyle = 'rgba(240,193,75,0.55)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); ctx.rotate(a0 + a / 2 + Math.PI / 2);
      ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.max(9, R * 0.075)}px Inter, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(n, 0, -rExt + R * 0.1); ctx.restore();
    });
    // centro
    g = ctx.createRadialGradient(0, 0, 2, 0, 0, rInt);
    g.addColorStop(0, '#f6d77a'); g.addColorStop(0.25, '#8a6326'); g.addColorStop(0.3, '#1d2533'); g.addColorStop(1, '#0d131c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rInt, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = '#c99a4a'; ctx.fillRect(-2, -rInt * 0.75, 4, rInt * 0.6); }
    ctx.restore();
    // bola
    if (angBola != null) {
      const rb = R * raioBola;
      const x = R + Math.cos(angBola) * rb, y = R + Math.sin(angBola) * rb;
      const gb = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, R * 0.04);
      gb.addColorStop(0, '#ffffff'); gb.addColorStop(1, '#a9b4c4');
      ctx.fillStyle = gb; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(x, y, R * 0.035, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
  }
  function resize() {
    const c = $('rlWheel'), dpr = window.devicePixelRatio || 1, S = c.parentElement.clientWidth;
    c.style.width = S + 'px'; c.style.height = S + 'px'; c.width = S * dpr; c.height = S * dpr;
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    desenharRoda(anguloRoda, null);
  }

  function girar() {
    const total = totalApostado();
    if (aGirar || !total) return;
    if (total > OG.getBalance()) { OG.toast('Não tens fichas suficientes.'); return; }
    aGirar = true;
    OG.adjust(-total); OG.sound('bet');
    ultimasApostas = { ...apostas };
    pintarFichas();
    limparResultado();
    const resultado = OG.randInt(37);
    const idx = RODA.indexOf(resultado);
    const a = (Math.PI * 2) / 37;
    // a roda roda para a direita; a bola para a esquerda e cai na casa
    const dur = 5200, t0 = performance.now();
    const rodaIni = anguloRoda, rodaFim = rodaIni + Math.PI * 2 * 3 + OG.rand() * Math.PI;
    const anguloFinalCasa = rodaFim + idx * a - Math.PI / 2; // posição da casa no fim (coord. do ecrã)
    const bolaFim = anguloFinalCasa - Math.PI * 2 * 5;
    const bolaIni = bolaFim + Math.PI * 2 * 9;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    let ultimoTick = 0;
    (function frame(agora) {
      const p = Math.min(1, (agora - t0) / dur);
      const e = ease(p);
      anguloRoda = rodaIni + (rodaFim - rodaIni) * e;
      const bola = bolaIni + (bolaFim - bolaIni) * ease(Math.min(1, p * 1.08));
      const raio = p < 0.6 ? 0.9 : 0.9 - ((p - 0.6) / 0.4) * 0.2 + Math.sin(p * 60) * 0.01 * (1 - p);
      desenharRoda(anguloRoda, bola, Math.max(0.7, raio));
      if (agora - ultimoTick > 60 + p * 180 && p < 0.97) { ultimoTick = agora; OG.sound('tick'); }
      if (p < 1) requestAnimationFrame(frame);
      else terminar(resultado);
    })(t0);
  }

  function terminar(n) {
    let devolvido = 0;
    const etiquetas = [];
    Object.entries(apostas).forEach(([k, v]) => {
      const { nums, paga } = cobre(k);
      if (nums.includes(n)) { devolvido += v * (paga + 1); etiquetas.push(k); }
    });
    const total = totalApostado();
    if (devolvido) OG.adjust(devolvido);
    const cel = $('rlBoard').querySelector(`[data-k="n:${n}"]`);
    if (cel) cel.classList.add('win-cell');
    etiquetas.forEach((k) => { const c = $('rlBoard').querySelector(`[data-k="${k}"]`); if (c) c.classList.add('win-cell'); });
    const res = $('rlResult');
    res.className = 'og-rl-result show ' + cor(n);
    res.textContent = n;
    const liquido = devolvido - total;
    if (liquido > 0) { OG.sound('win'); OG.winCard($('rlStage'), devolvido / total, devolvido); if (devolvido / total >= 10) OG.confetti($('rlStage')); }
    else if (liquido < 0) OG.sound('lose');
    OG.pushRecent('rlRecent', String(n), cor(n));
    OG.pushHistory('roulette', total, liquido, `Saiu ${n} (${cor(n)})`);
    apostas = {}; historicoApostas = [];
    aGirar = false;
    pintarFichas();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('rlBoard')) return;
    construirMesa();
    $('rlChips').innerHTML = FICHAS.map((v) => `<button type="button" class="og-chip og-chip-btn${v === ficha ? ' sel' : ''}" data-v="${v}">${v}</button>`).join('');
    $('rlChips').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      ficha = +b.dataset.v;
      $('rlChips').querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
      OG.sound('tick');
    }));
    $('rlPlay').addEventListener('click', girar);
    $('rlUndo').addEventListener('click', desfazer);
    $('rlClear').addEventListener('click', limpar);
    $('rlRepeat').addEventListener('click', repetir);
    resize(); window.addEventListener('resize', resize);
    pintarFichas();
  });
})();
