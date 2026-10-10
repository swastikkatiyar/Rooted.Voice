const prefersReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function digitsOf(value, padStart) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  let s = String(n);
  if (padStart) s = s.padStart(typeof padStart === 'number' ? padStart : 2, '0');
  return s.split('');
}

function rollerHtml(digit) {
  const rows = Array.from({length: 10}, (_, i) => `<span>${i}</span>`).join('');
  return `<span class="sliding-digit" aria-hidden="true"><span class="sliding-roller" style="transform:translateY(-${digit}em)">${rows}</span></span>`;
}

export function slidingNumberHtml(value, {padStart = false} = {}) {
  const digits = digitsOf(value, padStart);
  return `<span class="sliding-number">${digits.map(d => rollerHtml(d)).join('')}</span>`;
}

export function mountSlidingNumber(el, value, options = {}) {
  el.innerHTML = slidingNumberHtml(value, options);
  return {
    set(next) {
      const digits = digitsOf(next, options.padStart);
      const current = [...el.querySelectorAll('.sliding-digit')];
      if (prefersReduced()) {
        el.innerHTML = slidingNumberHtml(next, options);
        return;
      }
      if (current.length !== digits.length) {
        el.innerHTML = slidingNumberHtml(next, options);
        return;
      }
      current.forEach((node, i) => {
        const roller = node.querySelector('.sliding-roller');
        roller.style.transform = `translateY(-${digits[i]}em)`;
      });
    }
  };
}

export function mountClock(el, getParts) {
  el.classList.add('sliding-clock');
  const parts = getParts();
  el.innerHTML = parts.map((p, i) => {
    const num = `<span data-part="${i}" class="clock-part">${slidingNumberHtml(p.value, {padStart: p.pad ?? 2})}</span>`;
    const sep = i < parts.length - 1 ? `<span class="clock-sep">:</span>` : '';
    return num + sep;
  }).join('');
  const ctrls = [...el.querySelectorAll('[data-part]')].map((node, i) => {
    const pad = parts[i].pad ?? 2;
    return mountSlidingNumber(node, parts[i].value, {padStart: pad});
  });
  return {
    refresh() {
      getParts().forEach((p, i) => ctrls[i]?.set(p.value));
    }
  };
}
