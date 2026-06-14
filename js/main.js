/* ================== Entry Gate (비디오 배경 + 1초 홀드 이미지) ================== */
(function () {
  var gate = document.getElementById('gate'); if (!gate) return;
  var btn = gate.querySelector('.gate-image');
  var skip = gate.querySelector('[data-gate-skip]');
  var holdMs = 1000;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function openGate() {
    gate.classList.add('show');
    document.documentElement.classList.add('gate-lock');
    document.body.classList.add('gate-lock');
  }
  function closeGate() {
    gate.classList.remove('show');
    document.documentElement.classList.remove('gate-lock');
    document.body.classList.remove('gate-lock');
    try { sessionStorage.setItem('gateUnlocked', '1'); } catch (e) { }
    if (btn) btn.style.setProperty('--reveal', '0%');
  }

  // 첫 방문만 게이트 열기
  try { if (!sessionStorage.getItem('gateUnlocked')) openGate(); } catch (e) { }

  var raf = 0, start = 0, holding = false, done = false;

  function tick(t) {
    if (!holding) return;
    if (!start) start = t;
    var elapsed = t - start;
    var p = Math.min(1, elapsed / holdMs);
    if (btn) btn.style.setProperty('--reveal', (p * 100) + '%');
    if (p >= 1) { done = true; cancelAnimationFrame(raf); return; }
    raf = requestAnimationFrame(tick);
  }

  function down(e) {
    if (e && e.preventDefault) e.preventDefault();
    holding = true; done = false; start = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function up() {
    holding = false;
    cancelAnimationFrame(raf);
    // 성공: 게이트 닫고 같은 제스처 콜스택에서 바로 재생 호출
    if (done) {
      closeGate();
      if (window.enableHeroVideoFromGate) { try { window.enableHeroVideoFromGate(); } catch (e) { } }
    } else {
      // 실패: 덮개 원상복구
      if (btn) btn.style.setProperty('--reveal', '0%');
    }
  }

  if (btn) {
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    // 키보드 접근
    btn.addEventListener('keydown', function (e) {
      if (e.code === 'Space' || e.code === 'Enter') down(e);
    });
    btn.addEventListener('keyup', function (e) {
      if (e.code === 'Space' || e.code === 'Enter') up();
    });
    if (reduced) btn.addEventListener('click', function () {
      closeGate();
      if (window.enableHeroVideoFromGate) { try { window.enableHeroVideoFromGate(); } catch (e) { } }
    });
  }

  if (skip) {
    skip.addEventListener('click', function (e) {
      if (e) e.preventDefault();
      closeGate();
      if (window.enableHeroVideoFromGate) { try { window.enableHeroVideoFromGate(); } catch (e) { } }
    });
  }
})();

/* ================== Theme toggle ================== */
(function () {
  var key = 'pref-theme', btn = document.getElementById('themeToggle');
  var saved = null; try { saved = localStorage.getItem(key); } catch (e) { }
  if (saved && btn) {
    document.documentElement.setAttribute('data-theme', saved);
    btn.textContent = saved === 'dark' ? '🌙' : '🌞';
    btn.setAttribute('aria-pressed', saved === 'dark' ? 'true' : 'false');
  }
  if (btn) {
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem(key, next); } catch (e) { }
      btn.textContent = next === 'dark' ? '🌙' : '🌞';
      btn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
    });
  }
})();

/* ================== Rotating word ================== */
(function () {
  var el = document.getElementById('swap'); if (!el) return;
  var words = ['VALUE', 'IMPACT', 'EXPERIENCES'];
  var i = 0, reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  setInterval(function () {
    i = (i + 1) % words.length;
    if (reduced) { el.textContent = words[i]; return; }
    el.style.opacity = '0';
    setTimeout(function () {
      el.textContent = words[i];
      el.style.transform = 'translateY(-6px)';
      el.style.opacity = '1';
      setTimeout(function () { el.style.transform = 'translateY(0)'; }, 160);
    }, 120);
  }, 1400);
})();

/* ================== HERO video (고정+클램프) ================== */
(function () {
  var wrap = document.getElementById('heroVidWrap');
  var video = document.getElementById('heroVideo');
  var anchor = document.getElementById('heroAnchor');
  var stage = document.getElementById('videoStage');
  var profile = document.getElementById('profile');
  if (!wrap || !video || !anchor || !stage || !profile) return;

  var START_OFFSET_VH = 0.08;
  var GROW_LEN_VH = 0.5;
  var HOLD_PART_STAGE = 0.05;
  var END_GAP_PX = 24;
  var FINAL_VW = 70;
  var TARGET_BR_PX = 20;

  var started = false;
  var baseW = 0, baseH = 0;
  var currentScale = 1;
  var gateOpened = false;

  try { video.pause(); video.currentTime = 0; } catch (e) { }
  video.muted = true;

  function measureBase() {
    var rect = wrap.getBoundingClientRect();
    baseW = rect.width / (currentScale || 1);
    baseH = rect.height / (currentScale || 1);
    if (!isFinite(baseW) || baseW <= 0) {
      var cs = getComputedStyle(wrap);
      baseW = parseFloat(cs.width) || 200;
      baseH = baseW * 9 / 16;
    }
  }
  var finalScale = 7;
  function measureFinalScale() {
    finalScale = Math.min(14, (innerWidth * (FINAL_VW / 100)) / (baseW || 1));
  }
  function measureAll() { measureBase(); measureFinalScale(); }
  measureAll();
  addEventListener('resize', measureAll);

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function thresholds() {
    var startY = Math.round(innerHeight * START_OFFSET_VH);
    var growEndY = startY + Math.max(1, innerHeight * GROW_LEN_VH);
    var holdEndY = growEndY + Math.max(1, stage.offsetHeight * HOLD_PART_STAGE);
    return { startY, growEndY, holdEndY };
  }

  var startAnchorTop = null;

  // 게이트가 성공하면 같은 제스처 콜스택에서 호출됨
  window.enableHeroVideoFromGate = function () {
    try {
      gateOpened = true;
      video.muted = false;
      video.volume = 1;
      started = true;
      video.play().catch(function () { });
    } catch (e) { }
  };

  // 재방문(게이트 안 뜸) 대비: 첫 사용자 제스처에서 해제
  try { gateOpened = !!sessionStorage.getItem('gateUnlocked'); } catch (e) { }
  if (gateOpened) {
    addEventListener('pointerdown', function once() {
      window.enableHeroVideoFromGate();
      removeEventListener('pointerdown', once);
    }, { once: true });
  }

  function loop() {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var t = thresholds();

    wrap.style.left = '50%';
    wrap.style.zIndex = '5';
    wrap.style.pointerEvents = 'none';

    var aTopNow = anchor.getBoundingClientRect().top;
    var topPx, s = currentScale;

    if (y < t.startY) {
      wrap.style.position = 'fixed';
      topPx = aTopNow; s = 1; startAnchorTop = null;
    } else if (y < t.growEndY) {
      wrap.style.position = 'fixed';
      if (startAnchorTop === null) startAnchorTop = aTopNow;
      var p = clamp((y - t.startY) / (t.growEndY - t.startY), 0, 1);
      var e = easeOutCubic(p);
      topPx = startAnchorTop + (innerHeight * 0.5 - startAnchorTop) * e;
      s = 1 + (finalScale - 1) * e;
    } else if (y < t.holdEndY) {
      wrap.style.position = 'fixed';
      topPx = innerHeight * 0.5; s = finalScale;
    } else {
      wrap.style.position = 'fixed';
      topPx = innerHeight * 0.5; s = finalScale;
    }

    currentScale = s;
    wrap.style.borderRadius = (TARGET_BR_PX / s).toFixed(2) + 'px';

    var halfH = (baseH * s) * 0.5;
    var profileTopV = profile.getBoundingClientRect().top;
    var maxTop = profileTopV - halfH - END_GAP_PX;
    if (maxTop < topPx) { topPx = maxTop; wrap.style.zIndex = '0'; }
    else { wrap.style.zIndex = '5'; }

    wrap.style.top = topPx + 'px';
    wrap.style.transform = 'translate(-50%, -50%) scale(' + s.toFixed(3) + ')';
    wrap.style.opacity = '1';
    wrap.style.visibility = 'visible';

    // 한 픽셀이라도 벗어나면 멈춤
    var rect = wrap.getBoundingClientRect();
    var fullyInView = rect.top >= 0 && rect.bottom <= innerHeight;

    if (gateOpened && fullyInView) {
      video.play().catch(function () { });
    } else {
      try { video.pause(); } catch (e) { }
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ================== Intro slider (About=Page1, Skill=Page2, track 기반) ================== */
(function () {
  var wrap = document.querySelector('[data-intro]'); if (!wrap) return;

  // 원본 페이지 수집
  var pages = [].slice.call(wrap.querySelectorAll('.intro-page'));
  if (pages.length < 2) return;

  // About을 1페이지로 앞으로, Skill을 2페이지로 정렬
  var about = wrap.querySelector('.intro-about');
  var skill = wrap.querySelector('.intro-skill');
  var order = [];
  if (about) order.push(about);
  if (skill) order.push(skill);
  pages.forEach(function (p) { if (order.indexOf(p) === -1) order.push(p); });

  // 트랙 생성 후 페이지 이주시킴
  var track = document.createElement('div');
  track.className = 'intro-track';
  order.forEach(function (p) { track.appendChild(p); });

  // 래퍼 초기화 후 트랙 삽입
  while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
  wrap.appendChild(track);

  // 페이지네이션 핸들러
  var dots = [].slice.call(document.querySelectorAll('[data-intro-dot]'));
  var idx = 0;

  function syncA11y() {
    var ch = track.children;
    for (var i = 0; i < ch.length; i++) {
      ch[i].setAttribute('role', 'tabpanel');
      ch[i].setAttribute('aria-hidden', i === idx ? 'false' : 'true');
    }
    dots.forEach(function (d, i) { d.setAttribute('aria-selected', i === idx ? 'true' : 'false'); });
  }

  function go(n) {
    idx = Math.max(0, Math.min(track.children.length - 1, n));
    track.style.transform = 'translateX(' + (-100 * idx) + '%)';
    syncA11y();
  }

  dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
  addEventListener('resize', function () { go(idx); });

  go(0); // 기본: About(1페이지)
})();

/* ================== Cursor & Progress ================== */
(function () {
  var fine = window.matchMedia && matchMedia('(pointer:fine)').matches; if (!fine) return;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = document.querySelector('.cursor'); if (!cur) return;
  var label = cur.querySelector('.cursor-label');
  var x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = 0, follow = .30;
  function move() { if (reduced) { tx = x; ty = y; } else { tx += (x - tx) * follow; ty += (y - ty) * follow; } cur.style.left = tx + 'px'; cur.style.top = ty + 'px'; raf = requestAnimationFrame(move); }
  raf = requestAnimationFrame(move);
  function state(t) {
    var g = t && t.closest ? t.closest('[data-cursor]') : null;
    if (g) { document.body.classList.add('cur-hide'); cur.classList.add('visible', 'is-active'); label.textContent = g.getAttribute('data-cursor') === 'go' ? 'GO' : 'VIEW'; }
    else { document.body.classList.remove('cur-hide'); cur.classList.remove('is-active', 'visible'); label.textContent = ''; }
  }
  addEventListener('pointermove', function (e) { x = e.clientX; y = e.clientY; }, { passive: true });
  addEventListener('pointerover', function (e) { state(e.target); });
  addEventListener('pointerout', function () { state(null); });
})();

(function () {
  var bar = document.getElementById('scrollBar'); if (!bar) return;
  function setBar() {
    var d = document.documentElement;
    var t = d.scrollTop || document.body.scrollTop || 0;
    var m = (d.scrollHeight - d.clientHeight) || 1;
    bar.style.width = Math.min(100, Math.max(0, (t / m) * 100)) + '%';
  }
  addEventListener('scroll', setBar, { passive: true });
  addEventListener('resize', setBar);
  setBar();
})();

/* ================== Work tabs highlight ================== */
(function () {
  var links = [].slice.call(document.querySelectorAll('.work-nav .wnav'));
  var ids = ['work-app', 'work-web', 'work-editorial', 'work-card'];
  var targets = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
  if (!links.length || !targets.length) return;
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var offset = 100, best = 0, bestDist = Infinity;
      for (var i = 0; i < targets.length; i++) {
        var r = targets[i].getBoundingClientRect();
        var d = Math.abs(r.top - offset);
        if (r.top - offset <= 1 && d < bestDist) { best = i; bestDist = d; }
      }
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === best); });
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
  links.forEach(function (a) {
    a.addEventListener('click', function () {
      links.forEach(function (x) { x.classList.remove('is-active'); });
      a.classList.add('is-active');
    });
  });
})();

/* ================== MEDIA subnav active sync ================== */
(function () {
  var links = [].slice.call(document.querySelectorAll('.media-nav .mnav'));
  var ids = ['media-film', 'media-picture'];
  var targets = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
  if (!links.length || !targets.length) return;
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var offset = 100, best = 0, bestDist = Infinity;
      for (var i = 0; i < targets.length; i++) {
        var r = targets[i].getBoundingClientRect();
        var d = Math.abs(r.top - offset);
        if (r.top - offset <= 1 && d < bestDist) { best = i; bestDist = d; }
      }
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === best); });
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll); onScroll();
  links.forEach(function (a) {
    a.addEventListener('click', function () {
      links.forEach(function (x) { x.classList.remove('is-active'); });
      a.classList.add('is-active');
    });
  });
})();

/* ================== Picture lightbox ================== */
(function () {
  var box = document.getElementById('lightbox'); if (!box) return;
  var stage = box.querySelector('.lb-stage img');
  var btnPrev = box.querySelector('.lb-prev');
  var btnNext = box.querySelector('.lb-next');
  var btnClose = box.querySelector('.lb-close');
  var items = [].slice.call(document.querySelectorAll('.picture-grid .pic'));
  var slides = [], idx = 0, open = false;

  function show(n) { if (!slides.length) return; idx = (n + slides.length) % slides.length; stage.src = slides[idx]; }
  function openBox(arr) {
    slides = arr; idx = 0; stage.alt = '선택된 사진';
    show(0); box.classList.add('show'); box.setAttribute('aria-hidden', 'false'); open = true;
    document.documentElement.classList.add('gate-lock'); document.body.classList.add('gate-lock');
  }
  function closeBox() {
    box.classList.remove('show'); box.setAttribute('aria-hidden', 'true'); open = false;
    document.documentElement.classList.remove('gate-lock'); document.body.classList.remove('gate-lock');
    stage.removeAttribute('src');
  }

  items.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var list = (btn.getAttribute('data-slides') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (list.length) { openBox(list); }
    });
  });

  btnPrev.addEventListener('click', function () { show(idx - 1); });
  btnNext.addEventListener('click', function () { show(idx + 1); });
  btnClose.addEventListener('click', closeBox);
  box.addEventListener('click', function (e) { if (e.target === box) closeBox(); });
  addEventListener('keydown', function (e) {
    if (!open) return;
    if (e.key === 'Escape') closeBox();
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });
})();

/* ================== Web slider — 가운데 확대 + 반복 ================== */
(function () {
  var root = document.querySelector('[data-web-slider]'); if (!root) return;
  var track = root.querySelector('.ws-track');
  var prev = root.querySelector('.ws-prev');
  var next = root.querySelector('.ws-next');
  var slides = [].slice.call(track.children);
  var idx = 0;

  function mark() {
    slides.forEach(function (s, i) { s.classList.toggle('ws-center', i === idx); });
  }
  function go(n) {
    idx = (n + slides.length) % slides.length;
    var w = slides[0].getBoundingClientRect().width + 16;
    track.scrollTo({ left: Math.max(0, (idx - 1)) * w, behavior: 'smooth' });
    mark();
  }

  if (slides.length) { mark(); go(1); }
  if (prev) prev.addEventListener('click', function () { go(idx - 1); });
  if (next) next.addEventListener('click', function () { go(idx + 1); });

  // fallback: 스크롤 중간에도 센터 클래스 유지 시도
  var t;
  track.addEventListener('scroll', function () {
    clearTimeout(t);
    t = setTimeout(mark, 80);
  }, { passive: true });
})();

/* Floating controls: scrollTop + sound */
(function () {
  var btnTop = document.getElementById('btnTop');
  var btnSound = document.getElementById('btnSound');
  var audio = document.getElementById('soundTrack');
  if (!btnTop) return;

  // 스크롤 시 고탑 표시
  var showAt = 140;
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    btnTop.classList.toggle('show', y > showAt);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // 맨 위로
  btnTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 사운드 토글: audio 파일이 있을 때만 활성화
  if (btnSound && audio) {
    btnSound.addEventListener('click', function () {
      if (audio.paused) {
        if (audio.readyState === 0) { try { audio.load(); } catch (e) { } }
        audio.play().then(function () {
          btnSound.classList.add('playing');
          btnSound.setAttribute('aria-pressed', 'true');
          btnSound.setAttribute('title', '음악 일시정지');
        }).catch(function (e) { console.warn('audio play failed', e); });
      } else {
        audio.pause();
        btnSound.classList.remove('playing');
        btnSound.setAttribute('aria-pressed', 'false');
        btnSound.setAttribute('title', '음악 재생');
      }
    });

    // 페이지 벗어날 때 정리(선택)
    addEventListener('pagehide', function () { try { audio.pause(); } catch (e) { } });
  }
})();




var gateOpened = false;
try { gateOpened = !!sessionStorage.getItem('gateUnlocked'); } catch (e) { }

function enableHeroSound() {
  try {
    video.muted = false; // 소리 켬
    video.volume = 1;
    started = true;
    video.play().catch(function () { });
    gateOpened = true;
  } catch (e) { }
}

// 게이트 통과하면 소리 켜고 재생
document.addEventListener('gate:closed', enableHeroSound, { once: true });

// 재방문 등으로 게이트가 안 뜬 경우: 첫 사용자 제스처에서 소리 해제 보장
if (gateOpened) {
  addEventListener('pointerdown', enableHeroSound, { once: true });
}

