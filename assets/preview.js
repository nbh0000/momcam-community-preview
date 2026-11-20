// 미리보기에서는 보내는 동작을 막는다
document.addEventListener('submit', function (e) { if (e.target.matches('form[data-preview]')) { e.preventDefault(); e.stopImmediatePropagation(); var n = document.querySelector('.pv-note'); if (n) { n.scrollIntoView({ block: 'start' }); } } }, true);
if (navigator.sendBeacon) navigator.sendBeacon = function () { return true; };
