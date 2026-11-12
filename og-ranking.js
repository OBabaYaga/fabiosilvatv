// ===================================================================
// Ranking dos minijogos (página jogos.html)
// Fichas sem valor, ganhas a ver a live: o ranking é só para mostrar
// quem tem mais fichas.
// ===================================================================
(function () {
  const API = (window.FSTV_API || 'https://fabiosilvatv-api.vercel.app') + '/api/jogos';
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const linha = (t, i, eu) =>
    `<tr${t.login === eu ? ' class="eu"' : ''}><td><span class="og-ranking-pos${i < 3 ? ' p' + (i + 1) : ''}">${i + 1}</span></td><td>${esc(t.login)}</td><td class="n">${fmt(t.fichas)}</td></tr>`;

  async function carregar() {
    const caixa = $('rankingSemanal');
    if (!caixa) return;
    let r;
    try {
      const res = await fetch(API, { cache: 'no-store' });
      r = await res.json();
      if (!res.ok) throw new Error();
    } catch (e) {
      caixa.innerHTML = '<p class="og-ranking-vazio">Não foi possível carregar o ranking agora.</p>';
      return;
    }
    const u = window.TwitchAuth && TwitchAuth.getUser && TwitchAuth.getUser();
    const eu = u && u.login;
    const meta = `<div class="og-ranking-meta"><span><i class="fas fa-coins" aria-hidden="true"></i> Começas com ${fmt(r.inicial)} fichas</span><span><i class="fas fa-tv" aria-hidden="true"></i> Ganhas mais a ver a live (~${fmt(120 * (r.fichasPorPonto || 1))}/hora)</span><span><i class="fas fa-users" aria-hidden="true"></i> ${fmt(r.jogadores || 0)} jogadores</span></div>`;
    const tabela = r.top.length
      ? `<table class="og-ranking-tabela"><thead><tr><th>#</th><th>Jogador</th><th class="n">Fichas</th></tr></thead><tbody>${r.top.map((t, i) => linha(t, i, eu)).join('')}</tbody></table>`
      : '<p class="og-ranking-vazio">Ainda ninguém jogou. Sê o primeiro!</p>';
    caixa.innerHTML = meta + tabela;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const p = window.TwitchAuth && TwitchAuth.pronto;
    (p || Promise.resolve()).then(carregar);
    const b = $('rankingSemanalRefresh');
    if (b) b.addEventListener('click', carregar);
  });
})();
