// ===================================================================
// Dados — rola um número de 0.00 a 100.00. Escolhes o alvo e se
// queres acima ou abaixo. Multiplicador = 99 / probabilidade (1% casa).
// ===================================================================
(function () {
  const $ = (id) => document.getElementById(id);
  let acima = true;
  let alvo = 50.5;
  let aRolar = false;

  const prob = () => (acima ? 100 - alvo : alvo);
  const mult = () => 99 / prob();

  function limitarAlvo(v) {
    // probabilidade entre 2% e 98%
    return Math.min(98, Math.max(2, Math.round(v * 100) / 100));
  }

  function pintar(origem) {
    const p = prob();
    if (origem !== 'slider') $('diceSlider').value = alvo;
    if (origem !== 'alvo') $('diceTarget').value = alvo.toFixed(2);
    if (origem !== 'prob') $('diceChance').value = p.toFixed(2);
    if (origem !== 'mult') $('diceMultIn').value = mult().toFixed(4);
    $('diceModeLabel').textContent = acima ? 'Rolar acima' : 'Rolar abaixo';
    const track = $('diceTrack');
    track.style.setProperty('--alvo', alvo + '%');
    track.classList.toggle('abaixo', !acima);
    const aposta = Math.max(1, Math.floor(Number($('diceBet').value)) || 1);
    $('diceProfit').textContent = '+' + OG.fmt(Math.floor(aposta * mult()) - aposta);
  }

  function rolar() {
    if (aRolar) return;
    const aposta = OG.readBet('diceBet'); if (!aposta) return;
    aRolar = true;
    OG.adjust(-aposta); OG.sound('bet');
    $('dicePlay').disabled = true;
    // 0.00 – 100.00
    const r = Math.floor(OG.rand() * 10001) / 100;
    const ganhou = acima ? r > alvo : r < alvo;
    const m = mult();
    const marcador = $('diceResult');
    marcador.classList.remove('win', 'lose', 'show');
    void marcador.offsetWidth;
    marcador.style.left = r + '%';
    marcador.querySelector('span').textContent = r.toFixed(2);
    marcador.classList.add('show', ganhou ? 'win' : 'lose');
    setTimeout(() => {
      if (ganhou) {
        const ganho = Math.floor(aposta * m);
        OG.adjust(ganho); OG.sound('win');
        OG.winCard($('diceStage'), m, ganho);
        OG.pushHistory('dice', aposta, ganho - aposta, `${r.toFixed(2)} · ${acima ? '>' : '<'} ${alvo.toFixed(2)}`);
      } else {
        OG.sound('lose');
        OG.pushHistory('dice', aposta, -aposta, `${r.toFixed(2)} · ${acima ? '>' : '<'} ${alvo.toFixed(2)}`);
      }
      OG.pushRecent('diceRecent', r.toFixed(2), ganhou ? 'win' : 'lose');
      aRolar = false;
      $('dicePlay').disabled = false;
    }, 420);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('diceSlider')) return;
    $('diceSlider').addEventListener('input', (e) => { alvo = limitarAlvo(parseFloat(e.target.value)); pintar('slider'); OG.sound('tick'); });
    $('diceTarget').addEventListener('change', (e) => { alvo = limitarAlvo(parseFloat(e.target.value) || 50); pintar(); });
    $('diceChance').addEventListener('change', (e) => {
      const p = Math.min(98, Math.max(2, parseFloat(e.target.value) || 49.5));
      alvo = limitarAlvo(acima ? 100 - p : p); pintar();
    });
    $('diceMultIn').addEventListener('change', (e) => {
      const m = Math.min(49.5, Math.max(1.0102, parseFloat(e.target.value) || 2));
      const p = 99 / m; alvo = limitarAlvo(acima ? 100 - p : p); pintar();
    });
    $('diceMode').addEventListener('click', () => { acima = !acima; alvo = limitarAlvo(100 - alvo); pintar(); OG.sound('tick'); });
    $('diceBet').addEventListener('input', () => pintar('bet'));
    $('dicePlay').addEventListener('click', rolar);
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); rolar(); }
    });
    pintar();
  });
})();
