// ===================================================================
// Minas — grelha 5×5. Cada gema aumenta o multiplicador; uma mina
// acaba o jogo. Margem da casa 1% (como nos jogos "originals").
// ===================================================================
(function () {
  const $ = (id) => document.getElementById(id);
  const N = 25;
  const GEMA = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="gA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9ffcf"/><stop offset=".5" stop-color="#3ddc84"/><stop offset="1" stop-color="#139a52"/></linearGradient></defs><path d="M14 8h36l12 16-30 34L2 24z" fill="url(#gA)"/><path d="M14 8l6 16h24l6-16M2 24h60M20 24l12 34 12-34" fill="none" stroke="#e9fff1" stroke-opacity=".55" stroke-width="2"/><path d="M14 8l6 16L2 24z" fill="#fff" opacity=".35"/></svg>';
  const BOMBA = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="bA" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#ff8a8a"/><stop offset=".45" stop-color="#e8305e"/><stop offset="1" stop-color="#5a0b1f"/></radialGradient></defs><circle cx="30" cy="36" r="22" fill="url(#bA)"/><rect x="38" y="8" width="10" height="12" rx="2" transform="rotate(35 43 14)" fill="#3b2a35"/><path d="M48 8c3-4 8-3 9 1" stroke="#ffd166" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="58" cy="9" r="3" fill="#ffd166"/><circle cx="22" cy="28" r="5" fill="#fff" opacity=".45"/></svg>';

  // jogo = { aposta, nMinas, abertas:[], ativo } — as minas só se sabem no fim
  let jogo = null;
  let ocupado = false;
  const multiplicador = OGMotor.multMinas;

  function nMinas() {
    return Math.max(1, Math.min(24, parseInt($('minesCount').value, 10) || 3));
  }

  function construirGrelha() {
    const g = $('minesGrid');
    g.innerHTML = Array.from({ length: N }, (_, i) => `<button type="button" class="og-tile" data-i="${i}" aria-label="Casa ${i + 1}"><span class="og-tile-face"></span></button>`).join('');
    g.querySelectorAll('.og-tile').forEach((b) => b.addEventListener('click', () => abrir(+b.dataset.i)));
  }

  function atualizarInfo() {
    const minas = jogo ? jogo.nMinas : nMinas();
    const gemas = jogo ? jogo.abertas.length : 0;
    const atual = multiplicador(minas, gemas);
    const prox = multiplicador(minas, gemas + 1);
    $('minesMult').textContent = OG.fmtMult(atual);
    $('minesNext').textContent = OG.fmtMult(prox);
    $('minesGems').textContent = N - minas - gemas;
    $('minesBombs').textContent = minas;
    const aposta = jogo ? jogo.aposta : 0;
    $('minesProfit').textContent = jogo ? '+' + OG.fmt(Math.floor(aposta * atual) - aposta) : '0';
  }

  function setUI() {
    const ativo = jogo && jogo.ativo;
    const play = $('minesPlay');
    if (ativo) {
      const pode = jogo.abertas.length > 0;
      play.innerHTML = pode ? 'Recolher <small>' + OG.fmt(Math.floor(jogo.aposta * multiplicador(jogo.nMinas, jogo.abertas.length))) + '</small>' : 'Recolher';
      play.disabled = !pode || ocupado;
      play.classList.add('og-play-cash');
    } else {
      play.textContent = 'Apostar';
      play.disabled = ocupado;
      play.classList.remove('og-play-cash');
    }
    $('minesRandom').hidden = !ativo;
    OG.lockBet('minesBet', !!ativo || ocupado);
    $('minesCount').disabled = !!ativo || ocupado;
    $('minesGrid').classList.toggle('ativo', !!ativo);
    atualizarInfo();
  }

  async function iniciar() {
    if (ocupado) return;
    const v = OG.readBet('minesBet'); if (!v) return;
    ocupado = true; setUI();
    try {
      const res = await OG.jogar('minas', 'iniciar', { aposta: v, minas: nMinas() });
      OG.sound('bet');
      jogo = { aposta: v, nMinas: res.view.nMinas, abertas: [], ativo: true };
      construirGrelha();
    } catch (e) { /* aviso já mostrado */ }
    ocupado = false;
    setUI();
  }

  // continuar um jogo que ficou a meio (modo Ranking, ex.: recarregaste a página)
  function retomar(ativos) {
    const v = ativos && ativos.minas;
    if (!v) return;
    jogo = { aposta: v.aposta, nMinas: v.nMinas, abertas: v.abertas.slice(), ativo: true };
    $('minesCount').value = v.nMinas;
    construirGrelha();
    jogo.abertas.forEach((i) => marcarGema(i, multiplicador(jogo.nMinas, jogo.abertas.indexOf(i) + 1)));
    setUI();
    OG.toast('Tinhas um jogo de Minas a meio — continua!');
  }

  function revelar(i, tipo, fraco) {
    const b = $('minesGrid').querySelector(`[data-i="${i}"]`);
    if (!b || b.classList.contains('aberta')) return;
    b.classList.add('aberta', tipo);
    if (fraco) b.classList.add('fraca');
    b.querySelector('.og-tile-face').innerHTML = tipo === 'gema' ? GEMA : BOMBA;
    b.disabled = true;
  }
  function marcarGema(i, m) {
    revelar(i, 'gema');
    const b = $('minesGrid').querySelector(`[data-i="${i}"]`);
    const tag = document.createElement('em'); tag.className = 'og-tile-mult'; tag.textContent = OG.fmtMult(m);
    b.appendChild(tag);
  }

  function revelarTudo(minas) {
    const set = new Set(minas || []);
    for (let i = 0; i < N; i++) revelar(i, set.has(i) ? 'bomba' : 'gema', true);
  }

  async function abrir(i) {
    if (!jogo || !jogo.ativo || ocupado || jogo.abertas.includes(i)) return;
    ocupado = true;
    let res;
    try {
      res = await OG.jogar('minas', 'abrir', { i });
    } catch (e) {
      ocupado = false; setUI();
      return;
    }
    ocupado = false;
    const v = res.view;
    if (v.bomba != null) {
      jogo.ativo = false;
      revelar(i, 'bomba');
      $('minesGrid').querySelector(`[data-i="${i}"]`).classList.add('explodiu');
      OG.revelarSaldo();
      OG.sound('boom'); OG.shake($('minesStage'));
      setTimeout(() => revelarTudo(v.minas), 350);
      OG.pushHistory('mines', jogo.aposta, -jogo.aposta, `Mina após ${jogo.abertas.length} gema${jogo.abertas.length === 1 ? '' : 's'} (${jogo.nMinas} minas)`);
      OG.pushRecent('minesRecent', '0.00x', 'lose');
      setUI();
      return;
    }
    jogo.abertas = v.abertas.slice();
    OG.sound('gem');
    marcarGema(i, v.mult);
    if (res.fim) return terminouComPremio(res);
    setUI();
  }

  function terminouComPremio(res) {
    jogo.ativo = false;
    const m = res.view.recolheu;
    const ganho = res.credito;
    OG.revelarSaldo();
    OG.sound('win');
    OG.winCard($('minesStage'), m, ganho);
    if (m >= 5) OG.confetti($('minesStage'));
    OG.pushHistory('mines', jogo.aposta, ganho - jogo.aposta, `${jogo.abertas.length} gemas · ${OG.fmtMult(m)} (${jogo.nMinas} minas)`);
    OG.pushRecent('minesRecent', OG.fmtMult(m), 'win');
    revelarTudo(res.view.minas);
    setUI();
  }

  async function recolher() {
    if (!jogo || !jogo.ativo || !jogo.abertas.length || ocupado) return;
    ocupado = true; setUI();
    try {
      const res = await OG.jogar('minas', 'recolher', {});
      ocupado = false;
      terminouComPremio(res);
    } catch (e) {
      ocupado = false; setUI();
    }
  }

  function aleatoria() {
    if (!jogo || !jogo.ativo || ocupado) return;
    const livres = [];
    for (let i = 0; i < N; i++) if (!jogo.abertas.includes(i)) livres.push(i);
    abrir(livres[OG.randInt(livres.length)]);
  }

  function reset() {
    jogo = null;
    construirGrelha();
    setUI();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('minesGrid')) return;
    OG.registarJogo({ emJogo: () => ocupado || !!(jogo && jogo.ativo && !OG.emRanking()), reset, retomar });
    construirGrelha();
    $('minesPlay').addEventListener('click', () => (jogo && jogo.ativo ? recolher() : iniciar()));
    $('minesRandom').addEventListener('click', aleatoria);
    $('minesCount').addEventListener('change', atualizarInfo);
    setUI();
  });
})();
