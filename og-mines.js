// ===================================================================
// Minas — grelha 5×5. Cada gema aumenta o multiplicador; uma mina
// acaba o jogo. Margem da casa 1% (como nos jogos "originals").
// ===================================================================
(function () {
  const $ = (id) => document.getElementById(id);
  const N = 25;
  const GEMA = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="gA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9ffcf"/><stop offset=".5" stop-color="#3ddc84"/><stop offset="1" stop-color="#139a52"/></linearGradient></defs><path d="M14 8h36l12 16-30 34L2 24z" fill="url(#gA)"/><path d="M14 8l6 16h24l6-16M2 24h60M20 24l12 34 12-34" fill="none" stroke="#e9fff1" stroke-opacity=".55" stroke-width="2"/><path d="M14 8l6 16L2 24z" fill="#fff" opacity=".35"/></svg>';
  const BOMBA = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="bA" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#ff8a8a"/><stop offset=".45" stop-color="#e8305e"/><stop offset="1" stop-color="#5a0b1f"/></radialGradient></defs><circle cx="30" cy="36" r="22" fill="url(#bA)"/><rect x="38" y="8" width="10" height="12" rx="2" transform="rotate(35 43 14)" fill="#3b2a35"/><path d="M48 8c3-4 8-3 9 1" stroke="#ffd166" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="58" cy="9" r="3" fill="#ffd166"/><circle cx="22" cy="28" r="5" fill="#fff" opacity=".45"/></svg>';

  let jogo = null; // { aposta, minas:Set, abertas:Set, ativo }

  function multiplicador(minas, gemas) {
    let m = 1;
    for (let i = 0; i < gemas; i++) m *= (N - i) / (N - minas - i);
    return gemas ? m * 0.99 : 1;
  }

  function nMinas() {
    return Math.max(1, Math.min(24, parseInt($('minesCount').value, 10) || 3));
  }

  function construirGrelha() {
    const g = $('minesGrid');
    g.innerHTML = Array.from({ length: N }, (_, i) => `<button type="button" class="og-tile" data-i="${i}" aria-label="Casa ${i + 1}"><span class="og-tile-face"></span></button>`).join('');
    g.querySelectorAll('.og-tile').forEach((b) => b.addEventListener('click', () => abrir(+b.dataset.i)));
  }

  function atualizarInfo() {
    const minas = jogo ? jogo.minas.size : nMinas();
    const gemas = jogo ? jogo.abertas.size : 0;
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
      const pode = jogo.abertas.size > 0;
      play.innerHTML = pode ? 'Recolher <small>' + OG.fmt(Math.floor(jogo.aposta * multiplicador(jogo.minas.size, jogo.abertas.size))) + '</small>' : 'Recolher';
      play.disabled = !pode;
      play.classList.add('og-play-cash');
    } else {
      play.textContent = 'Apostar';
      play.disabled = false;
      play.classList.remove('og-play-cash');
    }
    $('minesRandom').hidden = !ativo;
    OG.lockBet('minesBet', !!ativo);
    $('minesCount').disabled = !!ativo;
    $('minesGrid').classList.toggle('ativo', !!ativo);
    atualizarInfo();
  }

  function iniciar() {
    const v = OG.readBet('minesBet'); if (!v) return;
    OG.adjust(-v); OG.sound('bet');
    const minas = new Set();
    const k = nMinas();
    while (minas.size < k) minas.add(OG.randInt(N));
    jogo = { aposta: v, minas, abertas: new Set(), ativo: true };
    construirGrelha();
    setUI();
  }

  function revelar(i, tipo, fraco) {
    const b = $('minesGrid').querySelector(`[data-i="${i}"]`);
    if (!b || b.classList.contains('aberta')) return;
    b.classList.add('aberta', tipo);
    if (fraco) b.classList.add('fraca');
    b.querySelector('.og-tile-face').innerHTML = tipo === 'gema' ? GEMA : BOMBA;
    b.disabled = true;
  }

  function revelarTudo() {
    for (let i = 0; i < N; i++) revelar(i, jogo.minas.has(i) ? 'bomba' : 'gema', true);
  }

  function abrir(i) {
    if (!jogo || !jogo.ativo || jogo.abertas.has(i)) return;
    if (jogo.minas.has(i)) {
      jogo.ativo = false;
      revelar(i, 'bomba');
      $('minesGrid').querySelector(`[data-i="${i}"]`).classList.add('explodiu');
      OG.sound('boom'); OG.shake($('minesStage'));
      setTimeout(revelarTudo, 350);
      OG.pushHistory('mines', jogo.aposta, -jogo.aposta, `Mina após ${jogo.abertas.size} gema${jogo.abertas.size === 1 ? '' : 's'} (${jogo.minas.size} minas)`);
      OG.pushRecent('minesRecent', '0.00x', 'lose');
      setUI();
      return;
    }
    jogo.abertas.add(i);
    revelar(i, 'gema');
    OG.sound('gem');
    const b = $('minesGrid').querySelector(`[data-i="${i}"]`);
    const m = multiplicador(jogo.minas.size, jogo.abertas.size);
    const tag = document.createElement('em'); tag.className = 'og-tile-mult'; tag.textContent = OG.fmtMult(m);
    b.appendChild(tag);
    if (jogo.abertas.size === N - jogo.minas.size) return recolher();
    setUI();
  }

  function recolher() {
    if (!jogo || !jogo.ativo || !jogo.abertas.size) return;
    jogo.ativo = false;
    const m = multiplicador(jogo.minas.size, jogo.abertas.size);
    const ganho = Math.floor(jogo.aposta * m);
    OG.adjust(ganho); OG.sound('win');
    OG.winCard($('minesStage'), m, ganho);
    if (m >= 5) OG.confetti($('minesStage'));
    OG.pushHistory('mines', jogo.aposta, ganho - jogo.aposta, `${jogo.abertas.size} gemas · ${OG.fmtMult(m)} (${jogo.minas.size} minas)`);
    OG.pushRecent('minesRecent', OG.fmtMult(m), 'win');
    revelarTudo();
    setUI();
  }

  function aleatoria() {
    if (!jogo || !jogo.ativo) return;
    const livres = [];
    for (let i = 0; i < N; i++) if (!jogo.abertas.has(i)) livres.push(i);
    abrir(livres[OG.randInt(livres.length)]);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('minesGrid')) return;
    construirGrelha();
    $('minesPlay').addEventListener('click', () => (jogo && jogo.ativo ? recolher() : iniciar()));
    $('minesRandom').addEventListener('click', aleatoria);
    $('minesCount').addEventListener('change', atualizarInfo);
    setUI();
  });
})();
