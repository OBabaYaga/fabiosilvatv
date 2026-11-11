// ===================================================================
// FabioSilva_TV — Loja de pontos
// ===================================================================
//
// Duas carteiras (igual ao ESTV):
//   - Pontos StreamElements: os de ver a live. Nunca são gastos.
//   - Saldo da loja: ganha os mesmos pontos, e é o que se gasta aqui.
//
// As imagens dos prémios ficam em assets/loja/ (480×640, formato 3:4).
// Tudo (saldo, stock, pedidos) vive na API fabiosilvatv-api (Vercel +
// Redis). Se o streamer (ADMIN_LOGINS) entrar, aparece por baixo a
// "Gestão da loja": prémios, preços, stock, pedidos e ajustes de saldo.
// ===================================================================

(function () {
  // Endereço da API no Vercel (muda aqui se o projeto tiver outro nome)
  const LOJA_API = 'https://fabiosilvatv-api.vercel.app';
  const TOKEN_KEY = 'obaba_twitch_token';

  let produtos = [];
  let casinos = [];
  let estado = null; // { pontos, saldo, pedidos, admin }
  let adminDados = null;
  let filtroPedidos = 'pendente';

  const $ = (id) => document.getElementById(id);

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmt(n) {
    const num = Math.round(Number(n) || 0);
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Só aceita imagens do próprio site ou https (a API já valida, isto é
  // só uma segunda proteção).
  function imagemSegura(src) {
    return typeof src === 'string' && (/^assets\/[a-z0-9/_.-]+$/i.test(src) || /^https:\/\//i.test(src)) ? src : '';
  }

  function capa(p, cls) {
    const img = imagemSegura(p.imagem);
    return img
      ? `<img class="${cls}" src="${esc(img)}" alt="${esc(p.nome)}" loading="lazy">`
      : `<div class="loja-item-icone"><i class="fas ${esc(p.icone || 'fa-gift')}" aria-hidden="true"></i></div>`;
  }

  function dataCurta(ts) {
    return new Date(ts).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function token() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  }

  async function api(corpo) {
    const t = token();
    const opts = corpo
      ? {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {}),
          body: JSON.stringify(corpo),
        }
      : { cache: 'no-store' };
    const res = await fetch(LOJA_API + '/api/loja', opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = new Error(data.error || 'Algo correu mal. Tenta outra vez daqui a pouco.');
      e.status = res.status;
      throw e;
    }
    return data;
  }

  function toast(msg, tipo) {
    let t = $('lojaToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'lojaToast';
      t.className = 'loja-toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'loja-toast show ' + (tipo || '');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => (t.className = 'loja-toast'), 4000);
  }

  // ---------------------------------------------------------------
  // Carteira + prémios
  // ---------------------------------------------------------------
  function renderCarteira() {
    const el = $('lojaCarteira');
    if (!el) return;
    if (!estado) {
      el.innerHTML = `
        <div class="loja-login">
          <i class="fab fa-twitch" aria-hidden="true"></i>
          <div><strong>Entra com a Twitch para comprar</strong><span>O teu saldo da loja ganha os mesmos pontos que recebes a ver a live.</span></div>
          <button class="btn-gold loja-login-btn" type="button"><i class="fab fa-twitch" aria-hidden="true"></i> Entrar</button>
        </div>`;
      el.querySelector('.loja-login-btn').onclick = () => typeof TwitchAuth !== 'undefined' && TwitchAuth.login();
      return;
    }
    el.innerHTML = `
      <div class="loja-wallet">
        <div class="loja-wallet-item">
          <span class="loja-wallet-label"><i class="fas fa-tower-broadcast" aria-hidden="true"></i> Pontos da live</span>
          <strong class="loja-wallet-valor">${fmt(estado.pontos)}</strong>
          <small>StreamElements · nunca são gastos</small>
        </div>
        <div class="loja-wallet-item destaque">
          <span class="loja-wallet-label"><i class="fas fa-wallet" aria-hidden="true"></i> Saldo da loja</span>
          <strong class="loja-wallet-valor">${fmt(estado.saldo)}</strong>
          <small>É este que gastas nos prémios</small>
        </div>
      </div>`;
  }

  function renderProdutos() {
    const el = $('lojaProdutos');
    if (!el) return;
    if (!produtos.length) {
      el.innerHTML = '<p class="loja-vazio">Ainda não há prémios na loja. Volta em breve!</p>';
      return;
    }
    el.innerHTML = produtos
      .map((p) => {
        const esgotado = p.stock <= 0;
        const semSaldo = estado && estado.saldo < p.preco;
        let botao = 'Comprar';
        if (esgotado) botao = 'Esgotado';
        else if (!estado) botao = 'Entra para comprar';
        else if (semSaldo) botao = `Faltam ${fmt(p.preco - estado.saldo)}`;
        const ativo = !esgotado && estado && !semSaldo;
        return `
          <article class="loja-item${esgotado ? ' esgotado' : ''}${imagemSegura(p.imagem) ? ' com-imagem' : ''}">
            ${capa(p, 'loja-item-img')}
            ${esgotado ? '<span class="loja-fita">Esgotado</span>' : ''}
            <h3>${esc(p.nome)}</h3>
            <p>${esc(p.descricao || '')}</p>
            <div class="loja-item-info">
              <span class="loja-preco"><i class="fas fa-wallet" aria-hidden="true"></i> ${fmt(p.preco)}</span>
              <span class="loja-stock">${esgotado ? 'Sem stock' : `${fmt(p.stock)} disponíve${p.stock === 1 ? 'l' : 'is'}`}${p.limitePorMes ? ` · máx. ${p.limitePorMes}/mês` : ''}</span>
            </div>
            <button class="${ativo ? 'btn-gold' : 'btn-ghost'} loja-comprar" data-id="${esc(p.id)}" ${ativo || !estado ? '' : 'disabled'}>${botao}</button>
          </article>`;
      })
      .join('');
    el.querySelectorAll('.loja-comprar').forEach((b) => {
      b.onclick = () => {
        if (!estado) return typeof TwitchAuth !== 'undefined' && TwitchAuth.login();
        abrirCompra(b.dataset.id);
      };
    });
  }

  const ESTADOS = {
    pendente: { txt: 'Pendente', cls: 'pendente', icon: 'fa-hourglass-half' },
    entregue: { txt: 'Entregue', cls: 'entregue', icon: 'fa-check' },
    recusado: { txt: 'Recusado · pontos devolvidos', cls: 'recusado', icon: 'fa-rotate-left' },
  };

  function renderMeusPedidos() {
    const sec = $('lojaMeusPedidos');
    if (!sec) return;
    if (!estado || !estado.pedidos || !estado.pedidos.length) {
      sec.hidden = true;
      return;
    }
    sec.hidden = false;
    $('lojaMeusPedidosLista').innerHTML = estado.pedidos
      .map((p) => {
        const e = ESTADOS[p.estado] || ESTADOS.pendente;
        return `
          <li class="loja-pedido">
            <div><strong>${esc(p.nome)}</strong><small>${dataCurta(p.criadoEm)} · ${fmt(p.preco)} pontos${p.nota ? ' · ' + esc(p.nota) : ''}</small></div>
            <span class="loja-estado ${e.cls}"><i class="fas ${e.icon}" aria-hidden="true"></i> ${e.txt}</span>
          </li>`;
      })
      .join('');
  }

  // ---------------------------------------------------------------
  // Modal de compra
  // ---------------------------------------------------------------
  function campoHtml(c) {
    if (c.tipo === 'casino') {
      return `<label class="loja-campo"><span>${esc(c.label)}</span>
        <select name="${esc(c.id)}" required><option value="">Escolhe…</option>${casinos.map((x) => `<option>${esc(x)}</option>`).join('')}</select></label>`;
    }
    return `<label class="loja-campo"><span>${esc(c.label)}</span>
      <input name="${esc(c.id)}" type="${c.tipo === 'email' ? 'email' : 'text'}" maxlength="200" required autocomplete="${c.tipo === 'email' ? 'email' : 'off'}"></label>`;
  }

  function fecharModal() {
    const m = $('lojaModal');
    if (m) m.remove();
  }

  function abrirCompra(id) {
    const p = produtos.find((x) => x.id === id);
    if (!p) return;
    fecharModal();
    const m = document.createElement('div');
    m.id = 'lojaModal';
    m.className = 'loja-modal';
    m.innerHTML = `
      <form class="loja-modal-box" novalidate>
        <button type="button" class="loja-modal-fechar" aria-label="Fechar"><i class="fas fa-xmark" aria-hidden="true"></i></button>
        ${capa(p, 'loja-modal-img')}
        <h3>${esc(p.nome)}</h3>
        <p class="loja-modal-preco">${fmt(p.preco)} pontos do saldo · ficas com ${fmt(estado.saldo - p.preco)}</p>
        ${(p.campos || []).map(campoHtml).join('')}
        <p class="loja-modal-nota"><i class="fas fa-circle-info" aria-hidden="true"></i> O pedido fica pendente até o Fábio o entregar. Se não for possível, os pontos voltam para o teu saldo.</p>
        <p class="loja-modal-erro" hidden></p>
        <button type="submit" class="btn-gold loja-modal-ok">Confirmar compra</button>
      </form>`;
    document.body.appendChild(m);
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.closest('.loja-modal-fechar')) fecharModal();
    });
    const form = m.querySelector('form');
    const primeiro = form.querySelector('input,select');
    if (primeiro) primeiro.focus();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const erro = form.querySelector('.loja-modal-erro');
      const dados = {};
      for (const c of p.campos || []) {
        const v = (form.elements[c.id].value || '').trim();
        if (!v) {
          erro.textContent = `Preenche: ${c.label}.`;
          erro.hidden = false;
          return;
        }
        dados[c.id] = v;
      }
      const ok = form.querySelector('.loja-modal-ok');
      ok.disabled = true;
      ok.textContent = 'A comprar…';
      try {
        await api({ acao: 'comprar', produtoId: p.id, dados });
        fecharModal();
        toast(`Pedido feito: ${p.nome}! Vais vê-lo em "Os meus pedidos".`, 'ok');
        await carregar();
      } catch (err) {
        erro.textContent = err.message;
        erro.hidden = false;
        ok.disabled = false;
        ok.textContent = 'Confirmar compra';
        if (err.status === 409) carregar();
      }
    };
  }

  // ---------------------------------------------------------------
  // Gestão da loja (só streamer)
  // ---------------------------------------------------------------
  const TIPOS_DADOS = {
    nenhum: { txt: 'Nada', campos: [] },
    deposito: {
      txt: 'Casino + ID da conta',
      campos: [
        { id: 'casino', label: 'Casino', tipo: 'casino' },
        { id: 'conta', label: 'ID ou utilizador da tua conta no casino', tipo: 'texto' },
      ],
    },
    email: { txt: 'Email', campos: [{ id: 'email', label: 'Email para onde enviamos o prémio', tipo: 'email' }] },
    texto: { txt: 'Texto livre', campos: [{ id: 'texto', label: 'Informação para o pedido', tipo: 'texto' }] },
  };

  function tipoDe(p) {
    const ids = (p.campos || []).map((c) => c.tipo).join(',');
    if (!ids) return 'nenhum';
    if (ids === 'casino,texto') return 'deposito';
    if (ids === 'email') return 'email';
    return 'texto';
  }

  function renderAdmin() {
    const sec = $('lojaAdmin');
    if (!sec) return;
    if (!estado || !estado.admin || !adminDados) {
      sec.hidden = true;
      return;
    }
    sec.hidden = false;

    // Prémios
    $('lojaAdminProdutos').innerHTML = adminDados.produtos
      .map(
        (p) => `
      <form class="loja-admin-produto${p.ativo ? '' : ' inativo'}" data-id="${esc(p.id)}">
        <div class="loja-admin-grid">
          <label class="loja-campo largo"><span>Nome</span><input name="nome" value="${esc(p.nome)}" maxlength="80" required></label>
          <label class="loja-campo"><span>Preço (pontos)</span><input name="preco" type="number" min="1" value="${p.preco}" required></label>
          <label class="loja-campo"><span>Stock</span><input name="stock" type="number" min="0" value="${p.stock}"></label>
          <label class="loja-campo"><span>Máx./pessoa/mês</span><input name="limitePorMes" type="number" min="0" value="${p.limitePorMes || 0}" title="0 = sem limite"></label>
          <label class="loja-campo largo"><span>Descrição</span><input name="descricao" value="${esc(p.descricao || '')}" maxlength="300"></label>
          <label class="loja-campo largo"><span>Imagem (ex: assets/loja/nome.jpg ou https://…)</span><input name="imagem" value="${esc(p.imagem || '')}" maxlength="300"></label>
          <label class="loja-campo"><span>O viewer indica</span><select name="tipo">${Object.entries(TIPOS_DADOS)
            .map(([k, v]) => `<option value="${k}"${tipoDe(p) === k ? ' selected' : ''}>${v.txt}</option>`)
            .join('')}</select></label>
          <label class="loja-check"><input type="checkbox" name="ativo" ${p.ativo ? 'checked' : ''}> Visível na loja</label>
        </div>
        <div class="loja-admin-acoes">
          <button type="submit" class="btn-gold"><i class="fas fa-floppy-disk" aria-hidden="true"></i> Guardar</button>
          <button type="button" class="btn-ghost loja-apagar"><i class="fas fa-trash" aria-hidden="true"></i> Apagar</button>
        </div>
      </form>`
      )
      .join('');

    $('lojaAdminProdutos').querySelectorAll('form').forEach((f) => {
      f.onsubmit = (e) => {
        e.preventDefault();
        guardarProduto(f, f.dataset.id);
      };
      f.querySelector('.loja-apagar').onclick = async () => {
        if (!confirm(`Apagar "${f.elements.nome.value}" da loja? Os pedidos já feitos não são afetados.`)) return;
        try {
          await api({ acao: 'apagar-produto', id: f.dataset.id });
          toast('Prémio apagado.', 'ok');
          carregar();
        } catch (err) {
          toast(err.message, 'erro');
        }
      };
    });

    // Pedidos
    const pendentes = adminDados.pedidos.filter((p) => p.estado === 'pendente').length;
    $('lojaAdminPendentes').textContent = pendentes ? `${pendentes} pendente${pendentes === 1 ? '' : 's'}` : 'Sem pendentes';
    document.querySelectorAll('.loja-filtro').forEach((b) => b.classList.toggle('ativo', b.dataset.filtro === filtroPedidos));
    const lista = adminDados.pedidos.filter((p) => filtroPedidos === 'todos' || p.estado === filtroPedidos);
    $('lojaAdminPedidos').innerHTML = lista.length
      ? lista
          .map((p) => {
            const e = ESTADOS[p.estado] || ESTADOS.pendente;
            const dados = (p.campos || [])
              .map((c) => `<div class="loja-dado"><span>${esc(c.label)}</span><strong>${esc(p.dados && p.dados[c.id])}</strong></div>`)
              .join('');
            return `
            <li class="loja-admin-pedido">
              <div class="loja-admin-pedido-top">
                <div><strong>${esc(p.nome)}</strong><small><i class="fab fa-twitch" aria-hidden="true"></i> ${esc(p.login)} · ${dataCurta(p.criadoEm)} · ${fmt(p.preco)} pontos</small></div>
                <span class="loja-estado ${e.cls}"><i class="fas ${e.icon}" aria-hidden="true"></i> ${e.txt}</span>
              </div>
              ${dados ? `<div class="loja-dados">${dados}</div>` : ''}
              ${p.nota ? `<p class="loja-nota">Nota: ${esc(p.nota)}</p>` : ''}
              ${
                p.estado === 'pendente'
                  ? `<div class="loja-admin-acoes">
                  <button class="btn-gold loja-entregar" data-id="${esc(p.id)}"><i class="fas fa-check" aria-hidden="true"></i> Entregue</button>
                  <button class="btn-ghost loja-recusar" data-id="${esc(p.id)}"><i class="fas fa-rotate-left" aria-hidden="true"></i> Recusar e devolver pontos</button>
                </div>`
                  : ''
              }
            </li>`;
          })
          .join('')
      : '<li class="loja-vazio">Nada por aqui.</li>';

    $('lojaAdminPedidos').querySelectorAll('.loja-entregar, .loja-recusar').forEach((b) => {
      b.onclick = async () => {
        const recusar = b.classList.contains('loja-recusar');
        let nota = '';
        if (recusar) {
          nota = prompt('Motivo da recusa (o viewer vai ver esta nota):', '');
          if (nota === null) return;
        }
        b.disabled = true;
        try {
          await api({ acao: 'pedido', id: b.dataset.id, estado: recusar ? 'recusado' : 'entregue', nota });
          toast(recusar ? 'Pedido recusado — pontos devolvidos.' : 'Pedido marcado como entregue.', 'ok');
          carregar();
        } catch (err) {
          toast(err.message, 'erro');
          b.disabled = false;
        }
      };
    });
  }

  async function guardarProduto(f, id) {
    const tipo = f.elements.tipo.value;
    const produto = {
      id,
      nome: f.elements.nome.value,
      descricao: f.elements.descricao.value,
      preco: Number(f.elements.preco.value),
      stock: Number(f.elements.stock.value || 0),
      limitePorMes: Number(f.elements.limitePorMes.value || 0),
      ativo: f.elements.ativo ? f.elements.ativo.checked : true,
      campos: TIPOS_DADOS[tipo] ? TIPOS_DADOS[tipo].campos : [],
    };
    if (f.elements.icone) produto.icone = f.elements.icone.value;
    if (f.elements.imagem) produto.imagem = f.elements.imagem.value.trim();
    try {
      await api({ acao: 'guardar-produto', produto });
      toast('Prémio guardado.', 'ok');
      if (!id) f.reset();
      carregar();
    } catch (err) {
      toast(err.message, 'erro');
    }
  }

  function ligarAdminFixos() {
    const novo = $('lojaNovoProduto');
    if (novo)
      novo.onsubmit = (e) => {
        e.preventDefault();
        guardarProduto(novo, '');
      };
    document.querySelectorAll('.loja-filtro').forEach((b) => {
      b.onclick = () => {
        filtroPedidos = b.dataset.filtro;
        renderAdmin();
      };
    });
    const ajuste = $('lojaAjuste');
    if (ajuste)
      ajuste.onsubmit = async (e) => {
        e.preventDefault();
        try {
          const r = await api({ acao: 'ajustar-saldo', username: ajuste.elements.username.value, quantidade: Number(ajuste.elements.quantidade.value) });
          toast(`Saldo de ${r.username}: ${fmt(r.saldo)} (pontos da live: ${fmt(r.pontos)}).`, 'ok');
          ajuste.reset();
          carregar();
        } catch (err) {
          toast(err.message, 'erro');
        }
      };
  }

  // ---------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------
  async function carregar() {
    try {
      const pub = await api();
      produtos = pub.produtos || [];
      casinos = pub.casinos || [];
    } catch (e) {
      $('lojaProdutos').innerHTML = '<p class="loja-vazio">A loja não está disponível neste momento. Tenta daqui a pouco.</p>';
      return;
    }
    estado = null;
    adminDados = null;
    if (token()) {
      try {
        estado = await api({ acao: 'estado' });
        if (estado.admin) adminDados = await api({ acao: 'admin' });
      } catch (e) {
        estado = null;
      }
    }
    renderCarteira();
    renderProdutos();
    renderMeusPedidos();
    renderAdmin();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('lojaProdutos')) return;
    ligarAdminFixos();
    carregar();
    document.addEventListener('keydown', (e) => e.key === 'Escape' && fecharModal());
    // Ao voltar à página, atualiza o saldo (exceto para o streamer, para
    // não apagar alterações que esteja a meio de fazer no painel).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !$('lojaModal') && !(estado && estado.admin)) carregar();
    });
  });
})();
