(function () {
  'use strict';
  var doc = document, root = doc.documentElement;

  // 밝은 화면 / 어두운 화면
  doc.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  });

  // 드로어 메뉴
  var drawer = doc.getElementById('drawer'), lastFocus = null;
  function openDrawer(from) {
    if (!drawer) return;
    lastFocus = from; drawer.hidden = false; doc.body.style.overflow = 'hidden';
    doc.querySelectorAll('[data-drawer-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    var x = drawer.querySelector('.drawer-head button'); if (x) x.focus();
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true; doc.body.style.overflow = '';
    doc.querySelectorAll('[data-drawer-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (lastFocus) lastFocus.focus();
  }
  doc.querySelectorAll('[data-drawer-open]').forEach(function (b) { b.addEventListener('click', function () { openDrawer(b); }); });
  doc.querySelectorAll('[data-drawer-close]').forEach(function (b) { b.addEventListener('click', closeDrawer); });
  doc.addEventListener('keydown', function (e) {
    if (!drawer || drawer.hidden) return;
    if (e.key === 'Escape') { closeDrawer(); return; }
    if (e.key === 'Tab') {   // 메뉴가 열려 있는 동안 초점이 뒤 화면으로 나가지 않게
      var f = drawer.querySelectorAll('a[href], button, input, summary');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  matchMedia('(min-width: 1024px)').addEventListener('change', function (e) { if (e.matches) closeDrawer(); });

  // 글을 쓰는 동안 하단 바 숨김
  doc.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches('input:not([type=checkbox]):not([type=radio]), textarea, select')) doc.body.classList.add('typing'); });
  doc.addEventListener('focusout', function () { doc.body.classList.remove('typing'); });

  // 글자 수
  doc.querySelectorAll('textarea[data-count]').forEach(function (t) {
    var out = doc.querySelector(t.getAttribute('data-count')), max = t.maxLength;
    if (!out) return;
    var fmt = new Intl.NumberFormat('ko-KR');
    t.addEventListener('input', function () { out.textContent = fmt.format(t.value.length) + ' / ' + fmt.format(max); });
  });

  // 쓰던 글을 두고 나가려 할 때 확인
  doc.querySelectorAll('form[data-guard]').forEach(function (f) {
    var dirty = false;
    f.addEventListener('input', function () { dirty = true; });
    f.addEventListener('submit', function () { dirty = false; });
    window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  });

  // 두 번 눌러 중복 등록되는 것 방지
  doc.querySelectorAll('form[method="post"]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      if (f.dataset.sent) { e.preventDefault(); return; }
      f.dataset.sent = '1';
      var b = f.querySelector('button[type="submit"]');
      if (b) b.setAttribute('aria-busy', 'true');
      setTimeout(function () { delete f.dataset.sent; if (b) b.removeAttribute('aria-busy'); }, 6000);
    });
  });

  // 복구 코드 복사
  doc.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var el = doc.querySelector(b.getAttribute('data-copy')), label = b.querySelector('span');
      if (!el || !navigator.clipboard) return;
      navigator.clipboard.writeText(el.textContent.trim()).then(function () {
        if (label) { label.textContent = '복사됨'; setTimeout(function () { label.textContent = '복사'; }, 2000); }
      });
    });
  });

  // 상담 버튼을 누른 횟수 기록 (전화·카카오톡 구분과 버튼 위치만 보낸다)
  doc.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-consult]') : null;
    var m = doc.querySelector('meta[name="csrf"]');
    if (!a || !m || !navigator.sendBeacon) return;
    var fd = new FormData();
    fd.append('_csrf', m.content); fd.append('kind', a.getAttribute('data-consult'));
    fd.append('place', a.getAttribute('data-place') || ''); fd.append('path', location.pathname);
    navigator.sendBeacon('/t', fd);
  });

  // 한 번에 하나만 펼치기 (답글·지우기)
  doc.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d.open || !d.matches('.cmt-acts details')) return;
    doc.querySelectorAll('.cmt-acts details[open]').forEach(function (o) { if (o !== d) o.open = false; });
    var ta = d.querySelector('textarea'); if (ta) ta.focus();
  }, true);
})();

// 대문 사진: 손으로 넘기거나 5초마다 다음 장으로. 마우스를 올리거나 만지는 동안은 멈춘다.
(function () {
  document.querySelectorAll('[data-slider]').forEach(function (box) {
    var track = box.querySelector('.bn-stack');
    var n = track ? track.children.length : 0;
    if (n < 2) return;
    var dots = box.querySelectorAll('.bn-dots i');
    var cur = 0, timer = null, held = false;
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function go(i) {
      cur = (i + n) % n;
      track.scrollTo({ left: track.clientWidth * cur, behavior: calm ? 'auto' : 'smooth' });
    }
    function mark() {
      var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      cur = Math.max(0, Math.min(n - 1, i));
      dots.forEach(function (d, k) { d.classList.toggle('on', k === cur); });
    }
    function play() { stop(); if (!calm && !held && !document.hidden) timer = setInterval(function () { go(cur + 1); }, 5000); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    track.addEventListener('scroll', function () { window.requestAnimationFrame(mark); }, { passive: true });
    box.querySelector('.bn-prev').addEventListener('click', function () { go(cur - 1); play(); });
    box.querySelector('.bn-next').addEventListener('click', function () { go(cur + 1); play(); });
    ['pointerenter', 'focusin', 'touchstart'].forEach(function (e) { box.addEventListener(e, function () { held = true; stop(); }, { passive: true }); });
    ['pointerleave', 'focusout', 'touchend'].forEach(function (e) { box.addEventListener(e, function () { held = false; play(); }, { passive: true }); });
    document.addEventListener('visibilitychange', play);
    window.addEventListener('resize', function () { track.scrollLeft = track.clientWidth * cur; });
    play();
  });
})();
