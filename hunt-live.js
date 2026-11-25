/* =====================================================================
   Hunt ao vivo (hunt.html)
   A hunt que o streamer está a fazer no bonus tracker chega aqui através
   da API (/api/hunt), a atualizar de 5 em 5 segundos. O Guess the Balance
   é feito aqui, com login da Twitch. Por baixo fica o arquivo de hunts.
   Endereços:  hunt.html            -> hunt atual
               hunt.html#h=<id>     -> uma hunt do arquivo
   ===================================================================== */
(function () {
  'use strict';
  const API = (window.FSTV_API || 'https://fabiosilvatv-api.vercel.app') + '/api/hunt';
  const TOKEN_KEY = 'obaba_twitch_token';
  const $ = (id) => document.getElementById(id);
  const vista = $('hlVista');
  if (!vista) return;

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const token = () => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } };
  const user = () => (typeof TwitchAuth !== 'undefined' && TwitchAuth.getUser && TwitchAuth.getUser()) || null;

  function dinheiro(v, cur) {
    if (v == null || !isFinite(v)) return '—';
    const s = Number(v).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return cur === '€' || !cur ? s + ' €' : cur + ' ' + s;
  }
  const vezes = (v) => (v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('pt-PT', { maximumFractionDigits: v >= 100 ? 0 : 2 }) + 'x');
  const data = (ms) => new Date(ms).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
  const hora = (ms) => new Date(ms).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  async function api(q, opts) {
    const r = await fetch(API + q, Object.assign({ cache: 'no-store' }, opts || {}));
    let j = {};
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(j.error || 'Erro ' + r.status);
    return j;
  }

  let idArquivo = null;      // a ver uma hunt antiga?
  let ultima = null;         // última hunt mostrada
  let meuPalpite = null;
  let aEditar = false;       // não redesenhar o formulário enquanto se escreve

  function lerHash() {
    const m = /[#&]h=([a-z0-9-]{1,48})/.exec(location.hash);
    idArquivo = m ? m[1] : null;
  }

  /* ---------------- desenhar ---------------- */
  function estadoTexto(h) {
    if (idArquivo) return 'Hunt de ' + data(h.criada);
    if (h.aoVivo) return h.stats.abertos >= h.stats.n && h.stats.n > 0 ? 'Terminada agora' : 'Ao vivo agora';
    return 'A última hunt, de ' + data(h.criada);
  }

  function blocoNumeros(h) {
    const s = h.stats, c = h.cur;
    const lucro = s.abertos > 0 ? s.pago - s.custo : null;
    const linhas = [
      ['Custo', dinheiro(s.custo, c)],
      ['Total pago', dinheiro(s.pago, c), 'dinheiro'],
      ['Breakeven', vezes(s.be)],
      ['x médio', s.abertos ? vezes(s.media) : '—'],
      ['Precisa', s.precisa == null ? '—' : vezes(s.precisa)],
      ['Lucro', lucro == null ? '—' : (lucro >= 0 ? '+' : '−') + dinheiro(Math.abs(lucro), c), lucro == null ? '' : lucro >= 0 ? 'pos' : 'neg'],
    ];
    return '<dl class="hl-numeros">' + linhas.map((l) => '<div class="' + (l[2] || '') + '"><dt>' + l[0] + '</dt><dd>' + l[1] + '</dd></div>').join('') + '</dl>';
  }

  function blocoGuess(h) {
    const g = h.guess || {};
    if (idArquivo || g.estado === 'fechado') {
      if (g.estado !== 'resolvido') return '';
    }
    const premio = g.premio ? '<span class="hl-premio">Prémio: ' + g.premio.toLocaleString('pt-PT') + ' BabaCoins</span>' : '';
    let corpo = '';
    if (g.estado === 'aberto') {
      const u = user();
      if (!token() || !u) {
        corpo = '<p>Adivinha quanto vai pagar a hunt no total. Quem ficar mais perto ganha.</p>' +
          '<button class="btn-twitch" type="button" id="hlEntrar"><i class="fab fa-twitch" aria-hidden="true"></i> Entrar com a Twitch para dar palpite</button>';
      } else {
        corpo = '<p>Adivinha quanto vai pagar a hunt no total. Podes mudar o palpite até os palpites fecharem.</p>' +
          '<form class="hl-form" id="hlForm" novalidate>' +
          '<label for="hlValor">O teu palpite (' + esc(h.cur || '€') + ')</label>' +
          '<div class="hl-form-linha"><input id="hlValor" inputmode="decimal" autocomplete="off" placeholder="ex.: 1250" value="' + (meuPalpite ? esc(meuPalpite.valor) : '') + '">' +
          '<button class="btn-twitch" type="submit">' + (meuPalpite ? 'Mudar palpite' : 'Dar palpite') + '</button></div>' +
          '<p class="hl-msg" id="hlMsg" role="status">' + (meuPalpite ? 'O teu palpite: <b>' + dinheiro(meuPalpite.valor, h.cur) + '</b>' : 'Estás a jogar como <b>' + esc(u.displayName || u.login) + '</b>.') + '</p>' +
          '</form>';
      }
      corpo += '<p class="hl-conta">' + (g.n || 0) + (g.n === 1 ? ' pessoa já deu palpite' : ' pessoas já deram palpite') + '</p>';
    } else if (g.estado === 'espera') {
      corpo = '<p>Os palpites estão fechados. ' + (g.n || 0) + (g.n === 1 ? ' pessoa participou' : ' pessoas participaram') + '; agora é esperar pelo fim da hunt.</p>' +
        (meuPalpite ? '<p class="hl-msg">O teu palpite: <b>' + dinheiro(meuPalpite.valor, h.cur) + '</b></p>' : '');
    } else if (g.estado === 'resolvido') {
      const v = g.vencedor;
      corpo = '<p class="hl-vencedor">' + (v ? 'Ganhou <b>' + esc(v.nome) + '</b>, com ' + dinheiro(v.valor, h.cur) + ' (falhou por ' + dinheiro(v.dif, h.cur) + ').' : 'Ninguém deu palpite nesta hunt.') + '</p>' +
        '<p>Total pago: <b>' + dinheiro(g.alvo, h.cur) + '</b></p>' +
        (g.podio && g.podio.length ? '<ol class="hl-podio">' + g.podio.map((p) => '<li><span>' + esc(p.nome) + '</span><span>' + dinheiro(p.valor, h.cur) + '</span><span class="dif">a ' + dinheiro(p.dif, h.cur) + '</span></li>').join('') + '</ol>' : '');
    }
    return '<section class="panel hl-guess hl-guess-' + esc(g.estado) + '"><div class="panel-head"><div><h2 class="panel-title">Guess the Balance</h2></div>' + premio + '</div>' + corpo + '</section>';
  }

  function blocoBonus(h) {
    const atualIdx = h.itens.findIndex((b) => !b.ab);
    const aAbrir = h.stats.abertos > 0 && atualIdx >= 0;
    const linhas = h.itens.map((b, i) => {
      const x = b.ab && b.bet > 0 ? b.pay / b.bet : null;
      const cls = ['hl-bonus', b.ab ? 'aberto' : '', aAbrir && i === atualIdx && !idArquivo ? 'agora' : '', x != null && x >= 100 ? 'grande' : ''].join(' ');
      return '<li class="' + cls + '">' +
        '<span class="hl-pos">' + (i + 1) + '</span>' +
        (b.img ? '<img src="' + esc(b.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="hl-sem-img" aria-hidden="true"></span>') +
        '<span class="hl-slot"><b>' + esc(b.n) + '</b><small>' + esc(b.p) + (b.sup ? ' · Super' : '') + (b.ext ? ' · Extreme' : '') + '</small></span>' +
        '<span class="hl-aposta">' + dinheiro(b.bet, h.cur) + '</span>' +
        '<span class="hl-pagou">' + (b.ab ? dinheiro(b.pay, h.cur) : (aAbrir && i === atualIdx && !idArquivo ? 'a abrir…' : '—')) + '</span>' +
        '<span class="hl-x">' + (x != null ? vezes(x) : '') + '</span>' +
        '</li>';
    }).join('');
    return '<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Bónus <span class="sec-conta">' + h.stats.abertos + '/' + h.stats.n + '</span></h2>' +
      '<p class="panel-sub">' + (h.stats.n ? 'Aposta, quanto pagou e quantas vezes a aposta.' : 'Ainda não há bónus nesta hunt.') + '</p></div></div>' +
      (h.stats.n ? '<ol class="hl-lista">' + linhas + '</ol>' : '') + '</section>';
  }

  function desenhar(h) {
    ultima = h;
    if (!h) {
      vista.innerHTML = '<section class="panel"><p class="hl-vazio">Ainda não há hunts no site. Aparecem aqui quando o FabioSilva_TV fizer a próxima na live.</p></section>';
      return;
    }
    if (aEditar) return; // não estragar o que a pessoa está a escrever
    $('hlTitulo').textContent = (h.nome || 'Bonus Hunt') + (h.num ? ' #' + h.num : '');
    $('hlSub').textContent = idArquivo
      ? 'Hunt guardada no arquivo, com todos os bónus e o resultado do Guess the Balance.'
      : 'A hunt que está a ser feita na live, a atualizar sozinha. Dá o teu palpite no Guess the Balance e vê o arquivo de todas as hunts.';
    const ao = !idArquivo && h.aoVivo;
    vista.innerHTML =
      '<div class="hl-topo">' +
      '<p class="hl-estado' + (ao ? ' vivo' : '') + '"><span class="ponto"></span>' + estadoTexto(h) + (ao ? ' <span class="hl-hora">atualizada às ' + hora(h.atualizada) + '</span>' : '') + '</p>' +
      '<span class="hl-topo-acoes">' +
      (ehDono() ? '<button type="button" class="btn-ghost hl-apagar" id="hlApagar"><i class="fas fa-trash" aria-hidden="true"></i> Apagar hunt</button>' : '') +
      (idArquivo ? '<a class="btn-ghost" href="hunt.html">Voltar à hunt atual</a>' : '') +
      '</span></div>' +
      blocoNumeros(h) + blocoGuess(h) + blocoBonus(h);
    ligarFormulario();
    ligarApagar(h);
  }

  // Só o streamer vê o botão de apagar (a API confirma na mesma)
  const DONOS = ['fabiosilva_tv'];
  function ehDono() { const u = user(); return !!(u && token() && DONOS.includes(String(u.login || '').toLowerCase())); }

  function ligarApagar(h) {
    const b = $('hlApagar');
    if (!b) return;
    b.addEventListener('click', async () => {
      const nome = (h.nome || 'Bonus Hunt') + (h.num ? ' #' + h.num : '');
      if (!window.confirm('Apagar "' + nome + '" do site? Os bónus e os palpites desta hunt desaparecem e não dá para desfazer.')) return;
      b.disabled = true;
      try {
        await api('', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify({ acao: 'apagar', id: h.id }) });
        pagina = 0; carregarArquivo(false);
        if (idArquivo) { location.hash = ''; } else { ultima = null; carregar(); }
      } catch (e) {
        b.disabled = false;
        window.alert('Não foi possível apagar: ' + e.message);
      }
    });
  }

  function ligarFormulario() {
    const entrar = $('hlEntrar');
    if (entrar) entrar.addEventListener('click', () => { if (typeof TwitchAuth !== 'undefined') TwitchAuth.login(); });
    const f = $('hlForm');
    if (!f) return;
    const inp = $('hlValor');
    inp.addEventListener('focus', () => { aEditar = true; });
    inp.addEventListener('blur', () => { setTimeout(() => { aEditar = false; }, 300); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('hlMsg');
      const valor = parseFloat(String(inp.value).replace(/\s/g, '').replace(',', '.'));
      if (!(valor > 0)) { msg.textContent = 'Escreve um valor maior do que 0.'; return; }
      const u = user();
      msg.textContent = 'A enviar…';
      try {
        const r = await api('', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
          body: JSON.stringify({ acao: 'palpite', valor, nome: u ? u.displayName || u.login : '' }),
        });
        meuPalpite = { valor: r.valor };
        aEditar = false;
        msg.innerHTML = (r.alterado ? 'Palpite mudado: ' : 'Palpite registado: ') + '<b>' + dinheiro(r.valor, ultima && ultima.cur) + '</b>';
        setTimeout(carregar, 1200);
      } catch (err) {
        msg.textContent = err.message;
      }
    });
  }

  /* ---------------- dados ---------------- */
  async function carregarMeu() {
    if (!token() || idArquivo) { meuPalpite = null; return; }
    try { meuPalpite = (await api('?acao=meu', { headers: { Authorization: 'Bearer ' + token() } })).palpite; } catch (e) { meuPalpite = null; }
  }

  async function carregar() {
    try {
      const j = idArquivo ? await api('?acao=ver&id=' + encodeURIComponent(idArquivo)) : await api('?acao=atual');
      const h = j.hunt;
      if (h && h.guess && h.guess.estado !== 'fechado' && !idArquivo) await carregarMeu();
      desenhar(h);
    } catch (e) {
      if (!ultima) vista.innerHTML = '<section class="panel"><p class="hl-vazio">Não foi possível carregar a hunt agora (' + esc(e.message) + '). Tenta daqui a pouco.</p></section>';
    }
  }

  let pagina = 0;
  async function carregarArquivo(mais) {
    const box = $('hlArquivo');
    try {
      const j = await api('?acao=lista&pagina=' + pagina);
      const cartoes = j.hunts.map((h) => {
        const lucro = h.pago - h.custo;
        return '<a class="hl-cartao" href="hunt.html#h=' + esc(h.id) + '">' +
          (h.img ? '<img src="' + esc(h.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="hl-sem-img" aria-hidden="true"></span>') +
          '<span class="hl-cartao-txt"><b>' + esc(h.nome) + (h.num ? ' #' + esc(h.num) : '') + '</b>' +
          '<small>' + data(h.criada) + ', ' + h.n + ' bónus</small>' +
          '<span class="hl-cartao-num"><span>' + dinheiro(h.custo, h.cur) + ' → <b>' + dinheiro(h.pago, h.cur) + '</b></span>' +
          '<span class="' + (lucro >= 0 ? 'pos' : 'neg') + '">' + (h.custo ? vezes(h.pago / h.custo) : '') + '</span></span>' +
          (h.vencedor ? '<small class="hl-cartao-venc">Guess: ganhou ' + esc(h.vencedor) + '</small>' : '') +
          '</span></a>';
      }).join('');
      if (!mais) box.innerHTML = cartoes || '<p class="hl-vazio">O arquivo ainda está vazio.</p>';
      else box.insertAdjacentHTML('beforeend', cartoes);
      $('hlMais').hidden = pagina + 1 >= j.paginas;
    } catch (e) {
      if (!mais) box.innerHTML = '<p class="hl-vazio">Não foi possível carregar o arquivo agora.</p>';
    }
  }
  $('hlMais').addEventListener('click', () => { pagina++; carregarArquivo(true); });

  window.addEventListener('hashchange', () => { lerHash(); ultima = null; vista.innerHTML = '<section class="panel"><p class="hl-vazio">A carregar…</p></section>'; carregar(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.addEventListener('twitch:pronto', () => carregar());

  lerHash();
  carregar();
  carregarArquivo(false);
  setInterval(() => { if (!idArquivo && !document.hidden) carregar(); }, 5000);
})();
