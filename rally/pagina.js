// Rally — página: escolher pista e modo, correr, ranking das melhores voltas.
import { PISTAS, construirPista } from './pistas.js?v=2';

const BASE = window.FSTV_API || 'https://fabiosilvatv-api.vercel.app';
const TOKEN_KEY = 'obaba_twitch_token';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const token = () => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } };
const TA = () => (typeof TwitchAuth !== 'undefined' ? TwitchAuth : null);
const user = () => (TA() && TA().getUser && TA().getUser()) || null;
const fmt = (ms) => { const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, c = Math.floor(ms / 10) % 100; return m + ':' + String(s).padStart(2, '0') + '.' + String(c).padStart(2, '0'); };
const toque = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;

let pista = localStorage.getItem('rally_pista') || 'douro';
let modo = localStorage.getItem('rally_modo') || 'corrida';
let aJogar = false;
const tops = {};

// desenho do traçado de cada pista
function desenharTracado(cv, id) {
  const p = construirPista(PISTAS[id]);
  const A = p.amostras;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const s of A) { minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x); minZ = Math.min(minZ, s.z); maxZ = Math.max(maxZ, s.z); }
  const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth || 260, h = cv.clientHeight || 120;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const fundo = { douro: ['#c9a46a', '#7a8a3a'], sintra: ['#3e6528', '#1f3a1a'], estrela: ['#dfe6f2', '#9aa8c8'], algarve: ['#e0c890', '#2a6a9a'] }[id];
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, fundo[0]); gr.addColorStop(1, fundo[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const e = Math.min((w - 30) / (maxX - minX), (h - 24) / (maxZ - minZ));
  const ox = (w - (maxX - minX) * e) / 2, oy = (h - (maxZ - minZ) * e) / 2;
  const T = (s) => [ox + (s.x - minX) * e, h - (oy + (s.z - minZ) * e)];
  const traco = () => { g.beginPath(); A.forEach((s, i) => { const [x, y] = T(s); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); };
  g.lineJoin = 'round'; g.strokeStyle = 'rgba(10,16,34,.7)'; g.lineWidth = 7; traco();
  g.strokeStyle = '#fff'; g.lineWidth = 2.5; traco();
  const [sx, sy] = T(A[0]); g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(sx, sy, 4.5, 0, 7); g.fill();
}

function desenharPistas() {
  const box = $('rlPistas');
  box.innerHTML = Object.values(PISTAS).map((P) => {
    const t = tops[P.id] && tops[P.id][0];
    return '<button type="button" class="rl-pista" data-pista="' + P.id + '" aria-pressed="' + (P.id === pista) + '"><canvas></canvas><div><b>' + esc(P.nome) + '</b><small>' + esc(P.desc) + '</small><em>' + (t ? 'Recorde: ' + fmt(t.ms) + ' · ' + esc(t.nome) : 'Ainda sem recorde') + '</em></div></button>';
  }).join('');
  box.querySelectorAll('[data-pista]').forEach((b) => {
    desenharTracado(b.querySelector('canvas'), b.dataset.pista);
    b.addEventListener('click', () => { pista = b.dataset.pista; localStorage.setItem('rally_pista', pista); box.querySelectorAll('[data-pista]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.pista === pista))); mostrarRank(pista); });
  });
}

function desenharModo() {
  document.querySelectorAll('[data-modo]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.modo === modo));
    b.onclick = () => { modo = b.dataset.modo; localStorage.setItem('rally_modo', modo); desenharModo(); };
  });
}

async function carregarTops() {
  await Promise.all(Object.keys(PISTAS).map(async (id) => {
    try { const r = await fetch(BASE + '/api/rally?pista=' + id, { cache: 'no-store' }); tops[id] = (await r.json()).lista || []; } catch (e) { tops[id] = tops[id] || []; }
  }));
  desenharPistas();
  mostrarRank(pista);
}
function mostrarRank(id) {
  document.querySelectorAll('[data-rank]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rank === id)));
  const l = tops[id] || [];
  $('rlRank').innerHTML = l.length
    ? '<thead><tr><th>#</th><th>Piloto</th><th>Melhor volta</th></tr></thead><tbody>' + l.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(x.nome) + '</td><td>' + fmt(x.ms) + '</td></tr>').join('') + '</tbody>'
    : '<tbody><tr><td>Ainda ninguém tem tempo nesta pista. Sê o primeiro!</td></tr></tbody>';
}

async function correr() {
  if (aJogar) return;
  aJogar = true;
  const btn = $('rlCorrer'); btn.disabled = true; btn.textContent = 'A carregar…';
  try {
    const { Rally } = await import('./jogo.js?v=2');
    const raiz = $('rallyJogo');
    raiz.hidden = false; document.documentElement.classList.add('rl-a-jogar');
    const u = user();
    const jogo = new Rally({
      raiz, pista, modo, toque, nome: (u && u.displayName) || 'Tu',
      aoFim: async (r) => {
        if (!r.melhorVolta) return;
        if (!u || !token()) { jogo.mostrarRecorde('Melhor volta ' + fmt(r.melhorVolta) + '. Entra com a Twitch para ficares no ranking.'); return; }
        try {
          const res = await fetch(BASE + '/api/rally', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify({ acao: 'tempo', pista: r.pista, ms: Math.round(r.melhorVolta), nome: u.displayName }) });
          const j = await res.json();
          if (!res.ok) throw new Error(j.error);
          jogo.mostrarRecorde(j.melhorou ? 'Novo recorde pessoal! Estás em ' + j.posicao + '.º no ranking desta pista.' : 'O teu recorde continua ' + fmt(j.recorde) + ' (' + j.posicao + '.º no ranking).');
        } catch (e) { jogo.mostrarRecorde('Não foi possível guardar o tempo agora.'); }
      },
      aoSair: () => { aJogar = false; raiz.hidden = true; document.documentElement.classList.remove('rl-a-jogar'); btn.disabled = false; btn.textContent = 'Correr'; carregarTops(); },
    });
  } catch (e) {
    aJogar = false; btn.disabled = false; btn.textContent = 'Correr';
    $('rlEstado').hidden = false; $('rlEstado').textContent = 'Não foi possível abrir o jogo: ' + e.message;
  }
}

desenharPistas();
desenharModo();
document.querySelectorAll('[data-rank]').forEach((b) => b.addEventListener('click', () => mostrarRank(b.dataset.rank)));
$('rlCorrer').addEventListener('click', correr);
carregarTops();
window.addEventListener('beforeunload', (e) => { if (aJogar) { e.preventDefault(); e.returnValue = ''; } });
