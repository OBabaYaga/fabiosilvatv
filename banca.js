/* Gestão de Banca — calculadora para apostas desportivas.
   Tudo corre no browser; o plano e o diário ficam em localStorage. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const K_PLANO = 'fstv_banca_plano', K_DIARIO = 'fstv_banca_diario', K_TAB = 'fstv_banca_tab';
  const ler = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const num = (v) => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
  const eur = (v) => (Number.isFinite(v) ? v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');
  const pct = (v, c = 1) => (Number.isFinite(v) ? (v * 100).toLocaleString('pt-PT', { minimumFractionDigits: c, maximumFractionDigits: c }) + '%' : '—');
  const dec = (v, c = 2) => (Number.isFinite(v) ? v.toLocaleString('pt-PT', { minimumFractionDigits: c, maximumFractionDigits: c }) : '—');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hoje = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const toast = (t) => { const el = $('bcToast'); if (!el) return; el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200); };
  const sinal = (el, v) => { el.classList.toggle('pos', v > 0); el.classList.toggle('neg', v < 0); };

  /* ---------- estado ---------- */
  const plano = Object.assign({ banca: 500, pct: 2, stop: 10 }, ler(K_PLANO, {}));
  let diario = ler(K_DIARIO, []);
  if (!Array.isArray(diario)) diario = [];

  const lucroAposta = (a) => {
    if (a.res === 'ganha') return a.stake * (a.odd - 1);
    if (a.res === 'perdida') return -a.stake;
    if (a.res === 'cashout') return (num(a.cash) || 0) - a.stake;
    return 0; // pendente / anulada
  };
  const lucroTotal = () => diario.reduce((s, a) => s + lucroAposta(a), 0);
  const bancaAtual = () => plano.banca + lucroTotal();
  const unidade = () => Math.max(0, bancaAtual()) * plano.pct / 100;

  /* ---------- tabs ---------- */
  const tabs = document.querySelectorAll('.bc-tabs button');
  const mostrar = (t) => {
    tabs.forEach((b) => { const on = b.dataset.tab === t; b.classList.toggle('ativo', on); b.setAttribute('aria-selected', on); });
    document.querySelectorAll('.bc-sec').forEach((s) => { s.hidden = s.dataset.sec !== t; });
    gravar(K_TAB, t);
    if (t === 'simulador' && !simulado) simular();
    if (t === 'diario') desenharDiario();
  };
  tabs.forEach((b) => b.addEventListener('click', () => { mostrar(b.dataset.tab); history.replaceState(null, '', '#' + b.dataset.tab); }));

  /* ---------- risco de uma aposta ---------- */
  // devolve {nivel:0..2, txt}
  function risco(odd, stake) {
    const b = bancaAtual(), u = unidade();
    const fr = b > 0 ? stake / b : 1;
    const motivos = [];
    let n = 0;
    if (fr > plano.pct * 3 / 100 || fr > 0.1) { n = 2; motivos.push('estás a apostar ' + pct(fr) + ' da banca — mais de 3 unidades'); }
    else if (fr > plano.pct * 1.5 / 100) { n = Math.max(n, 1); motivos.push('a aposta é maior do que ' + dec(stake / u, 1) + ' unidades'); }
    if (odd >= 5) { n = 2; motivos.push('com odd ' + dec(odd) + ' só ganhas cerca de 1 em cada ' + Math.round(odd) + ' vezes'); }
    else if (odd >= 2.6) { n = Math.max(n, 1); motivos.push('odd ' + dec(odd) + ' ganha menos de metade das vezes'); }
    const rec = stakeRecomendado(odd);
    if (stake > rec * 1.25 && n < 2) { n = Math.max(n, 1); motivos.push('para esta odd o plano sugere ' + eur(rec)); }
    return { n, motivos, rec };
  }

  // unidades sugeridas por odd: odds baixas aguentam mais, odds altas menos
  const ESCALOES = [
    { ate: 1.5, u: 1.5, r: 0, txt: 'Baixo' },
    { ate: 2.2, u: 1, r: 0, txt: 'Baixo' },
    { ate: 3.5, u: 0.75, r: 1, txt: 'Médio' },
    { ate: 6, u: 0.5, r: 1, txt: 'Médio-alto' },
    { ate: Infinity, u: 0.25, r: 2, txt: 'Alto' },
  ];
  const escalao = (odd) => ESCALOES.find((e) => odd <= e.ate);
  const stakeRecomendado = (odd) => unidade() * escalao(odd).u;

  /* ---------- PLANO ---------- */
  const pBanca = $('pBanca'), pPct = $('pPct'), pStop = $('pStop');
  pBanca.value = String(plano.banca).replace('.', ',');
  pPct.value = plano.pct; pStop.value = plano.stop;

  function perdasHoje() {
    const h = hoje();
    return -diario.filter((a) => a.data === h).reduce((s, a) => s + Math.min(0, lucroAposta(a)), 0);
  }
  function atualizarPlano() {
    const b = num(pBanca.value), p = num(pPct.value), s = num(pStop.value);
    if (b > 0) plano.banca = b;
    if (p > 0) plano.pct = p;
    if (s >= 0) plano.stop = s;
    gravar(K_PLANO, plano);
    $('pPctTxt').textContent = dec(plano.pct, plano.pct % 1 ? 1 : 0) + '%';
    document.querySelectorAll('#pPerfis button').forEach((x) => x.classList.toggle('ativo', num(x.dataset.p) === plano.pct));
    const ba = bancaAtual(), u = unidade();
    $('kBanca').textContent = eur(ba);
    const v = ba - plano.banca; const kv = $('kBancaVar');
    kv.textContent = diario.length ? (v >= 0 ? '+' : '') + eur(v) + ' desde o início' : 'sem apostas registadas';
    sinal(kv, v);
    $('kUnidade').textContent = eur(u);
    $('kMax').textContent = eur(u * 3);
    const stopEur = plano.banca * plano.stop / 100, ph = perdasHoje();
    $('kStop').textContent = eur(stopEur);
    $('kStopHoje').textContent = ph > 0 ? 'hoje já perdeste ' + eur(ph) : 'hoje ainda sem perdas';
    $('bcStop').hidden = !(stopEur > 0 && ph >= stopEur);
    const linhas = [
      [1.3, '1,01 – 1,50'], [1.85, '1,51 – 2,20'], [2.8, '2,21 – 3,50'], [4.5, '3,51 – 6,00'], [8, '6,01 ou mais'],
    ].map(([o, rot], i) => {
      const e = ESCALOES[i];
      const lo = i ? ESCALOES[i - 1].ate : 1.01, hi = Math.min(e.ate, 10);
      return '<tr><td><b>' + rot + '</b></td><td>' + pct(1 / hi, 0) + ' – ' + pct(1 / lo, 0) + '</td><td>' + dec(e.u, e.u % 1 ? 2 : 0).replace(/,?0+$/, '') + 'u</td><td><b>' + eur(u * e.u) + '</b></td><td><span class="bc-nivel n' + e.r + '">' + e.txt + '</span></td></tr>';
    }).join('');
    document.querySelector('#pTabela tbody').innerHTML = linhas;
    analisar(); multipla();
  }
  [pBanca, pStop].forEach((el) => el.addEventListener('input', atualizarPlano));
  pPct.addEventListener('input', atualizarPlano);
  document.querySelectorAll('#pPerfis button').forEach((b) => b.addEventListener('click', () => { pPct.value = b.dataset.p; atualizarPlano(); }));

  /* ---------- APOSTA + KELLY ---------- */
  const aOdd = $('aOdd'), aStake = $('aStake'), aProb = $('aProb');
  function analisar() {
    const odd = num(aOdd.value);
    let stake = num(aStake.value);
    if (!(odd > 1)) { ['aRet', 'aLucro', 'aImp', 'aPctB'].forEach((i) => { $(i).textContent = '—'; }); $('aRisco').innerHTML = '<p class="bc-nota">Escreve uma odd maior do que 1.</p>'; $('aKelly').hidden = true; return; }
    const rec = stakeRecomendado(odd);
    aStake.placeholder = dec(rec);
    if (!(stake > 0)) stake = rec;
    $('aRet').textContent = eur(stake * odd);
    $('aLucro').textContent = eur(stake * (odd - 1));
    $('aImp').textContent = pct(1 / odd);
    const b = bancaAtual();
    $('aPctB').textContent = b > 0 ? pct(stake / b) : '—';
    $('aUn').textContent = unidade() > 0 ? dec(stake / unidade(), 1) + ' unidades' : '';
    const r = risco(odd, stake);
    const NIV = ['Risco baixo', 'Risco médio', 'Risco alto'], ICO = ['fa-circle-check', 'fa-circle-exclamation', 'fa-triangle-exclamation'];
    $('aRisco').className = 'bc-risco n' + r.n;
    $('aRisco').innerHTML = '<i class="fas ' + ICO[r.n] + '" aria-hidden="true"></i><div><strong>' + NIV[r.n] + (aStake.value ? '' : ' — com o valor sugerido de ' + eur(rec)) + '</strong><small>' +
      (r.motivos.length ? esc(r.motivos.join('; ')) + '.' : 'Aposta dentro do teu plano: odd razoável e valor à volta de uma unidade.') + '</small></div>';
    // Kelly
    const p = num(aProb.value) / 100;
    if (!(p > 0 && p < 1)) { $('aKelly').hidden = true; return; }
    $('aKelly').hidden = false;
    const bb = odd - 1, f = (bb * p - (1 - p)) / bb, ev = p * odd - 1;
    $('kEV').textContent = (ev >= 0 ? '+' : '') + eur(ev * 10); sinal($('kEV'), ev);
    if (f <= 0) {
      $('kFull').textContent = '0 €'; $('kQuarto').textContent = '0 €';
      $('kTxt').textContent = 'Se achas que a probabilidade real é ' + pct(p, 0) + ', esta odd paga menos do que devia (precisava de pelo menos ' + dec(1 / p) + '). Pelo critério de Kelly, não há valor nesta aposta.';
    } else {
      const full = Math.max(0, b) * f, q = full / 4, cap = unidade() * 3;
      $('kFull').textContent = eur(full) + ' (' + pct(f) + ')';
      $('kQuarto').textContent = eur(Math.min(q, cap));
      $('kTxt').textContent = 'Há valor: a odd justa para ' + pct(p, 0) + ' seria ' + dec(1 / p) + '. O Kelly completo é agressivo e assume que acertas sempre na probabilidade — por isso a maioria usa ¼' + (q > cap ? ', e aqui fica limitado ao máximo do teu plano (3 unidades)' : '') + '.';
    }
  }
  [aOdd, aStake, aProb].forEach((el) => el.addEventListener('input', analisar));

  /* ---------- MÚLTIPLA ---------- */
  const mLista = $('mLista');
  let mOdds = ['1.60', '1.75', '1.90'];
  function desenharMulti() {
    mLista.innerHTML = mOdds.map((o, i) => '<div class="bc-sel"><span>' + (i + 1) + '.ª seleção</span><div class="bc-in"><input type="text" inputmode="decimal" data-i="' + i + '" value="' + esc(o) + '" aria-label="Odd da seleção ' + (i + 1) + '"></div>' +
      (mOdds.length > 2 ? '<button type="button" class="bc-x" data-x="' + i + '" aria-label="Tirar seleção"><i class="fas fa-xmark" aria-hidden="true"></i></button>' : '') + '</div>').join('');
    multipla();
  }
  mLista.addEventListener('input', (e) => { if (e.target.dataset.i != null) { mOdds[+e.target.dataset.i] = e.target.value; multipla(); } });
  mLista.addEventListener('click', (e) => { const x = e.target.closest('[data-x]'); if (x) { mOdds.splice(+x.dataset.x, 1); desenharMulti(); } });
  $('mAdd').addEventListener('click', () => { if (mOdds.length >= 15) return; mOdds.push(''); desenharMulti(); const ins = mLista.querySelectorAll('input'); ins[ins.length - 1].focus(); });
  $('mStake').addEventListener('input', multipla);
  function multipla() {
    const os = mOdds.map(num).filter((o) => o > 1);
    const st = num($('mStake').value);
    if (os.length < 2) { ['mOdd', 'mRet', 'mProb', 'mPct'].forEach((i) => { $(i).textContent = '—'; }); $('mVezes').textContent = ''; $('mTxt').textContent = 'Precisas de pelo menos 2 odds.'; return; }
    const tot = os.reduce((a, b) => a * b, 1), pr = 1 / tot;
    $('mOdd').textContent = dec(tot);
    $('mRet').textContent = st > 0 ? eur(st * tot) : '—';
    $('mProb').textContent = pct(pr, pr < 0.01 ? 2 : 1);
    $('mVezes').textContent = '≈ 1 em cada ' + Math.round(tot).toLocaleString('pt-PT') + ' vezes';
    const b = bancaAtual();
    $('mPct').textContent = st > 0 && b > 0 ? pct(st / b) : '—';
    const margemTipica = Math.pow(1.05, os.length) - 1;
    $('mTxt').textContent = 'Com ' + os.length + ' seleções, a casa cobra margem em cada uma — com uns 5% por jogo, a múltipla fica com cerca de ' + pct(margemTipica, 0) + ' de margem. ' +
      (st > unidade() * 0.5 && unidade() > 0 ? 'Para múltiplas o normal é apostar no máximo meia unidade (' + eur(unidade() * 0.5) + ').' : 'O valor está dentro do recomendado para múltiplas (até meia unidade).');
  }

  /* ---------- MARGEM ---------- */
  let gN = 3; const gVals = { 2: ['1.90', '1.90'], 3: ['2.10', '3.40', '3.50'] };
  const ROT = { 2: ['Resultado A', 'Resultado B'], 3: ['1 (casa)', 'X (empate)', '2 (fora)'] };
  function desenharMargem() {
    $('gOdds').innerHTML = gVals[gN].map((v, i) => '<label class="bc-campo"><span>' + ROT[gN][i] + '</span><div class="bc-in"><input type="text" inputmode="decimal" data-g="' + i + '" value="' + v + '"></div></label>').join('');
    document.querySelectorAll('#gTipo button').forEach((b) => b.classList.toggle('ativo', +b.dataset.n === gN));
    margem();
  }
  $('gOdds').addEventListener('input', (e) => { if (e.target.dataset.g != null) { gVals[gN][+e.target.dataset.g] = e.target.value; margem(); } });
  document.querySelectorAll('#gTipo button').forEach((b) => b.addEventListener('click', () => { gN = +b.dataset.n; desenharMargem(); }));
  function margem() {
    const os = gVals[gN].map(num);
    const tb = document.querySelector('#gTabela tbody');
    if (os.some((o) => !(o > 1))) { $('gMargem').textContent = '—'; $('gMargemTxt').textContent = ''; tb.innerHTML = ''; return; }
    const soma = os.reduce((s, o) => s + 1 / o, 0), m = soma - 1;
    $('gMargem').textContent = pct(m);
    $('gMargemTxt').textContent = m < 0 ? 'arbitragem: soma abaixo de 100%' : m < 0.04 ? 'margem baixa — boas odds' : m < 0.07 ? 'margem normal' : 'margem alta — procura melhores odds';
    tb.innerHTML = os.map((o, i) => { const pj = (1 / o) / soma; return '<tr><td>' + ROT[gN][i] + '</td><td>' + dec(o) + '</td><td>' + pct(pj) + '</td><td><b>' + dec(1 / pj) + '</b></td></tr>'; }).join('');
  }

  /* ---------- SIMULADOR ---------- */
  let simulado = false;
  function simular() {
    simulado = true;
    const odd = num($('sOdd').value), ac = num($('sAc').value) / 100, n = Math.min(2000, Math.max(10, Math.round(num($('sN').value)) || 200)), fr = num($('sPct').value) / 100;
    if (!(odd > 1 && ac > 0 && ac < 1 && fr > 0 && fr <= 1)) { $('sEV').textContent = 'Verifica os valores: odd maior que 1, acerto entre 1 e 99% e aposta entre 0,1 e 100%.'; return; }
    const B0 = Math.max(1, bancaAtual()), ev = ac * odd - 1, breakeven = 1 / odd;
    $('sEV').innerHTML = 'Para não perder com odd ' + dec(odd) + ' precisas de acertar <b>' + pct(breakeven) + '</b> das vezes. Com ' + pct(ac, 0) + ' de acerto, cada aposta vale em média <b class="' + (ev >= 0 ? 'pos' : 'neg') + '">' + (ev >= 0 ? '+' : '') + pct(ev) + '</b> do que apostas.';
    const SIMS = 2000, DESENHA = 40, caminhos = [], finais = [];
    let perde = 0, metade = 0;
    for (let s = 0; s < SIMS; s++) {
      let b = B0, min = B0; const cam = s < DESENHA ? [b] : null;
      for (let i = 0; i < n; i++) {
        const st = b * fr;
        b += Math.random() < ac ? st * (odd - 1) : -st;
        if (b < min) min = b;
        if (cam) cam.push(b);
      }
      finais.push(b); if (b < B0) perde++; if (min <= B0 / 2) metade++;
      if (cam) caminhos.push(cam);
    }
    finais.sort((a, b) => a - b);
    const q = (p) => finais[Math.min(finais.length - 1, Math.floor(p * finais.length))];
    $('sPerde').textContent = pct(perde / SIMS, 0);
    $('sMetade').textContent = pct(metade / SIMS, 0);
    $('sMed').textContent = eur(q(0.5)); sinal($('sMed'), q(0.5) - B0);
    $('sExt').textContent = eur(q(0.05)) + ' / ' + eur(q(0.95));
    ultimoSim = [caminhos, B0]; grafico($('sGraf'), caminhos, B0);
  }
  $('sCorrer').addEventListener('click', simular);
  ['sOdd', 'sAc', 'sN', 'sPct'].forEach((i) => $(i).addEventListener('change', simular));
  let ultimoSim = null;

  function cores() {
    const cs = getComputedStyle(document.documentElement);
    return { verde: cs.getPropertyValue('--green').trim() || '#3ddc84', verm: cs.getPropertyValue('--red').trim() || '#ff5f5f', pri: cs.getPropertyValue('--primary').trim() || '#4da3ff', gold: cs.getPropertyValue('--gold').trim() || '#f0c14b', txt: 'rgba(255,255,255,0.55)', grelha: 'rgba(255,255,255,0.08)' };
  }
  function grafico(cv, series, base) {
    // desenha à largura real do ecrã (no telemóvel o texto não fica minúsculo)
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 1000, H = Math.round(Math.max(200, W * (+cv.dataset.r || 0.33)));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px';
    const ctx = cv.getContext('2d'), P = { l: 64, r: 12, t: 14, b: 26 }, c = cores();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!series.length || !series[0].length) return;
    let mn = Infinity, mx = -Infinity, len = 0;
    series.forEach((s) => { len = Math.max(len, s.length); s.forEach((v) => { if (v < mn) mn = v; if (v > mx) mx = v; }); });
    mn = Math.min(mn, base); mx = Math.max(mx, base);
    if (mx - mn < 1) { mx += 1; mn -= 1; }
    const pad = (mx - mn) * 0.06; mn = Math.max(0, mn - pad); mx += pad;
    const X = (i) => P.l + (W - P.l - P.r) * (len > 1 ? i / (len - 1) : 0), Y = (v) => P.t + (H - P.t - P.b) * (1 - (v - mn) / (mx - mn));
    ctx.font = '12px Inter, sans-serif'; ctx.fillStyle = c.txt; ctx.strokeStyle = c.grelha; ctx.lineWidth = 1;
    for (let k = 0; k <= 4; k++) { const v = mn + (mx - mn) * k / 4, y = Y(v); ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(W - P.r, y); ctx.stroke(); ctx.fillText(Math.round(v).toLocaleString('pt-PT') + ' €', 6, y + 4); }
    ctx.setLineDash([5, 5]); ctx.strokeStyle = c.gold; ctx.beginPath(); ctx.moveTo(P.l, Y(base)); ctx.lineTo(W - P.r, Y(base)); ctx.stroke(); ctx.setLineDash([]);
    const uma = series.length === 1;
    series.forEach((s) => {
      ctx.strokeStyle = uma ? c.pri : (s[s.length - 1] >= base ? c.verde : c.verm);
      ctx.globalAlpha = uma ? 1 : 0.35; ctx.lineWidth = uma ? 2.5 : 1.3;
      ctx.beginPath(); s.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)))); ctx.stroke();
    });
    ctx.globalAlpha = 1; ctx.fillStyle = c.txt;
    ctx.textAlign = 'right'; ctx.fillText(uma ? 'apostas resolvidas →' : 'apostas →', W - P.r, H - 6); ctx.textAlign = 'left';
  }

  /* ---------- DIÁRIO ---------- */
  $('dData').value = hoje();
  $('dForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const odd = num($('dOdd').value), stake = num($('dStake').value);
    if (!(odd > 1)) { toast('Mete uma odd válida (ex: 1,85)'); $('dOdd').focus(); return; }
    if (!(stake > 0)) { toast('Mete o valor apostado'); $('dStake').focus(); return; }
    diario.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), data: $('dData').value || hoje(), ev: $('dEvento').value.trim().slice(0, 80), odd, stake, res: 'pendente' });
    gravar(K_DIARIO, diario);
    $('dEvento').value = ''; $('dOdd').value = ''; $('dStake').value = '';
    const r = risco(odd, stake);
    toast(r.n === 2 ? 'Registada — atenção, é uma aposta de risco alto' : 'Aposta registada');
    desenharDiario(); atualizarPlano();
  });
  $('dTabela').addEventListener('change', (e) => {
    const tr = e.target.closest('tr'); if (!tr) return;
    const a = diario.find((x) => x.id === tr.dataset.id); if (!a) return;
    if (e.target.matches('select')) {
      a.res = e.target.value;
      if (a.res === 'cashout' && !(num(a.cash) >= 0)) { const v = num(prompt('Quanto recebeste no cash out? (€)', dec(a.stake))); a.cash = v >= 0 ? v : 0; }
    }
    gravar(K_DIARIO, diario); desenharDiario(); atualizarPlano();
  });
  $('dTabela').addEventListener('click', (e) => {
    const x = e.target.closest('[data-del]'); if (!x) return;
    diario = diario.filter((a) => a.id !== x.dataset.del); gravar(K_DIARIO, diario); desenharDiario(); atualizarPlano();
  });
  $('dLimpar').addEventListener('click', () => {
    if (!diario.length) return;
    if (!confirm('Apagar todas as ' + diario.length + ' apostas do diário? Não dá para desfazer.')) return;
    diario = []; gravar(K_DIARIO, diario); desenharDiario(); atualizarPlano();
  });
  $('dCsv').addEventListener('click', () => {
    if (!diario.length) { toast('O diário está vazio'); return; }
    const linhas = [['Data', 'Aposta', 'Odd', 'Valor', 'Resultado', 'Lucro']].concat(diario.map((a) => [a.data, a.ev, dec(a.odd), dec(a.stake), a.res, dec(lucroAposta(a))]));
    const csv = '﻿' + linhas.map((l) => l.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const el = document.createElement('a'); el.href = url; el.download = 'diario-apostas.csv'; document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const RES = [['pendente', 'Pendente'], ['ganha', 'Ganha'], ['perdida', 'Perdida'], ['anulada', 'Anulada'], ['cashout', 'Cash out']];
  function desenharDiario() {
    const ord = diario.map((a, i) => ({ a, i })).sort((x, y) => (y.a.data || '').localeCompare(x.a.data || '') || y.i - x.i).map((x) => x.a);
    document.querySelector('#dTabela tbody').innerHTML = ord.map((a) => {
      const l = lucroAposta(a);
      return '<tr data-id="' + a.id + '" class="r-' + a.res + '"><td>' + esc((a.data || '').split('-').reverse().join('/')) + '</td><td>' + (esc(a.ev) || '<span class="bc-cinza">—</span>') + '</td><td>' + dec(a.odd) + '</td><td>' + eur(a.stake) + '</td><td><select aria-label="Resultado">' +
        RES.map(([v, t]) => '<option value="' + v + '"' + (a.res === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></td><td class="' + (l > 0 ? 'pos' : l < 0 ? 'neg' : '') + '">' + (a.res === 'pendente' ? '<span class="bc-cinza">—</span>' : (l > 0 ? '+' : '') + eur(l)) + '</td><td><button type="button" class="bc-x" data-del="' + a.id + '" aria-label="Apagar aposta"><i class="fas fa-trash" aria-hidden="true"></i></button></td></tr>';
    }).join('');
    $('dVazio').hidden = diario.length > 0;
    const res = diario.filter((a) => a.res !== 'pendente' && a.res !== 'anulada');
    const apostado = res.reduce((s, a) => s + a.stake, 0), lucro = lucroTotal();
    const ganhas = res.filter((a) => lucroAposta(a) > 0).length;
    $('dLucro').textContent = (lucro > 0 ? '+' : '') + eur(lucro); sinal($('dLucro'), lucro);
    $('dRoi').textContent = apostado > 0 ? (lucro >= 0 ? '+' : '') + pct(lucro / apostado) : '—'; sinal($('dRoi'), lucro);
    $('dAc').textContent = res.length ? pct(ganhas / res.length, 0) : '—';
    $('dAcN').textContent = res.length ? ganhas + ' de ' + res.length + ' resolvidas' : '';
    let seq = 0, pior = 0;
    const cron = diario.map((a, i) => ({ a, i })).sort((x, y) => (x.a.data || '').localeCompare(y.a.data || '') || x.i - y.i).map((x) => x.a);
    cron.forEach((a) => { if (a.res === 'perdida') { seq++; pior = Math.max(pior, seq); } else if (a.res === 'ganha' || a.res === 'cashout') seq = 0; });
    $('dSeq').textContent = res.length ? String(pior) : '—';
    let b = plano.banca; const serie = [b];
    cron.forEach((a) => { if (a.res !== 'pendente' && a.res !== 'anulada') { b += lucroAposta(a); serie.push(b); } });
    const cv = $('dGraf'); cv.hidden = serie.length < 2;
    if (serie.length >= 2 && !document.querySelector('[data-sec="diario"]').hidden) grafico(cv, [serie], plano.banca);
  }

  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (ultimoSim && !$('sGraf').closest('.bc-sec').hidden) grafico($('sGraf'), ...ultimoSim); desenharDiario(); }, 150); });

  /* ---------- arranque ---------- */
  desenharMulti(); desenharMargem(); atualizarPlano(); desenharDiario();
  const ini = (location.hash || '').slice(1);
  const valido = [...tabs].some((b) => b.dataset.tab === ini);
  mostrar(valido ? ini : (ler(K_TAB, 'plano') || 'plano'));
})();
