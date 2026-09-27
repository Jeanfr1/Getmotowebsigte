/* GetMOTO — scroll + mouse interactions */
(() => {
  'use strict';

  // Set to a form backend (Formspree, Web3Forms, etc.) to receive bookings by email.
  // While empty, the form hands the request to SMS / phone.
  const FORM_ENDPOINT = '';
  const PHONE = '+447749818987';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  $('#yr').textContent = new Date().getFullYear();

  /* ---------------- Smooth scroll ---------------- */
  let lenis = null;
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add('js');
    if (!reduced && window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  const navH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 80;
  function goTo(hash) {
    const el = hash === '#home' ? document.body : $(hash);
    if (!el) return;
    const off = hash === '#home' ? 0 : -navH() + 1;
    if (lenis) lenis.scrollTo(hash === '#home' ? 0 : el, { offset: off, duration: 1.4 });
    else window.scrollTo({ top: hash === '#home' ? 0 : el.getBoundingClientRect().top + scrollY + off, behavior: reduced ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      if (hash.length < 2) return;
      e.preventDefault();
      closeMenu();
      if (a.dataset.service) $('#f-service').value = a.dataset.service;
      goTo(hash);
    });
  });

  /* ---------------- Header ---------------- */
  const nav = $('#nav');
  const burger = $('.nav__burger');
  const mnav = $('#mnav');
  function closeMenu() { if (!mnav.hidden) { mnav.hidden = true; burger.setAttribute('aria-expanded', 'false'); } }
  burger.addEventListener('click', () => {
    const open = mnav.hidden;
    mnav.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
  });
  const onScrollNav = () => nav.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  const navLinks = $$('.nav__links > a, .nav__drop > a');
  const setActive = (id) => navLinks.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + id));

  /* ---------------- HERO: frame sequence ---------------- */
  const hero = $('#home');
  const canvas = $('#heroCanvas');
  const ctx = canvas.getContext('2d');
  const FRAMES = 120;
  const isMobile = () => innerWidth < 768;
  let set = isMobile() ? 'mobile' : 'desktop';
  let frames = [];
  let loaded = [];
  const state = { frame: 0, cam: 0 }; // cam: 0 = intro framing, 1 = exploded framing
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let geom = null; // last draw transform, reused by callouts

  const src = (i) => `assets/frames/${set}/f${String(i + 1).padStart(3, '0')}.webp`;

  function loadSet() {
    frames = new Array(FRAMES);
    loaded = new Array(FRAMES).fill(false);
    let count = 0;
    const bar = $('#heroLoader span');
    const loader = $('#heroLoader');
    loader.classList.remove('is-done');
    // Progressive order: first frame, then coarse to fine, so scrubbing works early.
    const order = [];
    const seen = new Set();
    [0, FRAMES - 1].forEach((i) => { seen.add(i); order.push(i); });
    for (const step of [16, 8, 4, 2, 1]) {
      for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    }
    const mySet = set;
    let cursor = 0;
    const PARALLEL = 6;
    const next = () => {
      if (cursor >= order.length || mySet !== set) return;
      const i = order[cursor++];
      const img = new Image();
      img.decoding = 'async';
      img.onload = img.onerror = () => {
        if (mySet !== set) return;
        loaded[i] = img.naturalWidth > 0;
        count++;
        bar.style.width = (count / FRAMES) * 100 + '%';
        if (count === FRAMES) loader.classList.add('is-done');
        if (i === 0 || Math.abs(i - Math.round(state.frame)) < 8) render();
        next();
      };
      img.src = src(i);
      frames[i] = img;
    };
    for (let k = 0; k < PARALLEL; k++) next();
  }

  function nearestLoaded(i) {
    if (loaded[i]) return i;
    for (let d = 1; d < FRAMES; d++) {
      if (loaded[i - d]) return i - d;
      if (loaded[i + d]) return i + d;
    }
    return -1;
  }

  function sizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = 'high';
  }

  function render() {
    const idx = nearestLoaded(clamp(Math.round(state.frame), 0, FRAMES - 1));
    if (idx < 0) return;
    const img = frames[idx];
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const base = Math.max(cw / iw, ch / ih);
    const c = state.cam;
    const s = lerp(1.02, 1.03, c);
    const dw = iw * base * s, dh = ih * base * s;
    // Intro: slide the bike left so it sits between the copy and the cards (as in the design);
    // the exploded state is centred. Edges beyond the frame are filled with a mirrored copy.
    const shift = set === 'desktop' ? lerp(-0.1, 0, c) * cw : 0;
    const ox = (cw - dw) / 2 + shift - mouse.x * 16;
    const oy = clamp((ch - dh) / 2 - mouse.y * 10, Math.min(ch - dh, 0), 0);
    ctx.fillStyle = '#03060c';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, ox, oy, dw, dh);
    if (ox + dw < cw) { // mirror on the right
      ctx.save(); ctx.translate(ox + dw * 2, 0); ctx.scale(-1, 1);
      ctx.drawImage(img, 0, oy, dw, dh); ctx.restore();
    }
    if (ox > 0) { // mirror on the left
      ctx.save(); ctx.translate(ox, 0); ctx.scale(-1, 1);
      ctx.drawImage(img, 0, oy, dw, dh); ctx.restore();
    }
    geom = { ox, oy, dw, dh };
    placeCallouts();
  }

  /* Callouts pinned to parts of the exploded bike */
  const callouts = $$('.co');
  const MOBILE_POS = { // % positions on the 9:16 frame
    'Engine & Oil Change': [56, 45, -40, -150],
    'Suspension': [30, 47, -10, -120],
  };
  callouts.forEach((co) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'co__line');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.appendChild(path);
    co.prepend(svg);
    co._path = path;
    co._label = co.textContent.trim();
    co.style.setProperty('--dot', 0);
    co.style.setProperty('--lbl', 0);
  });
  const coProgress = new Array(callouts.length).fill(0);

  function placeCallouts() {
    if (!geom) return;
    const vs = clamp(innerHeight / 900, 0.6, 1.1);
    callouts.forEach((co, i) => {
      let x, y, dx, dy;
      if (set === 'desktop') {
        x = +co.dataset.x; y = +co.dataset.y; dx = +co.dataset.dx * vs; dy = +co.dataset.dy * vs;
      } else {
        const m = MOBILE_POS[co._label];
        if (!m) { co.style.display = 'none'; return; }
        co.style.display = '';
        [x, y, dx, dy] = m;
      }
      const X = geom.ox + (x / 100) * geom.dw;
      const Y = geom.oy + (y / 100) * geom.dh;
      co.style.transform = `translate(${X}px, ${Y}px)`;
      const p = coProgress[i];
      // elbow line: vertical first, then horizontal
      const ex = dx, ey = dy;
      const mx = 0, my = ey;
      const len = Math.abs(ey) + Math.abs(ex);
      co._path.setAttribute('d', `M0 0 L${mx} ${my} L${ex} ${ey}`);
      co._path.style.strokeDasharray = len;
      co._path.style.strokeDashoffset = len * (1 - clamp(p * 1.6, 0, 1));
      co.style.setProperty('--dot', clamp(p * 3, 0, 1));
      co.style.setProperty('--lbl', clamp((p - 0.55) / 0.45, 0, 1));
      co.style.setProperty('--lx', ex + 'px');
      co.style.setProperty('--ly', ey + 'px');
    });
  }

  let raf = 0;
  const requestRender = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); };

  sizeCanvas();
  loadSet();
  addEventListener('resize', () => {
    const want = isMobile() ? 'mobile' : 'desktop';
    sizeCanvas();
    if (want !== set) { set = want; loadSet(); }
    requestRender();
  });

  /* Mouse: parallax on the bike, cards and glow */
  const cardsWrap = $('.hero__cards');
  const intro = $('.hero__intro');
  const stage = $('.hero__stage');
  if (!reduced && matchMedia('(pointer: fine)').matches) {
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      stage.style.setProperty('--mx', e.clientX - r.left + 'px');
      stage.style.setProperty('--my', e.clientY - r.top + 'px');
    });
    stage.addEventListener('pointerleave', () => { mouse.tx = 0; mouse.ty = 0; });
    const tickMouse = () => {
      mouse.x = lerp(mouse.x, mouse.tx, 0.08);
      mouse.y = lerp(mouse.y, mouse.ty, 0.08);
      if (Math.abs(mouse.x - mouse.tx) > 0.001 || Math.abs(mouse.y - mouse.ty) > 0.001) {
        cardsWrap.style.translate = `${mouse.x * -14}px ${mouse.y * -10}px`;
        intro.style.translate = `${mouse.x * 8}px ${mouse.y * 6}px`;
        cardsWrap.style.setProperty('--tilt', mouse.x);
        $$('.gcard', cardsWrap).forEach((c) => {
          if (!c._hover) c.style.transform = `rotateX(${mouse.y * -4}deg) rotateY(${-7 + mouse.x * 6}deg)`;
        });
        render();
      }
      requestAnimationFrame(tickMouse);
    };
    requestAnimationFrame(tickMouse);

    // per-card hover tilt
    $$('.gcard').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        c._hover = true;
        c.style.transform = `translateX(-6px) rotateX(${y * -10}deg) rotateY(${x * 12}deg) scale(1.02)`;
      });
      c.addEventListener('pointerleave', () => { c._hover = false; });
    });

    // tilt for MOT / Rentals feature cards
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1100px) rotateX(${y * -4}deg) rotateY(${x * 5}deg)`;
        el.querySelector('.feature__bg').style.translate = `${x * -18}px ${y * -12}px`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transform = '';
        el.querySelector('.feature__bg').style.translate = '';
      });
    });
  }

  // Cards link to the relevant section
  const cardTargets = ['#services', '#mot', '#services', '#contact'];
  $$('.gcard').forEach((c, i) => c.addEventListener('click', () => goTo(cardTargets[i])));

  /* Scroll choreography */
  if (hasGsap && !reduced) {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.6,
        onUpdate: (st) => { $('#heroBar').style.transform = `scaleY(${st.progress})`; },
      },
    });
    const T = 100; // timeline measured in "percent of hero scroll"

    // hold, then explode (frames + camera pull-back)
    tl.to(state, { frame: FRAMES - 1, duration: 70, onUpdate: requestRender }, 8);
    tl.to(state, { cam: 1, duration: 62, ease: 'power1.inOut', onUpdate: requestRender }, 10);

    // intro copy leaves
    tl.to('.hero__scroll', { autoAlpha: 0, y: 20, duration: 5 }, 0);
    tl.to('.hero__intro [data-hero-in]', { autoAlpha: 0, y: -50, filter: 'blur(6px)', stagger: 1.5, duration: 10, ease: 'power2.in' }, 3);
    tl.to('.hero__stats', { autoAlpha: 0, y: 30, duration: 8 }, 3);
    tl.to('.hero__cards .gcard', { autoAlpha: 0, x: 260, rotateY: -35, stagger: 2, duration: 12, ease: 'power2.in' }, 4);
    tl.to('.hero__shade', { '--shade': 0.45, duration: 20 }, 10);

    // callouts pop onto the parts
    callouts.forEach((co, i) => {
      const proxy = { p: 0 };
      tl.to(proxy, { p: 1, duration: 9, onUpdate: () => { coProgress[i] = proxy.p; placeCallouts(); } }, 70 + i * 2);
    });

    // outro copy
    tl.to('.hero__shade', { '--shade': 1, duration: 10 }, 74);
    tl.fromTo('.hero__outro', { autoAlpha: 0, x: -40 }, { autoAlpha: 1, x: 0, duration: 10, ease: 'power2.out' }, 76);
    tl.to({}, { duration: T - 86 }, 86); // hold at the end

    // parallax exit into services
    gsap.to('.hero__media', {
      scale: 1.06, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'bottom bottom', end: 'bottom top', scrub: true },
    });

    /* Diagnostics scan */
    const scan = $('#scan');
    const pct = $('#scanPct');
    ScrollTrigger.create({
      trigger: scan, start: 'top 80%', end: 'bottom 30%', scrub: 0.5,
      onUpdate: (st) => {
        const v = Math.round(st.progress * 100);
        scan.style.setProperty('--scan', v + '%');
        pct.textContent = v;
      },
    });

    /* Reveals */
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%',
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: 'power3.out', overwrite: true }),
    });

    /* About photo parallax */
    gsap.fromTo('.about__photo img', { yPercent: -6, scale: 1.12 }, {
      yPercent: 6, scale: 1.12, ease: 'none',
      scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true },
    });

    /* 3-step arrows pulse in sequence */
    gsap.from('.step__arrow', { autoAlpha: 0, x: -14, stagger: 0.25, duration: 0.6, scrollTrigger: { trigger: '.steps', start: 'top 80%' } });

    /* Active nav link */
    [['home', hero], ['services', $('#services')], ['mot', $('#mot')], ['rentals', $('#rentals')], ['about', $('#about')], ['contact', $('#contact')]].forEach(([id, el]) => {
      ScrollTrigger.create({ trigger: el, start: 'top 45%', end: 'bottom 45%', onToggle: (st) => st.isActive && setActive(id) });
    });
  } else {
    // Static fallback: show the exploded frame state is not needed, keep the intro frame
    $$('[data-reveal]').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
    $('#scan').style.setProperty('--scan', '50%');
  }

  /* ---------------- Booking form ---------------- */
  const form = $('#book');
  const modal = $('#modal');
  const closeModal = () => { modal.hidden = true; };
  $('.modal__x').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeMenu(); } });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data._gotcha) return;
    let ok = true;
    ['name', 'phone', 'service'].forEach((n) => {
      const f = form.elements[n];
      const bad = !String(f.value).trim() || (n === 'phone' && String(f.value).replace(/\D/g, '').length < 10);
      f.closest('.field').classList.toggle('is-bad', bad);
      if (bad && ok) { f.focus(); ok = false; }
    });
    if (!ok) return;

    const lines = [
      'GetMOTO booking request',
      `Name: ${data.name}`,
      `Phone: ${data.phone}`,
      data.bike && `Bike: ${data.bike}`,
      `Service: ${data.service}`,
      data.date && `Preferred date: ${data.date}`,
      data.message && `Details: ${data.message}`,
    ].filter(Boolean);
    const body = lines.join('\n');

    if (FORM_ENDPOINT) {
      try {
        const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(res.status);
        $('#modalTitle').textContent = 'Request sent!';
        $('#modalText').textContent = "Thanks, we'll call you back to confirm your slot.";
        $('#modalSms').hidden = true;
        modal.hidden = false;
        form.reset();
        return;
      } catch (_) { /* fall back to SMS */ }
    }
    const sep = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? '&' : '?';
    $('#modalSms').href = `sms:${PHONE}${sep}body=${encodeURIComponent(body)}`;
    $('#modalSms').hidden = false;
    modal.hidden = false;
    $('#modalSms').focus();
  });
  $$('input, select', form).forEach((f) => f.addEventListener('input', () => f.closest('.field').classList.remove('is-bad')));
})();
