// ── Scroll reveal ──
(function () {
  var els = document.querySelectorAll('.reveal');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduce) {
    els.forEach(function (e) { e.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }
})();

// ── Mockup galleries (Hi-Fi / Lo-Fi tabs + prev/next) ──
(function () {
  document.querySelectorAll('.gallery').forEach(function (g) {
    var vp = g.querySelector('.gallery-viewport');
    var tabs = g.querySelectorAll('.gtab');
    var prev = g.querySelector('.gprev');
    var next = g.querySelector('.gnext');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        g.setAttribute('data-active', tab.dataset.fi);
        tabs.forEach(function (x) { x.classList.toggle('is-active', x === tab); });
        if (vp) vp.scrollTo({ left: 0, behavior: 'smooth' });
      });
    });

    function step() { return vp ? Math.max(vp.clientWidth * 0.8, 200) : 200; }
    if (prev && vp) prev.addEventListener('click', function () { vp.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next && vp) next.addEventListener('click', function () { vp.scrollBy({ left: step(), behavior: 'smooth' }); });
  });
})();

// ── Wireframe lightbox: click a slide to see it full size, ‹ › / arrow keys to browse ──
(function () {
  var lb = document.getElementById('lightbox');
  if (!lb) return;
  var img = lb.querySelector('.lb-img');
  var cap = lb.querySelector('.lb-cap');
  var list = [], idx = 0, lastFocus = null;

  function show(i) {
    idx = (i + list.length) % list.length;
    img.src = list[idx].src;
    img.alt = list[idx].alt;
    cap.textContent = list[idx].alt + '  ·  ' + (idx + 1) + ' / ' + list.length;
  }
  function open(imgs, i) {
    list = imgs; lastFocus = document.activeElement;
    show(i);
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lb.querySelector('.lb-close').focus();
  }
  function close() {
    lb.hidden = true;
    document.body.style.overflow = '';
    img.src = '';
    if (lastFocus) lastFocus.focus();
  }

  document.querySelectorAll('.gallery').forEach(function (g) {
    var imgs = Array.prototype.slice.call(g.querySelectorAll('.slide img'));
    imgs.forEach(function (im, i) {
      var fig = im.closest('.slide');
      fig.setAttribute('tabindex', '0');
      fig.setAttribute('role', 'button');
      fig.setAttribute('aria-label', 'Enlarge: ' + im.alt);
      fig.addEventListener('click', function () { open(imgs, i); });
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(imgs, i); }
      });
    });
  });

  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
  lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-stage')) close(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
  });
})();

// ── Continuous connector line: rounded C-bulges alternating right↔left,
//    one flowing curve down the whole page that links every section. ──
(function () {
  var svg = document.querySelector('.flowline');
  if (!svg) return;
  var path = svg.querySelector('path');

  function draw() {
    var W = document.documentElement.clientWidth;
    var H = document.documentElement.scrollHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    var about = document.getElementById('about');
    var contact = document.getElementById('contact');
    if (!about || !contact) return;

    var yStart = about.getBoundingClientRect().top + window.scrollY + 30;
    var yEnd = contact.getBoundingClientRect().bottom + window.scrollY - 60;
    var span = yEnd - yStart;
    if (span < 120) return;

    // wavelength ≈ page width so each bulge is wide AND round (not diagonal, not narrow)
    var target = W * 0.78;
    var n = Math.max(3, Math.round(span / target));
    var seg = span / n;

    var cx = W * 0.5;
    var amp = W * 0.48;   // swing almost edge-to-edge before turning

    var d = 'M' + cx.toFixed(1) + ',' + yStart.toFixed(1);
    for (var i = 0; i < n; i++) {
      var y0 = yStart + i * seg;
      var y1 = yStart + (i + 1) * seg;
      var bx = cx + (i % 2 === 0 ? amp : -amp);   // right, then left, then right…
      d += ' C' + bx.toFixed(1) + ',' + y0.toFixed(1) +
           ' ' + bx.toFixed(1) + ',' + y1.toFixed(1) +
           ' ' + cx.toFixed(1) + ',' + y1.toFixed(1);
    }
    path.setAttribute('d', d);
  }

  var t;
  function schedule() { clearTimeout(t); t = setTimeout(draw, 120); }
  draw();
  window.addEventListener('load', draw);
  window.addEventListener('resize', schedule);
  setTimeout(draw, 400);
  setTimeout(draw, 1200);
})();

// ── Respect reduced-motion for the prototype video (pause + expose controls) ──
(function () {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('video[autoplay]').forEach(function (v) {
    v.removeAttribute('autoplay');
    v.setAttribute('controls', '');
    try { v.pause(); } catch (e) {}
  });
})();
