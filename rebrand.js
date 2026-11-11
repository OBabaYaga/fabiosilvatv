/* contador + setas nos carrosseis, e a bolha do chat */
(function () {
  document.querySelectorAll('.carrossel').forEach(function (faixa) {
    var painel = faixa.closest('.panel');
    var cab = painel && painel.querySelector('.panel-head');
    if (!cab) return;

    // contador ao lado do titulo
    var titulo = cab.querySelector('.panel-title');
    var n = faixa.children.length;
    if (titulo && n > 1 && !titulo.querySelector('.sec-conta')) {
      var b = document.createElement('span');
      b.className = 'sec-conta';
      b.textContent = n;
      titulo.appendChild(b);
    }

    // setas no fim do cabecalho
    var dir = document.createElement('div');
    dir.className = 'sec-dir';
    dir.innerHTML =
      '<button class="seta" type="button" data-dir="-1" aria-label="Anterior">' +
      '<i class="fas fa-chevron-left" aria-hidden="true"></i></button>' +
      '<button class="seta" type="button" data-dir="1" aria-label="Seguinte">' +
      '<i class="fas fa-chevron-right" aria-hidden="true"></i></button>';
    cab.appendChild(dir);

    var setas = dir.querySelectorAll('.seta');
    function passo() {
      var p = faixa.firstElementChild;
      var l = p ? p.getBoundingClientRect().width + 16 : 300;
      return Math.max(l, Math.floor(faixa.clientWidth / l) * l);
    }
    function estado() {
      var fim = faixa.scrollWidth - faixa.clientWidth - 2;
      dir.hidden = fim <= 2;
      setas[0].disabled = faixa.scrollLeft <= 2;
      setas[1].disabled = faixa.scrollLeft >= fim;
    }
    setas.forEach(function (bt) {
      bt.addEventListener('click', function () {
        faixa.scrollBy({ left: passo() * Number(bt.dataset.dir), behavior: 'smooth' });
      });
    });
    faixa.addEventListener('scroll', estado, { passive: true });
    window.addEventListener('resize', estado);
    setTimeout(estado, 60);
  });

  var bolha = document.getElementById('chatBolha');
  var chat = document.getElementById('chat');
  if (bolha && chat) {
    bolha.addEventListener('click', function () {
      var abrir = !chat.classList.contains('open');
      chat.classList.toggle('open', abrir);
      var fundo = document.getElementById('backdrop');
      if (fundo) fundo.classList.toggle('show', abrir);
      bolha.querySelector('i').className = abrir ? 'fas fa-xmark' : 'fas fa-comments';
    });
  }
})();
