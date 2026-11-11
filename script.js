// ============================================================
// CAMBIO CLIMÁTICO — interacciones y animaciones
// Todo es progresivo: sin JS, el contenido sigue visible.
// ============================================================
(function () {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];


  // ── 1. Capas de fondo + termómetro ──────────────────────────────────
  const fx = document.createElement('div');
  fx.className = 'bg-fx';
  fx.setAttribute('aria-hidden', 'true');
  fx.innerHTML = '<div class="aurora"><i></i><i></i><i></i></div><div class="bg-dots"></div><canvas></canvas><div class="cursor-glow"></div>';
  body.prepend(fx);

  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  body.prepend(bar);

  const thermo = document.createElement('div');
  thermo.className = 'thermo';
  thermo.title = 'Ilustrativo: la página se calienta mientras bajas';
  thermo.setAttribute('aria-hidden', 'true');
  thermo.innerHTML = '<span class="thermo-label">+1.1°C</span><div class="thermo-tube"><div class="thermo-fill"></div></div><span class="thermo-bulb"></span>';
  body.appendChild(thermo);
  const thermoLabel = $('.thermo-label', thermo);

  let heat = 0;


  // ── 2. Partículas: nieve arriba → brasas abajo ──────────────────────
  const weather = (function () {
    const canvas = $('canvas', fx), ctx = canvas.getContext('2d');
    let w, h, dpr, ps = [], running = true, last = 0;
    const mouse = { x: -9999, y: -9999 };
    const ICE = [186, 230, 253], EMB = [251, 146, 60];

    function make(initial) {
      return {
        x: Math.random() * w, y: initial ? Math.random() * h : (Math.random() < .5 ? -10 : h + 10),
        r: Math.random() * 2.2 + .7, s: Math.random() * .8 + .4,
        ph: Math.random() * 6.28, a: Math.random() * .5 + .2
      };
    }
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = w < 700 ? 38 : 90;
      ps = Array.from({ length: n }, () => make(true));
    }
    function frame(t) {
      if (!running) return;
      const dt = Math.min(48, t - last) / 16.7; last = t;
      ctx.clearRect(0, 0, w, h);
      const light = root.getAttribute('data-theme') === 'light';
      const c0 = light ? [2, 132, 199] : ICE, c1 = light ? [234, 88, 12] : EMB;
      const col = c0.map((v, i) => Math.round(lerp(v, c1[i], heat)));
      ctx.fillStyle = ctx.strokeStyle = `rgb(${col})`;
      for (const p of ps) {
        // abajo = nieve que cae; arriba del todo calor = brasas que suben
        const vy = lerp(.55, -.9, heat) * p.s * dt;
        p.ph += .012 * dt;
        p.x += Math.sin(p.ph) * .4 * dt + lerp(.1, .25, heat) * dt * .3;
        p.y += vy;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 130 * 130 && d2 > 1) { const d = Math.sqrt(d2), f = (1 - d / 130) * 3 * dt; p.x += dx / d * f; p.y += dy / d * f; }
        if (p.y > h + 12) p.y = -12; else if (p.y < -12) p.y = h + 12;
        if (p.x > w + 12) p.x = -12; else if (p.x < -12) p.x = w + 12;
        ctx.globalAlpha = p.a * (light ? .9 : 1);
        if (heat > .45) { ctx.lineWidth = p.r * .8; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.sin(p.ph) * 2, p.y + p.r * 5 * heat); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - heat * .25), 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    resize();
    if (reduced) { running = true; frame(0); running = false; } else requestAnimationFrame(frame);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
    addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) running = false; else if (!reduced && !running) { running = true; requestAnimationFrame(frame); }
    });
  })();


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


  // ── 5. Títulos por palabras + planeta del hero ──────────────────────
  $$('.heading-underline').forEach(h => {
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
    if (h.tagName === 'H1') { h.style.setProperty('--wd', '.95s'); requestAnimationFrame(() => h.classList.add('go')); }
  });
  const headObs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('go'); headObs.unobserve(e.target); }
  }), { threshold: .6 });
  $$('.heading-underline').forEach(h => { if (h.tagName !== 'H1') headObs.observe(h); });

  const orbs = $$('.hero-band').map(b => {
    const o = document.createElement('div');
    o.className = 'hero-orb'; o.setAttribute('aria-hidden', 'true');
    o.innerHTML = '<span class="dash"></span><span class="sphere"></span><i class="ring"></i><i class="ring"></i><i class="ring"></i>';
    b.prepend(o);
    return o;
  });


  // ── 6. Reveal con variantes + contadores ────────────────────────────
  const cyc = ['rv-up', 'rv-flip', 'rv-zoom'];
  $$('.section-block, .cta-block, .accordion').forEach(el => el.classList.add('reveal'));
  $$('.fade-in-up, .reveal').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('fade-in-up') || c.classList.contains('reveal'));
    const i = Math.max(0, sibs.indexOf(el));
    let v;
    if (el.classList.contains('cta-block')) v = 'rv-zoom';
    else if (el.classList.contains('section-block') || el.classList.contains('accordion')) v = 'rv-up';
    else if (sibs.length === 2) v = i === 0 ? 'rv-left' : 'rv-right';
    else v = cyc[i % 3];
    el.classList.add(v);
    el.style.setProperty('--rd', ((i % 4) * .12).toFixed(2) + 's');
  });
  const revObs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revObs.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.fade-in-up, .reveal').forEach(el => revObs.observe(el));

  function countUp(el) {
    const m = el.textContent.trim().match(/^([\d.,]+)(.*)$/s);
    if (!m || reduced) return;
    const target = parseFloat(m[1].replace(/,/g, '')), dec = (m[1].split('.')[1] || '').length, suf = m[2];
    const t0 = performance.now(), dur = 1900;
    (function step(t) {
      const p = clamp((t - t0) / dur, 0, 1), e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = (target * e).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  const numObs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { countUp(e.target); numObs.unobserve(e.target); }
  }), { threshold: .8 });
  $$('.stat-number').forEach(n => numObs.observe(n));


  // ── 7. Scroll: progreso, temperatura, navbar ────────────────────────
  const navbar = $('.navbar');
  let ticking = false;
  function update() {
    ticking = false;
    const y = scrollY, max = root.scrollHeight - innerHeight;
    const p = max > 0 ? clamp(y / max, 0, 1) : 0;
    heat = p;
    bar.style.setProperty('--p', p.toFixed(4));
    fx.style.setProperty('--heat', p.toFixed(3));
    thermo.style.setProperty('--p', p.toFixed(4));
    thermo.style.setProperty('--heat', p.toFixed(3));
    thermoLabel.textContent = '+' + (1.1 + p * 2.9).toFixed(1) + '°C';
    orbs.forEach(o => o.style.setProperty('--heat', p.toFixed(3)));
    if (navbar) navbar.classList.toggle('scrolled', y > 30);
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  update();


  // ── 8. Tilt 3D + foco de luz ────────────────────────────────────────
  $$('.card, .stat-card').forEach(el => {
    el.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px');
      if (fine && !reduced) {
        el.classList.add('tilting');
        el.style.setProperty('--rx', ((.5 - y / r.height) * 12).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((x / r.width - .5) * 14).toFixed(2) + 'deg');
      }
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('tilting');
      el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
    });
  });


  // ── 9. Botones: magnético + ripple ──────────────────────────────────
  if (fine && !reduced) {
    $$('.btn:not(.btn-sm)').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * .25).toFixed(1) + 'px');
        b.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * .35).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
    });
  }
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn');
    if (!b || reduced) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height);
    const rip = document.createElement('span');
    rip.className = 'ripple';
    rip.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.appendChild(rip); setTimeout(() => rip.remove(), 750);
  });


  // ── 10. Foco del cursor + parallax del planeta ──────────────────────
  const glow = $('.cursor-glow', fx);
  let tx = innerWidth / 2, ty = innerHeight / 3, gx = tx, gy = ty;
  if (fine && !reduced) {
    addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY; glow.classList.add('on');
      const nx = (e.clientX / innerWidth - .5) * 2, ny = (e.clientY / innerHeight - .5) * 2;
      orbs.forEach(o => { o.style.setProperty('--ox', nx.toFixed(3)); o.style.setProperty('--oy', ny.toFixed(3)); });
    }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));
    (function loop() {
      gx = lerp(gx, tx, .08); gy = lerp(gy, ty, .08);
      glow.style.transform = `translate(${gx}px, ${gy}px)`;
      requestAnimationFrame(loop);
    })();
  }
})();
