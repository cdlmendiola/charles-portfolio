document.documentElement.classList.add('js');
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer: fine)').matches;

  /* ---------- Menu + active page ---------- */
  var menuBtn = document.querySelector('.menu-btn'), nav = document.querySelector('.nav');
  if (menuBtn) menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open); menuBtn.innerHTML = open ? '&#10005;' : '&#9776;';
  });
  var page = document.body.dataset.page;
  document.querySelectorAll('.nav a').forEach(function (a) {
    if (a.dataset.page === page) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
  });

  /* ---------- Page transition curtain ---------- */
  var curtain = document.querySelector('.curtain');
  document.querySelectorAll('a[href$=".html"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (reduce || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || !curtain) return;
      e.preventDefault();
      curtain.classList.add('leave');
      setTimeout(function () { location.href = a.href; }, 520);
    });
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted && curtain) curtain.classList.remove('leave'); });

  /* ---------- Scroll progress ---------- */
  var bar = document.querySelector('.progress');
  function onScroll() {
    var h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? scrollY / h : 0) + ')';
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- Split headings into words ---------- */
  document.querySelectorAll('.split').forEach(function (el) {
    var idx = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--wi', idx++);
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
      });
    })(el);
  });

  /* ---------- Coverflow slideshow ---------- */
  document.querySelectorAll('.slideshow').forEach(function (src) {
    var figs = Array.prototype.slice.call(src.children).filter(function (c) { return c.tagName === 'FIGURE'; });
    if (figs.length < 2) return;
    var delay = +src.dataset.delay || 4000, n = figs.length;
    var cf = document.createElement('div'); cf.className = 'cf'; cf.tabIndex = 0;
    cf.style.setProperty('--delay', delay + 'ms');
    cf.setAttribute('role', 'region'); cf.setAttribute('aria-roledescription', 'carousel'); cf.setAttribute('aria-label', src.getAttribute('aria-label') || 'Slideshow');
    var stage = document.createElement('div'); stage.className = 'cf-stage';
    figs.forEach(function (f) {
      var img = f.querySelector('img'), box = document.createElement('div'); box.className = 'card-img';
      f.insertBefore(box, img); box.appendChild(img); stage.appendChild(f);
      img.draggable = false;
    });
    cf.appendChild(stage);
    var barEl = document.createElement('div'); barEl.className = 'cf-bar';
    barEl.innerHTML = '<div class="cf-cap" aria-live="polite"><span></span></div>' +
      '<div class="cf-ctrl"><button class="cf-btn prev" aria-label="Previous slide">&#8592;</button>' +
      '<div class="cf-ring"><svg viewBox="0 0 56 56"><circle class="bg" cx="28" cy="28" r="25"/><circle class="fg" cx="28" cy="28" r="25"/></svg><button class="pp" aria-label="Pause slideshow">&#10074;&#10074;</button></div>' +
      '<button class="cf-btn next" aria-label="Next slide">&#8594;</button></div>';
    cf.appendChild(barEl);
    var dots = document.createElement('div'); dots.className = 'cf-dots';
    figs.forEach(function (_, k) {
      var d = document.createElement('button'); d.setAttribute('aria-label', 'Go to slide ' + (k + 1));
      d.addEventListener('click', function () { go(k); }); dots.appendChild(d);
    });
    cf.appendChild(dots);
    src.parentNode.replaceChild(cf, src);

    var cap = barEl.querySelector('.cf-cap'), capSpan = cap.querySelector('span'), pp = barEl.querySelector('.pp');
    var i = 0, timer, hover = false, visible = false, stopped = reduce;

    function layout() {
      var narrow = innerWidth < 700;
      figs.forEach(function (f, k) {
        var off = k - i;
        if (off > n / 2) off -= n; if (off < -n / 2) off += n;
        var abs = Math.abs(off);
        var x = off * (narrow ? 62 : 48), z = -abs * 180, ry = -off * 28, s = 1 - abs * .12;
        f.style.transform = 'translate(-50%,-50%) translateX(' + x + '%) translateZ(' + z + 'px) rotateY(' + ry + 'deg) scale(' + s + ')';
        f.style.opacity = abs > 2 ? 0 : 1 - abs * .25;
        f.style.filter = abs ? 'grayscale(.5) brightness(.92)' : 'none';
        f.style.zIndex = 10 - abs;
        f.classList.toggle('on', off === 0);
        f.setAttribute('aria-hidden', off !== 0);
        f.style.pointerEvents = abs > 1 ? 'none' : 'auto';
      });
    }
    function go(k) {
      i = (k + n) % n;
      layout();
      Array.prototype.forEach.call(dots.children, function (d, j) { d.classList.toggle('on', j === i); });
      var fc = figs[i].querySelector('figcaption');
      cap.classList.add('swap');
      setTimeout(function () {
        capSpan.innerHTML = '<em class="count">' + String(i + 1).padStart(2, '0') + '/' + String(n).padStart(2, '0') + '</em>' + (fc ? fc.innerHTML : '');
        cap.classList.remove('swap');
      }, 250);
      restart();
    }
    function restart() {
      clearTimeout(timer); cf.classList.remove('playing');
      if (hover || !visible || stopped) return;
      void cf.offsetWidth; cf.classList.add('playing');
      timer = setTimeout(function () { go(i + 1); }, delay);
    }
    barEl.querySelector('.prev').addEventListener('click', function () { go(i - 1); });
    barEl.querySelector('.next').addEventListener('click', function () { go(i + 1); });
    pp.addEventListener('click', function () {
      stopped = !stopped; pp.innerHTML = stopped ? '&#9654;' : '&#10074;&#10074;';
      pp.setAttribute('aria-label', stopped ? 'Play slideshow' : 'Pause slideshow'); restart();
    });
    if (reduce) { pp.innerHTML = '&#9654;'; pp.setAttribute('aria-label', 'Play slideshow'); }
    figs.forEach(function (f, k) { f.addEventListener('click', function () { if (k !== i) go(k); }); });
    stage.addEventListener('mouseenter', function () { hover = true; restart(); });
    stage.addEventListener('mouseleave', function () { hover = false; restart(); });
    cf.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') go(i - 1); if (e.key === 'ArrowRight') go(i + 1); });
    // drag / swipe
    var x0 = null;
    stage.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    addEventListener('pointerup', function (e) {
      if (x0 === null) return; var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
    });
    addEventListener('resize', layout);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; restart(); }, { threshold: .35 }).observe(cf);
    else visible = true;
    go(0);
  });


  /* ---------- Instagram-style carousel posts ---------- */
  document.querySelectorAll('.post').forEach(function (post) {
    var track = post.querySelector('.post-track'), imgs = track.querySelectorAll('img'), n = imgs.length;
    var count = post.querySelector('.post-count'), dotsBox = post.querySelector('.post-dots');
    var prev = post.querySelector('.prev'), next = post.querySelector('.next');
    for (var k = 0; k < n; k++) dotsBox.appendChild(document.createElement('i'));
    var dots = dotsBox.children, cur = -1;
    function idx() { return Math.round(track.scrollLeft / track.clientWidth); }
    function update() {
      var i = Math.max(0, Math.min(n - 1, idx())); if (i === cur) return; cur = i;
      count.textContent = (i + 1) + '/' + n;
      Array.prototype.forEach.call(dots, function (d, j) { d.classList.toggle('on', j === i); });
      prev.disabled = i === 0; next.disabled = i === n - 1;
    }
    function goTo(i) { track.scrollTo({ left: i * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); }
    prev.addEventListener('click', function () { goTo(idx() - 1); });
    next.addEventListener('click', function () { goTo(idx() + 1); });
    track.addEventListener('scroll', update, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(idx() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(idx() - 1); }
    });
    // mouse drag to swipe on desktop
    var dragX = null, startLeft = 0;
    track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; dragX = e.clientX; startLeft = track.scrollLeft; track.style.scrollSnapType = 'none'; track.style.scrollBehavior = 'auto'; });
    addEventListener('pointermove', function (e) { if (dragX !== null) track.scrollLeft = startLeft - (e.clientX - dragX); });
    addEventListener('pointerup', function (e) {
      if (dragX === null) return; var dx = e.clientX - dragX; dragX = null;
      track.style.scrollSnapType = ''; track.style.scrollBehavior = '';
      var base = Math.round(startLeft / track.clientWidth);
      goTo(Math.abs(dx) > 50 ? base + (dx < 0 ? 1 : -1) : base);
    });
    update();
    // one-time "swipe me" nudge when the post scrolls into view
    if (!reduce && 'IntersectionObserver' in window) {
      var seen = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { imgs[0].classList.add('swipe-hint'); seen.disconnect(); }
      }, { threshold: .6 });
      seen.observe(track);
    }
  });

  /* ---------- Reveal on scroll ---------- */
  var items = document.querySelectorAll('.rv, .rv-clip, .rv-pop, .split');
  items.forEach(function (el) {
    var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.matches('.rv, .rv-clip, .rv-pop, .split'); });
    if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', Math.min(sibs.indexOf(el), 5) * 0.1 + 's');
  });
  if (reduce || !('IntersectionObserver' in window)) items.forEach(function (el) { el.classList.add('in'); });
  else {
    // clip-path hides an element from IntersectionObserver, so clipped items are watched through their parent
    var watchers = new Map();
    items.forEach(function (el) {
      var t = el.classList.contains('rv-clip') ? el.parentElement : el;
      if (!watchers.has(t)) watchers.set(t, []);
      watchers.get(t).push(el);
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        watchers.get(e.target).forEach(function (el) { el.classList.add('in'); });
        io.unobserve(e.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    watchers.forEach(function (_, t) { io.observe(t); });
  }

  /* ---------- Magnetic buttons ---------- */
  if (fine && !reduce) document.querySelectorAll('.btn, .cf-btn').forEach(function (b) {
    b.addEventListener('mousemove', function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * .25 + 'px,' + (e.clientY - r.top - r.height / 2) * .35 + 'px)';
    });
    b.addEventListener('mouseleave', function () { b.style.transform = ''; });
  });

  /* ---------- Parallax collage ---------- */
  if (!reduce) {
    var par = document.querySelectorAll('[data-speed]');
    if (par.length) addEventListener('scroll', function () {
      par.forEach(function (el) {
        var r = el.getBoundingClientRect(), mid = r.top + r.height / 2 - innerHeight / 2;
        el.style.translate = '0 ' + (mid * -parseFloat(el.dataset.speed)) + 'px';
      });
    }, { passive: true });
  }

  /* ---------- Copy email ---------- */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy');
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () {
        b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = 'Copy email'; }, 1600);
      }).catch(function () { location.href = 'mailto:' + t; });
    });
  });
})();
