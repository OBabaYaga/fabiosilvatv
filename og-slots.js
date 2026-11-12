// ===================================================================
// Slot "FabioSilva" — 5 rolos × 3 linhas, 10 linhas de pagamento.
// Ganha quem tiver 3, 4 ou 5 símbolos iguais seguidos a partir do
// 1.º rolo numa linha. Retorno teórico ≈ 96% (calculado por simulação).
// Os resultados vêm de OG.jogar (motor local no Treino, servidor no Ranking).
// ===================================================================
(function () {
  const $ = (id) => document.getElementById(id);
  // pesos e prémios vêm do motor (og-motor.js); aqui só os desenhos
  const EMOJI = { cereja: '🍒', limao: '🍋', uvas: '🍇', melancia: '🍉', sino: '🔔', estrela: '⭐', diamante: '💎', coroa: '👑' };
  const SIMBOLOS = OGMotor.SIMBOLOS.map((s) => Object.assign({ e: EMOJI[s.id] }, s)); // "paga" em décimas da aposta
  const POR_ID = Object.fromEntries(SIMBOLOS.map((s) => [s.id, s]));
  const LINHAS = OGMotor.LINHAS;
  let ultimosGanhos = [];
  const CORES_LINHA = ['#f0c14b', '#4da3ff', '#3ddc84', '#ff5f8f', '#b38bff', '#ff9f43', '#2ee6d6', '#ffd166', '#ff6b6b', '#7bed9f'];
  const PESO = SIMBOLOS.reduce((s, x) => s + x.w, 0);

  let aGirar = false;
  let grelha = [];

  function sortear() {
    let r = OG.rand() * PESO;
    for (const s of SIMBOLOS) { if ((r -= s.w) < 0) return s; }
    return SIMBOLOS[0];
  }
  const cel = (s) => `<div class="og-slot-cell" data-s="${s.id}"><span>${s.e}</span></div>`;

  function construir() {
    grelha = Array.from({ length: 5 }, () => [sortear(), sortear(), sortear()]);
    $('slotReels').innerHTML = grelha.map((col) => `<div class="og-reel"><div class="og-strip">${col.map(cel).join('')}</div></div>`).join('') + '<svg class="og-slot-lines" id="slotLines" preserveAspectRatio="none"></svg>';
    $('slotPaytable').innerHTML = SIMBOLOS.slice().reverse().map((s) => `<div class="og-pay-row"><span class="og-pay-sym">${s.e}</span><span>×3 <b>${(s.paga[0] / 10).toFixed(1)}x</b></span><span>×4 <b>${(s.paga[1] / 10).toFixed(1)}x</b></span><span>×5 <b>${(s.paga[2] / 10).toFixed(0)}x</b></span></div>`).join('');
  }

  function desenharLinhas(ganhos) {
    const svg = $('slotLines');
    const box = $('slotReels').getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const reels = $('slotReels').querySelectorAll('.og-reel');
    svg.innerHTML = ganhos.map((g) => {
      const pts = LINHAS[g.li].slice(0, g.k).map((row, col) => {
        const r = reels[col].getBoundingClientRect();
        return `${r.left - box.left + r.width / 2},${r.top - box.top + (row + 0.5) * (r.height / 3)}`;
      }).join(' ');
      return `<polyline points="${pts}" stroke="${CORES_LINHA[g.li]}" />`;
    }).join('');
  }

  async function girar() {
    if (aGirar) return;
    const aposta = OG.readBet('slotBet'); if (!aposta) return;
    aGirar = true;
    $('slotPlay').disabled = true;
    OG.lockBet('slotBet', true);
    let res;
    try {
      res = await OG.jogar('slots', 'iniciar', { aposta });
    } catch (e) {
      aGirar = false; $('slotPlay').disabled = false; OG.lockBet('slotBet', false);
      return;
    }
    OG.sound('bet');
    $('slotLines').innerHTML = '';
    $('slotWin').className = 'og-slot-win';
    $('slotReels').querySelectorAll('.og-slot-cell.ganha').forEach((c) => c.classList.remove('ganha'));

    const novo = res.view.grelha.map((col) => col.map((id) => POR_ID[id]));
    const reels = $('slotReels').querySelectorAll('.og-reel');
    const alturaCel = reels[0].clientHeight / 3;
    reels.forEach((reel, i) => {
      const extra = 14 + i * 5; // rolos da direita giram mais tempo
      const antigos = grelha[i];
      const meio = Array.from({ length: extra }, sortear);
      // tira de cima para baixo: [novos(3)] [aleatórios] [antigos(3)]
      const strip = reel.querySelector('.og-strip');
      strip.style.transition = 'none';
      strip.innerHTML = [...novo[i], ...meio, ...antigos].map(cel).join('');
      const fim = 0, ini = -(extra + 3) * alturaCel;
      strip.style.transform = `translateY(${ini}px)`;
      reel.classList.add('a-girar');
      void strip.offsetHeight;
      const dur = 900 + i * 260;
      strip.style.transition = `transform ${dur}ms cubic-bezier(.15,.7,.25,1.08)`;
      strip.style.transform = `translateY(${fim}px)`;
      setTimeout(() => {
        reel.classList.remove('a-girar');
        strip.innerHTML = novo[i].map(cel).join('');
        strip.style.transition = 'none';
        strip.style.transform = 'translateY(0)';
        OG.sound('reel');
        if (i === 4) terminar(novo, aposta, res);
      }, dur + 20);
    });
  }

  function terminar(novo, aposta, res) {
    grelha = novo;
    const ganhos = res.view.ganhos.map((g) => ({ li: g.li, k: g.k, s: POR_ID[g.id], mult: g.mult }));
    const mult = res.view.mult;
    const ganho = res.credito;
    const reels = $('slotReels').querySelectorAll('.og-reel');
    ganhos.forEach((g) => LINHAS[g.li].slice(0, g.k).forEach((row, col) => reels[col].querySelectorAll('.og-slot-cell')[row].classList.add('ganha')));
    ultimosGanhos = ganhos;
    desenharLinhas(ganhos);
    OG.revelarSaldo();
    const w = $('slotWin');
    if (ganho > 0) {
      w.className = 'og-slot-win show' + (mult >= 10 ? ' big' : '');
      w.innerHTML = `${mult >= 50 ? 'MEGA WIN' : mult >= 10 ? 'BIG WIN' : 'Ganhaste'} <strong>${OG.fmt(ganho)}</strong>`;
      OG.sound('win');
      if (mult >= 10) OG.confetti($('slotStage'));
      OG.pushRecent('slotRecent', OG.fmtMult(mult), 'win');
    } else {
      OG.pushRecent('slotRecent', '0.00x', 'lose');
    }
    const desc = ganhos.length ? ganhos.map((g) => `${g.k}× ${g.s.e}`).join(' · ') : 'Sem prémio';
    OG.pushHistory('slots', aposta, ganho - aposta, desc);
    aGirar = false;
    $('slotPlay').disabled = false;
    OG.lockBet('slotBet', false);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('slotReels')) return;
    OG.registarJogo({ emJogo: () => aGirar });
    construir();
    $('slotPlay').addEventListener('click', girar);
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); girar(); }
    });
    window.addEventListener('resize', () => { if (!aGirar) desenharLinhas($('slotLines').innerHTML ? ultimosGanhos : []); });
  });
})();
