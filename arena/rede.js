// Arena 4v4 — ligação entre jogadores.
// O PC de quem cria a sala é o anfitrião. Cada jogador abre uma ligação
// WebRTC direta com ele; a API do site só passa as mensagens de ligação
// (a oferta e a resposta) até o canal abrir.
// Dois canais por jogador: "rapido" (sem garantia, para posições) e
// "fiavel" (ordenado e garantido, para tiros, mortes e rondas).

const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export class Api {
  constructor(base, token) { this.base = base; this.token = token; }
  async pedir(metodo, q, corpo) {
    const r = await fetch(this.base + '/api/arena' + (q || ''), {
      method: metodo,
      cache: 'no-store',
      headers: Object.assign({ Authorization: 'Bearer ' + this.token }, corpo ? { 'Content-Type': 'application/json' } : {}),
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    let j = {};
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) { const e = new Error(j.error || 'Erro ' + r.status); e.status = r.status; throw e; }
    return j;
  }
  criar(dados) { return this.pedir('POST', '', Object.assign({ acao: 'criar' }, dados)); }
  ver(cod) { return this.pedir('GET', '?acao=ver&cod=' + encodeURIComponent(cod)); }
  lista(jogo) { return this.pedir('GET', '?acao=lista' + (jogo ? '&jogo=' + jogo : '')); }
  estado(dados) { return this.pedir('POST', '', Object.assign({ acao: 'estado' }, dados)); }
  fechar(cod) { return this.pedir('POST', '', { acao: 'fechar', cod }); }
  sinal(cod, para, tipo, dados, nome) { return this.pedir('POST', '', { acao: 'sinal', cod, para, tipo, dados, nome }); }
  sinais(cod) { return this.pedir('GET', '?acao=sinais&cod=' + encodeURIComponent(cod)); }
}

// Espera que o browser junte os caminhos de ligação (ou 3 s, o que vier primeiro)
function esperarIce(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((ok) => {
    const t = setTimeout(ok, 3000);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') { clearTimeout(t); ok(); }
    });
  });
}

function prepararCanal(canal, aoReceber) {
  canal.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } aoReceber(m); };
}

// ── anfitrião ──────────────────────────────────────────────────────
export class Anfitriao {
  constructor(api, cod, eu) {
    this.api = api; this.cod = cod; this.eu = eu;
    this.pares = new Map();     // login -> { pc, rapido, fiavel, nome }
    this.aoEntrar = () => {}; this.aoSair = () => {}; this.aoReceber = () => {};
    this.vivo = true;
    this.intervalo = 1200;
    this.ouvir();
  }
  async ouvir() {
    while (this.vivo) {
      try {
        const { msgs } = await this.api.sinais(this.cod);
        for (const m of msgs) if (m.tipo === 'oferta') this.receberOferta(m).catch((e) => console.warn('[arena] oferta', e));
      } catch (e) {
        if (e.status === 401) { this.vivo = false; break; }
      }
      await new Promise((r) => setTimeout(r, this.intervalo));
    }
  }
  async receberOferta(m) {
    const login = m.de;
    const antigo = this.pares.get(login);
    if (antigo) { try { antigo.pc.close(); } catch (e) {} this.pares.delete(login); }
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const par = { pc, rapido: null, fiavel: null, nome: m.nome || login, aberto: false };
    this.pares.set(login, par);
    pc.ondatachannel = (ev) => {
      const c = ev.channel;
      if (c.label === 'rapido') par.rapido = c; else par.fiavel = c;
      prepararCanal(c, (msg) => this.aoReceber(login, msg));
      c.onopen = () => this.verAberto(login, par);
      c.onclose = () => this.sair(login, par);
      if (c.readyState === 'open') this.verAberto(login, par);
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) this.sair(login, par);
    };
    await pc.setRemoteDescription(m.dados);
    await pc.setLocalDescription(await pc.createAnswer());
    await esperarIce(pc);
    await this.api.sinal(this.cod, login, 'resposta', pc.localDescription.toJSON ? pc.localDescription.toJSON() : { type: pc.localDescription.type, sdp: pc.localDescription.sdp });
  }
  verAberto(login, par) {
    if (par.aberto || !par.rapido || !par.fiavel) return;
    if (par.rapido.readyState !== 'open' || par.fiavel.readyState !== 'open') return;
    par.aberto = true;
    this.aoEntrar(login, par.nome);
  }
  sair(login, par) {
    if (this.pares.get(login) !== par) return;
    this.pares.delete(login);
    try { par.pc.close(); } catch (e) {}
    if (par.aberto) this.aoSair(login);
  }
  enviar(login, msg, fiavel = true) {
    const p = this.pares.get(login);
    if (!p || !p.aberto) return;
    const c = fiavel ? p.fiavel : p.rapido;
    if (c && c.readyState === 'open') { try { c.send(typeof msg === 'string' ? msg : JSON.stringify(msg)); } catch (e) {} }
  }
  todos(msg, fiavel = true, exceto = null) {
    const s = JSON.stringify(msg);
    for (const [login] of this.pares) if (login !== exceto) this.enviar(login, s, fiavel);
  }
  expulsar(login) { const p = this.pares.get(login); if (p) this.sair(login, p); }
  fechar() {
    this.vivo = false;
    for (const [, p] of this.pares) { try { p.pc.close(); } catch (e) {} }
    this.pares.clear();
  }
}

// ── jogador ────────────────────────────────────────────────────────
export class Cliente {
  constructor(api, cod, host, nome) {
    this.api = api; this.cod = cod; this.host = host; this.nome = nome;
    this.fila = [];
    this.aoReceber = (m) => this.fila.push(m); this.aoFechar = () => {};
    this.pc = null; this.rapido = null; this.fiavel = null;
  }
  async ligar() {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    this.pc = pc;
    this.rapido = pc.createDataChannel('rapido', { ordered: false, maxRetransmits: 0 });
    this.fiavel = pc.createDataChannel('fiavel', { ordered: true });
    for (const c of [this.rapido, this.fiavel]) {
      prepararCanal(c, (m) => this.aoReceber(m));
      c.onclose = () => this.fechou();
    }
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) this.fechou(); };
    await pc.setLocalDescription(await pc.createOffer());
    await esperarIce(pc);
    await this.api.sinais(this.cod).catch(() => {}); // limpa respostas antigas
    const ld = pc.localDescription;
    await this.api.sinal(this.cod, this.host, 'oferta', { type: ld.type, sdp: ld.sdp }, this.nome);
    // espera a resposta do anfitrião
    const limite = Date.now() + 25000;
    let resposta = null;
    while (!resposta && Date.now() < limite) {
      await new Promise((r) => setTimeout(r, 900));
      const { msgs } = await this.api.sinais(this.cod);
      resposta = msgs.find((m) => m.tipo === 'resposta' && m.de === this.host);
      const recusa = msgs.find((m) => m.tipo === 'recusa' && m.de === this.host);
      if (recusa) throw new Error((recusa.dados && recusa.dados.motivo) || 'O anfitrião recusou a entrada.');
    }
    if (!resposta) throw new Error('O anfitrião não respondeu. A sala pode já ter fechado.');
    await pc.setRemoteDescription(resposta.dados);
    // espera os canais abrirem
    await new Promise((ok, falha) => {
      const t = setTimeout(() => falha(new Error('Não foi possível ligar ao anfitrião (a rede de um de vocês pode estar a bloquear jogos P2P).')), 15000);
      const ver = () => {
        if (this.rapido.readyState === 'open' && this.fiavel.readyState === 'open') { clearTimeout(t); ok(); }
      };
      this.rapido.addEventListener('open', ver);
      this.fiavel.addEventListener('open', ver);
      ver();
    });
  }
  enviar(msg, fiavel = true) {
    const c = fiavel ? this.fiavel : this.rapido;
    if (c && c.readyState === 'open') { try { c.send(JSON.stringify(msg)); } catch (e) {} }
  }
  fechou() {
    if (this.fechado) return;
    this.fechado = true;
    this.aoFechar();
  }
  fechar() { this.fechado = true; try { this.pc && this.pc.close(); } catch (e) {} }
}
