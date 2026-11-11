// ===================================================================
// Blackjack — 6 baralhos, dealer fica em todos os 17, Blackjack paga
// 3 para 2. Podes Pedir, Ficar, Dobrar (2 primeiras cartas) e Dividir
// (uma vez; ases divididos recebem só uma carta cada).
// ===================================================================
(function () {
  const $ = (id) => document.getElementById(id);
  const NAIPES = ['♠', '♥', '♦', '♣'];
  const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  let sapato = [];
  let dealer = [];
  let maos = []; // { cartas, aposta, terminada, dobrou, deAses, resultado }
  let ativa = 0;
  let emJogo = false;
  let ocupado = false;
  let idCarta = 0;

  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  function novoSapato() {
    sapato = [];
    for (let d = 0; d < 6; d++) for (const n of NAIPES) for (const v of VALORES) sapato.push({ v, n });
    for (let i = sapato.length - 1; i > 0; i--) { const j = OG.randInt(i + 1); [sapato[i], sapato[j]] = [sapato[j], sapato[i]]; }
  }
  function tirar(virada) {
    if (sapato.length < 60) novoSapato();
    const c = sapato.pop();
    return { v: c.v, n: c.n, id: ++idCarta, virada: !!virada };
  }
  const valorCarta = (c) => (c.v === 'A' ? 11 : ['J', 'Q', 'K', '10'].includes(c.v) ? 10 : +c.v);
  function total(cartas) {
    let t = 0, ases = 0;
    cartas.forEach((c) => { if (c.virada) return; t += valorCarta(c); if (c.v === 'A') ases++; });
    while (t > 21 && ases) { t -= 10; ases--; }
    return { t, mole: ases > 0 && t <= 21 };
  }
  const ehBJ = (cartas) => cartas.length === 2 && total(cartas).t === 21;

  // ---------- desenho ----------
  function cartaHtml(c) {
    const vermelha = c.n === '♥' || c.n === '♦';
    return `<div class="og-card${vermelha ? ' red' : ''}${c.virada ? ' down' : ''}" data-id="${c.id}">
      <div class="og-card-inner">
        <div class="og-card-front"><span class="cr">${c.v}<i>${c.n}</i></span><span class="cc">${c.n}</span><span class="cr b">${c.v}<i>${c.n}</i></span></div>
        <div class="og-card-back"></div>
      </div></div>`;
  }
  function pintarMao(el, cartas) {
    // só acrescenta cartas novas (para animar) e atualiza as viradas
    cartas.forEach((c, i) => {
      let d = el.querySelector(`[data-id="${c.id}"]`);
      if (!d) {
        el.insertAdjacentHTML('beforeend', cartaHtml(c));
        d = el.lastElementChild;
        d.style.setProperty('--i', i);
        d.classList.add('deal');
      }
      d.classList.toggle('down', c.virada);
    });
    el.querySelectorAll('.og-card').forEach((d) => { if (!cartas.some((c) => String(c.id) === d.dataset.id)) d.remove(); });
  }
  function textoTotal(cartas) {
    const visiveis = cartas.filter((c) => !c.virada);
    if (!visiveis.length) return '';
    const { t, mole } = total(cartas);
    if (ehBJ(cartas)) return 'BJ';
    return mole && t !== 21 ? `${t - 10}/${t}` : String(t);
  }
  function pintar() {
    pintarMao($('bjDealer'), dealer);
    const dt = textoTotal(dealer);
    $('bjDealerTotal').textContent = dt; $('bjDealerTotal').hidden = !dt;

    const wrap = $('bjPlayer');
    while (wrap.children.length < maos.length) wrap.insertAdjacentHTML('beforeend', '<div class="og-bj-hand"><div class="og-cards"></div><span class="og-total"></span><span class="og-bj-bet"></span></div>');
    while (wrap.children.length > maos.length) wrap.lastElementChild.remove();
    maos.forEach((m, i) => {
      const el = wrap.children[i];
      pintarMao(el.querySelector('.og-cards'), m.cartas);
      const tt = el.querySelector('.og-total');
      tt.textContent = textoTotal(m.cartas); tt.hidden = !m.cartas.length;
      const t = total(m.cartas).t;
      tt.className = 'og-total' + (m.resultado === 'win' || m.resultado === 'bj' ? ' win' : m.resultado === 'lose' || t > 21 ? ' lose' : m.resultado === 'push' ? ' push' : '');
      el.classList.toggle('ativa', emJogo && maos.length > 1 && i === ativa);
      el.querySelector('.og-bj-bet').innerHTML = maos.length > 1 ? `<i class="fas fa-coins"></i> ${OG.fmt(m.aposta)}` : '';
    });
    acoes();
  }
  function acoes() {
    const m = maos[ativa];
    const podeJogar = emJogo && !ocupado && m && !m.terminada;
    $('bjHit').disabled = !podeJogar;
    $('bjStand').disabled = !podeJogar;
    $('bjDouble').disabled = !(podeJogar && m.cartas.length === 2 && OG.getBalance() >= m.aposta);
    $('bjSplit').disabled = !(podeJogar && maos.length === 1 && m.cartas.length === 2 && valorCarta(m.cartas[0]) === valorCarta(m.cartas[1]) && OG.getBalance() >= m.aposta);
    $('bjPlay').disabled = emJogo || ocupado;
    OG.lockBet('bjBet', emJogo || ocupado);
  }

  // ---------- jogo ----------
  async function dar(destino, virada) {
    const c = tirar(virada);
    destino.push(c);
    OG.sound('card');
    pintar();
    await espera(320);
    return c;
  }

  async function distribuir() {
    if (emJogo || ocupado) return;
    const aposta = OG.readBet('bjBet'); if (!aposta) return;
    OG.adjust(-aposta); OG.sound('bet');
    ocupado = true; emJogo = true;
    dealer = []; maos = [{ cartas: [], aposta, terminada: false }]; ativa = 0;
    $('bjMsg').textContent = '';
    $('bjMsg').className = 'og-bj-msg';
    pintar();
    await dar(maos[0].cartas);
    await dar(dealer);
    await dar(maos[0].cartas);
    await dar(dealer, true);
    ocupado = false;

    const jogadorBJ = ehBJ(maos[0].cartas);
    const visivel = dealer[0];
    const dealerBJ = ehBJ(dealer.map((c) => ({ ...c, virada: false })));
    if (jogadorBJ || ((visivel.v === 'A' || valorCarta(visivel) === 10) && dealerBJ)) {
      await revelarDealer();
      return terminar();
    }
    pintar();
  }

  async function proximaMao() {
    while (ativa < maos.length && maos[ativa].terminada) ativa++;
    if (ativa >= maos.length) {
      ativa = maos.length - 1;
      await vezDoDealer();
      terminar();
      return;
    }
    // mão vinda de um "dividir" só tem 1 carta: recebe a segunda
    if (maos[ativa].cartas.length === 1) {
      ocupado = true;
      await dar(maos[ativa].cartas);
      ocupado = false;
      if (maos[ativa].deAses || total(maos[ativa].cartas).t === 21) { maos[ativa].terminada = true; return proximaMao(); }
    }
    pintar();
  }

  async function pedir() {
    const m = maos[ativa]; if (!m || m.terminada || ocupado) return;
    ocupado = true;
    await dar(m.cartas);
    ocupado = false;
    if (total(m.cartas).t >= 21) { m.terminada = true; return proximaMao(); }
    pintar();
  }
  function ficar() {
    const m = maos[ativa]; if (!m || m.terminada || ocupado) return;
    m.terminada = true; proximaMao();
  }
  async function dobrar() {
    const m = maos[ativa]; if (!m || m.cartas.length !== 2 || OG.getBalance() < m.aposta || ocupado) return;
    OG.adjust(-m.aposta); m.aposta *= 2; m.dobrou = true; OG.sound('bet');
    ocupado = true;
    await dar(m.cartas);
    ocupado = false;
    m.terminada = true; proximaMao();
  }
  async function dividir() {
    const m = maos[0];
    if (maos.length !== 1 || m.cartas.length !== 2 || OG.getBalance() < m.aposta || ocupado) return;
    OG.adjust(-m.aposta); OG.sound('bet');
    const ases = m.cartas[0].v === 'A';
    maos = [
      { cartas: [m.cartas[0]], aposta: m.aposta, terminada: false, deAses: ases },
      { cartas: [m.cartas[1]], aposta: m.aposta, terminada: false, deAses: ases },
    ];
    $('bjPlayer').innerHTML = '';
    ativa = 0;
    pintar();
    await proximaMao();
  }

  async function revelarDealer() {
    dealer.forEach((c) => (c.virada = false));
    OG.sound('card'); pintar();
    await espera(450);
  }

  async function vezDoDealer() {
    ocupado = true;
    await revelarDealer();
    const vivas = maos.some((m) => total(m.cartas).t <= 21);
    if (vivas) while (total(dealer).t < 17) await dar(dealer);
    ocupado = false;
  }

  function terminar() {
    const d = total(dealer).t;
    const dBJ = ehBJ(dealer);
    let liquido = 0, devolvido = 0, aposto = 0;
    const etiquetas = [];
    maos.forEach((m) => {
      const p = total(m.cartas).t;
      const pBJ = maos.length === 1 && ehBJ(m.cartas);
      let paga = 0;
      if (pBJ && !dBJ) { paga = m.aposta + Math.floor(m.aposta * 1.5); m.resultado = 'bj'; etiquetas.push('Blackjack!'); }
      else if (p > 21) { m.resultado = 'lose'; etiquetas.push(`Rebentaste (${p})`); }
      else if (dBJ && !pBJ) { m.resultado = 'lose'; etiquetas.push('Dealer tem Blackjack'); }
      else if (pBJ && dBJ) { paga = m.aposta; m.resultado = 'push'; etiquetas.push('Empate (BJ)'); }
      else if (d > 21 || p > d) { paga = m.aposta * 2; m.resultado = 'win'; etiquetas.push(d > 21 ? `Dealer rebentou (${d})` : `${p} contra ${d}`); }
      else if (p === d) { paga = m.aposta; m.resultado = 'push'; etiquetas.push(`Empate ${p}`); }
      else { m.resultado = 'lose'; etiquetas.push(`${p} contra ${d}`); }
      devolvido += paga; aposto += m.aposta;
    });
    liquido = devolvido - aposto;
    if (devolvido) OG.adjust(devolvido);
    emJogo = false;
    const msg = $('bjMsg');
    if (liquido > 0) {
      OG.sound('win'); msg.className = 'og-bj-msg show win';
      msg.innerHTML = `${OG.esc(etiquetas.join(' · '))}<strong>+${OG.fmt(liquido)}</strong>`;
      if (maos.some((m) => m.resultado === 'bj')) OG.confetti($('bjStage'));
    } else if (liquido < 0) {
      OG.sound('lose'); msg.className = 'og-bj-msg show lose';
      msg.innerHTML = `${OG.esc(etiquetas.join(' · '))}<strong>−${OG.fmt(-liquido)}</strong>`;
    } else {
      msg.className = 'og-bj-msg show push';
      msg.innerHTML = `${OG.esc(etiquetas.join(' · '))}<strong>Empate</strong>`;
    }
    OG.pushHistory('blackjack', aposto, liquido, etiquetas.join(' · '));
    OG.pushRecent('bjRecent', liquido > 0 ? 'Ganhou' : liquido < 0 ? 'Perdeu' : 'Empate', liquido > 0 ? 'win' : liquido < 0 ? 'lose' : '');
    pintar();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('bjDealer')) return;
    novoSapato();
    $('bjPlay').addEventListener('click', distribuir);
    $('bjHit').addEventListener('click', pedir);
    $('bjStand').addEventListener('click', ficar);
    $('bjDouble').addEventListener('click', dobrar);
    $('bjSplit').addEventListener('click', dividir);
    document.addEventListener('keydown', (e) => {
      if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 'h' || k === 'p') pedir();
      else if (k === 's' || k === 'f') ficar();
      else if (k === 'd') dobrar();
      else if (e.code === 'Space') { e.preventDefault(); if (!emJogo) distribuir(); }
    });
    pintar();
  });
})();
