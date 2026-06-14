/* ================== Theme toggle ================== */
(function () {
  var key = 'pref-theme';
  var btn = document.getElementById('themeToggle');
  var saved = null;
  try { saved = localStorage.getItem(key); } catch (e) { }

  if (saved && btn) {
    document.documentElement.setAttribute('data-theme', saved);
    btn.textContent = saved === 'dark' ? '🌙' : '🌞';
    btn.setAttribute('aria-pressed', saved === 'dark' ? 'true' : 'false');
  }

  if (!btn) return;
  btn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(key, next); } catch (e) { }
    btn.textContent = next === 'dark' ? '🌙' : '🌞';
    btn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
  });
})();

/* ================== Scroll progress ================== */
(function () {
  var bar = document.getElementById('scrollBar');
  if (!bar) return;
  function setBar() {
    var d = document.documentElement;
    var top = d.scrollTop || document.body.scrollTop || 0;
    var max = (d.scrollHeight - d.clientHeight) || 1;
    bar.style.width = Math.min(100, Math.max(0, (top / max) * 100)) + '%';
  }
  addEventListener('scroll', setBar, { passive: true });
  addEventListener('resize', setBar);
  setBar();
})();

/* ================== Local nav active sync ================== */
(function () {
  var links = [].slice.call(document.querySelectorAll('.mk-local-nav .mk-nav'));
  var targets = links.map(function (a) {
    var id = a.getAttribute('href');
    return id && id.charAt(0) === '#' ? document.querySelector(id) : null;
  }).filter(Boolean);
  if (!links.length || !targets.length) return;

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var offset = 118;
      var best = 0;
      for (var i = 0; i < targets.length; i++) {
        var rect = targets[i].getBoundingClientRect();
        if (rect.top - offset <= 0) best = i;
      }
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === best); });
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
})();

/* ================== Verified performance charts ==================
   블로그 반영 수치: 2025.09 17,248 / 2025.10 24,343 / 2025.11 48,281
   유튜브 반영 수치: 2025.08.31 3,159,363 / 2025.12.31 3,387,629
   12월 블로그 월간 수치는 확정 전이라 넣지 않음.
*/
(function () {
  function renderBarChart(rootId, data, opts) {
    var root = document.getElementById(rootId);
    if (!root) return;
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }));
    var fmt = new Intl.NumberFormat('ko-KR');
    var minPercent = opts && opts.minPercent ? opts.minPercent : 6;

    root.innerHTML = data.map(function (d) {
      var h = Math.max(minPercent, (d.value / max) * 100).toFixed(2) + '%';
      return [
        '<div class="chart-bar" data-height="' + h + '">',
        '  <strong class="bar-value">' + fmt.format(d.value) + '</strong>',
        '  <div class="bar-shell"><div class="bar-body" style="--bar-h:0%"></div></div>',
        '  <span class="bar-label">' + d.label + '</span>',
        '</div>'
      ].join('');
    }).join('');

    var animated = false;
    function animate() {
      if (animated) return;
      var rect = root.getBoundingClientRect();
      if (rect.top < innerHeight * 0.9 && rect.bottom > 0) {
        animated = true;
        [].slice.call(root.querySelectorAll('.chart-bar')).forEach(function (bar) {
          var body = bar.querySelector('.bar-body');
          if (body) body.style.setProperty('--bar-h', bar.getAttribute('data-height'));
        });
      }
    }
    addEventListener('scroll', animate, { passive: true });
    addEventListener('resize', animate);
    animate();
  }

  renderBarChart('visitChart', [
    { label: '2025.09', value: 17248 },
    { label: '2025.10', value: 24343 },
    { label: '2025.11', value: 48281 }
  ], { minPercent: 8 });

  renderBarChart('youtubeChart', [
    { label: '2025.08.31', value: 3159363 },
    { label: '2025.12.31', value: 3387629 }
  ], { minPercent: 86 });
})();
