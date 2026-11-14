// ===================================================================
// FabioSilva_TV — Estatísticas do site (painel só do streamer)
// Aparece na página da Loja, por baixo da Gestão da loja, quando entras
// com a conta Twitch do canal. Os dados vêm de /api/stats.
// ===================================================================
(function () {
  const API = (window.FSTV_API || 'https://fabiosilvatv-api.vercel.app') + '/api/stats';
  const TOKEN_KEY = 'obaba_twitch_token';
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const PAGINAS = {
    '/index.html': 'Início', '/casinos.html': 'Casinos', '/loja.html': 'Loja', '/jogos.html': 'Minijogos', '/ranking.html': 'Ranking',
    '/bonus-hunt.html': 'Bonus Hunt', '/comunidade.html': 'Comunidade', '/contacto.html': 'Contacto', '/termos.html': 'Termos',
    '/privacidade.html': 'Privacidade', '/cookies.html': 'Cookies', '/blackjack.html': 'Blackjack', '/crash.html': 'Crash',
    '/dados.html': 'Dados', '/minas.html': 'Minas', '/plinko.html': 'Plinko', '/roleta.html': 'Roleta', '/slots.html': 'Slots', '/404.html': 'Página não encontrada',
  };
  const SITIOS = {
    'inicio:cartao': 'Início · botão do cartão', 'inicio:detalhes': 'Início · detalhes da oferta', 'inicio:termos': 'Início · termos',
    'inicio:popup': 'Popup', 'casinos:cartao': 'Casinos · botão do cartão', 'casinos:detalhes': 'Casinos · detalhes da oferta',
    'casinos:termos': 'Casinos · termos', 'casinos:popup': 'Popup', 'outra:popup': 'Popup', 'outra:cartao': 'Outra página', 'outra:outro': 'Outro sítio',
  };
  const CORES = { coldbet: '#3fc3f0', captainsbet: '#f0c14b', '22bit': '#ff5f5f', betlabel: '#7ee03c', royalxo: '#d9a24a', safecasino: '#4da3ff', outro: '#93a7c0' };

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let dados = null;
  let mesSel = null; // 'AAAA-MM'
  let vista = 'mes';

  function token() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  async function carregar() {
    const t = token();
    if (!t) return;
    const q = new URLSearchParams({ dias: '30' });
    if (mesSel) { q.set('mes', mesSel); q.set('ano', mesSel.slice(0, 4)); }
    $('stNota').textContent = 'A carregar…';
    try {
      const r = await fetch(API + '?' + q, { headers: { Authorization: 'Bearer ' + t }, cache: 'no-store' });
      if (r.status === 403 || r.status === 401) { $('siteStats').hidden = true; return; }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'erro');
      dados = j;
      if (!mesSel) mesSel = j.mes.id;
      $('siteStats').hidden = false;
      desenhar();
      $('stNota').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) + '. Os números contam a partir de 14 de novembro de 2026.';
    } catch (e) {
      $('stNota').textContent = 'Não consegui carregar as estatísticas. Tenta outra vez daqui a pouco.';
    }
  }

  function variacao(a, b) {
    if (b == null) return '';
    if (!b) return a ? '<span class="st-var sobe">novo</span>' : '';
    const p = Math.round(((a - b) / b) * 100);
    if (!p) return '<span class="st-var">= ontem</span>';
    return '<span class="st-var ' + (p > 0 ? 'sobe' : 'desce') + '">' + (p > 0 ? '▲ ' : '▼ ') + Math.abs(p) + '% vs ontem</span>';
  }

  function kpi(titulo, v, extra) {
    return '<div class="st-kpi"><div class="st-kpi-tit">' + titulo + '</div>' +
      '<div class="st-kpi-linha"><b>' + fmt(v.visitantes) + '</b><span>visitantes</span></div>' +
      '<div class="st-kpi-linha"><b>' + fmt(v.visitas) + '</b><span>páginas vistas</span></div>' +
      '<div class="st-kpi-linha ouro"><b>' + fmt(v.cliques) + '</b><span>cliques em parceiros</span></div>' + (extra || '') + '</div>';
  }

  function nomeMes(id) {
    const [a, m] = id.split('-');
    return MESES[+m - 1] + ' ' + a;
  }

  function desenhar() {
    const d = dados;
    const h = d.hoje, o = d.ontem;
    $('stKpis').innerHTML =
      kpi('Hoje', h, '<div class="st-kpi-var">' + variacao(h.visitantes, o && o.visitantes) + '</div>') +
      kpi('Ontem', o || { visitantes: 0, visitas: 0, cliques: 0 }) +
      kpi(nomeMes(d.mes.id).replace(/^./, (c) => c.toUpperCase()), d.mes) +
      kpi('Ano ' + d.ano.id, d.ano);

    // gráfico dos últimos 30 dias
    const max = Math.max(1, ...d.dias.map((x) => Math.max(x.visitantes, x.cliques)));
    $('stGrafico').innerHTML = d.dias.map((x, i) => {
      const [, m, dia] = x.data.split('-');
      const hv = Math.round((x.visitantes / max) * 100);
      const hc = Math.round((x.cliques / max) * 100);
      const marcas = Object.entries(x.porMarca || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => (d.marcas[k] || k) + ': ' + v).join(', ');
      const dica = dia + '/' + m + ' — ' + x.visitantes + ' visitantes, ' + x.visitas + ' páginas, ' + x.cliques + ' cliques' + (marcas ? ' (' + marcas + ')' : '');
      const mostrar = i === 0 || i === d.dias.length - 1 || dia === '01' || i % 5 === 0;
      return '<div class="st-dia' + (i === d.dias.length - 1 ? ' hoje' : '') + '" title="' + esc(dica) + '" tabindex="0" aria-label="' + esc(dica) + '">' +
        '<div class="st-barras"><i class="st-b st-b-v" style="height:' + hv + '%"></i><i class="st-b st-b-c" style="height:' + hc + '%"></i></div>' +
        '<span class="st-dia-n">' + (mostrar ? +dia + (dia === '01' || i === 0 ? ' ' + MESES_CURTOS[+m - 1] : '') : '') + '</span></div>';
    }).join('');

    // navegação de mês
    $('stMesNome').textContent = vista === 'mes' ? nomeMes(d.mes.id) : 'Ano ' + d.ano.id;
    $('stAnoNome').textContent = d.ano.id;
    const atual = d.hoje.data.slice(0, 7);
    $('stMesSeg').disabled = vista === 'mes' ? d.mes.id >= atual : d.ano.id >= atual.slice(0, 4);
    document.querySelectorAll('.st-vista button').forEach((b) => b.classList.toggle('ativo', b.dataset.vista === vista));

    const fonte = vista === 'mes' ? d.mes : d.ano;

    // cliques por marca, com o sítio onde clicaram
    const ordem = ['coldbet', 'captainsbet', '22bit', 'betlabel', 'royalxo', 'safecasino', 'outro'];
    const maxM = Math.max(1, ...Object.values(fonte.porMarca || {}));
    const linhas = ordem.filter((m) => m !== 'outro' || fonte.porMarca.outro).map((m) => {
      const v = fonte.porMarca[m] || 0;
      const sitios = Object.entries((fonte.porSitio || {})[m] || {}).sort((a, b) => b[1] - a[1])
        .map(([s, n]) => '<span>' + esc(SITIOS[s] || s) + ' <b>' + fmt(n) + '</b></span>').join('');
      return '<div class="st-marca"><div class="st-marca-top"><strong>' + esc(d.marcas[m] || m) + '</strong><b>' + fmt(v) + '</b></div>' +
        '<div class="st-marca-barra"><i style="width:' + Math.round((v / maxM) * 100) + '%;background:' + CORES[m] + '"></i></div>' +
        (sitios ? '<div class="st-sitios">' + sitios + '</div>' : '') + '</div>';
    });
    $('stMarcas').innerHTML = fonte.cliques ? linhas.join('') : '<p class="st-vazio">Ainda ninguém clicou num link de parceria ' + (vista === 'mes' ? 'neste mês' : 'neste ano') + '.</p>';

    $('stPaginas').innerHTML = lista(fonte.paginas, (k) => PAGINAS[k] || k.replace(/^\/|\.html$/g, ''));
    $('stOrigens').innerHTML = lista(fonte.origens, (k) => k);

    // tabela mês a mês
    const comVisitas = d.ano.meses.filter((m) => m.visitas || m.cliques);
    const primeiro = comVisitas.length ? comVisitas[0].id : d.mes.id;
    const mesesComDados = d.ano.meses.filter((m) => m.id >= primeiro && m.id <= atual);
    $('stMeses').innerHTML = '<thead><tr><th>Mês</th><th>Visitantes</th><th>Páginas vistas</th><th>Cliques</th></tr></thead><tbody>' +
      mesesComDados.map((m) => '<tr' + (m.id === d.mes.id ? ' class="sel"' : '') + '><td>' + MESES[+m.id.slice(5) - 1] + '</td><td>' + fmt(m.visitantes) + '</td><td>' + fmt(m.visitas) + '</td><td>' + fmt(m.cliques) + '</td></tr>').join('') +
      '<tr class="total"><td>Total do ano</td><td>' + fmt(d.ano.visitantes) + '</td><td>' + fmt(d.ano.visitas) + '</td><td>' + fmt(d.ano.cliques) + '</td></tr></tbody>';
  }

  function lista(obj, nome) {
    const e = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!e.length) return '<p class="st-vazio">Sem dados ainda.</p>';
    const tot = e.reduce((s, x) => s + x[1], 0) || 1;
    return e.map(([k, v]) => '<div class="st-li"><span>' + esc(nome(k)) + '</span><b>' + fmt(v) + '</b><em>' + Math.round((v / tot) * 100) + '%</em>' +
      '<i style="width:' + Math.round((v / e[0][1]) * 100) + '%"></i></div>').join('');
  }

  function mudarMes(delta) {
    if (!mesSel) return;
    let [a, m] = mesSel.split('-').map(Number);
    if (vista === 'ano') a += delta;
    else { m += delta; if (m < 1) { m = 12; a--; } if (m > 12) { m = 1; a++; } }
    mesSel = a + '-' + String(m).padStart(2, '0');
    carregar();
  }

  function iniciar() {
    if (!$('siteStats')) return;
    $('stAtualizar').addEventListener('click', carregar);
    $('stMesAnt').addEventListener('click', () => mudarMes(-1));
    $('stMesSeg').addEventListener('click', () => mudarMes(1));
    document.querySelectorAll('.st-vista button').forEach((b) => b.addEventListener('click', () => { vista = b.dataset.vista; if (dados) desenhar(); }));
    const chk = $('stNaoContar');
    try { chk.checked = localStorage.getItem('fstv_nao_contar') === '1'; } catch (e) {}
    chk.addEventListener('change', () => { try { if (chk.checked) localStorage.setItem('fstv_nao_contar', '1'); else localStorage.removeItem('fstv_nao_contar'); } catch (e) {} });
    const tw = typeof TwitchAuth !== 'undefined' ? TwitchAuth : window.TwitchAuth;
    if (tw && tw.pronto) tw.pronto.then(() => { if (tw.isLoggedIn()) carregar(); });
    else carregar();
    document.addEventListener('twitch:pronto', () => { if (!dados) carregar(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
