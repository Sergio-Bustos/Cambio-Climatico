// ============================================================
// CAMBIO CLIMÁTICO — interacciones y animaciones (diseño "Franjas")
// Todo es progresivo: sin JS, el contenido sigue visible.
// ============================================================
(function () {
  'use strict';

  const root = document.documentElement;
  // La clase "js" oculta los elementos que se revelan con scroll: solo se activa
  // si este script cargó bien, y se quita si algo falla (el contenido nunca se pierde).
  root.classList.add('js');
  addEventListener('error', () => root.classList.remove('js'));
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Sonido de click en cualquier clic o toque (click.mp4; si falla, prueba otras extensiones)
  (function () {
    const exts = ['mp4', 'mp3', 'm4a', 'wav', 'ogg'];
    let au;
    try {
      au = new Audio(); au.preload = 'auto'; au.volume = .7;
      let i = 0;
      const next = () => { if (i < exts.length) { au.src = 'click.' + exts[i++]; au.load(); } };
      au.addEventListener('error', next); next();
    } catch (e) { return; }
    document.addEventListener('click', () => {
      try { au.currentTime = 0; const r = au.play(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* sin audio */ }
    }, true);
  })();



  // ── 1. Barra de progreso ────────────────────────────────────────────
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  body.prepend(bar);


  // ── 2. Franjas de calentamiento (una barra por año, 1850–2024) ──────
  // Serie ilustrativa: tendencia suave + variación anual (generador con semilla fija).
  const STOPS = ['#08306b', '#08519c', '#2171b5', '#4292c6', '#6baed6', '#c6dbef', '#fcbba1', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'];
  const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const RGB = STOPS.map(rgb);
  function ramp(t) {
    const x = clamp(t, 0, .9999) * (RGB.length - 1), i = Math.floor(x), f = x - i;
    return 'rgb(' + RGB[i].map((v, k) => Math.round(v + (RGB[i + 1][k] - v) * f)).join(',') + ')';
  }
  function series(n) {
    let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: n }, (_, k) => {
      const t = k / (n - 1);
      const v = -.28 + 1.55 * Math.pow(t, 2.6) + .1 * Math.sin(t * 19) + (rnd() - .5) * .3;
      return clamp((v + .75) / 2.2, .02, .98);
    });
  }
  function makeStripes(cls) {
    const el = document.createElement('div');
    el.className = 'stripes ' + cls;
    el.setAttribute('aria-hidden', 'true');
    const n = innerWidth < 600 ? 87 : 175, step = 175 / n;
    const data = series(175);
    let html = '';
    for (let i = 0; i < n; i++) html += '<i style="--c:' + ramp(data[Math.min(174, Math.round(i * step))]) + ';--i:' + i + '"></i>';
    el.innerHTML = html;
    return el;
  }
  $$('.hero-band').forEach(b => {
    const home = !!$('.stat-card') && !!$('.carousel');
    b.appendChild(makeStripes(home ? 'stripes-hero' : 'stripes-thin'));
    if (home) {
      const ax = document.createElement('div');
      ax.className = 'container';
      ax.innerHTML = '<div class="stripes-axis"><b>1850</b><em>Cada barra es un año: del azul (más frío) al rojo (más cálido). Representación ilustrativa.</em><b>2024</b></div>';
      b.appendChild(ax);
      ax.style.paddingBottom = 'clamp(.2rem,1vw,.6rem)';
    }
  });


  // ── 3. Tema claro/oscuro con transición circular ────────────────────
  const btn = $('#themeToggle'), icon = $('#themeIcon');
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('cc-theme', theme); } catch (e) {}
    if (icon) icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    if (btn) btn.title = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  }
  applyTheme(root.getAttribute('data-theme') || 'dark');

  if (btn) btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    btn.classList.remove('spin'); void btn.offsetWidth; btn.classList.add('spin');
    if (!document.startViewTransition || reduced) return applyTheme(next);
    const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('switching');
    const vt = document.startViewTransition(() => applyTheme(next));
    vt.ready.then(() => root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
      { duration: 900, easing: 'cubic-bezier(.77,0,.18,1)', pseudoElement: '::view-transition-new(root)' }
    )).catch(() => {});
    vt.finished.finally(() => root.classList.remove('switching'));
  });


  // ── 4. Cortina entre páginas ────────────────────────────────────────
  const curtain = $('.page-curtain');
  // Seguro: si por cualquier razón la cortina sigue ahí, se quita sola
  if (curtain) setTimeout(() => { if (!curtain.classList.contains('leave')) curtain.remove(); }, 3500);
  if (curtain && !reduced) {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html?$|\/$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      curtain.style.visibility = 'visible';
      curtain.classList.add('leave');
      setTimeout(() => { location.href = url.href; }, 600);
    });
    addEventListener('pageshow', ev => {
      if (ev.persisted) { curtain.classList.remove('leave'); curtain.style.animation = 'none'; curtain.style.visibility = 'hidden'; }
    });
  }


  // ── 5. Títulos: las palabras suben una a una ────────────────────────
  const heads = $$('.heading-underline');
  heads.forEach(h => {
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    const words = h.textContent.trim().split(/\s+/);
    h.textContent = '';
    words.forEach((word, i) => {
      const s = document.createElement('span');
      s.className = 'w'; s.style.setProperty('--wi', i); s.setAttribute('aria-hidden', 'true');
      s.textContent = word;
      h.appendChild(s);
      if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
    });
    if (h.tagName === 'H1') requestAnimationFrame(() => h.classList.add('go'));
  });


  // ── 6. Entradas con scroll + contadores (un solo observador) ────────
  $$('.section-block, .cta-block, .accordion').forEach(el => el.classList.add('reveal'));
  $$('.fade-in-up, .reveal').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('fade-in-up') || c.classList.contains('reveal'));
    el.style.setProperty('--rd', ((Math.max(0, sibs.indexOf(el)) % 4) * .1).toFixed(2) + 's');
  });

  function countUp(el) {
    const m = el.textContent.trim().match(/^([\d.,]+)(.*)$/s);
    if (!m || reduced) return;
    const target = parseFloat(m[1].replace(/,/g, '')), dec = (m[1].split('.')[1] || '').length, suf = m[2];
    const t0 = performance.now(), dur = 1800;
    (function step(t) {
      const p = clamp((t - t0) / dur, 0, 1), e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = (target * e).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  const obs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const t = e.target;
    if (t.classList.contains('heading-underline')) t.classList.add('go');
    else if (t.classList.contains('stat-number')) countUp(t);
    else t.classList.add('visible');
    obs.unobserve(t);
  }), { threshold: .01, rootMargin: '0px 0px -40px 0px' });
  $$('.fade-in-up, .reveal, .stat-number').forEach(el => obs.observe(el));
  heads.forEach(h => { if (h.tagName !== 'H1') obs.observe(h); });


  // ── 7. Scroll: progreso y barra (con rAF) ───────────────────────────
  const navbar = $('.navbar');
  let ticking = false;
  function update() {
    ticking = false;
    const y = scrollY, max = root.scrollHeight - innerHeight;
    bar.style.setProperty('--p', (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4));
    if (navbar) navbar.classList.toggle('scrolled', y > 10);
    // Respaldo: si el observador falla (algunos celulares), revela lo que ya está a la vista
    $$('.fade-in-up:not(.visible), .reveal:not(.visible)').forEach(el => {
      if (el.getBoundingClientRect().top < innerHeight * .95) el.classList.add('visible');
    });
    $$('.heading-underline:not(.go)').forEach(h => {
      if (h.getBoundingClientRect().top < innerHeight * .95) h.classList.add('go');
    });
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  update();
})();
