// 글 편집기. 글꼴·크기·색은 style 대신 정해 둔 class 로만 넣는다(서버가 class 목록 밖의 것은 버린다).
(function () {
  'use strict';
  var box = document.querySelector('[data-editor]');
  if (!box) return;
  var ta = box.querySelector('textarea[name="body"]');
  var src = box.querySelector('textarea[name="body_html"]');
  var form = box.closest('form');
  var counter = box.querySelector('[data-ed-count]');
  var csrfMeta = document.querySelector('meta[name="csrf"]');
  if (!ta || !src || !form || !csrfMeta) return;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function textToHtml(t) {
    if (!t.trim()) return '<p><br></p>';
    return t.replace(/\r\n?/g, '\n').split('\n').map(function (l) { return '<p>' + (l ? esc(l) : '<br>') + '</p>'; }).join('');
  }

  /* ---------- 화면 만들기 ---------- */
  var ed = el('div', 'rt ed-area');
  ed.contentEditable = 'true';
  ed.setAttribute('role', 'textbox');
  ed.setAttribute('aria-multiline', 'true');
  ed.setAttribute('aria-label', '내용');
  ed.innerHTML = src.value.trim() ? src.value : textToHtml(ta.value);   // src 는 서버가 정리해 내려준 값, 나머지는 글자만

  var bar = el('div', 'ed-bar');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', '글 꾸미기');
  var status = el('p', 'ed-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  function group() { var g = el('div', 'ed-group'); bar.appendChild(g); return g; }
  function button(g, label, title, fn, cls) {
    var b = el('button', 'ed-btn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button'; b.title = title; b.setAttribute('aria-label', title);
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });   // 누를 때 선택 영역이 풀리지 않게
    b.addEventListener('click', function () { restore(); fn(b); keep(); sync(); });
    g.appendChild(b);
    return b;
  }
  function select(g, title, items, fn) {
    var s = el('select', 'ed-sel');
    s.title = title; s.setAttribute('aria-label', title);
    items.forEach(function (it) { var o = el('option', '', it[1]); o.value = it[0]; s.appendChild(o); });
    s.addEventListener('change', function () { restore(); fn(s.value); s.selectedIndex = 0; keep(); sync(); });
    g.appendChild(s);
    return s;
  }

  /* ---------- 선택 영역 기억 ---------- */
  var saved = null;
  function keep() {
    var sel = window.getSelection();
    if (sel.rangeCount && ed.contains(sel.anchorNode)) saved = sel.getRangeAt(0).cloneRange();
  }
  function restore() {
    ed.focus();
    if (!saved) return;
    var sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(saved);
  }
  document.addEventListener('selectionchange', function () { keep(); marks(); });
  ['mouseup', 'keyup', 'touchend', 'blur'].forEach(function (ev) { ed.addEventListener(ev, keep); });

  function cmd(name, value) { try { document.execCommand('styleWithCSS', false, false); } catch (e) {} document.execCommand(name, false, value == null ? null : value); }
  function blocks() {
    var sel = window.getSelection(), out = [];
    if (!sel.rangeCount) return out;
    var r = sel.getRangeAt(0);
    ed.querySelectorAll('p, h2, h3, li, blockquote').forEach(function (b) { if (r.intersectsNode(b)) out.push(b); });
    return out;
  }
  function unwrap(n) { var p = n.parentNode; while (n.firstChild) p.insertBefore(n.firstChild, n); p.removeChild(n); }

  /* 고른 글자를 class 가 붙은 span 으로 감싼다. 고른 글자가 없으면 지금 문단 전체에 적용한다 */
  function applyClass(prefix, cls) {
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    if (sel.isCollapsed) {
      var bs = blocks();
      if (!bs.length) { cmd('formatBlock', 'p'); bs = blocks(); }
      if (!bs.length) return;
      var r = document.createRange(); r.selectNodeContents(bs[0]); sel.removeAllRanges(); sel.addRange(r);
    }
    cmd('fontName', 'rtmark');
    ed.querySelectorAll('font[face="rtmark"]').forEach(function (f) {
      var sp = el('span', cls);
      while (f.firstChild) sp.appendChild(f.firstChild);
      sp.querySelectorAll('span').forEach(function (d) {
        d.className = d.className.split(/\s+/).filter(function (c) { return c && c.indexOf(prefix) !== 0; }).join(' ');
        if (!d.className) unwrap(d);
      });
      f.parentNode.replaceChild(sp, f);
    });
  }
  function align(cls) {
    var bs = blocks();
    if (!bs.length) { cmd('formatBlock', 'p'); bs = blocks(); }
    bs.forEach(function (b) { b.classList.remove('ta-center', 'ta-right'); if (cls) b.classList.add(cls); if (!b.className) b.removeAttribute('class'); });
  }

  /* ---------- 도구 모음 ---------- */
  var g = group();
  select(g, '글꼴', [['', '글꼴'], ['ff-base', '기본 글꼴'], ['ff-gothic', '고딕'], ['ff-serif', '명조'], ['ff-round', '둥근 글꼴'], ['ff-mono', '고정폭']], function (v) { if (v) applyClass('ff-', v); });
  select(g, '글자 크기', [['', '크기'], ['fs-13', '작게 13'], ['fs-15', '보통 15'], ['fs-17', '조금 크게 17'], ['fs-20', '크게 20'], ['fs-24', '더 크게 24'], ['fs-30', '아주 크게 30']], function (v) { if (v) applyClass('fs-', v); });
  select(g, '문단 모양', [['', '문단'], ['p', '본문'], ['h2', '큰 제목'], ['h3', '작은 제목'], ['blockquote', '인용']], function (v) { if (v) cmd('formatBlock', v); });

  g = group();
  var bB = button(g, '가', '굵게', function () { cmd('bold'); }, 'ed-b');
  var bI = button(g, '가', '기울임', function () { cmd('italic'); }, 'ed-i');
  var bU = button(g, '가', '밑줄', function () { cmd('underline'); }, 'ed-u');
  var bS = button(g, '가', '취소선', function () { cmd('strikeThrough'); }, 'ed-s');

  g = group();
  button(g, '왼쪽', '왼쪽 맞춤', function () { align(''); });
  button(g, '가운데', '가운데 맞춤', function () { align('ta-center'); });
  button(g, '오른쪽', '오른쪽 맞춤', function () { align('ta-right'); });

  g = group();
  button(g, '목록', '점 목록', function () { cmd('insertUnorderedList'); });
  button(g, '번호', '번호 목록', function () { cmd('insertOrderedList'); });
  button(g, '구분선', '구분선 넣기', function () { cmd('insertHorizontalRule'); });
  var linkBtn = button(g, '링크', '링크 넣기', function () { linkRow.hidden = !linkRow.hidden; if (!linkRow.hidden) linkIn.focus(); });

  g = group();
  var file = el('input'); file.type = 'file'; file.accept = 'image/jpeg,image/png,image/webp,image/gif'; file.multiple = true; file.hidden = true;
  button(g, '사진 올리기', '사진 올리기 (여러 장 가능)', function () { file.click(); }, 'ed-photo');
  g.appendChild(file);

  g = group();
  button(g, '되돌리기', '되돌리기', function () { cmd('undo'); });
  button(g, '다시', '다시 하기', function () { cmd('redo'); });
  button(g, '꾸밈 지우기', '고른 글자의 꾸밈 지우기', function () {
    cmd('removeFormat');
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    var r = sel.getRangeAt(0);
    ed.querySelectorAll('span').forEach(function (s) { if (r.intersectsNode(s)) unwrap(s); });
    align('');
  });

  // 둘째 줄: 글자색과 형광펜
  var colors = el('div', 'ed-colors');
  function swatches(label, prefix, list) {
    var w = el('div', 'ed-swatches'); w.appendChild(el('span', 'ed-label', label));
    list.forEach(function (c) {
      var b = el('button', 'ed-sw sw-' + c[0]); b.type = 'button'; b.title = label + ' ' + c[1]; b.setAttribute('aria-label', label + ' ' + c[1]);
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () { restore(); applyClass(prefix, c[0]); keep(); sync(); });
      w.appendChild(b);
    });
    colors.appendChild(w);
  }
  swatches('글자색', 'fc-', [['fc-ink', '기본'], ['fc-gray', '회색'], ['fc-red', '빨강'], ['fc-orange', '주황'], ['fc-green', '초록'], ['fc-blue', '파랑'], ['fc-navy', '남색'], ['fc-purple', '보라']]);
  swatches('형광펜', 'bg-', [['bg-none', '없음'], ['bg-yellow', '노랑'], ['bg-pink', '분홍'], ['bg-sky', '하늘']]);

  // 링크 입력 줄
  var linkRow = el('div', 'ed-row'); linkRow.hidden = true;
  var linkIn = el('input'); linkIn.type = 'url'; linkIn.placeholder = 'https://…'; linkIn.setAttribute('aria-label', '링크 주소'); linkIn.autocomplete = 'off';
  var linkOk = el('button', 'btn ghost sm', '넣기'); linkOk.type = 'button';
  var linkOff = el('button', 'btn ghost sm', '링크 풀기'); linkOff.type = 'button';
  linkRow.appendChild(linkIn); linkRow.appendChild(linkOk); linkRow.appendChild(linkOff);
  function addLink() {
    var u = linkIn.value.trim();
    if (!/^https?:\/\/\S{3,}$/i.test(u)) { say('링크는 https:// 로 시작하는 주소여야 합니다.', true); return; }
    restore();
    if (window.getSelection().isCollapsed) cmd('insertHTML', '<a href="' + esc(u).replace(/"/g, '&quot;') + '">' + esc(u) + '</a>');
    else cmd('createLink', u);
    linkIn.value = ''; linkRow.hidden = true; keep(); sync();
  }
  linkOk.addEventListener('click', addLink);
  linkIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addLink(); } });
  linkOff.addEventListener('click', function () { restore(); cmd('unlink'); linkRow.hidden = true; keep(); sync(); });

  // 사진을 눌렀을 때 나오는 줄
  var imgRow = el('div', 'ed-row'); imgRow.hidden = true;
  imgRow.appendChild(el('span', 'ed-label', '고른 사진'));
  var picked = null;
  function pick(img) {
    if (picked) picked.classList.remove('is-picked');
    picked = img; imgRow.hidden = !img;
    if (img) img.classList.add('is-picked');
  }
  [['작게', 'w-s'], ['중간', 'w-m'], ['원래 크기', '']].forEach(function (o) {
    var b = el('button', 'btn ghost sm', o[0]); b.type = 'button';
    b.addEventListener('click', function () { if (!picked) return; picked.classList.remove('w-s', 'w-m'); if (o[1]) picked.classList.add(o[1]); sync(); });
    imgRow.appendChild(b);
  });
  var imgDel = el('button', 'btn ghost sm', '사진 빼기'); imgDel.type = 'button';
  imgDel.addEventListener('click', function () { if (!picked) return; var p = picked.parentNode; p.removeChild(picked); if (p !== ed && !p.textContent.trim() && !p.querySelector('img')) p.innerHTML = '<br>'; pick(null); sync(); });
  imgRow.appendChild(imgDel);
  ed.addEventListener('click', function (e) { pick(e.target.tagName === 'IMG' ? e.target : null); });

  ta.hidden = true; ta.required = false; ta.removeAttribute('maxlength');
  var frame = el('div', 'ed');
  frame.appendChild(bar); frame.appendChild(colors); frame.appendChild(linkRow); frame.appendChild(imgRow); frame.appendChild(ed);
  ta.parentNode.insertBefore(frame, ta);
  frame.parentNode.insertBefore(status, frame.nextSibling);
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}

  /* ---------- 사진 올리기 ---------- */
  function say(msg, bad) { status.textContent = msg; status.classList.toggle('is-bad', !!bad); }
  function insertImage(url) {
    restore();
    cmd('insertHTML', '<p><img src="' + url + '" alt=""></p><p><br></p>');
    keep();
  }
  function upload(files) {
    var list = Array.prototype.filter.call(files, function (f) { return /^image\/(jpeg|png|webp|gif)$/.test(f.type); });
    if (!list.length) { say('사진 파일(JPG, PNG, WEBP, GIF)만 올릴 수 있습니다.', true); return; }
    if (ed.querySelectorAll('img').length + list.length > 30) { say('사진은 글 하나에 30장까지 넣을 수 있습니다.', true); return; }
    var done = 0, failed = 0;
    (function next(i) {
      if (i >= list.length) { say(failed ? '사진 ' + failed + '장을 올리지 못했습니다. 8MB 이하의 사진인지 확인해야 합니다.' : '사진 ' + done + '장을 넣었습니다.', failed > 0); sync(); return; }
      say('사진 올리는 중 (' + (i + 1) + '/' + list.length + ')');
      var fd = new FormData();
      fd.append('_csrf', csrfMeta.content); fd.append('image', list[i]);
      fetch('/upload', { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (r) { if (r.ok && r.j.url) { insertImage(r.j.url); done++; } else { failed++; if (r.j && r.j.error) say(r.j.error, true); } })
        .catch(function () { failed++; })
        .then(function () { next(i + 1); });
    })(0);
  }
  file.addEventListener('change', function () { if (file.files.length) upload(file.files); file.value = ''; });
  ed.addEventListener('paste', function (e) {
    var cd = e.clipboardData;
    if (!cd) return;
    if (cd.files && cd.files.length) { e.preventDefault(); upload(cd.files); return; }
    // 다른 곳에서 복사한 글은 글자만 받아서 모양이 깨지지 않게 한다
    var t = cd.getData('text/plain');
    if (t) { e.preventDefault(); cmd('insertText', t); sync(); }
  });
  ed.addEventListener('dragover', function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) { e.preventDefault(); frame.classList.add('is-drop'); } });
  ed.addEventListener('dragleave', function () { frame.classList.remove('is-drop'); });
  ed.addEventListener('drop', function (e) {
    frame.classList.remove('is-drop');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); keep(); upload(e.dataTransfer.files); }
  });

  /* ---------- 상태 맞추기 ---------- */
  function marks() {
    if (!ed.contains(document.activeElement) && document.activeElement !== ed) return;
    [[bB, 'bold'], [bI, 'italic'], [bU, 'underline'], [bS, 'strikeThrough']].forEach(function (p) {
      var on = false; try { on = document.queryCommandState(p[1]); } catch (e) {}
      p[0].classList.toggle('on', on); p[0].setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function html() {
    var c = ed.cloneNode(true);
    c.querySelectorAll('font').forEach(unwrap);
    c.querySelectorAll('.is-picked').forEach(function (n) { n.classList.remove('is-picked'); if (!n.className) n.removeAttribute('class'); });
    c.querySelectorAll('[style]').forEach(function (n) { n.removeAttribute('style'); });
    return c.innerHTML;
  }
  function sync() {
    var text = ed.innerText.replace(/ /g, ' ').trim();
    src.value = (text || ed.querySelector('img')) ? html() : '';
    ta.value = text;
    if (counter) { counter.textContent = text.length.toLocaleString() + ' / 10,000'; counter.classList.toggle('is-over', text.length > 10000); }
  }
  ed.addEventListener('input', sync);
  ed.addEventListener('focus', function () { document.body.classList.add('typing'); });
  ed.addEventListener('blur', function () { document.body.classList.remove('typing'); });
  form.addEventListener('submit', function (e) {
    pick(null); sync();
    var n = ta.value.length;
    if (n < 5 && !ed.querySelector('img')) { e.preventDefault(); e.stopImmediatePropagation(); say('내용은 5자 이상이어야 합니다.', true); ed.focus(); }
    else if (n > 10000) { e.preventDefault(); e.stopImmediatePropagation(); say('내용이 10,000자를 넘었습니다.', true); ed.focus(); }
  }, true);
  sync();
})();
