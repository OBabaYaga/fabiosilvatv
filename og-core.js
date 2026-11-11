// ===================================================================
// FabioSilva_TV Originals — base comum dos minijogos (estilo Stake)
// Fichas virtuais, sem dinheiro real. Saldo e histórico ficam neste
// browser e são os mesmos de antes (mesmas chaves do localStorage).
// ===================================================================

const OG = (function () {
  const BALANCE_KEY = 'obaba_credits';
  const HISTORY_KEY = 'obaba_game_history';
  const SOUND_KEY = 'fstv_og_som';
  const START_BALANCE = 1000;
  const MIN_BET = 1;
  const HISTORY_MAX = 50;

  const GAME_NAMES = {
    blackjack: 'Blackjack', dice: 'Dados', mines: 'Minas', crash: 'Crash',
    plinko: 'Plinko', roulette: 'Roleta', slots: 'Slot',
  };

  // ---------- utilitários ----------
  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function fmtMult(m) {
    return (Math.floor(m * 100) / 100).toFixed(2) + 'x';
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function store(get, key, val) {
    try {
      if (get) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) {
      return null;
    }
  }
  // Aleatório criptográfico (melhor do que Math.random)
  function rand() {
    if (window.crypto && crypto.getRandomValues) {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] / 4294967296;
    }
    return Math.random();
  }
  function randInt(n) {
    return Math.floor(rand() * n);
  }

  // ---------- saldo ----------
  function getBalance() {
    const s = store(true, BALANCE_KEY);
    const n = s === null ? START_BALANCE : parseInt(s, 10);
    return Number.isFinite(n) ? n : START_BALANCE;
  }
  function setBalance(v) {
    const val = Math.max(0, Math.round(v));
    store(false, BALANCE_KEY, String(val));
    renderBalance();
    if (val <= 0) {
      setTimeout(() => {
        if (getBalance() <= 0) {
          setBalance(START_BALANCE);
          toast('As tuas fichas acabaram — aqui tens mais ' + fmt(START_BALANCE) + ' para continuares.');
        }
      }, 900);
    }
  }
  function adjust(d) {
    setBalance(getBalance() + d);
  }
  function renderBalance() {
    const v = fmt(getBalance());
    document.querySelectorAll('[data-balance]').forEach((el) => {
      if (el.textContent !== v) {
        el.textContent = v;
        el.classList.remove('og-bump');
        void el.offsetWidth;
        el.classList.add('og-bump');
      }
    });
  }

  // ---------- histórico ----------
  function getHistory() {
    try {
      return JSON.parse(store(true, HISTORY_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }
  function pushHistory(game, bet, result, label) {
    const list = getHistory();
    list.unshift({ game, bet: Math.round(bet), result: Math.round(result), label: label || '', t: Date.now() });
    store(false, HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
    renderHistory();
  }
  function timeAgo(t) {
    const s = Math.max(1, Math.round((Date.now() - t) / 1000));
    if (s < 60) return 'agora';
    const m = Math.round(s / 60);
    if (m < 60) return m + ' min';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' h';
    return Math.round(h / 24) + ' d';
  }
  function renderHistory() {
    const body = document.getElementById('historyBody');
    if (body) {
      const filter = body.dataset.game || '';
      const list = getHistory().filter((h) => !filter || h.game === filter);
      if (!list.length) {
        body.innerHTML = '<tr><td colspan="4" class="history-empty">Ainda não há jogadas. Faz a tua primeira aposta!</td></tr>';
      } else {
        const u = window.TwitchAuth && TwitchAuth.getUser && TwitchAuth.getUser();
        const you = (u && u.displayName) || 'Tu';
        body.innerHTML = list
          .slice(0, 20)
          .map((h) => {
            const cls = h.result > 0 ? 'win' : h.result < 0 ? 'lose' : 'push';
            const res = h.result > 0 ? '+' + fmt(h.result) : h.result < 0 ? '−' + fmt(-h.result) : 'Push';
            return `<tr><td><span class="history-player">${esc(you)}</span><small>${timeAgo(h.t)}${filter ? '' : ' · ' + (GAME_NAMES[h.game] || h.game)}</small></td><td>${fmt(h.bet)}</td><td class="history-label">${esc(h.label)}</td><td class="history-result ${cls}">${res}</td></tr>`;
          })
          .join('');
      }
    }
    renderStats();
  }
  function renderStats() {
    const el = document.getElementById('gameStats');
    if (!el) return;
    const body = document.getElementById('historyBody');
    const filter = (body && body.dataset.game) || '';
    const list = getHistory().filter((h) => !filter || h.game === filter);
    const wins = list.filter((h) => h.result > 0).length;
    const best = list.reduce((m, h) => Math.max(m, h.result), 0);
    const total = list.reduce((s, h) => s + h.result, 0);
    el.innerHTML = `
      <div class="stat"><small>Jogadas</small><strong>${fmt(list.length)}</strong></div>
      <div class="stat"><small>Vitórias</small><strong>${list.length ? Math.round((wins / list.length) * 100) : 0}%</strong></div>
      <div class="stat"><small>Melhor ganho</small><strong class="${best > 0 ? 'win' : ''}">+${fmt(best)}</strong></div>
      <div class="stat"><small>Saldo líquido</small><strong class="${total >= 0 ? 'win' : 'lose'}">${total >= 0 ? '+' : '−'}${fmt(Math.abs(total))}</strong></div>`;
  }

  // ---------- resultados recentes (pílulas no topo do palco) ----------
  function pushRecent(id, text, tipo) {
    const el = document.getElementById(id);
    if (!el) return;
    const pill = document.createElement('span');
    pill.className = 'og-pill ' + (tipo || '');
    pill.textContent = text;
    el.prepend(pill);
    while (el.children.length > 12) el.lastChild.remove();
  }

  // ---------- aposta ----------
  // Lê e valida a aposta (no mínimo 1, no máximo o saldo). Devolve null se
  // não houver saldo.
  function readBet(id) {
    const input = document.getElementById(id);
    let v = Math.floor(Number(input.value));
    if (!Number.isFinite(v) || v < MIN_BET) v = MIN_BET;
    if (v > getBalance()) {
      toast('Não tens fichas suficientes para essa aposta.');
      input.value = Math.max(MIN_BET, getBalance());
      shake(input.closest('.og-amount') || input);
      return null;
    }
    input.value = v;
    return v;
  }
  function initBetControls(root) {
    (root || document).querySelectorAll('[data-bet-op]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (!input || input.disabled) return;
        const cur = Math.floor(Number(input.value)) || MIN_BET;
        let v = cur;
        const op = btn.dataset.betOp;
        if (op === 'half') v = Math.floor(cur / 2);
        else if (op === 'double') v = cur * 2;
        else if (op === 'max') v = getBalance();
        else if (op === 'min') v = MIN_BET;
        input.value = Math.max(MIN_BET, Math.min(v, Math.max(MIN_BET, getBalance())));
        input.dispatchEvent(new Event('input'));
        sound('tick');
      });
    });
    const reset = document.getElementById('balanceReset');
    if (reset)
      reset.addEventListener('click', () => {
        setBalance(START_BALANCE);
        toast('Saldo reposto para ' + fmt(START_BALANCE) + ' fichas.');
      });
  }
  function lockBet(id, locked) {
    const input = document.getElementById(id);
    if (!input) return;
    input.disabled = locked;
    document.querySelectorAll(`[data-target="${id}"]`).forEach((b) => (b.disabled = locked));
  }

  // ---------- avisos e efeitos ----------
  function toast(text) {
    let el = document.getElementById('gameToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'gameToast';
      el.className = 'game-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 3500);
  }
  function shake(el) {
    if (!el) return;
    el.classList.remove('og-shake');
    void el.offsetWidth;
    el.classList.add('og-shake');
  }
  // Cartão grande de vitória no centro do palco (como no Stake)
  function winCard(stage, mult, amount) {
    if (!stage) return;
    const old = stage.querySelector('.og-wincard');
    if (old) old.remove();
    const c = document.createElement('div');
    c.className = 'og-wincard';
    c.innerHTML = `<strong>${fmtMult(mult)}</strong><span><i class="fas fa-coins" aria-hidden="true"></i> ${fmt(amount)}</span>`;
    stage.appendChild(c);
    setTimeout(() => c.classList.add('out'), 1800);
    setTimeout(() => c.remove(), 2300);
  }
  // Confettis leves em canvas
  function confetti(stage) {
    if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.createElement('canvas');
    cv.className = 'og-confetti';
    stage.appendChild(cv);
    const r = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = r.width * dpr;
    cv.height = r.height * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const cores = ['#f0c14b', '#3ddc84', '#4da3ff', '#ff5f8f', '#ffffff'];
    const ps = Array.from({ length: 90 }, () => ({
      x: r.width / 2, y: r.height / 2,
      vx: (rand() - 0.5) * 12, vy: -rand() * 11 - 3,
      w: 4 + rand() * 6, h: 6 + rand() * 8, a: rand() * 6, va: (rand() - 0.5) * 0.4,
      c: cores[randInt(cores.length)],
    }));
    let f = 0;
    (function loop() {
      ctx.clearRect(0, 0, r.width, r.height);
      ps.forEach((p) => {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - f / 110); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (++f < 110) requestAnimationFrame(loop);
      else cv.remove();
    })();
  }

  // ---------- som (sintetizado, sem ficheiros) ----------
  let audio = null;
  function somLigado() {
    return store(true, SOUND_KEY) !== '0';
  }
  function sound(tipo) {
    if (!somLigado()) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime;
      const tocar = (freq, dur, type, vol, quando) => {
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, t + (quando || 0));
        g.gain.setValueAtTime(vol || 0.06, t + (quando || 0));
        g.gain.exponentialRampToValueAtTime(0.0001, t + (quando || 0) + dur);
        o.connect(g).connect(audio.destination);
        o.start(t + (quando || 0));
        o.stop(t + (quando || 0) + dur + 0.02);
      };
      if (tipo === 'tick') tocar(900, 0.04, 'square', 0.025);
      else if (tipo === 'bet') tocar(520, 0.08, 'triangle', 0.06);
      else if (tipo === 'gem') { tocar(880, 0.12, 'sine', 0.07); tocar(1320, 0.18, 'sine', 0.05, 0.06); }
      else if (tipo === 'card') tocar(300, 0.05, 'triangle', 0.05);
      else if (tipo === 'win') { [660, 880, 1100, 1320].forEach((f, i) => tocar(f, 0.16, 'triangle', 0.06, i * 0.07)); }
      else if (tipo === 'lose') { tocar(220, 0.25, 'sawtooth', 0.04); tocar(150, 0.35, 'sawtooth', 0.035, 0.1); }
      else if (tipo === 'boom') { tocar(90, 0.5, 'sawtooth', 0.08); tocar(60, 0.6, 'square', 0.05, 0.05); }
      else if (tipo === 'peg') tocar(1400 + rand() * 600, 0.03, 'sine', 0.02);
      else if (tipo === 'reel') tocar(200, 0.05, 'square', 0.025);
    } catch (e) { /* sem som */ }
  }
  function initSoundToggle() {
    document.querySelectorAll('.og-sound').forEach((b) => {
      const pinta = () => {
        b.innerHTML = somLigado() ? '<i class="fas fa-volume-high" aria-hidden="true"></i>' : '<i class="fas fa-volume-xmark" aria-hidden="true"></i>';
        b.setAttribute('aria-label', somLigado() ? 'Desligar som' : 'Ligar som');
      };
      pinta();
      b.addEventListener('click', () => {
        store(false, SOUND_KEY, somLigado() ? '0' : '1');
        pinta();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderBalance();
    renderHistory();
    initBetControls();
    initSoundToggle();
  });
  window.addEventListener('storage', (e) => {
    if (e.key === BALANCE_KEY) renderBalance();
  });

  return {
    fmt, fmtMult, esc, rand, randInt,
    getBalance, setBalance, adjust, renderBalance,
    pushHistory, pushRecent, readBet, lockBet,
    toast, shake, winCard, confetti, sound,
  };
})();
