document.documentElement.classList.add('js');
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Mobile menu + active link */
  var btn = document.querySelector('.menu-btn'), nav = document.querySelector('.nav');
  if (btn && nav) btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', open);
  });
  var page = document.body.dataset.page;
  document.querySelectorAll('.nav a').forEach(function (a) {
    if (a.dataset.page === page) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
  });

  /* Slideshows: any .slideshow with <figure> children */
  document.querySelectorAll('.slideshow').forEach(function (grid) {
    var figs = Array.prototype.slice.call(grid.children).filter(function (c) { return c.tagName === 'FIGURE'; });
    if (figs.length < 2) return;
    var delay = +grid.dataset.delay || 4000;
    var ss = document.createElement('div'); ss.className = 'ss rv zoom'; ss.style.setProperty('--ss-delay', delay + 'ms');
    ss.setAttribute('role', 'region'); ss.setAttribute('aria-roledescription', 'carousel'); ss.setAttribute('aria-label', grid.getAttribute('aria-label') || 'Slideshow'); ss.tabIndex = 0;
    var vp = document.createElement('div'); vp.className = 'ss-viewport';
    var track = document.createElement('div'); track.className = 'ss-track';
    figs.forEach(function (f) { track.appendChild(f); });
    vp.appendChild(track); ss.appendChild(vp);
    var prev = document.createElement('button'); prev.className = 'ss-btn ss-prev'; prev.innerHTML = '&#8249;'; prev.setAttribute('aria-label', 'Previous slide');
    var next = document.createElement('button'); next.className = 'ss-btn ss-next'; next.innerHTML = '&#8250;'; next.setAttribute('aria-label', 'Next slide');
    ss.appendChild(prev); ss.appendChild(next);
    var hasCaps = figs.some(function (f) { return f.querySelector('figcaption'); });
    var cap = document.createElement('p'); cap.className = 'ss-caption'; cap.setAttribute('aria-live', 'polite');
    if (hasCaps) ss.appendChild(cap);
    var dots = document.createElement('div'); dots.className = 'ss-dots';
    figs.forEach(function (_, k) {
      var d = document.createElement('button'); d.setAttribute('aria-label', 'Go to slide ' + (k + 1));
      d.addEventListener('click', function () { go(k); }); dots.appendChild(d);
    });
    ss.appendChild(dots);
    var prog = document.createElement('div'); prog.className = 'ss-progress'; prog.innerHTML = '<i></i>'; ss.appendChild(prog);
    grid.parentNode.replaceChild(ss, grid);

    var i = 0, timer, hover = false, visible = true;
    function go(n) {
      i = (n + figs.length) % figs.length;
      track.style.transform = 'translateX(' + (-100 * i) + '%)';
      figs.forEach(function (f, k) { f.classList.toggle('on', k === i); f.setAttribute('aria-hidden', k !== i); });
      Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); });
      if (hasCaps) {
        var fc = figs[i].querySelector('figcaption'); cap.style.opacity = 0;
        setTimeout(function () { cap.textContent = fc ? fc.textContent : ''; cap.style.opacity = 1; }, 180);
      }
      restart();
    }
    function restart() {
      clearTimeout(timer); ss.classList.remove('playing');
      if (hover || !visible || reduce) return;
      void prog.offsetWidth; ss.classList.add('playing');
      timer = setTimeout(function () { go(i + 1); }, delay);
    }
    prev.addEventListener('click', function () { go(i - 1); });
    next.addEventListener('click', function () { go(i + 1); });
    ss.addEventListener('mouseenter', function () { hover = true; restart(); });
    ss.addEventListener('mouseleave', function () { hover = false; restart(); });
    ss.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') go(i - 1); if (e.key === 'ArrowRight') go(i + 1); });
    var x0 = null;
    vp.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; hover = true; restart(); }, { passive: true });
    vp.addEventListener('touchend', function (e) {
      if (x0 !== null) { var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); }
      x0 = null; hover = false; restart();
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; restart(); }, { threshold: .3 }).observe(ss);
    go(0);
  });

  /* Entrance animations: anything marked .rv, staggered among siblings */
  var items = document.querySelectorAll('.rv');
  items.forEach(function (el) {
    var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.classList.contains('rv'); });
    el.style.setProperty('--d', Math.min(sibs.indexOf(el), 5) * 0.1 + 's');
  });
  if (reduce || !('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('in'); }); }
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* Copy email */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy');
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () {
        b.textContent = 'Copied!'; setTimeout(function () { b.textContent = 'Copy'; }, 1600);
      }).catch(function () { location.href = 'mailto:' + t; });
    });
  });
})();
