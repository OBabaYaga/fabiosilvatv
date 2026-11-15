// ===================================================================
// FabioSilva_TV — App instalável + notificações de live
// ===================================================================
//
// - Regista o service worker (sw.js), que recebe as notificações.
// - Mostra um cartão "Ativar notificações" (e "Instalar app" quando o
//   browser deixa) e um botão fixo no menu lateral.
// - No iPhone/iPad, as notificações só funcionam com o site instalado no
//   ecrã principal — nesse caso explicamos como instalar.
// - No Controlador (só o streamer) mostra o painel "Notificações da app" com
//   "Ligar aviso de live" e "Enviar notificação de teste".
// ===================================================================

(function () {
  const API = () => (window.FSTV_API || 'https://fabiosilvatv-api.vercel.app').replace(/\/$/, '');
  const DISPENSADO_KEY = 'fstv_push_cartao_fechado_ate';
  const SINCRONIZADO_KEY = 'fstv_push_sincronizado';
  const IDADE_KEY = 'obaba_age_verified';

  const temSW = 'serviceWorker' in navigator;
  const temPush = temSW && 'PushManager' in window && 'Notification' in window;
  const ehIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  let registo = null;
  let pedidoInstalacao = null;

  function ls(get, key, val) {
    try {
      if (get) return localStorage.getItem(key);
      if (val == null) localStorage.removeItem(key);
      else localStorage.setItem(key, val);
    } catch (e) {
      return null;
    }
  }

  function base64ParaBytes(b64) {
    const padding = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }

  async function subscricaoAtual() {
    if (!registo) return null;
    return registo.pushManager.getSubscription();
  }

  async function ativar() {
    if (!temPush) {
      mostrarAjudaIOS();
      return false;
    }
    const permissao = await Notification.requestPermission();
    if (permissao !== 'granted') {
      alert('As notificações ficaram bloqueadas. Podes ativá-las nas definições do browser/telemóvel para este site.');
      atualizarUI();
      return false;
    }
    try {
      const res = await fetch(API() + '/api/push');
      const { publicKey } = await res.json();
      let sub = await subscricaoAtual();
      if (!sub) {
        sub = await registo.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(publicKey) });
      }
      await fetch(API() + '/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'subscrever', subscription: sub.toJSON() }),
      });
      ls(false, SINCRONIZADO_KEY, '1');
      fecharCartao(3650);
    } catch (e) {
      console.error('[notificacoes]', e);
      alert('Não foi possível ativar as notificações. Tenta outra vez daqui a pouco.');
    }
    atualizarUI();
    return true;
  }

  async function desativar() {
    const sub = await subscricaoAtual();
    if (sub) {
      fetch(API() + '/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'cancelar', endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe();
    }
    ls(false, SINCRONIZADO_KEY, null);
    atualizarUI();
  }

  // Se já estava subscrito, volta a enviar a subscrição ao servidor
  // (uma vez por sessão) — assim nunca fica "ativado" só no telemóvel.
  async function sincronizar() {
    const sub = await subscricaoAtual();
    if (!sub || sessionStorage.getItem(SINCRONIZADO_KEY)) return;
    try {
      sessionStorage.setItem(SINCRONIZADO_KEY, '1');
    } catch (e) {}
    fetch(API() + '/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'subscrever', subscription: sub.toJSON() }),
    }).catch(() => {});
  }

  // ---------------------------------------------------------------
  // Interface
  // ---------------------------------------------------------------
  function fecharCartao(dias) {
    ls(false, DISPENSADO_KEY, String(Date.now() + dias * 24 * 3600 * 1000));
    const c = document.getElementById('pushCartao');
    if (c) c.remove();
  }

  function cartaoDispensado() {
    const ate = Number(ls(true, DISPENSADO_KEY)) || 0;
    return Date.now() < ate;
  }

  function mostrarAjudaIOS() {
    let m = document.getElementById('pushAjudaIOS');
    if (!m) {
      m = document.createElement('div');
      m.id = 'pushAjudaIOS';
      m.className = 'push-modal';
      m.innerHTML = `
        <div class="push-modal-box">
          <button class="push-modal-fechar" aria-label="Fechar"><i class="fas fa-xmark"></i></button>
          <img src="assets/app/apple-touch-icon.png" alt="" class="push-modal-icon">
          <h3>Instala a app FabioSilva_TV</h3>
          <p>No iPhone, as notificações só funcionam com a app instalada:</p>
          <ol>
            <li>Toca em <strong>Partilhar</strong> <i class="fas fa-arrow-up-from-bracket"></i> na barra do Safari</li>
            <li>Escolhe <strong>"Adicionar ao ecrã principal"</strong></li>
            <li>Abre a app FabioSilva_TV no ecrã principal e toca em <strong>Ativar avisos</strong></li>
          </ol>
        </div>`;
      m.addEventListener('click', (e) => {
        if (e.target === m || e.target.closest('.push-modal-fechar')) m.remove();
      });
      document.body.appendChild(m);
    }
  }

  // ---------------------------------------------------------------
  // "Descarregar app": explicação com instruções e botões
  // (também abre com o link fabiosilvatv.com/#app)
  // ---------------------------------------------------------------
  const ehAndroid = /Android/i.test(navigator.userAgent);
  const noIOSSemSafari = ehIOS && /CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  const navInterno = /Instagram|FBAN|FBAV|TikTok|musical_ly|Snapchat|Twitter|Line\//i.test(navigator.userAgent);
  const LINK_APP = 'https://fabiosilvatv.com/';

  function mostrarDownload() {
    const velho = document.getElementById('appDownload');
    if (velho) velho.remove();
    const plat = ehIOS ? 'ios' : ehAndroid ? 'android' : 'pc';
    const bloco = (id, icone, titulo, passos) => `
      <div class="app-dl-plat${plat === id ? ' atual' : ''}">
        <div class="app-dl-plat-tit"><i class="${icone}"></i> ${titulo}${plat === id ? ' <span>o teu</span>' : ''}</div>
        <ol>${passos.map((x) => '<li>' + x + '</li>').join('')}</ol>
      </div>`;
    const android = bloco('android', 'fab fa-android', 'Android', [
      'Abre <strong>fabiosilvatv.com</strong> no <strong>Chrome</strong>',
      'Toca em <strong>Instalar agora</strong> (se aparecer aqui em cima) ou no menu <strong>⋮</strong> → <strong>Instalar app</strong>',
      'A app FabioSilva_TV fica no ecrã principal, ao lado das outras',
    ]);
    const ios = bloco('ios', 'fab fa-apple', 'iPhone / iPad', [
      'Abre <strong>fabiosilvatv.com</strong> no <strong>Safari</strong>',
      'Toca em <strong>Partilhar</strong> <i class="fas fa-arrow-up-from-bracket"></i> na barra de baixo',
      'Escolhe <strong>"Adicionar ao ecrã principal"</strong> e depois <strong>Adicionar</strong>',
    ]);
    const pc = bloco('pc', 'fas fa-desktop', 'Computador', [
      'Abre <strong>fabiosilvatv.com</strong> no <strong>Chrome</strong> ou no <strong>Edge</strong>',
      'Clica no ícone de instalar <i class="fas fa-download"></i> no lado direito da barra de endereço',
      'Confirma em <strong>Instalar</strong>',
    ]);
    const ordem = plat === 'ios' ? [ios, android, pc] : plat === 'android' ? [android, ios, pc] : [pc, android, ios];
    let aviso = '';
    if (instalada) aviso = '<p class="app-dl-aviso ok"><i class="fas fa-circle-check"></i> Já estás a usar a app FabioSilva_TV. 🎉</p>';
    else if (navInterno) aviso = '<p class="app-dl-aviso"><i class="fas fa-triangle-exclamation"></i> Estás dentro de outra app (Instagram, TikTok…). Copia o link e abre-o no <strong>' + (ehIOS ? 'Safari' : 'Chrome') + '</strong> para instalar.</p>';
    else if (noIOSSemSafari) aviso = '<p class="app-dl-aviso"><i class="fas fa-triangle-exclamation"></i> No iPhone só dá para instalar pelo <strong>Safari</strong>. Copia o link e abre-o lá.</p>';
    const m = document.createElement('div');
    m.id = 'appDownload';
    m.className = 'push-modal app-dl';
    m.innerHTML = `
      <div class="push-modal-box">
        <button class="push-modal-fechar" aria-label="Fechar"><i class="fas fa-xmark"></i></button>
        <img src="assets/app/icon-192.png" alt="" class="push-modal-icon">
        <h3>Descarregar a app FabioSilva_TV</h3>
        <p>É grátis e não precisa de loja: instala-se direto do site, fica no ecrã principal e avisa-te quando o Fábio entra em direto na Twitch.</p>
        ${aviso}
        <div class="app-dl-botoes">
          ${pedidoInstalacao && !instalada ? '<button class="push-btn app-dl-grande" data-app="instalar"><i class="fas fa-download"></i> Instalar agora</button>' : ''}
          ${ehIOS && !instalada && !noIOSSemSafari && !navInterno ? '<button class="push-btn app-dl-grande" data-app="ios"><i class="fab fa-apple"></i> Como instalar no iPhone</button>' : ''}
          <button class="push-btn push-btn-sec" data-app="copiar"><i class="fas fa-link"></i> Copiar link</button>
          ${navigator.share ? '<button class="push-btn push-btn-sec" data-app="partilhar"><i class="fas fa-share-nodes"></i> Partilhar</button>' : ''}
        </div>
        ${ordem.join('')}
      </div>`;
    m.addEventListener('click', async (e) => {
      if (e.target === m || e.target.closest('.push-modal-fechar')) return m.remove();
      const b = e.target.closest('[data-app]');
      if (!b) return;
      const a = b.dataset.app;
      if (a === 'instalar') {
        m.remove();
        instalar();
      } else if (a === 'ios') {
        const atual = m.querySelector('.app-dl-plat.atual');
        if (atual) {
          atual.scrollIntoView({ behavior: 'smooth', block: 'center' });
          atual.classList.remove('pisca');
          void atual.offsetWidth;
          atual.classList.add('pisca');
        }
      } else if (a === 'copiar') {
        try {
          await navigator.clipboard.writeText(LINK_APP);
        } catch (err) {
          prompt('Copia este link:', LINK_APP);
        }
        b.innerHTML = '<i class="fas fa-check"></i> Link copiado';
      } else if (a === 'partilhar') {
        try {
          await navigator.share({ title: 'App FabioSilva_TV', text: 'Instala a app do FabioSilva_TV: avisos de live, ofertas, loja de pontos e minijogos.', url: LINK_APP });
        } catch (err) {}
      }
    });
    document.body.appendChild(m);
  }

  async function instalar() {
    if (pedidoInstalacao) {
      pedidoInstalacao.prompt();
      await pedidoInstalacao.userChoice.catch(() => null);
      pedidoInstalacao = null;
      atualizarUI();
    } else if (ehIOS) {
      mostrarAjudaIOS();
    }
  }

  async function estado() {
    if (ehIOS && !instalada && !temPush) return 'ios-instalar';
    if (!temPush) return 'sem-suporte';
    if (Notification.permission === 'denied') return 'bloqueado';
    const sub = await subscricaoAtual();
    return sub ? 'ativo' : 'inativo';
  }

  function garantirBotaoMenu() {
    const nav = document.querySelector('#sidebar nav, .sidebar nav');
    if (!nav || document.getElementById('pushMenuBtn')) return;
    const grupo = document.createElement('div');
    grupo.className = 'sidebar-group';
    grupo.textContent = 'App';
    nav.appendChild(grupo);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'pushMenuBtn';
    btn.className = 'sidebar-link push-menu-btn';
    nav.appendChild(btn);
    const app = document.createElement('button');
    app.type = 'button';
    app.id = 'appMenuBtn';
    app.className = 'sidebar-link push-menu-btn app-menu-btn';
    app.innerHTML = '<i class="fas fa-mobile-screen-button" aria-hidden="true"></i>Download da app';
    nav.appendChild(app);
    app.addEventListener('click', () => {
      if (typeof closeOverlays === 'function') closeOverlays();
      mostrarDownload();
    });
    btn.addEventListener('click', async () => {
      const e = await estado();
      if (e === 'ativo') {
        if (confirm('Deixar de receber avisos quando o Fábio entra em direto?')) desativar();
      } else if (e === 'ios-instalar') mostrarAjudaIOS();
      else if (e === 'bloqueado') alert('As notificações estão bloqueadas para este site. Ativa-as nas definições do browser/telemóvel.');
      else if (e === 'sem-suporte') alert('Este browser não suporta notificações.');
      else ativar();
    });
  }

  let ultimoEstado = null;
  function semNadaPorCima() {
    let idade = false;
    try { idade = localStorage.getItem(IDADE_KEY) === 'true'; } catch (err) {}
    const promo = document.getElementById('promoPopup');
    return idade && !(promo && !promo.classList.contains('hidden')) && Date.now() - INICIO > 6000;
  }
  const INICIO = Date.now();
  setInterval(() => {
    if (ultimoEstado && !document.getElementById('pushCartao')) garantirCartao(ultimoEstado);
  }, 2500);
  function garantirCartao(e) {
    ultimoEstado = e;
    const existente = document.getElementById('pushCartao');
    const mostrar = (e === 'inativo' || e === 'ios-instalar' || pedidoInstalacao) && !cartaoDispensado() && (existente || semNadaPorCima());
    if (!mostrar) {
      if (existente) existente.remove();
      return;
    }
    const podeInstalar = !instalada;
    const cartao = existente || document.createElement('div');
    cartao.id = 'pushCartao';
    cartao.className = 'push-cartao';
    cartao.innerHTML = `
      <button class="push-cartao-fechar" aria-label="Fechar"><i class="fas fa-xmark"></i></button>
      <img src="assets/app/icon-192.png" alt="" class="push-cartao-icon">
      <div class="push-cartao-texto">
        <strong>Não percas nenhuma live</strong>
        <span>${e === 'ios-instalar' ? 'Instala a app FabioSilva_TV para receberes um aviso quando o Fábio entrar em direto.' : 'Recebe um aviso no telemóvel quando o Fábio entrar em direto.'}</span>
        <div class="push-cartao-botoes">
          ${e === 'inativo' ? '<button class="push-btn push-btn-ativar"><i class="fas fa-bell"></i> Ativar avisos</button>' : ''}
          ${podeInstalar ? `<button class="push-btn ${e === 'inativo' ? 'push-btn-sec' : ''} push-btn-instalar"><i class="fas fa-mobile-screen"></i> Instalar app</button>` : ''}
        </div>
      </div>`;
    if (!existente) document.body.appendChild(cartao);
    cartao.querySelector('.push-cartao-fechar').onclick = () => fecharCartao(7);
    const a = cartao.querySelector('.push-btn-ativar');
    if (a) a.onclick = ativar;
    const i = cartao.querySelector('.push-btn-instalar');
    if (i) i.onclick = () => (pedidoInstalacao ? instalar() : mostrarDownload());
  }

  async function atualizarUI() {
    garantirBotaoMenu();
    const e = await estado();
    const btn = document.getElementById('pushMenuBtn');
    if (btn) {
      btn.classList.toggle('push-ativo', e === 'ativo');
      btn.innerHTML =
        e === 'ativo'
          ? '<i class="fas fa-bell" aria-hidden="true"></i>Avisos de live: ligados'
          : '<i class="fas fa-bell-slash" aria-hidden="true"></i>Ativar avisos de live';
    }
    garantirCartao(e);
    renderAdmin();
  }

  // ---------------------------------------------------------------
  // Painel de Controlo (só streamer)
  // ---------------------------------------------------------------
  async function pedidoAdmin(corpo) {
    const token = ls(true, 'obaba_twitch_token');
    const res = await fetch(API() + '/api/push', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
      body: JSON.stringify(corpo),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'O pedido falhou.');
    return data;
  }

  const ESTADOS_LIVE = {
    enabled: '✅ Ligado — quando o canal entrar em direto, toda a gente é avisada.',
    webhook_callback_verification_pending: '⏳ À espera da confirmação da Twitch… atualiza daqui a uns segundos.',
    desligado: '⚪ Desligado — carrega em "Ligar aviso de live".',
    sem_secret: '⚠️ Falta configurar o TWITCH_CLIENT_SECRET no Vercel.',
  };

  let adminCarregado = false;
  async function renderAdmin(forcar) {
    const loja = document.getElementById('lojaAdmin');
    if (!loja || !ls(true, 'obaba_twitch_token')) return;
    if (adminCarregado && !forcar) return;
    adminCarregado = true;
    let caixa = document.getElementById('adminPush');
    if (!caixa) {
      caixa = document.createElement('section');
      caixa.className = 'panel loja-admin';
      caixa.id = 'adminPush';
      caixa.hidden = true;
      caixa.innerHTML = `
        <div class="panel-head"><div><h2 class="panel-title"><i class="fas fa-bell" aria-hidden="true"></i> Notificações da app</h2><p class="panel-sub">Quem ativar os avisos recebe uma notificação no telemóvel/PC quando entras em direto na Twitch. Só tu vês esta secção.</p></div></div>
        <div class="admin-push-info" id="adminPushInfo">A carregar…</div>
        <div class="admin-push-botoes">
          <button class="push-btn" id="adminPushLigar" type="button"><i class="fab fa-twitch"></i> Ligar aviso de live</button>
          <button class="push-btn push-btn-sec" id="adminPushTestar" type="button"><i class="fas fa-paper-plane"></i> Enviar notificação de teste</button>
        </div>`;
      loja.parentNode.insertBefore(caixa, loja.nextSibling);
      ligarAdmin();
    }
    const info = document.getElementById('adminPushInfo');
    info.textContent = 'A carregar…';
    try {
      const d = await pedidoAdmin({ acao: 'estado' });
      caixa.hidden = false;
      const est = d.live && d.live.estado;
      info.innerHTML = `
        <div><strong>${d.subscritores}</strong> ${d.subscritores === 1 ? 'pessoa tem' : 'pessoas têm'} os avisos ligados.</div>
        <div>Aviso automático de live (canal <strong>${d.canal}</strong>): ${ESTADOS_LIVE[est] || (est === 'erro' ? '⚠️ ' + (d.live.erro || 'erro') : '⚠️ ' + est)}</div>`;
    } catch (e) {
      if (/streamer/.test(e.message)) caixa.hidden = true;
      else {
        caixa.hidden = false;
        info.textContent = '⚠️ ' + e.message;
      }
    }
  }

  function ligarAdmin() {
    const ligar = document.getElementById('adminPushLigar');
    const testar = document.getElementById('adminPushTestar');
    if (ligar)
      ligar.addEventListener('click', async () => {
        ligar.disabled = true;
        try {
          await pedidoAdmin({ acao: 'ligar-live' });
          setTimeout(() => renderAdmin(true), 4000);
          renderAdmin(true);
        } catch (e) {
          alert(e.message);
        }
        ligar.disabled = false;
      });
    if (testar)
      testar.addEventListener('click', async () => {
        testar.disabled = true;
        try {
          const r = await pedidoAdmin({ acao: 'testar' });
          alert(`Notificação de teste enviada para ${r.enviadas} ${r.enviadas === 1 ? 'aparelho' : 'aparelhos'}.`);
          renderAdmin(true);
        } catch (e) {
          alert(e.message);
        }
        testar.disabled = false;
      });
  }

  // ---------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pedidoInstalacao = e;
    atualizarUI();
  });
  window.addEventListener('appinstalled', () => {
    pedidoInstalacao = null;
    atualizarUI();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    ligarAdmin();
    if (temSW) {
      try {
        registo = await navigator.serviceWorker.register('sw.js');
      } catch (e) {
        console.warn('[notificacoes] service worker não registado', e);
      }
    }
    await atualizarUI();
    sincronizar();
    if (location.hash === '#app') mostrarDownload();
    // O painel de admin só sabe se és admin depois do login carregar.
    setTimeout(() => renderAdmin(), 1500);
    setTimeout(() => renderAdmin(), 4000);
  });
})();
