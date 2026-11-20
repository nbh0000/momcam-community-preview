// 화면이 그려지기 전에 밝기 설정을 적용한다 (깜빡임 방지). 고른 적이 없으면 어두운 화면이 기본이다.
(function () {
  var t = 'dark';
  try {
    var s = localStorage.getItem('theme');
    if (s === 'dark' || s === 'light') t = s;
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', t);
})();
