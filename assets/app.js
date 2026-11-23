(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  // 고른 밝기가 있으면 적용한다. 고른 적이 없으면 어두운 화면(스타일 기본값)이다
  try { var saved = localStorage.getItem('theme'); if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved); } catch (e) {}

  // 밝은 화면 / 어두운 화면
  doc.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme') || 'dark';
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

// 첫 화면·게시판: 게시판 탭과 왼쪽 메뉴를 누르면 가운데 목록만 바꾼다(주소도 바뀌어 뒤로 가기·새로고침이 된다)
(function () {
  if (!window.fetch || !window.DOMParser || !history.pushState) return;
  var busy = null;
  function feed() { return document.querySelector('[data-feed]'); }
  function mark(path) {
    document.querySelectorAll('.side-nav a[data-feed-link]').forEach(function (a) {
      if (a.getAttribute('href') === path) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function load(url, push) {
    var box = feed();
    if (!box) { location.href = url; return; }
    if (busy) busy.abort();
    busy = new AbortController();
    box.classList.add('is-loading');
    box.setAttribute('aria-busy', 'true');
    fetch(url, { credentials: 'same-origin', signal: busy.signal, headers: { 'X-Requested-With': 'feed' } })
      .then(function (r) { if (!r.ok && r.status !== 404) throw 0; return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var next = doc.querySelector('[data-feed]');
        if (!next) { location.href = url; return; }
        box.replaceWith(next);
        document.title = doc.title;
        var u = new URL(url, location.href);
        if (push) history.pushState({ feed: 1 }, '', u.pathname + u.search);
        mark(u.pathname);
        var top = next.getBoundingClientRect().top;
        if (push && top < 0) next.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        var h = next.querySelector('#feed-h'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      })
      .catch(function (e) { if (e && e.name === 'AbortError') return; location.href = url; });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-feed-link], .feed-more a');
    if (!a || !feed() || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    load(a.href, true);
  });
  document.addEventListener('change', function (e) {
    var f = e.target.closest('form[data-autosubmit]');
    if (!f) return;
    var url = f.action + (f.action.indexOf('?') < 0 ? '?' : '&') + new URLSearchParams(new FormData(f)).toString().replace(/(^|&)sort=new(&|$)/, '$1').replace(/[?&]$/, '');
    if (feed()) load(url.replace(/\?$/, ''), true); else f.submit();
  });
  history.replaceState({ feed: 1 }, '');
  window.addEventListener('popstate', function () { if (feed()) load(location.href, false); });
})();

/* 가입 화면: 입력하는 동안 아이디·비밀번호 확인 */
(function () {
  var form = document.querySelector('form[data-signup]');
  if (!form) return;
  var id = form.querySelector('#f-id'), pw = form.querySelector('#f-pw'), pw2 = form.querySelector('#f-pw2');
  function say(key, ok, msg, input) {
    var el = form.querySelector('[data-live="' + key + '"]');
    if (!el) return;
    var old = el.parentNode.querySelector('.err');
    if (old && msg) old.hidden = true;
    el.textContent = msg || '';
    el.className = 'live' + (msg ? (ok ? ' is-ok' : ' is-bad') : '');
    if (input) { if (msg && !ok) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  }
  var timer, ctrl, last = '';
  id.addEventListener('input', function () {
    clearTimeout(timer);
    var v = id.value.trim().toLowerCase();
    if (!v) { say('id', true, ''); return; }
    if (!/^[a-z][a-z0-9_]{3,19}$/.test(v)) {
      say('id', false, /^[^a-z]/.test(v) ? '영문 소문자로 시작해야 합니다.' : v.length < 4 ? '4자 이상이어야 합니다.' : '영문 소문자, 숫자, 밑줄(_)만 쓸 수 있습니다.', id);
      return;
    }
    say('id', true, '확인하는 중입니다.');
    timer = setTimeout(function () {
      if (v === last) return;
      if (ctrl) ctrl.abort();
      ctrl = 'AbortController' in window ? new AbortController() : null;
      fetch('/signup/check-id?id=' + encodeURIComponent(v), { headers: { Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (id.value.trim().toLowerCase() === v) { say('id', j.ok, j.msg, id); last = j.ok ? '' : v; } })
        .catch(function (e) { if (e.name !== 'AbortError') say('id', true, ''); });
    }, 400);
  });
  function checkPw() {
    var v = pw.value, u = id.value.trim().toLowerCase();
    if (!v) say('pw', true, '');
    else if (v.length < 10) say('pw', false, '10자 이상이어야 합니다. 지금 ' + v.length + '자입니다.', pw);
    else if (u && v.toLowerCase().indexOf(u) !== -1) say('pw', false, '비밀번호에 아이디를 넣을 수 없습니다.', pw);
    else if (/^(.)\1+$/.test(v) || ['1234567890', 'qwertyuiop', 'password123', '0123456789', 'abcdefghij'].indexOf(v.toLowerCase()) !== -1) say('pw', false, '너무 쉬운 비밀번호입니다.', pw);
    else say('pw', true, '쓸 수 있는 비밀번호입니다.', pw);
    checkPw2();
  }
  function checkPw2() {
    if (!pw2.value) { say('pw2', true, ''); return; }
    if (pw2.value === pw.value) say('pw2', true, '비밀번호가 같습니다.', pw2);
    else say('pw2', false, pw.value.indexOf(pw2.value) === 0 ? '' : '비밀번호가 서로 다릅니다.', pw2);
  }
  pw.addEventListener('input', checkPw);
  pw2.addEventListener('input', checkPw2);
  id.addEventListener('change', function () { if (pw.value) checkPw(); });
})();

// 대문 상담 카드: 큰 화면에서 지금 보이는 대문 사진의 글 바로 아래에 붙는다
(function () {
  var row = document.querySelector('.bn-row'), card = row && row.querySelector('.cm'), stack = row && row.querySelector('.bn-stack');
  if (!card || !stack || !window.matchMedia) return;
  var wide = window.matchMedia('(min-width: 1024px)'), raf = 0;
  function place() {
    raf = 0;
    if (!wide.matches) { card.style.top = ''; return; }
    var w = stack.clientWidth || 1, i = Math.round(stack.scrollLeft / w), slide = stack.children[i];
    var txt = slide && slide.querySelector('.bn-text');
    if (!txt) { card.style.top = ''; return; }
    card.style.top = Math.round(txt.getBoundingClientRect().bottom - row.getBoundingClientRect().top + 24) + 'px';
  }
  function queue() { if (!raf) raf = requestAnimationFrame(place); }
  stack.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  if (wide.addEventListener) wide.addEventListener('change', queue);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  place();
})();
