const prefersReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function mountAnimatedNumber(el, target, {duration = 1800} = {}) {
  const value = Number(target) || 0;
  el.classList.add('animated-number');
  el.setAttribute('aria-label', String(value));
  el.textContent = '0';
  if (prefersReduced() || value === 0) {
    el.textContent = String(value);
    return () => {};
  }
  let started = false;
  let raf = 0;
  const run = () => {
    if (started) return;
    started = true;
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / duration);
      el.textContent = String(Math.round(easeOut(p) * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) {
      run();
      io.disconnect();
    }
  }, {threshold: 0.35});
  io.observe(el);
  return () => {
    io.disconnect();
    cancelAnimationFrame(raf);
  };
}
