// Bilhar 8 bolas — página de entrada: contra o computador, criar sala, entrar com código.
import { Api, Anfitriao, Cliente } from '../arena/rede.js?v=3';

const BASE = window.FSTV_API || 'https://fabiosilvatv-api.vercel.app';
const TOKEN_KEY = 'obaba_twitch_token';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const token = () => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } };
// twitch-auth.js declara TwitchAuth com const (não fica em window)
const TA = () => (typeof TwitchAuth !== 'undefined' ? TwitchAuth : null);
const user = () => (TA() && TA().getUser && TA().getUser()) || null;

let aJogar = false;
let nivel = parseInt(localStorage.getItem('bilhar_nivel') || '1', 10);
const carregar = () => import('./jogo.js?v=1');

function estado(msg, erro) {
  const e = $('bhEstado');
  e.hidden = !msg;
  e.className = 'ar-estado' + (erro ? ' erro' : '');
  e.textContent = msg || '';
}

function desenharEntrada() {
  const u = user();
  const caixa = $('bhEntrada');
  const codigoUrl = (new URLSearchParams(location.search).get('sala') || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 5);
  const cpu = '<div class="ar-opcao"><h3>Contra o computador</h3><p>Sem login. Escolhe o nível e joga já.</p>' +
    '<div class="bh-niveis" role="group" aria-label="Nível">' + ['Fácil', 'Médio', 'Difícil'].map((n, i) => '<button type="button" class="btn-ghost" data-nivel="' + i + '" aria-pressed="' + (i === nivel) + '">' + n + '</button>').join('') + '</div>' +
    '<button class="btn-primary" id="bhCpu" type="button">Jogar contra o computador</button></div>';
  if (!u || !token()) {
    caixa.innerHTML = cpu + '<div class="ar-opcao"><h3>Jogar online</h3><p>Entra com a Twitch para criar salas e jogar 1 contra 1 com a comunidade.</p><button class="btn-primary" id="bhLogin" type="button"><i class="fab fa-twitch" aria-hidden="true"></i> Entrar com a Twitch</button></div>';
    $('bhLogin').addEventListener('click', () => TA() && TA().login());
  } else {
    caixa.innerHTML = cpu +
      '<div class="ar-opcao"><h3>Criar sala</h3><p>Recebes um código para dares a quem quiser jogar contigo.</p><label class="ar-check"><input type="checkbox" id="bhPublica" checked> Mostrar na lista de salas abertas</label><button class="btn-primary" id="bhCriar" type="button">Criar sala</button></div>' +
      '<div class="ar-opcao"><h3>Entrar com código</h3><p>Pede o código a quem criou a sala.</p><form id="bhForm" class="ar-form"><input id="bhCod" maxlength="5" placeholder="Ex: K7P2M" autocomplete="off" spellcheck="false" value="' + esc(codigoUrl) + '" aria-label="Código da sala"><button class="btn-primary" type="submit">Entrar</button></form></div>';
    $('bhCriar').addEventListener('click', criarSala);
    $('bhForm').addEventListener('submit', (e) => { e.preventDefault(); entrarSala($('bhCod').value); });
    $('bhCod').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  }
  caixa.querySelectorAll('[data-nivel]').forEach((b) => b.addEventListener('click', () => {
    nivel = +b.dataset.nivel; localStorage.setItem('bilhar_nivel', nivel);
    caixa.querySelectorAll('[data-nivel]').forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.nivel === nivel)));
  }));
  $('bhCpu').addEventListener('click', contraCpu);
}

function ecra() {
  const r = $('bilharJogo');
  r.hidden = false;
  document.documentElement.classList.add('bh-a-jogar');
  return r;
}
function fim() {
  aJogar = false;
  $('bilharJogo').hidden = true;
  document.documentElement.classList.remove('bh-a-jogar');
  estado('');
  listar();
}

async function contraCpu() {
  if (aJogar) return;
  aJogar = true;
  try {
    const { Bilhar } = await carregar();
    const u = user();
    new Bilhar({ raiz: ecra(), modo: 'cpu', nivel, eu: { id: (u && u.login) || 'tu', nome: (u && u.displayName) || 'Tu' }, aoSair: fim });
  } catch (e) { aJogar = false; estado('Não foi possível abrir o jogo: ' + e.message, true); }
}

async function criarSala() {
  if (aJogar) return;
  const u = user();
  aJogar = true;
  estado('A criar a sala…');
  try {
    const api = new Api(BASE, token());
    const { sala } = await api.criar({ jogo: 'bilhar', nome: u.displayName, titulo: 'Bilhar com ' + u.displayName, publica: $('bhPublica').checked });
    const { Bilhar } = await carregar();
    history.replaceState(null, '', '?sala=' + sala.cod);
    new Bilhar({ raiz: ecra(), modo: 'anfitriao', eu: { id: u.login, nome: u.displayName }, rede: new Anfitriao(api, sala.cod, u.login), api, cod: sala.cod, aoSair: () => { history.replaceState(null, '', location.pathname); fim(); } });
    estado('');
  } catch (e) {
    aJogar = false;
    estado(e.status === 401 ? 'A tua sessão da Twitch expirou. Sai e entra outra vez.' : 'Não foi possível criar a sala: ' + e.message, true);
  }
}

async function entrarSala(cod) {
  if (aJogar) return;
  cod = String(cod || '').toUpperCase().trim();
  if (!/^[A-Z2-9]{5}$/.test(cod)) return estado('O código tem 5 letras ou números (ex: K7P2M).', true);
  const u = user();
  if (!u) return estado('Entra com a Twitch primeiro.', true);
  aJogar = true;
  estado('A procurar a sala…');
  try {
    const api = new Api(BASE, token());
    const { sala } = await api.ver(cod);
    if (sala.jogo !== 'bilhar') throw new Error('Este código é de uma sala da Arena 4v4, não de bilhar.');
    if (sala.host === u.login) throw new Error('Esta sala é tua. Se fechaste a janela, a sala acabou: cria outra.');
    estado('A ligar a ' + sala.hostNome + '…');
    const { Bilhar } = await carregar();
    const rede = new Cliente(api, cod, sala.host, u.displayName);
    await rede.ligar();
    new Bilhar({ raiz: ecra(), modo: 'cliente', eu: { id: u.login, nome: u.displayName }, rede, api, cod, hostId: sala.host, aoSair: fim });
    estado('');
  } catch (e) {
    aJogar = false;
    estado(e.status === 404 ? 'Esta sala já não existe. Confirma o código.' : e.message, true);
  }
}

async function listar() {
  const box = $('bhSalas');
  if (!box || aJogar) return;
  try {
    const r = await fetch(BASE + '/api/arena?acao=lista&jogo=bilhar', { cache: 'no-store' });
    const { salas } = await r.json();
    box.innerHTML = salas && salas.length
      ? salas.map((s) => '<li><div><b>' + esc(s.nome) + '</b><small>' + (s.n >= 2 ? 'a jogar' + (s.placar ? ' · ' + esc(s.placar) : '') : 'à espera de adversário') + '</small></div>' +
          (s.n >= 2 ? '<span class="ar-nota">Cheia</span>' : '<button class="btn-ghost" type="button" data-cod="' + esc(s.cod) + '">Jogar</button>') + '</li>').join('')
      : '<li class="vazio">Não há salas abertas agora. Cria uma e partilha o código no chat.</li>';
    box.querySelectorAll('[data-cod]').forEach((b) => b.addEventListener('click', () => {
      if (!user()) { estado('Entra com a Twitch para jogar online.', true); return; }
      entrarSala(b.dataset.cod);
    }));
  } catch (e) { box.innerHTML = '<li class="vazio">Não foi possível ver as salas agora.</li>'; }
}

desenharEntrada();
listar();
setInterval(listar, 10000);
document.addEventListener('twitch:pronto', desenharEntrada);
if (TA() && TA().pronto) TA().pronto.then(desenharEntrada);
window.addEventListener('beforeunload', (e) => { if (aJogar) { e.preventDefault(); e.returnValue = ''; } });
