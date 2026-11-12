// ===================================================================
// Blackjack — 6 baralhos, dealer fica em todos os 17, Blackjack paga
// 3 para 2. Podes Pedir, Ficar, Dobrar (2 primeiras cartas) e Dividir
// (uma vez; ases divididos recebem só uma carta cada).
// ===================================================================
(function () {
  const $ = (id) => document.getElementById(id);
  // As cartas vêm do motor (og-motor.js): no Treino é o browser que
  // baralha, no Ranking é o servidor (e a carta virada do dealer só
  // chega ao browser no fim da mão).
  let dealer = [];
  let maos = []; // { cartas, aposta, terminada, resultado }
  let ativa = 0;
  let emJogo = false;
  let ocupado = false;
  let ultimaView = null;

  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const valorCarta = OGMotor.valorCarta;
  function total(cartas) {
    return OGMotor.total(cartas.filter((c) => !c.virada));
  }
  const ehBJ = (cartas) => cartas.length === 2 && !cartas.some((c) => c.virada) && total(cartas).t === 21;

  // ---------- desenho ----------
  function cartaHtml(c) {
    const vermelha = c.n === '♥' || c.n === '♦';
    return `<div class="og-card${vermelha ? ' red' : ''}${c.virada ? ' down' : ''}" data-id="${c.id}" data-v="${c.v || ''}">
      <div class="og-card-inner">
        <div class="og-card-front"><span class="cr">${c.v || ''}<i>${c.n || ''}</i></span><span class="cc">${c.n || ''}</span><span class="cr b">${c.v || ''}<i>${c.n || ''}</i></span></div>
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
      } else if (c.v && d.dataset.v !== c.v) {
        // carta que estava virada (sem valor) e agora se conhece
        const novo = document.createElement('div');
        novo.innerHTML = cartaHtml({ ...c, virada: true });
        d.querySelector('.og-card-front').replaceWith(novo.querySelector('.og-card-front'));
        d.classList.toggle('red', c.n === '♥' || c.n === '♦');
        d.dataset.v = c.v;
        void d.offsetWidth;
      }
      d.classList.toggle('down', !!c.virada);
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
    const v = ultimaView;
    const podeJogar = emJogo && !ocupado && m && !m.terminada;
    $('bjHit').disabled = !podeJogar;
    $('bjStand').disabled = !podeJogar;
    $('bjDouble').disabled = !(podeJogar && v && v.podeDobrar && OG.getBalance() >= m.aposta);
    $('bjSplit').disabled = !(podeJogar && v && v.podeDividir && OG.getBalance() >= m.aposta);
    $('bjPlay').disabled = emJogo || ocupado;
    OG.lockBet('bjBet', emJogo || ocupado);
  }

  // ---------- animação: aplica a nova "view" carta a carta ----------
  const idsDe = (v) => new Set([...v.dealer.map((c) => c.id), ...v.maos.flatMap((m) => m.cartas.map((c) => c.id))]);
  async function animarPara(v) {
    const antes = new Set([...dealer.map((c) => c.id), ...maos.flatMap((m) => m.cartas.map((c) => c.id))]);
    const novos = [...idsDe(v)].filter((id) => !antes.has(id)).sort((a, b) => a - b);
    // divisão de mão: muda a estrutura antes das cartas novas
    if (v.maos.length !== maos.length && maos.length) {
      $('bjPlayer').innerHTML = '';
      maos = v.maos.map((m) => ({ ...m, cartas: m.cartas.filter((c) => antes.has(c.id)).map((c) => ({ ...c })) }));
      ativa = v.ativa;
      pintar();
    }
    let revelou = false;
    for (const id of novos) {
      const idx = v.dealer.findIndex((c) => c.id === id);
      if (idx >= 0) {
        if (idx === 1) dealer.push({ id, virada: true });
        else {
          if (idx >= 2 && v.revelado && !revelou) { await revelar(v); revelou = true; }
          dealer.push({ ...v.dealer[idx] });
        }
      } else {
        v.maos.forEach((m, i) => {
          const c = m.cartas.find((x) => x.id === id);
          if (!c) return;
          if (!maos[i]) maos[i] = { ...m, cartas: [] };
          maos[i].cartas.push({ ...c });
        });
      }
      OG.sound('card');
      pintar();
      await espera(320);
    }
    if (v.revelado && !revelou) await revelar(v);
    dealer = v.dealer.map((c) => (c.virada ? { id: c.id, virada: true } : { ...c }));
    maos = v.maos.map((m) => ({ ...m, cartas: m.cartas.map((c) => ({ ...c })) }));
    ativa = v.ativa;
    ultimaView = v;
    pintar();
  }
  async function revelar(v) {
    if (!dealer.some((c) => c.virada)) return;
    dealer = dealer.map((c) => {
      const real = v.dealer.find((x) => x.id === c.id);
      return real && !real.virada ? { ...real } : c;
    });
    OG.sound('card'); pintar();
    await espera(450);
  }

  // ---------- jogadas ----------
  async function enviar(passo, params) {
    if (ocupado) return null;
    ocupado = true; acoes();
    let res = null;
    try {
      res = await OG.jogar('blackjack', passo, params || {});
    } catch (e) {
      ocupado = false; acoes();
      return null;
    }
    if (res.debito) OG.sound('bet');
    await animarPara(res.view);
    ocupado = false;
    if (res.fim) terminar(res);
    else pintar();
    return res;
  }

  async function distribuir() {
    if (emJogo || ocupado) return;
    const aposta = OG.readBet('bjBet'); if (!aposta) return;
    dealer = []; maos = []; ativa = 0; ultimaView = null;
    $('bjPlayer').innerHTML = '';
    $('bjMsg').textContent = '';
    $('bjMsg').className = 'og-bj-msg';
    pintar();
    emJogo = true;
    const r = await enviar('iniciar', { aposta });
    if (!r) { emJogo = false; pintar(); }
  }
  const pedir = () => emJogo && enviar('pedir');
  const ficar = () => emJogo && enviar('ficar');
  const dobrar = () => emJogo && !$('bjDouble').disabled && enviar('dobrar');
  const dividir = () => emJogo && !$('bjSplit').disabled && enviar('dividir');

  function terminar(res) {
    const v = res.view;
    const liquido = v.devolvido - v.apostado;
    const etiquetas = v.etiquetas || [];
    OG.revelarSaldo();
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
    OG.pushHistory('blackjack', v.apostado, liquido, etiquetas.join(' · '));
    OG.pushRecent('bjRecent', liquido > 0 ? 'Ganhou' : liquido < 0 ? 'Perdeu' : 'Empate', liquido > 0 ? 'win' : liquido < 0 ? 'lose' : '');
    pintar();
  }

  function reset() {
    dealer = []; maos = []; ativa = 0; emJogo = false; ultimaView = null;
    $('bjPlayer').innerHTML = '';
    $('bjMsg').className = 'og-bj-msg';
    pintar();
  }
  // mão que ficou a meio no Ranking (ex.: recarregaste a página)
  function retomar(ativos) {
    const v = ativos && ativos.blackjack;
    if (!v) return;
    reset();
    emJogo = true;
    dealer = v.dealer.map((c) => ({ ...c }));
    maos = v.maos.map((m) => ({ ...m, cartas: m.cartas.map((c) => ({ ...c })) }));
    ativa = v.ativa;
    ultimaView = v;
    pintar();
    OG.toast('Tinhas uma mão de Blackjack a meio — continua!');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('bjDealer')) return;
    OG.registarJogo({ emJogo: () => ocupado || (emJogo && !OG.emRanking()), reset, retomar });
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
