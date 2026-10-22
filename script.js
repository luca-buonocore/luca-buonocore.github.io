var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var FINE_POINTER = window.matchMedia('(pointer: fine)').matches;
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

// ── Smooth scroll (Lenis) + one shared per-frame loop for every scroll-linked effect ──
var lenis = null;
var scrollFx = [];          // functions run whenever the scroll position or layout changes
(function () {
  if (!REDUCE && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -10 });
      });
    });
  }
  var lastY = -1, dirty = true;
  window.addEventListener('resize', function () { dirty = true; });
  function frame(t) {
    if (lenis) lenis.raf(t);
    var y = window.scrollY;
    if (y !== lastY || dirty) {
      lastY = y; dirty = false;
      for (var i = 0; i < scrollFx.length; i++) scrollFx[i](y);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__markDirty = function () { dirty = true; };
})();

// ── Scroll reveal: elements rise and fade in as they cross the bottom of the screen, driven by the scroll ──
(function () {
  if (REDUCE) return;
  document.documentElement.classList.add('js');
  var els = Array.prototype.slice.call(document.querySelectorAll('.reveal')).map(function (el) { return { el: el, ty: 0 }; });
  scrollFx.push(function () {
    var vh = window.innerHeight;
    els.forEach(function (o) {
      var top = o.el.getBoundingClientRect().top - o.ty;          // layout position, ignoring our own offset
      var p = clamp01((vh * 0.98 - top) / (vh * 0.28));
      o.ty = 40 * (1 - p);
      o.el.style.opacity = p.toFixed(3);
      o.el.style.transform = p < 1 ? 'translate3d(0,' + o.ty.toFixed(1) + 'px,0)' : '';
    });
  });
})();

// ── Hero: name rises letter by letter, then drifts with a slow parallax ──
(function () {
  var h1 = document.querySelector('.hero-title');
  if (!h1) return;
  var hero = document.querySelector('.hero');

  if (!REDUCE) {
    var i = 0;
    h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
    h1.innerHTML = h1.innerHTML.split(/<br\s*\/?>/i).map(function (line) {
      return line.trim().split(' ').map(function (word) {
        return '<span class="w" aria-hidden="true">' + word.split('').map(function (c) {
          return '<span class="ch" style="--i:' + (i++) + '">' + c + '</span>';
        }).join('') + '</span>';
      }).join(' ');
    }).join('<br>');
    h1.classList.add('split');

    scrollFx.push(function (y) {
      if (y > hero.offsetHeight + 200) return;
      h1.style.transform = 'translate3d(0,' + (-y * 0.18).toFixed(1) + 'px,0)';
    });
  }
})();

// ── Text lights up word by word as you scroll through it (About, case stories, details, recommendation) ──
(function () {
  if (REDUCE) return;
  var blocks = Array.prototype.slice.call(document.querySelectorAll(
    '.about-statement, .case-tag, .case-story, .info-text, .rec-text, .contact-sub'
  )).map(function (p) {
    p.innerHTML = p.textContent.trim().split(/\s+/).map(function (w) {
      return '<span class="wd">' + w + '</span>';
    }).join(' ');
    return { el: p, words: p.querySelectorAll('.wd'), lit: -1 };
  });
  scrollFx.push(function () {
    var vh = window.innerHeight;
    blocks.forEach(function (b) {
      var r = b.el.getBoundingClientRect();
      var lit = Math.round(clamp01((vh * 0.88 - r.top) / (r.height + vh * 0.3)) * b.words.length);
      if (lit === b.lit) return;
      b.lit = lit;
      for (var i = 0; i < b.words.length; i++) b.words[i].classList.toggle('on', i < lit);
    });
  });
})();

// ── Contact: "Let's talk." grows to full size as you reach the end ──
(function () {
  var mega = document.querySelector('.contact-mega');
  if (!mega || REDUCE) return;
  scrollFx.push(function (y) {
    var vh = window.innerHeight, maxY = document.documentElement.scrollHeight - vh;
    var prog = clamp01(1 - (maxY - y) / (vh * 0.8));   // reaches full size exactly at the bottom of the page
    mega.style.transform = 'scale(' + (0.55 + 0.45 * prog).toFixed(3) + ')';
  });
})();

// ── Magnetic links and buttons (follow the cursor a little) ──
(function () {
  if (REDUCE || !FINE_POINTER) return;
  document.querySelectorAll('.magnetic').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = 'translate(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.32).toFixed(1) + 'px)';
    });
    el.addEventListener('mouseleave', function () { el.style.transform = ''; });
  });
})();

// ── Case titles rise out of a mask as the case scrolls in ──
(function () {
  if (REDUCE) return;
  var masks = Array.prototype.map.call(document.querySelectorAll('.case-name'), function (n) {
    n.innerHTML = '<span class="mask">' + n.innerHTML + '</span>';
    return { box: n, m: n.firstChild };
  });
  scrollFx.push(function () {
    var vh = window.innerHeight;
    masks.forEach(function (o) {
      var p = clamp01((vh * 0.95 - o.box.getBoundingClientRect().top) / (vh * 0.3));
      o.m.style.transform = p < 1 ? 'translate3d(0,' + (105 * (1 - p)).toFixed(1) + '%,0)' : '';
    });
  });
})();

// ── Mini dashboards, driven by the scroll: the chart draws / bars fill and the number moves to the real value ──
(function () {
  var cards = Array.prototype.map.call(document.querySelectorAll('.kpi'), function (c) {
    var o = { c: c, num: c.querySelector('.kpi-num'), line: c.querySelector('.kpi-line'), ctrl: c.querySelector('.kpi-ctrl'),
      ends: c.querySelectorAll('.kpi-end'), bars: c.querySelectorAll('.kpi-track i'), p: -1 };
    if (o.line) { o.len = o.line.getTotalLength(); o.line.style.strokeDasharray = o.len.toFixed(1); }
    return o;
  });
  if (!cards.length) return;
  function fmt(el, v) { return (el.dataset.prefix || '') + v + (el.dataset.suffix || ''); }
  function render(o, p) {
    var from = +o.num.dataset.from, to = +o.num.dataset.to, q = clamp01((p - 0.5) / 0.4);
    o.num.textContent = fmt(o.num, Math.round(from + (to - from) * q));
    if (o.line) {                                    // A/B: one line, B splits away from A after the test marker
      o.line.style.strokeDashoffset = (o.len * (1 - clamp01(p / 0.85))).toFixed(1);
      o.ctrl.style.opacity = clamp01((p - 0.45) / 0.2);
      o.ends.forEach(function (e) { e.style.opacity = clamp01((p - 0.8) / 0.15); });
    } else {                                         // Groove: the "before" bar fills, then the much shorter one
      o.bars[0].style.width = 'calc(var(--w) * ' + clamp01(p / 0.45).toFixed(3) + ')';
      o.bars[1].style.width = 'calc(var(--w) * ' + q.toFixed(3) + ')';
    }
  }
  if (REDUCE) { cards.forEach(function (o) { render(o, 1); }); return; }
  scrollFx.push(function () {
    var vh = window.innerHeight;
    cards.forEach(function (o) {
      var p = clamp01((vh * 0.92 - o.c.getBoundingClientRect().top) / (vh * 0.5));
      if (p === o.p) return;
      o.p = p; render(o, p);
    });
  });
})();

// ── Asuit, driven by the scroll: Gantt bars slip, then the same blocks become cards that move across a Scrum board ──
(function () {
  var fig = document.querySelector('.gk');
  if (!fig) return;
  var stage = fig.querySelector('.gk-stage');
  var capEl = fig.querySelector('.gk-caption');
  var cols = fig.querySelectorAll('.gk-cols span');
  var items = Array.prototype.slice.call(fig.querySelectorAll('.gk-item'));

  // Gantt: [start, length] as fractions of the timeline; SLIP = how far each bar drifts right
  var GANTT = [[0, .26], [.12, .28], [.26, .24], [.36, .3], [.5, .26], [.6, .3]];
  var SLIP = [0, .05, .1, .08, .13, .1];
  // Board: column of each card (0 to do, 1 doing, 2 done) at each sprint
  var BOARD = [
    [0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0],
    [2, 2, 1, 1, 0, 0],
    [2, 2, 2, 2, 1, 1],
    [2, 2, 2, 2, 2, 2]
  ];

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function dims() {
    var W = stage.clientWidth, H = stage.clientHeight, pad = 12, top = 44;
    return { W: W, H: H, pad: pad, top: top, colW: (W - pad * 2 - 16) / 3,
      cardH: Math.max(20, Math.min(32, (H - top - 40) / 6 - 6)) };
  }
  function ganttRect(i, slipT, d) {
    var rowH = (d.H - d.top - 14) / items.length, track = d.W - d.pad * 2;
    var s = GANTT[i][0] + SLIP[i] * slipT, w = Math.min(GANTT[i][1], 1 - s);
    return [d.pad + s * track, d.top + i * rowH + rowH * 0.18, w * track, rowH * 0.64];
  }
  function boardRect(step, i, d) {
    var k = BOARD[step][i], slot = 0;
    for (var j = 0; j < i; j++) if (BOARD[step][j] === k) slot++;
    return [d.pad + k * (d.colW + 8) + 6, d.top + 26 + slot * (d.cardH + 6), d.colW - 12, d.cardH];
  }
  function mix(a, b, t) { return a.map(function (v, k) { return v + (b[k] - v) * t; }); }

  function render(p) {
    var d = dims(), kanban = p >= 0.38;
    var slipT = ease(clamp01((p - 0.12) / 0.18));
    var morphT = ease(clamp01((p - 0.3) / 0.15));
    var s = clamp01((p - 0.45) / 0.55) * 4, s0 = Math.min(3, Math.floor(s)), f = ease(s - s0);
    var cap = p < 0.12 ? 'Gantt plan' : p < 0.3 ? 'The plan slips. Again.' : p < 0.45 ? 'One shared backlog' : '2-week sprints';
    if (capEl.textContent !== cap) capEl.textContent = cap;
    fig.classList.toggle('kanban', kanban);
    cols.forEach(function (c, k) {
      c.style.left = (d.pad + k * (d.colW + 8)) + 'px'; c.style.width = d.colW + 'px';
      c.style.top = (d.top - 4) + 'px'; c.style.bottom = d.pad + 'px';
    });
    items.forEach(function (el, i) {
      var r = p < 0.45 ? mix(ganttRect(i, slipT, d), boardRect(0, i, d), morphT)
                       : mix(boardRect(s0, i, d), boardRect(s0 + 1, i, d), f);
      el.style.left = r[0].toFixed(1) + 'px'; el.style.top = r[1].toFixed(1) + 'px';
      el.style.width = r[2].toFixed(1) + 'px'; el.style.height = r[3].toFixed(1) + 'px';
      el.classList.toggle('slip', !kanban && p > 0.12 && SLIP[i] > 0);
      el.classList.toggle('done', kanban && BOARD[f > 0.5 ? s0 + 1 : s0][i] === 2);
    });
  }

  if (REDUCE) {
    render(0.72);
    window.addEventListener('resize', function () { render(0.72); });
    return;
  }
  scrollFx.push(function () {
    var vh = window.innerHeight;
    render(clamp01((vh * 0.9 - stage.getBoundingClientRect().top) / (vh * 0.7)));
  });
})();

// ── Mockup galleries (prev/next) ──
(function () {
  document.querySelectorAll('.gallery').forEach(function (g) {
    var vp = g.querySelector('.gallery-viewport');
    var prev = g.querySelector('.gprev');
    var next = g.querySelector('.gnext');
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
    if (lenis) lenis.stop();
    lb.querySelector('.lb-close').focus();
  }
  function close() {
    lb.hidden = true;
    document.body.style.overflow = '';
    if (lenis) lenis.start();
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
//    drawn progressively like a pen as you scroll down the page. ──
(function () {
  var svg = document.querySelector('.flowline');
  if (!svg) return;
  var path = svg.querySelector('path');
  var yStart = 0, yEnd = 0, len = 0;

  function draw() {
    var W = document.documentElement.clientWidth;
    var H = document.documentElement.scrollHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    var about = document.getElementById('about');
    var contact = document.getElementById('contact');
    if (!about || !contact) return;

    yStart = about.getBoundingClientRect().top + window.scrollY + 30;
    yEnd = contact.getBoundingClientRect().bottom + window.scrollY - 60;
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

    if (!REDUCE) {
      len = path.getTotalLength();
      path.style.strokeDasharray = len.toFixed(1);
      if (window.__markDirty) window.__markDirty();
    }
  }

  // the "pen" sits ~70% down the viewport, so the line is always drawn just ahead of the reader
  scrollFx.push(function (y) {
    if (!len) return;
    var pen = y + window.innerHeight * 0.7;
    var prog = clamp01((pen - yStart) / (yEnd - yStart));
    path.style.strokeDashoffset = (len * (1 - prog)).toFixed(1);
  });

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
  if (!REDUCE) return;
  document.querySelectorAll('video[autoplay]').forEach(function (v) {
    v.removeAttribute('autoplay');
    v.setAttribute('controls', '');
    try { v.pause(); } catch (e) {}
  });
})();
