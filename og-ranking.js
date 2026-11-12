// ===================================================================
// Ranking semanal dos minijogos (página jogos.html)
// Fichas sem valor: o ranking é só para mostrar quem jogou melhor.
// ===================================================================
(function () {
  const API = (window.FSTV_API || 'https://fabiosilvatv-api.vercel.app') + '/api/jogos';
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function falta(ms) {
    const s = Math.max(0, Math.floor((ms - Date.now()) / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}min` : `${m}min`;
  }
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
    const meta = `<div class="og-ranking-meta"><span><i class="fas fa-clock" aria-hidden="true"></i> Recomeça daqui a ${falta(r.fimSemana)}</span><span><i class="fas fa-coins" aria-hidden="true"></i> Toda a gente começa com ${fmt(r.inicial)} fichas</span></div>`;
    const tabela = r.top.length
      ? `<table class="og-ranking-tabela"><thead><tr><th>#</th><th>Jogador</th><th class="n">Fichas</th></tr></thead><tbody>${r.top.map((t, i) => linha(t, i, eu)).join('')}</tbody></table>`
      : '<p class="og-ranking-vazio">Ainda ninguém jogou esta semana. Sê o primeiro!</p>';
    const ant = r.anterior && r.anterior.top.length
      ? `<p class="og-ranking-meta" style="margin-top:.9rem"><span><i class="fas fa-medal" aria-hidden="true"></i> Semana passada: ${r.anterior.top.map((t, i) => `${i + 1}.º ${esc(t.login)} (${fmt(t.fichas)})`).join(' · ')}</span></p>`
      : '';
    caixa.innerHTML = meta + tabela + ant;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const p = window.TwitchAuth && TwitchAuth.pronto;
    (p || Promise.resolve()).then(carregar);
    const b = $('rankingSemanalRefresh');
    if (b) b.addEventListener('click', carregar);
  });
})();
