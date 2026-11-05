(function () {
  'use strict';
  var root = document.documentElement;
  function $(id) { return document.getElementById(id); }

  /* 화면 모드 */
  var btn = $('theme');
  if (btn) {
    btn.setAttribute('aria-pressed', root.dataset.theme === 'dark');
    btn.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('aqua-theme', next); } catch (e) {}
      btn.setAttribute('aria-pressed', next === 'dark');
    });
  }

  /* 코드 복사 */
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.copy') : null;
    if (!b) return;
    var code = b.closest('.code').querySelector('code');
    var text = code ? code.innerText : '';
    function done() { b.textContent = '복사됨'; setTimeout(function () { b.textContent = '복사'; }, 1600); }
    function fallback() {
      var t = document.createElement('textarea');
      t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (err) {}
      document.body.removeChild(t);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });

  /* 목차: 지금 읽는 제목 표시 */
  var toc = $('TableOfContents');
  if (toc && 'IntersectionObserver' in window) {
    var links = {};
    toc.querySelectorAll('a').forEach(function (a) { links[decodeURIComponent(a.hash.slice(1))] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = links[en.target.id];
        if (!a || !en.isIntersecting) return;
        toc.querySelectorAll('a.is-active').forEach(function (x) { x.classList.remove('is-active'); });
        a.classList.add('is-active');
      });
    }, { rootMargin: '0px 0px -70% 0px' });
    document.querySelectorAll('.prose h2[id], .prose h3[id]').forEach(function (h) { io.observe(h); });
  }

  /* 공부 기록: 검색과 태그 거르기 */
  var q = $('q'), cards = document.querySelectorAll('.post-card'), filters = document.querySelectorAll('.filter');
  if (q && cards.length) {
    var tag = '';
    function apply() {
      var term = q.value.trim().toLowerCase(), n = 0;
      cards.forEach(function (c) {
        var ok = (!tag || c.getAttribute('data-tags').indexOf('|' + tag + '|') >= 0) &&
                 (!term || c.getAttribute('data-search').indexOf(term) >= 0);
        c.hidden = !ok; if (ok) n++;
      });
      if ($('shown')) $('shown').textContent = n;
      if ($('no-result')) $('no-result').hidden = n > 0;
    }
    q.addEventListener('input', apply);
    filters.forEach(function (f) {
      f.addEventListener('click', function () {
        tag = f.getAttribute('data-tag');
        filters.forEach(function (x) { x.classList.toggle('is-on', x === f); });
        apply();
      });
    });
  }
})();
