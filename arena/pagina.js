// Arena 4v4 — página de entrada: criar sala, entrar com código, salas abertas, treino.
import { Api, Anfitriao, Cliente } from './rede.js?v=3';

const BASE = window.FSTV_API || 'https://fabiosilvatv-api.vercel.app';
const TOKEN_KEY = 'obaba_twitch_token';
const $ = (id) => document.getElementById(id);
const NOMES_MAPAS = { docas: 'Docas', lisboa: 'Lisboa', casino: 'Casino', aldeia: 'Aldeia' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const token = () => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } };
// twitch-auth.js declara TwitchAuth com const (não fica em window)
const TA = () => (typeof TwitchAuth !== 'undefined' ? TwitchAuth : null);
const user = () => (TA() && TA().getUser && TA().getUser()) || null;

let a_jogar = false;
let modJogo = null;
async function carregarJogo() {
  if (!modJogo) modJogo = await import('./jogo.js?v=2');
  return modJogo;
}

function suporta() {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return 'O teu browser não consegue mostrar 3D (WebGL desligado).';
  if (!window.RTCPeerConnection) return 'O teu browser não suporta jogos online (WebRTC).';
  if (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches) return 'A Arena precisa de teclado e rato. Abre esta página num computador.';
  return null;
}

function estado(msg, erro) {
  const e = $('arEstado');
  e.hidden = !msg;
  e.className = 'ar-estado' + (erro ? ' erro' : '');
  e.textContent = msg || '';
}

function desenharEntrada() {
  const u = user();
  const caixa = $('arEntrada');
  const problema = suporta();
  if (problema) {
    caixa.innerHTML = '<p class="ar-estado erro">' + esc(problema) + '</p>';
    return;
  }
  const codigoUrl = (new URLSearchParams(location.search).get('sala') || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 5);
  if (!u || !token()) {
    caixa.innerHTML =
      '<div class="ar-opcao"><h3>Jogar online</h3><p>Entra com a Twitch para criar salas e jogar com a comunidade. O teu nome no jogo é o da Twitch.</p><button class="btn-primary" id="arLogin" type="button"><i class="fab fa-twitch" aria-hidden="true"></i> Entrar com a Twitch</button></div>' +
      '<div class="ar-opcao"><h3>Treino com bots</h3><p>Sem login. Aprende o mapa e as armas contra bots.</p><button class="btn-ghost" id="arTreino" type="button">Treinar agora</button></div>';
    $('arLogin').addEventListener('click', () => TA() && TA().login());
  } else {
    caixa.innerHTML =
      '<div class="ar-opcao"><h3>Criar sala</h3><p>Ficas como anfitrião: o jogo corre no teu PC, por isso não o feches durante a partida.</p>' +
      '<label class="ar-check"><input type="checkbox" id="arPublica" checked> Mostrar na lista de salas abertas</label>' +
      '<button class="btn-primary" id="arCriar" type="button">Criar sala</button></div>' +
      '<div class="ar-opcao"><h3>Entrar com código</h3><p>Pede o código a quem criou a sala.</p>' +
      '<form id="arForm" class="ar-form"><input id="arCod" maxlength="5" placeholder="Ex: K7P2M" autocomplete="off" spellcheck="false" value="' + esc(codigoUrl) + '" aria-label="Código da sala"><button class="btn-primary" type="submit">Entrar</button></form></div>' +
      '<div class="ar-opcao"><h3>Treino com bots</h3><p>Sozinho contra bots, sem sala.</p><button class="btn-ghost" id="arTreino" type="button">Treinar agora</button></div>';
    $('arCriar').addEventListener('click', criarSala);
    $('arForm').addEventListener('submit', (e) => { e.preventDefault(); entrarSala($('arCod').value); });
    $('arCod').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  }
  $('arTreino').addEventListener('click', treino);
}

function ecraJogo() {
  const raiz = $('arenaJogo');
  raiz.hidden = false;
  document.documentElement.classList.add('ar-a-jogar');
  return raiz;
}
function fimJogo() {
  a_jogar = false;
  $('arenaJogo').hidden = true;
  document.documentElement.classList.remove('ar-a-jogar');
  estado('');
  listar();
}

async function treino() {
  if (a_jogar) return;
  a_jogar = true;
  try {
    const { Jogo } = await carregarJogo();
    const u = user();
    new Jogo({ raiz: ecraJogo(), modo: 'treino', eu: { id: (u && u.login) || 'tu', nome: (u && u.displayName) || 'Tu' }, rede: null, aoSair: fimJogo });
  } catch (e) { a_jogar = false; estado('Não foi possível abrir o jogo: ' + e.message, true); }
}

async function criarSala() {
  if (a_jogar) return;
  const u = user();
  a_jogar = true;
  estado('A criar a sala…');
  try {
    const api = new Api(BASE, token());
    const { sala } = await api.criar({ nome: u.displayName, publica: $('arPublica').checked });
    const { Jogo } = await carregarJogo();
    const rede = new Anfitriao(api, sala.cod, u.login);
    history.replaceState(null, '', '?sala=' + sala.cod);
    new Jogo({ raiz: ecraJogo(), modo: 'anfitriao', eu: { id: u.login, nome: u.displayName }, rede, api, cod: sala.cod, aoSair: () => { history.replaceState(null, '', location.pathname); fimJogo(); } });
    estado('');
  } catch (e) {
    a_jogar = false;
    estado(e.status === 401 ? 'A tua sessão da Twitch expirou. Sai e entra outra vez.' : 'Não foi possível criar a sala: ' + e.message, true);
  }
}

async function entrarSala(cod) {
  if (a_jogar) return;
  cod = String(cod || '').toUpperCase().trim();
  if (!/^[A-Z2-9]{5}$/.test(cod)) return estado('O código tem 5 letras ou números (ex: K7P2M).', true);
  const u = user();
  if (!u) return estado('Entra com a Twitch primeiro.', true);
  a_jogar = true;
  estado('A procurar a sala…');
  try {
    const api = new Api(BASE, token());
    const { sala } = await api.ver(cod);
    if (sala.host === u.login) throw new Error('Esta sala é tua. Se fechaste a janela do jogo, a sala acabou: cria outra.');
    estado('A ligar ao PC de ' + sala.hostNome + '…');
    const { Jogo } = await carregarJogo();
    const rede = new Cliente(api, cod, sala.host, u.displayName);
    await rede.ligar();
    new Jogo({ raiz: ecraJogo(), modo: 'cliente', eu: { id: u.login, nome: u.displayName }, rede, api, cod, hostId: sala.host, aoSair: fimJogo });
    estado('');
  } catch (e) {
    a_jogar = false;
    estado(e.status === 404 ? 'Esta sala já não existe. Confirma o código.' : e.message, true);
  }
}

async function listar() {
  const box = $('arSalas');
  if (!box || a_jogar) return;
  try {
    const r = await fetch(BASE + '/api/arena?acao=lista', { cache: 'no-store' });
    const { salas } = await r.json();
    box.innerHTML = salas && salas.length
      ? salas.map((s) => '<li><div><b>' + esc(s.nome) + '</b><small>' + esc(s.hostNome) + ' · ' + s.n + '/8 jogadores · ' + (s.estado === 'lobby' ? 'à espera' : s.estado === 'jogo' ? 'a jogar ' + esc(s.placar || '') : 'terminada') + '</small></div>' +
          '<button class="btn-ghost" type="button" data-cod="' + esc(s.cod) + '">Entrar</button></li>').join('')
      : '<li class="vazio">Não há salas abertas agora. Cria uma e partilha o código no chat.</li>';
    box.querySelectorAll('[data-cod]').forEach((b) => b.addEventListener('click', () => {
      if (!user()) { estado('Entra com a Twitch para jogar online.', true); return; }
      entrarSala(b.dataset.cod);
    }));
  } catch (e) {
    box.innerHTML = '<li class="vazio">Não foi possível ver as salas agora.</li>';
  }
}

desenharEntrada();
listar();
setInterval(listar, 10000);
document.addEventListener('twitch:pronto', desenharEntrada);
if (TA() && TA().pronto) TA().pronto.then(desenharEntrada);
// avisa antes de fechar a página a meio de um jogo
window.addEventListener('beforeunload', (e) => { if (a_jogar) { e.preventDefault(); e.returnValue = ''; } });
